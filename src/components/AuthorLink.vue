<script setup>
import { shortPk } from "@/lib/nostr.js";

// Every card and comment footers the same short-pubkey link to the author's
// profile. Styling differs per surface, but because this is a child component
// the parent's scoped `.pk` rule still lands on its root element, so each
// caller keeps styling it in its own stylesheet.
defineProps({
  pubkey: { type: String, required: true },
});
</script>

<template>
  <RouterLink :to="`/profile/${pubkey}`" class="pk">
    <slot>{{ shortPk(pubkey) }}</slot>
  </RouterLink>
</template>