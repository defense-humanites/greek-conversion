/**
 * Registers benches by group, as `Deno.bench` did until 1.0.0-rc.7, and runs
 * them with mitata: each group is summarized against its baseline.
 *
 * @module
 */
import { bench as measure, group, run, summary } from "mitata";

interface Entry {
  name: string;
  baseline: boolean;
  run: () => unknown;
}

const GROUPS = new Map<string, Entry[]>();

/**
 * Registers a bench in a group. Return the result of the measured call, so
 * that the engine cannot drop it as dead code.
 */
export function bench(
  name: string,
  options: { group: string; baseline?: boolean },
  run: () => unknown,
): void {
  const entries = GROUPS.get(options.group) ?? [];
  entries.push({ name, baseline: options.baseline ?? false, run });
  GROUPS.set(options.group, entries);
}

/**
 * Runs the registered benches whose name, or whose group's name, matches
 * `filter`.
 */
export async function runBenches(filter?: RegExp): Promise<void> {
  for (const [name, entries] of GROUPS) {
    const selected = entries.filter((entry) =>
      filter === undefined || filter.test(name) || filter.test(entry.name)
    );
    if (selected.length === 0) continue;
    group(name, () => {
      summary(() => {
        for (const entry of selected) {
          measure(entry.name, entry.run).baseline(entry.baseline);
        }
      });
    });
  }
  await run();
}
