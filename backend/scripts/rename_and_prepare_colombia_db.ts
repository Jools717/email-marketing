import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '55432'),
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Iniciando migración de base de datos para Colombia...");

    // 1. Renombrar empresas_leads si existe
    console.log("Renombrando tabla empresas_leads a empresas_leads_colombia...");
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'empresas_leads') THEN
          ALTER TABLE empresas_leads RENAME TO empresas_leads_colombia;
          RAISE NOTICE 'Tabla empresas_leads renombrada a empresas_leads_colombia';
        ELSE
          RAISE NOTICE 'La tabla empresas_leads no existe o ya fue renombrada';
        END IF;
      END $$;
    `);

    // 2. Agregar columnas de seguimiento a empresas_leads_colombia
    console.log("Agregando columnas de tracking a empresas_leads_colombia...");
    await client.query(`
      ALTER TABLE empresas_leads_colombia 
      ADD COLUMN IF NOT EXISTS email_1_status VARCHAR(50) DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS email_1_template VARCHAR(50),
      ADD COLUMN IF NOT EXISTS email_1_sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS email_error TEXT;
    `);
    console.log("Columnas de tracking agregadas/verificadas.");

    // 3. Crear tabla de clics de marketing para Colombia
    console.log("Creando tabla marketing_clicks_email_colombia...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_clicks_email_colombia (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER,
        fuente TEXT,
        medio TEXT,
        campana TEXT,
        contenido TEXT,
        fecha_clic TIMESTAMPTZ DEFAULT NOW(),
        ip_usuario TEXT,
        user_agent TEXT,
        url_completa TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_clicks_co_lead_id ON marketing_clicks_email_colombia(lead_id);
      CREATE INDEX IF NOT EXISTS idx_clicks_co_fecha ON marketing_clicks_email_colombia(fecha_clic);
    `);
    console.log("Tabla marketing_clicks_email_colombia creada/verificada.");
    
    console.log("✅ ¡Migración de base de datos completada con éxito!");
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
