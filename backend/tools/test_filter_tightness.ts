import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  const csvPath = path.join(__dirname, '../../empresas-que-se-comunicaron.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo CSV en ${csvPath}`);
    process.exit(1);
  }

  const refsSet = new Set<string>();

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('Ruta de la página')) {
      continue;
    }
    const parts = line.split(',');
    if (parts.length < 2) continue;
    const urlPart = parts[0].trim();
    if (urlPart.includes('?')) {
      const queryString = urlPart.split('?')[1];
      const params = new URLSearchParams(queryString);
      const ref = params.get('ref');
      if (ref) refsSet.add(ref);
    }
  }

  const refs = Array.from(refsSet).map(r => parseInt(r) || 0);

  const query = `
    SELECT id, nombre_empresa, tipo_empresa, scoring_valor, sector, url_principal
    FROM empresas_leads_colombia
    WHERE id = ANY($1)
  `;
  const result = await pool.query(query, [refs]);
  const rows = result.rows;

  console.log(`\n--- ANÁLISIS DE FILTRADO DE ${rows.length} EMPRESAS ---`);
  
  // Nivel 1: Scoring >= 7
  const score7Plus = rows.filter(r => r.scoring_valor >= 7);
  console.log(`Leads con Scoring >= 7: ${score7Plus.length}`);
  
  // Nivel 2: Scoring >= 6
  const score6Plus = rows.filter(r => r.scoring_valor >= 6);
  console.log(`Leads con Scoring >= 6: ${score6Plus.length}`);

  // Nivel 3: Distribuidoras / Mayoristas explicitas (excluyendo comercializadoras si tienen bajo scoring)
  const explicitDistributors = rows.filter(r => {
    const type = (r.tipo_empresa || '').toLowerCase();
    const name = (r.nombre_empresa || '').toLowerCase();
    const isDist = type.includes('distrib') || type.includes('mayorist') || name.includes('distrib') || name.includes('mayorist');
    return isDist;
  });
  console.log(`Leads explícitamente "Distribuidora" o "Mayorista": ${explicitDistributors.length}`);

  // Tighter Filter: (Explicit Distributor/Wholesaler) AND Scoring >= 6
  const tightLeads = rows.filter(r => {
    const type = (r.tipo_empresa || '').toLowerCase();
    const name = (r.nombre_empresa || '').toLowerCase();
    const isDist = type.includes('distrib') || type.includes('mayorist') || name.includes('distrib') || name.includes('mayorist');
    return isDist && (r.scoring_valor >= 6);
  });
  console.log(`Leads con Tipo "Distribuidora/Mayorista" Y Scoring >= 6: ${tightLeads.length}`);
  console.log(`Ejemplos de este filtro más estricto:`);
  tightLeads.slice(0, 5).forEach(l => {
    console.log(`- ${l.nombre_empresa} (Scoring: ${l.scoring_valor}, Sector: ${l.sector})`);
  });

  await pool.end();
}

run().catch(console.error);
