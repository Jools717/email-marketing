import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectResults() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const res = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email_2_status = 'enviado' THEN 1 END) as email_2_enviado,
        COUNT(CASE WHEN email_2_status = 'pendiente' THEN 1 END) as email_2_pendiente,
        COUNT(CASE WHEN email_2_status = 'error' THEN 1 END) as email_2_error,
        COUNT(CASE WHEN email_2_status IS NULL THEN 1 END) as email_2_null,
        COUNT(CASE WHEN email_2_template = 'marketing' THEN 1 END) as temp_marketing,
        COUNT(CASE WHEN email_2_template = 'asesor' THEN 1 END) as temp_asesor
      FROM "leads-al-por-mayor-mexico"
    `);
    console.log('Campaign 2 database results summary:');
    console.table(res.rows);

    const detailRes = await pool.query(`
      SELECT nombre_empresa, email_1_template, email_2_template, email_2_status 
      FROM "leads-al-por-mayor-mexico"
      WHERE email_1_status = 'enviado'
      ORDER BY nombre_empresa ASC
    `);
    console.log('Detailed company statuses for Campaign 2:');
    console.table(detailRes.rows);

  } catch (err) {
    console.error('Error during results check:', err);
  } finally {
    await pool.end();
  }
}

inspectResults();
