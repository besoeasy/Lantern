import { finalizeEvent, generateSecretKey, getPublicKey, nip19, utils } from "nostr-tools";

// A local key is a Nostr identity that lives in this browser only: no extension,
// no popup, no keystore. It is kept in localStorage so a reload stays signed in,
// which is the same convenience a NIP-07 extension gives. Losing the nsec means
// losing the account — nothing on the relays can restore a secret key.
const KEY = "lantern.key.v1";

export function storedNsec() {
  try {
    return localStorage.getItem(KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function saveNsec(nsec) {
  try {
    localStorage.setItem(KEY, nsec);
  } catch {}
}

export function clearNsec() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// Accepts nsec1… and bare 64-char hex, since both turn up in wallet exports.
// Returns { hex, nsec, pubkey }, or null when the input is not a secret key.
export function parseSecret(input) {
  const raw = String(input || "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  let bytes = null;
  try {
    if (raw.startsWith("nsec1")) {
      const decoded = nip19.decode(raw);
      if (decoded.type !== "nsec") return null;
      bytes = decoded.data;
    } else if (utils.isHex32(raw)) {
      bytes = utils.hexToBytes(raw);
    }
  } catch {
    return null;
  }
  if (!bytes || bytes.length !== 32) return null;
  return {
    hex: utils.bytesToHex(bytes),
    nsec: nip19.nsecEncode(bytes),
    pubkey: getPublicKey(bytes),
  };
}

export function newSecret() {
  const bytes = generateSecretKey();
  return {
    hex: utils.bytesToHex(bytes),
    nsec: nip19.nsecEncode(bytes),
    pubkey: getPublicKey(bytes),
  };
}

// Local signing. finalizeEvent() stamps pubkey, id and sig onto the template,
// the same contract an extension's signEvent() fulfils.
export function signWithSecret(hex, template) {
  return finalizeEvent({ ...template }, utils.hexToBytes(hex));
}
