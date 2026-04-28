'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react';

export default function TableTab({ search, stateFilter, sectorFilter }: { search: string; stateFilter: string; sectorFilter: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/locations?page=${page}&limit=20&search=${encodeURIComponent(search)}&state=${encodeURIComponent(stateFilter)}&sector=${encodeURIComponent(sectorFilter)}`);
      const json = await res.json();
      setData(json.data || []);
      setTotalPages(json.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    fetchData();
  }, [search, stateFilter, sectorFilter]);

  useEffect(() => {
    fetchData();
  }, [page]);

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4">Establecimiento</th>
              <th className="px-6 py-4">Actividad</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p>Cargando datos...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron resultados para tu búsqueda.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{row.nom_estab}</p>
                    {row.raz_social && <p className="text-xs text-gray-500">{row.raz_social}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 max-w-xs truncate" title={row.nombre_act}>
                      {row.sector || row.nombre_act}
                    </span>
                    <div className="mt-1 flex space-x-2 text-[10px] text-gray-500">
                      <span>👥 {row.per_ocu}</span>
                      <span>📅 {row.fecha_alta}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 dark:text-gray-200">{row.municipio}</p>
                    <p className="text-xs text-gray-500">{row.entidad}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-1">
                      {row.telefono && (
                        <a 
                          href={`tel:${row.telefono}`} 
                          onClick={() => {
                            // @ts-ignore
                            if (window.fbq) window.fbq('track', 'Lead', { content_name: row.nom_estab, content_category: 'Phone' });
                          }}
                          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Phone size={14} className="mr-2" />
                          <span>{row.telefono}</span>
                        </a>
                      )}
                      {row.correoelec && (
                        <a 
                          href={`mailto:${row.correoelec}`}
                          onClick={() => {
                            // @ts-ignore
                            if (window.fbq) window.fbq('track', 'Lead', { content_name: row.nom_estab, content_category: 'Email' });
                          }}
                          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Mail size={14} className="mr-2" />
                          <span>{row.correoelec}</span>
                        </a>
                      )}
                      {!row.telefono && !row.correoelec && <span className="text-gray-400 italic text-xs">No disponible</span>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Página <span className="font-medium text-gray-900 dark:text-white">{page}</span> de <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
