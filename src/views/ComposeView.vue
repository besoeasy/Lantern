<script setup>
import { useRouter } from "vue-router";
import { FileText } from "@lucide/vue";
import Composer from "@/components/Composer.vue";
import LoginPrompt from "@/components/LoginPrompt.vue";
import { useUserStore } from "@/stores/user.js";

const user = useUserStore();
const router = useRouter();

function onPublished() {
  router.push("/");
}
</script>

<template>
  <div class="compose">
    <LoginPrompt ignore-signer title="Sign in to post" subtitle="Use an extension or a key to publish." />

    <Composer v-if="user.pubkey" @published="onPublished" />

    <!-- Long-form went to its own screen with a Markdown editor and preview. -->
    <RouterLink v-if="user.pubkey" to="/write" class="toblog">
      <FileText />
      <span>Writing a longer piece?</span>
      <strong>Open the editor</strong>
    </RouterLink>
  </div>
</template>

<style scoped>
.compose {
  display: grid;
  gap: 12px;
}
.toblog {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  padding: 13px 15px;
  color: var(--ink-2);
  text-decoration: none;
  font-size: 13px;
  transition: border-color var(--dur) var(--ease), color var(--dur) var(--ease);
}
.toblog:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}
.toblog svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--accent);
  stroke-width: 1.9;
}
.toblog strong {
  margin-left: auto;
  color: var(--accent);
  font-weight: 700;
  white-space: nowrap;
}
</style>
