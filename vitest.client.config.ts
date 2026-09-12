/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/*
 * Component tests for the React client, in jsdom.
 *
 * Separate from vite.config.ts on purpose: that file's test block runs the
 * server's unit tests under Node and gates their coverage; the client renders
 * in a DOM, mocks fetch, and has thresholds of its own. Two configs, two
 * honest coverage numbers, rather than one global figure that averages a
 * well-covered server against a client with a handful of tests.
 */
export default defineConfig({
  // The same compiler setting as the build: the tests render what ships.
  plugins: [react({ compiler: true }), tailwindcss()],
  test: {
    environment: "jsdom",
    include: ["tests/client/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/client/setup.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      // What the client tests actually exercise. main.tsx is the browser
      // bootstrap (createRoot against a real document) and the browser suite
      // covers it end to end; api-types.d.ts is generated.
      include: ["src/**"],
      exclude: ["src/main.tsx", "src/api-types.d.ts", "src/**/*.css"],
      reporter: ["text", "json-summary"],
      // Measured 2026-09-12 with the first tests (40% statements, 35%
      // branches, 33% functions, 39% lines): the components with real logic
      // are covered, the presentational views mostly are not. The floor sits
      // just below that, where losing a tested component's tests fails the
      // build and adding an untested view does not — raise it as tests land.
      thresholds: {
        lines: 35,
        statements: 35,
        branches: 30,
        functions: 28,
      },
    },
  },
});
