import { ref } from "vue";

// Shared plumbing for every "live event stream" list in the app (feed, tag
// timeline, author timeline, comments, reactions). Every one of them did the
// same three things: drop duplicate ids, optionally reject events, and keep
// the array ordered.
//
// order: "desc" newest first (feeds), "asc" oldest first (comments),
//        null to keep arrival order (reactions).
// guard: optional extra rejection filter.
// cap:   optional max length; the tail is dropped, so pair it with a sort.
export function useEventList({ order = "desc", guard = null, cap = 0 } = {}) {
  const items = ref([]);
  const seen = new Set();

  function add(ev) {
    if (guard && !guard(ev)) return;
    if (!ev?.id || seen.has(ev.id)) return;
    seen.add(ev.id);
    items.value.push(ev);
    if (order) {
      const dir = order === "asc" ? 1 : -1;
      items.value.sort((a, b) => dir * (a.created_at - b.created_at));
    }
    if (cap && items.value.length > cap) items.value.length = cap;
  }

  function reset() {
    items.value = [];
    seen.clear();
  }

  return { items, add, reset };
}
