import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  const client = await pool.connect();

  try {
    console.log('Iniciando limpieza de la base de datos...');
    
    const countBefore = await client.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
    console.log(`Registros antes de la limpieza: ${countBefore.rows[0].count}`);

    await client.query('BEGIN');

    // 1. Eliminar los que no tienen contacto (ni teléfono ni correo)
    console.log('Eliminando registros sin contacto (sin teléfono ni correo)...');
    const resNoContact = await client.query(`
      DELETE FROM comercio_minorista_inegi
      WHERE (telefono IS NULL OR TRIM(telefono) = '') 
        AND (correoelec IS NULL OR TRIM(correoelec) = '')
    `);
    console.log(`- Eliminados: ${resNoContact.rowCount}`);

    // 2. Eliminar "Sin Nombre" o genéricos cortos
    console.log('Eliminando registros sin nombre real o genéricos...');
    const resNoName = await client.query(`
      DELETE FROM comercio_minorista_inegi
      WHERE nom_estab ILIKE '%SIN NOMBRE%' 
         OR (nom_estab ILIKE '%ABARROTES%' AND LENGTH(nom_estab) < 12)
         OR nom_estab IS NULL 
         OR TRIM(nom_estab) = ''
    `);
    console.log(`- Eliminados: ${resNoName.rowCount}`);

    // 3. Eliminar grandes cadenas corporativas
    console.log('Eliminando corporativos y grandes cadenas...');
    const resChains = await client.query(`
      DELETE FROM comercio_minorista_inegi
      WHERE nom_estab ILIKE '%OXXO%' 
         OR nom_estab ILIKE '%7-ELEVEN%'
         OR nom_estab ILIKE '%CIRCULO K%'
         OR nom_estab ILIKE '%TIENDAS NETO%'
         OR nom_estab ILIKE '%TIENDAS 3B%'
         OR nom_estab ILIKE '%BODEGA AURRERA%'
         OR nom_estab ILIKE '%WALMART%'
         OR nom_estab ILIKE '%SORIANA%'
         OR nom_estab ILIKE '%CHEDRAUI%'
    `);
    console.log(`- Eliminados: ${resChains.rowCount}`);

    await client.query('COMMIT');
    console.log('Limpieza completada y cambios guardados.');

    const countAfter = await client.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
    console.log(`Registros después de la limpieza: ${countAfter.rows[0].count}`);

    // Vacuum para recuperar espacio (opcional, PostgreSQL lo hace automático pero como borramos mucho ayuda)
    console.log('Optimizando tabla (VACUUM)...');
    await client.query('VACUUM ANALYZE comercio_minorista_inegi');
    console.log('Tabla optimizada.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante la limpieza. Se han revertido los cambios:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
