<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useFeedStore } from "@/stores/feed.js";
import { useUserStore } from "@/stores/user.js";
import Composer from "@/components/Composer.vue";
import NoteCard from "@/components/NoteCard.vue";
import PictureCard from "@/components/PictureCard.vue";
import VideoCard from "@/components/VideoCard.vue";
import ArticleCard from "@/components/ArticleCard.vue";
import MusicCard from "@/components/MusicCard.vue";

const feed = useFeedStore();
const user = useUserStore();
const filter = ref("all");

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

onMounted(() => feed.start());
onUnmounted(() => feed.stop());

async function login() {
  try {
    await user.login();
  } catch (e) {
    alert(e.message);
  }
}

function postUrl(id) {
  return `${location.origin}${location.pathname}#/post/${id}`;
}

async function copyLink(id) {
  try {
    await navigator.clipboard.writeText(postUrl(id));
    alert('Link copied:\n' + postUrl(id));
  } catch {
    prompt('Copy post URL:', postUrl(id));
  }
}
</script>

<template>
  <div class="home">
    <div class="loginbar" v-if="!user.pubkey">
      <span>NOSTR extension required (NIP-07)</span>
      <button @click="login">Login</button>
    </div>
    <div class="loginbar ok" v-else>
      <span>Logged in · {{ user.pubkey.slice(0, 12) }}… · client:lantern · POW:5</span>
      <button @click="user.logout()">Logout</button>
    </div>

    <Composer v-if="user.pubkey" />

    <div class="filters">
      <button
        v-for="k in Object.keys(FILTERS)"
        :key="k"
        :class="{ on: filter === k }"
        @click="filter = k"
      >
        {{ k }}
      </button>
    </div>

    <p v-if="feed.loading" class="hint">Loading relays + Dexie cache…</p>
    <div class="list">
      <template v-for="ev in visible" :key="ev.id">
        <div class="postwrap">
          <NoteCard v-if="ev.kind === 1" :ev="ev" />
          <PictureCard v-else-if="ev.kind === 20" :ev="ev" />
          <VideoCard v-else-if="ev.kind === 21 || ev.kind === 22" :ev="ev" />
          <ArticleCard v-else-if="ev.kind === 30023" :ev="ev" />
          <MusicCard v-else-if="ev.kind === 1063" :ev="ev" />
          <div class="actions">
            <RouterLink :to="`/post/${ev.id}`" target="_blank" class="open">Open ↗</RouterLink>
            <button class="copy" @click="copyLink(ev.id)">Copy link</button>
          </div>
        </div>
      </template>
    </div>
    <p v-if="!feed.loading && !visible.length" class="hint">
      No posts yet (relays empty or all non-ipfs filtered by clients).
    </p>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  gap: 12px;
}
.loginbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff7e6;
  border: 1px solid #f0d48a;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
}
.loginbar.ok {
  background: #eefbef;
  border-color: #bfe6c3;
}
.loginbar button {
  border: 1px solid #111;
  background: #111;
  color: #fff;
  border-radius: 99px;
  padding: 5px 12px;
  cursor: pointer;
}
.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.filters button {
  border: 1px solid #ddd;
  background: #fff;
  padding: 6px 12px;
  border-radius: 99px;
  cursor: pointer;
  font-size: 13px;
}
.filters button.on {
  background: #111;
  color: #fff;
}
.list {
  display: grid;
  gap: 12px;
}
.postwrap {
  display: grid;
  gap: 0;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 2px 0;
}
.open {
  font-size: 13px;
  font-weight: 700;
  color: #111;
  text-decoration: none;
  border: 1px solid #ddd;
  background: #fff;
  padding: 4px 12px;
  border-radius: 99px;
}
.copy {
  font-size: 13px;
  color: #555;
  border: 1px solid #ddd;
  background: #fff;
  padding: 4px 12px;
  border-radius: 99px;
  cursor: pointer;
}
.hint {
  color: #888;
  font-size: 13px;
  text-align: center;
}
</style>
