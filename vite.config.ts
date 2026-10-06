import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

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
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
