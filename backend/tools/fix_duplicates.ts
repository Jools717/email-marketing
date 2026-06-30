import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  console.log('Iniciando limpieza de duplicados...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Eliminar duplicados manteniendo solo el ID más bajo para cada CLEE
    console.log('Eliminando filas duplicadas...');
    await client.query(`
      DELETE FROM comercio_minorista_inegi a
      USING comercio_minorista_inegi b
      WHERE a.id > b.id AND a.clee = b.clee
    `);

    // 2. Agregar restricción de unicidad a la columna clee
    console.log('Agregando restricción UNIQUE a la columna clee...');
    await client.query(`
      ALTER TABLE comercio_minorista_inegi 
      ADD CONSTRAINT unique_clee UNIQUE (clee)
    `);

    await client.query('COMMIT');
    console.log('Migración completada con éxito. Ahora la base de datos no permitirá duplicados.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante la migración:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
