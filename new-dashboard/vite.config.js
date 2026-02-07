import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
    plugins: [react()],
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
