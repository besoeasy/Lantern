<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useFeedStore } from "@/stores/feed.js";
import { useUserStore } from "@/stores/user.js";
import NoteCard from "@/components/NoteCard.vue";
import PictureCard from "@/components/PictureCard.vue";
import VideoCard from "@/components/VideoCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import MusicCard from "@/components/MusicCard.vue";

const feed = useFeedStore();
const user = useUserStore();
const route = useRoute();
const router = useRouter();
const filter = ref(route.query.tab || "all");
const loginErr = ref("");

const FILTERS = {
  all: null,
  notes: [1],
  pics: [20],
  videos: [21, 22],
  blogs: [30023],
  music: [1063],
};

const visible = computed(() => {
  const kinds = FILTERS[filter.value];
  if (!kinds) return feed.events;
  return feed.events.filter((e) => kinds.includes(e.kind));
});

watch(
  () => route.query.tab,
  (t) => {
    if (t && FILTERS[t] !== undefined) filter.value = t;
    else if (!t) filter.value = "all";
  },
);

function setFilter(k) {
  filter.value = k;
  router.replace({ query: { ...route.query, tab: k === "all" ? undefined : k } });
}

onMounted(() => feed.start());
onUnmounted(() => feed.stop());

async function login() {
  loginErr.value = "";
  try {
    await user.login();
  } catch (e) {
    loginErr.value = e.message;
  }
}

function goPost(id) {
  router.push(`/post/${id}`);
}

function openPost(e, id) {
  // Media controls (video/audio) and any nested controls keep their own behavior.
  if (e.target.closest("button, a, video, audio, input, textarea, select")) return;
  goPost(id);
}
</script>

<template>
  <div class="home">
    <div class="login" v-if="!user.pubkey && !user.probing && !user.signerFound">
      <div class="login-txt">
        <strong>Join the discussion</strong>
        <span>Connect a NIP-07 extension to comment.</span>
      </div>
      <button @click="login" :disabled="user.busy">{{ user.busy ? "…" : "Login" }}</button>
    </div>
    <p v-if="loginErr" class="err">{{ loginErr }}</p>

    <div class="pills">
      <button
        v-for="k in Object.keys(FILTERS)"
        :key="k"
        :class="{ on: filter === k }"
        @click="setFilter(k)"
      >
        {{ k }}
      </button>
    </div>

    <p v-if="feed.loading" class="hint">Syncing relays…</p>
    <div class="list">
      <div
        class="postwrap"
        v-for="ev in visible"
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
      </div>
    </div>
    <p v-if="!feed.loading && !visible.length" class="hint">Nothing here yet.</p>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 12px;
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
  letter-spacing: -0.01em;
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
.pills {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 2px;
  overflow-x: auto;
  margin: -14px -14px 0;
  padding: 8px 14px;
  background: rgba(246, 246, 247, 0.8);
  backdrop-filter: saturate(1.6) blur(16px);
  -webkit-backdrop-filter: saturate(1.6) blur(16px);
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
}
.pills::-webkit-scrollbar {
  display: none;
}
.pills button {
  flex-shrink: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: capitalize;
  white-space: nowrap;
}
.pills button.on {
  color: var(--ink);
  border-bottom-color: var(--ink);
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
