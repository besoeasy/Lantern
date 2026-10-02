<script setup>
import { computed, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import { House, Plus, Settings, User } from "@lucide/vue";
import { useUserStore } from "@/stores/user.js";

const route = useRoute();
const user = useUserStore();
const tab = computed(() => route.query.tab || "all");
const isHome = computed(
  () => route.name === "home" && (tab.value === "all" || !route.query.tab),
);

// If a NIP-07 signer is present, log in silently — no login banners needed.
onMounted(() => user.autoLogin());
</script>

<template>
  <div class="shell">
    <main class="main">
      <RouterView :key="route.fullPath" />
    </main>
    <nav class="tabs">
      <RouterLink to="/" class="tab" :class="{ on: isHome }">
        <House />
        <span>Home</span>
      </RouterLink>
      <RouterLink to="/compose" class="tab create" title="Create" :class="{ on: route.name === 'compose' }">
        <span class="plus"><Plus /></span>
      </RouterLink>
      <RouterLink to="/profile" class="tab" :class="{ on: route.name === 'profile' }">
        <User />
        <span>Profile</span>
      </RouterLink>
      <RouterLink to="/settings" class="tab" :class="{ on: route.name === 'settings' }">
        <Settings />
        <span>Settings</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style>
/* Design tokens. Every colour, radius, shadow and duration in the app comes
   from here; component styles reference these and never hardcode a hex.
   The dark block below remaps the same names, so a component needs no
   dark-mode rules of its own. */
:root {
  color-scheme: light;

  /* Surfaces, back to front. */
  --bg: #f4f4f5;
  --surface: #ffffff;
  --surface-2: #fafafa;
  --surface-sunken: #ececee;

  /* Text. --ink-3 is the faintest step that still clears WCAG AA (5.3:1) on
     --bg; the zinc grey one shade lighter sits at 4.4:1 and fails. */
  --ink: #09090b;
  --ink-2: #52525b;
  --ink-3: #656565;
  --ink-on-accent: #ffffff;

  /* Lines and rings. */
  --line: rgba(9, 9, 11, 0.09);
  --line-strong: rgba(9, 9, 11, 0.16);

  /* Accent + status. Amber "lantern" is the brand, used sparingly. */
  --accent: #b45309;
  --accent-soft: #fef3c7;
  --danger: #dc2626;
  --danger-bg: #fef2f2;
  --danger-line: #fecaca;
  --success: #15803d;
  --success-bg: #f0fdf4;
  --success-line: #bbf7d0;
  --info: #1d4ed8;
  --info-bg: #dbeafe;

  /* Article card: the one surface that keeps a warm cast in both schemes. */
  --article-bg: #fffdf6;
  --article-line: #efe3bd;

  /* Video and music cards are dark in both schemes, so they cannot read the
     themed ink steps -- in light mode --ink-2 on near-black would be
     unreadable. These four are fixed light-on-dark pairs instead. */
  --media-bg: #09090b;
  --media-line: rgba(255, 255, 255, 0.09);
  --media-ink: #fafafa;
  --media-ink-2: #a1a1aa;
  --media-ink-3: #71717a;
  --media-chrome: #18181b;

  /* Shape. Four radii cover every surface in the app. */
  --r-xs: 8px;
  --r-sm: 12px;
  --r-md: 14px;
  --r-lg: 18px;
  --r-full: 999px;

  --shadow-sm: 0 1px 2px rgba(9, 9, 11, 0.05);
  --shadow: 0 1px 2px rgba(9, 9, 11, 0.04), 0 8px 24px -14px rgba(9, 9, 11, 0.16);
  --shadow-lg: 0 2px 6px rgba(9, 9, 11, 0.06), 0 18px 40px -18px rgba(9, 9, 11, 0.24);

  /* Motion. One easing curve and one duration keep feedback consistent. */
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --dur: 180ms;

  /* Type. */
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "Segoe UI", Roboto,
    sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;

    --bg: #09090b;
    --surface: #18181b;
    --surface-2: #1d1d20;
    --surface-sunken: #27272a;

    --ink: #fafafa;
    --ink-2: #a1a1aa;
    --ink-3: #8b8b95;
    --ink-on-accent: #09090b;

    --line: rgba(250, 250, 250, 0.11);
    --line-strong: rgba(250, 250, 250, 0.2);

    --accent: #fbbf24;
    --accent-soft: #422c06;
    --danger: #f87171;
    --danger-bg: #2a1214;
    --danger-line: #7f1d1d;
    --success: #4ade80;
    --success-bg: #0d2317;
    --success-line: #14532d;
    --info: #93c5fd;
    --info-bg: #172554;

    --article-bg: #1c1917;
    --article-line: #3b3026;

    /* Shadows read as a faint lightening on dark, not a darkening. */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -14px rgba(0, 0, 0, 0.7);
    --shadow-lg: 0 2px 6px rgba(0, 0, 0, 0.5), 0 18px 40px -18px rgba(0, 0, 0, 0.8);
  }
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  overflow-x: clip;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Keyboard focus must be visible everywhere; pointer focus should not draw a
   ring, which is why this is :focus-visible and not :focus.
   Text fields are excluded: browsers match :focus-visible on them even when
   clicked, so a ring there reads as an error state. They get the softer
   .field treatment below instead. */
:where(a, button, select, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-xs);
}
:where(input, textarea):focus-visible {
  outline: none;
}

