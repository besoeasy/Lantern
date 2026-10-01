import { ref } from "vue";
import { defineStore } from "pinia";
import { subscribeFeed } from "@/lib/nostr.js";
import { FEED_KINDS } from "@/lib/relays.js";
import { getCachedFeed, pruneCache } from "@/lib/db.js";

export const useFeedStore = defineStore("feed", () => {
  const events = ref([]);
  const loading = ref(true);
  const seen = new Set();
  let closer = null;

  function add(ev) {
    if (seen.has(ev.id)) return;
    seen.add(ev.id);
    events.value.push(ev);
    events.value.sort((a, b) => b.created_at - a.created_at);
    if (events.value.length > 500) events.value.length = 500;
  }

  async function start(kinds = FEED_KINDS) {
    loading.value = true;
    events.value = [];
    seen.clear();
    const cached = await getCachedFeed(kinds).catch(() => []);
    cached.forEach(add);
    loading.value = false;
    closer?.close?.();
    closer = subscribeFeed(kinds, add, 100);
    pruneCache();
  }

  function stop() {
    closer?.close?.();
    closer = null;
  }

  return { events, loading, start, stop };
});
