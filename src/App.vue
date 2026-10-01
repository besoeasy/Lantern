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
    <header class="top">
      <RouterLink to="/" class="brand">🏮 Lantern</RouterLink>
      <div class="top-right">
        <div class="tag">nostr · ipfs · pow 5</div>
        <a
          href="https://github.com/besoeasy/Lantern"
          target="_blank"
          rel="noopener"
          class="gh"
          title="Source on GitHub"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
          </svg>
        </a>
      </div>
    </header>
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
.top-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gh {
  display: grid;
  place-items: center;
  color: var(--ink-2);
  text-decoration: none;
  padding: 4px;
  border-radius: 8px;
}
.gh:hover {
  color: var(--ink);
  background: rgba(0, 0, 0, 0.05);
}
.gh svg {
  width: 18px;
  height: 18px;
  display: block;
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
