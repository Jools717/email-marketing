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

export async function sendMarketingEmail(to: string, data: { nombre_empresa: string, enfoque_ventas: string, sector: string }) {
  const templatePath = path.join(__dirname, '../templates/marketing.html');
  let html = await fs.readFile(templatePath, 'utf8');

  html = html
    .replace(/{{nombre_empresa}}/g, data.nombre_empresa)
    .replace(/{{enfoque_ventas}}/g, data.enfoque_ventas)
    .replace(/{{sector}}/g, data.sector || 'Distribución');

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to,
    subject: `Propuesta de Expansión para ${data.nombre_empresa}`,
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
