/*
 * The bundle budget gate, run the way CI runs it: as a process, judged by
 * its exit code and what it prints.
 *
 * A gate that has never been seen to fail is a guess. So the same script is
 * fed a build that fits and then budgets it cannot fit, and has to refuse by
 * exit code and name the file that is over - and it has to refuse, not pass,
 * when it cannot find what it is meant to measure.
 *
 * The fixture build (tests/unit/fixtures/bundle/build) is a few bytes per
 * file, under a /facewoof/ base path, with a lazy chunk on disk that the
 * document does not name.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "../..");
const script = path.join(root, "scripts/bundle-budget.ts");
// Not called dist/: .gitignore and .dockerignore both drop anything that is.
const dist = path.join(import.meta.dirname, "fixtures/bundle/build");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-budget-"));
afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

const gz = (file: string) =>
  zlib.gzipSync(fs.readFileSync(path.join(dist, file)), { level: 9 }).length;
const entryJs = gz("assets/index-fixture.js");
const entryCss = gz("assets/index-fixture.css");
const initialTotal =
  entryJs + entryCss + gz("assets/vendor-fixture.js") + gz("index.html");

let n = 0;
const budgetFile = (content: unknown) => {
  n += 1;
  const file = path.join(scratch, `budget-${n}.json`);
  fs.writeFileSync(
    file,
    typeof content === "string" ? content : JSON.stringify(content),
  );
  return file;
};

const run = (budget: string, distDir = dist) => {
  const result = spawnSync(
    process.execPath,
    [script, "--dist", distDir, "--budget", budget],
    { encoding: "utf8" },
  );
  return {
    status: result.status,
    out: result.stdout,
    err: result.stderr,
  };
};

describe("the bundle budget gate", () => {
  it("passes a build that exactly fits, counting only the first load", () => {
    const { status, out, err } = run(
      budgetFile({ budgets: { entryJs, entryCss, initialTotal } }),
    );
    expect(err).toBe("");
    expect(status).toBe(0);
    expect(out).toContain(`${entryJs}`);
    // The lazy chunk is on disk and not in the document: not counted.
    expect(out + err).not.toContain("Lazy-fixture");
  });

  it("fails an over-budget entry script, by exit code, naming the file", () => {
    const { status, err } = run(
      budgetFile({
        budgets: { entryJs: entryJs - 1, entryCss, initialTotal },
      }),
    );
    expect(status).toBe(1);
    expect(err).toMatch(/entryJs is 1 bytes over budget/);
    expect(err).toContain("assets/index-fixture.js");
    expect(err).not.toMatch(/entryCss is/);
  });

  it("fails an over-budget stylesheet, naming the file", () => {
    const { status, err } = run(
      budgetFile({
        budgets: { entryJs, entryCss: entryCss - 1, initialTotal },
      }),
    );
    expect(status).toBe(1);
    expect(err).toMatch(/entryCss is 1 bytes over budget/);
    expect(err).toContain("assets/index-fixture.css");
  });

  it("fails an over-budget first load, naming everything in it", () => {
    const { status, err } = run(
      budgetFile({
        budgets: { entryJs, entryCss, initialTotal: initialTotal - 1 },
      }),
    );
    expect(status).toBe(1);
    expect(err).toMatch(/initialTotal is 1 bytes over budget/);
    expect(err).toContain("assets/vendor-fixture.js");
    expect(err).toContain("index.html");
  });

  it("refuses, rather than passes, when a budget is missing or not a number", () => {
    for (const budgets of [
      { entryJs, entryCss },
      { entryJs, entryCss, initialTotal: "plenty" },
      { entryJs, entryCss, initialTotal: 0 },
    ]) {
      const { status, err } = run(budgetFile({ budgets }));
      expect(status).toBe(2);
      expect(err).toMatch(/budgets\.initialTotal must be a positive integer/);
    }
    expect(run(budgetFile("not json")).status).toBe(2);
    expect(run(path.join(scratch, "absent.json")).status).toBe(2);
  });

  it("refuses when the build is not there, or its document names a missing file", () => {
    const generous = budgetFile({
      budgets: { entryJs: 1e6, entryCss: 1e6, initialTotal: 1e6 },
    });

    const empty = path.join(scratch, "empty");
    fs.mkdirSync(empty);
    const none = run(generous, empty);
    expect(none.status).toBe(2);
    expect(none.err).toMatch(/no index\.html/);

    const broken = path.join(scratch, "broken");
    fs.cpSync(dist, broken, { recursive: true });
    fs.rmSync(path.join(broken, "assets/index-fixture.js"));
    const missing = run(generous, broken);
    expect(missing.status).toBe(2);
    expect(missing.err).toMatch(/index-fixture\.js, which is not in/);

    const scriptless = path.join(scratch, "scriptless");
    fs.cpSync(dist, scriptless, { recursive: true });
    fs.writeFileSync(path.join(scriptless, "index.html"), "<html></html>");
    const noEntry = run(generous, scriptless);
    expect(noEntry.status).toBe(2);
    expect(noEntry.err).toMatch(/expected one <script type="module">/);
  });

  it("the committed budget file is one the gate accepts", () => {
    // Against the fixture build, which is tiny: proves bundle-budget.json
    // parses and carries all three budgets, not that the real bundle fits -
    // that is scripts/check-bundle-budget.sh, against the production image.
    const { status, err } = run(path.join(root, "bundle-budget.json"));
    expect(err).toBe("");
    expect(status).toBe(0);
  });
});
