<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import Composer from "@/components/Composer.vue";
import { useUserStore } from "@/stores/user.js";

const user = useUserStore();
const router = useRouter();
const loginErr = ref("");

async function login() {
  loginErr.value = "";
  try {
    await user.login();
  } catch (e) {
    loginErr.value = e.message;
  }
}

function onPublished() {
  router.push("/");
}
</script>

<template>
  <div class="compose">
    <div class="login" v-if="!user.pubkey && !user.probing">
      <div class="login-txt">
        <strong>Login to post</strong>
        <span>Connect a NIP-07 extension to publish.</span>
      </div>
      <button @click="login" :disabled="user.busy">{{ user.busy ? "…" : "Login" }}</button>
    </div>
    <p v-if="loginErr" class="err">{{ loginErr }}</p>

    <Composer v-if="user.pubkey" @published="onPublished" />
  </div>
</template>

<style scoped>
.compose {
  display: grid;
  gap: 12px;
}
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
