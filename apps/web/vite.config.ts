import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: ["**/.rawr/**"],
    },
    proxy: {
      "/rawr": { target: "http://localhost:3000", changeOrigin: true },
      "/rpc": { target: "http://localhost:3000", changeOrigin: true },
      "/api/orpc": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
