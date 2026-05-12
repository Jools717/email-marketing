import Dashboard from '@/components/Dashboard';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Directorio Minorista México
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl text-lg">
              Explora millones de puntos de venta y establecimientos a lo largo de todo el país
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full font-medium">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span>Datos Oficiales INEGI</span>
          </div>
        </header>

        <Suspense fallback={<div className="flex items-center justify-center py-20">Cargando dashboard...</div>}>
          <Dashboard />
        </Suspense>
      </div>
    </main>
  );
}
