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
  X,
} from "@lucide/vue";
import { signEvent, publishEvent, formatDuration } from "@/lib/nostr.js";
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
const tagChips = ref([]);
const tagDraft = ref("");
const hashInput = ref(null);
// Amethyst-style music track fields (kind 36787)
const musicTitle = ref("");
const musicArtist = ref("");
const musicAlbum = ref("");
const musicTrackNo = ref("");
const musicReleased = ref("");
const coverFile = ref(null);
const audioDuration = ref(0);

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
  audioDuration.value = 0;
  if (tab.value === "music" && files.value[0]) detectDuration(files.value[0]);
}

function onCover(e) {
  coverFile.value = e.target.files[0] || null;
}

// Read track length from the audio file header (no upload needed)
function detectDuration(file) {
  try {
    const u = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration)) audioDuration.value = Math.round(a.duration);
      URL.revokeObjectURL(u);
    };
    a.onerror = () => URL.revokeObjectURL(u);
    a.src = u;
  } catch {}
}

function audioFormat(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "";
}

// Chip-based hashtags: typing a word + Space/Enter/comma banks it as a chip.
// No need to type `#` — it's added for display and as the `t` tag value.
function confirmDraft() {
  for (const raw of tagDraft.value.split(/[\s,]+/)) {
    const v = raw.replace(/^#+/, "").trim().toLowerCase();
    if (v && !tagChips.value.includes(v)) tagChips.value.push(v);
  }
  tagDraft.value = "";
}

function onHashKey(e) {
  if (e.key === "," || e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    confirmDraft();
  } else if (e.key === "Backspace" && !tagDraft.value && tagChips.value.length) {
    tagChips.value.pop();
  }
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
      // Amethyst-compatible music track (kind 36787): title/artist/album/art.
      kind = 36787;
      const f = files.value.find((x) => x.type.startsWith("audio")) || files.value[0];
      if (!f) throw new Error("Pick an audio file");
      if (!musicTitle.value.trim() || !musicArtist.value.trim())
        throw new Error("Track title and artist are required");
      const { url } = await uploadFile(f);
      const x = await sha256Hex(f).catch(() => "");
      tags = [
        ["d", crypto.randomUUID?.() || `track-${Date.now()}`],
        ["title", musicTitle.value.trim()],
        ["artist", musicArtist.value.trim()],
        ["url", url],
        ["t", "music"],
        ...(x ? [["x", x]] : []),
        ["size", String(f.size)],
      ];
      const fmt = audioFormat(f);
      if (fmt) tags.push(["format", fmt]);
      if (audioDuration.value > 0) tags.push(["duration", String(audioDuration.value)]);
      if (coverFile.value) {
        const art = await uploadFile(coverFile.value);
        tags.push(["image", art.url]);
      }
      if (musicAlbum.value.trim()) tags.push(["album", musicAlbum.value.trim()]);
      const tn = parseInt(musicTrackNo.value, 10);
      if (tn > 0) tags.push(["track_number", String(tn)]);
      if (musicReleased.value.trim()) tags.push(["released", musicReleased.value.trim()]);
    }

    confirmDraft();
    const signed = await signEvent({
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags: [...tags, ...tagChips.value.map((v) => ["t", v])],
      pubkey: user.pubkey,
    });
    await publishEvent(signed);
    msg.value = `Published · kind ${kind}`;
    ok.value = true;
    text.value = "";
    title.value = "";
    files.value = [];
    tagChips.value = [];
    tagDraft.value = "";
    musicTitle.value = "";
    musicArtist.value = "";
    musicAlbum.value = "";
    musicTrackNo.value = "";
    musicReleased.value = "";
    coverFile.value = null;
    audioDuration.value = 0;
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
    <template v-if="tab === 'music'">
      <input v-model="musicTitle" placeholder="Track title *" class="in" />
      <input v-model="musicArtist" placeholder="Artist *" class="in" />
      <input v-model="musicAlbum" placeholder="Album" class="in" />
      <div class="mrow">
        <input v-model="musicTrackNo" placeholder="# · track" inputmode="numeric" class="in" />
        <input v-model="musicReleased" placeholder="Released · e.g. 2024" class="in grow" />
      </div>
      <label class="coverpick">
        <Image />
        <span>{{ coverFile ? coverFile.name : "Cover art" }}</span>
        <input type="file" accept="image/*" hidden @change="onCover" />
      </label>
      <p v-if="audioDuration > 0" class="dur">Duration {{ formatDuration(audioDuration) }} detected</p>
    </template>
    <textarea
      v-model="text"
      :placeholder="
        tab === 'blog' ? 'Write in Markdown…' : tab === 'music' ? 'Description or lyrics…' : 'What is happening?'
      "
      rows="3"
      class="in area"
    />
    <div class="hashwrap" @click="hashInput?.focus()">
      <span v-for="(c, i) in tagChips" :key="c" class="chip">
        #{{ c }}
        <button @click.stop="tagChips.splice(i, 1)" title="Remove">
          <X />
        </button>
      </span>
      <input
        ref="hashInput"
        v-model="tagDraft"
        :placeholder="tagChips.length ? 'Add more…' : 'Hashtags · type + Space'"
        class="hashin"
        @keydown="onHashKey"
      />
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
.mrow {
  display: flex;
  gap: 6px;
}
.mrow .in {
  flex: 0 0 110px;
  min-width: 0;
}
.mrow .in.grow {
  flex: 1;
}
.coverpick {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  padding: 10px 13px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
}
.coverpick:hover {
  color: var(--ink);
  border-style: solid;
}
.coverpick svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.9;
  flex-shrink: 0;
}
.coverpick span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dur {
  font-size: 12px;
  color: #15803d;
  font-weight: 600;
  margin: 0 2px 8px;
}
.hashwrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px 11px;
  margin-bottom: 8px;
  background: #fff;
  cursor: text;
}
.hashwrap:focus-within {
  border-color: rgba(0, 0, 0, 0.28);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 99px;
  padding: 3px 6px 3px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
}
.chip button {
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.chip button:hover {
  color: #dc2626;
  background: #fef2f2;
}
.chip button svg {
  width: 12px;
  height: 12px;
  stroke-width: 2.4;
}
.hashin {
  flex: 1;
  min-width: 140px;
  border: 0;
  outline: none;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  background: transparent;
  padding: 4px 0;
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
