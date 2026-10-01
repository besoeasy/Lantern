<script setup>
import { imetaList, shortPk, tagVal } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="card vid">
    <div class="head">
      <span class="badge">{{ ev.kind === 22 ? "REEL" : "VIDEO" }}</span>
      <strong>{{ tagVal(ev, "title") || "Untitled" }}</strong>
    </div>
    <IpfsMedia v-for="(m, i) in imetaList(ev)" :key="i" :src="m.url" kind="video" />
    <p class="desc">{{ ev.content }}</p>
    <div class="pk">{{ shortPk(ev.pubkey) }}</div>
  </article>
</template>

<style scoped>
.card {
  background: #000;
  color: #fff;
  border-radius: 16px;
  padding: 12px;
}
.head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.badge {
  font-size: 11px;
  background: #e50914;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 800;
}
.desc {
  font-size: 14px;
  color: #ddd;
  margin-top: 8px;
}
.pk {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
</style>
