'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GoogleTagManager({ gtmId }: { gtmId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gtmId || typeof window === 'undefined') return;

    console.log('GTM: Iniciando carga para el ID:', gtmId);

    // Inicializamos dataLayer si no existe
    window.dataLayer = window.dataLayer || [];

    // Verificamos si GTM ya fue cargado para evitar duplicados
    const scripts = document.getElementsByTagName('script');
    let isAlreadyLoaded = false;
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].src.includes(`id=${gtmId}`)) {
        isAlreadyLoaded = true;
        break;
      }
    }

    if (!isAlreadyLoaded) {
      console.log('GTM: Inyectando script en el DOM...');
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

      const j = document.createElement('script') as HTMLScriptElement;
      j.async = true;
      j.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
      
      const f = document.getElementsByTagName('script')[0];
      if (f && f.parentNode) {
        f.parentNode.insertBefore(j, f);
      } else {
        document.head.appendChild(j);
      }
    } else {
      console.log('GTM: El script ya estaba presente en el DOM.');
    }
  }, [gtmId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'virtual_page_view',
        debug_mode: true,
        page_path: pathname,
        page_search: searchParams.toString()
      });
    }
  }, [pathname, searchParams]);

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      ></iframe>
    </noscript>
  );
}
