import type { MetadataRoute } from "next";

const PUBLIC_PATHS = [
  "",
  "/products/knowledge",
  "/solutions/operations",
  "/solutions/support",
  "/pricing",
  "/demo",
  "/resources",
  "/about",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ["en", "zh-hant"] as const) {
    for (const path of PUBLIC_PATHS) {
      entries.push({
        url: `https://stargazer.example/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: {
            en: `https://stargazer.example/en${path}`,
            "zh-Hant": `https://stargazer.example/zh-hant${path}`,
          },
        },
      });
    }
  }
  return entries;
}
