import { getMexicoLeads, updateMexicoLeadStatus } from './database';
import { sendMarketingEmail } from './services/mailer';

// Función para pausar la ejecución (evitar bloqueos por spam)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Iniciando campaña A/B Testing (50/50) para México...");
  
  // 1. Obtener hasta 100 leads pendientes
  const leads = await getMexicoLeads(100);
  console.log(`Se encontraron ${leads.length} leads listos para procesar.`);

  if (leads.length === 0) {
    console.log("No hay leads pendientes. Saliendo...");
    process.exit(0);
  }

  const SLEEP_MS = parseInt(process.env.SLEEP_MS || '2000');
  let successCount = 0;
  let errorCount = 0;

  // 2. Iterar sobre cada lead con lógica A/B
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    
    // Alternar template: pares -> marketing, impares -> asesor
    const template: 'marketing' | 'asesor' = i % 2 === 0 ? 'marketing' : 'asesor';

    const emailList = lead.emails.split(',')
      .map(e => e.trim())
      .filter(e => e !== '');
    
    if (emailList.length === 0) continue;

    console.log(`\n[${i + 1}/${leads.length}] Empresa: ${lead.nombre_empresa}`);
    console.log(`   Template: ${template.toUpperCase()}`);
    
    // Usamos el primer email de la lista para el tracking principal
    const mainEmail = emailList[0];
    let leadSuccess = false;
    let lastError = '';

    for (const email of emailList) {
      console.log(`   -> Enviando a: ${email}`);
      
      const success = await sendMarketingEmail(email, {
        nombre_empresa: lead.nombre_empresa,
        enfoque_ventas: lead.enfoque_ventas,
        sector: lead.sector,
        lead_id: lead.id
      }, template, 'mexico');

      if (success) {
        leadSuccess = true;
        successCount++;
      } else {
        errorCount++;
        lastError = 'Error en envío SMTP';
      }

      // Generar un intervalo aleatorio entre 3 y 10 segundos para evitar detección de spam
      const minDelay = 3000;
      const maxDelay = 10000;
      const randomSleepMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      console.log(`   -> Esperando ${(randomSleepMs / 1000).toFixed(1)} segundos antes del siguiente envío...`);
      await sleep(randomSleepMs);
    }

    // 3. Actualizar la base de datos con el resultado
    await updateMexicoLeadStatus(
      lead.id, 
      leadSuccess ? 'enviado' : 'error', 
      template, 
      leadSuccess ? undefined : lastError
    );
  }

  console.log("\n=================================");
  console.log("Resumen de la campaña A/B (México):");
  console.log(`Total procesados: ${leads.length}`);
  console.log(`Correos exitosos: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log("=================================");
  
  process.exit(0);
}

main().catch(console.error);
