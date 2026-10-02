<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFeedStore } from "@/stores/feed.js";
import PostList from "@/components/PostList.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";

const feed = useFeedStore();
const route = useRoute();
const router = useRouter();
const filter = ref(route.query.tab || "all");

const FILTERS = {
  all: null,
  notes: [1],
  pics: [20],
  videos: [21, 22],
  blogs: [30023],
  music: [1063, 36787],
};

const visible = computed(() => {
  const kinds = FILTERS[filter.value];
  if (!kinds) return feed.events;
  return feed.events.filter((e) => kinds.includes(e.kind));
});

watch(
  () => route.query.tab,
  (t) => {
    if (t && FILTERS[t] !== undefined) filter.value = t;
    else if (!t) filter.value = "all";
  },
);

function setFilter(k) {
  filter.value = k;
  router.replace({ query: { ...route.query, tab: k === "all" ? undefined : k } });
}

onMounted(() => feed.start());
onUnmounted(() => feed.stop());
</script>

<template>
  <div class="home">
    <LoginPrompt title="Join the discussion" subtitle="Sign in with an extension or a key to comment." />

    <div class="pills">
      <button
        v-for="k in Object.keys(FILTERS)"
        :key="k"
        :class="{ on: filter === k }"
        @click="setFilter(k)"
      >
        {{ k }}
      </button>
    </div>

    <p v-if="feed.loading" class="hint">Syncing relays…</p>
    <PostList :events="visible" hashtags />
    <p v-if="!feed.loading && !visible.length" class="hint">Nothing here yet.</p>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 12px;
}
/* Edge-to-edge filter bar. The negative margins cancel .main's 16px gutter
   and the 294px centres the padding on the 620px shell, so the row spans the
   viewport but its contents stay aligned with the cards below it. */
.pills {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  width: 100vw;
  margin: -16px 0 0 calc(50% - 50vw);
  padding: 8px max(16px, calc(50vw - 294px));
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: saturate(1.6) blur(16px);
  -webkit-backdrop-filter: saturate(1.6) blur(16px);
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}
.pills::-webkit-scrollbar {
  display: none;
}
.pills button {
  flex-shrink: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 8px 11px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: capitalize;
  white-space: nowrap;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.pills button:hover {
  color: var(--ink-2);
}
.pills button.on {
  color: var(--ink);
  border-bottom-color: var(--accent);
}
</style>
