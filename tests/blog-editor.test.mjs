// Browser tests for the Markdown blog editor and the article reading view.
//
// Same approach as the post round-trip: a local relay, a real browser, real
// signing. Publishing an article does not touch Originless unless a cover is
// attached, so no upload server is needed here.
import {
  finalizeEvent,
  getEventHash,
  nip19,
  SimplePool,
  utils,
  verifyEvent,
} from "nostr-tools";
import { launchBrowser, openApp, relay, startDevServer, suite, waitFor } from "./harness.mjs";
import { slugify } from "../src/lib/slug.js";

const { test, run } = suite("blog editor");

let APP_URL = "";
const unique = (s) => `${s} ${Math.random().toString(36).slice(2, 7)}`;

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Creates an account and dismisses the one-time key backup. */
async function createAccount(page) {
  // The sign-in gate is titled differently per screen ("Join the discussion"
  // on the feed, "Sign in to publish" in the editor), so wait on the component
  // rather than its heading.
  await page.locator(".login").waitFor({ timeout: 25000 });
  await page.getByRole("button", { name: /create a new account/i }).click();
  await page.locator("code.secret").waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("button", { name: /i've saved it/i }).click();
  await waitFor("the sign-in prompt to close", () =>
    page.locator(".login").count().then((n) => n === 0),
  );
  return page.evaluate(() => localStorage.getItem("lantern.key.v1"));
}

/** POW-mines a template: the test relay enforces the same 16-bit floor. */
function minePow(template, target = 16) {
  const ev = { ...template, tags: [...template.tags] };
  for (let nonce = 1; nonce < 5000000; nonce++) {
    ev.tags = ev.tags.filter(([t]) => t !== "nonce");
    ev.tags.push(["nonce", String(nonce), String(target)]);
    let bits = 0;
    outer: for (const ch of getEventHash(ev)) {
      const n = parseInt(ch, 16);
      for (let i = 3; i >= 0; i--) {
        if ((n >> i) & 1) break outer;
        bits++;
      }
    }
    if (bits >= target) return ev;
  }
  throw new Error("pow gave up");
}

async function storedPubkey(page) {
  const { nip19, getPublicKey } = await import("nostr-tools");
  const nsec = await page.evaluate(() => localStorage.getItem("lantern.key.v1"));
  return getPublicKey(nip19.decode(nsec).data);
}

/** Publishes an arbitrary event to the relay, bypassing the app. */
async function publishDirect(ev) {
  const pool = new SimplePool();
  await Promise.all(pool.publish([relayA.url], ev));
  pool.close([relayA.url]);
}

const relayA = await relay({ name: "blog" });
const dev = await startDevServer();
const browser = await launchBrowser();
APP_URL = dev.url;

let exitCode = 0;
try {
// ---------------------------------------------------------------------------

await test("slugify makes url-safe slugs", async () => {
  eq(slugify("Hello World"), "hello-world", "spaces become dashes");
  eq(slugify("Café au lait"), "cafe-au-lait", "accents are folded");
  eq(slugify("  spaced  out  "), "spaced-out", "leading/trailing spaces go");
  eq(slugify("--edge--"), "edge", "edge dashes are trimmed");
  eq(slugify("!!!"), "", "punctuation only gives an empty slug");
  eq(slugify("a".repeat(200)).length, 64, "capped at 64 characters");
  ok(!slugify("a".repeat(60) + " tail").endsWith("-"), "the cap cannot leave a trailing dash");
  ok(/^[a-z0-9-]*$/.test(slugify("MiXeD Case_And-Dashes 123")), "only lowercase, digits and dashes survive");
});

await test("the writing screen is separate from the quick composer", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(APP_URL);
    await createAccount(page);

    // The old blog tab is gone from the composer.
    await page.getByRole("link", { name: "Create" }).click();
    const tabs = await page.locator(".seg button").allTextContents();
    ok(
      !tabs.some((t) => /blog/i.test(t)),
      `the composer has no blog tab (tabs: ${tabs.join(", ")})`,
    );

    // And there is a route that leads to the editor instead.
    await page.getByRole("link", { name: /open the editor/i }).click();
    await page.waitForURL(/write/);
    await page.getByPlaceholder("Title").waitFor({ timeout: 15000 });
    ok(true, "a link from the composer reaches /#/write");
  } finally {
    await context.close();
  }
});

await test("the editor shows a live Markdown preview", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    await page.getByPlaceholder("Title").waitFor({ timeout: 15000 });

    await page
      .locator(".mded textarea")
      .fill("# A heading\n\nSome **bold** text and a [link](https://example.com).\n\n- one\n- two");

    const view = page.locator(".mded .pane.view");
    await waitFor("the preview to render the heading", () =>
      view.locator("h1").first().textContent().catch(() => ""),
    ).then((h) => eq(h, "A heading", "the preview renders an h1"));
    ok((await view.locator("strong").count()) > 0, "bold renders");
    ok((await view.locator("li").count()) === 2, "both list items render");
    ok((await view.locator("a[href='https://example.com']").count()) === 1, "the link renders");
    ok((await page.locator(".stats").textContent()).includes("words"), "word count is shown");
  } finally {
    await context.close();
  }
});

