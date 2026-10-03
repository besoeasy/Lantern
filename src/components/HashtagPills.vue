<script setup>
import { computed } from "vue";
import { displayHashtags } from "@/lib/nostr.js";

const props = defineProps({
  ev: { type: Object, required: true },
  variant: { type: String, default: "light" },
});

const tags = computed(() => displayHashtags(props.ev));
</script>

<template>
  <div v-if="tags.shown.length" class="row" :class="variant">
    <RouterLink
      v-for="t in tags.shown"
      :key="t"
      :to="`/tag/${encodeURIComponent(t)}`"
      class="pill"
    >
      #{{ t }}
    </RouterLink>
    <span v-if="tags.extra" class="more">+{{ tags.extra }}</span>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.pill {
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--r-full);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.more {
  font-weight: 600;
}

/* Light variant: sits under a post on the normal card background. */
.row.light {
  padding: 8px 4px 0;
}
.light .pill {
  font-size: 12px;
  color: var(--ink-2);
  background: var(--surface);
  padding: 4px 12px;
  max-width: 160px;
}
.light .pill:hover {
  color: var(--ink);
  border-color: var(--line-strong);
  background: var(--surface-sunken);
}
.light .more {
  font-size: 12px;
  color: var(--ink-3);
}

/* Dark variant: sits inside the music/video card backgrounds, which stay dark
   in both colour schemes — so these read the --media-* ink pairs, and the
   white overlay tints rather than a themed surface. */
.row.dark {
  margin-top: 4px;
}
.dark .pill {
  font-size: 11.5px;
  color: var(--media-ink-2);
  background: rgba(250, 250, 250, 0.08);
  padding: 3px 10px;
  max-width: 140px;
}
.dark .pill:hover {
  color: var(--media-ink);
  background: rgba(250, 250, 250, 0.16);
}
.dark .more {
  font-size: 11.5px;
  color: var(--media-ink-3);
  align-self: center;
}
</style>