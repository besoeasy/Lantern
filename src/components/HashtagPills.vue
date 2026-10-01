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
  border-radius: 99px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border: 1px solid var(--line);
  background: var(--card);
  padding: 4px 12px;
  max-width: 160px;
}
.light .pill:hover {
  color: var(--ink);
  border-color: rgba(0, 0, 0, 0.28);
}
.light .more {
  font-size: 12px;
  color: var(--ink-3);
}

/* Dark variant: sits inside the music/video card backgrounds. */
.row.dark {
  margin-top: 4px;
}
.dark .pill {
  font-size: 11.5px;
  color: #d4d4d8;
  background: rgba(250, 250, 250, 0.08);
  padding: 3px 10px;
  max-width: 140px;
}
.dark .pill:hover {
  background: rgba(250, 250, 250, 0.16);
}
.dark .more {
  font-size: 11.5px;
  color: #71717a;
  align-self: center;
}
</style>