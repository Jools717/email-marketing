import { sendMarketingEmail } from './services/mailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno manualmente para el script
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  const testEmail = 'juliorj717@gmail.com';

  console.log(`\n🚀 Iniciando envío de prueba para: ${testEmail}`);
  console.log(`Remitente: ${process.env.EMAIL_USER}`);

  const data = {
    nombre_empresa: 'Tu Empresa Test',
    enfoque_ventas: 'Venta de productos electrónicos al por mayor',
    sector: 'Tecnología y Electrónica',
    lead_id: 999
  };

  console.log('\nEnviando plantilla Corporativa (Directorio Minorista)...');
  const success1 = await sendMarketingEmail(testEmail, data, 'marketing');

  console.log('\nEnviando plantilla Asesor (Alejandro)...');
  const success2 = await sendMarketingEmail(testEmail, data, 'asesor');

  if (success1 && success2) {
    console.log('\n✅ ¡Ambos correos de prueba enviados con éxito!');
    console.log('Revisa tu bandeja de entrada para comparar las dos estrategias.');
  } else {
    console.error('\n❌ Error al enviar uno o ambos correos.');
  }

  process.exit(0);
}

test().catch(console.error);
