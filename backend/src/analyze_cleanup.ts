import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function analyzeData() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    const total = await pool.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
    
    const withContact = await pool.query(`
      SELECT COUNT(*) FROM comercio_minorista_inegi 
      WHERE (telefono IS NOT NULL AND telefono != '') 
      OR (correoelec IS NOT NULL AND correoelec != '')
    `);

    const chains = await pool.query(`
      SELECT COUNT(*) FROM comercio_minorista_inegi 
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

    console.log('--- ANALISIS DE DATOS ---');
    console.log('Total de registros:', total.rows[0].count);
    console.log('Registros con contacto (tel o email):', withContact.rows[0].count);
    console.log('Registros de grandes cadenas detectadas:', chains.rows[0].count);
    
    const sampleChains = await pool.query(`
      SELECT nom_estab, raz_social FROM comercio_minorista_inegi 
      WHERE nom_estab ILIKE '%OXXO%' LIMIT 5
    `);
    console.log('\nMuestra de cadenas detectadas:');
    console.table(sampleChains.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

analyzeData();
