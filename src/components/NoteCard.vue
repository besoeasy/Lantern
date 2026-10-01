<script setup>
import { imetaList, shortPk, tagVal } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";

defineProps({ ev: Object });

function time(t) {
  return new Date(t * 1000).toLocaleString();
}
</script>

<template>
  <article class="card tweet">
    <div class="row">
      <div class="avatar">{{ ev.pubkey.slice(0, 2) }}</div>
      <div class="meta">
        <span class="pk">{{ shortPk(ev.pubkey) }}</span>
        <span class="time">· {{ time(ev.created_at) }}</span>
        <span class="kind">· k{{ ev.kind }}</span>
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
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  padding: 14px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #111;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  text-transform: uppercase;
}
.meta {
  font-size: 13px;
  color: #666;
}
.pk {
  color: #111;
  font-weight: 600;
}
.text {
  margin: 10px 0;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 15px;
}
.att {
  margin-top: 8px;
}
</style>
