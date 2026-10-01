import Dexie from "dexie";

export const db = new Dexie("lantern");
db.version(1).stores({
  events: "id, pubkey, kind, created_at",
  profiles: "pubkey",
  files: "cid, created_at",
});

const THIRTY_DAYS = 30 * 24 * 60 * 60;

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
    .filter((ev) => (kinds?.length ? kinds.includes(ev.kind) : true))
    .limit(limit)
    .toArray();
}

export async function pruneCache() {
  const cutoff = Math.floor(Date.now() / 1000) - THIRTY_DAYS;
  await db.events.where("created_at").below(cutoff).delete();
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
