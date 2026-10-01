// Originless upload -> IPFS CID, then Lantern uses ipfs://CID only.
// Docs: https://github.com/besoeasy/originless (default https://originless.space/)
const SERVER = "https://originless.space";

let heliaNode = null;

async function getHelia() {
  if (heliaNode) return heliaNode;
  const { createHelia } = await import("helia");
  heliaNode = await createHelia();
  return heliaNode;
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${SERVER}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`originless upload failed: ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const cid = data.cid || data.hash || data.ipfs || data.url;
  if (!cid) throw new Error("originless: no CID in response " + JSON.stringify(data).slice(0, 200));
  const clean = String(cid).replace("ipfs://", "").split("/").pop();
  return { cid: clean, url: `ipfs://${clean}` };
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
