import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Helper to normalize company names for matching
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(sa de cv|s\.a\. de c\.v\.|sa|s\.a\.|ltda|s\.a\.s\.|sas|sapi de cv|sapi|s de rl de cv|s de rl|inc|corp|de cv)\b/g, '')
    .replace(/[^a-z0-9]/g, '') // Remove spaces, punctuation, special chars
    .trim();
}

// Helper to format phone/WhatsApp to E.164 standard for Mexico
function formatPhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');

  // Strip Mexican old long-distance prefix if present
  if (digits.length === 11 && digits.startsWith('01')) {
    digits = digits.substring(2);
  }

  // If it's a 10-digit Mexican number, prepend 52 (country code)
  if (digits.length === 10) {
    return '52' + digits;
  }

  // If it already starts with 52 and is 12 digits, it is E.164 compliant
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits;
  }

  return digits;
}

// Clean and normalize comma-separated lists of phones/emails
function parseAndFormatPhones(phoneField: string): string[] {
  if (!phoneField) return [];
  const rawList = phoneField.split(',');
  const cleanedList = rawList
    .map(p => formatPhone(p.trim()))
    .filter(p => p !== '');
  return Array.from(new Set(cleanedList));
}

function parseAndFormatEmails(emailField: string): string[] {
  if (!emailField) return [];
  const rawList = emailField.split(',');
  const cleanedList = rawList
    .map(e => e.trim().toLowerCase())
    .filter(e => e !== '');
  return Array.from(new Set(cleanedList));
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  console.log(`🚀 Iniciando Limpieza y Desduplicación de Leads...`);
  console.log(isDryRun ? `[MODO SIMULACIÓN / DRY RUN - No se harán cambios reales]` : `[MODO REAL - Los cambios se guardarán en la base de datos]\n`);

  try {
    // 1. Fetch all leads from the table
    const selectQuery = `
      SELECT id, nombre_empresa, emails, telefonos_contacto, numeros_whatsapp, 
             email_1_status, email_1_template, email_1_sent_at, email_error,
             email_2_status, email_2_template, email_2_sent_at, email_2_error,
             nit, enfoque_ventas, sector, sector_productos, tipo_empresa,
             dolores_detectados, scoring_valor, scoring_justificacion,
             productos_principales, personas_contacto, direcciones,
             ciudad_principal, departamento_principal, pais, url_principal,
             redes_sociales, urls_scrapped, raw_json, pipeline_status, contacted_at
      FROM "leads-al-por-mayor-mexico"
      ORDER BY id ASC
    `;
    const res = await pool.query(selectQuery);
    const rawLeads = res.rows;
    console.log(`Se obtuvieron ${rawLeads.length} leads de la base de datos.`);

    // 2. Normalize fields for matching
    const leads = rawLeads.map(lead => {
      const emails = parseAndFormatEmails(lead.emails);
      const phones = parseAndFormatPhones(lead.telefonos_contacto);
      const whatsapps = parseAndFormatPhones(lead.numeros_whatsapp);
      const normName = normalizeCompanyName(lead.nombre_empresa);

      return {
        id: parseInt(lead.id),
        nombre_empresa: lead.nombre_empresa,
        normName,
        emails,
        phones,
        whatsapps,
        row: lead
      };
    });

    // 3. Find connected components (groups of duplicates)
    // We group leads that share a normalized name OR share at least one email address
    const parent = new Map<number, number>();

    function find(id: number): number {
      if (!parent.has(id)) {
        parent.set(id, id);
        return id;
      }
      let root = id;
      while (root !== parent.get(root)) {
        root = parent.get(root)!;
      }
      // Path compression
      let curr = id;
      while (curr !== root) {
        let nxt = parent.get(curr)!;
        parent.set(curr, root);
        curr = nxt;
      }
      return root;
    }

    function union(id1: number, id2: number) {
      const r1 = find(id1);
      const r2 = find(id2);
      if (r1 !== r2) {
        parent.set(r1, r2);
      }
    }

    // Connect leads sharing emails or company name
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const l1 = leads[i];
        const l2 = leads[j];

        let match = false;

        // Match if same normalized name (non-empty)
        if (l1.normName && l1.normName === l2.normName) {
          match = true;
        }

        // Match if they share at least one email
        if (!match) {
          const sharedEmail = l1.emails.some(e => l2.emails.includes(e));
          if (sharedEmail) {
            match = true;
          }
        }

        if (match) {
          union(l1.id, l2.id);
        }
      }
    }

    // Group leads by root parent
    const groups = new Map<number, typeof leads>();
    leads.forEach(lead => {
      const root = find(lead.id);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(lead);
    });

    console.log(`Se identificaron ${groups.size} grupos únicos de empresas/leads.`);

    const updates: Array<{
      primaryId: number;
      nombre_empresa: string;
      emails: string;
      phones: string;
      whatsapps: string;
      email_1_status: string | null;
      email_1_template: string | null;
      email_1_sent_at: Date | null;
      email_error: string | null;
      email_2_status: string | null;
      email_2_template: string | null;
      email_2_sent_at: Date | null;
      email_2_error: string | null;
      idsToDelete: number[];
    }> = [];

    let totalSavedRows = 0;
    let totalDeletedRows = 0;

    for (const [rootId, groupLeads] of groups.entries()) {
      if (groupLeads.length === 1) {
        // Only 1 lead, but we still want to clean/format its email and phone fields
        const lead = groupLeads[0];
        const formattedEmails = lead.emails.join(', ');
        const formattedPhones = lead.phones.join(', ');
        const formattedWhatsapps = lead.whatsapps.join(', ');

        if (
          formattedEmails !== lead.row.emails ||
          formattedPhones !== lead.row.telefonos_contacto ||
          formattedWhatsapps !== lead.row.numeros_whatsapp
        ) {
          updates.push({
            primaryId: lead.id,
            nombre_empresa: lead.nombre_empresa,
            emails: formattedEmails,
            phones: formattedPhones,
            whatsapps: formattedWhatsapps,
            email_1_status: lead.row.email_1_status,
            email_1_template: lead.row.email_1_template,
            email_1_sent_at: lead.row.email_1_sent_at,
            email_error: lead.row.email_error,
            email_2_status: lead.row.email_2_status,
            email_2_template: lead.row.email_2_template,
            email_2_sent_at: lead.row.email_2_sent_at,
            email_2_error: lead.row.email_2_error,
            idsToDelete: [],
          });
        }
        totalSavedRows++;
        continue;
      }

      // Multiple leads in the group - merge duplicates!
      console.log(`\nFUSIÓN DE DUPLICADOS para: "${groupLeads[0].nombre_empresa}" (Grupo de ${groupLeads.length} leads)`);
      groupLeads.forEach(l => {
        console.log(`  - ID: ${l.id} | Emails: "${l.row.emails}" | Tel: "${l.row.telefonos_contacto}" | E1 Status: "${l.row.email_1_status}" | E2 Status: "${l.row.email_2_status}"`);
      });

      // Find the primary lead
      // Criteria: prefer sent over error/pending, then lowest ID
      let primary = groupLeads[0];
      groupLeads.forEach(l => {
        const lScore = getStatusScore(l.row.email_1_status, l.row.email_2_status);
        const pScore = getStatusScore(primary.row.email_1_status, primary.row.email_2_status);
        
        if (lScore > pScore) {
          primary = l;
        } else if (lScore === pScore && l.id < primary.id) {
          primary = l;
        }
      });

      console.log(`  👉 Elegido como principal: ID ${primary.id} ("${primary.nombre_empresa}")`);

      // Merge unique emails, phones, and whatsapps
      const mergedEmails = Array.from(new Set(groupLeads.flatMap(l => l.emails)));
      const mergedPhones = Array.from(new Set(groupLeads.flatMap(l => l.phones)));
      const mergedWhatsapps = Array.from(new Set(groupLeads.flatMap(l => l.whatsapps)));

      // Merge statuses (taking the best status from all leads in the group)
      const email1Status = getBestStatus(groupLeads.map(l => l.row.email_1_status));
      const email2Status = getBestStatus(groupLeads.map(l => l.row.email_2_status));

      // Find templates and dates corresponding to the best statuses
      const email1LeadWithStatus = groupLeads.find(l => l.row.email_1_status === email1Status) || primary;
      const email2LeadWithStatus = groupLeads.find(l => l.row.email_2_status === email2Status) || primary;

      const idsToDelete = groupLeads.map(l => l.id).filter(id => id !== primary.id);
      totalDeletedRows += idsToDelete.length;
      totalSavedRows++;

      updates.push({
        primaryId: primary.id,
        nombre_empresa: primary.nombre_empresa,
        emails: mergedEmails.join(', '),
        phones: mergedPhones.join(', '),
        whatsapps: mergedWhatsapps.join(', '),
        email_1_status: email1Status,
        email_1_template: email1LeadWithStatus.row.email_1_template,
        email_1_sent_at: email1LeadWithStatus.row.email_1_sent_at,
        email_error: email1LeadWithStatus.row.email_error,
        email_2_status: email2Status,
        email_2_template: email2LeadWithStatus.row.email_2_template,
        email_2_sent_at: email2LeadWithStatus.row.email_2_sent_at,
        email_2_error: email2LeadWithStatus.row.email_2_error,
        idsToDelete,
      });

      console.log(`  ✨ Fusión propuesta:`);
      console.log(`    - Emails unificados: "${mergedEmails.join(', ')}"`);
      console.log(`    - Teléfonos unificados: "${mergedPhones.join(', ')}"`);
      console.log(`    - WhatsApps unificados: "${mergedWhatsapps.join(', ')}"`);
      console.log(`    - E1 Status: "${email1Status}" | E2 Status: "${email2Status}"`);
      console.log(`    - Registros a eliminar: [${idsToDelete.join(', ')}]`);
    }

    console.log(`\n---------------------------------`);
    console.log(`Resumen de la limpieza propuesta:`);
    console.log(`Total registros originales: ${rawLeads.length}`);
    console.log(`Registros a conservar/actualizar: ${totalSavedRows}`);
    console.log(`Registros duplicados a eliminar: ${totalDeletedRows}`);
    console.log(`Leads modificados/normalizados: ${updates.length}`);
    console.log(`---------------------------------\n`);

    // 4. Perform updates in database if NOT dry-run
    if (isDryRun) {
      console.log(`[SIMULACIÓN] No se realizaron cambios en la base de datos.`);
    } else {
      console.log(`Applying changes to database...`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Alter column types to prevent value too long errors (VARCHAR(255) to TEXT)
        console.log('Modifying column types to TEXT to avoid length restrictions...');
        await client.query(`
          ALTER TABLE "leads-al-por-mayor-mexico" ALTER COLUMN emails TYPE TEXT;
          ALTER TABLE "leads-al-por-mayor-mexico" ALTER COLUMN telefonos_contacto TYPE TEXT;
          ALTER TABLE "leads-al-por-mayor-mexico" ALTER COLUMN numeros_whatsapp TYPE TEXT;
        `);

        for (const update of updates) {
          // Update the primary row with clean and merged fields
          const updateQuery = `
            UPDATE "leads-al-por-mayor-mexico"
            SET emails = $1,
                telefonos_contacto = $2,
                numeros_whatsapp = $3,
                email_1_status = $4,
                email_1_template = $5,
                email_1_sent_at = $6,
                email_error = $7,
                email_2_status = $8,
                email_2_template = $9,
                email_2_sent_at = $10,
                email_2_error = $11
            WHERE id = $12
          `;
          await client.query(updateQuery, [
            update.emails,
            update.phones,
            update.whatsapps,
            update.email_1_status,
            update.email_1_template,
            update.email_1_sent_at,
            update.email_error,
            update.email_2_status,
            update.email_2_template,
            update.email_2_sent_at,
            update.email_2_error,
            update.primaryId
          ]);

          // Delete the secondary rows
          if (update.idsToDelete.length > 0) {
            const deleteQuery = `
              DELETE FROM "leads-al-por-mayor-mexico"
              WHERE id = ANY($1)
            `;
            await client.query(deleteQuery, [update.idsToDelete]);
          }
        }

        await client.query('COMMIT');
        console.log(`✅ Base de datos limpiada con éxito. Se eliminaron ${totalDeletedRows} duplicados.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error durante la transacción, revertido (rolled back):', err);
      } finally {
        client.release();
      }
    }

  } catch (err) {
    console.error('Error in main:', err);
  } finally {
    await pool.end();
  }
}

// Utility: assign scores to statuses to determine primary lead
// enviado = 3, error = 2, pendiente = 1, null = 0
function getStatusScore(email1Status: string | null, email2Status: string | null): number {
  let score = 0;
  if (email1Status === 'enviado') score += 3;
  else if (email1Status === 'error') score += 1;
  else if (email1Status === 'pendiente') score += 0.5;

  if (email2Status === 'enviado') score += 3;
  else if (email2Status === 'error') score += 1;
  else if (email2Status === 'pendiente') score += 0.5;

  return score;
}

// Utility: select best status from a group
function getBestStatus(statuses: Array<string | null>): string | null {
  if (statuses.includes('enviado')) return 'enviado';
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('pendiente')) return 'pendiente';
  return null;
}

main().catch(console.error);
