import { sendMarketingEmail } from './services/mailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno manualmente para el script
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  const testEmail = 'jaimeurieltorres@gmail.com';

  console.log(`\n🚀 Iniciando envío de prueba para: ${testEmail}`);
  console.log(`Remitente: ${process.env.EMAIL_USER}`);

  const success = await sendMarketingEmail(testEmail, {
    nombre_empresa: 'Tu Empresa Test',
    enfoque_ventas: 'Venta de productos electrónicos al por mayor',
    sector: 'Tecnología y Electrónica',
    lead_id: 999
  });

  if (success) {
    console.log('\n✅ ¡Correo de prueba enviado con éxito!');
    console.log('Revisa tu bandeja de entrada (y la carpeta de spam por si acaso).');
  } else {
    console.error('\n❌ Error al enviar el correo.');
    console.log('Verifica que tu EMAIL_USER y EMAIL_PASS sean correctos en el archivo .env');
  }

  process.exit(0);
}

test().catch(console.error);
