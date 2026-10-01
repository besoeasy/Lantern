<script setup>
import { computed } from "vue";
import NoteCard from "./NoteCard.vue";
import PictureCard from "./PictureCard.vue";
import VideoCard from "./VideoCard.vue";
import ArticleCard from "./ArticleCard.vue";
import MusicCard from "./MusicCard.vue";
import HashtagPills from "./HashtagPills.vue";

// Which card renders each event kind. Supporting a new post type means adding
// one entry here plus the component, instead of repeating a v-if chain in
// every view that lists events.
const BY_KIND = {
  1: NoteCard,
  20: PictureCard,
  21: VideoCard,
  22: VideoCard,
  30023: ArticleCard,
  1063: MusicCard,
  36787: MusicCard,
};

const props = defineProps({
  ev: { type: Object, required: true },
  hashtags: Boolean,
});

const card = computed(() => BY_KIND[props.ev.kind]);
</script>

<template>
  <component :is="card" v-if="card" :ev="ev" />
  <HashtagPills v-if="hashtags" :ev="ev" />
</template>