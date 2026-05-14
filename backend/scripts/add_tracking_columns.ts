import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
  });

  try {
    console.log('Añadiendo columnas de tracking a la base de datos...');
    
    // Añadir columnas si no existen
    await pool.query(`
      ALTER TABLE "leads-al-por-mayor-mexico" 
      ADD COLUMN IF NOT EXISTS email_1_status VARCHAR(20) DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS email_1_template VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email_1_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS email_error TEXT;
    `);

    console.log('✅ Columnas añadidas con éxito.');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await pool.end();
  }
}

migrate();
