import { SimplePool, getEventHash } from "nostr-tools";
import { CLIENT_TAG, POW_TARGET, FEED_KINDS, CONTENT_TTL_SECONDS, activeRelays, ensureRelays } from "./relays.js";
import { tagVal, articleAddr } from "./event.js";
import { cacheEvent } from "./db.js";
import { db } from "./db.js";
import { getSigner } from "./signer.js";

export const pool = new SimplePool();

function countLeadingZeroBits(hexId) {
  let bits = 0;
  for (const ch of hexId) {
    const n = parseInt(ch, 16);
    if (Number.isNaN(n)) return bits;
    for (let i = 3; i >= 0; i--) {
      if ((n >> i) & 1) return bits;
      bits++;
    }
  }
  return bits;
}

function minePow(template, target) {
  const ev = { ...template, tags: [...template.tags] };
  let nonce = 0;
  for (;;) {
    nonce++;
    ev.tags = ev.tags.filter(([t]) => t !== "nonce");
    ev.tags.push(["nonce", String(nonce), String(target)]);
    const id = getEventHash(ev);
    if (countLeadingZeroBits(id) >= target) {
      ev.id = id;
      return ev;
    }
    if (nonce > 500000) throw new Error("POW mining gave up (500k iters)");
  }
}

// minimal event-hash without pulling nip07 internals (nostr-tools getEventHash)

export async function signEvent(template) {
  const created_at = template.created_at || Math.floor(Date.now() / 1000);
  const signer = getSigner();
  if (!signer) throw new Error("Missing pubkey: login first.");
  const base = {
    kind: template.kind,
    created_at,
    content: template.content ?? "",
    tags: [
      // Replace any caller-supplied client/expiration/lantern tags so every
      // Lantern post carries one canonical id and a fixed 3-year expiry (NIP-40).
      ...(template.tags || []).filter(
        ([t, v]) => t !== "client" && t !== "expiration" && !(t === "t" && v === CLIENT_TAG),
      ),
      ["client", CLIENT_TAG],
      // `t` is indexed by every relay; `client` is not, so the feed cannot
      // rely on `#client` as a relay prefilter. This makes scoping work.
      ["t", CLIENT_TAG],
      ["expiration", String(created_at + CONTENT_TTL_SECONDS)],
    ],
    // The signer is the source of truth for who signs, so a stale pubkey on
    // the template cannot produce an event the signer will not own.
    pubkey: signer.pubkey,
  };
  // POW first (unsigned), then the signer signs. Never send precomputed id/sig:
  // most extensions reject events that already carry id/sig.
  const mined = POW_TARGET > 0 ? minePow(base, POW_TARGET) : base;
  delete mined.id;
  delete mined.sig;
  return signer.sign(mined);
}

export async function publishEvent(signed) {
  const targets = (await ensureRelays()) ?? activeRelays();
  const pubs = pool.publish(targets, signed);
  await Promise.allSettled(pubs);
  await cacheEvent(signed);
  return signed;
}

