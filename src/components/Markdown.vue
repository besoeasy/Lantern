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
   feed card and the full post page share one scale. */
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

.md > :first-child {
  margin-top: 0;
}
.md > :last-child {
  margin-bottom: 0;
}

.md h1,
.md h2,
.md h3,
.md h4 {
  font-family: var(--font-serif);
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 1.6em 0 0.5em;
  color: var(--ink);
}
.md h1 {
  font-size: 1.6em;
}
.md h2 {
  font-size: 1.35em;
}
.md h3 {
  font-size: 1.15em;
}
.md h4 {
  font-size: 1em;
  font-family: var(--font);
  font-weight: 700;
}

.md p {
  margin: 0 0 1.1em;
}
.md.inline p {
  margin: 0;
  display: inline;
}

.md ul,
.md ol {
  margin: 0 0 1.1em;
  padding-left: 1.4em;
}
.md li {
  margin: 0.25em 0;
}
.md li > p {
  margin-bottom: 0.4em;
}

.md blockquote {
  margin: 1.2em 0;
  padding: 2px 0 2px 16px;
  border-left: 3px solid var(--accent);
  color: var(--ink-2);
  font-style: italic;
}

.md code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  padding: 0.1em 0.35em;
}
.md pre {
  margin: 1.2em 0;
  padding: 14px 15px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow-x: auto;
  line-height: 1.55;
}
.md pre code {
  background: none;
  border: 0;
  padding: 0;
  font-size: 12.5px;
  color: var(--ink-2);
}

.md a {
  color: var(--accent);
  text-underline-offset: 2px;
}
.md a:hover {
  text-decoration: none;
}

.md hr {
  margin: 1.8em 0;
  border: 0;
  border-top: 1px solid var(--line);
}

.md table {
  width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  font-size: 0.92em;
  display: block;
  overflow-x: auto;
}
.md th,
.md td {
  border: 1px solid var(--line);
  padding: 7px 10px;
  text-align: left;
}
.md th {
  background: var(--surface-2);
  font-weight: 700;
}
</style>