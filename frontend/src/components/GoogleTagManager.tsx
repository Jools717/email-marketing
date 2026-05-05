'use client';

import { useEffect } from 'react';

export default function GoogleTagManager({ gtmId }: { gtmId: string }) {
  useEffect(() => {
    if (!gtmId || typeof window === 'undefined' || window.dataLayer) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    const f = document.getElementsByTagName('script')[0];
    const j = document.createElement('script') as HTMLScriptElement;
    j.async = true;
    j.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    if (f && f.parentNode) {
      f.parentNode.insertBefore(j, f);
    }
  }, [gtmId]);

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
