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
    console.log('Añadiendo columnas de tracking de Email 2 a empresas_leads_colombia...');
    
    await pool.query(`
      ALTER TABLE "empresas_leads_colombia" 
      ADD COLUMN IF NOT EXISTS email_2_status VARCHAR(20) DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS email_2_template VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email_2_sent_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS email_2_error TEXT;
    `);

    console.log('✅ Columnas de Email 2 añadidas con éxito a empresas_leads_colombia.');
  } catch (error) {
    console.error('❌ Error en la migración de Email 2 para Colombia:', error);
  } finally {
    await pool.end();
  }
}

migrate();
