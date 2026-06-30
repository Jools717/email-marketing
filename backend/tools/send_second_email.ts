import { getMexicoLeadsForEmail2, updateLeadStatusEmail2 } from '../src/database';
import { sendMarketingEmail } from '../src/services/mailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

  let limit = 100;
  const limitIndex = process.argv.indexOf('--limit');
  if (limitIndex !== -1 && limitIndex + 1 < process.argv.length) {
    const parsedLimit = parseInt(process.argv[limitIndex + 1]);
    if (!isNaN(parsedLimit)) {
      limit = parsedLimit;
    }
  }
  
  console.log(`🚀 Iniciando Campaña de Email 2 (Invertida) para México... ${isDryRun ? '[MODO SIMULACIÓN / DRY RUN]' : '[ENVIANDO REAL]'}`);

  // 1. Obtener leads aptos para la segunda campaña
  const leads = await getMexicoLeadsForEmail2(limit);
  console.log(`Se encontraron ${leads.length} leads aptos para recibir el segundo correo (Límite: ${limit}).`);

  if (leads.length === 0) {
    console.log("No hay leads listos para el segundo correo. Saliendo...");
    process.exit(0);
  }

  const SLEEP_MS = parseInt(process.env.SLEEP_MS || '2000');
  let marketingSuccess = 0;
  let asesorSuccess = 0;
  let errorCount = 0;

  // 2. Iterar e invertir el template
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // Invertir el template enviado en la campaña 1
    const originalTemplate = lead.email_1_template;
    const newTemplate: 'marketing' | 'asesor' = originalTemplate === 'marketing' ? 'asesor' : 'marketing';

    const emailList = lead.emails.split(',')
      .map(e => e.trim())
      .filter(e => e !== '');

    if (emailList.length === 0) {
      console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa} - No tiene emails válidos.`);
      continue;
    }

    console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa}`);
    console.log(`   Email 1 enviado: ${originalTemplate?.toUpperCase()}`);
    console.log(`   Email 2 a enviar: ${newTemplate.toUpperCase()} (Invertido)`);

    if (isDryRun) {
      console.log(`   [Simulación] Se enviaría a: ${emailList.join(', ')}`);
      if (newTemplate === 'marketing') marketingSuccess++;
      else asesorSuccess++;
      continue;
    }

    let leadSuccess = false;
    let lastError = '';

    for (const email of emailList) {
      // Pausa aleatoria para simular comportamiento humano (entre 10 y 20 segundos)
      const randomSleepMs = Math.floor(Math.random() * 10000) + 10000;
      console.log(`     (Esperando ${Math.round(randomSleepMs / 1000)}s para evitar spam...)`);
      await sleep(randomSleepMs);

      console.log(`   -> Enviando a: ${email}`);
      
      const success = await sendMarketingEmail(email, {
        nombre_empresa: lead.nombre_empresa,
        enfoque_ventas: lead.enfoque_ventas,
        sector: lead.sector,
        lead_id: lead.id
      }, newTemplate);

      if (success) {
        leadSuccess = true;
        if (newTemplate === 'marketing') marketingSuccess++;
        else asesorSuccess++;
      } else {
        errorCount++;
        lastError = 'Error en envío SMTP';
      }
    }

    // 3. Actualizar la base de datos con el resultado de la segunda campaña
    await updateLeadStatusEmail2(
      lead.id,
      leadSuccess ? 'enviado' : 'error',
      newTemplate,
      leadSuccess ? undefined : lastError
    );
  }

  console.log("\n=================================");
  console.log(`Resumen de la campaña de Email 2 ${isDryRun ? '(SIMULADO)' : ''}:`);
  console.log(`Total procesados: ${leads.length}`);
  console.log(`✅ Éxitos Marketing (antes Asesor): ${marketingSuccess}`);
  console.log(`✅ Éxitos Asesor (antes Marketing): ${asesorSuccess}`);
  console.log(`❌ Errores totales: ${errorCount}`);
  console.log("=================================");

  process.exit(0);
}

main().catch(console.error);
