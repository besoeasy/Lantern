<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { FileText, Send } from "@lucide/vue";
import { signEvent, publishEvent } from "@/lib/nostr.js";
import { slugify } from "@/lib/slug.js";
import { uploadFile } from "@/lib/ipfs.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";
import { useUserStore } from "@/stores/user.js";
import BackBar from "@/components/BackBar.vue";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";

// Long-form writing, split out of the multi-tab Composer because it needs a
// different shape of input: a real editor with a live preview, a title that
// becomes the NIP-23 `d` tag, an optional summary and cover image, and
// publication settings that a one-line composer has no room for.
//
// Publishes kind 30023 with a `d` tag, so re-publishing the same slug replaces
// the previous version rather than piling up near-duplicates.
const router = useRouter();
const user = useUserStore();
const { busy, msg, run, say } = useAsyncAction({ pubkey: () => user.pubkey });

const title = ref("");
const summary = ref("");
const body = ref("");
const slug = ref("");
const slugTouched = ref(false);
const tags = ref("");
const cover = ref(null);
const published = ref(null);

// Derive the slug from the title until the author edits it themselves, then
// leave their choice alone.
function onTitle() {
  if (!slugTouched.value) slug.value = slugify(title.value);
}
function onSlug() {
  slugTouched.value = true;
  slug.value = slugify(slug.value);
}

function parseTags() {
  const out = [];
  for (const raw of tags.value.split(/[\s,]+/)) {
    const v = raw.replace(/^#+/, "").trim().toLowerCase();
    if (v && !out.includes(v)) out.push(v);
  }
  return out.slice(0, 10);
}

const canPublish = computed(
  () => !!title.value.trim() && !!body.value.trim() && !!slug.value,
);

async function submit() {
  if (!canPublish.value || busy.value) return;
  const ev = await run(async () => {
    // The cover goes to IPFS first, so only an ipfs://CID is ever published.
    let image = "";
    if (cover.value) {
      image = (await uploadFile(cover.value)).url;
    }
    const tagsOut = [
      ["d", slug.value],
      ["title", title.value.trim()],
      ["summary", summary.value.trim()].filter(Boolean),
      ["published_at", String(Math.floor(Date.now() / 1000))],
      ...parseTags().map((t) => ["t", t]),
      ...(image ? [["image", image]] : []),
    ];
    const signed = await signEvent({
      kind: 30023,
      created_at: Math.floor(Date.now() / 1000),
      content: body.value,
      tags: tagsOut,
      pubkey: user.pubkey,
    });
    await publishEvent(signed);
    return signed;
  });
  if (!ev) return;
  published.value = ev;
  say("Published.");
  router.push(`/post/${ev.id}`);
}

function onCover(e) {
  cover.value = e.target.files?.[0] || null;
}

function reset() {
  title.value = "";
  summary.value = "";
  body.value = "";
  slug.value = "";
  slugTouched.value = false;
  tags.value = "";
  cover.value = null;
  published.value = null;
}
</script>

<template>
  <div class="blog">
    <BackBar title="Write" />

    <LoginPrompt ignore-signer title="Sign in to publish" subtitle="Use an extension or a key to write." />

    <template v-if="user.pubkey">
      <section class="card">
        <div class="head">
          <FileText class="ico" />
          <input
            v-model="title"
            class="field title"
            placeholder="Title"
            maxlength="120"
            @input="onTitle"
          />
        </div>
        <input
          v-model="slug"
          class="field slug"
          placeholder="url-slug"
          maxlength="64"
          @input="onSlug"
        />
        <textarea
          v-model="summary"
          class="field summary"
          rows="2"
          maxlength="300"
          placeholder="One-line summary (optional) — shown on the card in feeds"
        />

        <MarkdownEditor
          v-model="body"
          class="editor"
          placeholder="Write in Markdown… try ## A heading, **bold**, or - a list"
          :min-rows="14"
        />

        <div class="opts">
          <input v-model="tags" class="field" placeholder="Hashtags · space to separate" />
          <label class="cover" :class="{ set: cover }">
            {{ cover ? cover.name : "Cover" }}
            <input type="file" accept="image/*" hidden @change="onCover" />
          </label>
        </div>

        <div class="foot">
          <div class="acts">
            <button class="ghost" :disabled="busy" @click="reset">Clear</button>
            <button class="post" :disabled="busy || !canPublish" @click="submit">
              <Send /><span>{{ busy ? "Publishing…" : "Publish" }}</span>
            </button>
          </div>
        </div>

        <p v-if="msg" class="msg" :class="{ ok: published }">{{ msg }}</p>
        <p v-else-if="!title.trim() || !body.trim()" class="hint">
          A title and some text are needed before publishing.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.blog {
  display: grid;
  gap: 12px;
}
.card {
  background: var(--card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 14px;
  display: grid;
  gap: 9px;
}
.head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.head .ico {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--accent);
  stroke-width: 1.9;
}
/* The title is the one field that should not look like a form input. */
.title {
  border: 0;
  background: none;
  padding: 4px 0;
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
/* Muted, so an empty title reads as a placeholder rather than as a heading
   the author already wrote. */
.title::placeholder {
  color: var(--ink-3);
  font-weight: 600;
}
.title:focus {
  border-color: transparent;
  box-shadow: none;
}
.slug {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}
.summary {
  resize: vertical;
  font-size: 13.5px;
  line-height: 1.55;
}
.editor {
  margin-top: 2px;
}
.opts {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.cover {
  display: inline-flex;
  align-items: center;
  background: var(--surface-sunken);
  border-radius: var(--r-sm);
  padding: 0 15px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.cover:hover {
  color: var(--ink);
}
.cover.set {
  color: var(--success);
}
.foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.acts {
  display: flex;
  gap: 8px;
}
.ghost {
  background: var(--surface);
  color: var(--ink-2);
  border-radius: var(--r-full);
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.ghost:hover:not(:disabled) {
  background: var(--surface-sunken);
  color: var(--ink);
}
.post {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--ink);
  color: var(--on-ink);
  border: 0;
  border-radius: var(--r-full);
  padding: 10px 22px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--dur) var(--ease), opacity var(--dur) var(--ease);
}
.post:not(:disabled):active {
  transform: scale(0.97);
}
.post:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.post svg {
  width: 15px;
  height: 15px;
  stroke-width: 2;
}
.msg {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--danger);
}
.msg.ok {
  color: var(--success);
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-3);
}
</style>