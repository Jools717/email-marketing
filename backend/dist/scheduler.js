"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const notifier_1 = require("./services/notifier");
dotenv_1.default.config();
const CRON_SCHEDULE = process.env.CAMPAIGN_CRON_SCHEDULE || '0 9 * * 1-5'; // Por defecto: Lunes a Viernes a las 9:00 AM
const TIMEZONE = process.env.CAMPAIGN_TIMEZONE || 'America/Bogota';
const CAMPAIGN_COUNTRY = (process.env.CAMPAIGN_COUNTRY || 'colombia').toLowerCase();
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP === 'true';
let isJobRunning = false;
/**
 * Ejecuta el script de la campaña en un subproceso aislado.
 * Esto evita fugas de memoria y asegura que un error no tumbe el planificador.
 */
function executeCampaign(country) {
    return new Promise((resolve) => {
        console.log(`\n======================================================`);
        console.log(`⏰ [SCHEDULER] Iniciando ejecución programada para: ${country.toUpperCase()}`);
        console.log(`🕒 Timestamp: ${new Date().toLocaleString()}`);
        console.log(`======================================================\n`);
        const isCompiled = __filename.endsWith('.js');
        const extension = isCompiled ? '.js' : '.ts';
        const scriptName = country === 'colombia' ? `index_colombia${extension}` : `index_mexico${extension}`;
        const scriptPath = path_1.default.join(__dirname, scriptName);
        // Si está compilado corre node nativo, si es desarrollo usa ts-node/register
        const execArgv = isCompiled ? [] : ['-r', 'ts-node/register'];
        const child = (0, child_process_1.fork)(scriptPath, [], {
            env: { ...process.env, CAMPAIGN_COUNTRY: country },
            execArgv,
        });
        child.on('error', async (err) => {
            console.error(`❌ [SCHEDULER] Error al iniciar subproceso:`, err);
            await notifier_1.notifier.notifyCampaignStopped(country, 'Fallo al arrancar el subproceso de la campaña', err);
            resolve(false);
        });
        child.on('exit', async (code, signal) => {
            if (code === 0) {
                console.log(`✅ [SCHEDULER] Campaña (${country}) finalizada exitosamente.`);
                resolve(true);
            }
            else {
                const errorDetail = `Proceso finalizó con código de salida ${code}${signal ? ` (Señal: ${signal})` : ''}`;
                console.error(`🚨 [SCHEDULER] La campaña se detuvo con errores: ${errorDetail}`);
                await notifier_1.notifier.notifyCampaignStopped(country, 'La campaña se detuvo inesperadamente con código de error', errorDetail);
                resolve(false);
            }
        });
    });
}
/**
 * Tarea principal que ejecuta las campañas configuradas
 */
async function runScheduledJob() {
    if (isJobRunning) {
        console.warn('⚠️ [SCHEDULER] Ya hay una campaña en ejecución. Omitiendo este ciclo para evitar solapamientos.');
        return;
    }
    isJobRunning = true;
    try {
        if (CAMPAIGN_COUNTRY === 'both' || CAMPAIGN_COUNTRY === 'todas') {
            await executeCampaign('colombia');
            await executeCampaign('mexico');
        }
        else {
            await executeCampaign(CAMPAIGN_COUNTRY);
        }
    }
    catch (err) {
        console.error('❌ [SCHEDULER] Error inesperado en el ciclo de ejecución:', err);
        await notifier_1.notifier.notifyCampaignStopped(CAMPAIGN_COUNTRY, 'Error no controlado en el scheduler', err);
    }
    finally {
        isJobRunning = false;
    }
}
// ==========================================
// REGISTRO DE SEÑALES Y ERRORES DEL SISTEMA
// ==========================================
process.on('uncaughtException', async (error) => {
    console.error('💥 [CRASH] Excepción no capturada:', error);
    await notifier_1.notifier.notifyCampaignStopped(CAMPAIGN_COUNTRY, 'Servidor caído por excepción no controlada (uncaughtException)', error);
    process.exit(1);
});
process.on('unhandledRejection', async (reason) => {
    console.error('💥 [CRASH] Rechazo de promesa no controlado:', reason);
    await notifier_1.notifier.notifyCampaignStopped(CAMPAIGN_COUNTRY, 'Error por rechazo de promesa no controlado (unhandledRejection)', reason);
});
process.on('SIGINT', async () => {
    console.log('\n🛑 [SCHEDULER] Interrupción manual recibida (SIGINT / Ctrl+C). Cerrando...');
    await notifier_1.notifier.sendWhatsApp(`⚠️ *Scheduler Detenido Manualmente*\nEl proceso de automatización fue detenido por el usuario o administrador.`);
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 [SCHEDULER] Señal de terminación recibida (SIGTERM). Cerrando...');
    await notifier_1.notifier.sendWhatsApp(`⚠️ *Scheduler Detenido (SIGTERM)*\nEl contenedor o servidor se está apagando.`);
    process.exit(0);
});
// ==========================================
// INICIALIZACIÓN DEL CRON
// ==========================================
console.log('======================================================');
console.log('🤖 SISTEMA DE PROGRAMACIÓN AUTOMÁTICA (SCHEDULER)');
console.log('======================================================');
console.log(`🌍 País configurado: ${CAMPAIGN_COUNTRY.toUpperCase()}`);
console.log(`📅 Expresión Cron: "${CRON_SCHEDULE}"`);
console.log(`🌐 Zona Horaria: ${TIMEZONE}`);
console.log(`📱 Notificaciones WhatsApp: ${process.env.NOTIFY_PHONE ? 'ACTIVAS (' + process.env.NOTIFY_PHONE + ')' : 'DESACTIVADAS (falta NOTIFY_PHONE)'}`);
console.log('======================================================\n');
if (!node_cron_1.default.validate(CRON_SCHEDULE)) {
    console.error(`❌ La expresión Cron "${CRON_SCHEDULE}" no es válida. Revisa CAMPAIGN_CRON_SCHEDULE en tu .env.`);
    process.exit(1);
}
// Programar la tarea recurrente
node_cron_1.default.schedule(CRON_SCHEDULE, () => {
    runScheduledJob();
}, {
    timezone: TIMEZONE,
});
console.log(`⏳ Scheduler activo. Esperando el próximo horario programado...`);
// Si se configuró RUN_ON_STARTUP=true, ejecuta una vez de inmediato
if (RUN_ON_STARTUP) {
    console.log('🚀 [RUN_ON_STARTUP] Ejecutando campaña inicial de inmediato...');
    runScheduledJob();
}
