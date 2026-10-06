import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./visual-fixes.css";
import "./multi-profile.css";

const GA_MEASUREMENT_ID = "G-MR6Q7QM940";
const SITE_URL = "https://empleospa.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Empleos.pa | Empleo y talento en Panamá",
    template: "%s | Empleos.pa",
  },
  description:
    "Conecta con oportunidades de empleo y talento en Panamá. Crea tu perfil laboral o publica una vacante en Empleos.pa.",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "es_PA",
    url: SITE_URL,
    siteName: "Empleos.pa",
    title: "Empleos.pa | Empleo y talento en Panamá",
    description:
      "Encuentra oportunidades de empleo o conecta con talento en Panamá.",
    images: [
      {
        url: "/empleos-pa-og.jpg",
        alt: "Empleos.pa, empleo y talento en Panamá",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Empleos.pa | Empleo y talento en Panamá",
    description:
      "Encuentra oportunidades de empleo o conecta con talento en Panamá.",
    images: ["/empleos-pa-og.jpg"],
  },
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
