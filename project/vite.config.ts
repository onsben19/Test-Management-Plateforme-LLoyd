import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.BACKEND_URL || env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || "https://api.insuretb.tech";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["insuretb.tech", ".insuretb.tech"],
      proxy: {
        "/api": { target: backendUrl, changeOrigin: true },
        "/media": { target: backendUrl, changeOrigin: true },
        "/ws": {
          target: backendUrl.replace(/^http/, "ws"),
          ws: true,
          changeOrigin: true,
        },
        "/novnc": { target: backendUrl, changeOrigin: true, ws: true },
      },
    },
    esbuild: {
      logOverride: { "ignored-directive": "silent" },
    },
    logLevel: "info",
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.message.includes("Module level directives") ||
            warning.message.includes('"use client"') ||
            warning.message.includes('"was ignored"')
          ) {
            return;
          }
          if (warning.code === "UNRESOLVED_IMPORT") {
            throw new Error(`Build failed due to unresolved import:\n${warning.message}`);
          }
          if (warning.code === "PLUGIN_WARNING" && /is not exported/.test(warning.message)) {
            throw new Error(`Build failed due to missing export:\n${warning.message}`);
          }
          warn(warning);
        },
      },
    },
  };
});
