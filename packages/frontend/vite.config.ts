import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.VITE_PORT ?? 5173);
const backendPort = process.env.PEARL_BACKEND_PORT ?? "3456";
const proxy = {
  "/api": {
    target: `http://127.0.0.1:${backendPort}`,
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port, proxy },
  preview: { port, proxy },
});
