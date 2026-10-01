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
