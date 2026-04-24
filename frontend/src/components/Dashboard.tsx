'use client';

import { useState, useEffect } from 'react';
import { Map as MapIcon, Table as TableIcon, Activity, MapPin, Store } from 'lucide-react';
import TableTab from './TableTab';
import MapTab from './MapTab';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoadingStats(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingStats(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center space-x-4 transition-transform hover:scale-105">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Store size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Establecimientos</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingStats ? '...' : new Intl.NumberFormat('es-MX').format(stats?.total || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center space-x-4 transition-transform hover:scale-105">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <MapPin size={28} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado Principal</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {loadingStats ? '...' : stats?.topStates[0]?.name || 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center space-x-4 transition-transform hover:scale-105">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Activity size={28} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoría Top</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={stats?.topCategories[0]?.name}>
              {loadingStats ? '...' : stats?.topCategories[0]?.name || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'table'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <TableIcon size={18} />
            <span>Directorio y Búsqueda</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'map'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <MapIcon size={18} />
            <span>Mapa Interactivo</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'table' ? (
            <TableTab topStates={stats?.topStates || []} />
          ) : (
            <MapTab topStates={stats?.topStates || []} />
          )}
        </div>
      </div>
    </div>
  );
}
