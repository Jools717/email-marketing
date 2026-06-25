import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '55432'),
  });

  try {
    const client = await pool.connect();
    console.log("Conectado. Buscando columnas de empresas_leads...");
    const resColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'empresas_leads'
    `);
    console.table(resColumns.rows);

    const sample = await client.query('SELECT * FROM empresas_leads LIMIT 1');
    console.log('Muestra de datos de empresas_leads:');
    console.log(JSON.stringify(sample.rows[0], null, 2));

    client.release();
  } catch (err: any) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

main();
