import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendUrl = env.FRONTEND_URL || "http://nginx";

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
        "/api": { target: frontendUrl, changeOrigin: true },
        "/media": { target: frontendUrl, changeOrigin: true },
        "/ws": {
          target: frontendUrl.replace(/^http/, "ws"),
          ws: true,
          changeOrigin: true,
        },
        "/novnc": { target: frontendUrl, changeOrigin: true, ws: true },
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
