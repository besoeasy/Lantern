<script setup>
import { RouterView } from "vue-router";
</script>

<template>
  <div class="shell">
    <header class="top">
      <div class="brand">🏮 Lantern</div>
      <div class="tag">nostr · ipfs-only · POW:5</div>
    </header>
    <main class="main">
      <RouterView />
    </main>
    <nav class="bottom">
      <span class="active">Home</span>
      <span>Reels</span>
      <span>Blog</span>
      <span>Music</span>
    </nav>
  </div>
</template>

<style>
:root {
  --bg: #fafafa;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  font-family:
    -apple-system,
    system-ui,
    Segoe UI,
    Roboto,
    sans-serif;
  color: #111;
}
.shell {
  max-width: 620px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 64px;
}
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e6e6e6;
}
.brand {
  font-weight: 900;
  font-size: 18px;
}
.tag {
  font-size: 11px;
  color: #888;
}
.main {
  padding: 12px;
}
.bottom {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 620px;
  display: flex;
  justify-content: space-around;
  background: #fff;
  border-top: 1px solid #e6e6e6;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #888;
}
.bottom .active {
  color: #111;
}
</style>
