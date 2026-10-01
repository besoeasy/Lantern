<script setup>
import { onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, BadgeCheck, BadgeX, Globe, Zap } from "@lucide/vue";
import { nip19 } from "nostr-tools";
import {
  getAuthorProfile,
  subscribeAuthorPosts,
  shortPk,
} from "@/lib/nostr.js";
import { FEED_KINDS, ensureRelays } from "@/lib/relays.js";
import { getCachedAuthorPosts } from "@/lib/db.js";
import { ipfsObjectUrl } from "@/lib/ipfs.js";
import { useUserStore } from "@/stores/user.js";
import NoteCard from "@/components/NoteCard.vue";
import PictureCard from "@/components/PictureCard.vue";
import VideoCard from "@/components/VideoCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import MusicCard from "@/components/MusicCard.vue";
import ReactionBar from "@/components/ReactionBar.vue";

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const pk = ref("");
const profile = ref({});
const nip05State = ref(""); // "", "ok", "bad"
const avatarUrl = ref("");
const bannerUrl = ref("");
const events = ref([]);
const loadingProfile = ref(true);
const loadingPosts = ref(true);
const loginErr = ref("");
const seen = new Set();
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

function add(ev) {
  if (seen.has(ev.id)) return;
  seen.add(ev.id);
  events.value.push(ev);
  events.value.sort((a, b) => b.created_at - a.created_at);
}

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}

async function login() {
  loginErr.value = "";
  try {
    await user.login();
  } catch (e) {
    loginErr.value = e.message;
  }
}

watch(
  [() => route.params.id, () => user.pubkey],
  async ([id]) => {
    sub?.close?.();
    sub = null;
    events.value = [];
    seen.clear();
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
    <div class="topbar">
      <RouterLink to="/" class="back">
        <ArrowLeft />
        <span>Back to feed</span>
      </RouterLink>
      <h1 class="title">Profile</h1>
    </div>

    <div class="login" v-if="!pk && !user.probing">
      <div class="login-txt">
        <strong>Login to see your profile</strong>
        <span>Connect a NIP-07 extension, or open someone's profile via link.</span>
      </div>
      <button @click="login" :disabled="user.busy">{{ user.busy ? "…" : "Login" }}</button>
    </div>
    <p v-if="loginErr" class="err">{{ loginErr }}</p>

    <template v-if="pk">
      <section class="card">
        <div v-if="bannerUrl" class="banner">
          <img :src="bannerUrl" alt="" />
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
        </div>
        <p v-if="profile.about" class="about">{{ profile.about }}</p>
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
          <NoteCard v-if="ev.kind === 1" :ev="ev" />
          <PictureCard v-else-if="ev.kind === 20" :ev="ev" />
          <VideoCard v-else-if="ev.kind === 21 || ev.kind === 22" :ev="ev" />
          <ArticleCard v-else-if="ev.kind === 30023" :ev="ev" />
          <MusicCard v-else-if="ev.kind === 1063" :ev="ev" />
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
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
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
  stroke-linecap: round;
  stroke-linejoin: round;
}
.title {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.02em;
}
.login {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 14px 16px;
}
.login-txt {
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--ink-2);
}
.login-txt strong {
  font-size: 14px;
  color: var(--ink);
}
.login button {
  flex-shrink: 0;
  border: 0;
  background: var(--ink);
  color: #fff;
  border-radius: 99px;
  padding: 9px 20px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.err {
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 10px 14px;
  margin: 0;
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
