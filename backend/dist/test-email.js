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
const mailer_1 = require("./services/mailer");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Cargar variables de entorno manualmente para el script
dotenv.config({ path: path.join(__dirname, '../.env') });
async function test() {
    const testEmail = 'juliorj717@gmail.com';
    console.log(`\n🚀 Iniciando envío de prueba combinado para: ${testEmail}`);
    console.log(`Remitente SMTP: ${mailer_1.emailUser}`);
    // 1. Datos para prueba de Colombia
    const dataColombia = {
        nombre_empresa: 'Distribuidora del Valle BIC (Colombia)',
        nombre_comercial: 'Distribuidora del Valle',
        descripcion_corta: 'Empresa distribuidora líder con más de 15 años de trayectoria llevando productos de consumo masivo a tiendas, minimercados y farmacias.',
        enfoque_ventas: 'Optimizar la gestión de pedidos de productos de consumo masivo y dermo-cosméticos.',
        sector: 'Salud y Consumo Masivo',
        productos: 'bebidas gaseosas, dermo-cosméticos y snacks',
        telefono: '+573143783993',
        lead_id: 222
    };
    console.log('\n--- ENVIANDO CAMPAÑA COLOMBIA ---');
    console.log('Enviando plantilla Asesor A (Colombia - Santiago Torres - Cards)...');
    const successCoAsesor = await (0, mailer_1.sendMarketingEmail)(testEmail, { ...dataColombia, campana_utm: 'scraping_camara_comercio_asesor' }, 'asesor', 'colombia');
    console.log('Enviando plantilla Asesor B (Colombia - Santiago Torres - Word/Plana)...');
    const successCoAsesorB = await (0, mailer_1.sendMarketingEmail)(testEmail, { ...dataColombia, campana_utm: 'scraping_camara_comercio_asesorb' }, 'asesor_b', 'colombia');
    console.log('\n=============================================');
    if (successCoAsesor && successCoAsesorB) {
        console.log('✅ ¡Los 2 correos de prueba (Asesor A y Asesor B) fueron enviados con éxito!');
        console.log('Revisa tu bandeja de entrada para verificar y comparar las estrategias.');
    }
    else {
        console.error('❌ Error al enviar una o más plantillas de prueba.');
    }
    console.log('=============================================');
    process.exit(0);
}
test().catch(console.error);
