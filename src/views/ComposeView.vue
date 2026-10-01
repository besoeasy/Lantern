<script setup>
import { useRouter } from "vue-router";
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
    <LoginPrompt ignore-signer title="Login to post" subtitle="Connect a NIP-07 extension to publish." />

    <Composer v-if="user.pubkey" @published="onPublished" />
  </div>
</template>

<style scoped>
.compose {
  display: grid;
  gap: 12px;
}
</style>
