import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "spring-text-engine": path.resolve(__dirname, "../TextEngine/index.ts"),
    },
  },
  server: { port: 5173 },
});
