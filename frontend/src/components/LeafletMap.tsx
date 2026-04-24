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

export default function LeafletMap({ stateFilter }: { stateFilter: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/locations?map=true&state=${encodeURIComponent(stateFilter)}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [stateFilter]);

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
        <div className="absolute inset-0 z-[1000] bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
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
                <div className="p-1">
                  <h3 className="font-bold text-gray-900 mb-1">{loc.nom_estab}</h3>
                  <p className="text-xs text-gray-500 mb-2">{loc.nombre_act}</p>
                  <p className="text-sm"><strong>Municipio:</strong> {loc.municipio}, {loc.entidad}</p>
                  {loc.telefono && <p className="text-sm mt-1"><strong>Tel:</strong> {loc.telefono}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
