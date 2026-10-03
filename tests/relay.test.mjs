// Confirms the test relay speaks NIP-01 well enough for nostr-tools' SimplePool,
// before any browser is involved.
import { SimplePool, finalizeEvent, getEventHash, generateSecretKey, getPublicKey, utils, nip19 } from "nostr-tools";
import { startRelay } from "./relay.mjs";

const fails = [];
const ok = (c, m) => {
  if (c) console.log("  ok  " + m);
  else {
    console.log("FAIL  " + m);
    fails.push(m);
  }
};

const sk = utils.bytesToHex(generateSecretKey());
const pk = getPublicKey(utils.hexToBytes(sk));

function mine(template, target) {
  const ev = { ...template, tags: [...template.tags] };
  for (let nonce = 1; nonce < 5000000; nonce++) {
    ev.tags = ev.tags.filter(([t]) => t !== "nonce");
    ev.tags.push(["nonce", String(nonce), String(target)]);
    const id = getEventHash(ev);
    let bits = 0;
    outer: for (const ch of id) {
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

const relay = await startRelay({ name: "smoke" });
console.log("\nrelay up at " + relay.url);

const pool = new SimplePool();

// In this nostr-tools version the OK frame resolves or rejects the publish
// promise rather than being emitted, so assert on the promise itself.
console.log("\npublish");
const signed = finalizeEvent(
  mine(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      content: "hello from the smoke test",
      tags: [["client", "lantern"], ["expiration", "9999999999"]],
      pubkey: pk,
    },
    16,
  ),
  utils.hexToBytes(sk),
);
// publish() returns an array of per-relay promises.
let accepted = false;
let acceptReason = "";
try {
  acceptReason = String((await Promise.all(pool.publish([relay.url], signed)))[0]);
  accepted = true;
} catch (e) {
  acceptReason = e.message;
}
await new Promise((r) => setTimeout(r, 200));

ok(accepted, `publish resolved, meaning the relay sent OK=true (${acceptReason})`);
ok(relay.count() === 1, `relay stored the event (count=${relay.count()})`);
ok(relay.all()[0]?.id === signed.id, "stored id matches what we published");
ok(relay.all()[0]?.content === "hello from the smoke test", "content round-tripped");
ok(relay.rejected.length === 0, `nothing rejected (${JSON.stringify(relay.rejected)})`);

console.log("\nreject a tampered event");
const tampered = { ...signed, content: "tampered" };
const tamperedAccepted = await Promise.all(pool.publish([relay.url], tampered)).then(
  () => true,
  () => false,
);
await new Promise((r) => setTimeout(r, 200));
ok(!tamperedAccepted, "publish rejected for a tampered event");
ok(relay.rejected.some((r) => r.reason === "bad-signature"), "relay logged a bad-signature rejection");
ok(relay.count() === 1, "tampered event was not stored");

console.log("\nreject low POW");
const noPow = finalizeEvent(
  {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    content: "no proof of work here",
    tags: [],
    pubkey: pk,
  },
  utils.hexToBytes(sk),
);
const noPowAccepted = await Promise.all(pool.publish([relay.url], noPow)).then(
  () => true,
  () => false,
);
await new Promise((r) => setTimeout(r, 200));
ok(!noPowAccepted, "publish rejected for an event under 16 bits of POW");
ok(relay.rejected.some((r) => r.reason === "low-pow"), "relay logged a low-pow rejection");

console.log("\nquery it back");
const got = await pool.get([relay.url], { ids: [signed.id] });
ok(got?.id === signed.id, "REQ by ids returned the event");
ok(got?.content === signed.content, "content survived the round trip");

const byKind = await pool.get([relay.url], { kinds: [1], authors: [pk], limit: 10 });
ok(byKind?.id === signed.id, "REQ by kinds+authors returned it");

const byTag = await pool.get([relay.url], { kinds: [1], "#client": ["lantern"], limit: 10 });
ok(byTag?.id === signed.id, "REQ by #client tag filter returned it");

const otherTag = await pool.get([relay.url], { kinds: [1], "#client": ["someotherclient"], limit: 10 });
ok(otherTag === undefined || otherTag === null, "REQ with a non-matching tag returns nothing");

console.log("\nlive subscription receives a later event without re-querying");
const live = [];
const sub = pool.subscribeMany([relay.url], [{ kinds: [1], "#client": ["lantern"], limit: 10 }], {
  onevent: (ev) => live.push(ev),
});
await new Promise((r) => setTimeout(r, 200));
ok(live.length === 1, `EOSE delivered the stored event over the subscription (${live.length})`);

const second = finalizeEvent(
  mine(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000) + 1,
      content: "second post",
      tags: [["client", "lantern"], ["expiration", "9999999999"]],
      pubkey: pk,
    },
    16,
  ),
  utils.hexToBytes(sk),
);
await pool.publish([relay.url], second);
await new Promise((r) => setTimeout(r, 300));
ok(live.length === 2, `the new event arrived on the open subscription (${live.length})`);
ok(live[1]?.content === "second post", "and it is the right one");
sub.close();

console.log("\nidempotency");
await pool.publish([relay.url], signed);
await new Promise((r) => setTimeout(r, 200));
ok(relay.count() === 2, `re-publishing does not duplicate (count=${relay.count()})`);

pool.close([relay.url]);
await relay.close();
console.log(fails.length ? "\nFAILED: " + fails.length : "\nall checks passed");
process.exit(fails.length ? 1 : 0);