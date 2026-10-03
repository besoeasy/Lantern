<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { BadgeCheck, BadgeX, Copy, Globe, Zap } from "@lucide/vue";
import { getAuthorProfile, meetsPow, subscribeAuthorPosts } from "@/lib/nostr.js";
import { npubOf, resolvePk, shortNpub, shortPk } from "@/lib/identity.js";
import { verifyNip05 } from "@/lib/nip05.js";
import { FEED_KINDS, ensureRelays } from "@/lib/relays.js";
import { getCachedAuthorPosts } from "@/lib/db.js";
import { resolveMediaUrl } from "@/lib/ipfs.js";
import { initialOf } from "@/lib/format.js";
import { useCopy } from "@/composables/useCopy.js";
import { useEventList } from "@/composables/useEventList.js";
import { useUserStore } from "@/stores/user.js";
import BackBar from "@/components/BackBar.vue";
import PostList from "@/components/PostList.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";

const route = useRoute();
const user = useUserStore();

const pk = ref("");
const profile = ref({});
const nip05State = ref(""); // "", "ok", "bad"
const avatarUrl = ref("");
const bannerUrl = ref("");
const loadingProfile = ref(true);
const loadingPosts = ref(true);
const { copied: copiedNpub, copy: copyText } = useCopy();
const { items: events, add, reset: resetEvents } = useEventList({ guard: meetsPow });
let sub = null;

// Empty route id means "my own profile", which needs a session to resolve.
function pkFromRoute(input) {
  if (!input) return user.pubkey || "";
  return resolvePk(input);
}

function copyNpub() {
  copyText(npubOf(pk.value), "Copy npub:");
}

function hasInfo(p) {
  return !!(p.name || p.display_name || p.about || p.picture || p.nip05 || p.website || p.lud16 || p.lud06);
}

watch(
  [() => route.params.id, () => user.pubkey],
  async ([id]) => {
    sub?.close?.();
    sub = null;
    resetEvents();
    profile.value = {};
    nip05State.value = "";
    avatarUrl.value = "";
    bannerUrl.value = "";
    pk.value = pkFromRoute(id);
    if (!pk.value) {
      loadingProfile.value = false;
      loadingPosts.value = false;
      return;
    }
    loadingProfile.value = true;
    loadingPosts.value = true;
    try {
      profile.value = await getAuthorProfile(pk.value);
    } catch {
      profile.value = {};
    } finally {
      loadingProfile.value = false;
    }
    avatarUrl.value = await resolveMediaUrl(profile.value.picture);
    bannerUrl.value = await resolveMediaUrl(profile.value.banner);
    if (profile.value.nip05) {
      verifyNip05(profile.value.nip05, pk.value)
        .then((ok) => (nip05State.value = ok ? "ok" : "bad"))
        .catch(() => (nip05State.value = "bad"));
    }
    const cached = await getCachedAuthorPosts(pk.value, FEED_KINDS).catch(() => []);
    cached.forEach(add);
    loadingPosts.value = false;
    await ensureRelays();
    sub = subscribeAuthorPosts(pk.value, add);
  },
  { immediate: true },
);

onUnmounted(() => sub?.close?.());
</script>

