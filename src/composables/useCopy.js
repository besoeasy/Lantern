import { ref } from "vue";

// Clipboard write with a short-lived "Copied!" flag and a prompt() fallback for
// browsers that block the async clipboard API (no permission, insecure origin).
export function useCopy(resetMs = 1500) {
  const copied = ref(false);
  let timer = null;

  async function copy(text, label = "Copy:") {
    const value = typeof text === "function" ? text() : text;
    if (!value) return;
    copied.value = false;
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      prompt(label, value);
      return;
    }
    copied.value = true;
    timer = setTimeout(() => (copied.value = false), resetMs);
  }

  return { copied, copy };
}