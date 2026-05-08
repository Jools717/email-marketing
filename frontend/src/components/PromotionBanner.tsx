'use client';

import React, { useState, useEffect } from 'react';

const PromotionBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya cerró el banner en esta sesión
    const bannerClosed = sessionStorage.getItem('promotion_banner_closed');
    if (bannerClosed) {
      setIsClosed(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 15000); // 15 segundos

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
    sessionStorage.setItem('promotion_banner_closed', 'true');
  };

  const handleAction = () => {
    // Evento para GTM/Tag Manager
    if (typeof window !== 'undefined' && window.dataLayer) {
      let lead_id = null;
      let company_name = null;
      let user_email = null;
      try {
        const stored = localStorage.getItem('atribucion_marketing_mexico');
        if (stored) {
          const parsed = JSON.parse(stored);
          lead_id = parsed.lead_id;
          company_name = parsed.nombre_empresa;
          user_email = parsed.user_email;
        }
      } catch (e) {}

      window.dataLayer.push({
        event: 'promotion_banner_click',
        debug_mode: true,
        banner_name: 'asesoria_mayorista',
        action: 'quiero_asesorarme',
        lead_id: lead_id,
        company_name: company_name,
        user_email: user_email
      });
    }
    console.log('Solicitando asesoría...');
    window.open('https://calendly.com/tu-empresa', '_blank');
  };

  if (isClosed || !isVisible) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[60] px-4 py-3 bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 text-white shadow-xl border-b border-white/20 animate-slide-up animate-gradient">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full hidden sm:block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm md:text-base font-medium">
            <span className="font-bold">¿Quieres potenciar tus ventas?</span> Ofrecemos inteligencia comercial personalizada para tu sector mayorista.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={handleAction}
            className="bg-white text-green-700 hover:bg-green-50 px-6 py-2 rounded-full font-bold text-sm transition-colors shadow-sm active:scale-95 whitespace-nowrap"
          >
            Quiero Asesorarme
          </button>
          
          <button 
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Cerrar banner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromotionBanner;
