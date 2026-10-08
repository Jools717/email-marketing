"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const notifier_1 = require("./services/notifier");
dotenv_1.default.config();
async function testNotification() {
    console.log('==============================================');
    console.log('🧪 PRUEBA DE CONEXIÓN CON EL NOTIFICADOR WHATSAPP');
    console.log('==============================================');
    const endpoint = process.env.NOTIFY_ENDPOINT_URL || 'http://localhost:3000/api/notify';
    const hasToken = !!(process.env.CHABITO_ADMIN_TOKEN || process.env.ADMIN_TOKEN || process.env.NOTIFY_ADMIN_TOKEN);
    const rawPhones = process.env.NOTIFY_PHONE || process.env.NOTIFY_PHONES || '';
    const phoneList = rawPhones.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
    console.log(`📡 URL del endpoint: ${endpoint}`);
    console.log(`📱 Teléfono(s) destino [${phoneList.length}]: ${phoneList.length > 0 ? phoneList.join(', ') : '(no configurado)'}`);
    console.log(`🔑 Token configurado: ${hasToken ? 'Sí' : 'No'}\n`);
    if (phoneList.length === 0) {
        console.error('❌ Falta la variable NOTIFY_PHONE en tu archivo .env.');
        console.log('Ejemplo para un número: NOTIFY_PHONE=573229457553');
        console.log('Ejemplo para múltiples números: NOTIFY_PHONE=573229457553, 573001234567\n');
        process.exit(1);
    }
    const testMessage = [
        '🔔 *Prueba de Notificación - Email Marketing*',
        '',
        'Este es un mensaje de prueba para confirmar que el sistema de alertas por WhatsApp está enlazado correctamente.',
        'Si recibes este mensaje, serás alertado automáticamente si una campaña se detiene o tiene fallos.',
        `🕒 Hora: ${new Date().toLocaleString()}`
    ].join('\n');
    console.log('Enviando mensaje de prueba...');
    const result = await notifier_1.notifier.sendWhatsApp(testMessage);
    if (result.success) {
        console.log('\n🎉 ¡Notificación enviada con éxito!');
    }
    else {
        console.log('\n❌ Falló el envío de la notificación.');
        console.log('Error:', result.error);
        if (result.details) {
            console.log('Detalles:', result.details);
        }
    }
    process.exitCode = result.success ? 0 : 1;
}
testNotification().catch(err => {
    console.error('Error inesperado:', err);
    process.exitCode = 1;
});
