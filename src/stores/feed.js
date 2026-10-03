import { ref } from "vue";
import { defineStore } from "pinia";
import { meetsPow, subscribeFeed } from "@/lib/nostr.js";
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
    guard: meetsPow,
    cap: 500,
  });
  let closer = null;

  async function start(kinds = FEED_KINDS) {
    loading.value = true;
    reset();
    const cached = await getCachedFeed(kinds).catch(() => []);
    console.log("[lantern] feed: cached events", cached.length);
    cached.forEach(add);
    loading.value = false;
    closer?.close?.();
    // Probe relays first so we only open sockets to ones actually online.
    const relays = await ensureRelays();
    console.log("[lantern] feed: subscribing on relays", relays);
    let n = 0;
    closer = subscribeFeed(kinds, (ev) => {
      if (++n % 25 === 0) console.log("[lantern] feed: events so far", n);
      add(ev);
    }, 100);
    console.log("[lantern] feed: subscription open");
    pruneCache();
  }

  function stop() {
    closer?.close?.();
    closer = null;
  }

  return { events, loading, start, stop };
});
