export const RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://purplerelay.com',
  'wss://nostr.mom',
  'wss://nostr.oxtr.dev',
  'wss://relay.emre.xyz',
  'wss://bucket.coracle.social',
  'wss://nostr-02.yakihonne.com',
  'wss://articles.layer3.news',
  'wss://nostr.21crypto.ch',
  'wss://cfrelay.haorendashu.workers.dev',
  'wss://relay.cocu.la',
]

export const CLIENT_TAG = 'lantern'
export const POW_TARGET = 5
export const FEED_KINDS = [1, 20, 21, 22, 30023, 1063]

// Relays are community-run; several are often offline. Probe on boot and keep
// only the ones that answer NIP-11 so the pool stops retrying dead sockets.
const HEALTH_TTL = 10 * 60 * 1000
const cache = new Map()

export function activeRelays() {
  return cache.get('ok') ?? RELAYS
}

async function probe(url, timeout = 4000) {
  return new Promise((resolve) => {
    let settled = false
    const done = (ok) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {}
      resolve(ok)
    }
    const timer = setTimeout(() => done(false), timeout)
    let ws
    try {
      ws = new WebSocket(url)
    } catch {
      return done(false)
    }
    ws.onopen = () => {
      // Any successful frame means the socket is alive.
      ws.onmessage = () => done(true)
      try {
        ws.send(JSON.stringify(['REQ', 'lantern-health', { kinds: [0], limit: 0 }]))
      } catch {
        done(true)
      }
    }
    ws.onerror = () => done(false)
    ws.onclose = () => done(false)
  })
}

export async function refreshRelays() {
  const results = await Promise.all(RELAYS.map((r) => probe(r)))
  const ok = RELAYS.filter((_, i) => results[i])
  cache.set('ok', ok.length ? ok : RELAYS)
  cache.set('at', Date.now())
  return cache.get('ok')
}

export async function ensureRelays() {
  const at = cache.get('at')
  if (at && Date.now() - at < HEALTH_TTL) return cache.get('ok')
  return refreshRelays()
}