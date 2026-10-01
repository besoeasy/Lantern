<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowLeft, Braces, Copy, Hourglass, Link2 } from "@lucide/vue";
import { getEventById, expiryOf } from "@/lib/nostr.js";
import { useCopy } from "@/composables/useCopy.js";
import PostCard from "@/components/PostCard.vue";
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

const expiryMs = computed(() => {
  const sec = expiryOf(ev.value);
  return sec > 0 ? sec * 1000 : 0;
});

// Live D/H/M countdown till the post is gone (NIP-40 expiry)
const expiryText = computed(() => {
  if (!expiryMs.value) return "";
  let s = Math.max(0, Math.floor((expiryMs.value - now.value) / 1000));
  if (s <= 0) return "Expired";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  const parts = [];
  if (d) parts.push(`${d}D`);
  if (h || d) parts.push(`${h}H`);
  if (m || (!d && !h)) parts.push(`${m}M`);
  if (!parts.length) parts.push(`${s}S`);
  return `${parts.join(" ")} left`;
});

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
    <div class="topbar">
      <RouterLink to="/" class="back">
        <ArrowLeft />
        <span>Back to feed</span>
      </RouterLink>
      <button class="share" @click="copyShare" :title="shareUrl()">
        <Link2 />
        <code>{{ shareUrl() }}</code>
        <span class="copied" v-if="copiedShare">Copied!</span>
      </button>
    </div>
    <p v-if="loading" class="hint">Loading post…</p>
    <p v-else-if="err" class="hint">{{ err }}</p>
    <template v-else-if="ev">
      <PostCard :ev="ev" />
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
.share {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 100%;
  background: var(--card);
  border: 1px dashed var(--line);
  border-radius: 99px;
  box-shadow: var(--shadow);
  padding: 7px 14px;
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
  font-family: inherit;
}
.share:hover {
  border-style: solid;
  color: var(--ink);
}
.share svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.share code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}
.share .copied {
  flex-shrink: 0;
  font-weight: 700;
  color: #15803d;
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
  background: var(--card);
  padding: 6px 14px;
  border-radius: 99px;
  font-variant-numeric: tabular-nums;
}
.expiry svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.expiry.gone {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
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
