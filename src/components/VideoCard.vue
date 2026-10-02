<script setup>
import { imetaList, tagVal } from "@/lib/nostr.js";
import AuthorLink from "./AuthorLink.vue";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="card">
    <div class="head">
      <span class="badge">{{ ev.kind === 22 ? "Reel" : "Video" }}</span>
      <strong class="t">{{ tagVal(ev, "title") || "Untitled" }}</strong>
    </div>
    <div class="vids">
      <IpfsMedia v-for="(m, i) in imetaList(ev)" :key="i" :src="m.url" kind="video" />
    </div>
    <p class="desc">{{ ev.content }}</p>
    <AuthorLink :pubkey="ev.pubkey" />
  </article>
</template>

<style scoped>
.card {
  background: var(--media-bg);
  color: var(--media-ink);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 14px;
  border: 1px solid var(--media-line);
}
.head {
  display: flex;
  gap: 9px;
  align-items: center;
  margin-bottom: 10px;
}
.badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--media-ink);
  color: var(--media-bg);
  padding: 3px 9px;
  border-radius: var(--r-full);
  flex-shrink: 0;
}
.t {
  font-size: 14px;
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vids {
  display: grid;
  gap: 8px;
}
.vids :deep(.media video) {
  border-radius: var(--r-sm);
}
.desc {
  font-size: 13px;
  color: var(--media-ink-2);
  line-height: 1.6;
  margin: 10px 0 0;
  overflow-wrap: anywhere;
}
.pk {
  font-size: 11.5px;
  color: var(--media-ink-3);
  margin-top: 6px;
  display: block;
  text-decoration: none;
}
.pk:hover {
  color: var(--media-ink-2);
  text-decoration: underline;
}
</style>
