<script setup>
import { imetaList, shortPk, tagVal } from '@/lib/nostr.js'
import IpfsMedia from './IpfsMedia.vue'
defineProps({ ev: Object })
</script>

<template>
  <article class="card">
    <header>
      <div class="ring">
        <div class="avatar">{{ ev.pubkey.slice(0, 1).toUpperCase() }}</div>
      </div>
      <div class="who">
        <div class="pk">{{ shortPk(ev.pubkey) }}</div>
        <div class="title" v-if="tagVal(ev, 'title')">{{ tagVal(ev, 'title') }}</div>
      </div>
    </header>
    <div class="gallery">
      <IpfsMedia v-for="(m, i) in imetaList(ev)" :key="i" :src="m.url" kind="img" />
    </div>
    <p class="caption">{{ ev.content }}</p>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}
header {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  align-items: center;
}
.ring {
  padding: 2px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  color: var(--ink);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  border: 2px solid #fff;
}
.pk {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.01em;
}
.title {
  font-size: 12px;
  color: var(--ink-2);
}
.gallery {
  display: grid;
  gap: 2px;
}
.gallery :deep(.media img) {
  border-radius: 0;
}
.caption {
  padding: 12px 14px;
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
}
</style>
