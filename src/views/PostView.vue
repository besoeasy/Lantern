<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import { getEventById } from "@/lib/nostr.js";
import NoteCard from "@/components/NoteCard.vue";
import PictureCard from "@/components/PictureCard.vue";
import VideoCard from "@/components/VideoCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import MusicCard from "@/components/MusicCard.vue";
import CommentSection from "@/components/CommentSection.vue";

const route = useRoute();
const ev = ref(null);
const loading = ref(true);
const err = ref("");

async function load(id) {
  loading.value = true;
  err.value = "";
  ev.value = null;
  try {
    const found = await getEventById(id);
    if (!found) err.value = "Post not found on relays.";
    else ev.value = found;
  } catch (e) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(route.params.id));
watch(
  () => route.params.id,
  (id) => load(id),
);

function shareUrl() {
  return `${location.origin}${location.pathname}#/post/${route.params.id}`;
}
</script>

<template>
  <div class="post">
    <RouterLink to="/" class="back">
      <ArrowLeft />
      <span>Back to feed</span>
    </RouterLink>
    <p v-if="loading" class="hint">Loading post…</p>
    <p v-else-if="err" class="hint">{{ err }}</p>
    <template v-else-if="ev">
      <NoteCard v-if="ev.kind === 1" :ev="ev" />
      <PictureCard v-else-if="ev.kind === 20" :ev="ev" />
      <VideoCard v-else-if="ev.kind === 21 || ev.kind === 22" :ev="ev" />
      <ArticleCard v-else-if="ev.kind === 30023" :ev="ev" />
      <MusicCard v-else-if="ev.kind === 1063" :ev="ev" />
      <div class="share">
        <span>Shareable URL:</span>
        <code>{{ shareUrl() }}</code>
      </div>
      <CommentSection :root="ev" />
    </template>
  </div>
</template>

<style scoped>
.post {
  display: grid;
  gap: 12px;
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
.share {
  background: var(--card);
  border: 1px dashed var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 12px 14px;
  font-size: 12px;
  word-break: break-all;
  color: var(--ink-2);
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
