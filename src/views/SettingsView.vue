<script setup>
import { computed, ref } from "vue";
import { Plus, Trash2, RotateCcw, Check, X, Activity, Server, Radio, CodeXml, ExternalLink } from "@lucide/vue";
import { useSettingsStore } from "@/stores/settings.js";
import { useFeedStore } from "@/stores/feed.js";

const s = useSettingsStore();
const feed = useFeedStore();

const relayInput = ref("");
const originlessInput = ref("");
const relayErr = ref("");
const originlessErr = ref("");
const copy = ref("");

const relays = computed(() => {
  const all = [...s.DEFAULT_RELAYS, ...s.settings.relaysExtra];
  return [...new Set(all)];
});

const aliveSet = computed(() => new Set(s.health.ok));

function addRelay() {
  relayErr.value = "";
  if (!relayInput.value.trim()) return;
  if (!s.addRelayUrl(relayInput.value)) {
    relayErr.value = "Already in your list or not a valid wss:// URL.";
    return;
  }
  relayInput.value = "";
}

function addOriginless() {
  originlessErr.value = "";
  if (!originlessInput.value.trim()) return;
  if (!s.addOriginlessServer(originlessInput.value)) {
    originlessErr.value = "Already configured.";
    return;
  }
  originlessInput.value = "";
}

async function testOriginless(url) {
  copy.value = `Testing ${url}…`;
  const result = await s.test(url, "originless");
  copy.value = `${url} → ${result}`;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copy.value = ""), 5000);
}

async function checkAll() {
  copy.value = "Checking relays…";
  const ok = await s.runHealthCheck();
  copy.value = `${ok.length} of ${relays.value.length} relays online`;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copy.value = ""), 5000);
  await feed.start();
}

let copyTimer;
</script>

