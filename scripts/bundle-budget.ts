/*
 * bundle-budget.ts — fail if the production bundle outgrew its budget.
 *
 *   node scripts/bundle-budget.ts --dist <build output> --budget <json>
 *
 * Reads the built index.html the way a browser does, and measures what a
 * first visit has to download before the app can start:
 *
 *   entryJs       the <script type="module"> the document names
 *   entryCss      every <link rel="stylesheet"> the document names
 *   initialTotal  those, the <link rel="modulepreload"> chunks, and the
 *                 document itself
 *
 * Lazy route chunks (the calendar, the profile page) are not in it: they are
 * not part of the first load, and tests/e2e/delivery.spec.ts already pins
 * that the landing page does not fetch them.
 *
 * Sizes are gzip -9 bytes, from node:zlib. Bytes, not milliseconds: the same
 * build measures the same on a laptop and on a shared runner, so the gate
 * cannot flake. gzip rather than brotli because it is the floor - what every
 * client gets at worst - and zlib's output for given input is stable.
 *
 * Exit 0 within budget, 1 over budget (naming each offending file), 2 when
 * the build or the budget file cannot be read as expected - a gate that
 * cannot find its entry point must not pass.
 *
 * Budgets live in bundle-budget.json; CONTRIBUTING.md says how to raise one.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import zlib from "node:zlib";

const METRICS = ["entryJs", "entryCss", "initialTotal"] as const;
type Metric = (typeof METRICS)[number];

class Unusable extends Error {}

const gzipSize = (file: string): number =>
  zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;

/* The values of `attr` on every `tag` whose attributes match `where`. */
function references(
  html: string,
  tag: string,
  where: RegExp,
  attr: string,
): string[] {
  const found: string[] = [];
  for (const [element] of html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))) {
    if (!where.test(element)) continue;
    const value = new RegExp(`\\b${attr}="([^"]+)"`, "i").exec(element)?.[1];
    if (value) found.push(value);
  }
  return found;
}

function measure(dist: string) {
  const document = path.join(dist, "index.html");
  if (!fs.existsSync(document)) {
    throw new Unusable(`no index.html in ${dist}: is this a build output?`);
  }
  // Comments can mention tags; the browser ignores them and so does this.
  // Repeated until nothing changes, so removing one comment cannot splice
  // the text around it into another.
  let html = fs.readFileSync(document, "utf8");
  for (let before = ""; before !== html; ) {
    before = html;
    html = html.replace(/<!--[\s\S]*?-->/g, "");
  }

  // A URL in the document is under the app's base path ("/" or
  // "/facewoof/"); on disk the same file is under dist/assets.
  const onDisk = (url: string) => {
    const at = url.indexOf("assets/");
    const file = path.join(dist, at === -1 ? url : url.slice(at));
    if (!fs.existsSync(file)) {
      throw new Unusable(`index.html names ${url}, which is not in ${dist}`);
    }
    return file;
  };

  const scripts = references(html, "script", /type="module"/i, "src");
  const styles = references(html, "link", /rel="stylesheet"/i, "href");
  const preloads = references(html, "link", /rel="modulepreload"/i, "href");
  if (scripts.length !== 1) {
    throw new Unusable(
      `expected one <script type="module"> in index.html, found ${scripts.length}`,
    );
  }
  if (styles.length === 0) {
    throw new Unusable("index.html names no stylesheet");
  }

  const sized = (urls: string[]) =>
    urls.map((url) => {
      const file = onDisk(url);
      return { file: path.relative(dist, file), bytes: gzipSize(file) };
    });

  const entryJs = sized(scripts);
  const entryCss = sized(styles);
  const rest = [
    ...sized(preloads),
    { file: "index.html", bytes: gzipSize(document) },
  ];
  return {
    entryJs,
    entryCss,
    initialTotal: [...entryJs, ...entryCss, ...rest],
  } satisfies Record<Metric, { file: string; bytes: number }[]>;
}

function readBudgets(file: string): Record<Metric, number> {
  let parsed: { budgets?: Record<string, unknown> };
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Unusable(`cannot read ${file}: ${(err as Error).message}`);
  }
  const budgets = {} as Record<Metric, number>;
  for (const metric of METRICS) {
    const value = parsed.budgets?.[metric];
    // A missing budget is not "no limit".
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
      throw new Unusable(
        `${file}: budgets.${metric} must be a positive integer of bytes`,
      );
    }
    budgets[metric] = value;
  }
  return budgets;
}

function main(): number {
  const { values } = parseArgs({
    options: { dist: { type: "string" }, budget: { type: "string" } },
  });
  if (!values.dist || !values.budget) {
    throw new Unusable("usage: bundle-budget.ts --dist <dir> --budget <json>");
  }

  const budgets = readBudgets(values.budget);
  const measured = measure(values.dist);
  const total = (metric: Metric) =>
    measured[metric].reduce((sum, { bytes }) => sum + bytes, 0);
  const files = (metric: Metric) =>
    measured[metric].map(({ file, bytes }) => `${file} (${bytes})`).join(", ");

  console.log("gzip -9 bytes, against bundle-budget.json:");
  let over = 0;
  for (const metric of METRICS) {
    const bytes = total(metric);
    const budget = budgets[metric];
    const percent = ((bytes / budget) * 100).toFixed(1);
    const ok = bytes <= budget;
    if (!ok) over += 1;
    console.log(
      `  ${ok ? "ok  " : "OVER"} ${metric.padEnd(12)} ${String(bytes).padStart(8)} / ${String(budget).padStart(8)}  ${percent}%`,
    );
    if (!ok) {
      console.error(
        `error: ${metric} is ${bytes - budget} bytes over budget: ${files(metric)}`,
      );
    }
  }
  if (over) {
    console.error(
      "error: the bundle outgrew its budget. Find what grew before raising it; CONTRIBUTING.md says how to raise one deliberately.",
    );
    return 1;
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  if (!(err instanceof Unusable)) throw err;
  console.error(`error: ${err.message}`);
  process.exitCode = 2;
}
