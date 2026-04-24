import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function listColumns() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'comercio_minorista_inegi'
    `);
    console.log('Columnas disponibles:');
    console.table(res.rows);

    const sample = await pool.query('SELECT * FROM comercio_minorista_inegi WHERE correoelec IS NOT NULL OR telefono IS NOT NULL LIMIT 1');
    console.log('Muestra de datos con contacto:');
    console.log(JSON.stringify(sample.rows[0], null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

listColumns();
