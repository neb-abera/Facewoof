/*
 * What the server does about the schema before listening. By default it
 * migrates; with MIGRATE_ON_BOOT=false it must not attempt any DDL (the
 * runtime role has no right to) and must refuse to start on a schema that
 * is behind the code. The pool is a stand-in that records every statement.
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

const { prepareSchema } = await import("../../server/db/migrate.ts");

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
  it("migrates by default, as it always has", async () => {
    applied = onDisk.slice(0, -1);
    await prepareSchema({});
    expect(statements).toContain("CREATE TABLE IF");
    expect(statements).toContain("INSERT INTO schema_migrations");
  });

  it("runs no DDL and takes no lock when MIGRATE_ON_BOOT=false", async () => {
    await prepareSchema({ MIGRATE_ON_BOOT: "false" });
    expect(statements).toEqual(["SELECT name FROM"]);
  });

  it("refuses to start on a schema that is behind, naming what is missing", async () => {
    applied = onDisk.slice(0, -1);
    await expect(prepareSchema({ MIGRATE_ON_BOOT: "false" })).rejects.toThrow(
      new RegExp(`missing ${onDisk.at(-1)}`),
    );
    expect(statements).toEqual(["SELECT name FROM"]);
  });

  it("treats anything but the literal false as the default", async () => {
    applied = onDisk.slice(0, -1);
    await prepareSchema({ MIGRATE_ON_BOOT: "0" });
    expect(statements).toContain("INSERT INTO schema_migrations");
  });
});
