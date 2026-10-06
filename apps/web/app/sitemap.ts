import type { MetadataRoute } from "next";

const BASE_URL = "https://empleospa.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/sobre",
    "/servicios",
    "/planes",
    "/contacto",
    "/privacidad",
    "/terminos",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: route === "" ? "daily" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
