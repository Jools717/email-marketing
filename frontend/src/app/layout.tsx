import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Directorio Minorista México - Inteligencia de Mercado y Dashboard B2B",
  description: "Visualiza y procesa datos geográficos de establecimientos minoristas en México. Campañas de email marketing inteligente y análisis B2B utilizando datos del INEGI.",
};

import { Suspense } from "react";
import FacebookPixel from "@/components/FacebookPixel";
import WhatsAppButton from "@/components/WhatsAppButton";
import PromotionBanner from "@/components/PromotionBanner";
import GoogleTagManager from "@/components/GoogleTagManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <FacebookPixel />
          <GoogleTagManager gtmId="GTM-MRPVGSPK" />
        </Suspense>
        <PromotionBanner />
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}

// Deployment check: juliorj717@gmail.com
