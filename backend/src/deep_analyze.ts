import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function deepAnalyze() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const noName = await pool.query(`
      SELECT COUNT(*) FROM comercio_minorista_inegi 
      WHERE nom_estab ILIKE '%SIN NOMBRE%' 
      OR nom_estab ILIKE '%ABARROTES%' AND LENGTH(nom_estab) < 12
    `);

    console.log('Establecimientos sin nombre real o genéricos:', noName.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

deepAnalyze();
