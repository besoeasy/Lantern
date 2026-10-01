<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { subscribeReactions, postReaction } from "@/lib/nostr.js";
import { useUserStore } from "@/stores/user.js";

const props = defineProps({ ev: Object });
const user = useUserStore();

const PRESETS = ["❤️", "🔥", "👍", "🎉", "😮", "😢"];
const all = ref([]);
const seen = new Set();
const busy = ref("");
const msg = ref("");
let sub = null;

function add(ev) {
  if (!isFresh(ev)) return;
  if (seen.has(ev.id)) return;
  seen.add(ev.id);
  all.value.push(ev);
}

// Skip anything already expired (relays shouldn't serve these, but be safe).
function isFresh(ev) {
  const exp = (ev.tags || []).find(([t]) => t === "expiration")?.[1];
  return !exp || Number(exp) > Math.floor(Date.now() / 1000);
}

watch(
  () => props.ev?.id,
  (id) => {
    sub?.close?.();
    sub = null;
    all.value = [];
    seen.clear();
    msg.value = "";
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
  msg.value = "";
  if (!user.pubkey) {
    msg.value = "Login to react.";
    return;
  }
  if (mine.value.has(emoji)) return;
  busy.value = emoji;
  try {
    await postReaction(props.ev, emoji, user.pubkey);
  } catch (e) {
    msg.value = "Failed: " + e.message;
  } finally {
    busy.value = "";
  }
}
</script>

<template>
  <div class="reacts" @click.stop>
    <button
      v-for="e in PRESETS"
      :key="e"
      class="r"
      :class="{ on: mine.has(e) }"
      :disabled="!!busy"
      :title="`React ${e}`"
      @click.stop="react(e)"
    >
      <span>{{ e }}</span>
      <span v-if="counts[e]" class="n">{{ counts[e] }}</span>
    </button>
    <span v-if="busy" class="hint">…</span>
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
.r {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  line-height: 1;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 5px 11px;
  border-radius: 99px;
  cursor: pointer;
}
.r:hover:not(:disabled) {
  border-color: rgba(0, 0, 0, 0.28);
}
.r:disabled {
  opacity: 0.6;
  cursor: default;
}
.r.on {
  border-color: var(--ink);
  background: var(--ink);
}
.n {
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-2);
}
.r.on .n {
  color: #fff;
}
.hint,
.msg {
  font-size: 12px;
  color: var(--ink-3);
}
</style>