<template>
  <div class="profile">
    <BackBar title="Profile" />

    <!-- No v-if="!pk" here: signing in from this screen sets pk, which would
         unmount the prompt mid-flow and take a new key's only backup copy with it. -->
    <LoginPrompt
      ignore-signer
      title="Sign in to see your profile"
      subtitle="Use an extension or a key, or open someone's profile via link."
    />

    <template v-if="pk">
      <section v-if="loadingProfile" class="card skeleton">
        <div class="banner sk"></div>
        <div class="who">
          <div class="avatar sk"></div>
          <div class="names">
            <strong class="skline sk"></strong>
            <span class="skline short sk"></span>
          </div>
        </div>
      </section>
      <section v-else class="card">
        <div class="banner">
          <img v-if="bannerUrl" :src="bannerUrl" alt="" />
          <div v-else class="banner-fallback"></div>
        </div>
        <div class="who">
          <div class="avatar">
            <img v-if="avatarUrl" :src="avatarUrl" alt="" />
            <span v-else>{{ initialOf(profile.display_name || profile.name) }}</span>
          </div>
          <div class="names">
            <strong>{{ profile.display_name || profile.name || shortPk(pk) }}</strong>
            <span v-if="profile.name && profile.display_name !== profile.name" class="handle">
              @{{ profile.name }}
            </span>
            <span v-else class="handle">{{ shortPk(pk) }}</span>
          </div>
          <button class="npub" @click="copyNpub" :title="npubOf(pk)">
            <Copy />
            <span>{{ copiedNpub ? "Copied!" : shortNpub(pk) }}</span>
          </button>
        </div>
        <p v-if="profile.about" class="about">{{ profile.about }}</p>
        <p v-else-if="!hasInfo(profile)" class="empty">
          No profile info published yet — set a name, avatar and bio from any Nostr client.
        </p>
        <div class="stats">
          <span><strong>{{ events.length }}</strong> {{ events.length === 1 ? "post" : "posts" }}</span>
        </div>
        <div class="meta">
          <span v-if="profile.nip05" class="m">
            <BadgeCheck v-if="nip05State === 'ok'" class="ok" />
            <BadgeX v-else-if="nip05State === 'bad'" class="bad" />
            {{ profile.nip05 }}
          </span>
          <span v-if="profile.lud16 || profile.lud06" class="m">
            <Zap />
            {{ profile.lud16 || "⚡ available" }}
          </span>
          <a v-if="profile.website" :href="profile.website" target="_blank" rel="noopener" class="m link">
            <Globe />
            {{ profile.website.replace(/^https?:\/\//, "") }}
          </a>
        </div>
      </section>

      <p v-if="loadingPosts" class="hint">Loading posts…</p>
      <PostList :events="events" />
      <p v-if="!loadingPosts && !events.length" class="hint">No Lantern posts yet.</p>
    </template>
  </div>
</template>

<style scoped>
.profile {
  display: grid;
  gap: 12px;
}
.card {
  background: var(--surface);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.banner img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
  background: var(--bg);
}
.banner-fallback {
  height: 120px;
  background: linear-gradient(120deg, var(--ink) 0%, var(--ink-3) 55%, var(--ink-2) 100%);
}
.skeleton .banner.sk {
  height: 120px;
}
.skline {
  display: block;
  height: 16px;
  width: 140px;
  border-radius: var(--r-xs);
}
.skline.short {
  height: 12px;
  width: 90px;
}
.skeleton .avatar.sk {
  border-color: var(--surface);
}
.who {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 0;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--ink), var(--ink-3));
  color: var(--on-ink);
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 800;
  margin-top: -30px;
  border: 3px solid var(--surface);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.names {
  display: grid;
  gap: 1px;
  min-width: 0;
}
.names strong {
  font-size: 16px;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.handle {
  font-size: 12.5px;
  color: var(--ink-3);
}
.npub {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--ink-2);
  background: var(--surface-2);
  padding: 6px 12px;
  border-radius: var(--r-full);
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.npub:hover {
  color: var(--ink);
  border-color: var(--line-strong);
  background: var(--surface-sunken);
}
.npub svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.9;
}
.empty {
  margin: 12px 16px 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--ink-3);
  background: var(--surface-2);
  border-radius: var(--r-sm);
  padding: 11px 13px;
}
.stats {
  display: flex;
  gap: 14px;
  padding: 10px 16px 0;
  font-size: 12.5px;
  color: var(--ink-3);
}
.stats strong {
  color: var(--ink);
}
.about {
  margin: 10px 16px 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-2);
  white-space: pre-wrap;
  word-break: break-word;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 10px 16px 14px;
}
.m {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
}
.m svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
}
.m .ok {
  color: var(--success);
}
.m .bad {
  color: var(--danger);
}
.m.link {
  color: var(--ink);
  text-decoration: none;
}
.m.link:hover {
  text-decoration: underline;
}
</style>
