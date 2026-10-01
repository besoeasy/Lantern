<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Copy, ExternalLink } from "@lucide/vue";
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
  tweets: [1],
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

function postUrl(id) {
  return `${location.origin}${location.pathname}#/post/${id}`;
}

async function copyLink(id) {
  try {
    await navigator.clipboard.writeText(postUrl(id));
  } catch {
    prompt("Copy post URL:", postUrl(id));
  }
}
</script>

<template>
  <div class="home">
    <div class="login" v-if="!user.pubkey">
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
      <div class="postwrap" v-for="ev in visible" :key="ev.id">
        <NoteCard v-if="ev.kind === 1" :ev="ev" />
        <PictureCard v-else-if="ev.kind === 20" :ev="ev" />
        <VideoCard v-else-if="ev.kind === 21 || ev.kind === 22" :ev="ev" />
        <ArticleCard v-else-if="ev.kind === 30023" :ev="ev" />
        <MusicCard v-else-if="ev.kind === 1063" :ev="ev" />
        <div class="actions">
          <RouterLink :to="`/post/${ev.id}`" target="_blank" class="open">
            <ExternalLink />
            <span>Open</span>
          </RouterLink>
          <button class="copy" @click="copyLink(ev.id)">
            <Copy />
            <span>Copy link</span>
          </button>
        </div>
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
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.pills::-webkit-scrollbar {
  display: none;
}
.pills button {
  flex-shrink: 0;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 7px 14px;
  border-radius: 99px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  text-transform: capitalize;
}
.pills button.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.list {
  display: grid;
  gap: 14px;
}
.postwrap {
  display: grid;
}
.actions {
  display: flex;
  gap: 8px;
  padding: 8px 4px 0;
}
.open,
.copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--line);
  background: var(--card);
  padding: 6px 14px;
  border-radius: 99px;
  cursor: pointer;
}
.open {
  color: var(--ink);
}
.copy {
  color: var(--ink-2);
  background: transparent;
}
.open svg,
.copy svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.hint {
  color: var(--ink-3);
  font-size: 13px;
  text-align: center;
}
</style>
