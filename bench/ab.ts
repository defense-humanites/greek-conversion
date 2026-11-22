/**
 * Compares versions of the library on one conversion, measured in turn in
 * one process, so that the noise of the machine falls on all of them alike:
 * about ±2 %, where separate runs of `npm run bench` vary by ±5 %. Each
 * version is the working tree (`.`), a directory holding a `src/`, or a git
 * ref, checked out for the run in a temporary worktree.
 *
 *   npm run bench:ab -- [options] <version> <version>...
 *
 *   --mode long|short|word|detailed|parse   the measured call (long)
 *   --from greek --to transliteration       the formats
 *   --preset <id>                           a preset, or the defaults
 *   --text <file>                           a Greek text instead of Thucydides
 *   --rounds <n>                            rounds of measures
 *   --aa                                    measure a copy of the first
 *                                           version too, as a control
 *
 * For instance, `npm run bench:ab -- --aa v1.0.0-rc.12 .` compares the
 * working tree with rc.12, Greek into transliteration, on Thucydides 1.1–10.
 * The first version is the reference of the percentages; the A/A copy shows
 * the noise of the run. The worktrees are removed at the end, after an error,
 * and after a Ctrl-C, which stops the run at the end of a round.
 *
 * @module
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { THUCYDIDES_1_1_10 } from "./thucydides.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: "string", default: "long" },
    from: { type: "string", default: "greek" },
    to: { type: "string", default: "transliteration" },
    preset: { type: "string" },
    text: { type: "string" },
    rounds: { type: "string" },
    aa: { type: "boolean", default: false },
  },
});
const MODES = ["long", "short", "word", "detailed", "parse"];
if (positionals.length === 0 || !MODES.includes(values.mode)) {
  console.error(
    "Usage: npm run bench:ab -- [--mode long|short|word|detailed|parse] [--from f] [--to f] [--preset id] [--text file] [--rounds n] [--aa] <version>...",
  );
  process.exit(2);
}

const ROOT = resolve(import.meta.dirname, "..");
const work = mkdtempSync(join(tmpdir(), "greek-conversion-ab-"));
const worktrees: string[] = [];

let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
});
/** Lets a Ctrl-C through between measures. */
const pause = () => new Promise((resolve) => setImmediate(resolve));

/** The directory that holds the `src/` of a version. */
function checkout(version: string): string {
  const directory = resolve(version);
  if (existsSync(join(directory, "src", "mod.ts"))) return directory;
  const target = join(work, `${worktrees.length}`);
  execFileSync("git", ["worktree", "add", "--detach", target, version], {
    cwd: ROOT,
    stdio: "ignore",
  });
  worktrees.push(target);
  return target;
}

interface Version {
  name: string;
  directory: string;
}

const versions: Version[] = [];
try {
  for (const name of positionals) {
    versions.push({ name, directory: checkout(name) });
  }
  if (values.aa) {
    // A copy of the sources, so that its modules are loaded anew.
    const copy = join(work, "aa");
    cpSync(join(versions[0].directory, "src"), join(copy, "src"), {
      recursive: true,
    });
    versions.push({ name: `${versions[0].name} (A/A)`, directory: copy });
  }

  const libraries = await Promise.all(versions.map(async ({ directory }) => ({
    main: await import(pathToFileURL(join(directory, "src", "mod.ts")).href),
    document: await import(
      pathToFileURL(join(directory, "src", "document.ts")).href
    ),
  })));

  const mode = values.mode;
  const greek = values.text === undefined
    ? THUCYDIDES_1_1_10
    : readFileSync(values.text, "utf8");
  const base = mode === "short"
    ? greek.slice(0, greek.indexOf(",") + 1)
    : mode === "word"
    ? "ἄνθρωπος"
    : greek;
  const { from, to } = values;
  const text = from === "greek"
    ? base
    : libraries[0].main.convert(base, "greek", from);
  const options = values.preset === undefined ? {} : { preset: values.preset };

  const runs = libraries.map(({ main, document }) =>
    mode === "parse"
      ? () => document.parse(text, from).length
      : mode === "detailed"
      ? () => main.convertDetailed(text, from, to, options).output.length
      : () => main.convert(text, from, to, options).length
  );
  const long = mode === "long" || mode === "detailed" || mode === "parse" ||
    values.text !== undefined;
  const batch = long ? 2 : mode === "short" ? 200 : 1000;
  const rounds = Number(values.rounds ?? (long ? 200 : 300));

  let sink = 0;
  for (const run of runs) {
    for (let i = 0; i < batch * 20; i++) sink += run();
    await pause();
  }
  const times: number[][] = runs.map(() => []);
  for (let round = 0; round < rounds && !interrupted; round++) {
    for (let k = 0; k < runs.length; k++) {
      // Each round starts with another version, so that none is always first.
      const index = (k + round) % runs.length;
      const start = process.hrtime.bigint();
      for (let i = 0; i < batch; i++) sink += runs[index]();
      times[index].push(Number(process.hrtime.bigint() - start) / batch);
    }
    await pause();
  }
  if (interrupted) {
    console.error("Interrupted.");
  } else {
    const median = (list: number[]) => {
      const sorted = [...list].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const per = times.map((list) => median(list) / 1000);
    const width = Math.max(...versions.map(({ name }) => name.length));
    // Reading the sum keeps the engine from dropping the calls as dead code.
    if (Number.isNaN(sink)) throw new Error("The calls returned no length.");
    console.log(
      `${from} → ${to}, ${mode}, ${
        values.preset ?? "defaults"
      }: median of ${rounds} rounds`,
    );
    for (const [index, { name }] of versions.entries()) {
      const change = (per[index] / per[0] - 1) * 100;
      console.log(
        `  ${name.padEnd(width)}  ${per[index].toFixed(2).padStart(9)} µs${
          index === 0
            ? ""
            : `  ${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} %`
        }`,
      );
    }
  }
} finally {
  for (const worktree of worktrees) {
    execFileSync("git", ["worktree", "remove", "--force", worktree], {
      cwd: ROOT,
      stdio: "ignore",
    });
  }
  rmSync(work, { recursive: true, force: true });
  if (interrupted) process.exitCode = 130;
}
