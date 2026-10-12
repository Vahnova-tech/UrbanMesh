import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

const API_DOWN =
  "Can't reach the UrbanMesh API on port 3001. In apps/api run npm run dev.";

function apiProxy(): ProxyOptions {
  return {
    target: "http://127.0.0.1:3001",
    changeOrigin: true,
    configure(proxy) {
      proxy.on("error", (_err, _req: IncomingMessage, res) => {
        const outgoing = res as ServerResponse;
        if (outgoing && !outgoing.headersSent) {
          outgoing.writeHead(503, { "Content-Type": "application/json" });
          outgoing.end(JSON.stringify({ error: API_DOWN }));
        }
      });
    },
  };
}

const proxy = {
  "/api": apiProxy(),
  "/uploads": apiProxy(),
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy,
  },
  preview: {
    port: 5174,
    proxy,
  },
});
