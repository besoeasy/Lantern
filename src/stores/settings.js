import { ref } from "vue";
import { defineStore } from "pinia";
import {
  getSettings,
  addOriginless,
  removeOriginless,
  addRelay,
  removeRelay,
  toggleRelay,
  resetSettings,
  isExtra,
  isDisabled,
} from "@/lib/settings.js";
import { DEFAULT_RELAYS, refreshRelays, relayHealth, invalidateRelays } from "@/lib/relays.js";

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref(getSettings());
  const health = ref(relayHealth());
  const testing = ref("");

  function sync() {
    settings.value = getSettings();
  }

  function addOriginlessServer(url) {
    const ok = addOriginless(url);
    sync();
    return ok;
  }

  function removeOriginlessServer(url) {
    const ok = removeOriginless(url);
    sync();
    return ok;
  }

  function addRelayUrl(url) {
    const ok = addRelay(url);
    sync();
    if (ok) invalidateRelays();
    return ok;
  }

  function removeRelayUrl(url) {
    removeRelay(url);
    sync();
    invalidateRelays();
  }

  function toggleRelayUrl(url, on) {
    toggleRelay(url, on);
    sync();
    invalidateRelays();
  }

  function extraOf(url) {
    return isExtra(url);
  }

  function disabledOf(url) {
    return isDisabled(url);
  }

  async function test(url, kind) {
    testing.value = url;
    try {
      if (kind === "originless") {
        const res = await fetch(`${url}/healthz`);
        const data = await res.json().catch(() => ({}));
        return res.ok ? `ok · ipfs ${data.ipfs ?? "?"}` : `degraded · ipfs ${data.ipfs ?? "?"}`;
      }
      const alive = (await refreshRelays()).includes(url);
      health.value = relayHealth();
      return alive ? "online" : "unreachable";
    } catch (e) {
      return "unreachable";
    } finally {
      testing.value = "";
    }
  }

  async function runHealthCheck() {
    await refreshRelays();
    health.value = relayHealth();
    return health.value.ok;
  }

  function reset() {
    resetSettings();
    invalidateRelays();
    sync();
  }

  return {
    settings,
    health,
    testing,
    DEFAULT_RELAYS,
    sync,
    addOriginlessServer,
    removeOriginlessServer,
    addRelayUrl,
    removeRelayUrl,
    toggleRelayUrl,
    extraOf,
    disabledOf,
    test,
    runHealthCheck,
    reset,
  };
});
