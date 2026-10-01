<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Braces, Copy } from "@lucide/vue";
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
const showRaw = ref(false);
const copied = ref(false);

const rawJson = computed(() => (ev.value ? JSON.stringify(ev.value, null, 2) : ""));

async function load(id) {
  loading.value = true;
  err.value = "";
  ev.value = null;
  showRaw.value = false;
  copied.value = false;
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

async function copyRaw() {
  copied.value = false;
  try {
    await navigator.clipboard.writeText(rawJson.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    prompt("Copy raw event JSON:", rawJson.value);
  }
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
      <div class="raw">
        <div class="raw-head">
          <button class="raw-toggle" @click="showRaw = !showRaw">
            <Braces />
            <span>{{ showRaw ? "Hide raw JSON" : "Show raw JSON" }}</span>
          </button>
          <button v-if="showRaw" class="raw-copy" @click="copyRaw">
            <Copy />
            <span>{{ copied ? "Copied!" : "Copy" }}</span>
          </button>
        </div>
        <pre v-if="showRaw" class="raw-body"><code>{{ rawJson }}</code></pre>
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
.raw {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.raw-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
}
.raw-toggle,
.raw-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-2);
  padding: 6px 14px;
  border-radius: 99px;
  cursor: pointer;
}
.raw-toggle {
  color: var(--ink);
  background: var(--card);
}
.raw-toggle svg,
.raw-copy svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.raw-body {
  margin: 0;
  border-top: 1px solid var(--line);
  padding: 12px 14px;
  max-height: 320px;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--ink-2);
  background: var(--bg);
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
