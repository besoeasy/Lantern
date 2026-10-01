<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { subscribeComments, postComment, shortPk } from '@/lib/nostr.js'
import { useUserStore } from '@/stores/user.js'

const props = defineProps({ root: Object })
const user = useUserStore()
const comments = ref([])
const seen = new Set()
const text = ref('')
const busy = ref(false)
const msg = ref('')
let sub = null

function add(ev) {
  if (seen.has(ev.id)) return
  seen.add(ev.id)
  comments.value.push(ev)
  comments.value.sort((a, b) => a.created_at - b.created_at)
}

watch(
  () => props.root?.id,
  (id) => {
    sub?.close?.()
    comments.value = []
    seen.clear()
    if (!id) return
    sub = subscribeComments(props.root, add)
  },
  { immediate: true },
)

onUnmounted(() => sub?.close?.())

async function submit() {
  msg.value = ''
  if (!user.pubkey) {
    msg.value = 'Login to comment.'
    return
  }
  if (!text.value.trim()) return
  busy.value = true
  try {
    await postComment(props.root, text.value.trim(), user.pubkey)
    text.value = ''
    msg.value = 'Comment published.'
  } catch (e) {
    msg.value = 'Failed: ' + e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="comments">
    <h3>Comments ({{ comments.length }})</h3>
    <div class="form">
      <textarea v-model="text" rows="2" placeholder="Write a comment…" />
      <button :disabled="busy" @click="submit">{{ busy ? 'Publishing…' : 'Comment' }}</button>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
    <div v-for="c in comments" :key="c.id" class="c">
      <div class="meta">{{ shortPk(c.pubkey) }} · k{{ c.kind }}</div>
      <p>{{ c.content }}</p>
    </div>
    <p v-if="!comments.length" class="hint">No comments yet. Be first.</p>
  </section>
</template>

<style scoped>
.comments {
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  padding: 12px;
  display: grid;
  gap: 8px;
}
h3 {
  margin: 0;
  font-size: 15px;
}
.form {
  display: grid;
  gap: 6px;
}
textarea {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 8px;
  font-size: 14px;
}
button {
  background: #111;
  color: #fff;
  border: 0;
  border-radius: 99px;
  padding: 8px;
  font-weight: 700;
  cursor: pointer;
}
.c {
  border-top: 1px solid #eee;
  padding-top: 8px;
  font-size: 14px;
}
.meta {
  font-size: 12px;
  color: #888;
}
.msg,
.hint {
  font-size: 13px;
  color: #888;
}
</style>
