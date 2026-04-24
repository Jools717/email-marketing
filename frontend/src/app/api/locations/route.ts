import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || '';
    
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (nom_estab ILIKE $${paramIndex} OR raz_social ILIKE $${paramIndex} OR municipio ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (state) {
      whereClause += ` AND entidad = $${paramIndex}`;
      params.push(state);
      paramIndex++;
    }

    // Para el mapa, si piden map=true, traemos un límite más amplio de coordenadas, 
    // pero limitamos a 1000 para no reventar el navegador si no hay filtros estrictos.
    const isMap = searchParams.get('map') === 'true';
    const actualLimit = isMap ? 1000 : limit;

    const query = `
      SELECT id, nom_estab, raz_social, nombre_act, entidad, municipio, telefono, correoelec, latitud, longitud
      FROM comercio_minorista_inegi
      ${whereClause}
      ${isMap ? 'AND latitud IS NOT NULL AND longitud IS NOT NULL' : ''}
      ORDER BY id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(actualLimit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination (only if not map to save resources)
    let totalCount = 0;
    if (!isMap) {
       const countQuery = `SELECT COUNT(*) FROM comercio_minorista_inegi ${whereClause}`;
       const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
       totalCount = parseInt(countResult.rows[0].count);
    }

    return NextResponse.json({
      data: result.rows,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / actualLimit)
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
