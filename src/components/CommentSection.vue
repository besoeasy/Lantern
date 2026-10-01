<script setup>
import { onUnmounted, ref, watch } from "vue";
import { subscribeComments, postComment, isCommentOn } from "@/lib/nostr.js";
import { useEventList } from "@/composables/useEventList.js";
import { useUserStore } from "@/stores/user.js";
import AuthorLink from "./AuthorLink.vue";

const props = defineProps({ root: Object });
const user = useUserStore();
// Comments read oldest-first. Second guard at render layer: only replies
// tagging this post show, since relays routinely ignore tag filters.
const {
  items: comments,
  add,
  reset,
} = useEventList({
  order: "asc",
  guard: (ev) => isCommentOn(ev, props.root),
});
const text = ref("");
const busy = ref(false);
const msg = ref("");
let sub = null;

watch(
  () => props.root?.id,
  (id) => {
    sub?.close?.();
    reset();
    if (!id) return;
    sub = subscribeComments(props.root, add);
  },
  { immediate: true },
);

onUnmounted(() => sub?.close?.());

async function submit() {
  msg.value = "";
  if (!user.pubkey) {
    msg.value = "Login to comment.";
    return;
  }
  if (!text.value.trim()) return;
  busy.value = true;
  try {
    await postComment(props.root, text.value.trim(), user.pubkey);
    text.value = "";
    msg.value = "Comment published.";
  } catch (e) {
    msg.value = "Failed: " + e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="comments">
    <h3>Comments ({{ comments.length }})</h3>
    <div class="form">
      <textarea v-model="text" rows="2" placeholder="Write a comment…" />
      <button :disabled="busy" @click="submit">{{ busy ? "Publishing…" : "Comment" }}</button>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
    <div v-for="c in comments" :key="c.id" class="c">
      <div class="meta"><AuthorLink :pubkey="c.pubkey" /> · k{{ c.kind }}</div>
      <p>{{ c.content }}</p>
    </div>
    <p v-if="!comments.length" class="hint">No comments yet. Be first.</p>
  </section>
</template>

<style scoped>
.comments {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
  display: grid;
  gap: 10px;
}
h3 {
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.01em;
}
.form {
  display: grid;
  gap: 8px;
}
textarea {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 11px 13px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}
textarea:focus {
  border-color: rgba(0, 0, 0, 0.28);
}
button {
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: 99px;
  padding: 9px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.c {
  border-top: 1px solid var(--line);
  padding-top: 10px;
  font-size: 14px;
}
.c p {
  margin: 4px 0 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.meta {
  font-size: 12px;
  color: var(--ink-3);
  font-weight: 600;
}
.meta .pk {
  color: inherit;
  text-decoration: none;
}
.meta .pk:hover {
  text-decoration: underline;
}
.msg,
.hint {
  font-size: 13px;
  color: var(--ink-3);
  margin: 0;
}
</style>