await test("the preview does not execute injected script", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  // Set before any navigation, or the variable is wiped by the page load.
  await context.addInitScript(() => {
    window.__xss = false;
  });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    await page.getByPlaceholder("Title").waitFor({ timeout: 15000 });

    await page
      .locator(".mded textarea")
      .fill(
        '<script>window.__xss = true</script>\n\n<img src=x onerror="window.__xss=true">\n\n<a href="javascript:window.__xss=true">x</a>\n\n[a real link](https://example.com)',
      );

    await page.getByRole("tab", { name: "Preview" }).click();
    const view = page.locator(".mded .pane.view");
    await waitFor("the preview to settle", () => view.locator("p").count().then((n) => n > 0));

    eq(await page.evaluate(() => window.__xss), false, "nothing executed while previewing");
    eq(await view.locator("script").count(), 0, "no script element in the preview");
    eq(await view.locator("img").count(), 0, "remote images are dropped");
    eq(await view.locator("a[href^='javascript:']").count(), 0, "javascript: hrefs are dropped");
    // The hostile anchor is left with no href at all, so it is not focusable or
    // clickable; the legitimate one survives and is forced to open safely.
    const hostile = view.locator("a", { hasText: /^x$/ });
    eq(await hostile.first().getAttribute("href"), null, "the hostile link lost its href");
    const good = view.locator("a[href='https://example.com']");
    eq(await good.count(), 1, "the legitimate link survives");
    eq(await good.getAttribute("rel"), "noopener noreferrer", "links are forced to open safely");
  } finally {
    await context.close();
  }
});

await test("the default view follows the viewport width", async () => {
  // Narrow: two panes are unusable on a phone, and the Split button is hidden,
  // so the editor must not start in a mode the author cannot name.
  {
    const { context, page } = await openApp(browser, { relays: [relayA.url], width: 430 });
    try {
      await page.goto(`${APP_URL}/#/write`);
      await createAccount(page);
      await page.locator(".mded textarea").waitFor({ timeout: 15000 });
      const editor = page.locator(".mded textarea");
      const view = page.locator(".mded .pane.view");
      ok(await editor.isVisible(), "a phone opens with the editor");
      eq(await view.isVisible(), false, "and no side-by-side preview");
      eq(await page.getByRole("tab", { name: "Split" }).count(), 0, "Split is not offered at all");
    } finally {
      await context.close();
    }
  }
  // Wide: both panes side by side from the start.
  {
    const { context, page } = await openApp(browser, { relays: [relayA.url], width: 1100 });
    try {
      await page.goto(`${APP_URL}/#/write`);
      await createAccount(page);
      await page.locator(".mded textarea").waitFor({ timeout: 15000 });
      const editor = page.locator(".mded textarea");
      const view = page.locator(".mded .pane.view");
      ok(await editor.isVisible(), "a desktop opens with the editor");
      ok(await view.isVisible(), "and the preview beside it");
      eq(await page.getByRole("tab", { name: "Split" }).count(), 1, "Split is offered");
    } finally {
      await context.close();
    }
  }
});

