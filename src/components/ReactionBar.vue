<script setup>
import { computed, onUnmounted, watch } from "vue";
import { subscribeReactions, postReaction, expiryOf } from "@/lib/nostr.js";
import { useEventList } from "@/composables/useEventList.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useUserStore } from "@/stores/user.js";

const props = defineProps({ ev: Object });
const user = useUserStore();

const PRESETS = ["❤️", "🔥", "👍", "🎉", "😮", "😢"];

// Skip anything already expired (relays shouldn't serve these, but be safe).
function isFresh(ev) {
  const exp = expiryOf(ev);
  return !exp || exp > Math.floor(Date.now() / 1000);
}

// Arrival order: only the per-emoji counts are shown, so no sort is needed.
const { items: all, add, reset } = useEventList({ order: null, guard: isFresh });
// busyKey holds the emoji in flight; busy covers the whole bar. The sign-in
// gate lives in the composable, so signing out needs no check here.
const { busyKey, msg, isBusy, run, clear } = useAsyncAction({
  pubkey: () => user.pubkey,
});
let sub = null;

watch(
  () => props.ev?.id,
  (id) => {
    sub?.close?.();
    sub = null;
    reset();
    clear();
    if (!id) return;
    sub = subscribeReactions(props.ev, add);
  },
  { immediate: true },
);

onUnmounted(() => sub?.close?.());

const counts = computed(() => {
  const m = {};
  for (const r of all.value) m[r.content] = (m[r.content] || 0) + 1;
  return m;
});

const mine = computed(
  () => new Set(all.value.filter((r) => r.pubkey === user.pubkey).map((r) => r.content)),
);

async function react(emoji) {
  if (mine.value.has(emoji)) return;
  await run(() => postReaction(props.ev, emoji, user.pubkey), emoji);
}
</script>

<template>
  <div class="reacts" @click.stop>
    <button
      v-for="e in PRESETS"
      :key="e"
      class="r"
      :class="{ on: mine.has(e) }"
      :disabled="isBusy()"
      :title="`React ${e}`"
      @click.stop="react(e)"
    >
      <span>{{ e }}</span>
      <span v-if="counts[e]" class="n">{{ counts[e] }}</span>
    </button>
    <span v-if="busyKey" class="hint">…</span>
    <span v-if="msg" class="msg">{{ msg }}</span>
  </div>
</template>

<style scoped>
.reacts {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 4px 0;
}
/* PostList passes a `reacts` class to sit this bar flush against the bottom of
   a card, but a scoped rule in the parent cannot reach into this component's
   internals -- only its root. So the box model lives here. */
.reacts {
  margin-top: -1px;
  padding: 3px 10px 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-top: 0;
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}
.r {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  line-height: 1;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 6px 12px;
  border-radius: var(--r-full);
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.r:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--surface-sunken);
}
.r:not(:disabled):active {
  transform: scale(0.93);
}
.r:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.r.on {
  border-color: var(--ink);
  background: var(--ink);
}
.r.on:hover {
  background: var(--ink);
}
.n {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-2);
}
.r.on .n {
  color: var(--on-ink);
}
/* Every message this bar can show comes from useAsyncAction: either a publish
   failure or the sign-in refusal, so all of them are error-toned. */
.hint {
  font-size: 12px;
  color: var(--ink-3);
}
.msg {
  font-size: 12px;
  line-height: 1.55;
  color: var(--danger);
}
</style>
