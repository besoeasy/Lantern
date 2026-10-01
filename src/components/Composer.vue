<script setup>
import { ref } from 'vue'
import { signEvent, publishEvent } from '@/lib/nostr.js'
import { uploadFile, sha256Hex } from '@/lib/ipfs.js'
import { useUserStore } from '@/stores/user.js'

const user = useUserStore()
const tab = ref('tweet')
const text = ref('')
const title = ref('')
const files = ref([])
const busy = ref(false)
const msg = ref('')
const ok = ref(false)

const tabs = [
  ['tweet', 'Tweet'],
  ['photo', 'Photo'],
  ['gallery', 'Gallery'],
  ['reel', 'Reel'],
  ['video', 'Video'],
  ['blog', 'Blog'],
  ['music', 'Music'],
]

function onFiles(e) {
  files.value = [...e.target.files]
}

async function buildImeta(file) {
  const { url } = await uploadFile(file)
  const x = await sha256Hex(file).catch(() => '')
  const entry = [`url ${url}`, `m ${file.type || 'application/octet-stream'}`]
  if (x) entry.push(`x ${x}`)
  if (file.type.startsWith('image')) {
    try {
      const bmp = await createImageBitmap(file)
      entry.push(`dim ${bmp.width}x${bmp.height}`)
    } catch {}
  }
  return ['imeta', ...entry]
}

async function submit() {
  msg.value = ''
  ok.value = false
  if (!user.pubkey) {
    msg.value = 'Login first.'
    return
  }
  busy.value = true
  try {
    let kind = 1
    let tags = []
    const content = text.value

    if (tab.value === 'tweet') {
      kind = 1
      for (const f of files.value) tags.push(await buildImeta(f))
    } else if (tab.value === 'photo' || tab.value === 'gallery') {
      kind = 20
      if (title.value) tags.push(['title', title.value])
      for (const f of files.value) tags.push(await buildImeta(f))
      if (files.value[0]) tags.push(['m', files.value[0].type || 'image/jpeg'])
    } else if (tab.value === 'reel') {
      kind = 22
      tags.push(['title', title.value || 'Reel'])
      for (const f of files.value) tags.push(await buildImeta(f))
    } else if (tab.value === 'video') {
      kind = 21
      tags.push(['title', title.value || 'Video'])
      tags.push(['published_at', String(Math.floor(Date.now() / 1000))])
      for (const f of files.value) tags.push(await buildImeta(f))
    } else if (tab.value === 'blog') {
      kind = 30023
      tags.push(['d', title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64) || `post-${Date.now()}`])
      tags.push(['title', title.value || 'Untitled'])
      tags.push(['published_at', String(Math.floor(Date.now() / 1000))])
    } else if (tab.value === 'music') {
      kind = 1063
      const f = files.value[0]
      if (!f) throw new Error('Pick an audio file')
      const { url } = await uploadFile(f)
      const x = await sha256Hex(f).catch(() => '')
      tags = [
        ['url', url],
        ['m', f.type || 'audio/mpeg'],
        ...(x ? [['x', x]] : []),
        ['size', String(f.size)],
      ]
    }

    const signed = await signEvent({
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags,
      pubkey: user.pubkey,
    })
    await publishEvent(signed)
    msg.value = `Published · kind ${kind}`
    ok.value = true
    text.value = ''
    title.value = ''
    files.value = []
  } catch (e) {
    msg.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="composer" id="composer">
    <div class="seg">
      <button v-for="[k, label] in tabs" :key="k" :class="{ on: tab === k }" @click="tab = k">
        {{ label }}
      </button>
    </div>
    <input v-if="tab !== 'tweet' && tab !== 'music'" v-model="title" placeholder="Title" class="in" />
    <textarea
      v-model="text"
      :placeholder="tab === 'blog' ? 'Write in Markdown…' : 'What is happening?'"
      rows="3"
      class="in area"
    />
    <div class="foot">
      <label v-if="tab !== 'blog'" class="attach" :title="files.length ? files.map((f) => f.name).join(', ') : 'Attach'">
        <svg viewBox="0 0 24 24"><path d="m21 12-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8L13 4.4a3.7 3.7 0 0 1 5.2 5.2l-8.2 8.2a1.85 1.85 0 0 1-2.6-2.6L14.5 8"/></svg>
        <span>{{ files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Media' }}</span>
        <input
          type="file"
          multiple
          hidden
          @change="onFiles"
          :accept="tab === 'music' ? 'audio/*' : tab === 'tweet' ? '' : tab === 'video' || tab === 'reel' ? 'video/*' : 'image/*'"
        />
      </label>
      <button class="post" :disabled="busy" @click="submit">{{ busy ? 'Publishing…' : 'Post' }}</button>
    </div>
    <p v-if="msg" class="msg" :class="{ ok }">{{ msg }}</p>
  </section>
</template>

<style scoped>
.composer {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 12px;
  scroll-margin-top: 70px;
}
.seg {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border-radius: 14px;
  padding: 3px;
  margin-bottom: 10px;
  overflow-x: auto;
  scrollbar-width: none;
}
.seg::-webkit-scrollbar {
  display: none;
}
.seg button {
  flex: 1 0 auto;
  border: 0;
  background: transparent;
  border-radius: 11px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.seg button.on {
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.in {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 11px 13px;
  margin-bottom: 8px;
  font-size: 14px;
  font-family: inherit;
  background: #fff;
  color: var(--ink);
  outline: none;
}
.in:focus {
  border-color: rgba(0, 0, 0, 0.28);
}
.area {
  resize: vertical;
  line-height: 1.55;
}
.foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.attach {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  padding: 8px 10px;
  border-radius: 99px;
}
.attach:hover {
  background: var(--bg);
}
.attach svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}
.post {
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: 99px;
  padding: 9px 26px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.post:disabled {
  opacity: 0.55;
}
.msg {
  font-size: 13px;
  color: #dc2626;
  margin: 8px 2px 0;
}
.msg.ok {
  color: #15803d;
}
</style>
