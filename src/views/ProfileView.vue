<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { BadgeCheck, BadgeX, Copy, Globe, Zap } from "@lucide/vue";
import { nip19 } from "nostr-tools";
import {
  getAuthorProfile,
  subscribeAuthorPosts,
  shortPk,
} from "@/lib/nostr.js";
import { FEED_KINDS, ensureRelays } from "@/lib/relays.js";
import { getCachedAuthorPosts } from "@/lib/db.js";
import { ipfsObjectUrl } from "@/lib/ipfs.js";
import { useCopy } from "@/composables/useCopy.js";
import { useEventList } from "@/composables/useEventList.js";
import { useUserStore } from "@/stores/user.js";
import BackBar from "@/components/BackBar.vue";
import PostCard from "@/components/PostCard.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";
import ReactionBar from "@/components/ReactionBar.vue";

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const pk = ref("");
const profile = ref({});
const nip05State = ref(""); // "", "ok", "bad"
const avatarUrl = ref("");
const bannerUrl = ref("");
const loadingProfile = ref(true);
const loadingPosts = ref(true);
const { copied: copiedNpub, copy: copyText } = useCopy();
const { items: events, add, reset: resetEvents } = useEventList();
let sub = null;

// hex, npub or nprofile; empty when viewing self while logged out
function resolvePk(input) {
  if (!input) return user.pubkey || "";
  if (/^[0-9a-f]{64}$/i.test(input)) return input.toLowerCase();
  try {
    const d = nip19.decode(input.trim());
    if (d.type === "npub") return d.data;
    if (d.type === "nprofile") return d.data.pubkey;
  } catch {}
  return "";
}

async function resolveUrl(u) {
  if (!u) return "";
  if (u.startsWith("ipfs://")) {
    try {
      return await ipfsObjectUrl(u);
    } catch {
      return "";
    }
  }
  return u;
}

async function verifyNip05(nip05, pubkey) {
  const [name, domain] = (nip05 || "").split("@");
  if (!name || !domain) return false;
  const res = await fetch(
    `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data?.names?.[name] === pubkey;
}

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}

function npubOf(hex) {
  try {
    return nip19.npubEncode(hex);
  } catch {
    return "";
  }
}

function shortNpub(hex) {
  const n = npubOf(hex);
  return n ? `${n.slice(0, 10)}…${n.slice(-6)}` : shortPk(hex);
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
    pk.value = resolvePk(id);
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
    avatarUrl.value = await resolveUrl(profile.value.picture);
    bannerUrl.value = await resolveUrl(profile.value.banner);
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

    <LoginPrompt
      v-if="!pk"
      ignore-signer
      title="Login to see your profile"
      subtitle="Connect a NIP-07 extension, or open someone's profile via link."
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
            <span v-else>{{ (profile.display_name || profile.name || "?").slice(0, 1).toUpperCase() }}</span>
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
      <div class="list">
        <div
          class="postwrap"
          v-for="ev in events"
          :key="ev.id"
          role="link"
          tabindex="0"
          @click="openPost($event, ev.id)"
          @keydown.enter="goPost(ev.id)"
          @keydown.space.prevent="goPost(ev.id)"
        >
          <PostCard :ev="ev" />
          <ReactionBar :ev="ev" />
        </div>
      </div>
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
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
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
  background: linear-gradient(120deg, #0a0a0a 0%, #3f3f46 55%, #71717a 100%);
}
.skeleton .banner.sk {
  height: 120px;
  background: linear-gradient(100deg, #ececee 30%, #f7f7f8 45%, #ececee 60%);
  background-size: 200% 100%;
  animation: sh 1.4s infinite linear;
}
@keyframes sh {
  to {
    background-position: -200% 0;
  }
}
.skline {
  display: block;
  height: 16px;
  width: 140px;
  border-radius: 6px;
  background: linear-gradient(100deg, #ececee 30%, #f7f7f8 45%, #ececee 60%);
  background-size: 200% 100%;
  animation: sh 1.4s infinite linear;
}
.skline.short {
  height: 12px;
  width: 90px;
}
.skeleton .avatar.sk {
  background: linear-gradient(100deg, #ececee 30%, #f7f7f8 45%, #ececee 60%);
  background-size: 200% 100%;
  animation: sh 1.4s infinite linear;
  border-color: var(--card);
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
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 800;
  margin-top: -30px;
  border: 3px solid var(--card);
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
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--ink-2);
  border: 1px solid var(--line);
  background: transparent;
  padding: 6px 12px;
  border-radius: 99px;
  cursor: pointer;
}
.npub:hover {
  color: var(--ink);
  border-color: rgba(0, 0, 0, 0.28);
}
.npub svg {
  width: 13px;
  height: 13px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.empty {
  margin: 10px 16px 0;
  font-size: 12.5px;
  color: var(--ink-3);
  background: var(--bg);
  border: 1px dashed var(--line);
  border-radius: 12px;
  padding: 10px 12px;
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
  stroke-linecap: round;
  stroke-linejoin: round;
}
.m .ok {
  color: #15803d;
}
.m .bad {
  color: #dc2626;
}
.m.link {
  color: var(--ink);
  text-decoration: none;
}
.list {
  display: grid;
  gap: 14px;
}
.postwrap {
  display: grid;
  cursor: pointer;
  border-radius: var(--radius);
}
.postwrap:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
