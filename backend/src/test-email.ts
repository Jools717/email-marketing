import { sendMarketingEmail, emailUser } from './services/mailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno manualmente para el script
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  const testEmail = 'jaimeurieltorres@hotmail.com';

  console.log(`\n🚀 Iniciando envío de prueba combinado para: ${testEmail}`);
  console.log(`Remitente SMTP: ${emailUser}`);

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
  const successCoAsesor = await sendMarketingEmail(testEmail, { ...dataColombia, campana_utm: 'scraping_camara_comercio_asesor' }, 'asesor', 'colombia');

  console.log('Enviando plantilla Asesor B (Colombia - Santiago Torres - Word/Plana)...');
  const successCoAsesorB = await sendMarketingEmail(testEmail, { ...dataColombia, campana_utm: 'scraping_camara_comercio_asesorb' }, 'asesor_b', 'colombia');

  console.log('\n=============================================');
  if (successCoAsesor && successCoAsesorB) {
    console.log('✅ ¡Los 2 correos de prueba (Asesor A y Asesor B) fueron enviados con éxito!');
    console.log('Revisa tu bandeja de entrada para verificar y comparar las estrategias.');
  } else {
    console.error('❌ Error al enviar una o más plantillas de prueba.');
  }
  console.log('=============================================');

  process.exit(0);
}

test().catch(console.error);
