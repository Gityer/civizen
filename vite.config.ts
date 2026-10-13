import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";

// Per-country geo files in public/geo/v1 (v2 plan step B2): generated before dev and build, never bundled.
function geoData(): Plugin {
  return {
    name: "civizen-geo-data",
    async buildStart() {
      if (process.env.VITEST) return;
      const { writeGeoData } = await import("./scripts/geo-data.mjs");
      await writeGeoData();
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    // Listen on all interfaces (IPv4 + IPv6). Using only "::" can break some
    // Windows↔WSL port-forwarding setups where the browser hits 127.0.0.1.
    host: true,
    port: 8080,
    // If 8080 is still held by a previous dev server, pick the next free port
    // instead of exiting — avoids "can't connect" after an unclean restart.
    strictPort: false,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: true,
    port: 8080,
    strictPort: false,
  },
  plugins: [react(), tailwindcss(), geoData()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
