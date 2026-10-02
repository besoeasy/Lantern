// A local NIP-01 relay, just real enough to prove the app can publish to and
// read back from a websocket. Keeps the tests off the public network, so they
// are deterministic and do not depend on someone's relay being up.
//
// Implements the subset nostr-tools' SimplePool actually uses:
//   EVENT  -> verify, enforce POW, store (idempotent by id), answer OK,
//             then fan out to live subscriptions, the way a real relay would
//   REQ    -> AND the filters, OR within each, stream EVENTs, end with EOSE
//   CLOSE  -> drop the subscription
import { WebSocketServer } from "ws";
import { verifyEvent } from "nostr-tools";

const POW_BITS = 5;

function countLeadingZeroBits(hex) {
  let bits = 0;
  for (const ch of hex) {
    const n = parseInt(ch, 16);
    if (Number.isNaN(n)) return bits;
    for (let i = 3; i >= 0; i--) {
      if ((n >> i) & 1) return bits;
      bits++;
    }
  }
  return bits;
}

// NIP-01 filter matching. Non-matching fields are ignored rather than rejected,
// which is what a lenient real relay does.
function matches(ev, filter) {
  for (const [key, want] of Object.entries(filter)) {
    if (key === "limit") continue;
    if (key === "ids") {
      if (!want.includes(ev.id)) return false;
    } else if (key === "authors") {
      if (!want.includes(ev.pubkey)) return false;
    } else if (key === "kinds") {
      if (!want.includes(ev.kind)) return false;
    } else if (key === "since") {
      if (ev.created_at < want) return false;
    } else if (key === "until") {
      if (ev.created_at > want) return false;
    } else if (key.startsWith("#")) {
      const tag = key.slice(1);
      const have = (ev.tags || []).filter(([t]) => t === tag).map(([, v]) => v);
      if (!have.some((v) => want.includes(v))) return false;
    }
  }
  return true;
}

// Starts a relay on an ephemeral port.
export async function startRelay({ name = "relay", enforcePow = true } = {}) {
  const events = new Map();
  const rejected = [];
  const sockets = new Set();
  const subscriptions = new Set();

  const send = (ws, msg) => {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  };

  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise((resolve, reject) => {
    wss.once("listening", resolve);
    wss.once("error", reject);
  });
  const { port } = wss.address();

  wss.on("connection", (ws) => {
    sockets.add(ws);
    ws.on("close", () => {
      sockets.delete(ws);
      for (const sub of subscriptions) if (sub.ws === ws) subscriptions.delete(sub);
    });

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!Array.isArray(msg)) return;

      if (msg[0] === "EVENT") {
        const ev = msg[1];
        if (!ev?.id || !ev?.sig) {
          rejected.push({ reason: "malformed" });
          return send(ws, ["OK", ev?.id ?? "", false, "malformed: missing id or sig"]);
        }
        if (!verifyEvent(ev)) {
          rejected.push({ reason: "bad-signature", id: ev.id });
          return send(ws, ["OK", ev.id, false, "invalid: signature does not verify"]);
        }
        if (enforcePow && countLeadingZeroBits(ev.id) < POW_BITS) {
          const bits = countLeadingZeroBits(ev.id);
          rejected.push({ reason: "low-pow", id: ev.id, bits });
          return send(ws, ["OK", ev.id, false, `pow: ${POW_BITS} bits required, got ${bits}`]);
        }
        events.set(ev.id, ev);
        send(ws, ["OK", ev.id, true, ""]);
        // Fan out to live subscriptions, so a second tab sees the post without
        // re-querying. This is what makes the "fetched back" assertion honest.
        for (const sub of subscriptions) {
          if (sub.filters.some((f) => matches(ev, f))) send(ws, ["EVENT", sub.id, ev]);
        }
        return;
      }

      if (msg[0] === "REQ") {
        const sub = { ws, id: msg[1], filters: msg.slice(2) };
        subscriptions.add(sub);
        for (const filter of sub.filters) {
          const limit = filter.limit ?? 500;
          [...events.values()]
            .filter((ev) => matches(ev, filter))
            .sort((a, b) => b.created_at - a.created_at)
            .slice(0, limit)
            .forEach((ev) => send(ws, ["EVENT", sub.id, ev]));
        }
        send(ws, ["EOSE", sub.id]);
        return;
      }

      if (msg[0] === "CLOSE") {
        for (const sub of subscriptions) if (sub.id === msg[1]) subscriptions.delete(sub);
      }
    });
  });

  return {
    url: `ws://127.0.0.1:${port}`,
    name,
    /** Newest first, the order the feed renders. */
    all: () => [...events.values()].sort((a, b) => b.created_at - a.created_at),
    byAuthor: (pk) => [...events.values()].filter((ev) => ev.pubkey === pk),
    byKind: (kind) => [...events.values()].filter((ev) => ev.kind === kind),
    count: () => events.size,
    rejected,
    reset() {
      events.clear();
      rejected.length = 0;
    },
    async close() {
      for (const ws of sockets) {
        try {
          ws.terminate();
        } catch {}
      }
      subscriptions.clear();
      await new Promise((resolve) => wss.close(resolve));
    },
  };
}