/* Opt every animation out for readers who asked the OS to reduce motion. The
   skeleton shimmer is the one that actually matters — it runs forever. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
.shell {
  max-width: 620px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}
.main {
  padding: 16px 16px 0;
}
.tabs {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 572px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  backdrop-filter: saturate(1.8) blur(24px);
  -webkit-backdrop-filter: saturate(1.8) blur(24px);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: 7px 8px;
  z-index: 20;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ink-3);
  text-decoration: none;
  padding: 6px 14px;
  border-radius: var(--r-sm);
  transition: color var(--dur) var(--ease);
}
.tab svg {
  width: 23px;
  height: 23px;
  stroke-width: 1.8;
  transition: transform var(--dur) var(--ease);
}
.tab.on {
  color: var(--ink);
}
/* The icon carries the active state; the label is too small to tint reliably. */
.tab.on svg {
  transform: translateY(-1px);
}
.tab:active svg {
  transform: scale(0.92);
}
.tab.create {
  padding: 0;
}
.plus {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  color: var(--ink-on-accent);
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 6px 18px -6px color-mix(in srgb, var(--accent) 70%, transparent);
  transition: transform var(--dur) var(--ease);
}
.plus svg {
  width: 24px;
  height: 24px;
  stroke-width: 2.4;
}
.tab.create:active .plus {
  transform: scale(0.92);
}

/* The shared text-field look. Composer, comments, the sign-in box and the two
   Settings lists each spelled out the same border/padding/focus rules; scoped
   styles meant they had to be copied into every one. */
.field {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: var(--ink);
  background: var(--surface);
  outline: none;
  min-width: 0;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.field::placeholder {
  color: var(--ink-3);
}
/* Focus reads as a soft ring rather than a hard outline, so it does not look
   like a validation error next to a genuinely red field. */
.field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* The centred grey line under an empty or loading list. Four screens spelled
   out this same block; scoped styles meant it had to be copied each time. */
.hint {
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
  padding: 8px 0;
}

/* Loading shimmer. Used by the profile skeleton and by media placeholders,
   which each used to spell out the same gradient and keyframes. */
.sk {
  background: linear-gradient(
    100deg,
    var(--surface-sunken) 30%,
    var(--surface-2) 45%,
    var(--surface-sunken) 60%
  );
  background-size: 200% 100%;
  animation: sh 1.4s infinite linear;
}
@keyframes sh {
  to {
    background-position: -200% 0;
  }
}
</style>
