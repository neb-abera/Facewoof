/*
 * Load .env before anything reads process.env.
 *
 * Its own module, imported first by index.ts, on purpose. ES module imports
 * are hoisted and evaluated in order, so a dotenv.config() call written in
 * index.ts would run only after every imported module — session.ts reading
 * SESSION_SECRET, oidc.ts reading ENTRA_* — had already looked at an
 * environment the file had not been loaded into yet. Importing this module
 * ahead of them is what puts the file first.
 *
 * Production has no .env file; every value arrives from the container app's
 * environment and this is a no-op.
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
  path: path.join(import.meta.dirname, "../.env"),
  quiet: true,
});
