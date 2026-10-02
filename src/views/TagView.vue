<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { subscribeTag } from "@/lib/nostr.js";
import { ensureRelays } from "@/lib/relays.js";
import { getCachedTag } from "@/lib/db.js";
import { useEventList } from "@/composables/useEventList.js";
import BackBar from "@/components/BackBar.vue";
import PostList from "@/components/PostList.vue";

const route = useRoute();
const loading = ref(true);
const { items: events, add, reset } = useEventList();
let sub = null;

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
    <PostList :events="events" />
    <p v-if="!loading && !events.length" class="hint">Nothing tagged yet.</p>
  </div>
</template>

<style scoped>
.tagview {
  display: grid;
  gap: 12px;
}
</style>
