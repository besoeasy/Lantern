<script setup>
import { ref } from "vue";
import { Plus } from "@lucide/vue";

// One of the two "list of servers + add form" blocks in Settings. The
// Originless and relay lists shared the same <ul>/<li>/<form>/<p> skeleton and
// differed only in what each row held, so the frame, the draft input and the
// error line live here and the row contents go in the slot.
const props = defineProps({
  items: { type: Array, required: true },
  placeholder: { type: String, required: true },
  submitLabel: { type: String, required: true },
  error: { type: String, default: "" },
});

const emit = defineEmits(["add"]);
const draft = ref("");

function submit() {
  const value = draft.value.trim();
  if (!value) return;
  draft.value = "";
  emit("add", value);
}
</script>

<template>
  <ul class="rows">
    <li v-for="url in items" :key="url" class="row">
      <slot :url="url" />
    </li>
  </ul>
  <form class="add" @submit.prevent="submit">
    <input v-model="draft" class="field" :placeholder="placeholder" />
    <button class="primary" type="submit"><Plus /><span>{{ submitLabel }}</span></button>
  </form>
  <p v-if="error" class="err">{{ error }}</p>
</template>

<style scoped>
.rows {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
}
.add {
  display: flex;
  gap: 8px;
}
.add input {
  flex: 1;
}
.primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ink);
  color: var(--ink-on-accent);
  border: 0;
  border-radius: var(--r-sm);
  padding: 10px 14px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity var(--dur) var(--ease);
}
.primary:active {
  opacity: 0.85;
}
.primary svg {
  width: 15px;
  height: 15px;
  stroke-width: 2.2;
}
.err {
  font-size: 12.5px;
  color: var(--danger);
  margin: 8px 0 0;
}
</style>