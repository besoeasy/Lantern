<script setup>
import { shortPk, tagVal } from "@/lib/nostr.js";
import IpfsMedia from "./IpfsMedia.vue";
defineProps({ ev: Object });
</script>

<template>
  <article class="card music">
    <div class="k">🎵 MUSIC · k1063</div>
    <div class="mime">{{ tagVal(ev, "m") }}</div>
    <IpfsMedia :src="tagVal(ev, 'url')" kind="audio" />
    <p>{{ ev.content }}</p>
    <div class="pk">{{ shortPk(ev.pubkey) }}</div>
  </article>
</template>

<style scoped>
.card {
  background: linear-gradient(180deg, #1a1a2e, #16213e);
  color: #fff;
  border-radius: 16px;
  padding: 16px;
}
.k {
  font-size: 12px;
  font-weight: 800;
}
.mime {
  font-size: 12px;
  color: #0f0;
  margin: 4px 0 8px;
}
p {
  font-size: 14px;
  margin-top: 10px;
}
.pk {
  font-size: 12px;
  color: #aaa;
}
</style>
