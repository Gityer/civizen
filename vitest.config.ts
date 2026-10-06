import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Component tests (.tsx) run in jsdom; pure logic tests (.ts) run in plain Node, which starts far
    // faster. A .ts test that needs the DOM opts in with a `// @vitest-environment jsdom` first line.
    projects: [
      { extends: true, test: { name: "dom", environment: "jsdom", include: ["src/**/*.{test,spec}.tsx"] } },
      { extends: true, test: { name: "node", environment: "node", include: ["src/**/*.{test,spec}.ts"] } },
    ],
    // Placeholder backend so modules that import the Supabase client load on a clean checkout and in CI.
    // Tests never reach it; a real .env still wins when present.
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key",
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
