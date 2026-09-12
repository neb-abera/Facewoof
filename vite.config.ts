/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    /*
     * The React Compiler memoises components and hooks automatically, so
     * the hand-written useCallback/useMemo are no longer load-bearing and a
     * missed dependency cannot leave a stale closure behind. Native (oxc)
     * rather than the Babel route: one transform, no Babel in the build.
     * A component the compiler cannot prove safe is left as written — today
     * that is the handlers built on try/finally (signInAsGuest, the playdate
     * form, the location prompt), which the compiler does not yet lower.
     * REACT_COMPILER_DIAGNOSTICS=true on a build prints which and why.
     */
    plugins: [
      react({
        compiler: {
          logDiagnostics: process.env.REACT_COMPILER_DIAGNOSTICS === "true",
        },
      }),
      tailwindcss(),
    ],

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

    test: {
      coverage: {
        provider: "v8",
        // Coverage counts the modules the unit tests actually load — the
        // decision-heavy server modules — not the React client, which the
        // browser tests cover from the outside. Thresholds sit below the
        // measured numbers (97% lines / 89% branches / 70% funcs when set)
        // so they catch a real coverage collapse without failing the build
        // over one new branch.
        thresholds: {
          lines: 90,
          statements: 85,
          branches: 80,
          functions: 60,
        },
      },
    },
  };
});
