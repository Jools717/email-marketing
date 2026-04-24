import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export async function GET() {
  try {
    // Top states by count
    const statesResult = await pool.query(`
      SELECT entidad, COUNT(*) as total 
      FROM comercio_minorista_inegi 
      WHERE entidad IS NOT NULL 
      GROUP BY entidad 
      ORDER BY total DESC 
      LIMIT 10
    `);

    // Top categories
    const categoriesResult = await pool.query(`
      SELECT nombre_act, COUNT(*) as total 
      FROM comercio_minorista_inegi 
      WHERE nombre_act IS NOT NULL 
      GROUP BY nombre_act 
      ORDER BY total DESC 
      LIMIT 10
    `);

    const totalResult = await pool.query(`SELECT COUNT(*) as total FROM comercio_minorista_inegi`);

    return NextResponse.json({
      total: parseInt(totalResult.rows[0].total),
      topStates: statesResult.rows.map(r => ({ name: r.entidad, value: parseInt(r.total) })),
      topCategories: categoriesResult.rows.map(r => ({ name: r.nombre_act, value: parseInt(r.total) }))
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
