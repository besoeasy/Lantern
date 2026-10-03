<script setup>
import { computed, ref } from "vue";
import { Check, Copy, KeyRound, Plus, TriangleAlert } from "@lucide/vue";
import { useUserStore } from "@/stores/user.js";
import { hasNip07 } from "@/lib/signer.js";
import { npubOf } from "@/lib/identity.js";
import { useCopy } from "@/composables/useCopy.js";
import { useAsyncAction } from "@/composables/useAsyncAction.js";

// The sign-in gate. Every screen that needs a signer rendered the same banner,
// the same login() try/catch and the same error line; only the two strings
// differed. Three ways in, since a NIP-07 extension is not the only option:
// the extension, a secret key the user already has, or a brand new account.
const props = defineProps({
  title: { type: String, default: "Sign in" },
  subtitle: { type: String, default: "Sign in to continue." },
  // Set when a signer was found but login did not stick: there the banner is
  // just noise, since silent auto-login already ran.
  ignoreSigner: { type: Boolean, default: false },
});

const user = useUserStore();
const draft = ref("");
// The nsec of a just-created account. Shown once, here, and nowhere else —
// there is no way to recover it once this box is dismissed.
const fresh = ref(null);
const { copied, copy } = useCopy();

const visible = computed(
  () =>
    // A freshly created account stays on screen until the user dismisses the
    // backup, even though pubkey is already set — otherwise the only copy of
    // the nsec would flash past.
    !!fresh.value || (!user.pubkey && !user.probing && (props.ignoreSigner || !user.signerFound)),
);
// Probed, not read once: autoLogin waits up to 3s for an extension to inject,
// and the button should appear when it finally does.
const extensionHere = computed(() => hasNip07() || user.signerFound);

// Signing in is not a signed action, so it opts out of the pubkey gate and
// shows the bare reason; the .err style here is an inline warning, not the
// "Failed:" line the publish paths use.
const { msg: err, run } = useAsyncAction({ requireSign: false });

function unlock() {
  const key = draft.value.trim();
  if (!key) return;
  run(() => {
    user.loginWithSecret(key);
    draft.value = "";
  });
}

function create() {
  fresh.value = null;
  run(() => {
    fresh.value = user.createAccount();
  });
}

function copyKey() {
  copy(fresh.value?.nsec, "Backup your secret key:");
}

function dismiss() {
  fresh.value = null;
}
</script>

<template>
  <template v-if="visible">
    <div v-if="!fresh" class="login">
      <div class="login-txt">
        <strong>{{ title }}</strong>
        <span>{{ subtitle }}</span>
      </div>

      <button
        v-if="extensionHere"
        class="ext"
        :disabled="user.busy"
        @click="run(() => user.login())"
      >
        {{ user.busy ? "…" : "Use extension" }}
      </button>
    </div>

    <div v-if="!user.pubkey" class="ways">
      <form class="keyrow" @submit.prevent="unlock">
        <KeyRound class="ico" />
        <input
          v-model="draft"
          type="password"
          placeholder="nsec1… or 64-char hex"
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
        />
        <button type="submit" class="go" :disabled="user.busy || !draft.trim()">Unlock</button>
      </form>
      <button class="new" :disabled="user.busy" @click="create">
        <Plus /><span>Create a new account</span>
      </button>
      <p class="hint">
        A key in this browser signs posts like an extension does. It stays on this device.
      </p>
    </div>

    <div v-if="fresh" class="fresh">
      <p class="fresh-t">
        <TriangleAlert class="warn" />
        <span>Copy this secret key now — it is the only way back into this account.</span>
      </p>
      <div class="keyrow">
        <code class="secret">{{ fresh.nsec }}</code>
        <button class="go" @click="copyKey">
          <Check v-if="copied" /><Copy v-else /><span>{{ copied ? "Copied" : "Copy" }}</span>
        </button>
      </div>
      <p class="hint">
        Signed in as <code>{{ npubOf(fresh.pubkey) }}</code>
      </p>
      <button class="new" @click="dismiss">I've saved it</button>
    </div>

    <p v-if="err" class="err">{{ err }}</p>
  </template>
</template>

<style scoped>
.login {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 14px 16px;
}
.login-txt {
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--ink-2);
}
.login-txt strong {
  font-size: 14px;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.login .ext {
  flex-shrink: 0;
  border: 0;
  background: var(--ink);
  color: var(--on-ink);
  border-radius: var(--r-full);
  padding: 10px 20px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: transform var(--dur) var(--ease);
}
.login .ext:active {
  transform: scale(0.97);
}
.ways {
  margin-top: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 13px 14px;
  display: grid;
  gap: 9px;
}
/* The nsec input and the read-only key share a frame, so the secret does not
   shift when it is replaced by generated text. */
.keyrow {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 6px 6px 6px 10px;
  background: var(--surface);
  transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.keyrow:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.keyrow .ico {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--ink-3);
  stroke-width: 2;
}
.keyrow input {
  flex: 1;
  border: 0;
  background: transparent;
  padding: 6px 0;
  font-size: 13px;
  font-family: var(--font-mono);
  color: var(--ink);
  outline: none;
  min-width: 0;
}
.secret {
  flex: 1;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 2px;
}
.go {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: var(--ink);
  color: var(--on-ink);
  border-radius: var(--r-xs);
  padding: 8px 14px;
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
  transition: transform var(--dur) var(--ease);
}
.go:not(:disabled):active {
  transform: scale(0.96);
}
.go:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.go svg {
  width: 13px;
  height: 13px;
  stroke-width: 2.2;
}
.new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: var(--r-sm);
  padding: 10px 14px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.new:hover {
  background: var(--surface-sunken);
  border-color: var(--line-strong);
}
.new svg {
  width: 15px;
  height: 15px;
  stroke-width: 2.2;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.55;
}
.hint code {
  background: var(--surface-sunken);
  padding: 1px 5px;
  border-radius: var(--r-xs);
  font-size: 11.5px;
  font-family: var(--font-mono);
}
.fresh {
  margin-top: 8px;
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: var(--r-lg);
  padding: 13px 14px;
  display: grid;
  gap: 9px;
}
.fresh-t {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.5;
}
.fresh-t .warn {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  margin-top: 1px;
  stroke-width: 2.2;
}
.err {
  font-size: 13px;
  line-height: 1.55;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger-line);
  border-radius: var(--r-sm);
  padding: 10px 13px;
  margin: 8px 0 0;
}
</style>
