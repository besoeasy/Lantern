<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { subscribeTag } from "@/lib/nostr.js";
import { ensureRelays } from "@/lib/relays.js";
import { getCachedTag } from "@/lib/db.js";
import NoteCard from "@/components/NoteCard.vue";
import PictureCard from "@/components/PictureCard.vue";
import VideoCard from "@/components/VideoCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import MusicCard from "@/components/MusicCard.vue";
import ReactionBar from "@/components/ReactionBar.vue";

const route = useRoute();
const router = useRouter();
const events = ref([]);
const loading = ref(true);
const seen = new Set();
let sub = null;

function add(ev) {
  if (seen.has(ev.id)) return;
  seen.add(ev.id);
  events.value.push(ev);
  events.value.sort((a, b) => b.created_at - a.created_at);
}

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}

watch(
  () => route.params.tag,
  async (tag) => {
    sub?.close?.();
    sub = null;
    events.value = [];
    seen.clear();
    if (!tag) return;
    loading.value = true;
    const cached = await getCachedTag(tag).catch(() => []);
    cached.forEach(add);
    loading.value = false;
    await ensureRelays();
    sub = subscribeTag(tag, add, 100);
  },
  { immediate: true },
);

onUnmounted(() => sub?.close?.());
</script>

<template>
  <div class="tagview">
    <div class="topbar">
      <RouterLink to="/" class="back">
        <ArrowLeft />
        <span>Back to feed</span>
      </RouterLink>
      <h1 class="title">#{{ route.params.tag }}</h1>
    </div>
    <p v-if="loading" class="hint">Syncing relays…</p>
    <div class="list">
      <div
        class="postwrap"
        v-for="ev in events"
        :key="ev.id"
        role="link"
        tabindex="0"
        @click="openPost($event, ev.id)"
        @keydown.enter="goPost(ev.id)"
        @keydown.space.prevent="goPost(ev.id)"
      >
        <NoteCard v-if="ev.kind === 1" :ev="ev" />
        <PictureCard v-else-if="ev.kind === 20" :ev="ev" />
        <VideoCard v-else-if="ev.kind === 21 || ev.kind === 22" :ev="ev" />
        <ArticleCard v-else-if="ev.kind === 30023" :ev="ev" />
        <MusicCard v-else-if="ev.kind === 1063 || ev.kind === 36787" :ev="ev" />
        <ReactionBar :ev="ev" />
      </div>
    </div>
    <p v-if="!loading && !events.length" class="hint">Nothing tagged yet.</p>
  </div>
</template>

<style scoped>
.tagview {
  display: grid;
  gap: 12px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  color: var(--ink);
  text-decoration: none;
  font-weight: 700;
}
.back svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.title {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.02em;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
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
