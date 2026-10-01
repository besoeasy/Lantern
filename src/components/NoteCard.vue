<script setup>
import { imetaList, shortPk } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";

defineProps({ ev: Object });

function time(t) {
  const d = new Date(t * 1000);
  const h = Math.floor((Date.now() - d) / 36e5);
  if (h < 1) return "now";
  if (h < 24) return `${h}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
</script>

<template>
  <article class="card">
    <div class="row">
      <div class="avatar">{{ ev.pubkey.slice(0, 1).toUpperCase() }}</div>
      <div class="meta">
        <RouterLink :to="`/profile/${ev.pubkey}`" class="pk">{{ shortPk(ev.pubkey) }}</RouterLink>
        <span class="time">{{ time(ev.created_at) }}</span>
      </div>
    </div>
    <p class="text">{{ ev.content }}</p>
    <div v-for="(m, i) in imetaList(ev)" :key="i" class="att">
      <IpfsMedia
        v-if="m.url"
        :src="m.url"
        :kind="(m.m || '').startsWith('video') ? 'video' : 'img'"
      />
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 15px 16px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a0a0a, #52525b);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
}
.meta {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 13px;
}
.pk {
  color: var(--ink);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
}
.time {
  color: var(--ink-3);
}
.text {
  margin: 10px 0 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 14.5px;
  letter-spacing: -0.005em;
}
.att {
  margin-top: 10px;
}
</style>
