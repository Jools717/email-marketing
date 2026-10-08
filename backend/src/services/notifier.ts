import dotenv from 'dotenv';

dotenv.config();

export interface NotifyResponse {
  success: boolean;
  message?: string;
  session?: string;
  error?: string;
  details?: any;
}

export interface CampaignStats {
  total: number;
  success: number;
  errors: number;
}

/**
 * Servicio de notificaciones por WhatsApp usando el endpoint documentado en notify-endpoint.txt
 * (POST /api/notify)
 */
class NotifierService {
  private endpointUrl: string;
  private adminToken: string;
  private defaultPhones: string[];
  private isEnabled: boolean;

  constructor() {
    this.endpointUrl = process.env.NOTIFY_ENDPOINT_URL || 'http://localhost:3000/api/notify';
    this.adminToken = process.env.CHABITO_ADMIN_TOKEN || process.env.ADMIN_TOKEN || process.env.NOTIFY_ADMIN_TOKEN || '';
    this.defaultPhones = this.parsePhoneList(process.env.NOTIFY_PHONE || process.env.NOTIFY_PHONES || '');
    this.isEnabled = process.env.NOTIFY_ENABLED === 'true' || (process.env.NOTIFY_ENABLED !== 'false' && this.defaultPhones.length > 0);
  }

  /**
   * Parsea cadenas con uno o varios números separados por comas, punto y coma o saltos de línea
   */
  private parsePhoneList(rawPhones?: string | string[]): string[] {
    if (!rawPhones) return [];
    if (Array.isArray(rawPhones)) {
      return rawPhones.flatMap(p => this.parsePhoneList(p));
    }
    return rawPhones
      .split(/[,;\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Envía un mensaje a un destinatario individual
   */
  private async sendSingle(targetPhone: string, text: string): Promise<{ phone: string; success: boolean; error?: string; session?: string }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.adminToken) {
        headers['X-Admin-Token'] = this.adminToken;
      }

      console.log(`📲 [NOTIFICADOR] Enviando notificación WhatsApp a ${targetPhone}...`);

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: targetPhone,
          text: text,
        }),
      });

      const data = await response.json().catch(() => null) as any;

      if (!response.ok) {
        const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error(`❌ [NOTIFICADOR] Error al enviar WhatsApp a ${targetPhone} (${response.status}):`, errorMsg, data?.details || '');
        return {
          phone: targetPhone,
          success: false,
          error: errorMsg,
        };
      }

      console.log(`✅ [NOTIFICADOR] Mensaje de WhatsApp enviado correctamente a ${targetPhone}.`);
      return {
        phone: targetPhone,
        success: true,
        session: data?.session,
      };
    } catch (error: any) {
      console.error(`❌ [NOTIFICADOR] Error de conexión al notificar a ${targetPhone}:`, error.message);
      return {
        phone: targetPhone,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envía un mensaje de texto por WhatsApp a través del endpoint /api/notify.
   * Soporta múltiples números (string separado por comas o array).
   */
  async sendWhatsApp(text: string, to?: string | string[]): Promise<NotifyResponse> {
    const targetPhones = to ? this.parsePhoneList(to) : this.defaultPhones;

    if (!this.isEnabled) {
      console.log('ℹ️ [NOTIFICADOR] Las notificaciones de WhatsApp están desactivadas (NOTIFY_ENABLED=false).');
      return { success: false, message: 'Notificaciones desactivadas en configuración' };
    }

    if (targetPhones.length === 0) {
      console.warn('⚠️ [NOTIFICADOR] No se especificó ningún número de teléfono de destino (NOTIFY_PHONE no configurado).');
      return { success: false, error: 'Número de destino no configurado' };
    }

    const results = [];
    for (const phone of targetPhones) {
      const res = await this.sendSingle(phone, text);
      results.push(res);
    }

    const allSuccessful = results.every(r => r.success);
    const anySuccessful = results.some(r => r.success);
    const errors = results.filter(r => !r.success).map(r => `${r.phone}: ${r.error}`).join(' | ');

    return {
      success: anySuccessful,
      message: anySuccessful
        ? `Mensajes enviados (${results.filter(r => r.success).length}/${results.length} números)`
        : 'Error enviando notificaciones',
      error: allSuccessful ? undefined : errors,
      details: results,
    };
  }

  /**
   * Notifica el inicio de una campaña
   */
  async notifyCampaignStart(country: string, totalLeads: number): Promise<void> {
    const time = new Date().toLocaleString();
    const message = [
      `🚀 *Campaña Iniciada: ${country.toUpperCase()}*`,
      `📅 Fecha/Hora: ${time}`,
      `👥 Leads a procesar: *${totalLeads}*`,
      `⚙️ Estado: Procesando envíos con intervalos anti-spam...`,
    ].join('\n');

    await this.sendWhatsApp(message);
  }

  /**
   * Notifica la finalización exitosa de una campaña
   */
  async notifyCampaignFinished(country: string, stats: CampaignStats): Promise<void> {
    const time = new Date().toLocaleString();
    const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0';
    const message = [
      `✅ *Campaña Finalizada: ${country.toUpperCase()}*`,
      `📅 Fin: ${time}`,
      `📊 *Resumen:*`,
      `   • Total procesados: ${stats.total}`,
      `   • Exitosos: ${stats.success} (${rate}%)`,
      `   • Errores: ${stats.errors}`,
      `🎉 Lote completado con éxito.`,
    ].join('\n');

    await this.sendWhatsApp(message);
  }

  /**
   * Notifica si la campaña se detiene por error o interrupción
   */
  async notifyCampaignStopped(country: string, reason: string, details?: any): Promise<void> {
    const time = new Date().toLocaleString();
    const errorDetails = details ? `\n🔍 *Detalle técnico:* \`\`\`${typeof details === 'object' ? (details.message || JSON.stringify(details)) : details}\`\`\`` : '';
    
    const message = [
      `🚨 *ALERTA: Campaña Detenida (${country.toUpperCase()})*`,
      `⚠️ *Motivo:* ${reason}`,
      `📅 Hora de interrupción: ${time}`,
      errorDetails,
      `\n👉 *Acción sugerida:* Revisar la consola del servidor o la base de datos para reanudar el proceso.`,
    ].join('\n');

    await this.sendWhatsApp(message);
  }
}

export const notifier = new NotifierService();
export default notifier;
