<script setup>
import { shortPk, tagVal } from "@/lib/nostr.js";
defineProps({ ev: Object });
</script>

<template>
  <article class="card blog">
    <div class="k">ARTICLE · k30023</div>
    <h3>{{ tagVal(ev, "title") || "Untitled" }}</h3>
    <p class="sum">{{ tagVal(ev, "summary") }}</p>
    <p class="body">{{ ev.content.slice(0, 400) }}{{ ev.content.length > 400 ? "…" : "" }}</p>
    <div class="pk">{{ shortPk(ev.pubkey) }}</div>
  </article>
</template>

<style scoped>
.card {
  background: #fffdf5;
  border: 1px solid #eee3c0;
  border-radius: 16px;
  padding: 16px;
}
.k {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #a08000;
  font-weight: 800;
}
h3 {
  margin: 6px 0;
}
.sum {
  color: #666;
  font-style: italic;
  font-size: 14px;
}
.body {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.pk {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}
</style>
