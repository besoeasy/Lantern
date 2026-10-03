<script setup>
import { computed } from "vue";
import { tagVal } from "@/lib/nostr.js";
import { excerpt, readingMinutes } from "@/lib/markdown.js";
import AuthorLink from "./AuthorLink.vue";
import Markdown from "./Markdown.vue";

// A kind-30023 article in a feed. Shows the author's own summary when there is
// one, because a hand-written hook reads better than anything derived from the
// body; otherwise the first lines of the post, rendered as Markdown.
const props = defineProps({ ev: Object });

const title = computed(() => tagVal(props.ev, "title") || "Untitled");
const summary = computed(() => tagVal(props.ev, "summary"));
const minutes = computed(() => readingMinutes(props.ev?.content));
// Plain text, not HTML: this feeds the meta line rather than being rendered.
const lead = computed(() => (summary.value ? "" : excerpt(props.ev?.content, 180)));
</script>

<template>
  <article class="cardbox">
    <div class="k">Article · {{ minutes }} min</div>
    <h3>{{ title }}</h3>
    <Markdown v-if="summary" class="sum" inline :source="summary" />
    <Markdown v-else-if="lead" class="lead" inline :source="lead" />
    <AuthorLink :pubkey="ev.pubkey" />
  </article>
</template>

<style scoped>
.cardbox {
  background: var(--article-bg);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 18px;
}
.k {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 800;
}
h3 {
  margin: 8px 0 6px;
  font-family: var(--font-serif);
  font-size: 21px;
  letter-spacing: -0.02em;
  line-height: 1.25;
  color: var(--ink);
}
/* The card is a teaser, not the article: clamp it so one long post cannot
   take over the feed. */
.sum,
.lead {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--ink-2);
  font-size: 13.5px;
  margin: 0 0 10px;
}
.lead {
  font-style: normal;
}
.pk {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-3);
  display: block;
  text-decoration: none;
}
.pk:hover {
  text-decoration: underline;
}
</style>