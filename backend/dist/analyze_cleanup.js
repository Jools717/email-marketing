"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function analyzeData() {
    const pool = new pg_1.Pool({
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT || '5432'),
    });
    try {
        const total = await pool.query('SELECT COUNT(*) FROM comercio_minorista_inegi');
        const withContact = await pool.query(`
      SELECT COUNT(*) FROM comercio_minorista_inegi 
      WHERE (telefono IS NOT NULL AND telefono != '') 
      OR (correoelec IS NOT NULL AND correoelec != '')
    `);
        const chains = await pool.query(`
      SELECT COUNT(*) FROM comercio_minorista_inegi 
      WHERE nom_estab ILIKE '%OXXO%' 
      OR nom_estab ILIKE '%7-ELEVEN%'
      OR nom_estab ILIKE '%CIRCULO K%'
      OR nom_estab ILIKE '%TIENDAS NETO%'
      OR nom_estab ILIKE '%TIENDAS 3B%'
      OR nom_estab ILIKE '%BODEGA AURRERA%'
      OR nom_estab ILIKE '%WALMART%'
      OR nom_estab ILIKE '%SORIANA%'
      OR nom_estab ILIKE '%CHEDRAUI%'
    `);
        console.log('--- ANALISIS DE DATOS ---');
        console.log('Total de registros:', total.rows[0].count);
        console.log('Registros con contacto (tel o email):', withContact.rows[0].count);
        console.log('Registros de grandes cadenas detectadas:', chains.rows[0].count);
        const sampleChains = await pool.query(`
      SELECT nom_estab, raz_social FROM comercio_minorista_inegi 
      WHERE nom_estab ILIKE '%OXXO%' LIMIT 5
    `);
        console.log('\nMuestra de cadenas detectadas:');
        console.table(sampleChains.rows);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await pool.end();
    }
}
analyzeData();
