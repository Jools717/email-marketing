"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getMexicoLeads = getMexicoLeads;
exports.updateMexicoLeadStatus = updateMexicoLeadStatus;
exports.getColombiaLeads = getColombiaLeads;
exports.updateColombiaLeadStatus = updateColombiaLeadStatus;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || '5432'),
});
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
    const result = await exports.pool.query(query, [limit]);
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
    await exports.pool.query(query, [status, template, error || null, id]);
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
    const result = await exports.pool.query(query, [limit]);
    return result.rows;
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
    await exports.pool.query(query, [status, template, error || null, id]);
}
