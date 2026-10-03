import Dexie from "dexie";
import { powOf, tagVal } from "./event.js";
import { MIN_POW } from "./relays.js";

export const db = new Dexie("lantern");
db.version(1).stores({
  events: "id, pubkey, kind, created_at",
  profiles: "pubkey",
  files: "cid, created_at",
});

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// NIP-40: an event past its `expiration` tag is dead — never serve it locally.
function isExpired(ev, nowSec = Math.floor(Date.now() / 1000)) {
  const exp = tagVal(ev, "expiration");
  return !!exp && Number(exp) <= nowSec;
}

export async function cacheEvent(ev) {
  try {
    await db.events.put({
      id: ev.id,
      pubkey: ev.pubkey,
      kind: ev.kind,
      created_at: ev.created_at,
      content: ev.content,
      tags: ev.tags,
      sig: ev.sig,
      cached_at: Math.floor(Date.now() / 1000),
    });
  } catch {}
}

export async function getCachedFeed(kinds, limit = 100) {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  return db.events
    .where("created_at")
    .above(cutoff)
    .reverse()
    .filter((ev) => (kinds?.length ? kinds.includes(ev.kind) : true) && !isExpired(ev) && powOf(ev) >= MIN_POW)
    .limit(limit)
    .toArray();
}

export async function getCachedTag(tag, limit = 100) {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  const all = await db.events
    .where("created_at")
    .above(cutoff)
    .filter((ev) => (ev.tags || []).some(([t, v]) => t === "t" && v === tag))
    .toArray();
  return all
    .filter((ev) => !isExpired(ev) && powOf(ev) >= MIN_POW)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
}

export async function getCachedAuthorPosts(pubkey, kinds, limit = 50) {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  const all = await db.events
    .where("created_at")
    .above(cutoff)
    .filter((ev) => ev.pubkey === pubkey)
    .toArray();
  return all
    .filter(
      (ev) =>
        (!kinds?.length || kinds.includes(ev.kind)) &&
        !isExpired(ev) &&
        powOf(ev) >= MIN_POW,
    )
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
}

export async function pruneCache() {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  await db.events.where("created_at").below(cutoff).delete();
  await db.events.filter((ev) => isExpired(ev)).delete();
  await db.files.where("created_at").below(cutoff).delete();
  try {
    const count = await db.events.count();
    if (count > 20000) {
      const oldest = await db.events
        .orderBy("created_at")
        .limit(count - 20000)
        .primaryKeys();
      await db.events.bulkDelete(oldest);
    }
  } catch {}
}
