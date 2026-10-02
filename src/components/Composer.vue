<script setup>
import { computed, ref } from "vue";
import {
  Paperclip,
  Send,
  Image,
  Images,
  Clapperboard,
  Video,
  Music,
  Type,
  X,
} from "@lucide/vue";
import { signEvent, publishEvent, formatDuration } from "@/lib/nostr.js";
import { uploadFile, sha256Hex } from "@/lib/ipfs.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useUserStore } from "@/stores/user.js";

const emit = defineEmits(["published"]);

// One entry per composer tab. This is the single place that knows what a post
// type is called, which icon it shows, which event kind it publishes, whether
// it takes attachments or a title, and what its editor says.
const TABS = {
  note: {
    label: "Note",
    icon: Type,
    kind: 1,
    media: true,
    accept: "",
    title: false,
    placeholder: "What is happening?",
  },
  photo: {
    label: "Photo",
    icon: Image,
    kind: 20,
    media: true,
    accept: "image/*",
    title: true,
    placeholder: "What is happening?",
  },
  gallery: {
    label: "Gallery",
    icon: Images,
    kind: 20,
    media: true,
    accept: "image/*",
    title: true,
    placeholder: "What is happening?",
  },
  reel: {
    label: "Reel",
    icon: Clapperboard,
    kind: 22,
    media: true,
    accept: "video/*",
    title: true,
    placeholder: "What is happening?",
  },
  video: {
    label: "Video",
    icon: Video,
    kind: 21,
    media: true,
    accept: "video/*",
    title: true,
    placeholder: "What is happening?",
  },
  music: {
    label: "Music",
    icon: Music,
    kind: 36787,
    media: true,
    accept: "audio/*",
    title: false,
    placeholder: "Description or lyrics…",
  },
};

// Long-form writing lives on its own screen (views/BlogView.vue): it needs a
// Markdown editor with a live preview, which does not fit a single-line tab.
const TAB_KEYS = ["note", "photo", "gallery", "reel", "video", "music"];

const user = useUserStore();
const tab = ref("note");
const text = ref("");
const title = ref("");
const files = ref([]);
const { busy, msg, run, say } = useAsyncAction({ pubkey: () => user.pubkey });
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

const spec = computed(() => TABS[tab.value]);

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

async function imetaTags(list) {
  const tags = [];
  for (const f of list) tags.push(await buildImeta(f));
  return tags;
}

function unixNow() {
  return String(Math.floor(Date.now() / 1000));
}

// How each tab turns the form into tags. The kind itself comes from TABS.
const BUILD = {
  async note() {
    return imetaTags(files.value);
  },
  async photo() {
    const tags = [];
    if (title.value) tags.push(["title", title.value]);
    tags.push(...(await imetaTags(files.value)));
    if (files.value[0]) tags.push(["m", files.value[0].type || "image/jpeg"]);
    return tags;
  },
  async gallery() {
    return BUILD.photo();
  },
  async reel() {
    return [["title", title.value || "Reel"], ...(await imetaTags(files.value))];
  },
  async video() {
    return [
      ["title", title.value || "Video"],
      ["published_at", unixNow()],
      ...(await imetaTags(files.value)),
    ];
  },
  // Amethyst-compatible music track (kind 36787): title/artist/album/art.
  async music() {
    const f = files.value.find((x) => x.type.startsWith("audio")) || files.value[0];
    if (!f) throw new Error("Pick an audio file");
    if (!musicTitle.value.trim() || !musicArtist.value.trim())
      throw new Error("Track title and artist are required");
    const { url } = await uploadFile(f);
    const x = await sha256Hex(f).catch(() => "");
    const tags = [
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
    return tags;
  },
};

async function submit() {
  ok.value = false;
  const signed = await run(async () => {
    const tags = await BUILD[tab.value]();
    confirmDraft();
    const ev = await signEvent({
      kind: spec.value.kind,
      created_at: Math.floor(Date.now() / 1000),
      content: text.value,
      tags: [...tags, ...tagChips.value.map((v) => ["t", v])],
      pubkey: user.pubkey,
    });
    await publishEvent(ev);
    return ev;
  });
  if (signed === undefined) return;

  say(`Published · kind ${spec.value.kind}`);
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
}
</script>

<template>
  <section class="composer" id="composer">
    <div class="seg">
      <button
        v-for="k in TAB_KEYS"
        :key="k"
        :class="{ on: tab === k }"
        @click="tab = k"
      >
        <component :is="TABS[k].icon" />
        {{ TABS[k].label }}
      </button>
    </div>
    <input v-if="spec.title" v-model="title" placeholder="Title" class="field in" />
    <template v-if="tab === 'music'">
      <input v-model="musicTitle" placeholder="Track title *" class="field in" />
      <input v-model="musicArtist" placeholder="Artist *" class="field in" />
      <input v-model="musicAlbum" placeholder="Album" class="field in" />
      <div class="mrow">
        <input v-model="musicTrackNo" placeholder="# · track" inputmode="numeric" class="field in" />
        <input v-model="musicReleased" placeholder="Released · e.g. 2024" class="field in grow" />
      </div>
      <label class="coverpick">
        <Image />
        <span>{{ coverFile ? coverFile.name : "Cover art" }}</span>
        <input type="file" accept="image/*" hidden @change="onCover" />
      </label>
      <p v-if="audioDuration > 0" class="dur">Duration {{ formatDuration(audioDuration) }} detected</p>
    </template>
    <textarea v-model="text" :placeholder="spec.placeholder" rows="3" class="field in area" />
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
        v-if="spec.media"
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
          :accept="spec.accept"
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
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 12px;
  scroll-margin-top: 70px;
}
.seg {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border-radius: var(--r-md);
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
  border-radius: var(--r-sm);
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
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
/* .field carries the border, padding and focus ring; this only adds the
   post-type spacing on top. */
.in {
  margin-bottom: 8px;
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
  border-radius: var(--r-md);
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
  color: var(--success);
  font-weight: 600;
  margin: 0 2px 8px;
}
.hashwrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 8px 11px;
  margin-bottom: 8px;
  background: var(--surface);
  cursor: text;
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.hashwrap:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-sunken);
  border: 1px solid var(--line);
  border-radius: var(--r-full);
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
  color: var(--danger);
  background: var(--danger-bg);
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
  border-radius: var(--r-full);
}
.attach:hover {
  background: var(--surface-sunken);
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
  color: var(--ink-on-accent);
  border: 0;
  border-radius: var(--r-full);
  padding: 10px 24px;
  font-weight: 700;
  font-size: 13.5px;
  cursor: pointer;
  transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease);
}
.post:not(:disabled):active {
  transform: scale(0.97);
}
.post svg {
  width: 15px;
  height: 15px;
  stroke-width: 2;
}
.post:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.msg {
  font-size: 13px;
  line-height: 1.55;
  color: var(--danger);
  margin: 8px 2px 0;
}
.msg.ok {
  color: var(--success);
}
</style>
