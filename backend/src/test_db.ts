import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    console.log('--- TEST DE CONEXION ---');
    console.log('Host:', process.env.DB_HOST);
    console.log('DB:', process.env.DB_NAME);
    
    const client = await pool.connect();
    console.log('CONEXION EXITOSA.');

    const res = await client.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
    console.log('TOTAL DE REGISTROS:', res.rows[0].count);

    const sample = await client.query('SELECT id, nom_estab, entidad, municipio FROM comercio_minorista_inegi LIMIT 3');
    console.log('MUESTRA DE DATOS:');
    console.table(sample.rows);

    client.release();
  } catch (err: any) {
    console.error('ERROR DE CONEXION:');
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
