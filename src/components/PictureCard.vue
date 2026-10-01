<script setup>
import { imetaList, shortPk, tagVal } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="card ig">
    <header>
      <div class="avatar">{{ ev.pubkey.slice(0, 2) }}</div>
      <div>
        <div class="pk">{{ shortPk(ev.pubkey) }}</div>
        <div class="title">{{ tagVal(ev, "title") }}</div>
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
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  overflow: hidden;
}
header {
  display: flex;
  gap: 10px;
  padding: 12px;
  align-items: center;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
}
.pk {
  font-weight: 700;
  font-size: 13px;
}
.title {
  font-size: 12px;
  color: #666;
}
.gallery {
  display: grid;
  gap: 4px;
}
.caption {
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
}
</style>
