import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    build: {
      sourcemap: mode === "development" ? true : false,
      outDir: "dist",
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          // Ignore leaflet-draw default export warning coming from react-leaflet-draw build
          if (
            warning.code === "MISSING_EXPORT" &&
            /leaflet\.draw\.js$/.test(String(warning.id || ""))
          ) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            leaflet: ["leaflet", "react-leaflet-draw"],
            charts: ["apexcharts", "react-apexcharts"],
            ui: ["react-toastify", "rc-tree"],
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: process.env.VITE_PROXY_API || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});
