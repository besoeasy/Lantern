import { ref } from "vue";

// The "click a button, do one async thing, show what happened" loop that the
// comment box, the reaction bar and the composer each hand-rolled: a busy flag
// (boolean, or which row is mid-flight), a message line, a `Failed: <reason>`
// catch, and a "sign in first" gate before anything can be signed.
//
// Composing them here keeps the four interaction components reporting failures
// identically — a signed publish fails in exactly the same way on any screen.
//
// requireSign: when true (the default) the action is refused with a message
// line unless a pubkey is available. Pass false for actions that work signed
// out, like loading a profile or resolving a profile image.
export function useAsyncAction({ requireSign = true, pubkey = () => "" } = {}) {
  const busy = ref(false);
  // Which row is in flight, for surfaces where several can be clicked and only
  // one should show a spinner (one emoji at a time, one relay row).
  const busyKey = ref("");
  const msg = ref("");

  function isBusy() {
    return busy.value || !!busyKey.value;
  }

  // Runs fn, turning any throw into a message line. Returns the fn result, or
  // undefined when it was refused or threw, so callers that need to branch on
  // success do so on the return value instead of a second try/catch.
  //
  // key marks a specific row as busy; leave it empty for a whole-surface flag.
  async function run(fn, key = "") {
    if (requireSign && !pubkey()) {
      msg.value = "Sign in to continue.";
      return undefined;
    }
    msg.value = "";
    busyKey.value = key;
    busy.value = !key;
    try {
      return await fn();
    } catch (e) {
      msg.value = "Failed: " + (e?.message || e);
      return undefined;
    } finally {
      busy.value = false;
      busyKey.value = "";
    }
  }

  // Replaces the current message without touching the busy state, for the
  // "published · kind 1" / "comment published" success lines.
  function say(text) {
    msg.value = text;
  }

  function clear() {
    msg.value = "";
  }

  return { busy, busyKey, msg, isBusy, run, say, clear };
}