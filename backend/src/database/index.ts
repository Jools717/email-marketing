import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export interface Lead {
  id: number;
  nit: string;
  nombre_empresa: string;
  enfoque_ventas: string;
  emails: string;
  sector: string;
  scoring_valor: number;
  email_1_status?: string;
}

export async function getMexicoLeads(limit = 100): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor, email_1_status
    FROM "leads-al-por-mayor-mexico"
    WHERE emails IS NOT NULL AND emails != ''
    AND (email_1_status IS NULL OR email_1_status = 'pendiente' OR email_1_status = 'error')
    ORDER BY created_at DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows;
}

export async function updateLeadStatus(id: number, status: string, template: string, error?: string) {
  const query = `
    UPDATE "leads-al-por-mayor-mexico"
    SET email_1_status = $1,
        email_1_template = $2,
        email_1_sent_at = NOW(),
        email_error = $3
    WHERE id = $4
  `;
  
  await pool.query(query, [status, template, error || null, id]);
}
