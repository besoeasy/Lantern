// Upload to a user-configured Originless server -> IPFS CID.
// Lantern only ever stores ipfs://CID in event tags (plan.md spec 4).
// Docs: https://github.com/besoeasy/originless
import { getSettings } from "./settings.js";

export function originlessServers() {
  return getSettings().originless;
}

async function uploadTo(server, file) {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(`${server}/up`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Tries each configured server in order; the first CID that comes back wins.
export async function uploadFile(file) {
  const servers = originlessServers();
  const errors = [];
  for (const server of servers) {
    try {
      const data = await uploadTo(server, file);
      const raw = data.cid || data.hash || data.ipfs || data.url;
      if (!raw) throw new Error("no CID in response");
      const clean = String(raw).replace("ipfs://", "").replace(/^.*\//, "");
      return { cid: clean, url: `ipfs://${clean}`, server };
    } catch (e) {
      errors.push(`${server}: ${e.message}`);
    }
  }
  throw new Error("All Originless servers failed → " + (errors.join(" | ") || "none configured"));
}

const objUrlCache = new Map();

// NOTE: `verifiedFetch` here is the singleton `(resource, options?) => Response`.
// It manages its own Helia node (delegated routing + trustless-gateway.link
// fallback). It is NOT a factory — calling `verifiedFetch(heliaNode)` treats
// the node as a fetch resource and nothing ever renders.
export async function ipfsObjectUrl(ipfsUrl, { timeoutMs = 45000 } = {}) {
  const cid = String(ipfsUrl).replace("ipfs://", "").split("/")[0];
  if (!cid) throw new Error("bad ipfs URL");
  if (objUrlCache.has(cid)) return objUrlCache.get(cid);
  const { verifiedFetch } = await import("@helia/verified-fetch");
  const res = await verifiedFetch(`ipfs://${cid}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`IPFS fetch failed (HTTP ${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  objUrlCache.set(cid, url);
  return url;
}

export async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
