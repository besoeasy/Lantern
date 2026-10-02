<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Braces, Copy, Hourglass, Link2 } from "@lucide/vue";
import { getEventById, expiryOf } from "@/lib/nostr.js";
import { countdownText } from "@/lib/format.js";
import { readingMinutes } from "@/lib/markdown.js";
import { useCopy } from "@/composables/useCopy.js";
import BackBar from "@/components/BackBar.vue";
import PostCard from "@/components/PostCard.vue";
import ArticleReader from "@/components/ArticleReader.vue";
import CommentSection from "@/components/CommentSection.vue";
import ReactionBar from "@/components/ReactionBar.vue";

const route = useRoute();
const ev = ref(null);
const loading = ref(true);
const err = ref("");
const showRaw = ref(false);
const now = ref(Date.now());
let ticker = null;

const rawJson = computed(() => (ev.value ? JSON.stringify(ev.value, null, 2) : ""));

// Long-form gets its own reader; every other kind uses the feed card.
const isArticle = computed(() => ev.value?.kind === 30023);

const expiryMs = computed(() => {
  const sec = expiryOf(ev.value);
  return sec > 0 ? sec * 1000 : 0;
});

// Live D/H/M countdown till the post is gone (NIP-40 expiry)
const expiryText = computed(() =>
  expiryMs.value ? countdownText(expiryMs.value - now.value) : "",
);

function startTicker() {
  stopTicker();
  ticker = setInterval(() => (now.value = Date.now()), 30000);
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

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

onMounted(() => {
  load(route.params.id);
  startTicker();
});
onUnmounted(stopTicker);
watch(
  () => route.params.id,
  (id) => load(id),
);

function shareUrl() {
  return `${location.origin}${location.pathname}#/post/${route.params.id}`;
}

const { copied, copy: copyText } = useCopy();
const { copied: copiedShare, copy: copyUrl } = useCopy();

function copyRaw() {
  copyText(rawJson.value, "Copy raw event JSON:");
}

function copyShare() {
  copyUrl(shareUrl(), "Copy shareable URL:");
}
</script>

<template>
  <div class="post">
    <BackBar>
      <button class="share" @click="copyShare" :title="shareUrl()">
        <Link2 />
        <code>{{ shareUrl() }}</code>
        <span class="copied" v-if="copiedShare">Copied!</span>
      </button>
    </BackBar>
    <p v-if="loading" class="hint">Loading post…</p>
    <p v-else-if="err" class="hint">{{ err }}</p>
    <template v-else-if="ev">
      <!-- An article is shown in full rather than through its feed card: the
           card clamps to three lines, which is right in a feed and useless on
           the page the reader asked for. -->
      <ArticleReader v-if="isArticle" :ev="ev" />
      <PostCard v-else :ev="ev" />
      <ReactionBar :ev="ev" />
      <div class="meta-row">
        <div v-if="expiryText" class="expiry" :class="{ gone: expiryText === 'Expired' }">
          <Hourglass />
          <span>{{ expiryText }}</span>
        </div>
        <button class="raw-toggle" @click="showRaw = !showRaw">
          <Braces />
          <span>{{ showRaw ? "Hide raw JSON" : "Raw JSON" }}</span>
        </button>
      </div>
      <div v-if="showRaw" class="raw">
        <div class="raw-head">
          <span class="raw-label">Raw event</span>
          <button class="raw-copy" @click="copyRaw">
            <Copy />
            <span>{{ copied ? "Copied!" : "Copy" }}</span>
          </button>
        </div>
        <pre class="raw-body"><code>{{ rawJson }}</code></pre>
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
.share {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  background: var(--surface);
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-full);
  box-shadow: var(--shadow-sm);
  padding: 8px 14px;
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
  font-family: inherit;
  transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease);
}
.share:hover {
  border-style: solid;
  border-color: var(--ink-3);
  color: var(--ink);
}
.share svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke-width: 1.9;
}
.share code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
  font-family: var(--font-mono);
}
.share .copied {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--success);
}
.expiry {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 6px 14px;
  border-radius: var(--r-full);
  font-variant-numeric: tabular-nums;
}
.expiry svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
}
.expiry.gone {
  color: var(--danger);
  border-color: var(--danger-line);
  background: var(--danger-bg);
}
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.meta-row .raw-toggle {
  margin-left: auto;
}
.raw {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.raw-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px 8px 14px;
  border-bottom: 1px solid var(--line);
}
.raw-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-2);
}
.raw-toggle,
.raw-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  padding: 7px 14px;
  border-radius: var(--r-full);
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.raw-toggle:hover,
.raw-copy:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}
.raw-toggle svg,
.raw-copy svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
}
.raw-body {
  margin: 0;
  padding: 12px 14px;
  max-height: 320px;
  overflow: auto;
  font-size: 11.5px;
  line-height: 1.5;
  font-family: var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--ink-2);
  background: var(--surface-2);
}
</style>
