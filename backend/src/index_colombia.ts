import { 
  getColombiaLeads, 
  updateColombiaLeadStatus, 
  getColombiaLeadsForEmail2, 
  updateColombiaLeadStatusEmail2,
  countRecentColombiaEmail1
} from './database';
import { sendMarketingEmail } from './services/mailer';
import { notifier } from './services/notifier';

// Función para pausar la ejecución (evitar bloqueos por spam)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 [Campaña Inteligente con Seguro] Iniciando campaña para Colombia (Tomapedidos)...");
  
  const BATCH_LIMIT = 600;
  const MIN_HOURS_FOR_EMAIL_2 = 24;

  // 1. Obtener leads del lote anterior que califican para el Email 2 (enviados hace > 24 horas y con email 2 pendiente)
  const leadsEmail2 = await getColombiaLeadsForEmail2(BATCH_LIMIT, MIN_HOURS_FOR_EMAIL_2);
  
  // 2. Contar cuántos Email 1 se han enviado en las últimas 24 horas
  const email1RecentCount = await countRecentColombiaEmail1(24);

  console.log(`📊 Métricas del lote actual en las últimas 24 horas:`);
  console.log(`   - Envíos de Email 1 recientes: ${email1RecentCount} de ${BATCH_LIMIT}`);
  console.log(`   - Leads listos para recibir Email 2 (más de ${MIN_HOURS_FOR_EMAIL_2}h desde Email 1): ${leadsEmail2.length}`);

  if (leadsEmail2.length > 0) {
    // === CASO 1: Enviar Email 2 (Cruzado) ===
    // Hay leads con el Email 1 enviado hace más de 24 horas y que no han recibido el Email 2
    console.log(`\n📝 Se detectaron ${leadsEmail2.length} leads aptos para recibir el Email 2 (seguimiento cruzado).`);
    console.log(`👉 Iniciando el envío del Email 2 (Invertido/Cruzado)...`);
    
    await notifier.notifyCampaignStart('Colombia (Email 2 Cruzado)', leadsEmail2.length);

    let asesorSuccess = 0;   // Enviados como asesor (antes asesor_b)
    let asesorBSuccess = 0;  // Enviados como asesor_b (antes asesor)
    let errorCount = 0;
    
    for (let i = 0; i < leadsEmail2.length; i++) {
      const lead = leadsEmail2[i];
      
      // Invertir el template recibido en el Email 1
      const originalTemplate = lead.email_1_template;
      if (originalTemplate !== 'asesor' && originalTemplate !== 'asesor_b') {
        console.log(`\n[${i + 1}/${leadsEmail2.length}] Empresa: ${lead.nombre_empresa} - Plantilla original desconocida (${originalTemplate}). Se omite.`);
        continue;
      }
      
      const newTemplate: 'asesor' | 'asesor_b' = originalTemplate === 'asesor' ? 'asesor_b' : 'asesor';
      
      const emailList = lead.emails.split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e !== '');
      
      if (emailList.length === 0) {
        console.log(`\n[${i + 1}/${leadsEmail2.length}] Empresa: ${lead.nombre_empresa} - No tiene correos válidos.`);
        continue;
      }
      
      console.log(`\n[${i + 1}/${leadsEmail2.length}] Empresa: ${lead.nombre_empresa}`);
      console.log(`   Email 1 enviado: ${originalTemplate.toUpperCase()}`);
      console.log(`   Email 2 a enviar: ${newTemplate.toUpperCase()} (Invertido)`);
      
      let leadSuccess = false;
      let lastError = '';
      
      for (const email of emailList) {
        // Pausa aleatoria para evitar ser bloqueados por spam (entre 3 y 10 segundos)
        const randomSleepMs = Math.floor(Math.random() * 7000) + 3000;
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
      
      // Actualizar la base de datos con el resultado del segundo envío
      await updateColombiaLeadStatusEmail2(
        lead.id,
        leadSuccess ? 'enviado' : 'error',
        newTemplate,
        leadSuccess ? undefined : lastError
      );
    }
    
    console.log("\n=================================");
    console.log("Resumen del envío de Email 2:");
    console.log(`Total procesados: ${leadsEmail2.length}`);
    console.log(`✅ Éxitos Asesor (antes Asesor B): ${asesorSuccess}`);
    console.log(`✅ Éxitos Asesor B (antes Asesor): ${asesorBSuccess}`);
    console.log(`❌ Errores de envío: ${errorCount}`);
    console.log("=================================");
    
    await notifier.notifyCampaignFinished('Colombia (Email 2 Cruzado)', {
      total: leadsEmail2.length,
      success: asesorSuccess + asesorBSuccess,
      errors: errorCount,
    });
    
  } else if (email1RecentCount > 0 && email1RecentCount < BATCH_LIMIT) {
    // === CASO 2: Reanudación de Email 1 Interrumpido ===
    // Se enviaron correos recientemente pero no llegamos a la meta de 600. Reanudamos Email 1.
    const remainingToSend = BATCH_LIMIT - email1RecentCount;
    console.log(`\n⚠️ Se detectó que el envío del Email 1 recientemente fue interrumpido.`);
    console.log(`👉 Reanudando envío del Email 1 para completar el lote. Faltan enviar ${remainingToSend} leads.`);
    
    const leadsEmail1 = await getColombiaLeads(remainingToSend);
    console.log(`Se encontraron ${leadsEmail1.length} leads nuevos listos para procesar.`);
    
    if (leadsEmail1.length === 0) {
      console.log("No hay leads pendientes en la base de datos para reanudar el lote. Saliendo...");
      process.exit(0);
    }

    await notifier.notifyCampaignStart('Colombia (Reanudación Email 1)', leadsEmail1.length);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < leadsEmail1.length; i++) {
      const lead = leadsEmail1[i];
      
      // Alternar template: asesor (Asesor A - 50%), asesor_b (Asesor B - 50%)
      const templates: ('asesor' | 'asesor_b')[] = ['asesor', 'asesor_b'];
      const template = templates[i % templates.length];
      
      const emailList = lead.emails.split(',')
        .map(e => e.trim())
        .filter(e => e !== '');
      
      if (emailList.length === 0) continue;
      
      console.log(`\n[${i + 1}/${leadsEmail1.length}] Empresa: ${lead.nombre_empresa}`);
      console.log(`   Template: ${template.toUpperCase()}`);
      
      let leadSuccess = false;
      let lastError = '';
      
      for (const email of emailList) {
        // Pausa aleatoria para evitar ser bloqueados por spam (entre 3 y 10 segundos)
        const randomSleepMs = Math.floor(Math.random() * 7000) + 3000;
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
            campana_utm: template === 'asesor' 
              ? 'scraping_camara_comercio_asesor' 
              : 'scraping_camara_comercio_asesorb'
          }, 
          template, 
          'colombia'
        );
        
        if (success) {
          leadSuccess = true;
          successCount++;
        } else {
          errorCount++;
          lastError = 'Error en envío SMTP';
        }
      }
      
      // Actualizar la base de datos con el resultado
      await updateColombiaLeadStatus(
        lead.id, 
        leadSuccess ? 'enviado' : 'error', 
        template, 
        leadSuccess ? undefined : lastError
      );
    }
    
    console.log("\n=================================");
    console.log("Resumen de la reanudación del Email 1:");
    console.log(`Total procesados en este intento: ${leadsEmail1.length}`);
    console.log(`✅ Éxitos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("=================================");
    
    await notifier.notifyCampaignFinished('Colombia (Reanudación Email 1)', {
      total: leadsEmail1.length,
      success: successCount,
      errors: errorCount,
    });
    
  } else if (email1RecentCount >= BATCH_LIMIT) {
    // === CASO 3: Lote del día ya completado ===
    // Ya enviamos los 600 Email 1 recientemente y los Email 2 aún deben esperar el plazo de 24 horas.
    console.log(`\n🛑 El lote de Email 1 para el día de hoy ya se completó (${email1RecentCount} enviados).`);
    console.log(`🕒 Aún no transcurren las ${MIN_HOURS_FOR_EMAIL_2} horas de espera obligatoria para enviar el Email 2.`);
    console.log(`   Por seguridad, no se enviarán correos para evitar el spam en el mismo día.`);
    
  } else {
    // === CASO 4: Iniciar un nuevo lote desde cero (Email 1) ===
    // No hay envíos recientes y no hay nada pendiente para Email 2.
    console.log(`\n🎉 No hay campañas recientes ni envíos de Email 2 pendientes. Iniciando un NUEVO lote de 600 leads con el Email 1 (A/B)...`);
    
    const leadsEmail1 = await getColombiaLeads(BATCH_LIMIT);
    console.log(`Se encontraron ${leadsEmail1.length} leads nuevos listos para procesar.`);
    
    if (leadsEmail1.length === 0) {
      console.log("No hay leads pendientes en la base de datos para iniciar un nuevo lote. Saliendo...");
      process.exit(0);
    }

    await notifier.notifyCampaignStart('Colombia (Email 1 Nuevo Lote)', leadsEmail1.length);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < leadsEmail1.length; i++) {
      const lead = leadsEmail1[i];
      
      // Alternar template: asesor (Asesor A - 50%), asesor_b (Asesor B - 50%)
      const templates: ('asesor' | 'asesor_b')[] = ['asesor', 'asesor_b'];
      const template = templates[i % templates.length];
      
      const emailList = lead.emails.split(',')
        .map(e => e.trim())
        .filter(e => e !== '');
      
      if (emailList.length === 0) continue;
      
      console.log(`\n[${i + 1}/${leadsEmail1.length}] Empresa: ${lead.nombre_empresa}`);
      console.log(`   Template: ${template.toUpperCase()}`);
      
      let leadSuccess = false;
      let lastError = '';
      
      for (const email of emailList) {
        // Pausa aleatoria para evitar ser bloqueados por spam (entre 3 y 10 segundos)
        const randomSleepMs = Math.floor(Math.random() * 7000) + 3000;
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
            campana_utm: template === 'asesor' 
              ? 'scraping_camara_comercio_asesor' 
              : 'scraping_camara_comercio_asesorb'
          }, 
          template, 
          'colombia'
        );
        
        if (success) {
          leadSuccess = true;
          successCount++;
        } else {
          errorCount++;
          lastError = 'Error en envío SMTP';
        }
      }
      
      // Actualizar la base de datos con el resultado
      await updateColombiaLeadStatus(
        lead.id, 
        leadSuccess ? 'enviado' : 'error', 
        template, 
        leadSuccess ? undefined : lastError
      );
    }
    
    console.log("\n=================================");
    console.log("Resumen del envío de Email 1 (Nuevo Lote):");
    console.log(`Total procesados: ${leadsEmail1.length}`);
    console.log(`✅ Éxitos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("=================================");
    
    await notifier.notifyCampaignFinished('Colombia (Email 1 Nuevo Lote)', {
      total: leadsEmail1.length,
      success: successCount,
      errors: errorCount,
    });
  }
  
  process.exit(0);
}

main().catch(async (error) => {
  console.error('Error fatal en campaña de Colombia:', error);
  await notifier.notifyCampaignStopped('Colombia', 'Error no capturado durante el proceso de envío', error);
  process.exit(1);
});



