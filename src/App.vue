<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const tab = computed(() => route.query.tab || 'all')
const isActive = (t) => (t === 'all' ? tab.value === 'all' || !route.query.tab : tab.value === t)
</script>

<template>
  <div class="shell">
    <header class="top">
      <RouterLink to="/" class="brand">🏮 Lantern</RouterLink>
      <div class="tag">nostr · ipfs · pow 5</div>
    </header>
    <main class="main">
      <RouterView :key="route.fullPath" />
    </main>
    <nav class="tabs">
      <RouterLink to="/" class="tab" :class="{ on: isActive('all') }">
        <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>
        <span>Home</span>
      </RouterLink>
      <RouterLink to="/?tab=pics" class="tab" :class="{ on: isActive('pics') }">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.3"/></svg>
        <span>Photos</span>
      </RouterLink>
      <a href="#composer" class="tab create" title="Create">
        <span class="plus">+</span>
      </a>
      <RouterLink to="/?tab=videos" class="tab" :class="{ on: isActive('videos') }">
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9.5 5 2.5-5 2.5Z"/></svg>
        <span>Reels</span>
      </RouterLink>
      <RouterLink to="/?tab=music" class="tab" :class="{ on: isActive('music') }">
        <svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v11.5"/><circle cx="6.8" cy="18" r="2.6"/><circle cx="16.8" cy="15.5" r="2.6"/></svg>
        <span>Music</span>
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
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.shell {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 92px;
}
.top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: rgba(246, 246, 247, 0.75);
  backdrop-filter: saturate(1.6) blur(16px);
  -webkit-backdrop-filter: saturate(1.6) blur(16px);
  border-bottom: 1px solid var(--line);
}
.brand {
  font-weight: 800;
  font-size: 17px;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
}
.tag {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
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
  fill: none;
  stroke: currentColor;
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
  font-size: 26px;
  font-weight: 300;
  line-height: 1;
  color: #fff;
  background: var(--ink);
  border-radius: 50%;
  box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
}
</style>
