// URL-slug rules for NIP-23 articles.
//
// A kind-30023 `d` tag becomes the article's permanent address, so the rules
// are deliberately strict: lowercase alphanumerics and single dashes, capped at
// 64 characters. Anything else is collapsed away rather than encoded, because a
// slug has to survive being pasted into a URL bar without escaping.
//
// Shared by the blog editor and the composer's blog builder, so both produce
// identical slugs for the same title.

const MAX = 64;

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "Café" -> "cafe"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") // no leading or trailing dashes
    .slice(0, MAX)
    .replace(/-+$/g, ""); // the slice can leave one behind
}

/**
 * A slug that is guaranteed not to collide with an existing one, by appending a
 * short timestamp when the preferred slug is already taken.
 */
export function uniqueSlug(text, taken = []) {
  const base = slugify(text) || `post-${Date.now().toString(36)}`;
  if (!taken.includes(base)) return base;
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}