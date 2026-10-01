<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { subscribeTag } from "@/lib/nostr.js";
import { ensureRelays } from "@/lib/relays.js";
import { getCachedTag } from "@/lib/db.js";
import { useEventList } from "@/composables/useEventList.js";
import BackBar from "@/components/BackBar.vue";
import PostCard from "@/components/PostCard.vue";
import ReactionBar from "@/components/ReactionBar.vue";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const { items: events, add, reset } = useEventList();
let sub = null;

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}

watch(
  () => route.params.tag,
  async (tag) => {
    sub?.close?.();
    sub = null;
    reset();
    if (!tag) return;
    loading.value = true;
    const cached = await getCachedTag(tag).catch(() => []);
    cached.forEach(add);
    loading.value = false;
    await ensureRelays();
    sub = subscribeTag(tag, add, 100);
  },
  { immediate: true },
);

onUnmounted(() => sub?.close?.());
</script>

<template>
  <div class="tagview">
    <BackBar :title="`#${route.params.tag}`" />
    <p v-if="loading" class="hint">Syncing relays…</p>
    <div class="list">
      <div
        class="postwrap"
        v-for="ev in events"
        :key="ev.id"
        role="link"
        tabindex="0"
        @click="openPost($event, ev.id)"
        @keydown.enter="goPost(ev.id)"
        @keydown.space.prevent="goPost(ev.id)"
      >
        <PostCard :ev="ev" />
        <ReactionBar :ev="ev" />
      </div>
    </div>
    <p v-if="!loading && !events.length" class="hint">Nothing tagged yet.</p>
  </div>
</template>

<style scoped>
.tagview {
  display: grid;
  gap: 12px;
}
.list {
  display: grid;
  gap: 14px;
}
.postwrap {
  display: grid;
  cursor: pointer;
  border-radius: var(--radius);
}
.postwrap:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
