<script setup>
import { computed, ref } from "vue";
import {
  Trash2,
  RotateCcw,
  Activity,
  Server,
  Radio,
  CodeXml,
  ExternalLink,
  KeyRound,
  Copy,
  LogOut,
} from "@lucide/vue";
import { useSettingsStore } from "@/stores/settings.js";
import { useFeedStore } from "@/stores/feed.js";
import { useUserStore } from "@/stores/user.js";
import { storedNsec } from "@/lib/keys.js";
import { npubOf } from "@/lib/identity.js";
import { SIGNER_EXTENSION } from "@/lib/signer.js";
import { useCopy } from "@/composables/useCopy.js";
import ServerList from "@/components/ServerList.vue";

const s = useSettingsStore();
const feed = useFeedStore();
const user = useUserStore();
const { copied: copiedNpub, copy: copyText } = useCopy();

const originlessErr = ref("");
const relayErr = ref("");
const copy = ref("");

// Read once at setup: the value only changes through this screen's own actions.
const savedKey = ref(storedNsec());

const relays = computed(() => {
  const all = [...s.DEFAULT_RELAYS, ...s.settings.relaysExtra];
  return [...new Set(all)];
});

const aliveSet = computed(() => new Set(s.health.ok));

const signerLabel = computed(() =>
  user.signerType === SIGNER_EXTENSION
    ? "Browser extension (NIP-07)"
    : "Secret key in this browser",
);

function signOut() {
  user.logout();
  savedKey.value = storedNsec();
}

function addRelay(url) {
  relayErr.value = "";
  if (!s.addRelayUrl(url)) {
    relayErr.value = "Already in your list or not a valid wss:// URL.";
  }
}

function addOriginless(url) {
  originlessErr.value = "";
  if (!s.addOriginlessServer(url)) {
    originlessErr.value = "Already configured.";
  }
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
      <p>Account, originless upload servers and Nostr relays. Saved in this browser only.</p>
    </header>

    <section class="card">
      <div class="title">
        <KeyRound />
        <h2>Account</h2>
        <button v-if="user.pubkey" class="ghost check" @click="signOut">
          <LogOut /><span>Sign out</span>
        </button>
      </div>

      <div v-if="user.pubkey" class="who">
        <div class="idrow">
          <span class="badge">{{ signerLabel }}</span>
          <button class="npub" @click="copyText(npubOf(user.pubkey), 'Copy npub:')">
            <Copy />
            <span>{{ copiedNpub ? "Copied!" : npubOf(user.pubkey) }}</span>
          </button>
        </div>
        <p class="sub">
          {{
            user.signerType === SIGNER_EXTENSION
              ? "Signing goes through the extension on every post."
              : "Signing happens in this browser. Clearing site data deletes the key and the account with it."
          }}
        </p>
      </div>

      <template v-else>
        <p class="sub">
          Sign in with a NIP-07 extension, paste an nsec you already have, or create an account from
          the Home, Compose or Profile prompts.
        </p>
      </template>

      <p v-if="savedKey && !user.pubkey" class="notice warn">
        A secret key is saved in this browser but you are signed out. It signs in again on the next
        visit.
      </p>
    </section>

    <section class="card">
      <div class="title">
        <Server />
        <h2>Originless servers</h2>
      </div>
      <p class="sub">
        Uploads are tried in order. First server that returns a CID wins. Files land on IPFS;
        Lantern only publishes <code>ipfs://CID</code>.
      </p>

      <ServerList
        :items="s.settings.originless"
        placeholder="https://my-originless.example.com"
        submit-label="Add"
        :error="originlessErr"
        @add="addOriginless"
      >
        <template #default="{ url }">
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
        </template>
      </ServerList>
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

      <ServerList
        :items="relays"
        placeholder="wss://relay.example.com"
        submit-label="Add relay"
        :error="relayErr"
        @add="addRelay"
      >
        <template #default="{ url }">
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
        </template>
      </ServerList>
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
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 17px;
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
  background: var(--surface-sunken);
  padding: 1px 5px;
  border-radius: var(--r-xs);
  font-size: 11.5px;
  font-family: var(--font-mono);
}
.url {
  flex: 1;
  font-size: 12px;
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-3);
  opacity: 0.4;
  flex-shrink: 0;
  transition: background var(--dur) var(--ease);
}
.dot.on {
  background: var(--success);
  opacity: 1;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 18%, transparent);
}
.badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: var(--r-full);
  background: var(--surface-sunken);
  color: var(--ink-2);
  white-space: nowrap;
}
.badge.last {
  background: var(--ink);
  color: var(--on-ink);
}
.badge.custom {
  background: var(--info-bg);
  color: var(--info);
}
.who {
  display: grid;
  gap: 6px;
}
.idrow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.who .sub {
  margin-bottom: 0;
}
.npub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: var(--r-full);
  padding: 6px 12px;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--ink);
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.npub:hover {
  background: var(--surface-sunken);
  border-color: var(--line-strong);
}
.npub svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  stroke-width: 2;
}
/* Notice banners: warn, error and success share one shape, so a screen that
   needs two of them cannot drift apart visually. */
.notice {
  font-size: 12.5px;
  line-height: 1.55;
  border-radius: var(--r-sm);
  padding: 10px 12px;
  margin: 8px 0 0;
  border: 1px solid transparent;
}
.notice.warn {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}
.notice.err {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger-line);
}
.notice.ok {
  color: var(--success);
  background: var(--success-bg);
  border-color: var(--success-line);
}
.ghost {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink-2);
  border-radius: var(--r-xs);
  padding: 6px 11px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.ghost:hover {
  background: var(--surface-sunken);
  color: var(--ink);
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
  border-radius: var(--r-xs);
  display: grid;
  place-items: center;
}
.danger svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
}
.danger:hover:not(:disabled) {
  color: var(--danger);
  background: var(--danger-bg);
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
  width: 40px;
  height: 24px;
  border-radius: var(--r-full);
  background: var(--surface-sunken);
  border: 1px solid var(--line-strong);
  display: block;
  position: relative;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur) var(--ease);
}
.switch input:checked + .track {
  background: var(--success);
  border-color: var(--success);
}
.switch input:checked + .track .knob {
  transform: translateX(16px);
}
.note {
  font-size: 12.5px;
  color: var(--success);
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
  border-radius: var(--r-sm);
  padding: 10px 15px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.reset:hover,
.gh-link:hover {
  background: var(--surface-sunken);
  border-color: var(--line-strong);
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
  border-radius: var(--r-sm);
  padding: 9px 15px;
  font-family: var(--font-mono);
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.gh-link svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.9;
}
</style>
