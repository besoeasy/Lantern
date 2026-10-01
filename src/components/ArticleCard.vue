<script setup>
import { shortPk, tagVal } from "@/lib/nostr.js";
defineProps({ ev: Object });
</script>

<template>
  <article class="card">
    <div class="k">Article</div>
    <h3>{{ tagVal(ev, "title") || "Untitled" }}</h3>
    <p class="sum" v-if="tagVal(ev, 'summary')">{{ tagVal(ev, "summary") }}</p>
    <p class="body">{{ ev.content.slice(0, 400) }}{{ ev.content.length > 400 ? "…" : "" }}</p>
    <RouterLink :to="`/profile/${ev.pubkey}`" class="pk">{{ shortPk(ev.pubkey) }}</RouterLink>
  </article>
</template>

<style scoped>
.card {
  background: #fffdf6;
  border: 1px solid #efe3bd;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 18px;
}
.k {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a16207;
  font-weight: 800;
}
h3 {
  margin: 8px 0 4px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 21px;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.sum {
  color: var(--ink-2);
  font-style: italic;
  font-size: 13.5px;
  margin: 0 0 8px;
}
.body {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  color: #292524;
  margin: 0;
}
.pk {
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-3);
  display: block;
  text-decoration: none;
}
</style>
