"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailFrom = exports.emailPass = exports.emailUser = void 0;
exports.sendMarketingEmail = sendMarketingEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isSmtp = process.env.EMAIL_SERVICE?.toLowerCase() === 'smtp';
exports.emailUser = isSmtp ? process.env.SMTP_USER : process.env.GMAIL_USER;
exports.emailPass = isSmtp ? process.env.SMTP_PASS : process.env.GMAIL_PASS;
exports.emailFrom = isSmtp ? process.env.SMTP_FROM : process.env.GMAIL_FROM;
const transportConfig = isSmtp
    ? {
        pool: true,
        host: process.env.SMTP_HOST || 'mail.comtor.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // false para 587 (STARTTLS)
        auth: {
            user: exports.emailUser,
            pass: exports.emailPass,
        },
        tls: {
            rejectUnauthorized: false, // Evita fallos comunes en servidores SMTP personalizados
            ciphers: 'HIGH:!aNULL:!3DES:!DH', // Evita el error "dh key too small"
        },
    }
    : {
        service: 'gmail',
        auth: {
            user: exports.emailUser,
            pass: exports.emailPass,
        },
    };
const transporter = nodemailer_1.default.createTransport(transportConfig);
function getFriendlyName(nombreEmpresa, nombreComercial) {
    if (nombreComercial && nombreComercial.trim() !== '') {
        return nombreComercial.trim();
    }
    let name = nombreEmpresa;
    // Eliminar sufijos legales comunes en Colombia
    name = name.replace(/\b(S\.?A\.?S\.?|L\.?T\.?D\.?A\.?|S\.?A\.?|B\.?I\.?C\.?|S\.?E\.?N\.?C\.?)\b/gi, '');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
}
function generarIntroduccionColombiaAsesor(lead) {
    const nombre = getFriendlyName(lead.nombre_empresa, lead.nombre_comercial);
    const openings = [
        `Estuve revisando la trayectoria de <strong>${nombre}</strong> y me pareció muy interesante su foco en el sector de <strong>{{sector}}</strong>, especialmente con su línea de <strong>{{productos}}</strong>.`,
        `Hace poco me topé con el trabajo que vienen haciendo en <strong>${nombre}</strong>. Vi que están especializados en <strong>{{sector}}</strong> y que manejan un portafolio de <strong>{{productos}}</strong> bastante fuerte.`,
        `Estuve investigando un poco sobre <strong>${nombre}</strong> y quería felicitarlos por su posicionamiento en el mercado de <strong>{{sector}}</strong>, comercializando productos como <strong>{{productos}}</strong>.`,
        `Curioseando sobre empresas destacadas en el sector de <strong>{{sector}}</strong>, encontré a <strong>${nombre}</strong>. Me llamó mucho la atención su oferta de <strong>{{productos}}</strong>.`
    ];
    const idx = Math.abs(lead.id || 0) % openings.length;
    let intro = openings[idx];
    if (lead.descripcion_corta) {
        let desc = lead.descripcion_corta.trim();
        const cleanDesc = desc
            .replace(new RegExp(`^${nombre}\\s+(es una|es un|es|son una|son un|son)\\s+`, 'i'), '')
            .replace(new RegExp(`^${lead.nombre_empresa}\\s+(es una|es un|es|son una|son un|son)\\s+`, 'i'), '')
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        const comments = [
            ` Por lo que vi, ${cleanDesc}`,
            ` Noté que se destacan por ser ${cleanDesc}`,
            ` Me pareció genial ver que ${cleanDesc}`
        ];
        const commentIdx = Math.abs((lead.id || 0) + 1) % comments.length;
        intro += comments[commentIdx];
    }
    else {
        const fallbacks = [
            ` Me llamó la atención el posicionamiento que han logrado construir y el crecimiento continuo dentro de su mercado.`,
            ` Se nota que han hecho un gran trabajo estructurando su canal de ventas y ganando visibilidad frente a la competencia.`,
            ` Vi que tienen un gran alcance en su canal de distribución y eso habla muy bien de su operación.`
        ];
        const fallbackIdx = Math.abs((lead.id || 0) + 2) % fallbacks.length;
        intro += fallbacks[fallbackIdx];
    }
    return intro;
}
function generarIntroduccionColombiaMarketing(lead) {
    const nombre = getFriendlyName(lead.nombre_empresa, lead.nombre_comercial);
    const openings = [
        `Analizando el panorama de distribución comercial en Colombia, hemos seguido de cerca a <strong>${nombre}</strong>. Identificamos su fuerte presencia en el sector de <strong>{{sector}}</strong>, donde comercializan <strong>{{productos}}</strong>.`,
        `En Tomapedidos hemos estado estudiando el mercado de <strong>{{sector}}</strong>, y <strong>${nombre}</strong> resalta notablemente por su oferta de <strong>{{productos}}</strong> y su posicionamiento actual.`,
        `Hemos analizado la operación comercial de <strong>${nombre}</strong> y vemos su gran potencial dentro del sector de <strong>{{sector}}</strong>, especialmente en la distribución de <strong>{{productos}}</strong>.`,
        `Estudiando empresas clave de <strong>{{sector}}</strong> en el país, nos llamó la atención el crecimiento de <strong>${nombre}</strong> con su portafolio de <strong>{{productos}}</strong>.`
    ];
    const idx = Math.abs(lead.id || 0) % openings.length;
    let intro = openings[idx];
    if (lead.descripcion_corta) {
        let desc = lead.descripcion_corta.trim();
        const cleanDesc = desc
            .replace(new RegExp(`^${nombre}\\s+(es una|es un|es|son una|son un|son)\\s+`, 'i'), '')
            .replace(new RegExp(`^${lead.nombre_empresa}\\s+(es una|es un|es|son una|son un|son)\\s+`, 'i'), '')
            .replace(/^[A-Z]/, (match) => match.toLowerCase());
        const comments = [
            ` Entendemos que son ${cleanDesc}`,
            ` Sabemos el reto que representa ser ${cleanDesc}`,
            ` Es de nuestro conocimiento que operan como ${cleanDesc}`
        ];
        const commentIdx = Math.abs((lead.id || 0) + 1) % comments.length;
        intro += comments[commentIdx];
    }
    else {
        const fallbacks = [
            ` Nos ha llamado mucho la atención la solidez que han proyectado en su canal de comercialización y la visibilidad de su marca.`,
            ` Se nota el esfuerzo continuo de su equipo para consolidar su canal y expandirse en un mercado altamente competitivo.`,
            ` Su modelo de distribución y el alcance logrado en su mercado de influencia son excelentes referentes en el sector.`
        ];
        const fallbackIdx = Math.abs((lead.id || 0) + 2) % fallbacks.length;
        intro += fallbacks[fallbackIdx];
    }
    return intro;
}
function extractEmail(input) {
    const match = input.match(/<([^>]+)>/);
    if (match) {
        return match[1].trim();
    }
    return input.replace(/['"]/g, '').trim();
}
async function sendMarketingEmail(to, data, template = 'marketing', country = 'mexico') {
    // Determinar nombre de archivo basado en el país y el template
    const templateFilename = country === 'colombia'
        ? (template === 'asesor' ? 'asesor_colombia.html' : (template === 'asesor_b' ? 'asesor_b_colombia.html' : 'marketing_colombia.html'))
        : (template === 'asesor' ? 'asesor.html' : 'marketing.html');
    const templatePath = path_1.default.join(__dirname, `../templates/${templateFilename}`);
    let html = await promises_1.default.readFile(templatePath, 'utf8');
    // Si es Colombia, generar y reemplazar introduccion_personalizada
    if (country === 'colombia') {
        const intro = template === 'marketing'
            ? generarIntroduccionColombiaMarketing({
                id: data.lead_id,
                nombre_empresa: data.nombre_empresa,
                nombre_comercial: data.nombre_comercial,
                descripcion_corta: data.descripcion_corta
            })
            : generarIntroduccionColombiaAsesor({
                id: data.lead_id,
                nombre_empresa: data.nombre_empresa,
                nombre_comercial: data.nombre_comercial,
                descripcion_corta: data.descripcion_corta
            });
        html = html.replace(/{{introduccion_personalizada}}/g, intro);
    }
    // Configuración de seguimiento basada en el país
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const fuente = country === 'colombia' ? "correo_directo_colombia" : "correo_directo_mexico";
    const medio = "email_marketing_proactivo";
    const campana = data.campana_utm || (country === 'colombia'
        ? (template === 'asesor' ? "prospeccion_asesor_colombia" : (template === 'asesor_b' ? "prospeccion_asesorb_colombia" : "prospeccion_marketing_colombia"))
        : (template === 'asesor' ? "prospeccion_asesor" : "prospeccion_mayoreo_semanal"));
    const contenido = country === 'colombia'
        ? (template === 'asesor' ? "cta_portada_asesor" : (template === 'asesor_b' ? "cta_portada_asesorb" : "cta_portada_marketing"))
        : (template === 'asesor' ? "link_asesor_texto" : "boton_explorar_plataforma_inegi");
    const trackingBase = country === 'colombia'
        ? "https://www.tomapedidos.app/tomapedidos/lead-email-campaign-col.page"
        : `${baseUrl}/`;
    const linkSeguimiento = `${trackingBase}?utm_source=${fuente}&utm_medium=${medio}&utm_campaign=${campana}&utm_content=${contenido}&ref=${data.lead_id}&empresa=${encodeURIComponent(data.nombre_empresa)}&email=${encodeURIComponent(to)}`;
    html = html
        .replace(/{{nombre_empresa}}/g, data.nombre_empresa)
        .replace(/{{enfoque_ventas}}/g, data.enfoque_ventas)
        .replace(/{{sector}}/g, data.sector || 'Distribución')
        .replace(/{{productos}}/g, data.productos || 'sus productos')
        .replace(/{{telefono}}/g, data.telefono || '+573143783993')
        .replace(/{{base_url}}/g, baseUrl)
        .replace(/{{link_seguimiento}}/g, linkSeguimiento);
    // Asunto basado en el país y variante
    const subject = country === 'colombia'
        ? (template === 'asesor'
            ? `Pregunta para el equipo de ${data.nombre_empresa}`
            : template === 'asesor_b'
                ? `Optimización de ventas para ${data.nombre_empresa} ⚡`
                : `Optimiza la gestión de tus vendedores tienda a tienda - ${data.nombre_empresa} 📱`)
        : (template === 'asesor'
            ? `"${data.nombre_empresa}" estás perdiendo más clientes.`
            : `El mapa exacto de tus próximos clientes 🗺️`);
    // Remitente dinámico (Forzado por el usuario a santiagotorres@tomapedidos.app)
    let senderFrom = exports.emailFrom;
    if (country === 'colombia') {
        if (template === 'asesor' || template === 'asesor_b') {
            senderFrom = `"Santiago Torres - Tomapedidos" <santiagotorres@tomapedidos.app>`;
        }
        else {
            senderFrom = `"Tomapedidos" <santiagotorres@tomapedidos.app>`;
        }
    }
    const cleanEnvelopeFrom = exports.emailFrom ? extractEmail(exports.emailFrom) : undefined;
    const mailOptions = {
        from: senderFrom,
        to: to,
        subject: subject,
        html: html,
    };
    if (cleanEnvelopeFrom) {
        mailOptions.envelope = {
            from: cleanEnvelopeFrom,
            to: to
        };
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Correo enviado a: ${to} (${country.toUpperCase()} - ${template.toUpperCase()}) - ID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error(`Error enviando correo a ${to} (${country.toUpperCase()} - ${template.toUpperCase()}):`, error);
        return false;
    }
}
