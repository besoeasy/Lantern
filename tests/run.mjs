// Runs every test file in sequence and reports one combined result.
//
// Each file starts its own relays, dev server and browser, so they must not run
// concurrently — a shared port or a leaked process would make failures depend on
// ordering. Run a single file directly instead: `node tests/<file>.mjs`.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
  .filter((f) => f.endsWith(".test.mjs"))
  .sort();

if (process.argv[2]) {
  files.length = 0;
  files.push(process.argv[2]);
}

function run(file) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [join(here, file)], {
      stdio: "inherit",
      env: process.env,
    });
    proc.on("exit", (code) => resolve({ file, ok: code === 0 }));
  });
}

const results = [];
for (const file of files) {
  console.log(`\n=== ${file}`);
  results.push(await run(file));
}

const failed = results.filter((r) => !r.ok);
console.log("\n" + "-".repeat(52));
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.file}`);
console.log(
  failed.length
    ? `\n${failed.length}/${results.length} files failed`
    : `\n${results.length}/${results.length} files passed`,
);
process.exit(failed.length ? 1 : 0);