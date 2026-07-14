import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

interface Interaction {
  ref: string;
  empresaParam: string;
  emailsClicked: Set<string>;
  clicks: number;
}

interface LeadData {
  id: number;
  nit: string;
  nombre_empresa: string;
  nombre_comercial: string;
  descripcion_corta: string;
  enfoque_ventas: string;
  sector: string;
  tipo_empresa: string;
  dolores_detectados: string;
  scoring_valor: number;
  productos_principales: any;
  emails: string;
  telefonos_contacto: string;
  numeros_whatsapp: string;
  personas_contacto: string;
  url_principal: string;
  clicks: number;
  emailsClickedStr: string;
}

async function run() {
  const csvPath = path.join(__dirname, '../../empresas-que-se-comunicaron.csv');
  const reportPath = path.join(__dirname, '../../leads_calificados.txt');

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo CSV en ${csvPath}`);
    process.exit(1);
  }

  const interactionsMap = new Map<string, Interaction>();

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('Ruta de la página')) {
      continue;
    }

    const parts = line.split(',');
    if (parts.length < 2) continue;

    const urlPart = parts[0].trim();
    const sessions = parseInt(parts[1]?.trim() || '0') || 1;

    if (urlPart.includes('?')) {
      const queryString = urlPart.split('?')[1];
      const params = new URLSearchParams(queryString);
      const ref = params.get('ref');
      const empresa = params.get('empresa');
      const email = params.get('email');

      if (ref) {
        const decodedEmpresa = empresa ? decodeURIComponent(empresa) : '';
        const decodedEmail = email ? decodeURIComponent(email) : '';

        if (!interactionsMap.has(ref)) {
          interactionsMap.set(ref, {
            ref,
            empresaParam: decodedEmpresa,
            emailsClicked: new Set<string>(),
            clicks: 0,
          });
        }

        const data = interactionsMap.get(ref)!;
        if (decodedEmail) {
          data.emailsClicked.add(decodedEmail);
        }
        data.clicks += sessions;
      }
    }
  }

  const group1: LeadData[] = []; // Alta prioridad: Distribuidoras/Mayoristas con Scoring >= 7
  const group2: LeadData[] = []; // Prioridad Media: Distribuidoras/Mayoristas con Scoring 5 o 6
  const group3: LeadData[] = []; // Alta Interacción pero bajo scoring/otros (Clicks >= 3, Scoring < 5)

  for (const [ref, interaction] of interactionsMap.entries()) {
    try {
      const query = `
        SELECT id, nit, nombre_empresa, nombre_comercial, descripcion_corta, enfoque_ventas, 
               sector, sector_productos, tipo_empresa, dolores_detectados, scoring_valor, 
               productos_principales, emails, telefonos_contacto, numeros_whatsapp, 
               personas_contacto, url_principal
        FROM empresas_leads_colombia
        WHERE id = $1
      `;
      const result = await pool.query(query, [parseInt(ref) || 0]);

      if (result.rows.length > 0) {
        const lead = result.rows[0];
        
        const typeStr = (lead.tipo_empresa || '').toLowerCase();
        const nameStr = (lead.nombre_empresa || '').toLowerCase();
        const isDistributor = typeStr.includes('distrib') || typeStr.includes('mayorist') || 
                              nameStr.includes('distrib') || nameStr.includes('mayorist');
        
        const score = lead.scoring_valor || 0;

        const leadData: LeadData = {
          ...lead,
          clicks: interaction.clicks,
          emailsClickedStr: Array.from(interaction.emailsClicked).join(', ') || 'N/A'
        };

        if (isDistributor && score >= 7) {
          group1.push(leadData);
        } else if (isDistributor && score >= 5 && score <= 6) {
          group2.push(leadData);
        } else if (interaction.clicks >= 3) {
          group3.push(leadData);
        }
      }
    } catch (err: any) {
      console.error(`Error procesando lead ID ${ref}:`, err.message);
    }
  }

  // Ordenar cada grupo por clics descendente, luego por scoring descendente
  const sortLeads = (arr: LeadData[]) => {
    arr.sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return (b.scoring_valor || 0) - (a.scoring_valor || 0);
    });
  };

  sortLeads(group1);
  sortLeads(group2);
  sortLeads(group3);

  let reportContent = '';
  reportContent += `================================================================================\n`;
  reportContent += `INFORME CLASIFICADO DE INTERACCIONES - LEADS CALIFICADOS PARA ASESOR COMERCIAL\n`;
  reportContent += `Generado el: ${new Date().toLocaleString()}\n`;
  reportContent += `Total de empresas analizadas con interacciones: 103\n`;
  reportContent += `================================================================================\n`;
  reportContent += `RESUMEN DE SEGMENTACIÓN:\n`;
  reportContent += `- GRUPO 1 (Alta Prioridad - Distribuidoras/Mayoristas con Scoring >= 7): ${group1.length} leads\n`;
  reportContent += `- GRUPO 2 (Prioridad Media - Distribuidoras/Mayoristas con Scoring 5 o 6): ${group2.length} leads\n`;
  reportContent += `- GRUPO 3 (Calientes por Clics - Alta interacción >= 3, bajo scoring): ${group3.length} leads\n`;
  reportContent += `Total de Leads priorizados para investigar: ${group1.length + group2.length + group3.length} leads\n`;
  reportContent += `================================================================================\n\n`;

  const appendGroupToReport = (title: string, leads: LeadData[], description: string) => {
    reportContent += `################################################################################\n`;
    reportContent += `${title}\n`;
    reportContent += `Cantidad: ${leads.length} leads | ${description}\n`;
    reportContent += `################################################################################\n\n`;

    let idx = 1;
    for (const lead of leads) {
      reportContent += `--------------------------------------------------------------------------------\n`;
      reportContent += `${idx}. EMPRESA: ${lead.nombre_empresa}\n`;
      if (lead.nombre_comercial && lead.nombre_comercial !== lead.nombre_empresa) {
        reportContent += `   Nombre Comercial: ${lead.nombre_comercial}\n`;
      }
      reportContent += `--------------------------------------------------------------------------------\n`;
      reportContent += `ID Lead en BD   : ${lead.id}\n`;
      reportContent += `NIT             : ${lead.nit || 'N/A'}\n`;
      reportContent += `Página Web (URL): ${lead.url_principal || 'N/A'}\n`;
      reportContent += `Sector          : ${lead.sector || 'N/A'}\n`;
      reportContent += `Tipo Empresa    : ${lead.tipo_empresa || 'N/A'}\n`;
      reportContent += `Scoring (1-10)  : ${lead.scoring_valor || 'N/A'}\n\n`;

      reportContent += `DESCRIPCIÓN DE LA EMPRESA:\n`;
      reportContent += `${lead.descripcion_corta || 'No especificada.'}\n\n`;

      reportContent += `PRODUCTOS PRINCIPALES:\n`;
      if (Array.isArray(lead.productos_principales)) {
        reportContent += `- ${lead.productos_principales.join('\n- ')}\n\n`;
      } else if (lead.productos_principales) {
        reportContent += `${lead.productos_principales}\n\n`;
      } else {
        reportContent += `No especificados.\n\n`;
      }

      reportContent += `ENFOQUE DE VENTAS / DOLORES DETECTADOS:\n`;
      reportContent += `Enfoque: ${lead.enfoque_ventas || 'No especificado.'}\n`;
      if (lead.dolores_detectados) {
        reportContent += `Dolores: ${Array.isArray(lead.dolores_detectados) ? lead.dolores_detectados.join(', ') : lead.dolores_detectados}\n`;
      }
      reportContent += `\n`;

      reportContent += `INFORMACIÓN DE CONTACTO DE LA BASE DE DATOS:\n`;
      reportContent += `- Contactos: ${Array.isArray(lead.personas_contacto) ? lead.personas_contacto.join(', ') : (lead.personas_contacto || 'N/A')}\n`;
      reportContent += `- Emails en BD: ${lead.emails || 'N/A'}\n`;
      reportContent += `- Teléfono BD: ${lead.telefonos_contacto || 'N/A'}\n`;
      reportContent += `- WhatsApp BD: ${lead.numeros_whatsapp || 'N/A'}\n\n`;

      reportContent += `DETALLES DE LA INTERACCIÓN EN LA CAMPAÑA:\n`;
      reportContent += `- Clics/Sesiones: ${lead.clicks}\n`;
      reportContent += `- Email(s) que interactuó: ${lead.emailsClickedStr}\n`;
      reportContent += `\n\n`;
      idx++;
    }
  };

  appendGroupToReport(
    'GRUPO 1: ALTA PRIORIDAD - DISTRIBUIDORAS Y MAYORISTAS TOP (SCORING >= 7)', 
    group1, 
    'Empresas con el encaje perfecto de modelo de negocio y alta calificación.'
  );

  appendGroupToReport(
    'GRUPO 2: PRIORIDAD MEDIA - DISTRIBUIDORAS Y MAYORISTAS (SCORING 5 o 6)', 
    group2, 
    'Empresas con buen modelo de negocio y calificación media.'
  );

  appendGroupToReport(
    'GRUPO 3: CALIENTES POR COMPORTAMIENTO (CLICS >= 3, SCORING BAJO O SIN TIPO EXPLICITO)', 
    group3, 
    'No son distribuidoras/mayoristas confirmadas o tienen bajo scoring, pero mostraron mucho interés clicando repetidas veces (ej. Pandora).'
  );

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`Reporte clasificado y filtrado generado exitosamente en: ${reportPath}`);
  console.log(`Grupo 1: ${group1.length} | Grupo 2: ${group2.length} | Grupo 3: ${group3.length}`);
  
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await pool.end();
});
