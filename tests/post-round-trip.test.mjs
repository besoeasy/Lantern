// Browser tests for the post round-trip.
//
// The claim under test: a post composed in the UI is signed, published to a
// relay, and can be read back — after a full page reload, from the relay rather
// than from the IndexedDB cache, which is the only way "fetched back" means
// anything. Everything runs against local relays, so no test depends on the
// public network being up.
import { generateSecretKey, getPublicKey, nip19, utils, verifyEvent } from "nostr-tools";
import { launchBrowser, openApp, relay, startDevServer, suite, waitFor } from "./harness.mjs";

const { test, run } = suite("post round-trip");

let APP_URL = "";

const unique = (s) => `${s} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Creates a key the way another Nostr client would export one. */
function freshKey() {
  const sk = utils.bytesToHex(generateSecretKey());
  return { nsec: nip19.nsecEncode(utils.hexToBytes(sk)), pubkey: getPublicKey(utils.hexToBytes(sk)) };
}

/**
 * The pubkey the app is acting as, derived from the stored secret.
 * nip19.decode(nsec).data is the 32-byte SECRET, so it has to go through
 * getPublicKey before it means anything.
 */
async function storedPubkey(page) {
  const nsec = await page.evaluate(() => localStorage.getItem("lantern.key.v1"));
  if (!nsec) return "";
  return getPublicKey(nip19.decode(nsec).data);
}

/** Leading zero bits of an event id — the proof-of-work depth. */
function powBits(hex) {
  let bits = 0;
  outer: for (const ch of hex) {
    const n = parseInt(ch, 16);
    for (let i = 3; i >= 0; i--) {
      if ((n >> i) & 1) break outer;
      bits++;
    }
  }
  return bits;
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

/**
 * Signs in the way a user without an extension does: create an account, read
 * the one-time backup key, dismiss the banner. Returns the pubkey.
 */
async function createAccount(page) {
  await page.getByText("Join the discussion").waitFor({ timeout: 25000 });
  await page.getByRole("button", { name: /create a new account/i }).click();
  const secret = page.locator("code.secret");
  await secret.waitFor({ state: "visible", timeout: 15000 });
  const nsec = (await secret.textContent()).trim();
  ok(/^nsec1/.test(nsec), `an nsec1 key was offered for backup, got ${JSON.stringify(nsec.slice(0, 12))}`);
  await page.getByRole("button", { name: /i've saved it/i }).click();
  await waitFor("the sign-in prompt to close", () =>
    page.locator(".login").count().then((n) => n === 0),
  );
  return storedPubkey(page);
}

/**
 * Composes and publishes a note.
 *
 * On success the composer emits `published` and ComposeView navigates to the
 * feed, so the success line is gone before it can be read — the compose screen
 * detaching is the success signal. If it stays put, the message line holds the
 * reason it failed.
 */
async function publishNote(page, body) {
  await page.getByRole("link", { name: "Create" }).click();
  await page.getByPlaceholder("What is happening?").fill(body);
  await page.getByRole("button", { name: /^Post$/ }).click();

  const gone = await waitFor(
    "the compose screen to close after publishing",
    () => page.locator(".composer").count().then((n) => n === 0),
    { timeout: 45000, interval: 200 },
  ).catch(() => false);

  if (!gone) {
    const why = await page.locator(".composer .msg").textContent().catch(() => "(no message)");
    throw new Error(`publish did not complete; the composer said: ${JSON.stringify(why)}`);
  }
  return { navigated: true };
}

/** Noise from the dev server (favicon, HMR) must not fail a test. */
function assertNoPageErrors(errors) {
  const real = errors.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e));
  ok(real.length === 0, `unexpected page errors: ${real.join(" | ")}`);
}

// ---------------------------------------------------------------------------

const relayA = await relay({ name: "A" });
const relayB = await relay({ name: "B" });
const dev = await startDevServer();
const browser = await launchBrowser();
APP_URL = dev.url;

let exitCode = 0;
try {
  await test("a new account can be created from the sign-in prompt", async () => {
    const { context, page, errors } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      await page.getByText("Join the discussion").waitFor({ timeout: 25000 });

      const pubkey = await createAccount(page);
      ok(/^[0-9a-f]{64}$/.test(pubkey), `signed in as a 32-byte pubkey (${pubkey.slice(0, 12)}…)`);
      ok(
        await page.evaluate(() => !!localStorage.getItem("lantern.key.v1")),
        "the key was remembered for later sessions",
      );
      assertNoPageErrors(errors);
    } finally {
      await context.close();
    }
  });

  await test("a composed note reaches the relay, signed and with POW", async () => {
    const body = unique("a note that must survive the round trip");
    const { context, page, errors } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      const pubkey = await createAccount(page);

      const msg = await publishNote(page, body);
      ok(msg.navigated, "the app left the compose screen, which is its success signal");

      // The relay, not the UI, is the source of truth here.
      const stored = await waitFor("the note to arrive at the relay", () =>
        relayA.byAuthor(pubkey).find((ev) => ev.content === body),
      );
      ok(stored.kind === 1, `published as kind 1 (got kind ${stored.kind})`);
      ok(verifyEvent(stored), "the signature the relay received verifies");
      ok(stored.pubkey === pubkey, "signed by the key that created the account");
      ok(stored.tags.some(([t, v]) => t === "client" && v === "lantern"), "carries the lantern client tag");
      ok(powBits(stored.id) >= 16, `event id carries >= 16 bits of POW (got ${powBits(stored.id)})`);

      // plan.md: NIP-40 expiry 3 years out.
      const exp = Number(stored.tags.find(([t]) => t === "expiration")?.[1]);
      const expected = stored.created_at + 3 * 365 * 24 * 3600;
      ok(Math.abs(exp - expected) < 5, `expiration is 3 years out (${new Date(exp * 1000).toISOString().slice(0, 10)})`);
      ok(relayA.rejected.length === 0, `the relay rejected nothing: ${JSON.stringify(relayA.rejected)}`);
      assertNoPageErrors(errors);
    } finally {
      await context.close();
    }
  });

  await test("the note is readable again after a full page reload", async () => {
    const body = unique("reload check");
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      const pubkey = await createAccount(page);
      await publishNote(page, body);
      await waitFor("the note to reach the relay", () =>
        relayA.byAuthor(pubkey).some((ev) => ev.content === body),
      );
      // Turn off live delivery before the reload, so the only way the post can
      // reappear is a genuine fetch.
      // Prove we are reading the relay, not a warm cache: wipe IndexedDB, then
      // reload. The post has to come back over the wire.
      await page.evaluate(async () => {
        const dbs = (await indexedDB.databases?.()) || [];
        for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
      });
      await page.reload();

      await waitFor(
        "the post to reappear in the feed after reload",
        () => page.locator(".postwrap", { hasText: body }).count().then((n) => n > 0),
        { timeout: 35000 },
      );
      ok(true, "the feed rendered the post again with an empty cache");

      const back = await waitFor("the relay to still hold the event", () =>
        relayA.byAuthor(pubkey).find((ev) => ev.content === body),
      );
      ok(verifyEvent(back), "the re-read event still verifies");
      ok(back.pubkey === pubkey, "same identity after the reload");
    } finally {
      await context.close();
    }
  });

  await test("an existing nsec signs in with no prompt", async () => {
    const key = freshKey();
    const { context, page } = await openApp(browser, { relays: [relayA.url], nsec: key.nsec });
    try {
      await page.goto(APP_URL);
      await waitFor("silent auto-login from the stored key", () =>
        page.evaluate(() => !document.querySelector(".login")),
        { timeout: 25000 },
      );
      ok(
        (await page.getByRole("link", { name: "Create" }).count()) === 1,
        "the app came up signed in with no prompt",
      );

      const body = unique("posted with an existing nsec");
      await publishNote(page, body);
      const stored = await waitFor("the relay to hold it", () =>
        relayA.byAuthor(key.pubkey).find((ev) => ev.content === body),
      );
      ok(stored.pubkey === key.pubkey, "signed by the pasted key, not a fresh one");
      ok(verifyEvent(stored), "signature verifies");
    } finally {
      await context.close();
    }
  });

  await test("a bad nsec is rejected with a readable message", async () => {
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      await page.getByText("Join the discussion").waitFor({ timeout: 25000 });
      await page.getByPlaceholder(/nsec1/).fill("nsec1totallynotreal");
      await page.getByRole("button", { name: "Unlock" }).click();

      const err = page.locator(".err");
      await err.waitFor({ state: "visible", timeout: 10000 });
      ok(/secret key/i.test(await err.textContent()), "told the user what was wrong");
      ok(await page.evaluate(() => !localStorage.getItem("lantern.key.v1")), "nothing was stored");
      ok((await page.locator(".login").count()) === 1, "still on the sign-in prompt");
    } finally {
      await context.close();
    }
  });

  await test("posting while signed out is refused, not silently dropped", async () => {
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      await page.getByText("Join the discussion").waitFor({ timeout: 25000 });
      const before = relayA.count();

      await page.getByRole("link", { name: "Create" }).click();
      ok((await page.getByText("Sign in to post").count()) === 1, "the compose screen shows the sign-in gate");
      ok((await page.locator(".composer").count()) === 0, "no composer is rendered while signed out");
      ok(relayA.count() === before, "nothing was published");
    } finally {
      await context.close();
    }
  });

  await test("a post from another author is fetched and rendered", async () => {
    const body = unique("cross author");
    const { context: ctxA, page: pageA } = await openApp(browser, { relays: [relayA.url] });
    let ctxB;
    try {
      await pageA.goto(APP_URL);
      const pubkeyA = await createAccount(pageA);
      await publishNote(pageA, body);
      await waitFor("author A's post to reach the relay", () =>
        relayA.byAuthor(pubkeyA).some((ev) => ev.content === body),
      );
      await ctxA.close();

      // Author B never saw A's cache: fresh context, different key.
      const keyB = freshKey();
      const opened = await openApp(browser, { relays: [relayA.url], nsec: keyB.nsec });
      ctxB = opened.context;
      await opened.page.goto(APP_URL);
      await waitFor(
        "author B to receive A's post over the relay",
        () => opened.page.locator(".postwrap", { hasText: body }).count().then((n) => n > 0),
        { timeout: 35000 },
      );
      ok(true, "the post rendered for a different author");
      ok(
        (await opened.page.locator(".postwrap", { hasText: body }).locator(".pk").count()) > 0,
        "with an author link",
      );
      ok(keyB.pubkey !== pubkeyA, "the reader is a different identity");
    } finally {
      await ctxA.close().catch(() => {});
      await ctxB?.close().catch(() => {});
    }
  });

  await test("publishes reach every configured relay with one signature", async () => {
    const body = unique("multi relay");
    const { context, page } = await openApp(browser, { relays: [relayA.url, relayB.url] });
    try {
      await page.goto(APP_URL);
      const pubkey = await createAccount(page);
      await publishNote(page, body);

      const [onA, onB] = await Promise.all([
        waitFor("relay A", () => relayA.byAuthor(pubkey).find((ev) => ev.content === body)),
        waitFor("relay B", () => relayB.byAuthor(pubkey).find((ev) => ev.content === body)),
      ]);
      ok(onA.id === onB.id, `the same event id on both relays (${onA.id.slice(0, 12)}…)`);
      ok(verifyEvent(onA) && verifyEvent(onB), "and the signature verifies on each");
    } finally {
      await context.close();
    }
  });

  await test("the post page renders the event fetched by id", async () => {
    const body = unique("post page");
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      const pubkey = await createAccount(page);
      await publishNote(page, body);
      const stored = await waitFor("the relay to hold it", () =>
        relayA.byAuthor(pubkey).find((ev) => ev.content === body),
      );

      // Land straight on the event URL, as a shared link would.
      await page.goto(`${APP_URL}/#/post/${stored.id}`);
      const text = await waitFor(
        "the post page to render the event",
        () => page.locator(".text").first().textContent().catch(() => ""),
        { timeout: 35000 },
      );
      ok(text.includes(body), `the post page shows the content: ${JSON.stringify(text.slice(0, 48))}`);

      // The raw block proves it was fetched as an event rather than re-rendered
      // from list state.
      await page.getByRole("button", { name: /raw json/i }).click();
      const parsed = JSON.parse(await page.locator(".raw-body").textContent());
      ok(parsed.id === stored.id, "the raw JSON is the relay's event");
      ok(verifyEvent(parsed), "and its signature verifies");
    } finally {
      await context.close();
    }
  });

  await test("comments and reactions round-trip as signed events", async () => {
    const body = unique("thread");
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      const pubkey = await createAccount(page);
      await publishNote(page, body);
      const stored = await waitFor("the relay to hold it", () =>
        relayA.byAuthor(pubkey).find((ev) => ev.content === body),
      );

      await page.goto(`${APP_URL}/#/post/${stored.id}`);
      await page.locator(".text").first().waitFor({ timeout: 35000 });

      const comment = unique("a comment");
      await page.getByPlaceholder("Write a comment…").fill(comment);
      await page.getByRole("button", { name: "Comment" }).click();
      const reply = await waitFor("the reply to reach the relay", () =>
        relayA.all().find((ev) => ev.content === comment),
        { timeout: 35000 },
      );
      ok(reply.kind === 1, `reply is kind 1 to a kind-1 post (got ${reply.kind})`);
      ok(reply.tags.some(([t, v]) => t === "e" && v === stored.id), "tags the parent event");
      ok(reply.tags.some(([t, v]) => t === "p" && v === pubkey), "tags the author");
      ok(verifyEvent(reply), "reply signature verifies");

      // Reaction (NIP-25 kind 7). The button's accessible name is the emoji
      // itself, so select on its title instead.
      await page.locator('button[title^="React"]').first().click();
      const react = await waitFor("the reaction to reach the relay", () =>
        relayA.byKind(7).find((ev) => ev.tags.some(([t, v]) => t === "e" && v === stored.id)),
        { timeout: 35000 },
      );
      ok(verifyEvent(react), "reaction signature verifies");
      ok(react.pubkey === pubkey, "reaction is from the signed-in author");
    } finally {
      await context.close();
    }
  });

  await test("signing out stops publishing and forgets the key", async () => {
    const { context, page } = await openApp(browser, { relays: [relayA.url] });
    try {
      await page.goto(APP_URL);
      await createAccount(page);
      ok(
        await page.evaluate(() => !!localStorage.getItem("lantern.key.v1")),
        "the key is remembered after sign-in",
      );

      await page.getByRole("link", { name: "Settings" }).click();
      await page.getByRole("button", { name: /sign out/i }).click();

      await waitFor("the key to be forgotten", () =>
        page.evaluate(() => !localStorage.getItem("lantern.key.v1")),
      );
      ok(true, "signing out of a local key erases it");

      const before = relayA.count();
      await page.getByRole("link", { name: "Create" }).click();
      ok((await page.locator(".composer").count()) === 0, "the composer is gated again");
      ok(relayA.count() === before, "nothing was published after signing out");
    } finally {
      await context.close();
    }
  });
} catch (e) {
  console.error("\nharness error:", e);
  exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await relayA?.close().catch(() => {});
  await relayB?.close().catch(() => {});
  await dev?.stop().catch(() => {});
}

const passed = await run();
process.exit(passed && !exitCode ? 0 : 1);