await test("write, split and preview modes all switch", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url], width: 1100 });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    await page.getByPlaceholder("Title").waitFor({ timeout: 15000 });
    await page.locator(".mded textarea").fill("hello **world**");

    const editor = page.locator(".mded textarea");
    const view = page.locator(".mded .pane.view");

    ok(await editor.isVisible(), "the editor is visible by default");
    ok(await view.isVisible(), "the preview is visible by default (split)");

    await page.getByRole("tab", { name: "Write" }).click();
    ok(await editor.isVisible(), "Write shows the editor");
    eq(await view.isVisible(), false, "Write hides the preview");

    await page.getByRole("tab", { name: "Preview" }).click();
    eq(await editor.isVisible(), false, "Preview hides the editor");
    ok(await view.isVisible(), "Preview shows the rendered output");

    await page.getByRole("tab", { name: "Split" }).click();
    ok(await editor.isVisible() && (await view.isVisible()), "Split brings both back");
  } finally {
    await context.close();
  }
});

await test("the slug follows the title until it is edited", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    const title = page.getByPlaceholder("Title");
    const slug = page.getByPlaceholder("url-slug");
    await title.waitFor({ timeout: 15000 });

    await title.fill("My Great Article!");
    eq(await slug.inputValue(), "my-great-article", "the slug tracks the title");

    await title.fill("Another Title");
    eq(await slug.inputValue(), "another-title", "and keeps tracking while untouched");

    // Once the author edits the slug themselves, the title stops overwriting it.
    await slug.fill("Chosen Slug");
    eq(await slug.inputValue(), "chosen-slug", "an edited slug is normalised in place");
    await title.fill("A Totally Different Title");
    eq(await slug.inputValue(), "chosen-slug", "the slug survives later title edits");
  } finally {
    await context.close();
  }
});

await test("an article publishes as kind 30023 with the expected tags", async () => {
  const body = "# Heading\n\nBody **text**.\n\n- a\n- b";
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(APP_URL);
    const nsec = await createAccount(page);
    const pubkey = await storedPubkey(page);

    await page.goto(`${APP_URL}/#/write`);
    await page.getByPlaceholder("Title").fill(unique("An Article"));
    await page.getByPlaceholder(/One-line summary/).fill("A short summary.");
    await page.getByPlaceholder(/Hashtags/).fill("nostr markdown");
    await page.locator(".mded textarea").fill(body);

    await page.getByRole("button", { name: /^Publish$/ }).click();

    const ev = await waitFor("the article to reach the relay", () =>
      relayA.byKind(30023).find((e) => e.content.includes("Body **text**")),
    );
    ok(verifyEvent(ev), "the signature verifies");
    eq(ev.pubkey, pubkey, "signed by the signed-in key");
    const tag = (n) => ev.tags.find(([t]) => t === n)?.[1];
    eq(tag("title")?.startsWith("An Article"), true, "carries a title tag");
    eq(tag("d"), slugify(tag("title")), `the d tag is the slugified title (${tag("d")})`);
    eq(tag("summary"), "A short summary.", "carries the summary");
    ok(ev.tags.some(([t, v]) => t === "t" && v === "nostr"), "carries the hashtags");
    ok(ev.tags.some(([t, v]) => t === "t" && v === "markdown"), "carries every hashtag");
    ok(ev.tags.some(([t]) => t === "published_at"), "carries published_at");
    ok(ev.tags.some(([t, v]) => t === "client" && v === "lantern"), "carries the lantern client tag");
    ok(ev.id && ev.id.length === 64, "has an event id");
    eq(relayA.rejected.length, 0, "the relay rejected nothing");

    // Publishing navigates to the post page.
    await page.waitForURL(/post\//, { timeout: 20000 });
    ok(true, "the app moved to the published article");
  } finally {
    await context.close();
  }
});

// --- reading view --------------------------------------------------------

