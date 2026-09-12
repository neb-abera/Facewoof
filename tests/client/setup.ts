import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// findBy*/waitFor default to one second, which the first test in a worker
// can exceed while the modules it imports are still being transformed under
// a busy machine (a CI runner, or a smoke suite in the next terminal). Ten
// seconds is still inside the per-test timeout, so a genuinely missing
// element fails soon enough.
configure({ asyncUtilTimeout: 10_000 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Node 26 predefines an experimental global localStorage (undefined unless
// node gets --localstorage-file), and the jsdom test environment defers to
// that existing global — so window.localStorage is silently undefined in
// tests. The context guards storage access with try/catch and degrades
// without a word; tests that assert on what got stored would fail
// confusingly. Every test gets a fresh in-memory Storage instead, on both
// the bare global and window.
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
}

beforeEach(() => {
  const storage = memoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: storage,
      configurable: true,
    });
  }
});
