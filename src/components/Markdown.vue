<script setup>
import { computed } from "vue";
import { renderMarkdown } from "@/lib/markdown.js";

// Renders article Markdown for reading.
//
// The only thing that makes v-html acceptable here is that renderMarkdown()
// sanitizes with DOMPurify; see lib/markdown.js for the allow-list and for what
// it deliberately drops. Nothing else in the app uses v-html.
//
// `inline` renders as a flow-less span for one-line summaries, where block
// elements would break the surrounding layout.
const props = defineProps({
  source: { type: String, default: "" },
  inline: Boolean,
});

const html = computed(() => renderMarkdown(props.source));
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
  <div class="md" :class="{ inline }" v-html="html" />
</template>

<style scoped>
/* Article typography. Sized off the reading column rather than the card, so a
   feed card and the full post page share one scale.

   Everything below the root uses :deep(). The content arrives through v-html,
   and Vue only stamps its scope attribute onto elements it compiles in the
   template -- never onto injected ones. A plain `.md h1` would compile to
   `.md h1[data-v-xxx]`, which the rendered <h1> does not carry, so the rule
   would never match and the whole article would render unstyled. */
.md {
  font-size: 15.5px;
  line-height: 1.75;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.md.inline {
  font-size: 13.5px;
  line-height: 1.6;
}

.md :deep(> :first-child) {
  margin-top: 0;
}
.md :deep(> :last-child) {
  margin-bottom: 0;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4) {
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 1.6em 0 0.5em;
  color: var(--ink);
}
.md :deep(h1) {
  font-size: 1.5em;
}
.md :deep(h2) {
  font-size: 1.3em;
}
.md :deep(h3) {
  font-size: 1.12em;
}
.md :deep(h4) {
  font-size: 1em;
  font-family: var(--font);
  font-weight: 700;
}

.md :deep(p) {
  margin: 0 0 1.1em;
}
.md.inline :deep(p) {
  margin: 0;
  display: inline;
}

.md :deep(ul),
.md :deep(ol) {
  margin: 0 0 1.1em;
  padding-left: 1.4em;
}
.md :deep(li) {
  margin: 0.25em 0;
}
.md :deep(li > p) {
  margin-bottom: 0.4em;
}

.md :deep(blockquote) {
  margin: 1.2em 0;
  padding: 8px 0 8px 16px;
  background: var(--accent-soft);
  border-radius: 0 var(--r-xs) var(--r-xs) 0;
  color: var(--ink-2);
  font-style: italic;
}

.md :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--surface-sunken);
  border-radius: var(--r-xs);
  padding: 0.1em 0.35em;
}
.md :deep(pre) {
  margin: 1.2em 0;
  padding: 14px 15px;
  background: var(--surface-sunken);
  border-radius: var(--r-md);
  overflow-x: auto;
  line-height: 1.55;
}
.md :deep(pre code) {
  background: none;
  border: 0;
  padding: 0;
  font-size: 12.5px;
  color: var(--ink-2);
}

.md :deep(a) {
  color: var(--accent);
  text-underline-offset: 2px;
}
.md :deep(a:hover) {
  text-decoration: none;
}

.md :deep(hr) {
  margin: 1.8em 0;
  border: 0;
  height: 12px;
}

.md :deep(table) {
  width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  font-size: 0.92em;
  display: block;
  overflow-x: auto;
}
.md :deep(th),
.md :deep(td) {
  padding: 7px 10px;
  text-align: left;
}
.md :deep(tr + tr td) {
  border-top: 1px solid var(--surface-sunken);
}
.md :deep(th) {
  background: var(--surface-sunken);
  font-weight: 700;
}
</style>