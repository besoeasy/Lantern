import { ref } from "vue";
import { defineStore } from "pinia";
import { subscribeFeed } from "@/lib/nostr.js";
import { FEED_KINDS, ensureRelays } from "@/lib/relays.js";
import { getCachedFeed, pruneCache } from "@/lib/db.js";
import { useEventList } from "@/composables/useEventList.js";

export const useFeedStore = defineStore("feed", () => {
  const loading = ref(true);
  const {
    items: events,
    add,
    reset,
  } = useEventList({
    cap: 500,
  });
  let closer = null;

  async function start(kinds = FEED_KINDS) {
    loading.value = true;
    reset();
    const cached = await getCachedFeed(kinds).catch(() => []);
    cached.forEach(add);
    loading.value = false;
    closer?.close?.();
    // Probe relays first so we only open sockets to ones actually online.
    await ensureRelays();
    closer = subscribeFeed(kinds, add, 100);
    pruneCache();
  }

  function stop() {
    closer?.close?.();
    closer = null;
  }

  return { events, loading, start, stop };
});
