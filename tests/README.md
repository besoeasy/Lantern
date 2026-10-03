# Tests

Browser tests for Lantern's post round-trip: compose a post in the UI, watch it
reach a relay, and read it back.

## Running

```bash
npm test              # everything
npm run test:e2e      # browser post round-trip only
npm run test:blog     # blog editor + reading view
npm run test:md       # Markdown sanitiser, no browser
npm run test:relay    # local relay + nostr-tools, no browser
npm run shots         # render every screen to ./screenshots (asserts nothing)
```

Run one test by name fragment:

```bash
ONLY="full page reload" npm run test:e2e
```

## Why there is a local relay

The suite runs against `tests/relay.mjs`, a NIP-01 relay on an ephemeral port,
rather than the public relays listed in `plan.md`. A community relay being down,
slow, or rate-limiting would make these tests flaky and would mean writing real
events to someone else's server on every run. The local relay verifies
signatures and enforces the POW minimum, so it rejects anything a real relay
would.

The app is pointed at it through `localStorage`, which it reads at module load.
Nothing else is stubbed: the app signs, opens real websockets, and speaks real
NIP-01 in the browser.

## What is covered

`relay.test.mjs` checks the harness itself, without a browser: publish, reject a
tampered event, reject low POW, query by `ids`/`authors`/`kinds`/`#tag`, receive
a live event over an open subscription, and idempotency.

`markdown-security.test.mjs` runs the real DOMPurify build under jsdom and
throws 24 XSS vectors at the renderer — script tags, event handlers,
`javascript:` and `data:` URLs, iframes, styles, forms, obfuscated payloads —
then asserts nothing active survives into a live DOM and nothing executed. It
also checks that legitimate Markdown (tables, fenced code, headings, links) still
renders, so the allow-list cannot be tightened into uselessness.

`post-round-trip.test.mjs` drives Chromium through the app:

| Test | Claim |
| --- | --- |
| new account | The sign-in prompt creates an account and offers the nsec once |
| note reaches relay | Signed kind 1, valid signature, `client=lantern`, ≥16 bits POW, 3-year expiry |
| readable after reload | Post returns after a reload with IndexedDB wiped, so it came off the wire |
| existing nsec | A pasted key signs in silently and signs as itself |
| bad nsec | Rejected with a readable message, nothing stored |
| signed out | Compose is gated; nothing is published |
| another author | A second identity, with a cold cache, receives and renders the post |
| every relay | Both relays hold the same event id and signature |
| post page | `/#post/<id>` fetches by id; the raw JSON is the relay's event |
| comments + reactions | Replies tag the parent; reactions are NIP-25 kind 7; both verify |
| sign out | The key is erased and publishing stops |

`blog-editor.test.mjs` covers the Markdown writing flow:

| Test | Claim |
| --- | --- |
| slugify | URL-safe slugs: accents folded, dashes trimmed, 64-char cap |
| separate screen | The composer has no blog tab; a link leads to `/#/write` |
| live preview | Headings, bold, lists and links render as you type |
| preview is inert | Hostile Markdown in the editor does not execute |
| default view | A phone opens in Write, a desktop opens in Split; Split is offered only when it fits |
| view modes | Write / Split / Preview all switch the panes |
| wrapped prose | A soft newline does not become a line break; two trailing spaces still do |
| duplicate title | A leading H1 repeating the title is dropped, not shown twice |
| slug behaviour | Follows the title until the author edits it, then stops |
| publishes | Kind 30023 with `d`, `title`, `summary`, `published_at`, hashtags |
| reading view | Full Markdown rendered, not the clamped card; reading time shown |
| hostile article | A malicious article published straight to the relay is neutralised on read |
| blocked publish | Publish stays disabled until title and body exist |
| gated | No editor at all while signed out |

## Environment

Chromium comes from the system Chrome (`/usr/bin/google-chrome`), because the
Playwright browser download is not present. Override with `CHROME_PATH`.

## Looking at the UI

`npm run shots` starts the same harness, seeds one post of each kind, and writes
a PNG of every screen in both colour schemes to `./screenshots`. It asserts
nothing — it exists because the `:deep()` bug below was invisible in the CSS and
in every test, and obvious the moment the page was rendered.

`v-html` content never carries a scoped-style attribute, so a plain `.md h1`
rule in a `<style scoped>` block compiles to `.md h1[data-v-xxx]` and silently
matches nothing. If you add styles for rendered Markdown, use `:deep()`.

## Adding tests

`harness.mjs` provides `startRelay`, `startDevServer`, `launchBrowser`,
`openApp`, `waitFor` and `suite`. A new `*.test.mjs` file is picked up by
`npm test` automatically; files run sequentially, each with its own relays,
dev server and browser.