import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Hello World App",
        short_name: "HelloWorld",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        description: "Simple React Hello World",
        icons: [],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://localhost:7092",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
