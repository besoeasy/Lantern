<script setup>
import { imetaList, tagVal } from "@/lib/nostr.js";
import { initialOf } from "@/lib/format.js";
import AuthorLink from "./AuthorLink.vue";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="cardbox">
    <header>
      <div class="ring">
        <div class="avatar">{{ initialOf(ev.pubkey) }}</div>
      </div>
      <div class="who">
        <AuthorLink :pubkey="ev.pubkey" />
        <div class="title" v-if="tagVal(ev, 'title')">{{ tagVal(ev, "title") }}</div>
      </div>
    </header>
    <div class="gallery">
      <IpfsMedia v-for="(m, i) in imetaList(ev)" :key="i" :src="m.url" kind="img" />
    </div>
    <p class="caption">{{ ev.content }}</p>
  </article>
</template>

<style scoped>
.cardbox {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}
header {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  align-items: center;
}
/* The Instagram-style ring is a fixed brand gradient, so it stays literal in
   both schemes; only the inner disc follows the theme. */
.ring {
  padding: 2px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--ink);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
  border: 2px solid var(--surface);
}
.pk {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.01em;
  display: block;
  color: inherit;
  text-decoration: none;
}
.pk:hover {
  text-decoration: underline;
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
  overflow-wrap: anywhere;
}
</style>
