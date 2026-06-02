import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tanstack/react-query")) {
            return "react-query";
          }
          if (id.includes("react-router") || id.includes("@remix-run/router")) {
            return "router";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
  resolve: {
    alias: {
      "@agentboard/ui": fileURLToPath(new URL("../../packages/ui/src/index.tsx", import.meta.url)),
      "@agentboard/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@agentboard/domain": fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
