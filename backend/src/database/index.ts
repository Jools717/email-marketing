import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isSslEnabled = process.env.DB_SSL === 'true' || 
  (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isSslEnabled || process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'email_marketing',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || 'admin',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

export async function queryWithRetry(text: string, params?: any[], retries = 3, delayMs = 2000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      console.error(`⚠️ Error en base de datos (intento ${attempt}/${retries}): ${err.message}`);
      if (attempt === retries) {
        throw err;
      }
      console.log(`🔌 Esperando ${delayMs / 1000}s para reintentar la consulta...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

export interface Lead {
  id: number;
  nit: string;
  nombre_empresa: string;
  enfoque_ventas: string;
  emails: string;
  sector: string;
  scoring_valor: number;
  productos_principales?: string;
  telefonos_contacto?: string;
  email_1_status?: string;
  email_1_template?: string;
  nombre_comercial?: string;
  descripcion_corta?: string;
  email_2_status?: string;
  email_2_template?: string;
}

// === MEXICO DATABASE OPERATIONS ===

export async function getMexicoLeads(limit = 100): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor, email_1_status
    FROM "leads-al-por-mayor-mexico"
    WHERE emails IS NOT NULL AND emails != ''
    AND (email_1_status IS NULL OR email_1_status = 'pendiente' OR email_1_status = 'error')
    ORDER BY created_at DESC
    LIMIT $1
  `;
  
  const result = await queryWithRetry(query, [limit]);
  return result.rows;
}

export async function updateMexicoLeadStatus(id: number, status: string, template: string, error?: string) {
  const query = `
    UPDATE "leads-al-por-mayor-mexico"
    SET email_1_status = $1,
        email_1_template = $2,
        email_1_sent_at = NOW(),
        email_error = $3
    WHERE id = $4
  `;
  
  await queryWithRetry(query, [status, template, error || null, id]);
}

// === COLOMBIA DATABASE OPERATIONS ===

export async function getColombiaLeads(limit = 100): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor, productos_principales, telefonos_contacto, email_1_status, nombre_comercial, descripcion_corta
    FROM "empresas_leads_colombia"
    WHERE emails IS NOT NULL AND emails != ''
    AND (email_1_status IS NULL OR email_1_status = 'pendiente' OR email_1_status = 'error')
    ORDER BY created_at DESC
    LIMIT $1
  `;
  
  const result = await queryWithRetry(query, [limit]);
  return result.rows;
}

export async function updateColombiaLeadStatus(id: number, status: string, template: string, error?: string) {
  const query = `
    UPDATE "empresas_leads_colombia"
    SET email_1_status = $1,
        email_1_template = $2,
        email_1_sent_at = NOW(),
        email_error = $3
    WHERE id = $4
  `;
  
  await queryWithRetry(query, [status, template, error || null, id]);
}

export async function getMexicoLeadsForEmail2(limit = 100): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor, email_1_status, email_1_template
    FROM "leads-al-por-mayor-mexico"
    WHERE emails IS NOT NULL AND emails != ''
    AND email_1_status = 'enviado'
    AND (email_2_status IS NULL OR email_2_status = 'pendiente' OR email_2_status = 'error')
    ORDER BY email_1_sent_at ASC
    LIMIT $1
  `;
  
  const result = await queryWithRetry(query, [limit]);
  return result.rows;
}

export async function updateLeadStatusEmail2(id: number, status: string, template: string, error?: string) {
  const query = `
    UPDATE "leads-al-por-mayor-mexico"
    SET email_2_status = $1,
        email_2_template = $2,
        email_2_sent_at = NOW(),
        email_2_error = $3
    WHERE id = $4
  `;
  
  await queryWithRetry(query, [status, template, error || null, id]);
}

export async function getColombiaLeadsForEmail2(limit = 100, minHoursPassed = 24): Promise<Lead[]> {
  const query = `
    SELECT id, nit, nombre_empresa, enfoque_ventas, emails, sector, scoring_valor, productos_principales, telefonos_contacto, email_1_status, email_1_template, nombre_comercial, descripcion_corta
    FROM "empresas_leads_colombia"
    WHERE emails IS NOT NULL AND emails != ''
    AND email_1_status = 'enviado'
    AND (email_2_status IS NULL OR email_2_status = 'pendiente' OR email_2_status = 'error')
    AND email_1_sent_at < NOW() - $2 * INTERVAL '1 hour'
    ORDER BY email_1_sent_at ASC
    LIMIT $1
  `;
  
  const result = await queryWithRetry(query, [limit, minHoursPassed]);
  return result.rows;
}

export async function countRecentColombiaEmail1(hours = 24): Promise<number> {
  const query = `
    SELECT COUNT(*)::integer as count 
    FROM "empresas_leads_colombia"
    WHERE email_1_status = 'enviado'
    AND email_1_sent_at >= NOW() - $1 * INTERVAL '1 hour'
  `;
  
  const result = await queryWithRetry(query, [hours]);
  return result.rows[0].count || 0;
}


export async function updateColombiaLeadStatusEmail2(id: number, status: string, template: string, error?: string) {
  const query = `
    UPDATE "empresas_leads_colombia"
    SET email_2_status = $1,
        email_2_template = $2,
        email_2_sent_at = NOW(),
        email_2_error = $3
    WHERE id = $4
  `;
  
  await queryWithRetry(query, [status, template, error || null, id]);
}

