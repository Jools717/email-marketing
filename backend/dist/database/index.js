"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.queryWithRetry = queryWithRetry;
exports.getMexicoLeads = getMexicoLeads;
exports.updateMexicoLeadStatus = updateMexicoLeadStatus;
exports.getColombiaLeads = getColombiaLeads;
exports.countPendingColombiaLeads = countPendingColombiaLeads;
exports.updateColombiaLeadStatus = updateColombiaLeadStatus;
exports.getMexicoLeadsForEmail2 = getMexicoLeadsForEmail2;
exports.updateLeadStatusEmail2 = updateLeadStatusEmail2;
exports.getColombiaLeadsForEmail2 = getColombiaLeadsForEmail2;
exports.countRecentColombiaEmail1 = countRecentColombiaEmail1;
exports.updateColombiaLeadStatusEmail2 = updateColombiaLeadStatusEmail2;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isSslEnabled = process.env.DB_SSL === 'true' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'));
exports.pool = new pg_1.Pool(process.env.DATABASE_URL
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
    });
async function queryWithRetry(text, params, retries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await exports.pool.query(text, params);
        }
        catch (err) {
            console.error(`⚠️ Error en base de datos (intento ${attempt}/${retries}): ${err.message}`);
            if (attempt === retries) {
                throw err;
            }
            console.log(`🔌 Esperando ${delayMs / 1000}s para reintentar la consulta...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
// === MEXICO DATABASE OPERATIONS ===
async function getMexicoLeads(limit = 100) {
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
async function updateMexicoLeadStatus(id, status, template, error) {
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
async function getColombiaLeads(limit = 100) {
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
async function countPendingColombiaLeads() {
    const query = `
    SELECT COUNT(*)::integer as count 
    FROM "empresas_leads_colombia"
    WHERE emails IS NOT NULL AND emails != ''
    AND (email_1_status IS NULL OR email_1_status = 'pendiente' OR email_1_status = 'error')
  `;
    const result = await queryWithRetry(query);
    return result.rows[0].count || 0;
}
async function updateColombiaLeadStatus(id, status, template, error) {
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
async function getMexicoLeadsForEmail2(limit = 100) {
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
async function updateLeadStatusEmail2(id, status, template, error) {
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
async function getColombiaLeadsForEmail2(limit = 100, minHoursPassed = 24) {
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
async function countRecentColombiaEmail1(hours = 24) {
    const query = `
    SELECT COUNT(*)::integer as count 
    FROM "empresas_leads_colombia"
    WHERE email_1_status = 'enviado'
    AND email_1_sent_at >= NOW() - $1 * INTERVAL '1 hour'
  `;
    const result = await queryWithRetry(query, [hours]);
    return result.rows[0].count || 0;
}
async function updateColombiaLeadStatusEmail2(id, status, template, error) {
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
