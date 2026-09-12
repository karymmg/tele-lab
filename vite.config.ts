import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-512.jpg"],
      manifest: {
        name: "Tele Lab — Réparation mobile à domicile",
        short_name: "Tele Lab",
        description:
          "Réparation de téléphone à domicile en Tunisie. Suivi en temps réel, paiement en deux fois.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#03070A",
        theme_color: "#008CFF",
        icons: [
          {
            src: "/icon-512.jpg",
            sizes: "512x512",
            type: "image/jpeg",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,jpg,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // للسماح بجميع النطاقات المعاينة على Vercel
    allowedHosts: true,
  },
});