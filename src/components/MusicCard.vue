<script setup>
import { computed } from "vue";
import { Music as MusicNoteIcon } from "@lucide/vue";
import { tagVal, formatDuration } from "@/lib/nostr.js";
import AuthorLink from "./AuthorLink.vue";
import IpfsMedia from "./IpfsMedia.vue";
import HashtagPills from "./HashtagPills.vue";

const props = defineProps({ ev: Object });
const ev = computed(() => props.ev);

// New-style addressable track (kind 36787, Amethyst-compatible)
const cover = computed(() => (ev.value.kind === 36787 ? tagVal(ev.value, "image") : ""));
const audioSrc = computed(() => tagVal(ev.value, "url"));
const title = computed(() => tagVal(ev.value, "title"));
const artist = computed(() => tagVal(ev.value, "artist"));
const album = computed(() => tagVal(ev.value, "album"));
const trackNo = computed(() => tagVal(ev.value, "track_number"));
const released = computed(() => tagVal(ev.value, "released"));
const duration = computed(() => formatDuration(tagVal(ev.value, "duration")));
const explicit = computed(() => tagVal(ev.value, "explicit") === "true");

const metaLine = computed(() => {
  if (ev.value.kind !== 36787) return "";
  const parts = [];
  if (album.value) parts.push(album.value + (trackNo.value ? ` · #${trackNo.value}` : ""));
  else if (trackNo.value) parts.push(`#${trackNo.value}`);
  if (released.value) parts.push(released.value);
  if (duration.value) parts.push(duration.value);
  return parts.join(" · ");
});
</script>

<template>
  <article class="card">
    <template v-if="ev.kind === 36787">
      <div class="stack">
        <div class="cover">
          <IpfsMedia v-if="cover" :src="cover" kind="img" />
          <div v-else class="cover-fallback"><MusicNoteIcon /></div>
        </div>
        <IpfsMedia v-if="audioSrc" :src="audioSrc" kind="audio" class="player" />
      </div>
      <div class="body">
        <div v-if="title" class="title">{{ title }}</div>
        <div v-if="artist" class="artist"><MusicNoteIcon /><span>{{ artist }}</span></div>
        <div v-if="metaLine || explicit" class="meta">
          <span v-if="metaLine">{{ metaLine }}</span>
          <span v-if="explicit" class="e">E</span>
        </div>
        <p v-if="ev.content" class="desc">{{ ev.content }}</p>
        <HashtagPills :ev="ev" variant="dark" />
      </div>
    </template>
    <template v-else>
      <div class="top">
        <div class="disc"><span /></div>
        <div>
          <div class="k">Track</div>
          <div class="mime">{{ tagVal(ev, "m") || "audio" }}</div>
        </div>
      </div>
      <IpfsMedia :src="tagVal(ev, 'url')" kind="audio" />
      <p class="cap">{{ ev.content }}</p>
    </template>
    <AuthorLink :pubkey="ev.pubkey" />
  </article>
</template>

<style scoped>
/* Dark in both schemes, so it reads the --media-* ink pairs, not --ink-*.
   The gradient carries the warmth that makes a track card feel distinct from
   a video card. */
.card {
  background: linear-gradient(160deg, #18181b 0%, #27272a 60%, #3f3f46 100%);
  color: var(--media-ink);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 16px;
  border: 1px solid var(--media-line);
}
.stack {
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--media-bg);
}
.cover :deep(.media img) {
  border-radius: 0;
  aspect-ratio: 1 / 1;
  max-height: 320px;
}
.cover-fallback {
  aspect-ratio: 16 / 7;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #27272a, #3f3f46);
}
.cover-fallback svg {
  width: 40px;
  height: 40px;
  stroke-width: 1.4;
  color: var(--media-ink-3);
}
.player :deep(audio) {
  width: 100%;
  height: 40px;
  accent-color: var(--media-ink);
  display: block;
}
.body {
  padding: 12px 2px 0;
  display: grid;
  gap: 5px;
}
.title {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.artist {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--media-ink-2);
}
.artist svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  stroke-width: 2;
  color: var(--media-ink-3);
}
.artist span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--media-ink-3);
}
.meta .e {
  font-size: 10px;
  font-weight: 800;
  color: var(--media-ink);
  background: rgba(250, 250, 250, 0.14);
  border-radius: var(--r-xs);
  padding: 1px 5px;
}
.desc {
  font-size: 13.5px;
  color: var(--media-ink-2);
  line-height: 1.6;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.top {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}
.disc {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background:
    radial-gradient(circle, #fafafa 4px, transparent 5px), conic-gradient(#71717a, #3f3f46, #71717a);
  flex-shrink: 0;
}
.k {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--media-ink-3);
}
.mime {
  font-size: 13px;
  font-weight: 600;
}
.card :deep(audio) {
  width: 100%;
  height: 36px;
  accent-color: var(--media-ink);
}
.cap {
  font-size: 13.5px;
  color: var(--media-ink-2);
  line-height: 1.6;
  margin: 10px 0 0;
  overflow-wrap: anywhere;
}
.pk {
  font-size: 11.5px;
  color: var(--media-ink-3);
  margin-top: 8px;
  display: block;
  text-decoration: none;
}
.pk:hover {
  color: var(--media-ink-2);
  text-decoration: underline;
}
</style>
