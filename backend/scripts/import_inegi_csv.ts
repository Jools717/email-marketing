import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import iconv from 'iconv-lite';
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

const CSV_FILE_PATH = path.join(__dirname, '../../data/empresas_al_por_menor/comercio-al-por-menor-inegi.csv');
const BATCH_SIZE = 2000;

async function createTableIfNotExists() {
  const query = `
    CREATE TABLE IF NOT EXISTS comercio_minorista_inegi (
      id SERIAL PRIMARY KEY,
      clee VARCHAR(50),
      nom_estab VARCHAR(255),
      raz_social VARCHAR(255),
      codigo_act VARCHAR(10),
      nombre_act VARCHAR(255),
      per_ocu VARCHAR(50),
      entidad VARCHAR(100),
      municipio VARCHAR(100),
      telefono VARCHAR(50),
      correoelec VARCHAR(255),
      www VARCHAR(255),
      latitud DECIMAL(10, 7),
      longitud DECIMAL(10, 7),
      fecha_alta VARCHAR(20)
    );
    CREATE INDEX IF NOT EXISTS idx_comercio_minorista_entidad ON comercio_minorista_inegi (entidad);
    CREATE INDEX IF NOT EXISTS idx_comercio_minorista_codigo_act ON comercio_minorista_inegi (codigo_act);
  `;
  await pool.query(query);
  console.log('Tabla y los índices asegurados.');
}

async function insertBatch(batch: any[]) {
  if (batch.length === 0) return;

  const client = await pool.connect();
  try {
    const values: any[] = [];
    const placeholders = batch.map((row, i) => {
      const offset = i * 14;
      values.push(
        row.clee || null,
        row.nom_estab || null,
        row.raz_social || null,
        row.codigo_act || null,
        row.nombre_act || null,
        row.per_ocu || null,
        row.entidad || null,
        row.municipio || null,
        row.telefono || null,
        row.correoelec || null,
        row.www || null,
        row.latitud ? parseFloat(row.latitud) : null,
        row.longitud ? parseFloat(row.longitud) : null,
        row.fecha_alta || null
      );
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`;
    }).join(',');

    const query = `
      INSERT INTO comercio_minorista_inegi (
        clee, nom_estab, raz_social, codigo_act, nombre_act, per_ocu, 
        entidad, municipio, telefono, correoelec, www, latitud, longitud, fecha_alta
      ) VALUES ${placeholders}
      ON CONFLICT (clee) DO NOTHING
    `;

    await client.query(query, values);
  } catch (error) {
    console.error('Error insertando lote:', error);
  } finally {
    client.release();
  }
}

async function main() {
  await createTableIfNotExists();
  
  // Consultar cuántos registros ya tenemos para retomar
  const countRes = await pool.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
  const skipCount = parseInt(countRes.rows[0].count);
  console.log(`La base de datos ya tiene ${skipCount} registros. Saltando...`);

  console.log(`Iniciando importación desde: ${CSV_FILE_PATH}`);

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`El archivo no existe: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  let batch: any[] = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  const parser = csvParser();

  // Usa iconv-lite para convertir de Windows-1252/ISO-8859-1 a UTF-8 al leer
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(iconv.decodeStream('iso-8859-1'))
    .pipe(parser)
    .on('data', async (data) => {
      totalProcessed++;
      
      // Si aún no hemos llegado al punto donde nos quedamos, saltamos la fila
      if (totalProcessed <= skipCount) {
        totalSkipped++;
        if (totalSkipped % 50000 === 0) {
          console.log(`Saltando registros conocidos: ${totalSkipped}...`);
        }
        return;
      }

      batch.push(data);

      if (batch.length >= BATCH_SIZE) {
        const currentBatch = [...batch];
        batch = [];
        totalInserted += currentBatch.length;
        
        // PAUSA EL STREAM PARA NO SATURAR LA MEMORIA
        parser.pause();
        
        if (totalInserted % 10000 === 0 || totalInserted < 5000) {
          console.log(`Procesados (Nuevos): ${totalInserted}. Total en archivo: ${totalProcessed}`);
        }
        
        try {
          await insertBatch(currentBatch);
        } finally {
          // REANUDA EL STREAM DESPUÉS DE LA INSERCIÓN
          parser.resume();
        }
      }
    })
    .on('end', async () => {
      if (batch.length > 0) {
        await insertBatch(batch);
        totalInserted += batch.length;
      }
      console.log(`Importación finalizada. Total filas procesadas: ${totalProcessed}`);
      await pool.end();
    })
    .on('error', (err) => {
      console.error('Error procesando CSV:', err);
    });
}

main().catch(console.error);
