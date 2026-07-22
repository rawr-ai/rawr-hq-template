import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
