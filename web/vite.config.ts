import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// /api goes to FastAPI in dev; in the demo FastAPI serves web/dist (one process).
// envDir: the one .env lives at the repo root (VITE_* keys too).
const apiPort = process.env.UAK_PORT ?? "8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: "..",
  server: { proxy: { "/api": `http://127.0.0.1:${apiPort}` } },
});
