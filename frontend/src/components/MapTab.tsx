'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';

// Carga dinámica de Leaflet para evitar el error de "window is not defined" en SSR de Next.js
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-gray-500">Cargando mapa interactivo...</p>
      </div>
    </div>
  ),
});

export default function MapTab({ search, stateFilter, sectorFilter }: { search: string; stateFilter: string; sectorFilter: string }) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cuando cambian los filtros, volvemos al lote 1 y consultamos cuántos lotes hay
    setPage(1);
    setLoading(true);
    fetch(`/api/locations?map=true&page=1&limit=100&search=${encodeURIComponent(search)}&state=${encodeURIComponent(stateFilter)}&sector=${encodeURIComponent(sectorFilter)}`)
      .then(res => res.json())
      .then(json => {
        setTotalPages(json.totalPages || 1);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [search, stateFilter, sectorFilter]);

  return (
    <div className="space-y-4">
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          <p>
            Mostrando <strong>Lote {page}</strong> de {totalPages} (Máx 100 pines por lote)
          </p>
          <div className="flex gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <select
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
              disabled={loading}
              className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Lote {p}</option>
              ))}
            </select>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[600px] relative z-0">
        <LeafletMap search={search} stateFilter={stateFilter} sectorFilter={sectorFilter} page={page} onDataLoaded={() => setLoading(false)} />
      </div>
    </div>
  );
}
