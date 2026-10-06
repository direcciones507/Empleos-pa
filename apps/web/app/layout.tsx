import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./visual-fixes.css";
import "./multi-profile.css";

const GA_MEASUREMENT_ID = "G-MR6Q7QM940";

export const metadata: Metadata = {
  title: "Empleos.pa",
  description: "Encuentra oportunidades. Encuentra talento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
