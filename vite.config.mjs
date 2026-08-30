import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],

    // Set to '/facewoof/' to serve the app under a path rather than at the root
    // of its own host. Vite rewrites asset URLs to match, and the router picks
    // the same value up as its basename.
    base: env.VITE_BASE_PATH || "/",

    server: {
      host: true, // reachable from outside the container
      port: 5173,
      // The API runs as a separate process in development. Proxying keeps the
      // client on one origin, so nothing needs CORS and the relative URLs the
      // components use work unchanged in production.
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:3001",
          changeOrigin: true,
        },
      },
      watch: {
        // Bind mounts on macOS and Windows do not deliver inotify events into
        // the container, so the watcher has to poll.
        usePolling: true,
        interval: 300,
      },
    },

    build: {
      outDir: "dist",
      // Off on purpose: the repo is public, so maps add no transparency —
      // only weight in the image and the deploy.
      sourcemap: false,
    },
  };
});
