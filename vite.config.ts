import { readFileSync } from "fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { buildGeoCatalog, GEO_CATALOG_DIR, type RawCity, type RawState } from "./src/lib/geo-catalog-build";

// Regions and cities are served as one small JSON file per country (geo/AM.json), instead of
// bundling the whole 8 MB world list into the app.
function geoCatalogPlugin(): Plugin {
  let files: Map<string, string> | null = null;
  const load = () => {
    if (!files) {
      const assets = path.resolve(import.meta.dirname, "node_modules/country-state-city/lib/assets");
      const states = JSON.parse(readFileSync(path.join(assets, "state.json"), "utf8")) as RawState[];
      const cities = JSON.parse(readFileSync(path.join(assets, "city.json"), "utf8")) as RawCity[];
      files = new Map(
        [...buildGeoCatalog(states, cities)].map(([code, data]) => [code, JSON.stringify(data)]),
      );
    }
    return files;
  };
  return {
    name: "civizen-geo-catalog",
    configureServer(server) {
      server.middlewares.use(`/${GEO_CATALOG_DIR}/`, (req, res, next) => {
        const code = req.url?.match(/^\/([A-Z]{2})\.json$/)?.[1];
        const body = code ? load().get(code) : undefined;
        if (!body) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(body);
      });
    },
    generateBundle() {
      for (const [code, body] of load()) {
        this.emitFile({ type: "asset", fileName: `${GEO_CATALOG_DIR}/${code}.json`, source: body });
      }
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
  plugins: [react(), tailwindcss(), geoCatalogPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
