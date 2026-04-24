import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function testQuery() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const client = await pool.connect();
    
    console.time('Random Query');
    const res = await client.query('SELECT id, nom_estab, entidad FROM comercio_minorista_inegi WHERE latitud IS NOT NULL ORDER BY RANDOM() LIMIT 100');
    console.timeEnd('Random Query');
    
    console.log(res.rows[0]);
    
    console.time('Encoding Check');
    const res2 = await client.query("SELECT entidad FROM comercio_minorista_inegi WHERE entidad LIKE '%M_xico%' LIMIT 1");
    console.log('Raw DB value:', res2.rows[0]?.entidad);
    
    client.release();
  } catch (err: any) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

testQuery();
