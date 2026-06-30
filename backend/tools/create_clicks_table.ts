import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function createClicksTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS marketing_clicks_email_mexico (
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
    
    CREATE INDEX IF NOT EXISTS idx_clicks_lead_id ON marketing_clicks_email_mexico(lead_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_fecha ON marketing_clicks_email_mexico(fecha_clic);
  `;

  try {
    console.log("Creando tabla marketing_clicks_email_mexico...");
    await pool.query(query);
    console.log("¡Tabla creada exitosamente!");
  } catch (error) {
    console.error("Error al crear la tabla:", error);
  } finally {
    await pool.end();
  }
}

createClicksTable();
