'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
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

export default function MapTab({ topStates }: { topStates: any[] }) {
  const [stateFilter, setStateFilter] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none text-sm cursor-pointer"
          >
            <option value="">Todos los Estados (Límite 1000 pts)</option>
            {topStates.map((s, i) => (
              <option key={i} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-[600px] relative z-0">
        <LeafletMap stateFilter={stateFilter} />
      </div>
    </div>
  );
}
