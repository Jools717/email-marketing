'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function FacebookPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Definimos la función de inicialización del Píxel
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.fbq) {
      const fbq = function (...args: any[]) {
        fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
      } as any;
      
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      
      window.fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      }

      // @ts-ignore
      window.fbq('init', 'TU_ID_DE_PIXEL_AQUI'); // <--- PEGA AQUÍ TU ID
    }
  }, []);

  useEffect(() => {
    // Disparar PageView cada vez que cambia la ruta
    // @ts-ignore
    if (window.fbq) {
      // @ts-ignore
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}
