import type { Metadata } from "next";
import "./globals.css";
import "./visual-fixes.css";
export const metadata:Metadata={title:"Empleos.pa",description:"Encuentra oportunidades. Encuentra talento."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
