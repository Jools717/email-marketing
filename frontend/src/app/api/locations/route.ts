import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

function fixEncoding(str: any): string {
  if (!str || typeof str !== 'string') return str;
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || '';
    const sector = searchParams.get('sector') || '';
    
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

    if (sector) {
      whereClause += ` AND sector_limpio = $${paramIndex}`;
      params.push(sector);
      paramIndex++;
    }

    // Para el mapa, si piden map=true, traemos un límite más amplio de coordenadas, 
    // pero limitamos a 100 para no reventar el navegador si no hay filtros estrictos.
    const isMap = searchParams.get('map') === 'true';
    const actualLimit = isMap ? 100 : limit;

    const isRandomSample = isMap && !search && !state && !sector;
    
    const query = `
      SELECT id, nom_estab, raz_social, nombre_act, sector_limpio as sector, entidad, municipio, telefono, correoelec, latitud, longitud, per_ocu, www, fecha_alta
      FROM comercio_minorista_inegi
      ${whereClause}
      ${isMap ? 'AND latitud IS NOT NULL AND longitud IS NOT NULL' : ''}
      ORDER BY ${isRandomSample ? 'RANDOM()' : 'id ASC'}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(actualLimit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination (for both table and map now, so we can do map pagination)
    let totalCount = 0;
    const countQuery = `SELECT COUNT(*) FROM comercio_minorista_inegi ${whereClause} ${isMap ? 'AND latitud IS NOT NULL AND longitud IS NOT NULL' : ''}`;
    const countResult = await pool.query(countQuery, params.slice(0, paramIndex - 1));
    totalCount = parseInt(countResult.rows[0].count);

    // Fix encoding for text fields
    const fixedData = result.rows.map(row => ({
      ...row,
      nom_estab: fixEncoding(row.nom_estab),
      raz_social: fixEncoding(row.raz_social),
      nombre_act: fixEncoding(row.nombre_act),
      entidad: fixEncoding(row.entidad),
      municipio: fixEncoding(row.municipio),
      per_ocu: fixEncoding(row.per_ocu)
    }));

    return NextResponse.json({
      data: fixedData,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / actualLimit)
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
