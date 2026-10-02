// Shared browser-test harness: starts the Vite dev server, a local relay, and a
// Chromium instance pointed at them.
//
// The app is configured entirely through localStorage, so a test can seed a
// storage state before the first script runs and the app will talk only to the
// local relay. Nothing here touches the public network.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { startRelay } from "./relay.mjs";

const SETTINGS_KEY = "lantern.settings.v1";

/** Asks the OS for a free port, so a leftover server cannot block a run. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Waits for a port to serve HTTP. */
async function waitForPort(port, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const up = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) })
      .then(() => true)
      .catch(() => false);
    if (up) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`dev server on port ${port} did not come up within ${timeoutMs}ms`);
}

export async function startDevServer() {
  const port = await freePort();
  // Spawned detached so the whole process group can be killed: vite is a child
  // of its launcher, and signalling only the launcher leaks a listening socket.
  const proc = spawn(
    process.execPath,
    [resolve("node_modules/vite/bin/vite.js"), "--port", String(port), "--host", "127.0.0.1", "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
      detached: true,
    },
  );
  let log = "";
  proc.stdout.on("data", (d) => (log += d.toString()));
  proc.stderr.on("data", (d) => (log += d.toString()));

  const killGroup = (signal) => {
    try {
      process.kill(-proc.pid, signal);
    } catch {
      try {
        proc.kill(signal);
      } catch {}
    }
  };

  try {
    await waitForPort(port);
  } catch (e) {
    killGroup("SIGKILL");
    throw new Error(e.message + "\nvite output:\n" + log);
  }
  return {
    url: `http://127.0.0.1:${port}`,
    pid: proc.pid,
    get log() {
      return log;
    },
    async stop() {
      killGroup("SIGTERM");
      await new Promise((r) => setTimeout(r, 400));
      killGroup("SIGKILL");
      // Wait for the port to actually be released, so the next run is clean.
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const stillUp = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) })
          .then(() => true)
          .catch(() => false);
        if (!stillUp) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error(`dev server on port ${port} did not shut down`);
    },
  };
}

export async function launchBrowser() {
  return chromium.launch({
    // The bundled browser download is not present in this environment; the
    // system Chrome speaks the same protocol.
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

/**
 * Opens the app signed in with `nsec`, talking only to `relays`.
 *
 * Signing in by pasting a key is the path a real user without an extension
 * takes, so the tests exercise the account-creation/unlock flow for real
 * instead of reaching into the store.
 */
export async function openApp(browser, { relays, nsec, seed = {}, width = 430, height = 900 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: "light",
  });

  // Seed before any app script runs: settings.json is read at module load.
  const state = {
    [SETTINGS_KEY]: JSON.stringify({
      originless: ["https://originless.test"],
      relaysEnabled: {},
      relaysExtra: relays,
    }),
    ...(nsec ? { "lantern.key.v1": nsec } : {}),
    ...seed,
  };
  await context.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, state);

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  return { context, page, errors };
}

/** Boots a relay for one test. */
export const relay = startRelay;

/** Waits until `fn()` returns truthy, or throws with a useful message. */
export async function waitFor(label, fn, { timeout = 20000, interval = 150 } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const v = await fn();
      if (v) return v;
      last = v;
    } catch (e) {
      last = e.message;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`timed out waiting for ${label} (last value: ${JSON.stringify(last)})`);
}

/**
 * Minimal test runner: runs tests in registration order, prints results and a
 * summary, and reports whether everything passed.
 */
export function suite(name) {
  const results = [];
  const only = process.env.ONLY;

  async function test(title, fn) {
    if (only && !title.includes(only)) return;
    const started = Date.now();
    try {
      await fn();
      results.push({ title, ok: true, ms: Date.now() - started });
      console.log(`  ok  ${title} (${Date.now() - started}ms)`);
    } catch (e) {
      results.push({ title, ok: false, ms: Date.now() - started, error: e });
      console.log(`FAIL  ${title}`);
      console.log(`      ${(e.stack || e.message).split("\n").slice(0, 6).join("\n      ")}`);
    }
  }

  async function run() {
    const failed = results.filter((r) => !r.ok);
    console.log(
      failed.length
        ? `\n${name}: ${failed.length}/${results.length} failed`
        : `\n${name}: ${results.length}/${results.length} passed`,
    );
    return failed.length === 0;
  }

  return { test, run };
}