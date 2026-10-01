<script setup>
import { ref, watch } from "vue";
import { ipfsObjectUrl } from "@/lib/ipfs.js";

const props = defineProps({ src: String, kind: { type: String, default: "img" } });
const objUrl = ref("");
const err = ref("");
const attempt = ref(0);

async function load(s) {
  objUrl.value = "";
  err.value = "";
  if (!s) return;
  if (!s.startsWith("ipfs://")) {
    objUrl.value = s;
    return;
  }
  try {
    objUrl.value = await ipfsObjectUrl(s);
  } catch (e) {
    err.value = e?.name === "TimeoutError" ? "IPFS fetch timed out" : e?.message || "Could not fetch from IPFS";
  }
}

watch(() => [props.src, attempt.value], () => load(props.src), { immediate: true });

function retry() {
  attempt.value++;
}
</script>

<template>
  <div class="media">
    <img v-if="kind === 'img' && objUrl" :src="objUrl" loading="lazy" />
    <video
      v-else-if="kind === 'video' && objUrl"
      :src="objUrl"
      controls
      playsinline
      preload="metadata"
    />
    <audio v-else-if="kind === 'audio' && objUrl" :src="objUrl" controls preload="metadata" />
    <div v-else-if="err" class="state err">
      <span>{{ err }}</span>
      <button class="retry" @click.stop="retry">Retry</button>
    </div>
    <div v-else class="state shimmer" />
  </div>
</template>

<style scoped>
.media img,
.media video {
  width: 100%;
  display: block;
  border-radius: 14px;
  background: #101013;
  max-height: 560px;
  object-fit: cover;
}
.media audio {
  width: 100%;
}
.state {
  border-radius: 14px;
  min-height: 120px;
  display: grid;
  place-items: center;
  font-size: 12.5px;
}
.shimmer {
  background: linear-gradient(100deg, #ececee 30%, #f7f7f8 45%, #ececee 60%);
  background-size: 200% 100%;
  animation: sh 1.4s infinite linear;
}
@keyframes sh {
  to {
    background-position: -200% 0;
  }
}
.err {
  color: var(--ink-3);
  background: var(--bg);
  border: 1px dashed var(--line);
  padding: 20px;
  gap: 10px;
}
.retry {
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink);
  border-radius: 99px;
  padding: 7px 18px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
</style>
