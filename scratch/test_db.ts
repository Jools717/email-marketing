import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function testConnection() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: false // Assuming no SSL needed based on previous config
  });

  try {
    console.log('Intentando conectar a:', process.env.DB_HOST);
    const client = await pool.connect();
    console.log('Conexión exitosa.');

    const res = await client.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
    console.log('Total de registros en la tabla:', res.rows[0].count);

    const sample = await client.query('SELECT id, nom_estab, entidad, municipio FROM comercio_minorista_inegi LIMIT 3');
    console.log('Muestra de datos:', JSON.stringify(sample.rows, null, 2));

    client.release();
  } catch (err) {
    console.error('Error de conexión:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
