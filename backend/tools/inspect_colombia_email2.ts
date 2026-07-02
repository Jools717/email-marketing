import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_enviado_1,
        COUNT(CASE WHEN email_1_template = 'asesor' THEN 1 END) as email_1_asesor,
        COUNT(CASE WHEN email_1_template = 'asesor_b' THEN 1 END) as email_1_asesor_b,
        COUNT(CASE WHEN email_2_status = 'enviado' THEN 1 END) as email_2_enviado,
        COUNT(CASE WHEN email_2_status IS NULL OR email_2_status = 'pendiente' OR email_2_status = 'error' THEN 1 END) as email_2_pendiente
      FROM "empresas_leads_colombia"
      WHERE email_1_status = 'enviado'
    `);
    console.log('Statistics for Colombia Email 2 candidates:');
    console.table(statsRes.rows);

    const samplesRes = await pool.query(`
      SELECT id, nombre_empresa, emails, email_1_template, email_2_status, email_2_template
      FROM "empresas_leads_colombia"
      WHERE email_1_status = 'enviado'
      LIMIT 10
    `);
    console.log('Sample leads:');
    console.table(samplesRes.rows);

  } catch (err) {
    console.error('Error during Colombia Email 2 inspection:', err);
  } finally {
    await pool.end();
  }
}

main();
