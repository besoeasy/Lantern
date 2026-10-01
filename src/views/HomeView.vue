<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFeedStore } from "@/stores/feed.js";
import PostCard from "@/components/PostCard.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";
import ReactionBar from "@/components/ReactionBar.vue";

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

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  // Media controls (video/audio) and any nested controls keep their own behavior.
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}
</script>

<template>
  <div class="home">
    <LoginPrompt title="Join the discussion" subtitle="Connect a NIP-07 extension to comment." />

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
    <div class="list">
      <div
        class="postwrap"
        v-for="ev in visible"
        :key="ev.id"
        role="link"
        tabindex="0"
        @click="openPost($event, ev.id)"
        @keydown.enter="goPost(ev.id)"
        @keydown.space.prevent="goPost(ev.id)"
      >
        <PostCard :ev="ev" hashtags />
        <ReactionBar :ev="ev" />
      </div>
    </div>
    <p v-if="!feed.loading && !visible.length" class="hint">Nothing here yet.</p>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 12px;
}
.pills {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  width: 100vw;
  margin: -14px 0 0 calc(50% - 50vw);
  padding: 8px max(14px, calc(50vw - 286px));
  background: #fff;
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
  padding: 7px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: capitalize;
  white-space: nowrap;
}
.pills button.on {
  color: var(--ink);
  border-bottom-color: var(--ink);
}
.list {
  display: grid;
  gap: 14px;
}
.postwrap {
  display: grid;
  cursor: pointer;
  border-radius: var(--radius);
}
.postwrap:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
