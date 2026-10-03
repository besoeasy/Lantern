import * as settings from "./settings.js";

export const DEFAULT_RELAYS = [
  "wss://nostr-02.yakihonne.com",
  "wss://purplerelay.com",
  "wss://relay.snort.social",
  "wss://relay.primal.net",
  "wss://nos.lol",
];

export const CLIENT_TAG = "lantern";
export const POW_TARGET = 5;
// USP: nothing Lantern publishes lives forever. Every signed event carries a
// NIP-40 `expiration` tag 3 years after creation; relays honor it by deleting.
export const CONTENT_TTL_SECONDS = 3 * 365 * 24 * 60 * 60;
export const FEED_KINDS = [1, 20, 21, 22, 30023, 1063, 36787];

// Relays are community-run and often offline. Probe before subscribing so the
// pool does not keep retrying dead sockets. User config decides the candidate
// set; the probe only narrows it further.
const HEALTH_TTL = 10 * 60 * 1000;
let ok = null;
let probedAt = 0;
let inFlight = null;

export function configuredRelays() {
  return settings.enabledRelays(DEFAULT_RELAYS);
}

export function activeRelays() {
  if (ok && ok.length) return ok;
  const configured = settings.enabledRelays(DEFAULT_RELAYS);
  return configured.length ? configured : DEFAULT_RELAYS;
}

export function relayHealth() {
  return { ok: ok ?? activeRelays(), probedAt };
}

function probe(url, timeout = 4000) {
  return new Promise((resolve) => {
    let settled = false;
    let ws;
    const done = (v) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws?.close();
      } catch {}
      resolve(v);
    };
    const timer = setTimeout(() => done(false), timeout);
    try {
      ws = new WebSocket(url);
    } catch {
      return done(false);
    }
    ws.onopen = () => {
      ws.onmessage = () => done(true);
      try {
        ws.send(JSON.stringify(["REQ", "lantern-health", { kinds: [0], limit: 0 }]));
      } catch {
        done(true);
      }
    };
    ws.onerror = () => done(false);
    ws.onclose = () => done(false);
  });
}

export async function refreshRelays() {
  const candidates = settings.enabledRelays(DEFAULT_RELAYS);
  const pool = candidates.length ? candidates : DEFAULT_RELAYS;
  const results = await Promise.all(pool.map((r) => probe(r)));
  const alive = pool.filter((_, i) => results[i]);
  console.log(
    "[lantern] relay probe:",
    pool.map((r, i) => `${r}=${results[i] ? "ok" : "dead"}`).join(", "),
  );
  // Never leave the user with zero relays: a probe failure is not proof of death.
  ok = alive.length ? alive : pool;
  probedAt = Date.now();
  return ok;
}

export async function ensureRelays() {
  if (probedAt && Date.now() - probedAt < HEALTH_TTL) return ok ?? activeRelays();
  if (!inFlight) {
    inFlight = refreshRelays().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

export function invalidateRelays() {
  probedAt = 0;
  ok = null;
}
