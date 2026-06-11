import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isSmtp = process.env.EMAIL_SERVICE?.toLowerCase() === 'smtp';

export const emailUser = isSmtp ? process.env.SMTP_USER : process.env.GMAIL_USER;
export const emailPass = isSmtp ? process.env.SMTP_PASS : process.env.GMAIL_PASS;
export const emailFrom = isSmtp ? process.env.SMTP_FROM : process.env.GMAIL_FROM;

const transportConfig = isSmtp
  ? {
      host: process.env.SMTP_HOST || 'mail.comtor.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // false para 587 (STARTTLS)
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false, // Evita fallos comunes en servidores SMTP personalizados
      },
    }
  : {
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };

const transporter = nodemailer.createTransport(transportConfig);

export async function sendMarketingEmail(to: string, data: { nombre_empresa: string, enfoque_ventas: string, sector: string, lead_id: number }, template: 'marketing' | 'asesor' = 'marketing') {
  const templateFilename = template === 'asesor' ? 'asesor.html' : 'marketing.html';
  const templatePath = path.join(__dirname, `../templates/${templateFilename}`);
  let html = await fs.readFile(templatePath, 'utf8');

  // Configuración de seguimiento (UTMs en español y detallados)
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"; 
  const fuente = "correo_directo_mexico";
  const medio = "email_marketing_proactivo";
  const campana = template === 'asesor' ? "prospeccion_asesor" : "prospeccion_mayoreo_semanal";
  const contenido = template === 'asesor' ? "link_asesor_texto" : "boton_explorar_plataforma_inegi";
  
  const linkSeguimiento = `${baseUrl}/?utm_source=${fuente}&utm_medium=${medio}&utm_campaign=${campana}&utm_content=${contenido}&ref=${data.lead_id}&empresa=${encodeURIComponent(data.nombre_empresa)}&email=${encodeURIComponent(to)}`;

  html = html
    .replace(/{{nombre_empresa}}/g, data.nombre_empresa)
    .replace(/{{enfoque_ventas}}/g, data.enfoque_ventas)
    .replace(/{{sector}}/g, data.sector || 'Distribución')
    .replace(/{{base_url}}/g, baseUrl)
    .replace(/{{link_seguimiento}}/g, linkSeguimiento);

  // Asuntos Clickbait
  const subject = template === 'asesor' 
    ? `"${data.nombre_empresa}" estás perdiendo más clientes.`
    : `El mapa exacto de tus próximos clientes 🗺️`;

  const mailOptions = {
    from: emailFrom,
    to: to,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a: ${to} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`Error enviando correo a ${to}:`, error);
    return false;
  }
}
