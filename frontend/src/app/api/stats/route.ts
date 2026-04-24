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
    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || '';
    const sector = searchParams.get('sector') || '';

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

    // All states by count (removed limit)
    const statesResult = await pool.query(`
      SELECT entidad, COUNT(*) as total 
      FROM comercio_minorista_inegi 
      ${whereClause} AND entidad IS NOT NULL 
      GROUP BY entidad 
      ORDER BY total DESC 
    `, params);

    // Top categories
    const categoriesResult = await pool.query(`
      SELECT sector_limpio as nombre_act, COUNT(*) as total 
      FROM comercio_minorista_inegi 
      ${whereClause} AND sector_limpio IS NOT NULL 
      GROUP BY sector_limpio 
      ORDER BY total DESC 
      LIMIT 10
    `, params);

    const totalResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM comercio_minorista_inegi
      ${whereClause}
    `, params);

    const cleanStates = statesResult.rows.map(r => ({
      rawName: r.entidad,
      name: fixEncoding(r.entidad),
      value: parseInt(r.total)
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      total: parseInt(totalResult.rows[0].total),
      topStates: cleanStates,
      topCategories: categoriesResult.rows.map(r => ({ name: fixEncoding(r.nombre_act), value: parseInt(r.total) }))
    });
  } catch (error) {
    console.error('DETAILED API ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: (error as Error).message }, { status: 500 });
  }
}

