import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/candidato/",
        "/empresa/",
        "/elegir-perfil/",
        "/login/",
        "/recuperar/",
        "/registro/",
        "/restablecer/",
      ],
    },
    sitemap: "https://empleospa.com/sitemap.xml",
    host: "https://empleospa.com",
  };
}
