import { nip19 } from "nostr-tools";

// Public-identity display and parsing. Every caller used to spell npubEncode
// itself with its own try/catch, and disagreed about what to return when the
// input was not a pubkey — so a bad id surfaced as undefined in one place and
// an empty string in another.

// Hex pubkey -> "npub1…". "" when the input is not a valid pubkey.
export function npubOf(pubkey) {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return "";
  }
}

// Last 6 chars of the npub: the compact author id on cards and timelines.
// Note the tail fallback: npubEncode does not reject a short or non-hex string,
// it encodes whatever bytes it is given. So the raw tail only shows up when the
// input is not a string at all, which is the case worth guarding.
export function shortPk(pk) {
  return npubOf(pk).slice(-6) || String(pk || "").slice(-6);
}

// Header-sized npub for the profile screen: "npub1abcd…123456".
export function shortNpub(pk) {
  const n = npubOf(pk);
  return n ? `${n.slice(0, 10)}…${n.slice(-6)}` : shortPk(pk);
}

// Route id -> hex pubkey. Accepts hex, npub or nprofile; "" when unusable.
export function resolvePk(input) {
  const raw = String(input || "").trim();
  if (/^[0-9a-f]{64}$/i.test(raw)) return raw.toLowerCase();
  try {
    const d = nip19.decode(raw);
    if (d.type === "npub") return d.data;
    if (d.type === "nprofile") return d.data.pubkey;
  } catch {}
  return "";
}