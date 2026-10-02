<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { Columns2, Eye, PencilLine } from "@lucide/vue";
import { renderMarkdown, readingMinutes } from "@/lib/markdown.js";
import Markdown from "./Markdown.vue";

// Markdown editor with a live preview.
//
// Three modes: Write (editor only), Split (both, side by side) and Preview
// (rendered output only). Split is the default on a wide screen and falls back
// to a toggle on a narrow one, because two panes on a phone leaves neither of
// them usable.
//
// The preview is sanitized by the same renderMarkdown() the reading view uses,
// so what you see here is exactly what a reader will get — including the parts
// that get stripped.
const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Write in Markdown…" },
  minRows: { type: Number, default: 10 },
});
const emit = defineEmits(["update:modelValue"]);

const editor = ref(null);
const mode = ref("split");
const wide = ref(true);

const VIEWS = [
  { id: "write", label: "Write", icon: PencilLine },
  { id: "split", label: "Split", icon: Columns2 },
  { id: "preview", label: "Preview", icon: Eye },
];

const html = computed(() => renderMarkdown(props.modelValue));
const stats = computed(() => ({
  words: props.modelValue.trim() ? props.modelValue.trim().split(/\s+/).length : 0,
  minutes: readingMinutes(props.modelValue),
}));
const isEmpty = computed(() => !props.modelValue.trim());

// Track the width so Split can be dropped from the toolbar on a phone, where
// two panes are worse than none.
const mq = window.matchMedia("(min-width: 720px)");
const syncWidth = () => (wide.value = mq.matches);
syncWidth();
mq.addEventListener("change", syncWidth);

watch(mode, async (m) => {
  if (m === "write" || m === "split") {
    await nextTick();
    editor.value?.focus();
  }
});

function onInput(e) {
  emit("update:modelValue", e.target.value);
}

// Tab inserts two spaces instead of leaving the field. Inside a <pre> block
// that is what a writer means by pressing it; everywhere else it beats losing
// their place entirely.
function onKeydown(e) {
  if (e.key !== "Tab") return;
  e.preventDefault();
  const el = e.target;
  const { selectionStart: start, selectionEnd: end, value } = el;
  const next = value.slice(0, start) + "  " + value.slice(end);
  emit("update:modelValue", next);
  nextTick(() => {
    el.selectionStart = el.selectionEnd = start + 2;
  });
}

// A small toolbar of the constructs a writer reaches for most, so they do not
// have to remember the syntax. Each wraps the current selection.
const ACTIONS = [
  { label: "B", title: "Bold", wrap: "**" },
  { label: "I", title: "Italic", wrap: "*" },
  { label: "H", title: "Heading", prefix: "## " },
  { label: "`", title: "Code", wrap: "`" },
  { label: "🔗", title: "Link", wrap: "[", suffix: "](https://)" },
  { label: "•", title: "Bullet list", prefix: "- " },
  { label: "❝", title: "Quote", prefix: "> " },
];

function applyAction({ wrap, suffix = "", prefix }) {
  const el = editor.value;
  if (!el) return;
  const { selectionStart: start, selectionEnd: end, value } = el;
  let next;
  let caret;
  if (prefix) {
    // Line prefixes apply to every line the selection touches.
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(from, end);
    const prefixed = block.replace(/^/gm, prefix);
    next = value.slice(0, from) + prefixed + value.slice(end);
    caret = start + prefixed.length;
  } else {
    const selected = value.slice(start, end) || "text";
    next = value.slice(0, start) + wrap + selected + suffix + value.slice(end);
    caret = start + wrap.length + selected.length;
  }
  emit("update:modelValue", next);
  nextTick(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}
</script>

<template>
  <div class="mded" :class="mode">
    <div class="bar">
      <div class="modes" role="tablist" aria-label="Editor view">
        <button
          v-for="v in VIEWS.filter((x) => x.id !== 'split' || wide)"
          :key="v.id"
          class="mode"
          :class="{ on: mode === v.id }"
          role="tab"
          :aria-selected="mode === v.id"
          @click="mode = v.id"
        >
          <component :is="v.icon" /><span>{{ v.label }}</span>
        </button>
      </div>
      <span class="stats">{{ stats.words }} words · {{ stats.minutes }} min</span>
    </div>

    <div class="panes">
      <div v-show="mode !== 'preview'" class="pane write">
        <div class="tools">
          <button
            v-for="a in ACTIONS"
            :key="a.label"
            class="tool"
            :title="a.title"
            @click="applyAction(a)"
          >
            {{ a.label }}
          </button>
        </div>
        <textarea
          ref="editor"
          class="field ta"
          :value="modelValue"
          :placeholder="placeholder"
          :rows="minRows"
          spellcheck="true"
          @input="onInput"
          @keydown="onKeydown"
        />
      </div>

      <div v-show="mode !== 'write'" class="pane view">
        <div v-if="isEmpty" class="blank">Nothing to preview yet.</div>
        <!-- Same component as the reading view, so the preview cannot drift
             from what readers actually get. -->
        <Markdown :source="modelValue" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.mded {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--surface);
  overflow: hidden;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
}
.modes {
  display: flex;
  gap: 2px;
  background: var(--surface-sunken);
  border-radius: var(--r-sm);
  padding: 3px;
}
.mode {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  border-radius: var(--r-xs);
  padding: 6px 11px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.mode svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.9;
}
.mode.on {
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.stats {
  font-size: 11.5px;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.panes {
  display: grid;
}
.mded.split .panes {
  grid-template-columns: 1fr 1fr;
}
.pane {
  min-width: 0;
}
.mded.split .pane.write {
  border-right: 1px solid var(--line);
}
.pane.view {
  padding: 4px 2px;
  max-height: 60vh;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.blank {
  color: var(--ink-3);
  font-size: 13.5px;
  padding: 28px 16px;
  text-align: center;
}
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 7px 8px 0;
}
.tool {
  min-width: 30px;
  height: 28px;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  border-radius: var(--r-xs);
  font-size: 12.5px;
  font-weight: 700;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.tool:hover {
  background: var(--surface-sunken);
  color: var(--ink);
}
.ta {
  border: 0;
  border-radius: 0;
  background: none;
  resize: vertical;
  min-height: 220px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.65;
  padding: 12px 14px 14px;
}
.ta:focus {
  border-color: transparent;
  box-shadow: none;
}
</style>