import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead_id, fuente, medio, campana, contenido, url_completa, user_agent } = body;
    
    // Capturar IP del cliente (depende de cómo esté configurado el proxy/Vercel)
    const ip = request.headers.get('x-forwarded-for') || '0.0.0.0';

    // Seleccionar tabla según el país de origen (fuente)
    const targetTable = (fuente && fuente.includes('colombia'))
      ? 'marketing_clicks_email_colombia'
      : 'marketing_clicks_email_mexico';

    const query = `
      INSERT INTO ${targetTable} 
      (lead_id, fuente, medio, campana, contenido, ip_usuario, user_agent, url_completa)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const values = [
      lead_id ? parseInt(lead_id) : null,
      fuente || 'desconocida',
      medio || 'directo',
      campana || 'general',
      contenido || 'enlace',
      ip,
      user_agent || 'desconocido',
      url_completa
    ];

    const result = await pool.query(query, values);

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error al registrar clic de marketing:', error);
    return NextResponse.json({ error: 'Fallo al registrar el evento' }, { status: 500 });
  }
}
