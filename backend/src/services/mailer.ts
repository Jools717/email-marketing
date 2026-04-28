import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMarketingEmail(to: string, data: { nombre_empresa: string, enfoque_ventas: string, sector: string, lead_id: number }) {
  const templatePath = path.join(__dirname, '../templates/marketing.html');
  let html = await fs.readFile(templatePath, 'utf8');

  // Configuración de seguimiento (UTMs en español y detallados)
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"; 
  const fuente = "correo_directo_mexico";
  const medio = "email_marketing_proactivo";
  const campana = "prospeccion_mayoreo_semanal";
  const contenido = "boton_explorar_plataforma_inegi";
  
  const linkSeguimiento = `${baseUrl}/?utm_source=${fuente}&utm_medium=${medio}&utm_campaign=${campana}&utm_content=${contenido}&ref=${data.lead_id}`;

  html = html
    .replace(/{{nombre_empresa}}/g, data.nombre_empresa)
    .replace(/{{enfoque_ventas}}/g, data.enfoque_ventas)
    .replace(/{{sector}}/g, data.sector || 'Distribución')
    .replace(/{{base_url}}/g, baseUrl)
    .replace(/{{link_seguimiento}}/g, linkSeguimiento);

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to,
    subject: `Nuevos puntos de venta minorista para ${data.nombre_empresa}`,
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
