/*
 * What the server does about the schema before listening. It migrates in
 * development only. Everywhere else it must not attempt any DDL (the runtime
 * role has no right to) and must refuse to start on a schema that is behind
 * the code. MIGRATE_ON_BOOT=true or false overrides the default. The pool is
 * a stand-in that records every statement.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const statements: string[] = [];
let applied: string[] = [];

const query = vi.fn(async (sql: string) => {
  statements.push(sql.trim().split(/\s+/).slice(0, 3).join(" "));
  if (sql.includes("SELECT name FROM schema_migrations")) {
    return { rows: applied.map((name) => ({ name })) };
  }
  return { rows: [] };
});

vi.mock("../../server/db/database.ts", () => ({
  pool: {
    query,
    connect: vi.fn(async () => ({ query, release: vi.fn() })),
  },
}));

const { listPending, prepareSchema } = await import(
  "../../server/db/migrate.ts"
);

const onDisk = fs
  .readdirSync(path.join(import.meta.dirname, "../../server/db/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();

beforeEach(() => {
  statements.length = 0;
  applied = [...onDisk];
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("preparing the schema at boot", () => {
  it("migrates in development", async () => {
    applied = onDisk.slice(0, -1);
    await prepareSchema({ NODE_ENV: "development" });
    expect(statements).toContain("CREATE TABLE IF");
    expect(statements).toContain("INSERT INTO schema_migrations");
  });

  it.each([
    ["production", { NODE_ENV: "production" }],
    ["no NODE_ENV", {}],
    ["test", { NODE_ENV: "test" }],
  ])("runs no DDL and takes no lock by default in %s", async (_, env) => {
    await prepareSchema(env);
    expect(statements).toEqual(["SELECT name FROM"]);
  });

  it("runs no DDL with MIGRATE_ON_BOOT=false, even in development", async () => {
    await prepareSchema({ NODE_ENV: "development", MIGRATE_ON_BOOT: "false" });
    expect(statements).toEqual(["SELECT name FROM"]);
  });

  it("migrates in production only when MIGRATE_ON_BOOT=true, the rollback lever", async () => {
    applied = onDisk.slice(0, -1);
    await prepareSchema({ NODE_ENV: "production", MIGRATE_ON_BOOT: "true" });
    expect(statements).toContain("INSERT INTO schema_migrations");
  });

  it("refuses to start on a schema that is behind, naming what is missing", async () => {
    applied = onDisk.slice(0, -1);
    await expect(prepareSchema({ NODE_ENV: "production" })).rejects.toThrow(
      new RegExp(`missing ${onDisk.at(-1)}`),
    );
    expect(statements).toEqual(["SELECT name FROM"]);
  });

  it.each(["0", "yes", "FALSE"])(
    "refuses MIGRATE_ON_BOOT=%s rather than guessing",
    async (value) => {
      await expect(
        prepareSchema({ NODE_ENV: "production", MIGRATE_ON_BOOT: value }),
      ).rejects.toThrow(/MIGRATE_ON_BOOT must be true or false/);
      expect(statements).toEqual([]);
    },
  );
});

describe("migrate list", () => {
  it("names what is pending and writes nothing", async () => {
    applied = onDisk.slice(0, -2);
    await listPending();
    expect(statements).toEqual(["SELECT name FROM"]);
    expect(console.log).toHaveBeenCalledWith(
      `pending: ${onDisk.slice(-2).join(", ")}`,
    );
  });

  it("says none when the ledger is complete", async () => {
    await listPending();
    expect(statements).toEqual(["SELECT name FROM"]);
    expect(console.log).toHaveBeenCalledWith("pending: none");
  });
});
