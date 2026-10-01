<script setup>
import { ref } from "vue";
import { signEvent, publishEvent } from "@/lib/nostr.js";
import { uploadFile, sha256Hex } from "@/lib/ipfs.js";
import { useUserStore } from "@/stores/user.js";

const user = useUserStore();
const tab = ref("tweet");
const text = ref("");
const title = ref("");
const files = ref([]);
const busy = ref(false);
const msg = ref("");

const tabs = [
  ["tweet", "Tweet k1"],
  ["photo", "Photo k20"],
  ["gallery", "Gallery k20"],
  ["reel", "Reel k22"],
  ["video", "Video k21"],
  ["blog", "Blog k30023"],
  ["music", "Music k1063"],
];

function onFiles(e) {
  files.value = [...e.target.files];
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
  if (!user.pubkey) {
    msg.value = "Login with NOSTR extension first.";
    return;
  }
  busy.value = true;
  try {
    let kind = 1;
    let tags = [];
    let content = text.value;

    if (tab.value === "tweet") {
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

    const template = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags,
      pubkey: user.pubkey,
    };
    const signed = await signEvent(template);
    await publishEvent(signed);
    msg.value = `Published k${kind} (POW mined).`;
    text.value = "";
    title.value = "";
    files.value = [];
  } catch (e) {
    msg.value = "Failed: " + e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="composer">
    <div class="tabs">
      <button v-for="[k, label] in tabs" :key="k" :class="{ on: tab === k }" @click="tab = k">
        {{ label }}
      </button>
    </div>
    <input
      v-if="tab !== 'tweet' && tab !== 'music'"
      v-model="title"
      placeholder="Title…"
      class="in"
    />
    <textarea
      v-model="text"
      :placeholder="
        tab === 'blog' ? 'Markdown article…' : 'What is happening? (ipfs:// media only)'
      "
      rows="3"
      class="in"
    />
    <input
      v-if="tab !== 'blog'"
      type="file"
      multiple
      @change="onFiles"
      class="file"
      :accept="
        tab === 'music'
          ? 'audio/*'
          : tab === 'tweet'
            ? ''
            : tab.includes('video') || tab === 'reel'
              ? 'video/*'
              : 'image/*'
      "
    />
    <button class="post" :disabled="busy" @click="submit">
      {{ busy ? "Mining POW + publishing…" : "Post" }}
    </button>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </section>
</template>

<style scoped>
.composer {
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 16px;
  padding: 12px;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.tabs button {
  border: 1px solid #ddd;
  background: #f7f7f7;
  border-radius: 99px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}
.tabs button.on {
  background: #111;
  color: #fff;
  border-color: #111;
}
.in {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 8px;
  font-size: 14px;
  box-sizing: border-box;
}
.file {
  font-size: 13px;
  margin-bottom: 8px;
}
.post {
  width: 100%;
  background: #111;
  color: #fff;
  border: 0;
  border-radius: 99px;
  padding: 10px;
  font-weight: 700;
  cursor: pointer;
}
.post:disabled {
  opacity: 0.6;
}
.msg {
  font-size: 13px;
  color: #555;
}
</style>
