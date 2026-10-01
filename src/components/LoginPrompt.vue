<script setup>
import { computed, ref } from "vue";
import { useUserStore } from "@/stores/user.js";

// The "connect a NIP-07 extension" prompt. Every screen that needs a signer
// rendered the same banner, the same login() try/catch and the same error
// line; only the two strings differed.
const props = defineProps({
  title: { type: String, default: "Login" },
  subtitle: { type: String, default: "Connect a NIP-07 extension to continue." },
  // Set when a signer was found but login did not stick: there the banner is
  // just noise, since silent auto-login already ran.
  ignoreSigner: { type: Boolean, default: false },
});

const user = useUserStore();
const err = ref("");

const visible = computed(
  () => !user.pubkey && !user.probing && (props.ignoreSigner || !user.signerFound),
);

async function login() {
  err.value = "";
  try {
    await user.login();
  } catch (e) {
    err.value = e.message;
  }
}
</script>

<template>
  <template v-if="visible">
    <div class="login">
      <div class="login-txt">
        <strong>{{ title }}</strong>
        <span>{{ subtitle }}</span>
      </div>
      <button @click="login" :disabled="user.busy">{{ user.busy ? "…" : "Login" }}</button>
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
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
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
.login button {
  flex-shrink: 0;
  border: 0;
  background: var(--ink);
  color: #fff;
  border-radius: 99px;
  padding: 9px 20px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
.err {
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 10px 14px;
  margin: 0;
}
</style>