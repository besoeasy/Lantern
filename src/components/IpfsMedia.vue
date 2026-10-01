<script setup>
import { ref, watch } from "vue";
import { ipfsObjectUrl } from "@/lib/ipfs.js";

const props = defineProps({ src: String, kind: { type: String, default: "img" } });
const objUrl = ref("");
const err = ref("");

watch(
  () => props.src,
  async (s) => {
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
      err.value = "IPFS fetch failed";
    }
  },
  { immediate: true },
);
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
    <div v-else-if="err" class="media-err">{{ err }} · {{ src }}</div>
    <div v-else class="media-loading">loading ipfs…</div>
  </div>
</template>

<style scoped>
.media img,
.media video {
  width: 100%;
  display: block;
  border-radius: 12px;
  background: #111;
  max-height: 560px;
  object-fit: cover;
}
.media audio {
  width: 100%;
}
.media-loading,
.media-err {
  padding: 24px;
  text-align: center;
  color: #888;
  background: #111;
  border-radius: 12px;
  font-size: 13px;
}
</style>
