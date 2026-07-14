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

async function run() {
  const csvPath = path.join(__dirname, '../../empresas-que-se-comunicaron.csv');
  const reportPath = path.join(__dirname, '../../empresas_interaccion.txt');

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

  console.log('Leyendo CSV y analizando interacciones...');

  for await (const line of rl) {
    // Ignorar comentarios o cabeceras
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('Ruta de la página')) {
      continue;
    }

    // El CSV tiene formato: URL,Sesiones
    const parts = line.split(',');
    if (parts.length < 2) continue;

    const urlPart = parts[0].trim();
    const sessions = parseInt(parts[1]?.trim() || '0') || 1;

    // Buscar si contiene la cadena de consulta con ref
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

  console.log(`Se encontraron ${interactionsMap.size} empresas únicas con interacciones.`);

  let reportContent = '';
  reportContent += `================================================================================\n`;
  reportContent += `INFORME DE EMPRESAS QUE INTERACTUARON CON LA CAMPAÑA DE EMAIL MARKETING\n`;
  reportContent += `Generado el: ${new Date().toLocaleString()}\n`;
  reportContent += `Total de empresas identificadas: ${interactionsMap.size}\n`;
  reportContent += `================================================================================\n\n`;

  let idx = 1;
  for (const [ref, interaction] of interactionsMap.entries()) {
    try {
      // Buscar en empresas_leads_colombia
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
        
        reportContent += `--------------------------------------------------------------------------------\n`;
        reportContent += `${idx}. EMPRESA: ${lead.nombre_empresa || interaction.empresaParam || 'N/A'}\n`;
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

        reportContent += `DESCRIPCIÓN CORTA:\n`;
        reportContent += `${lead.descripcion_corta || 'No especificada en BD.'}\n\n`;

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
        reportContent += `- Total Clicks/Sesiones: ${interaction.clicks}\n`;
        reportContent += `- Emails que hicieron clic: ${Array.from(interaction.emailsClicked).join(', ') || 'Email no capturado en URL'}\n`;
        reportContent += `\n\n`;
      } else {
        // Si no se encuentra en la base de datos de leads de Colombia
        reportContent += `--------------------------------------------------------------------------------\n`;
        reportContent += `${idx}. EMPRESA (No encontrada en BD): ${interaction.empresaParam || 'N/A'}\n`;
        reportContent += `--------------------------------------------------------------------------------\n`;
        reportContent += `ID Lead en Link : ${ref}\n`;
        reportContent += `DETALLES DE LA INTERACCIÓN EN LA CAMPAÑA:\n`;
        reportContent += `- Total Clicks/Sesiones: ${interaction.clicks}\n`;
        reportContent += `- Emails que hicieron clic: ${Array.from(interaction.emailsClicked).join(', ') || 'N/A'}\n`;
        reportContent += `\n\n`;
      }
    } catch (err: any) {
      console.error(`Error procesando ID ${ref}:`, err.message);
    }
    idx++;
  }

  fs.writeFileSync(reportPath, reportContent, 'utf-8');
  console.log(`Reporte generado exitosamente en: ${reportPath}`);
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await pool.end();
});