await test("a title repeated as an H1 is not shown twice", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(APP_URL);
    const nsec = await createAccount(page);
    const pubkey = await storedPubkey(page);

    // The shape almost every author writes: title tag plus a matching H1.
    const title = `Duplicate ${Math.random().toString(36).slice(2, 7)}`;
    const ev = finalizeEvent(
      minePow({
        kind: 30023,
        created_at: Math.floor(Date.now() / 1000),
        content: `# ${title}\n\nThe body starts here.\n\n## A section\n\nMore.`,
        tags: [
          ["d", "dup"],
          ["title", title],
          ["client", "lantern"],
          ["expiration", "9999999999"],
        ],
        pubkey,
      }),
      utils.hexToBytes(utils.bytesToHex(nip19.decode(nsec).data)),
    );
    await publishDirect(ev);

    const reader = await openApp(browser, { relays: [relayA.url], nsec });
    await reader.page.goto(`${APP_URL}/#/post/${ev.id}`);
    await reader.page.locator(".reader").waitFor({ timeout: 30000 });

    // The title renders once, from the title tag.
    eq(await reader.page.locator(".reader > header h1").textContent(), title, "title shown once");
    eq(
      await reader.page.locator(".reader .body h1").count(),
      0,
      "the duplicate H1 is dropped from the body",
    );
    eq(await reader.page.locator(".reader .body h2").count(), 1, "other headings survive");
    ok(
      (await reader.page.locator(".reader .body").textContent()).includes("The body starts here."),
      "the body is intact",
    );
    await reader.context.close();
  } finally {
    await context.close();
  }
});

await test("wrapped prose does not break mid-sentence", async () => {
  // CommonMark: a single newline is a soft wrap, not a <br>. Articles are typed
  // in a wrapped editor, so breaks:true would break every 80-column line.
  // Rendered in the browser, since renderMarkdown needs a DOM for DOMPurify.
  const { context, page } = await openApp(browser, { relays: [relayA.url], width: 1100 });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    await page.locator(".mded textarea").waitFor({ timeout: 15000 });

    const wrapped =
      "One sentence that was typed\nacross three wrapped lines\nin the editor.\n\nSecond paragraph.";
    await page.locator(".mded textarea").fill(wrapped);
    const view = page.locator(".mded .pane.view");
    await waitFor("the paragraphs to render", () => view.locator("p").count().then((n) => n === 2));

    eq(await view.locator("br").count(), 0, "no hard break inside a paragraph");
    eq(
      (await view.locator("p").first().textContent()).replace(/\s+/g, " ").trim(),
      "One sentence that was typed across three wrapped lines in the editor.",
      "the soft wrap collapses into one flowing paragraph",
    );

    // A deliberate hard break still works: two trailing spaces.
    await page.locator(".mded textarea").fill("line one  \nline two");
    await waitFor("the hard break to render", () => view.locator("br").count().then((n) => n === 1));
    ok(true, "two trailing spaces still force a line break");
  } finally {
    await context.close();
  }
});

await test("the reading view renders the article as Markdown", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(APP_URL);
    const nsec = await createAccount(page);
    const pubkey = await storedPubkey(page);

    const body = "# The Heading\n\nA paragraph with **bold**, `code` and a [link](https://example.com).\n\n> quoted\n\n| a | b |\n|---|---|\n| 1 | 2 |";
    await page.goto(`${APP_URL}/#/write`);
    await page.getByPlaceholder("Title").fill(unique("Readable"));
    await page.locator(".mded textarea").fill(body);
    await page.getByRole("button", { name: /^Publish$/ }).click();

    const ev = await waitFor("the article to reach the relay", () =>
      relayA.byKind(30023).find((e) => e.content === body),
    );

    // Open it as a separate reader, from a cold cache, so this is a real fetch.
    const reader = await openApp(browser, { relays: [relayA.url], nsec });
    await reader.page.goto(`${APP_URL}/#/post/${ev.id}`);
    const article = reader.page.locator(".reader");
    await article.waitFor({ timeout: 30000 });

    // The article's own <h1> is the title, so scope to the rendered body.
    eq(await article.locator(".body h1").first().textContent(), "The Heading", "h1 rendered");
    ok((await article.locator("strong").count()) > 0, "bold rendered");
    ok((await article.locator("code").count()) > 0, "inline code rendered");
    ok((await article.locator("blockquote").count()) > 0, "blockquote rendered");
    ok((await article.locator("table th").count()) === 2, "table headers rendered");
    const link = article.locator("a[href='https://example.com']");
    ok((await link.count()) === 1, "link rendered");
    eq(await link.getAttribute("rel"), "noopener noreferrer", "with a safe rel");
    ok((await article.locator(".k").textContent()).includes("min read"), "shows a reading time");

    // A card would have clamped this; the reader must not.
    ok((await article.locator("blockquote").first().isVisible()), "the full body is shown, not a teaser");

    eq(await storedPubkey(reader.page), pubkey, "same identity throughout");
    await reader.context.close();
  } finally {
    await context.close();
  }
});

