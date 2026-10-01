<script setup>
import { imetaList, shortPk, tagVal } from "@/lib/nostr.js";
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
    <RouterLink :to="`/profile/${ev.pubkey}`" class="pk">{{ shortPk(ev.pubkey) }}</RouterLink>
  </article>
</template>

<style scoped>
.card {
  background: #09090b;
  color: #fafafa;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  background: #fff;
  color: #09090b;
  padding: 3px 9px;
  border-radius: 99px;
}
.t {
  font-size: 14px;
  letter-spacing: -0.01em;
}
.vids {
  display: grid;
  gap: 8px;
}
.vids :deep(.media video) {
  border-radius: 12px;
}
.desc {
  font-size: 13px;
  color: #d4d4d8;
  line-height: 1.6;
  margin: 10px 0 0;
}
.pk {
  font-size: 11.5px;
  color: #71717a;
  margin-top: 6px;
  display: block;
  text-decoration: none;
}
</style>
