<script setup>
import { computed, ref, watch } from "vue";
import { CalendarDays, Clock } from "@lucide/vue";
import { tagVal } from "@/lib/nostr.js";
import { readingMinutes, withoutTitleHeading } from "@/lib/markdown.js";
import { resolveMediaUrl } from "@/lib/ipfs.js";
import { relTime } from "@/lib/format.js";
import AuthorLink from "./AuthorLink.vue";
import Markdown from "./Markdown.vue";

// The full reading view for a kind-30023 article: title, meta, optional cover,
// then the whole body rendered as Markdown.
//
// ArticleCard is the feed version and clamps to three lines; this is the same
// content without the clamp, plus the parts of the event that only matter once
// someone has committed to reading.
const props = defineProps({ ev: { type: Object, required: true } });

const cover = ref("");
const coverFailed = ref(false);

// Resolve the cover image from IPFS. The URL is ipfs:// (plan.md spec 4), so
// it has to become a blob before an <img> can load it.
watch(
  () => tagVal(props.ev, "image"),
  async (url) => {
    cover.value = "";
    coverFailed.value = false;
    if (!url) return;
    const resolved = await resolveMediaUrl(url);
    if (resolved) cover.value = resolved;
    else coverFailed.value = true;
  },
  { immediate: true },
);

const title = computed(() => tagVal(props.ev, "title") || "Untitled");
const minutes = computed(() => readingMinutes(props.ev?.content));
const published = computed(() => tagVal(props.ev, "published_at"));
// An article that repeats its own title as a leading H1 would otherwise show
// that title twice, in two typefaces.
const body = computed(() => withoutTitleHeading(props.ev?.content, title.value));
</script>

<template>
  <article class="reader">
    <header>
      <div class="k">Article · {{ minutes }} min read</div>
      <h1>{{ title }}</h1>
      <div class="meta">
        <AuthorLink :pubkey="ev.pubkey" />
        <span class="dot">·</span>
        <span :title="relTime(ev.created_at)">
          <CalendarDays />{{ new Date(ev.created_at * 1000).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) }}
        </span>
        <template v-if="published">
          <span class="dot">·</span>
          <span><Clock />Updated {{ relTime(Number(published)) }}</span>
        </template>
      </div>
    </header>

    <img v-if="cover" class="cover" :src="cover" alt="" loading="lazy" />
    <p v-else-if="coverFailed" class="nocover">Cover image could not be fetched from IPFS.</p>

    <Markdown class="body" :source="body" />
  </article>
</template>

<style scoped>
/* The reading measure. Narrower than the feed card on purpose: long-form is
   comfortable at roughly 68 characters, and the extra width is better spent
   here than on margins. */
.reader {
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}
header {
  padding: 22px 24px 18px;
}
.k {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 800;
}
h1 {
  margin: 8px 0 10px;
  font-family: var(--font-serif);
  font-size: 28px;
  letter-spacing: -0.025em;
  line-height: 1.18;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ink-3);
}
.meta > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meta svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.9;
}
.dot {
  color: var(--ink-3);
}
/* AuthorLink is a child component, so the parent's scoped .pk rule still lands
   on its root element. Without this the link falls back to the UA's blue. */
.pk {
  color: var(--ink-2);
  font-weight: 600;
  text-decoration: none;
}
.pk:hover {
  color: var(--ink);
  text-decoration: underline;
}
.cover {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  background: var(--media-bg);
}
.nocover {
  margin: 0;
  padding: 10px 24px;
  font-size: 12.5px;
  color: var(--ink-3);
  background: var(--surface-2);
}
.body {
  padding: 22px 24px 26px;
}
</style>