<template>
  <div class="settings">
    <header class="head">
      <h1>Settings</h1>
      <p>Originless upload servers and Nostr relays. Saved in this browser only.</p>
    </header>

    <section class="card">
      <div class="title">
        <Server />
        <h2>Originless servers</h2>
      </div>
      <p class="sub">
        Uploads are tried in order. First server that returns a CID wins. Files land on IPFS;
        Lantern only publishes <code>ipfs://CID</code>.
      </p>

      <ul class="rows">
        <li v-for="url in s.settings.originless" :key="url" class="row">
          <code class="url">{{ url }}</code>
          <span class="badge" :class="{ last: url === s.settings.originless[0] }">
            {{ url === s.settings.originless[0] ? "primary" : "backup" }}
          </span>
          <button class="ghost" :disabled="s.testing === url" @click="testOriginless(url)">
            {{ s.testing === url ? "…" : "test" }}
          </button>
          <button
            class="danger"
            :disabled="s.settings.originless.length <= 1"
            :title="s.settings.originless.length <= 1 ? 'Keep at least one' : 'Remove'"
            @click="s.removeOriginlessServer(url)"
          >
            <Trash2 />
          </button>
        </li>
      </ul>

      <form class="add" @submit.prevent="addOriginless">
        <input v-model="originlessInput" placeholder="https://my-originless.example.com" />
        <button class="primary" type="submit"><Plus /><span>Add</span></button>
      </form>
      <p v-if="originlessErr" class="err">{{ originlessErr }}</p>
      <p v-if="copy" class="note">{{ copy }}</p>
    </section>

    <section class="card">
      <div class="title">
        <Radio />
        <h2>Nostr relays</h2>
        <button class="ghost check" @click="checkAll"><Activity /><span>Check all</span></button>
      </div>
      <p class="sub">
        Lantern probes each relay before subscribing. Disabled relays stay saved but are skipped.
      </p>

      <ul class="rows">
        <li v-for="url in relays" :key="url" class="row">
          <span class="dot" :class="{ on: aliveSet.has(url) && !s.disabledOf(url) }" />
          <code class="url">{{ url }}</code>
          <span v-if="s.extraOf(url)" class="badge custom">custom</span>
          <label class="switch">
            <input
              type="checkbox"
              :checked="!s.disabledOf(url)"
              @change="s.toggleRelayUrl(url, $event.target.checked)"
            />
            <span class="track"><span class="knob" /></span>
          </label>
          <button
            class="danger"
            :title="s.extraOf(url) ? 'Remove' : 'Disable'"
            @click="s.removeRelayUrl(url)"
          >
            <Trash2 />
          </button>
        </li>
      </ul>

      <form class="add" @submit.prevent="addRelay">
        <input v-model="relayInput" placeholder="wss://relay.example.com" />
        <button class="primary" type="submit"><Plus /><span>Add relay</span></button>
      </form>
      <p v-if="relayErr" class="err">{{ relayErr }}</p>
    </section>

    <section class="card foot">
      <button class="reset" @click="s.reset()"><RotateCcw /><span>Reset to defaults</span></button>
      <p class="sub">
        Your posts, uploads and cache are not affected. Only relay and server lists reset.
      </p>
    </section>

    <section class="card about">
      <div class="title">
        <CodeXml />
        <h2>About Lantern</h2>
      </div>
      <p class="sub">
        Lantern is open source. Star it, report issues, or contribute on GitHub.
      </p>
      <a
        class="gh-link"
        href="https://github.com/besoeasy/Lantern"
        target="_blank"
        rel="noopener"
      >
        <span>github.com/besoeasy/Lantern</span>
        <ExternalLink />
      </a>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 14px;
}
.head h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.03em;
}
.head p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--ink-2);
}
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.9;
  color: var(--ink-2);
}
h2 {
  margin: 0;
  font-size: 15px;
  letter-spacing: -0.01em;
  flex: 1;
}
.sub {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.6;
  margin: 6px 0 12px;
}
.sub code {
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 11.5px;
}
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
  border-radius: 12px;
  background: #fff;
}
.url {
  flex: 1;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d4d4d8;
  flex-shrink: 0;
}
.dot.on {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.16);
}
.badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 99px;
  background: var(--bg);
  color: var(--ink-3);
}
.badge.last {
  background: #0a0a0a;
  color: #fff;
}
.badge.custom {
  background: #dbeafe;
  color: #1d4ed8;
}
.add {
  display: flex;
  gap: 8px;
}
.add input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  min-width: 0;
}
.add input:focus {
  border-color: rgba(0, 0, 0, 0.28);
}
.primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--ink);
  color: #fff;
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.primary svg {
  width: 15px;
  height: 15px;
  stroke-width: 2.2;
}
.ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink-2);
  border-radius: 9px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.ghost svg {
  width: 13px;
  height: 13px;
  stroke-width: 2;
}
.check {
  margin-left: auto;
}
.danger {
  border: 0;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.danger svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
}
.danger:hover:not(:disabled) {
  color: #dc2626;
  background: #fef2f2;
}
.danger:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.switch {
  cursor: pointer;
  display: block;
}
.switch input {
  display: none;
}
.track {
  width: 38px;
  height: 22px;
  border-radius: 99px;
  background: #d4d4d8;
  display: block;
  position: relative;
  transition: background 0.18s;
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.18s;
}
.switch input:checked + .track {
  background: #22c55e;
}
.switch input:checked + .track .knob {
  transform: translateX(16px);
}
.err {
  font-size: 12.5px;
  color: #dc2626;
  margin: 8px 0 0;
}
.note {
  font-size: 12.5px;
  color: #15803d;
  margin: 8px 0 0;
}
.foot {
  display: grid;
  gap: 4px;
}
.reset {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  justify-self: start;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  border-radius: 12px;
  padding: 9px 15px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.reset svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
}
.foot .sub {
  margin: 4px 0 0;
}
.about .sub {
  margin-bottom: 10px;
}
.gh-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 15px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.gh-link:hover {
  background: var(--bg);
}
.gh-link svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
