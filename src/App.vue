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
  <div class="page">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="brand" aria-label="Lantern home">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>Lantern</span>
        </RouterLink>
        <nav class="tabs" aria-label="Primary">
          <RouterLink to="/" class="tab" :class="{ on: isHome }" aria-label="Home" title="Home">
            <House />
          </RouterLink>
          <RouterLink
            to="/compose"
            class="tab create"
            title="Create"
            aria-label="Create"
            :class="{ on: route.name === 'compose' }"
          >
            <Plus />
          </RouterLink>
          <RouterLink
            to="/profile"
            class="tab"
            :class="{ on: route.name === 'profile' }"
            aria-label="Profile"
            title="Profile"
          >
            <User />
          </RouterLink>
          <RouterLink
            to="/settings"
            class="tab"
            :class="{ on: route.name === 'settings' }"
            aria-label="Settings"
            title="Settings"
          >
            <Settings />
          </RouterLink>
        </nav>
      </div>
    </header>
    <div class="shell">
      <main class="main">
        <RouterView :key="route.fullPath" />
      </main>
    </div>
  </div>
</template>

<style>
/* Design tokens. Every colour, radius, shadow and duration in the app comes
   from here; component styles reference these and never hardcode a hex.
   Flat light only: no dark-mode block, the canvas is pure white. */
:root {
  color-scheme: light;

  /* Surfaces, back to front. Background is pure white everywhere. */
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-2: #ffffff;
  --surface-sunken: #f4f4f5;
  /* One card colour; replaces ad-hoc --card references. */
  --card: var(--surface);

  /* Text. --ink-3 is the faintest step that still clears WCAG AA (5.3:1) on
     --bg; the zinc grey one shade lighter sits at 4.4:1 and fails. */
  --ink: #09090b;
  --ink-2: #52525b;
  --ink-3: #656565;
  /* Text that sits on --ink buttons/avatars. */
  --on-ink: #ffffff;

  /* Lines and rings. */
  --line: rgba(9, 9, 11, 0.09);
  --line-strong: rgba(9, 9, 11, 0.16);

  /* Page rhythm. */
  --page-gap: 14px;
  --card-pad: 17px;

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
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: saturate(1.6) blur(16px);
  -webkit-backdrop-filter: saturate(1.6) blur(16px);
  padding-top: env(safe-area-inset-top);
}
.topbar-inner {
  max-width: 620px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
}
/* Vercel-style mark: black triangle-ish lockup, small and sharp. */
.brand-mark {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  background: var(--ink);
  flex: none;
}
/* Plain nav links; the active one is full-ink + underlined. */
.tabs {
  display: flex;
  align-items: center;
  gap: 18px;
}
.tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.005em;
  color: var(--ink-3);
  text-decoration: none;
  padding: 8px 2px;
  white-space: nowrap;
  transition: color var(--dur) var(--ease);
}
.tab svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.8;
}
.tab:hover {
  color: var(--ink);
}
.tab.on {
  color: var(--ink);
}
/* Create is the single solid button, the way Vercel uses a black CTA. */
.tab.create {
  background: var(--ink);
  color: var(--on-ink);
  font-weight: 600;
  border-radius: var(--r-full);
  padding: 7px 13px;
}
.tab.create:hover {
  color: var(--on-ink);
  opacity: 0.88;
}
.tab.create::after {
  display: none;
}
.tab.create svg {
  width: 15px;
  height: 15px;
  stroke-width: 2.2;
}
@media (max-width: 480px) {
  .tabs {
    gap: 14px;
  }
  .tab {
    padding: 8px 2px;
  }
  .tab.create {
    padding: 7px 11px;
  }
}
.shell {
  max-width: 620px;
  margin: 0 auto;
  min-height: 100vh;
}
.main {
  padding: 16px 16px 32px;
}

/* Surface container. The one card shape every screen uses: white surface,
   one radius, one shadow, one padding step. Views give it a local class but
   the token is shared so it cannot drift. */
.cardbox {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 17px;
}

/* Page header: one size/letter-spacing for the title, one for the lede. */
.pagehead h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.03em;
}
.pagehead p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}

/* Primary solid action (Post, Publish, Sign out, etc.). */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: var(--ink);
  color: var(--on-ink);
  border: 0;
  border-radius: var(--r-full);
  padding: 10px 22px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease);
}
.btn-primary:not(:disabled):active {
  transform: scale(0.97);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Secondary quiet pill (ghost in older screens). */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  color: var(--ink-2);
  border: 0;
  border-radius: var(--r-full);
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--surface-sunken);
  color: var(--ink);
}

/* Segmented control container: composer tabs, editor modes. */
.segbox {
  display: flex;
  gap: 2px;
  background: var(--surface-sunken);
  border-radius: var(--r-md);
  padding: 3px;
}

/* Inline meta chip: npub, website, badges. */
.chipbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-sunken);
  border-radius: var(--r-full);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
}

/* Shared text-field look. Composer, comments, the sign-in box and the two
   Settings lists each spelled out the same border/padding/focus rules; scoped
   styles meant they had to be copied into every one. */
.field {
  width: 100%;
  
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