await test("a malicious article is neutralised when read", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(APP_URL);
    const nsec = await createAccount(page);
    const { getPublicKey, nip19 } = await import("nostr-tools");
    const pubkey = getPublicKey(nip19.decode(nsec).data);
    const secret = utils.bytesToHex(nip19.decode(nsec).data);

    // Publish a hostile article straight to the relay, the way another client
    // (or an attacker) would. Mined for POW so the relay accepts it.
    const hostile = finalizeEvent(
      minePow({
        kind: 30023,
        created_at: Math.floor(Date.now() / 1000),
        content:
          'Hello\n\n<script>window.__xss = true</script>\n\n<img src=x onerror="window.__xss=true">\n\n<a href="javascript:window.__xss=true">click</a>',
        tags: [
          ["d", "hostile"],
          ["title", "Hostile article"],
          ["client", "lantern"],
          ["expiration", "9999999999"],
        ],
        pubkey,
      }),
      utils.hexToBytes(secret),
    );
    await publishDirect(hostile);
    await waitFor("the hostile article to be stored", () => relayA.all().some((e) => e.id === hostile.id));

    const reader = await openApp(browser, { relays: [relayA.url], nsec });
    // Set before navigation: page.evaluate runs after, and a navigation would
    // wipe the flag.
    await reader.context.addInitScript(() => {
      window.__xss = false;
    });
    await reader.page.goto(`${APP_URL}/#/post/${hostile.id}`);
    await reader.page.locator(".reader").waitFor({ timeout: 30000 });

    eq(await reader.page.evaluate(() => window.__xss), false, "nothing executed on the reading view");
    eq(await reader.page.locator(".reader script").count(), 0, "no script element");
    eq(await reader.page.locator(".reader img").count(), 0, "no img element");
    eq(await reader.page.locator(".reader a[href^='javascript:']").count(), 0, "no javascript: link");
    ok(
      (await reader.page.locator(".reader p").first().textContent()).includes("Hello"),
      "the harmless part still renders",
    );
    await reader.context.close();
  } finally {
    await context.close();
  }
});

await test("publishing is blocked until title and body are filled", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await createAccount(page);
    const post = page.getByRole("button", { name: /^Publish$/ });
    await post.waitFor({ timeout: 15000 });

    ok(await post.isDisabled(), "disabled with an empty form");
    await page.getByPlaceholder("Title").fill("Only a title");
    ok(await post.isDisabled(), "still disabled without a body");
    await page.locator(".mded textarea").fill("Now there is a body.");
    ok(await post.isEnabled(), "enabled once title and body exist");
  } finally {
    await context.close();
  }
});

await test("the writing screen is gated on sign-in", async () => {
  const { context, page } = await openApp(browser, { relays: [relayA.url] });
  try {
    await page.goto(`${APP_URL}/#/write`);
    await page.getByText("Sign in to publish").waitFor({ timeout: 25000 });
    eq(await page.locator(".card").count(), 0, "no editor is rendered while signed out");
    eq(await page.getByPlaceholder("Title").count(), 0, "no title field while signed out");
  } finally {
    await context.close();
  }
});

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} — expected ${e}, got ${a}`);
}

// ---------------------------------------------------------------------------

} catch (e) {
  console.error("\nharness error:", e);
  exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await relayA?.close().catch(() => {});
  await dev?.stop().catch(() => {});
}

const passed = await run();
process.exit(passed && !exitCode ? 0 : 1);
