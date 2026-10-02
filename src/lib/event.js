// Pure readers over an event's tags. No network or storage imports, so both
// nostr.js and db.js can use these without creating an import cycle.

export function tagVal(ev, name) {
  return ev?.tags?.find(([t]) => t === name)?.[1] || "";
}

// NIP-40: the `expiration` tag as a unix timestamp in seconds. Returns 0 when
// the event carries no usable expiration, so callers can test `> 0`.
export function expiryOf(ev) {
  const raw = tagVal(ev, "expiration");
  if (!raw) return 0;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : 0;
}

// NIP-01 coordinate for a kind-30023 article: "30023:<pubkey>:<d-tag>".
// Replies and reactions address articles by this rather than by event id,
// since a long-form post is replaceable and its id changes when it does.
// Returns null for any other kind, so callers can branch on it directly.
export function articleAddr(ev) {
  if (ev?.kind !== 30023) return null;
  return `30023:${ev.pubkey}:${tagVal(ev, "d")}`;
}
