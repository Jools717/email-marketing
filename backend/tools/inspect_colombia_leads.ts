import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectColombia() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const columnsRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'empresas_leads_colombia'
    `);
    console.log('Columns in empresas_leads_colombia:');
    console.table(columnsRes.rows);

    const countRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email_1_status = 'enviado' THEN 1 END) as email_1_enviado,
        COUNT(CASE WHEN email_1_status = 'pendiente' THEN 1 END) as email_1_pendiente,
        COUNT(CASE WHEN email_1_status = 'error' THEN 1 END) as email_1_error,
        COUNT(CASE WHEN email_1_status IS NULL THEN 1 END) as email_1_null,
        COUNT(CASE WHEN email_1_template = 'asesor' THEN 1 END) as temp_asesor,
        COUNT(CASE WHEN email_1_template = 'asesor_b' THEN 1 END) as temp_asesor_b,
        COUNT(CASE WHEN email_1_template = 'marketing' THEN 1 END) as temp_marketing
      FROM "empresas_leads_colombia"
    `);
    console.log('Colombia statistics:');
    console.table(countRes.rows);

    const sampleRes = await pool.query(`
      SELECT id, nombre_empresa, emails, email_1_status, email_1_template 
      FROM "empresas_leads_colombia"
      WHERE email_1_status IS NOT NULL
      LIMIT 10
    `);
    console.log('Sample sent Colombia leads:');
    console.table(sampleRes.rows);

  } catch (err) {
    console.error('Error during Colombia inspection:', err);
  } finally {
    await pool.end();
  }
}

inspectColombia();
