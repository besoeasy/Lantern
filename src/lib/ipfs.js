// Upload to a user-configured Originless server -> IPFS CID.
// Lantern only ever stores ipfs://CID in event tags (plan.md spec 4).
// Docs: https://github.com/besoeasy/originless
import { getSettings } from "./settings.js";

let heliaNode = null;

async function getHelia() {
  if (heliaNode) return heliaNode;
  const { createHelia } = await import("helia");
  heliaNode = await createHelia();
  return heliaNode;
}

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

export async function ipfsObjectUrl(ipfsUrl) {
  const cid = String(ipfsUrl).replace("ipfs://", "").split("/")[0];
  if (!cid) return "";
  if (objUrlCache.has(cid)) return objUrlCache.get(cid);
  const h = await getHelia();
  const { verifiedFetch } = await import("@helia/verified-fetch");
  const vf = verifiedFetch(h);
  const res = await vf(`ipfs://${cid}`);
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
