// Proves the Markdown path is safe, using the same DOMPurify build the browser
// gets. Run under jsdom so DOMPurify has a window to attach to.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.NamedNodeMap = dom.window.NamedNodeMap;
globalThis.HTMLTemplateElement = dom.window.HTMLTemplateElement;
globalThis.trustedTypes = undefined;

const { renderMarkdown, excerpt, readingMinutes, firstHeading } = await import("../src/lib/markdown.js");

const fails = [];
const ok = (c, m) => {
  if (c) console.log("  ok  " + m);
  else {
    console.log("FAIL  " + m);
    fails.push(m);
  }
};

// The single most important assertion: script must never survive.
console.log("\nscript execution");
const vectors = [
  "<script>window.__pwned = 1</script>",
  "<img src=x onerror=alert(1)>",
  "<svg/onload=alert(1)>",
  "<iframe src=javascript:alert(1)></iframe>",
  "<body onload=alert(1)>",
  "<a href=\"javascript:alert(1)\">click</a>",
  "<a href='javascript:alert(1)'>click</a>",
  "<a href=\"JaVaScRiPt:alert(1)\">click</a>",
  "<a href=\"data:text/html,<script>alert(1)</script>\">x</a>",
  "<!--<script>alert(1)//-->",
  "<math><mtext><script>alert(1)</script></mtext></math>",
  "<style>body{display:none}</style>",
  "<div style=\"background:url(javascript:alert(1))\">x</div>",
  "<form action=javascript:alert(1)><input></form>",
  "<object data=javascript:alert(1)></object>",
  "<embed src=javascript:alert(1)>",
  "<link rel=stylesheet href=javascript:alert(1)>",
  "<meta http-equiv=refresh content=0;url=javascript:alert(1)>",
  "<details open ontoggle=alert(1)>",
  "<table background=javascript:alert(1)>",
  "<p>ok</p><script>alert(1)</script>",
  "> <script>alert(1)</script>",
  "<xmp><script>alert(1)</script></xmp>",
];

for (const v of vectors) {
  const html = renderMarkdown(v);
  const dangerous =
    /<script/i.test(html) ||
    /\son\w+\s*=/i.test(html) ||
    /javascript:/i.test(html) ||
    /<iframe/i.test(html) ||
    /<object/i.test(html) ||
    /<embed/i.test(html) ||
    /<img/i.test(html) ||
    /<form/i.test(html) ||
    /<style/i.test(html) ||
    /\sstyle\s*=/i.test(html) ||
    /<link/i.test(html) ||
    /<meta/i.test(html);
  ok(!dangerous, `neutralised: ${v.slice(0, 52)}`);
}

// Prove it in a real document, not just by regex.
const sink = dom.window.document.createElement("div");
for (const v of vectors) {
  sink.innerHTML = renderMarkdown(v);
}
sink.querySelectorAll("script,iframe,object,embed,img,form,style,link,meta").forEach((n) => {
  fails.push("live element survived: " + n.tagName);
});
ok(
  sink.querySelectorAll("script,iframe,object,embed,img,form,style,link,meta").length === 0,
  "no active element survives into a live DOM",
);
ok(window.__pwned === undefined, "nothing executed during sanitisation");

console.log("\nlinks are forced safe");
const linkHtml = renderMarkdown("[click](https://example.com)");
const a = dom.window.document.createElement("div");
a.innerHTML = linkHtml;
const anchor = a.querySelector("a");
ok(!!anchor, "the link survived");
ok(anchor.getAttribute("target") === "_blank", "target=_blank is forced");
ok(/noopener/.test(anchor.getAttribute("rel") || ""), "rel contains noopener");
ok(/noreferrer/.test(anchor.getAttribute("rel") || ""), "rel contains noreferrer");

console.log("\nlegitimate markdown still works");
const doc = `# Title

Some **bold**, some *italic*, some \`code\`.

- one
- two

> a quote

\`\`\`js
const x = 1;
\`\`\`

[a link](https://example.com)

| a | b |
|---|---|
| 1 | 2 |

---
`;
const html = renderMarkdown(doc);
for (const [label, re] of [
  ["h1", /<h1[^>]*>Title<\/h1>/],
  ["bold", /<strong>bold<\/strong>/],
  ["italic", /<em>italic<\/em>/],
  ["inline code", /<code>code<\/code>/],
  ["unordered list", /<ul>[\s\S]*<li>one<\/li>/],
  ["blockquote", /<blockquote>/],
  ["fenced code", /<pre><code/],
  ["link", /<a href="https:\/\/example.com"/],
  ["table", /<table>/],
  ["th/td", /<th[^>]*>a<\/th>/],
  ["hr", /<hr\s*\/?>/],
]) {
  ok(re.test(html), `${label} renders`);
}

console.log("\nremote images are dropped, not fetched");
const imgHtml = renderMarkdown("![alt](https://tracker.example/pixel.gif)");
ok(!/<img/i.test(imgHtml), "img tag is stripped");
ok(!/tracker.example/.test(imgHtml), "and so is the tracking URL");

console.log("\nedge cases");
ok(renderMarkdown("") === "", "empty input gives empty output");
ok(renderMarkdown(null) === "", "null gives empty output");
ok(renderMarkdown(undefined) === "", "undefined gives empty output");
ok(renderMarkdown("   \n  ") === "", "whitespace-only gives empty output");
ok(typeof renderMarkdown("hi") === "string", "always returns a string");
ok(!renderMarkdown("```\n<script>alert(1)</script>\n```").match(/<script/i), "code fences are escaped, not executed");

console.log("\nhelpers");
ok(excerpt("# Title\n\nHello **world**") === "Title Hello world", "excerpt strips markdown noise");
ok(excerpt("![x](http://y)") === "", "excerpt drops images");
ok(excerpt("[label](http://x)") === "label", "excerpt keeps link text");
ok(excerpt("a".repeat(500)).length === 220, "excerpt caps at the requested length");
ok(readingMinutes("") === 1, "reading time floors at 1 minute");
ok(readingMinutes("word ".repeat(440)) === 2, "reading time counts words");
ok(firstHeading("## Hello\n# Later") === "Hello", "firstHeading takes the first heading");
ok(firstHeading("no headings") === "", "firstHeading returns empty when there is none");

console.log(fails.length ? "\nFAILED: " + fails.length + "\n  " + fails.join("\n  ") : "\nall checks passed");
process.exit(fails.length ? 1 : 0);