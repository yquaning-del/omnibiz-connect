import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to all interfaces so IDE "preview"/port-forwarding works reliably.
    host: true,
    port: 8080,
    // If 8080 is occupied, fail loudly instead of silently switching ports
    // (otherwise the preview may point at the wrong port).
    strictPort: true,
  },
  preview: {
    // Same rationale as server.host above.
    host: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
