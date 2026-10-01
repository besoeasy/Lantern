<script setup>
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import { House, Images, Clapperboard, Music, Plus, Settings } from "@lucide/vue";

const route = useRoute();
const tab = computed(() => route.query.tab || "all");
const isActive = (t) => (t === "all" ? tab.value === "all" || !route.query.tab : tab.value === t);
</script>

<template>
  <div class="shell">
    <main class="main">
      <RouterView :key="route.fullPath" />
    </main>
    <nav class="tabs">
      <RouterLink to="/" class="tab" :class="{ on: isActive('all') }">
        <House />
        <span>Home</span>
      </RouterLink>
      <RouterLink to="/?tab=pics" class="tab" :class="{ on: isActive('pics') }">
        <Images />
        <span>Photos</span>
      </RouterLink>
      <RouterLink to="/compose" class="tab create" title="Create" :class="{ on: route.name === 'compose' }">
        <span class="plus"><Plus /></span>
      </RouterLink>
      <RouterLink to="/?tab=videos" class="tab" :class="{ on: isActive('videos') }">
        <Clapperboard />
        <span>Reels</span>
      </RouterLink>
      <RouterLink to="/?tab=music" class="tab" :class="{ on: isActive('music') }">
        <Music />
        <span>Music</span>
      </RouterLink>
      <RouterLink to="/settings" class="tab" :class="{ on: route.name === 'settings' }">
        <Settings />
        <span>Settings</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style>
:root {
  --bg: #f6f6f7;
  --card: #ffffff;
  --ink: #0a0a0a;
  --ink-2: #52525b;
  --ink-3: #a1a1aa;
  --line: rgba(0, 0, 0, 0.08);
  --radius: 18px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px -12px rgba(0, 0, 0, 0.12);
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family:
    -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.shell {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 92px;
}
.main {
  padding: 14px 14px 0;
}
.tabs {
  position: fixed;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 28px);
  max-width: 560px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(1.6) blur(20px);
  -webkit-backdrop-filter: saturate(1.6) blur(20px);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow);
  padding: 8px 6px;
  z-index: 20;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-3);
  text-decoration: none;
  padding: 4px 12px;
  border-radius: 14px;
}
.tab svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.tab.on {
  color: var(--ink);
}
.tab.create {
  padding: 0;
}
.plus {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--ink);
  border-radius: 50%;
  box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
}
.plus svg {
  width: 24px;
  height: 24px;
  stroke-width: 2.2;
}
</style>
