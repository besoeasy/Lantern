<script setup>
import { shortPk, tagVal } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="card">
    <div class="top">
      <div class="disc"><span /></div>
      <div>
        <div class="k">Track</div>
        <div class="mime">{{ tagVal(ev, "m") || "audio" }}</div>
      </div>
    </div>
    <IpfsMedia :src="tagVal(ev, 'url')" kind="audio" />
    <p class="cap">{{ ev.content }}</p>
    <RouterLink :to="`/profile/${ev.pubkey}`" class="pk">{{ shortPk(ev.pubkey) }}</RouterLink>
  </article>
</template>

<style scoped>
.card {
  background: linear-gradient(160deg, #18181b 0%, #27272a 60%, #3f3f46 100%);
  color: #fafafa;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.top {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.disc {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #fafafa 4px, transparent 5px), conic-gradient(#71717a, #3f3f46, #71717a);
  flex-shrink: 0;
}
.k {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a1a1aa;
}
.mime {
  font-size: 13px;
  font-weight: 600;
}
.card :deep(audio) {
  width: 100%;
  height: 36px;
  accent-color: #fafafa;
}
.cap {
  font-size: 13.5px;
  color: #e4e4e7;
  line-height: 1.6;
  margin: 10px 0 0;
}
.pk {
  font-size: 11.5px;
  color: #71717a;
  margin-top: 8px;
  display: block;
  text-decoration: none;
}
</style>
