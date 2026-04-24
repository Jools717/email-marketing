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
}

export async function getMexicoLeads(minScore = 7): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor
    FROM "leads-al-por-mayor-mexico"
    WHERE emails IS NOT NULL AND emails != ''
    AND scoring_valor >= $1
    ORDER BY created_at DESC
  `;
  
  const result = await pool.query(query, [minScore]);
  return result.rows;
}
