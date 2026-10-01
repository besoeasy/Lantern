const KEY = "lantern.settings.v1";

export const DEFAULT_ORIGINLESS = ["https://originless.space"];

const DEFAULTS = {
  originless: DEFAULT_ORIGINLESS,
  relaysEnabled: {}, // url -> false to disable a default relay
  relaysExtra: [], // user-added relays
};

let state = structuredClone(DEFAULTS);

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    state = {
      originless:
        Array.isArray(parsed.originless) && parsed.originless.length
          ? parsed.originless
          : DEFAULT_ORIGINLESS,
      relaysEnabled:
        parsed.relaysEnabled && typeof parsed.relaysEnabled === "object"
          ? parsed.relaysEnabled
          : {},
      relaysExtra: Array.isArray(parsed.relaysExtra) ? parsed.relaysExtra : [],
    };
  }
} catch {}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function getSettings() {
  return state;
}

export function setOriginless(list) {
  state.originless = dedupe(list);
  persist();
}

export function addOriginless(url) {
  const clean = normalizeHttp(url);
  if (!clean || state.originless.includes(clean)) return false;
  state.originless = [...state.originless, clean];
  persist();
  return true;
}

export function removeOriginless(url) {
  if (state.originless.length <= 1) return false;
  state.originless = state.originless.filter((u) => u !== url);
  persist();
  return true;
}

export function toggleRelay(url, on) {
  if (on) delete state.relaysEnabled[url];
  else state.relaysEnabled[url] = false;
  persist();
}

export function addRelay(url) {
  const clean = normalizeWs(url);
  if (!clean) return false;
  if (allRelayCandidates().includes(clean)) return false;
  state.relaysExtra = dedupe([...state.relaysExtra, clean]);
  delete state.relaysEnabled[clean];
  persist();
  return true;
}

export function removeRelay(url) {
  if (state.relaysExtra.includes(url)) {
    state.relaysExtra = state.relaysExtra.filter((u) => u !== url);
  } else {
    delete state.relaysEnabled[url];
  }
  persist();
}

export function resetSettings() {
  state = structuredClone(DEFAULTS);
  persist();
}

export function normalizeHttp(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, "");
  if (/^wss?:\/\//i.test(s)) return "";
  return "https://" + s.replace(/\/+$/, "");
}

export function normalizeWs(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^wss?:\/\//i.test(s)) return s.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(s)) return s.replace(/^http/i, "ws").replace(/\/+$/, "");
  return "wss://" + s.replace(/\/+$/, "");
}

function dedupe(list) {
  return [...new Set(list.filter(Boolean))];
}

export function allRelayCandidates(DEFAULTS_RELAYS = []) {
  return dedupe([...DEFAULTS_RELAYS, ...state.relaysExtra]);
}

export function enabledRelays(DEFAULTS_RELAYS = []) {
  return allRelayCandidates(DEFAULTS_RELAYS).filter((u) => state.relaysEnabled[u] !== false);
}

export function isExtra(url) {
  return state.relaysExtra.includes(url);
}

export function isDisabled(url) {
  return state.relaysEnabled[url] === false;
}
