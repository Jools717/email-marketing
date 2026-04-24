import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const sectorMappings: { sector: string; keywords: string[] }[] = [
  {
    sector: 'Alimentos y Abarrotes',
    keywords: [
      'abarrotes', 'carnes', 'cerveza', 'frutas y verduras', 'leche', 'paletas de hielo', 
      'pescados', 'vinos y licores', 'minisupers', 'supermercados', 'otros alimentos',
      'semillas y granos', 'dulces y materias'
    ]
  },
  {
    sector: 'Moda y Vestimenta',
    keywords: [
      'ropa', 'calzado', 'bisutería', 'lencería', 'sombreros', 'telas'
    ]
  },
  {
    sector: 'Salud y Bienestar',
    keywords: [
      'farmacias', 'lentes', 'ortopédicos', 'productos naturistas', 'perfumería'
    ]
  },
  {
    sector: 'Automotriz y Transporte',
    keywords: [
      'automóviles', 'camionetas', 'bicicletas', 'gasolina', 'gas l. p.', 'llantas', 
      'motocicletas', 'partes y refacciones', 'aceites y grasas', 'vehículos de motor',
      'gas natural'
    ]
  },
  {
    sector: 'Ferretería y Construcción',
    keywords: [
      'ferreterías', 'materiales para la construcción', 'pintura', 'pisos', 'vidrios',
      'lámparas'
    ]
  },
  {
    sector: 'Hogar y Decoración',
    keywords: [
      'muebles', 'electrodomésticos', 'blancos', 'cristalería', 'decoración',
      'alfombras', 'antigüedades'
    ]
  },
  {
    sector: 'Tecnología y Electrónica',
    keywords: [
      'cómputo', 'teléfonos y otros aparatos'
    ]
  },
  {
    sector: 'Entretenimiento y Deportes',
    keywords: [
      'deportivos', 'juguetes', 'libros', 'revistas', 'discos y casetes', 'instrumentos musicales'
    ]
  },
  {
    sector: 'Papelería y Regalos',
    keywords: [
      'papelería', 'regalos', 'mercería'
    ]
  },
  {
    sector: 'Otros Comercios',
    keywords: [
      'mascotas', 'artículos religiosos', 'plantas y flores', 'artículos usados',
      'desechables', 'albercas', 'limpieza', 'artículos de uso personal',
      'artesanías', 'departamentales', 'internet'
    ]
  }
];

async function updateSectors() {
  const client = await pool.connect();
  
  try {
    console.log('Agregando columna sector_limpio (si no existe)...');
    await client.query(`
      ALTER TABLE comercio_minorista_inegi 
      ADD COLUMN IF NOT EXISTS sector_limpio VARCHAR(100) DEFAULT 'Otros Comercios';
    `);

    console.log('Mapeando sectores...');
    
    await client.query('BEGIN');

    let totalUpdated = 0;

    for (const mapping of sectorMappings) {
      console.log(`Actualizando sector: ${mapping.sector}...`);
      
      const conditions = mapping.keywords.map((k, i) => `nombre_act ILIKE $${i+1}`).join(' OR ');
      const values = mapping.keywords.map(k => `%${k}%`);
      
      const query = `
        UPDATE comercio_minorista_inegi 
        SET sector_limpio = '${mapping.sector}' 
        WHERE ${conditions};
      `;
      
      const res = await client.query(query, values);
      console.log(`- Registros actualizados: ${res.rowCount || 0}`);
      totalUpdated += res.rowCount || 0;
    }

    // Default for any unmatched records
    const resDefault = await client.query(`
      UPDATE comercio_minorista_inegi 
      SET sector_limpio = 'Otros Comercios' 
      WHERE sector_limpio IS NULL;
    `);
    console.log(`- Registros asignados a "Otros Comercios" por default: ${resDefault.rowCount || 0}`);

    await client.query('COMMIT');
    console.log(`¡Mapeo completado! Total asignados: ${totalUpdated}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante el mapeo:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSectors();
