import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
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
