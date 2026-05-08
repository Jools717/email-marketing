'use client';

import { useState, useEffect } from 'react';
import { Map as MapIcon, Table as TableIcon, Activity, MapPin, Store } from 'lucide-react';
import TableTab from './TableTab';
import MapTab from './MapTab';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');
  const [stats, setStats] = useState<any>(null);
  const [globalStates, setGlobalStates] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filtros globales
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  // 1. Captura de UTMs y persistencia en DB y LocalStorage
  useEffect(() => {
    const utms = {
      lead_id: searchParams.get('ref'), // Usamos ref como lead_id
      nombre_empresa: searchParams.get('empresa'), // Capturamos el nombre de la empresa
      user_email: searchParams.get('email'), // Capturamos el email del destinatario
      fuente: searchParams.get('utm_source'),
      medio: searchParams.get('utm_medium'),
      campana: searchParams.get('utm_campaign'),
      contenido: searchParams.get('utm_content'),
      url_completa: window.location.href,
      user_agent: navigator.userAgent
    };

    // Si detectamos que viene de una campaña (fuente o ref)
    if (utms.fuente || utms.lead_id) {
      // Guardar en LocalStorage para persistencia en el navegador
      localStorage.setItem('atribucion_marketing_mexico', JSON.stringify({
        ...utms,
        fecha: new Date().toISOString()
      }));

      // ENVIAR A GOOGLE TAG MANAGER EN LUGAR DE LA BASE DE DATOS
      if (typeof window !== 'undefined') {
        window.dataLayer = window.dataLayer || [];
        console.log('GTM Dashboard: Enviando user_identified', utms.user_email || utms.nombre_empresa || utms.lead_id);
        window.dataLayer.push({
          event: 'user_identified',
          lead_id: utms.lead_id,
          company_name: utms.nombre_empresa,
          user_email: utms.user_email,
          utm_source: utms.fuente,
          utm_medium: utms.medio,
          utm_campaign: utms.campana,
          utm_content: utms.contenido
        });
      }
    }
  }, [searchParams]);

  // Fetch initial global states for the dropdown
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setGlobalStates(data.topStates || []);
      })
      .catch(console.error);
  }, []);

  // Fetch dynamic stats based on filters
  useEffect(() => {
    setLoadingStats(true);
    const timer = setTimeout(() => {
      fetch(`/api/stats?search=${encodeURIComponent(search)}&state=${encodeURIComponent(stateFilter)}&sector=${encodeURIComponent(sectorFilter)}`)
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoadingStats(false);
          
          // 2. Trackeo de búsqueda en Meta Pixel
          // @ts-ignore
          if (window.fbq && (search || stateFilter || sectorFilter)) {
            // @ts-ignore
            window.fbq('track', 'Search', {
              search_string: search,
              content_category: sectorFilter,
              content_ids: [stateFilter]
            });
          }

          // 3. Trackeo de búsqueda en GTM
          if (typeof window !== 'undefined' && (search || stateFilter || sectorFilter)) {
            window.dataLayer = window.dataLayer || [];
            let lead_id = searchParams.get('ref') || null;
            let company_name = searchParams.get('empresa') || null;
            let user_email = searchParams.get('email') || null;

            if (!lead_id) {
              try {
                const stored = localStorage.getItem('atribucion_marketing_mexico');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  lead_id = parsed.lead_id;
                  company_name = parsed.nombre_empresa;
                  user_email = parsed.user_email;
                }
              } catch (e) {}
            }
            window.dataLayer.push({
              event: 'dashboard_search',
              search_string: search,
              sector_filter: sectorFilter,
              state_filter: stateFilter,
              lead_id: lead_id,
              company_name: company_name,
              user_email: user_email
            });
          }
        })
        .catch(err => {
          console.error(err);
          setLoadingStats(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [search, stateFilter, sectorFilter]);

  const handleTabChange = (tab: 'table' | 'map') => {
    console.log('GTM Dashboard: Click en pestaña', tab);
    setActiveTab(tab);
    
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      
      let lead_id = searchParams.get('ref') || null;
      let company_name = searchParams.get('empresa') || null;
      let user_email = searchParams.get('email') || null;

      if (!lead_id) {
        try {
          const stored = localStorage.getItem('atribucion_marketing_mexico');
          if (stored) {
            const parsed = JSON.parse(stored);
            lead_id = parsed.lead_id;
            company_name = parsed.nombre_empresa;
            user_email = parsed.user_email;
          }
        } catch (e) {}
      }

      console.log('GTM Dashboard: Enviando tab_change', tab, 'lead_id:', lead_id, 'empresa:', company_name, 'email:', user_email);
      window.dataLayer.push({
        event: 'tab_change',
        tab_name: tab === 'table' ? 'Directorio y Búsqueda' : 'Mapa Interactivo',
        lead_id: lead_id,
        company_name: company_name,
        user_email: user_email
      });
    }
  };

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
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {loadingStats ? '...' : (stateFilter ? globalStates.find(s => s.rawName === stateFilter)?.name : 'Todos los Estados')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center space-x-4 transition-transform hover:scale-105">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Activity size={28} />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoría</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={sectorFilter || 'Todos los Sectores'}>
              {loadingStats ? '...' : sectorFilter || 'Todos los Sectores'}
            </p>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input
            type="text"
            placeholder="Buscar por nombre o municipio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none text-sm cursor-pointer"
            >
              <option value="">Todos los Sectores</option>
              <option value="Alimentos y Abarrotes">Alimentos y Abarrotes</option>
              <option value="Moda y Vestimenta">Moda y Vestimenta</option>
              <option value="Salud y Bienestar">Salud y Bienestar</option>
              <option value="Automotriz y Transporte">Automotriz y Transporte</option>
              <option value="Ferretería y Construcción">Ferretería y Construcción</option>
              <option value="Hogar y Decoración">Hogar y Decoración</option>
              <option value="Tecnología y Electrónica">Tecnología y Electrónica</option>
              <option value="Entretenimiento y Deportes">Entretenimiento y Deportes</option>
              <option value="Papelería y Regalos">Papelería y Regalos</option>
              <option value="Otros Comercios">Otros Comercios</option>
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-[18px] h-[18px]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none text-sm cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              {globalStates.map((s, i) => (
                <option key={i} value={s.rawName}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => handleTabChange('table')}
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
            onClick={() => handleTabChange('map')}
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
            <TableTab search={search} stateFilter={stateFilter} sectorFilter={sectorFilter} />
          ) : (
            <MapTab search={search} stateFilter={stateFilter} sectorFilter={sectorFilter} />
          )}
        </div>
      </div>
    </div>
  );
}
