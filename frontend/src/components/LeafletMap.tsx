'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para el icono por defecto de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para re-centrar el mapa cuando cambian los datos
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function LeafletMap({ 
  search, 
  stateFilter, 
  sectorFilter, 
  page, 
  onDataLoaded 
}: { 
  search: string; 
  stateFilter: string; 
  sectorFilter: string; 
  page: number; 
  onDataLoaded: () => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulated progress bar effect
  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(old => {
          // Slow down as it reaches 90%
          if (old >= 90) return old;
          const increment = Math.random() * (90 - old) * 0.1 + 1;
          return Math.min(old + increment, 90);
        });
      }, 300);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [loading]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/locations?map=true&page=${page}&limit=100&search=${encodeURIComponent(search)}&state=${encodeURIComponent(stateFilter)}&sector=${encodeURIComponent(sectorFilter || '')}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
        onDataLoaded();
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        onDataLoaded();
      });
  }, [search, stateFilter, sectorFilter, page]);

  // Centro por defecto (México)
  const defaultCenter: [number, number] = [23.6345, -102.5528];
  const defaultZoom = 5;

  // Si hay datos, centrar en el primer resultado (aproximación rápida)
  const center: [number, number] = data.length > 0 && data[0].latitud && data[0].longitud
    ? [parseFloat(data[0].latitud), parseFloat(data[0].longitud)]
    : defaultCenter;

  const zoom = data.length > 0 && stateFilter ? 7 : defaultZoom;

  return (
    <div className="h-full w-full relative">
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center space-y-5 animate-in fade-in zoom-in duration-300">
             <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400">
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
               <h3 className="font-semibold text-lg">Cargando Mapa...</h3>
             </div>
             
             <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed">
               Procesando grandes volúmenes de datos del INEGI. Esto puede tomar unos segundos.
             </p>
             
             <div className="w-full space-y-2">
               <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                 <div 
                   className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out relative" 
                   style={{ width: `${progress}%` }}
                 >
                   <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                 </div>
               </div>
               <div className="w-full flex justify-between text-xs font-medium text-gray-400">
                 <span>Procesando coordenadas</span>
                 <span>{Math.round(progress)}%</span>
               </div>
             </div>
          </div>
        </div>
      )}
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map((loc) => {
          if (!loc.latitud || !loc.longitud) return null;
          return (
            <Marker key={loc.id} position={[parseFloat(loc.latitud), parseFloat(loc.longitud)]}>
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900 text-base mb-1 border-b pb-1">{loc.nom_estab}</h3>
                  <p className="text-xs text-blue-600 font-semibold mb-2">{loc.sector || loc.nombre_act}</p>
                  
                  <div className="space-y-1.5 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Personal:</span>
                      <span className="font-medium">{loc.per_ocu || 'No espec.'}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Antigüedad:</span>
                      <span className="font-medium">{loc.fecha_alta || 'N/A'}</span>
                    </p>
                    <p className="border-t pt-1.5 mt-1.5 text-gray-700">
                      <strong>{loc.municipio}</strong>, {loc.entidad}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t space-y-2">
                    {loc.telefono && (
                      <a href={`tel:${loc.telefono}`} className="flex items-center text-blue-600 hover:underline text-sm">
                        <span className="mr-2">📞</span> {loc.telefono}
                      </a>
                    )}
                    {loc.correoelec && (
                      <a href={`mailto:${loc.correoelec}`} className="flex items-center text-blue-600 hover:underline text-sm">
                        <span className="mr-2">✉️</span> {loc.correoelec}
                      </a>
                    )}
                    {loc.www && (
                      <a href={loc.www.startsWith('http') ? loc.www : `https://${loc.www}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                        <span className="mr-2">🌐</span> Web
                      </a>
                    )}
                    {!loc.telefono && !loc.correoelec && !loc.www && (
                      <p className="text-xs text-gray-400 italic">Sin datos de contacto directos</p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
