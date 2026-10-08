import dotenv from 'dotenv';
import { notifier } from './services/notifier';

dotenv.config();

async function testNotification() {
  console.log('==============================================');
  console.log('🧪 PRUEBA DE CONEXIÓN CON EL NOTIFICADOR WHATSAPP');
  console.log('==============================================');

  const endpoint = process.env.NOTIFY_ENDPOINT_URL || 'http://localhost:3000/api/notify';
  const phone = process.env.NOTIFY_PHONE || '(no configurado)';
  const hasToken = !!(process.env.CHABITO_ADMIN_TOKEN || process.env.ADMIN_TOKEN || process.env.NOTIFY_ADMIN_TOKEN);

  console.log(`📡 URL del endpoint: ${endpoint}`);
  console.log(`📱 Teléfono destino: ${phone}`);
  console.log(`🔑 Token configurado: ${hasToken ? 'Sí' : 'No'}\n`);

  if (!process.env.NOTIFY_PHONE) {
    console.error('❌ Falta la variable NOTIFY_PHONE en tu archivo .env.');
    console.log('Ejemplo: NOTIFY_PHONE=+573001234567\n');
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
  const result = await notifier.sendWhatsApp(testMessage);

  if (result.success) {
    console.log('\n🎉 ¡Notificación enviada con éxito!');
  } else {
    console.log('\n❌ Falló el envío de la notificación.');
    console.log('Error:', result.error);
    if (result.details) {
      console.log('Detalles:', result.details);
    }
  }

  process.exit(result.success ? 0 : 1);
}

testNotification().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
