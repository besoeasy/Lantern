import { ref } from "vue";
import { defineStore } from "pinia";
import { pool } from "@/lib/nostr.js";
import { activeRelays, ensureRelays } from "@/lib/relays.js";
import { nip07Pubkey, waitForNip07 } from "@/lib/nostr.js";

export const useUserStore = defineStore("user", () => {
  const pubkey = ref("");
  const profile = ref({});
  const ready = ref(false);
  const error = ref("");
  const busy = ref(false);
  const probing = ref(false);
  const signerFound = ref(false);
  let autoTried = false;

  async function login() {
    error.value = "";
    busy.value = true;
    try {
      pubkey.value = await nip07Pubkey();
      ready.value = true;
      loadProfile(pubkey.value);
    } catch (e) {
      error.value = e?.message || String(e);
      throw e;
    } finally {
      busy.value = false;
    }
  }

  async function loadProfile(pk) {
    try {
      const targets = (await ensureRelays()) ?? activeRelays();
      const ev = await pool.get(targets, { kinds: [0], authors: [pk] });
      if (ev) profile.value = JSON.parse(ev.content || "{}");
    } catch {}
  }

  function logout() {
    pubkey.value = "";
    profile.value = {};
    ready.value = false;
    error.value = "";
  }

  // Silent single-shot login: if a NIP-07 signer is injected, use it without
  // asking. Failures stay silent — the user simply remains logged out and the
  // manual login paths (Home banner, /compose gate) take over.
  async function autoLogin() {
    if (pubkey.value || autoTried) return;
    autoTried = true;
    probing.value = true;
    try {
      signerFound.value = await waitForNip07();
      if (signerFound.value) await login();
    } catch {
      error.value = "";
    } finally {
      probing.value = false;
    }
  }

  return { pubkey, profile, ready, error, busy, probing, signerFound, login, logout, loadProfile, autoLogin };
});
