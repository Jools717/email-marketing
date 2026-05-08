import { getMexicoLeads } from './database';
import { sendMarketingEmail } from './services/mailer';

// Función para pausar la ejecución (evitar bloqueos por spam)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("Iniciando campaña de Email Marketing para México...");
  
  // 1. Obtener leads de la base de datos (score mayor o igual a 7)
  const leads = await getMexicoLeads(7);
  console.log(`Se encontraron ${leads.length} leads calificados con correo electrónico.`);

  // Definir cuántos correos queremos enviar en esta ejecución (ej: 50)
  const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');
  const SLEEP_MS = parseInt(process.env.SLEEP_MS || '2000');
  
  const leadsToProcess = leads.slice(0, BATCH_SIZE);
  console.log(`Enviando a un lote de ${leadsToProcess.length} empresas...`);

  let successCount = 0;
  let errorCount = 0;

  // 2. Iterar sobre cada lead y enviar el correo a todas sus direcciones
  for (const lead of leadsToProcess) {
    // La base de datos puede tener múltiples emails separados por coma.
    const emailList = lead.emails.split(',')
      .map(e => e.trim())
      .filter(e => e !== '');
    
    if (emailList.length === 0) continue;

    console.log(`\nProcesando empresa: ${lead.nombre_empresa} (${emailList.length} correos)`);
    
    for (const email of emailList) {
      console.log(`  -> Enviando a: ${email}`);
      
      // 3. Ejecutar el servicio de envío de correos
      const success = await sendMarketingEmail(email, {
        nombre_empresa: lead.nombre_empresa,
        enfoque_ventas: lead.enfoque_ventas,
        sector: lead.sector,
        lead_id: lead.id
      });

      if (success) {
        successCount++;
      } else {
        errorCount++;
      }

      // 4. Pausar entre cada correo individual para evitar bloqueos
      await sleep(SLEEP_MS);
    }
  }

  console.log("\n=================================");
  console.log("Resumen de la campaña:");
  console.log(`Correos enviados con éxito: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log("=================================");
  
  // Cerrar el proceso
  process.exit(0);
}

main().catch(console.error);
