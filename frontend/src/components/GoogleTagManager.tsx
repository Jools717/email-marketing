'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GoogleTagManager({ gtmId }: { gtmId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gtmId || typeof window === 'undefined') return;

    // Solo inicializamos el script la primera vez
    if (!window.dataLayer) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

      const f = document.getElementsByTagName('script')[0];
      const j = document.createElement('script') as HTMLScriptElement;
      j.async = true;
      j.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
      if (f && f.parentNode) {
        f.parentNode.insertBefore(j, f);
      }
    }
  }, [gtmId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: 'virtual_page_view',
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
