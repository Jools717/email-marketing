"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./database/index");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function testConnection() {
    console.log('==============================================');
    console.log('🐘 TEST DE CONEXIÓN A POSTGRESQL');
    console.log('==============================================');
    if (process.env.DATABASE_URL) {
        console.log('📡 Modo: DATABASE_URL');
    }
    else {
        console.log(`📡 Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`🔌 Puerto: ${process.env.DB_PORT || '5432'}`);
        console.log(`🗄️ Base de datos: ${process.env.DB_NAME || 'email_marketing'}`);
        console.log(`👤 Usuario: ${process.env.DB_USER || 'postgres'}`);
    }
    try {
        const client = await index_1.pool.connect();
        console.log('\n✅ ¡CONEXIÓN A POSTGRESQL EXITOSA!');
        // Probar tabla de Colombia
        try {
            const colRes = await client.query('SELECT COUNT(*) FROM "empresas_leads_colombia"');
            console.log(`🇨🇴 Tabla "empresas_leads_colombia": ${colRes.rows[0].count} registros encontrados.`);
            const sample = await client.query('SELECT id, nombre_empresa, emails, email_1_status FROM "empresas_leads_colombia" LIMIT 2');
            if (sample.rows.length > 0) {
                console.log('Muestra de datos (Colombia):');
                console.table(sample.rows);
            }
        }
        catch (e) {
            console.log(`⚠️ La tabla "empresas_leads_colombia" no existe o no se pudo consultar: ${e.message}`);
        }
        // Probar tabla de México si existe
        try {
            const mexRes = await client.query('SELECT COUNT(*) FROM "leads-al-por-mayor-mexico"');
            console.log(`🇲🇽 Tabla "leads-al-por-mayor-mexico": ${mexRes.rows[0].count} registros encontrados.`);
        }
        catch {
            // Ignorar si solo se está usando Colombia
        }
        client.release();
        process.exit(0);
    }
    catch (err) {
        console.error('\n❌ ERROR AL CONECTAR A POSTGRESQL:');
        console.error(err.message);
        console.log('\n👉 Verifica tus credenciales en backend/.env (Host, Puerto, Usuario, Contraseña y Nombre de BD).');
        process.exit(1);
    }
    finally {
        await index_1.pool.end();
    }
}
testConnection();
