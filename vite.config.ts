import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  build: {
    // GitHub usernames can't start with an underscore, so built assets can
    // never shadow an /org/repo route
    assetsDir: "_assets",
  },
  test: {
    globals: true,
    environment: "node",
  },
});
