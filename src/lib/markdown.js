import { marked } from "marked";
import DOMPurify from "dompurify";

// Markdown -> HTML for kind-30023 articles.
//
// Article content arrives from relays, so it is untrusted input from strangers.
// marked produces HTML; DOMPurify is what makes it safe to hand to v-html.
// Keep the sanitizer in the loop for every path — preview and reading view
// both go through renderMarkdown().
//
// Deliberately NOT allowed, because a remote post must not be able to:
//   - run script (stripped, always)
//   - load remote images, which would leak the reader's IP to a third party
//     just by opening a page, so `img` is dropped entirely
//   - embed iframes, objects or forms
//   - style the page around itself with class or style attributes
// Links are kept but forced to open safely: target=_blank plus
// rel="noopener noreferrer" stops the opened page from reaching back through
// window.opener.
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "strong", "em", "del", "code", "pre", "blockquote",
  "ul", "ol", "li",
  "a",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = ["href", "title", "colspan", "rowspan", "align"];

let purify = null;

// DOMPurify needs a DOM. Instantiate lazily so importing this module in a
// non-browser context (the node test runner) does not throw at import time.
function sanitizer() {
  if (!purify) {
    purify = DOMPurify(window);
    // Force every link to be inert, whatever the author wrote.
    purify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A" && node.hasAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }
  return purify;
}

marked.setOptions({
  gfm: true,
  breaks: true, // a single newline is a line break, which is what phones expect
});

/** Renders untrusted Markdown to sanitized HTML. Always safe for v-html. */
export function renderMarkdown(md) {
  const source = String(md ?? "");
  if (!source.trim()) return "";
  // marked can return a promise only with async extensions enabled; it does not
  // throw on malformed input, it just renders what it can.
  const html = marked.parse(source, { async: false });
  return sanitizer().sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Any scheme not on this list is dropped, which is what blocks
    // javascript: and data: URLs in hrefs.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|nostr:|#|\/|\.{0,2}\/)/i,
    FORBID_TAGS: ["style", "img", "iframe", "object", "embed", "form", "input", "script"],
    FORBID_ATTR: ["style", "src", "srcset", "onerror", "onload", "target", "rel"],
  });
}

/** Plain-text preview of an article, for card summaries and excerpts. */
export function excerpt(md, length = 220) {
  return String(md ?? "")
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1") // links -> their text
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
}

/** Rough reading time, at 220 words per minute. */
export function readingMinutes(md) {
  const words = String(md ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** First heading in the document, used when an article has no title tag. */
export function firstHeading(md) {
  const m = String(md ?? "").match(/^#{1,6}\s+(.+)$/m);
  return m ? m[1].trim() : "";
}