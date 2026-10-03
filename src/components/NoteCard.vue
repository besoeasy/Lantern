<script setup>
import { imetaList } from "@/lib/nostr.js";
import { relTime, initialOf } from "@/lib/format.js";
import AuthorLink from "./AuthorLink.vue";
import IpfsMedia from "./IpfsMedia.vue";

defineProps({ ev: Object });
</script>

<template>
  <article class="card">
    <div class="row">
      <div class="avatar">{{ initialOf(ev.pubkey) }}</div>
      <div class="meta">
        <AuthorLink :pubkey="ev.pubkey" />
        <span class="time">{{ relTime(ev.created_at) }}</span>
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
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 16px 17px;
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
  background: linear-gradient(135deg, var(--ink), var(--ink-3));
  color: var(--on-ink);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}
.meta {
  display: flex;
  gap: 7px;
  align-items: baseline;
  font-size: 13px;
  min-width: 0;
}
.pk {
  color: var(--ink);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
}
.pk:hover {
  text-decoration: underline;
}
.time {
  color: var(--ink-3);
  flex-shrink: 0;
}
.text {
  margin: 10px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  font-size: 14.5px;
  letter-spacing: -0.005em;
}
.att {
  margin-top: 10px;
}
</style>
