<script setup>
import { ArrowLeft } from "@lucide/vue";

// "Back to feed" row shared by the post, tag and profile screens. The
// trailing slot carries whatever the screen puts on the right (a share
// button, a page title).
defineProps({
  title: { type: String, default: "" },
});
</script>

<template>
  <div class="topbar">
    <RouterLink to="/" class="back">
      <ArrowLeft />
      <span>Back to feed</span>
    </RouterLink>
    <h1 v-if="title" class="title">{{ title }}</h1>
    <slot />
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  color: var(--ink);
  text-decoration: none;
  font-weight: 700;
}
.back svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}
.title {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.02em;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
</style>