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
      // @ts-ignore
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

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
