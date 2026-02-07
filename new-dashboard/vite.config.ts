import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/echarts/")) return "vendor-echarts";
          if (id.includes("/react/") || id.includes("/react-dom/")) return "vendor-react";
          if (id.includes("/zod/")) return "vendor-zod";
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@legacy-data": resolve(__dirname, "../data.js"),
      "@nngyk-all": resolve(__dirname, "../nngyk_all.json"),
      "@erviss-sari": resolve(__dirname, "../erviss_data/erviss_sari.json"),
    },
  },
  server: {
    fs: {
      allow: [resolve(__dirname, "..")],
    },
  },
});
