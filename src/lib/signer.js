import { clearNsec, parseSecret, signWithSecret, storedNsec } from "./keys.js";

// Signing can come from two places: a NIP-07 browser extension, or a secret key
// held in this browser. Both reduce to one signer object — { type, pubkey,
// sign(event) } — so nostr.js signs without knowing which is in play.
export const SIGNER_EXTENSION = "extension";
export const SIGNER_KEY = "key";

let active = null;

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
    throw new Error("No NOSTR extension found (NIP-07). Install Alby or nos2x, or use a key.");
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

export function nip07Signer(pubkey) {
  return {
    type: SIGNER_EXTENSION,
    pubkey,
    async sign(event) {
      if (typeof window.nostr?.signEvent !== "function")
        throw new Error("NOSTR extension lost signEvent. Reload page with extension enabled.");
      let signed;
      try {
        signed = await window.nostr.signEvent(event);
      } catch (e) {
        throw new Error("Extension rejected signature: " + (e?.message || "denied in popup?"));
      }
      if (!signed?.sig || !signed?.id)
        throw new Error("Extension returned unsigned event (no id/sig).");
      return signed;
    },
  };
}

export function keySigner(secret) {
  return {
    type: SIGNER_KEY,
    pubkey: secret.pubkey,
    async sign(event) {
      return signWithSecret(secret.hex, event);
    },
  };
}

export function setSigner(signer) {
  active = signer;
}

export function getSigner() {
  return active;
}

export function signerType() {
  return active?.type || "";
}

export function clearSigner() {
  active = null;
}

// The signer to resume on load: an extension when one is injected (so an
// existing NIP-07 flow is never interrupted), otherwise the key saved here.
// An extension that is present but locked or declined falls through to the key
// rather than leaving the user signed out with a working key on hand.
export async function restoreSigner() {
  if (hasNip07()) {
    try {
      return nip07Signer(await nip07Pubkey());
    } catch {}
  }
  const saved = storedNsec();
  if (!saved) return null;
  const secret = parseSecret(saved);
  if (!secret) {
    clearNsec();
    return null;
  }
  return keySigner(secret);
}
