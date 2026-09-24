import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "pb_public",
  },
  server: {
    // in dev, forward API calls to a locally running `go run . serve`
    // (in prod both are served by the same Go binary, so this is unused)
    proxy: {
      "/api": "http://127.0.0.1:8090",
    },
  },
});
