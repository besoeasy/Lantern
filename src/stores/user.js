import { ref } from "vue";
import { defineStore } from "pinia";
import { clearNsec, newSecret, parseSecret, saveNsec } from "@/lib/keys.js";
import { getAuthorProfile } from "@/lib/nostr.js";
import {
  SIGNER_KEY,
  clearSigner,
  keySigner,
  nip07Pubkey,
  nip07Signer,
  restoreSigner,
  setSigner,
  waitForNip07,
} from "@/lib/signer.js";

export const useUserStore = defineStore("user", () => {
  const pubkey = ref("");
  const profile = ref({});
  const ready = ref(false);
  const error = ref("");
  const busy = ref(false);
  const probing = ref(false);
  const signerFound = ref(false);
  // Which of the two signers is in play, so Settings can offer the matching
  // "sign out" (an extension signs out here, a local key has to be forgotten).
  const signerType = ref("");
  let autoTried = false;

  function activate(signer) {
    setSigner(signer);
    pubkey.value = signer.pubkey;
    signerType.value = signer.type;
    ready.value = true;
    loadProfile(signer.pubkey);
  }

  async function login() {
    error.value = "";
    busy.value = true;
    try {
      activate(nip07Signer(await nip07Pubkey()));
    } catch (e) {
      error.value = e?.message || String(e);
      throw e;
    } finally {
      busy.value = false;
    }
  }

  // Sign in with a key already in the user's hands: an nsec from another
  // client, or 64 hex chars. Saved here so reloads stay signed in.
  function loginWithSecret(input) {
    error.value = "";
    const secret = parseSecret(input);
    if (!secret) throw new Error("That is not a secret key. Expected an nsec1… key.");
    saveNsec(secret.nsec);
    activate(keySigner(secret));
    return secret.pubkey;
  }

  // Fresh account: a random key, signed in immediately. Nothing is published,
  // so the caller is responsible for showing the nsec for backup.
  function createAccount() {
    error.value = "";
    const secret = newSecret();
    saveNsec(secret.nsec);
    activate(keySigner(secret));
    return secret;
  }

  // Relays are best-effort: a failed fetch just leaves the profile blank.
  async function loadProfile(pk) {
    try {
      profile.value = await getAuthorProfile(pk);
    } catch {
      profile.value = {};
    }
  }

  // Signing out of a local key must also erase it, otherwise the next reload
  // would silently sign back in with the same key.
  function logout() {
    if (signerType.value === SIGNER_KEY) clearNsec();
    clearSigner();
    pubkey.value = "";
    profile.value = {};
    ready.value = false;
    error.value = "";
    signerType.value = "";
  }

  // Silent single-shot login: resume the extension if one is injected, else the
  // key saved here. Failures stay silent — the user simply remains logged out
  // and the manual login paths (Home banner, /compose gate) take over.
  async function autoLogin() {
    if (pubkey.value || autoTried) return;
    autoTried = true;
    probing.value = true;
    try {
      signerFound.value = await waitForNip07();
      const signer = await restoreSigner();
      if (signer) activate(signer);
    } catch {
      error.value = "";
    } finally {
      probing.value = false;
    }
  }

  return {
    pubkey,
    profile,
    ready,
    error,
    busy,
    probing,
    signerFound,
    signerType,
    login,
    loginWithSecret,
    createAccount,
    logout,
    loadProfile,
    autoLogin,
  };
});
