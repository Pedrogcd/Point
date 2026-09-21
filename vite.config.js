import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// INK (fundo/tema) e PANEL (pergaminho) — mesma paleta do app, ver point-amaranth-app.jsx
const THEME_COLOR = "#2B2116";
const BACKGROUND_COLOR = "#F3E9D2";

// GitHub Pages serve o site em /<nome-do-repo>/, não na raiz do domínio — todo
// caminho absoluto (base do Vite, start_url/scope/ícones do manifest,
// navigateFallback do service worker) precisa levar esse prefixo. Se o
// repositório for renomeado, é só trocar aqui.
const BASE = "/Point/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/*.png"],
      manifest: {
        name: "Point — Universo Amaranth",
        short_name: "Point",
        description: "Gerenciador de campanha de RPG de mesa Point — universo Amaranth.",
        lang: "pt-BR",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: `${BASE}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `${BASE}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `${BASE}icons/icon-192-maskable.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: `${BASE}icons/icon-512-maskable.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App 100% client-side (dados no localStorage, sem chamadas de rede própria) —
        // o service worker faz precache do shell pra servir offline. A única chamada de
        // rede real é o @import de fontes do Google Fonts (Cinzel/Spectral/IBM Plex Mono,
        // ver point-amaranth-app.jsx) — sem cache de runtime pra ela, offline de verdade
        // cairia pra fonte padrão do sistema.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
