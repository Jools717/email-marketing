import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listSentLeads() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const res = await pool.query(`
      SELECT nombre_empresa, emails, email_1_status, email_1_template 
      FROM "leads-al-por-mayor-mexico"
      ORDER BY email_1_template ASC, nombre_empresa ASC
    `);

    const marketing: string[] = [];
    const asesor: string[] = [];
    const pending: string[] = [];

    res.rows.forEach(row => {
      const info = `${row.nombre_empresa} (${row.emails || 'Sin email'})`;
      if (row.email_1_status === 'enviado') {
        if (row.email_1_template === 'marketing') {
          marketing.push(info);
        } else if (row.email_1_template === 'asesor') {
          asesor.push(info);
        }
      } else {
        pending.push(`${info} - Estado: ${row.email_1_status || 'null'}`);
      }
    });

    console.log('\n--- TEMPLATE: MARKETING (' + marketing.length + ') ---');
    marketing.forEach((e, idx) => console.log(`${idx + 1}. ${e}`));

    console.log('\n--- TEMPLATE: ASESOR (' + asesor.length + ') ---');
    asesor.forEach((e, idx) => console.log(`${idx + 1}. ${e}`));

    console.log('\n--- PENDIENTES / SIN ENVIAR (' + pending.length + ') ---');
    pending.forEach((e, idx) => console.log(`${idx + 1}. ${e}`));

  } catch (err) {
    console.error('Error listing leads:', err);
  } finally {
    await pool.end();
  }
}

listSentLeads();
