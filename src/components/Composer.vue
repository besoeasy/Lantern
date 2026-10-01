<script setup>
import { ref } from "vue";
import {
  Paperclip,
  Send,
  Image,
  Images,
  Clapperboard,
  Video,
  FileText,
  Music,
  Type,
  Hash,
} from "@lucide/vue";
import { signEvent, publishEvent } from "@/lib/nostr.js";
import { uploadFile, sha256Hex } from "@/lib/ipfs.js";
import { useUserStore } from "@/stores/user.js";

const emit = defineEmits(["published"]);

const ICONS = {
  note: Type,
  photo: Image,
  gallery: Images,
  reel: Clapperboard,
  video: Video,
  blog: FileText,
  music: Music,
};

const user = useUserStore();
const tab = ref("note");
const text = ref("");
const title = ref("");
const files = ref([]);
const busy = ref(false);
const msg = ref("");
const ok = ref(false);
const hashtags = ref("");

const tabs = [
  ["note", "Note"],
  ["photo", "Photo"],
  ["gallery", "Gallery"],
  ["reel", "Reel"],
  ["video", "Video"],
  ["blog", "Blog"],
  ["music", "Music"],
];

function onFiles(e) {
  files.value = [...e.target.files];
}

// "#love #car" or "love, car" -> [["t", "love"], ["t", "car"]]
function collectHashtags() {
  const seen = new Set();
  const out = [];
  for (const raw of hashtags.value.split(/[\s,]+/)) {
    const v = raw.replace(/^#+/, "").trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(["t", v]);
  }
  return out;
}

async function buildImeta(file) {
  const { url } = await uploadFile(file);
  const x = await sha256Hex(file).catch(() => "");
  const entry = [`url ${url}`, `m ${file.type || "application/octet-stream"}`];
  if (x) entry.push(`x ${x}`);
  if (file.type.startsWith("image")) {
    try {
      const bmp = await createImageBitmap(file);
      entry.push(`dim ${bmp.width}x${bmp.height}`);
    } catch {}
  }
  return ["imeta", ...entry];
}

async function submit() {
  msg.value = "";
  ok.value = false;
  if (!user.pubkey) {
    msg.value = "Login first.";
    return;
  }
  busy.value = true;
  try {
    let kind = 1;
    let tags = [];
    const content = text.value;

    if (tab.value === "note") {
      kind = 1;
      for (const f of files.value) tags.push(await buildImeta(f));
    } else if (tab.value === "photo" || tab.value === "gallery") {
      kind = 20;
      if (title.value) tags.push(["title", title.value]);
      for (const f of files.value) tags.push(await buildImeta(f));
      if (files.value[0]) tags.push(["m", files.value[0].type || "image/jpeg"]);
    } else if (tab.value === "reel") {
      kind = 22;
      tags.push(["title", title.value || "Reel"]);
      for (const f of files.value) tags.push(await buildImeta(f));
    } else if (tab.value === "video") {
      kind = 21;
      tags.push(["title", title.value || "Video"]);
      tags.push(["published_at", String(Math.floor(Date.now() / 1000))]);
      for (const f of files.value) tags.push(await buildImeta(f));
    } else if (tab.value === "blog") {
      kind = 30023;
      tags.push([
        "d",
        title.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 64) || `post-${Date.now()}`,
      ]);
      tags.push(["title", title.value || "Untitled"]);
      tags.push(["published_at", String(Math.floor(Date.now() / 1000))]);
    } else if (tab.value === "music") {
      kind = 1063;
      const f = files.value[0];
      if (!f) throw new Error("Pick an audio file");
      const { url } = await uploadFile(f);
      const x = await sha256Hex(f).catch(() => "");
      tags = [
        ["url", url],
        ["m", f.type || "audio/mpeg"],
        ...(x ? [["x", x]] : []),
        ["size", String(f.size)],
      ];
    }

    const signed = await signEvent({
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags: [...tags, ...collectHashtags()],
      pubkey: user.pubkey,
    });
    await publishEvent(signed);
    msg.value = `Published · kind ${kind}`;
    ok.value = true;
    text.value = "";
    title.value = "";
    files.value = [];
    hashtags.value = "";
    emit("published", signed);
  } catch (e) {
    msg.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="composer" id="composer">
    <div class="seg">
      <button v-for="[k, label] in tabs" :key="k" :class="{ on: tab === k }" @click="tab = k">
        <component :is="ICONS[k]" />
        {{ label }}
      </button>
    </div>
    <input
      v-if="tab !== 'note' && tab !== 'music'"
      v-model="title"
      placeholder="Title"
      class="in"
    />
    <textarea
      v-model="text"
      :placeholder="tab === 'blog' ? 'Write in Markdown…' : 'What is happening?'"
      rows="3"
      class="in area"
    />
    <div class="hashwrap">
      <Hash />
      <input v-model="hashtags" placeholder="Hashtags · e.g. #love #car" class="in hash" />
    </div>
    <div class="foot">
      <label
        v-if="tab !== 'blog'"
        class="attach"
        :title="files.length ? files.map((f) => f.name).join(', ') : 'Attach'"
      >
        <Paperclip />
        <span>{{
          files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : "Media"
        }}</span>
        <input
          type="file"
          multiple
          hidden
          @change="onFiles"
          :accept="
            tab === 'music'
              ? 'audio/*'
              : tab === 'note'
                ? ''
                : tab === 'video' || tab === 'reel'
                  ? 'video/*'
                  : 'image/*'
          "
        />
      </label>
      <button class="post" :disabled="busy" @click="submit">
        <span>{{ busy ? "Publishing" : "Post" }}</span>
        <Send />
      </button>
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  background: transparent;
  border-radius: 11px;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.seg button svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
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
.hashwrap {
  position: relative;
  margin-bottom: 8px;
}
.hashwrap svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--ink-3);
  pointer-events: none;
}
.hashwrap .hash {
  margin-bottom: 0;
  padding-left: 32px;
  font-size: 13px;
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
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.post {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: 99px;
  padding: 9px 22px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
}
.post svg {
  width: 15px;
  height: 15px;
  stroke-width: 2;
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