export function subscribeFeed(kinds, onEvent, limit = 100) {
  const filter = { kinds, limit, "#t": [CLIENT_TAG] };
  return pool.subscribeMany(activeRelays(), [filter], {
    onevent: (ev) => {
      if (!isLanternEvent(ev)) return;
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}

export async function refreshRelays() {
  await ensureRelays();
  return activeRelays();
}

// Lantern-scoped tag timeline: relay prefilter plus local guards, same as the feed.
export function subscribeTag(tag, onEvent, limit = 100) {
  const filter = { kinds: FEED_KINDS, limit, "#t": [CLIENT_TAG] };
  return pool.subscribeMany(activeRelays(), [filter], {
    onevent: (ev) => {
      if (!isLanternEvent(ev)) return;
      if (!(ev.tags || []).some(([t, v]) => t === "t" && v === tag)) return;
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}

export function imetaList(ev) {
  return (ev.tags || [])
    .filter(([t]) => t === "imeta")
    .map((parts) => {
      const o = {};
      for (const p of parts.slice(1)) {
        const i = p.indexOf(" ");
        if (i > 0) {
          const k = p.slice(0, i);
          const v = p.slice(i + 1);
          if (k === "fallback") (o[k] ||= []).push(v);
          else o[k] = v;
        }
      }
      return o;
    });
}

// Tag readers live in event.js so db.js can share them without an import cycle.
export { tagVal, expiryOf } from "./event.js";

// Hashtag (`t`) showcase for under-post pills. Deduped, capped at `limit`.
// The `music` genre marker on 36787 tracks is structural (Amethyst convention),
// not a user hashtag, so it is excluded there.
export function displayHashtags(ev, limit = 4) {
  const skip = ev.kind === 36787 ? new Set(["music"]) : new Set();
  skip.add(CLIENT_TAG);
  const all = [
    ...new Set(
      (ev.tags || [])
        .filter(([t, v]) => t === "t" && v && !skip.has(v))
        .map(([, v]) => v),
    ),
  ];
  return { shown: all.slice(0, limit), extra: Math.max(0, all.length - limit) };
}

// seconds -> "3:05" for track durations
export function formatDuration(s) {
  s = Number(s);
  if (!Number.isFinite(s) || s < 0) return "";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function isLanternEvent(ev) {
  return (ev.tags || []).some(([t, v]) => t === "client" && v === CLIENT_TAG);
}

export async function getEventById(id) {
  try {
    const cached = await db.events.get(id);
    if (cached && cached.content !== undefined)
      return {
        id: cached.id,
        pubkey: cached.pubkey,
        kind: cached.kind,
        created_at: cached.created_at,
        content: cached.content,
        tags: cached.tags,
        sig: cached.sig,
      };
  } catch {}
  const targets = (await ensureRelays()) ?? activeRelays();
  const ev = await pool.get(targets, { ids: [id] });
  if (ev) await cacheEvent(ev);
  return ev;
}

export function subscribeComments(rootEv, onEvent) {
  // Separate filters = OR semantics. Split upper/lower tag variants because
  // combining them in one filter means AND (event must carry both).
  const filters = [];
  if (rootEv.kind === 1) {
    filters.push({ kinds: [1], "#e": [rootEv.id], limit: 100 });
    filters.push({ kinds: [1111], "#E": [rootEv.id], limit: 100 });
    filters.push({ kinds: [1111], "#e": [rootEv.id], limit: 100 });
  } else if (rootEv.kind === 30023) {
    const addr = articleAddr(rootEv);
    filters.push({ kinds: [1111], "#A": [addr], limit: 100 });
    filters.push({ kinds: [1111], "#a": [addr], limit: 100 });
    filters.push({ kinds: [1111], "#E": [rootEv.id], limit: 100 });
    filters.push({ kinds: [1111], "#e": [rootEv.id], limit: 100 });
  } else {
    // kind 1063 / 20 / 21 / 22 replies use E-tag per NIP-22 (some clients lowercase)
    filters.push({ kinds: [1111], "#E": [rootEv.id], limit: 100 });
    filters.push({ kinds: [1111], "#e": [rootEv.id], limit: 100 });
  }
  return pool.subscribeMany(activeRelays(), filters, {
    onevent: (ev) => {
      // Relays routinely ignore tag filters — verify locally so a post
      // never renders the whole network's replies.
      if (!isCommentOn(ev, rootEv)) return;
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}

function hasTagValue(ev, names, value) {
  return (ev.tags || []).some(([t, v]) => names.includes(t) && v === value);
}

export function isCommentOn(ev, rootEv) {
  if (!ev || !rootEv?.id) return false;
  if (rootEv.kind === 1) {
    return (
      (ev.kind === 1 && hasTagValue(ev, ["e"], rootEv.id)) ||
      (ev.kind === 1111 && hasTagValue(ev, ["E", "e"], rootEv.id))
    );
  }
  if (rootEv.kind === 30023) {
    const addr = articleAddr(rootEv);
    return (
      ev.kind === 1111 &&
      (hasTagValue(ev, ["A", "a"], addr) || hasTagValue(ev, ["E", "e"], rootEv.id))
    );
  }
  return ev.kind === 1111 && hasTagValue(ev, ["E", "e"], rootEv.id);
}

export async function postComment(rootEv, text, pubkey) {
  let template;
  if (rootEv.kind === 1) {
    template = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      content: text,
      tags: [
        ["e", rootEv.id, "", "reply"],
        ["p", rootEv.pubkey],
      ],
      pubkey,
    };
  } else {
    const addr = articleAddr(rootEv);
    template = {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content: text,
      tags: addr
        ? [
            ["A", addr, ""],
            ["K", String(rootEv.kind)],
            ["P", rootEv.pubkey],
            ["a", addr, ""],
            ["k", String(rootEv.kind)],
            ["p", rootEv.pubkey],
          ]
        : [
            ["E", rootEv.id, "", rootEv.pubkey],
            ["K", String(rootEv.kind)],
            ["P", rootEv.pubkey],
            ["e", rootEv.id, "", rootEv.pubkey],
            ["k", String(rootEv.kind)],
            ["p", rootEv.pubkey],
          ],
      pubkey,
    };
  }
  const signed = await signEvent(template);
  return publishEvent(signed);
}

// NIP-25 emoji reactions (kind 7). Content is the emoji itself; the event is
// linked via `e` (+`p`), with an `a` address tag for 30023 articles.
export function isReactionOn(ev, rootEv) {
  if (!ev || ev.kind !== 7 || !rootEv?.id) return false;
  if ((ev.tags || []).some(([t, v]) => t === "e" && v === rootEv.id)) return true;
  if (rootEv.kind === 30023) {
    const addr = articleAddr(rootEv);
    return (ev.tags || []).some(([t, v]) => t === "a" && v === addr);
  }
  return false;
}

export function subscribeReactions(rootEv, onEvent, limit = 200) {
  const filters = [{ kinds: [7], "#e": [rootEv.id], limit }];
  if (rootEv.kind === 30023) {
    const addr = articleAddr(rootEv);
    filters.push({ kinds: [7], "#a": [addr], limit });
  }
  return pool.subscribeMany(activeRelays(), filters, {
    onevent: (ev) => {
      if (!isReactionOn(ev, rootEv)) return;
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}

export async function postReaction(rootEv, emoji, pubkey) {
  const tags = [
    ["e", rootEv.id],
    ["p", rootEv.pubkey],
  ];
  if (rootEv.kind === 30023) tags.push(["a", articleAddr(rootEv)]);
  const signed = await signEvent({
    kind: 7,
    created_at: Math.floor(Date.now() / 1000),
    content: emoji,
    tags,
    pubkey,
  });
  return publishEvent(signed);
}

// Kind 0 metadata for a pubkey (latest replaceable event wins on relays).
export async function getAuthorProfile(pubkey) {
  const targets = (await ensureRelays()) ?? activeRelays();
  const ev = await pool.get(targets, { kinds: [0], authors: [pubkey] });
  if (!ev) return {};
  try {
    return JSON.parse(ev.content || "{}");
  } catch {
    return {};
  }
}

// Lantern-scoped author timeline.
export function subscribeAuthorPosts(pubkey, onEvent, kinds = FEED_KINDS, limit = 50) {
  const filter = { kinds, authors: [pubkey], limit, "#t": [CLIENT_TAG] };
  return pool.subscribeMany(activeRelays(), [filter], {
    onevent: (ev) => {
      if (ev.pubkey !== pubkey) return;
      if (!isLanternEvent(ev)) return;
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}
