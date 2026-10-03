// Renders every screen in light and dark so the UI can be looked at, rather
// than guessed at. Seeds a local relay with one post of each interesting kind,
// then screenshots each screen.
//
//   npm run shots              # -> ./screenshots
//   node tests/screenshots.mjs /tmp/out
//
// Not part of `npm test`: it asserts nothing, it just renders. It exists because
// a layout or contrast problem is far cheaper to find by looking at a picture
// than by reading the CSS.
import { writeFileSync, mkdirSync } from "node:fs";
import { finalizeEvent, getEventHash, utils } from "nostr-tools";
import { launchBrowser, openApp, relay, startDevServer, waitFor } from "./tests/harness.mjs";

const OUT = process.argv[2] || "./screenshots";
mkdirSync(OUT, { recursive: true });

const relayA = await relay({ name: "shots" });
const dev = await startDevServer();
const browser = await launchBrowser();
const APP = dev.url;

// --- seed one key with a representative set of posts -------------------
const sk = utils.bytesToHex(new Uint8Array(32).fill(7));
const secretBytes = utils.hexToBytes(sk);
const { getPublicKey } = await import("nostr-tools");
const pk = getPublicKey(secretBytes);

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

const now = Math.floor(Date.now() / 1000);
const base = (extra) => [
  ["client", "lantern"],
  ["expiration", String(now + 3 * 365 * 24 * 3600)],
  ["published_at", String(now)],
  ...extra,
];

// A couple of inline gradient images, so the photo/gallery cards have real
// pixels without reaching the network.
const svg = (a, b, label) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="400" y="310" font-family="sans-serif" font-size="42" fill="rgba(255,255,255,.92)" text-anchor="middle">${label}</text></svg>`,
  );

const POSTS = [
  {
    kind: 1,
    content:
      "Spent the morning reading about proof-of-work on Nostr and finally understanding why it exists at all. Short version: it makes spam expensive to produce, and it costs a real user almost nothing.\n\nWorth writing up properly at some point.",
    tags: base([]),
  },
  {
    kind: 20,
    content: "Golden hour on the coast path. The light did all the work.",
    tags: base([
      ["title", "Coast path"],
      ["m", "image/svg+xml"],
      ["imeta", `url ${svg("#f09433", "#bc1888", "Photo")}`, "m image/svg+xml", "dim 800x600"],
    ]),
  },
  {
    kind: 22,
    content: "Forty seconds of the tide coming in.",
    tags: base([
      ["title", "Tide"],
      ["imeta", `url ${svg("#0f766e", "#1e3a8a", "Reel")}`, "m video/mp4"],
    ]),
  },
  {
    kind: 30023,
    content: `# Why proof of work still matters

Nostr has no central server deciding what gets through, so it needs some other
way to make junk expensive. Proof of work is that lever: a spammer pays
electricity per event, while you pay it once.

## The economics

Mining sixteen bits takes about 65,536 hashes on average. That is nothing on a modern
phone — you would never notice it — but multiply it by a million events and it
becomes a real bill for whoever is automating the posting.

## What it does not solve

It is not moderation. It raises the cost of spam, and it does nothing at all
about a well-funded attacker who decides the electricity is worth it.

> The goal was never to make spam impossible, only to make it not free.

\`\`\`js
const bits = countLeadingZeroBits(getEventHash(event));
if (bits < 16) throw new Error("not enough work");
\`\`\`

A table, because the editor supports them:

| Scheme | Cost per event | Verifiable |
| --- | --- | --- |
| Hashcash | CPU | Yes |
| PoS | Capital | No |

That is the whole argument, as far as I can tell.`,
    tags: base([
      ["d", "why-pow-matters"],
      ["title", "Why proof of work still matters"],
      ["summary", "Nostr needs some way to make junk expensive, and proof of work is that lever."],
      ["t", "nostr"],
      ["t", "writing"],
    ]),
  },
];

const signed = POSTS.map((p) =>
  finalizeEvent(minePow({ kind: p.kind, created_at: now, content: p.content, tags: p.tags, pubkey: pk }), secretBytes),
);

const { SimplePool } = await import("nostr-tools");
const pool = new SimplePool();
// Sequential: publishing four events at once to one socket trips the pool's
// per-relay connection handling in this version.
for (const ev of signed) {
  try {
    await Promise.all(pool.publish([relayA.url], ev));
  } catch (e) {
    console.log("publish failed for kind", ev.kind, e.message);
  }
}
pool.close([relayA.url]);
console.log("relay rejected:", JSON.stringify(relayA.rejected));
await waitFor("seed events", () => relayA.count() >= POSTS.length);
console.log("seeded", relayA.count(), "events as", pk.slice(0, 12));

// --- capture ------------------------------------------------------------
const nsec = (await import("nostr-tools")).nip19.nsecEncode(secretBytes);

const SCREENS = [
  ["home", "/", ".postwrap"],
  ["compose", "/#/compose", ".composer"],
  ["write", "/#/write", ".mded"],
  ["article", `/#/post/${signed[3].id}`, ".reader"],
  ["article-full", `/#/post/${signed[3].id}`, ".reader"],
  ["post", `/#/post/${signed[0].id}`, ".postwrap"],
  ["profile", "/#/profile", ".card"],
  ["settings", "/#/settings", ".card"],
];

for (const scheme of ["light", "dark"]) {
  for (const [name, path, ready] of SCREENS) {
    const ctx = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 2,
      colorScheme: scheme,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(
      ([key, settings]) => {
        localStorage.setItem("lantern.key.v1", key);
        localStorage.setItem("lantern.settings.v1", settings);
      },
      [
        nsec,
        JSON.stringify({
          originless: ["https://o.test"],
          relaysEnabled: {},
          relaysExtra: [relayA.url],
        }),
      ],
    );
    const page = await ctx.newPage();
    await page.goto(APP + path);
    // Silent auto-login probes for an extension for up to 3s before falling back
    // to the stored key, so wait for the screen's own content, not a timer.
    await page
      .locator(ready)
      .first()
      .waitFor({ state: "visible", timeout: 25000 })
      .catch(() => console.log(`  (${name} never showed ${ready})`));
    await page.waitForTimeout(700);
    const file = `${OUT}/${scheme}-${name}.png`;
    if (name === "article-full") {
      // The whole article, to check the code block and table below the fold.
      await page.setViewportSize({ width: 430, height: 2600 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${scheme}-article-full.png` });
      console.log("wrote", `${OUT}/${scheme}-article-full.png`);
    } else {
      await page.screenshot({ path: file });
      console.log("wrote", file);
    }
    await ctx.close();
  }
}

await browser.close();
await relayA.close();
await dev.stop();
console.log("done");