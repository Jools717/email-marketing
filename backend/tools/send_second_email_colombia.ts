import { getColombiaLeadsForEmail2, updateColombiaLeadStatusEmail2 } from '../src/database';
import { sendMarketingEmail } from '../src/services/mailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  let limit = 600; // Por defecto envía el lote completo de 600
  const limitIndex = process.argv.indexOf('--limit');
  if (limitIndex !== -1 && limitIndex + 1 < process.argv.length) {
    const parsedLimit = parseInt(process.argv[limitIndex + 1]);
    if (!isNaN(parsedLimit)) {
      limit = parsedLimit;
    }
  }
  
  console.log(`🚀 Iniciando Campaña de Email 2 (Invertida/Cruzada) para Colombia...`);
  console.log(`${isDryRun ? '[MODO SIMULACIÓN / DRY RUN - No se enviarán correos]' : '[ENVIANDO CORREOS EN VIVO]'}`);
  console.log(`Límite configurado: ${limit} leads`);

  // 1. Obtener leads de Colombia aptos para el segundo correo
  const leads = await getColombiaLeadsForEmail2(limit);
  console.log(`Se encontraron ${leads.length} leads listos para recibir el correo cruzado.`);

  if (leads.length === 0) {
    console.log("No hay leads pendientes para el segundo correo en Colombia. Saliendo...");
    process.exit(0);
  }

  let asesorSuccess = 0;   // Enviados como asesor (antes asesor_b)
  let asesorBSuccess = 0;  // Enviados como asesor_b (antes asesor)
  let errorCount = 0;

  // 2. Iterar e invertir el template recibido en el Email 1
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // Invertir el template
    const originalTemplate = lead.email_1_template;
    if (originalTemplate !== 'asesor' && originalTemplate !== 'asesor_b') {
      console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa} - Plantilla original desconocida (${originalTemplate}). Se omite.`);
      continue;
    }

    const newTemplate: 'asesor' | 'asesor_b' = originalTemplate === 'asesor' ? 'asesor_b' : 'asesor';

    const emailList = lead.emails.split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e !== '');

    if (emailList.length === 0) {
      console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa} - No tiene correos válidos.`);
      continue;
    }

    console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa}`);
    console.log(`   Email 1 enviado: ${originalTemplate.toUpperCase()}`);
    console.log(`   Email 2 a enviar: ${newTemplate.toUpperCase()} (Invertido)`);

    if (isDryRun) {
      console.log(`   [Simulación] Se enviaría a: ${emailList.join(', ')}`);
      if (newTemplate === 'asesor') asesorSuccess++;
      else asesorBSuccess++;
      continue;
    }

    let leadSuccess = false;
    let lastError = '';

    for (const email of emailList) {
      // Pausa aleatoria para evitar ser bloqueados por spam (entre 5 y 15 segundos)
      const randomSleepMs = Math.floor(Math.random() * 10000) + 5000;
      console.log(`     (Esperando ${Math.round(randomSleepMs / 1000)}s para evitar spam...)`);
      await sleep(randomSleepMs);

      console.log(`   -> Enviando a: ${email}`);
      
      const success = await sendMarketingEmail(
        email,
        {
          nombre_empresa: lead.nombre_empresa,
          enfoque_ventas: lead.enfoque_ventas,
          sector: lead.sector,
          lead_id: lead.id,
          productos: lead.productos_principales,
          telefono: lead.telefonos_contacto,
          nombre_comercial: lead.nombre_comercial,
          descripcion_corta: lead.descripcion_corta,
          // UTM específico para la segunda tanda invertida
          campana_utm: newTemplate === 'asesor' 
            ? 'scraping_camara_comercio_asesor_segundo' 
            : 'scraping_camara_comercio_asesorb_segundo'
        },
        newTemplate,
        'colombia'
      );

      if (success) {
        leadSuccess = true;
        if (newTemplate === 'asesor') asesorSuccess++;
        else asesorBSuccess++;
      } else {
        errorCount++;
        lastError = 'Error en envío SMTP';
      }
    }

    // 3. Actualizar la base de datos con el resultado del segundo envío
    await updateColombiaLeadStatusEmail2(
      lead.id,
      leadSuccess ? 'enviado' : 'error',
      newTemplate,
      leadSuccess ? undefined : lastError
    );
  }

  console.log("\n=================================");
  console.log(`Resumen de la campaña de Email 2 Colombia ${isDryRun ? '(SIMULACIÓN)' : ''}:`);
  console.log(`Total procesados: ${leads.length}`);
  console.log(`✅ Éxitos Asesor (antes Asesor B): ${asesorSuccess}`);
  console.log(`✅ Éxitos Asesor B (antes Asesor): ${asesorBSuccess}`);
  console.log(`❌ Errores de envío: ${errorCount}`);
  console.log("=================================");

  process.exit(0);
}

main().catch(console.error);
