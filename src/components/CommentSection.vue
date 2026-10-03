<script setup>
import { onUnmounted, ref, watch } from "vue";
import { subscribeComments, postComment, isCommentOn } from "@/lib/nostr.js";
import { useEventList } from "@/composables/useEventList.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
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
const { busy, msg, run, say } = useAsyncAction({ pubkey: () => user.pubkey });
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
  const body = text.value.trim();
  if (!body) return;
  const done = await run(() => postComment(props.root, body, user.pubkey));
  if (done === undefined) return;
  text.value = "";
  say("Comment published.");
}
</script>

<template>
  <section class="comments">
    <h3>Comments ({{ comments.length }})</h3>
    <div class="form">
      <textarea v-model="text" class="field" rows="2" placeholder="Write a comment…" />
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
  background: var(--surface);
  border-radius: var(--r-lg);
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
  resize: vertical;
}
button {
  background: var(--ink);
  color: var(--on-ink);
  border: 0;
  border-radius: var(--r-full);
  padding: 9px 16px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.c {
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
