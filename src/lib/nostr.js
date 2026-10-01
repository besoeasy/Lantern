import { SimplePool, getEventHash, nip19 } from "nostr-tools";
import { DEFAULT_RELAYS, CLIENT_TAG, POW_TARGET, activeRelays, ensureRelays } from "./relays.js";
import { cacheEvent } from "./db.js";
import { db } from "./db.js";

export const pool = new SimplePool();

export function hasNip07() {
  return typeof window !== "undefined" && !!window.nostr;
}

export function diagnoseNip07() {
  const w = typeof window !== "undefined" ? window : {};
  const n = w.nostr || null;
  return {
    found: !!n,
    hasGetPublicKey: !!n?.getPublicKey,
    hasSignEvent: !!n?.signEvent,
    hasEnable: !!n?.enable,
    keys: n ? Object.keys(n) : [],
  };
}

export function waitForNip07(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (hasNip07()) return resolve(true);
    const start = Date.now();
    const t = setInterval(() => {
      if (hasNip07()) {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        resolve(false);
      }
    }, 100);
  });
}

export async function nip07Pubkey() {
  const found = await waitForNip07();
  if (!found || !window.nostr)
    throw new Error("No NOSTR extension found (NIP-07). Install Alby or nos2x, then reload.");
  // Alby requires enable() for permission; nos2x does not have it. Swallow enable errors.
  try {
    if (typeof window.nostr.enable === "function") await window.nostr.enable();
  } catch {}
  if (typeof window.nostr.getPublicKey !== "function")
    throw new Error("Extension found but getPublicKey() missing. Update/reload extension.");
  let pk;
  try {
    pk = await window.nostr.getPublicKey();
  } catch (e) {
    throw new Error(
      "Extension rejected getPublicKey(): " +
        (e?.message || "locked or denied. Unlock extension and approve."),
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(pk || ""))
    throw new Error("Extension returned invalid pubkey: " + String(pk).slice(0, 32));
  return pk;
}

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
  const base = {
    kind: template.kind,
    created_at: template.created_at,
    content: template.content ?? "",
    tags: [...(template.tags || []), ["client", CLIENT_TAG]],
    pubkey: template.pubkey,
  };
  if (!base.pubkey) throw new Error("Missing pubkey: login first.");
  if (!hasNip07() || typeof window.nostr?.signEvent !== "function")
    throw new Error(
      "NOSTR extension required (or signEvent missing). Reload page with extension enabled.",
    );
  // POW first (unsigned), then extension signs. Never send precomputed id/sig:
  // most extensions reject events that already carry id/sig.
  const mined = POW_TARGET > 0 ? minePow(base, POW_TARGET) : base;
  delete mined.id;
  delete mined.sig;
  let signed;
  try {
    signed = await window.nostr.signEvent(mined);
  } catch (e) {
    throw new Error("Extension rejected signature: " + (e?.message || "denied in popup?"));
  }
  if (!signed?.sig || !signed?.id)
    throw new Error("Extension returned unsigned event (no id/sig).");
  return signed;
}

export async function publishEvent(signed) {
  const targets = (await ensureRelays()) ?? activeRelays();
  const pubs = pool.publish(targets, signed);
  await Promise.allSettled(pubs);
  await cacheEvent(signed);
  return signed;
}

export function subscribeFeed(kinds, onEvent, limit = 100) {
  return pool.subscribeMany(activeRelays(), [{ kinds, limit }], {
    onevent: (ev) => {
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
}

export async function refreshRelays() {
  await ensureRelays();
  return activeRelays();
}

export function shortPk(pk) {
  try {
    return nip19.npubEncode(pk).slice(0, 12) + "…";
  } catch {
    return pk.slice(0, 8) + "…";
  }
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

export function ipfsToHttp(ipfsUrl) {
  // Lantern renders ipfs:// directly via helia; this is only a label helper
  if (!ipfsUrl?.startsWith("ipfs://")) return ipfsUrl;
  return ipfsUrl;
}

export function tagVal(ev, name) {
  return ev.tags?.find(([t]) => t === name)?.[1] || "";
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
  const filters = [];
  if (rootEv.kind === 1) {
    filters.push({ kinds: [1], "#e": [rootEv.id], limit: 100 });
  } else if (rootEv.kind === 30023) {
    const addr = `30023:${rootEv.pubkey}:${tagVal(rootEv, "d")}`;
    filters.push({ kinds: [1111], "#A": [addr], limit: 100 });
    filters.push({ kinds: [1111], "#E": [rootEv.id], limit: 100 });
  } else {
    filters.push({ kinds: [1111], "#E": [rootEv.id], limit: 100 });
  }
  // kind 1063 / 20 / 21 / 22 replies use E-tag per NIP-22
  return pool.subscribeMany(activeRelays(), filters, {
    onevent: (ev) => {
      cacheEvent(ev);
      onEvent?.(ev);
    },
  });
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
    const addr = rootEv.kind === 30023 ? `30023:${rootEv.pubkey}:${tagVal(rootEv, "d")}` : null;
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
