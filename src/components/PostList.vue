<script setup>
import { useRouter } from "vue-router";
import PostCard from "./PostCard.vue";
import ReactionBar from "./ReactionBar.vue";

// The event list loop shared by the feed, tag timeline and author timeline:
// card + reaction bar per event, whole row clickable. Wrapping the row in a
// component also gives it its own scope for .list/.postwrap, which all three
// screens had written out identically.
defineProps({
  events: { type: Array, required: true },
  // Show hashtag pills under the card (feed only).
  hashtags: Boolean,
});

const router = useRouter();

function goPost(id) {
  router.push(`/post/${id}`);
}

// Media controls (video/audio) and any nested control keep their own behavior.
function openPost(e, id) {
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}
</script>

<template>
  <div class="list">
    <div
      v-for="ev in events"
      :key="ev.id"
      class="postwrap"
      role="link"
      tabindex="0"
      @click="openPost($event, ev.id)"
      @keydown.enter="goPost(ev.id)"
      @keydown.space.prevent="goPost(ev.id)"
    >
      <PostCard :ev="ev" :hashtags="hashtags" />
      <ReactionBar :ev="ev" />
    </div>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 14px;
}
.postwrap {
  display: grid;
  cursor: pointer;
  border-radius: var(--r-lg);
  transition: transform var(--dur) var(--ease);
}
/* Pressing a card should feel like pressing it, but only for pointers — the
   :focus-visible ring in App.vue owns the keyboard case. */
.postwrap:active {
  transform: scale(0.985);
}
</style>