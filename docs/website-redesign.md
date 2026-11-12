# Website redesign: audit and proposed plan

Status: Phase 1 (audit) done 2026-11-11. Phase 2 (plan) **approved by the owner 2026-11-11** ("yes to everything": Next.js in `web/`, retire the Expo app once the site reaches parity, lavender accent, dark only, self-hosted Inter, cut Who Has More? and phone-only reminders). Phase 3 (build) in progress: see section 7.

Tools used, as required: `DESIGN.md` (binding visual system), `design-taste-frontend` (its `consistency.mjs` checker, run without arming its build gate), `playwright-cli` (screenshots and behavior probes), `web-design-guidelines` (rules fetched 2026-11-11 from vercel-labs/web-interface-guidelines `command.md`).

## 1. Architecture today

- **Pipeline** (`pipeline/`, Python 3.12, uv): pulls ESPN feeds, computes every stat, percentile and range, and publishes versioned JSON to the `gh-pages` branch under `/v2/` (`manifest.json`, `players.<hash>.json` 1.5 MB / 408 KB gzip, `teams.<hash>.json`, `games.<hash>.json` 196 KB / 59 KB gzip, `puzzles.json`). A GitHub Actions workflow runs it six times a day until ESPN has caught up.
- **Frontend** (`app/`, 68 `.tsx` files, 11.4k lines): Expo SDK 58, React 19, React Native 0.88 rendered to the browser through React Native Web, routed by expo-router with `NativeTabs` (four tabs, each with its own stack, so `/players/player/1`, `/graphs/player/1` and `/play/player/1` are the same screen at three URLs).
- **Data flow**: the browser fetches `manifest.json`, then the hashed files, caches them in AsyncStorage (localStorage on the web) and computes the derived views client-side (rank bands, insights, comps, heat check, chart layout).
- **Charts**: hand-written SVG through `react-native-svg` (scatter, beeswarm distribution, team quadrant, luck strip, trend line), with pure math in `graphs/*.ts`.
- **Reusable as-is**: about 3,200 lines of framework-free TypeScript (stat catalog, formatting, chart math, label placement, card insights, comps, head-to-head, game logs, team analysis, game logic, data parsing) and 18 Jest suites (222 tests). None of it depends on React Native.

## 2. What the tools found

### playwright-cli (16 routes x 1440 / 768 / 390)

Screenshots: `C:\Users\orham\AppData\Local\Temp\claude\cf404117d9d7203f\ac5054d1-8910-4918-9071-110a02a92cf7\scratchpad\shots` (48 files, `<page>-d|t|p.png`).

| Probe | Result |
|---|---|
| `<title>` | empty on all 15 app pages |
| `<a href>` links | 0 on every page; all navigation is JavaScript on `div`/`button` |
| `<h1>` per page | 9 to 14 (inactive tabs stay mounted), no `h2`, no `main`, no `nav` |
| meta description, Open Graph, canonical, theme-color | none |
| Keyboard focus ring | `1px rgb(16,16,16)` outline on a near-black page: invisible |
| Chart hover | nothing appears; no tooltip, no crosshair |
| Filters and presets in the URL | no: sort, position, per-36 and chart preset are lost on reload and cannot be shared |
| Tap targets under 44 px at 390 wide | 30 of 90 on the home page |
| 404 | Expo's stock "Unmatched Route" page with a Sitemap link |
| Desktop layout | the phone layout stretched to 1440 px; no max width, no columns; "Settings" clipped at the right edge |
| Production JavaScript | 2.2 MB raw, **641 KB gzip**, before any data |
| Web build mode | `output: "server"`: the export contains no HTML files, so it cannot be hosted statically as configured |
| Dev console | one hydration error on every page (expo-router tab ids) |

### design-taste-frontend (`consistency.mjs --quick`, 1440 and 390)

| Page | FAIL | Most frequent |
|---|---|---|
| Home | 34 (13 WARN) | container-edges 7, cut-text 5, focus-visible 4, hero-screen 3, one-section 3 |
| Player | 27 | container-edges 8, focus-visible 4, tap-size 3, no-visual 3 |
| Graphs | 29 | container-edges 9, focus-visible 4, button-styles 4, copy-actions 3 |

Real problems it caught: no content container (text runs edge to edge), invisible focus, no page title, undersized tab bar targets, text cut in the horizontal card scroller, four button looks on one screen, a first heading ("Today") that never says what the site is. Rules that do not fit a data tool (one section per screen, a hero on every page) are noted in section 4.

### web-design-guidelines (terse findings, `file:line`)

```text
## src/app/_layout.tsx
:46 - tab bar is a JS tablist, not <nav> with <a>; no skip link; no <main>
:all - no <title>, description, og:*, theme-color, color-scheme: dark

## src/lib/usePlayerLink.ts
:19 :20 :21 :24 - router.push navigation without <a> (no Ctrl/middle-click, no "copy link")

## src/app/players/index.tsx
:120 :201 - row/onPress navigation without <a>
:77 - input: no name, no autocomplete="off", placeholder lacks "…", no results live region
:143 - Switch state (qualified only) not in URL
:57-70 - sort, scale and position filters in useState, not URL
:155 - list rows are divs, not a <table>; columns not sortable by header

## src/app/graphs/index.tsx
:83-95 - preset, axes, position, highlights read from URL once, never written back
:528 - onPress navigation without <a>
:231 - Switch not in URL

## src/graphs/ScatterChart.tsx :136, DistributionChart.tsx :88, TeamQuadrantChart.tsx :131, LuckStrip.tsx :108, TrendChart.tsx :71
- role="img" element with a click handler; points not keyboard reachable; no hover state; no tooltip

## src/components/Segmented.tsx
:25 :33 - div role="tab" without arrow-key handling or tabpanel; no hover state

## src/components/Section.tsx :13, src/screens/PlayerScreen.tsx :266
- every section heading renders as <h1>; no hierarchy

## src/lib/format.ts
:6 - toFixed number formatting (47 call sites) instead of Intl.NumberFormat
:39-45 - hand-built month names instead of Intl.DateTimeFormat

## src/components/Skeleton.tsx
:14 ✓ honors reduced motion (the only animation in the app)

## glyphs used as icons, not aria-hidden (22 sites)
src/app/players/index.tsx:204, src/screens/PlayerScreen.tsx:121 :343 :362, src/components/TeamChip.tsx:18, src/app/play/streak.tsx:169 :170 :213, src/app/play/mystery.tsx:109 :138 :285 ...

## copy written for a phone (15 sites)
src/app/play/index.tsx:58 "Scores stay on this phone", src/app/(today)/settings.tsx:37, "Tap …" throughout

## app-wide
- no hover state on any control (0 matches)
- no touch-action, no -webkit-tap-highlight-color
- headings and buttons not in Title Case; "..." not used (✓)
- tabular-nums ✓, alt text n/a (no <img>), virtualized player list ✓
```

## 3. Honest critique

**It is a phone app in a browser tab, and it shows.** The work on the numbers is strong: honest ranges, gated claims, plain-English answers. The web experience around them is not at the level of the data.

1. **Not a website structurally.** No links, titles, landmarks or headings. Nothing can be opened in a new tab, bookmarked with its filters, indexed, or previewed when shared in a group chat, which is the product's whole pitch.
2. **Desktop is unusable as designed.** A 1440 px window shows one stretched column: three numbers spread across 1,400 px, percentile rings 1,200 px from their labels, a scatter plot wider than it is tall. There is no density, no side-by-side comparison, no table.
3. **Generic look.** Rounded gray cards stacked on black, an orange pill button, a floating pill tab bar. It reads as a default dark-mode template. Nothing in type, layout or motion says "premium analytics product".
4. **Charts are static pictures.** No hover, no tooltip, no keyboard access, no cross-highlighting. On desktop, where a pointer exists, the charts feel dead.
5. **No real homepage.** "Today" opens on a date and an orange game banner. A first-time visitor is never told what the site is or invited to search.
6. **Inconsistent details.** Four button looks on one screen; text glyphs (`›`, `✕`, `★`, `▲`) used as icons; a player page reachable at three URLs; rings say "100" where sentences say "better than 99%"; phone words ("tap", "this phone") on a desktop.
7. **Heavy.** 641 KB of compressed JavaScript before data, then 408 KB of player data on every first visit, to show one player.
8. **Keyboard and screen-reader users are locked out of the charts**, and cannot see where focus is anywhere.

What is worth keeping: the question-led titles and answer-first copy, the range and "not settled" logic, label placement that never covers a dot, the validated color-blind-safe palettes, the contrast tests.

## 4. Where the required tools disagree (decisions needed)

| Conflict | Recommendation |
|---|---|
| `DESIGN.md` makes lavender-blue `#5e6ad2` the single accent. `design-taste-frontend` bans violet and lavender. | Follow `DESIGN.md` (it is the binding system) and record a waiver for the skill's rule. |
| `DESIGN.md`: no light mode. The app has System / Dark / Light. | Dark only. The Settings page goes away. |
| `DESIGN.md` button hover is white text on `#828fff`: 2.87:1, fails AA. Lavender `#5e6ad2` as text is 4.05:1 on cards, fails AA. Focus ring at 50% opacity is under 3:1. | Lavender only as a fill behind white text (4.70:1). Links and focus rings use `#828fff` (6.6:1). Button hover keeps the fill and adds a lighter top edge. `ink-tertiary` `#62666d` (3.3:1) only for disabled text. |
| The taste skill forbids captions under visuals. This product requires every chart to explain itself. | Put the answer above the chart (title plus one takeaway line) and move method notes into a "How to read this" disclosure. No paragraph under charts. |
| The taste skill is built for marketing pages: a hero, one section per screen, a dealt "moment". | Apply it in full on the homepage. On tool pages (player, team, table, charts, games) apply its system, edges, focus, tap-size, copy and motion checks, and waive hero / one-section / moment with the reason "data tool page". |
| The current position color for forwards (`#9085E9`) is nearly the accent hue. | Re-pick the three position colors on the new surface and re-run the dataviz validator. Colors only; no numbers change. |

## 5. Proposed plan (Phase 2)

### 5.1 Stack

Build a new site in `web/` and leave `app/` untouched until the site reaches parity.

- **Next.js (App Router) with static export, React 19, TypeScript strict, plain CSS (CSS Modules + custom properties).** Every player and team page is generated as real HTML at build time, with its own title, description and share tags. Charts stay hand-written SVG (no chart library). No Tailwind, no UI kit, no animation library.
- **Same numbers, by construction.** The pure TypeScript modules and their 222 tests move over unchanged; pages call the same functions on the same published JSON. The Python pipeline is not touched.
- **Data at build time.** The build reads `/v2/` once and gives each page only what it shows (a player page gets that player's rows, ranges, comps and game log, not the whole league). The nightly workflow rebuilds the site after it publishes data.
- **Budget.** Under 150 KB gzip of JavaScript on a player page (641 KB today); charts below the fold mount when scrolled into view.
- New dependencies needing approval: `next` (and its peer `react-dom`, already present), a self-hosted Inter variable font (the substitute `DESIGN.md` names). Nothing else.

Alternative considered: keep Expo web and patch it (static output, `Link`, per-page head). Cheaper to start, but React Native Web cannot produce semantic tables and headings cleanly, has no CSS media queries or hover, and keeps the 641 KB baseline. It caps the result below "premium".

### 5.2 Design tokens (one file: `web/src/styles/tokens.css`)

Taken from `DESIGN.md` front matter, with the contrast fixes from section 4.

- **Color**: `--canvas #010102`, `--surface-1 #0f1011` to `--surface-4 #191a1b`, `--hairline #23252a`, `--hairline-strong #34343a`, `--ink #f7f8f8`, `--ink-muted #d0d6e0`, `--ink-subtle #8a8f98`, `--ink-disabled #62666d`, `--accent #5e6ad2` (fills), `--accent-text #828fff` (links, focus), `--success #27a644`. Game feedback adds one `--danger`, always paired with an icon and label.
- **Data colors** (separate namespace `--viz-*`): the five-step cold-to-hot percentile scale, three position colors, band, grid, axis. Re-validated against `--surface-1` with the dataviz validator before use.
- **Type**: Inter variable. Scale from `DESIGN.md`: 56 / 40 / 28 / 22 / 20 / 18 / 16 / 14 / 12, weights 400 / 500 / 600, negative tracking on display sizes, +0.4 px on eyebrows, tabular figures on every number.
- **Spacing**: 4, 8, 12, 16, 24, 32, 48, 96. **Radius**: 4, 6, 8 (buttons, inputs), 12 (cards), 16 (chart panels), pill.
- **Elevation**: no shadows. Surface ladder plus 1 px hairlines; a faint top-edge highlight on lifted panels. Focus: 2 px `--accent-text` ring with 2 px offset.
- **Motion**: 150 / 200 / 250 ms, transform and opacity only, off under reduced motion.
- **Layout**: 1280 px max content width, 12-column grid, 24 px gutters; breakpoints 1280 / 1024 / 768 / 480.

### 5.3 Component library (`web/src/components/`)

Shell: `TopNav` (56 px, wordmark, links, search), `MobileNav`, `Footer`, `SkipLink`, `Container`.
Search: `SearchPalette` (Ctrl/Cmd+K and a visible field; players and teams; accent-insensitive; arrow keys; ARIA combobox).
Data display: `StatCard`, `StatTile`, `PlayerHeader`, `TeamHeader`, `PercentileRow` (ring plus range bar), `InsightList`, `DataTable` (real `<table>`, sortable headers, sticky first column, URL-synced sort), `TeamChip`, `Avatar`, `Badge`.
Controls: `Button` (primary / secondary / tertiary), `SegmentedControl` (radio semantics, arrow keys), `FilterChips`, `Toggle`, `Disclosure`.
Charts: `ChartFrame` (question title, takeaway, legend, "How to read this", table view toggle), `Tooltip`, `Legend`, plus the five chart types.
Games: `GameShell`, `ScoreBar`, `ChoiceButton`, `GuessInput`, `ResultBanner`, `Medal`.
States: `Skeleton` (shaped like the final layout), `EmptyState`, `ErrorState`, `StaleBanner`.

### 5.4 Chart style

- Axes and grid in `--hairline`; axis titles in words; right or up is always better.
- Hover and keyboard: nearest-point tooltip with the player, both values and rank; arrow keys step through points; Enter opens the player. A "View as table" toggle on every chart.
- Never color alone: names on highlighted marks, shapes for player 1 / player 2, hollow marks for thin samples, legend always present for two or more series.
- Team colors only as identity (chip and a thin ring on that team's mark), never as the data encoding.
- Sized by container, not window: charts sit in a column with a fixed aspect ratio and a detail panel beside them on desktop, stacked on phones.
- Load: marks fade and settle once over 250 ms when first scrolled into view; nothing moves afterwards; none under reduced motion.

### 5.5 Site structure and URLs

| URL | Page |
|---|---|
| `/` | Home: what it is, search, last night's best, heat check, league leaders, today's game |
| `/players` | Sortable leaderboard table. State in URL: `?sort=ts_pct&per=36&pos=G&q=` |
| `/players/luka-doncic-3945274` | Player page (id keeps the link stable). `?pool=all` |
| `/stats/ts_pct` | One stat across the league: distribution and leaders. `?player=&pos=` |
| `/teams`, `/teams/den` | League charts and standings; team page |
| `/compare?a=3975&b=3112335` | Head to head |
| `/explore` | Scatter playground. `?preset=&x=&y=&pos=&hl=` |
| `/games`, `/games/daily`, `/games/higher-lower`, `/games/box-score-mystery`, `/games/trophies` | Games hub and games |
| `/glossary`, `/about`, 404 | Reference, method and data source, not found |

One canonical URL per player and team (today each has three). Every filter, tab and chart setting lives in the query string.

### 5.6 Build order (one page at a time, each verified and approved)

0. Foundation: project, tokens, shell (nav, search, footer), base components, chart frame, build-time data layer, tests moved over.
1. Player page (the page people will share most).
2. Home.
3. Players table.
4. Compare.
5. Teams index and team page.
6. Explore (scatter).
7. Stat distribution page.
8. Games hub, Daily Guess, Higher or Lower, Box Score Mystery, Trophies.
9. Glossary, About, 404; titles, descriptions, share previews, favicon (Phase 4).

After each: playwright-cli screenshots at three widths plus a click-through, a web-design-guidelines pass on the changed files, the taste skill's preflight, a commit, and a summary for approval.

## 6. Flags (data layer, not changed)

- Player names arrive from ESPN without accents ("Luka Doncic", "Nikola Jokic"). Display only; fixing it means a pipeline change.
- `GAME_MARGIN_SD = 12` is still the assumed spread of game margins; the code comment says to replace it with the measured value once box scores exist. They now do.
- Box score sums disagreed with ESPN season totals for 3 of 447 players on Nov 3 (warning only).
- Percentile rings round 99.7 up to "100" while sentences cap at 99. Presentation, not data; the redesign should pick one.
- Share previews for a specific comparison (`/compare?a=&b=`) cannot be unique on static hosting; player and team pages can.

## 7. Build log (Phase 3)

| Step | State | Notes |
|---|---|---|
| 0. Foundation | done 2026-11-12 | `web/`: Next.js 16 static export, tokens (`src/styles/tokens.css`), shell (top bar, search palette, mobile menu, footer, skip link), base components, chart frame, build-time data layer, 15 logic test suites moved over unchanged plus token-contrast, route and search tests. |
| 1. Player page | done 2026-11-12, approved | `/players/<name>-<id>`, 461 pages. |
| 2. Home | done 2026-11-12, approved | Hero with search and a live percentile card of the Game Score leader; the best games of the last night with the heat check and the stat of the day; top 5 in 8 stats; the best games of the season; a closing search in the footer. "Your players" appears for readers who follow someone. A games section joins it when the games are built (step 8). |
| 3. Players table | done 2026-11-12, awaiting review | `/players`: every player in one sortable table (15 columns), with position, per game / per 36 / per 100, a qualified-only switch, a name filter and 50-row pages. All of it lives in the query string (`sort`, `order`, `per`, `pos`, `show`, `q`, `page`). Ranks stay the real ones while filtering by name. The browser gets a packed copy of the rows (about 41 KB gzip of HTML), not the full data file. |
| 4. Compare | next | |
| 5 to 9 | not started | Nav links to pages not yet built land on the 404 page. |

Not built yet from the component list in 5.3: the sortable `DataTable` (arrives with the Players table, step 3) and the game components (step 8).

### Measured on the player page

- JavaScript: 148 KB gzip in a modern browser (641 KB before). HTML 22 KB gzip, CSS 8 KB gzip.
- One `h1`, four `h2`, 88 real links, 7 real tables, title, description, canonical and Open Graph tags.
- No sideways scroll from 320 px to 1440 px. Controls are 44 px tall on touch screens and phone-width windows.
- The 29 logic files are byte-identical to `app/src` except `theme/teams.ts` (one import replaced by the two-color constant it imported).

### Measured on the home page

- Five sections, each exactly one screen at 1440 x 900 (0, 900, 1800, 2700, 3600 px); the hero ends on the first screen at 1440, 768 and 390 wide.
- JavaScript 143 KB gzip, HTML 17 KB gzip. No sideways scroll at 320 px. Copy-lint: 0 FAIL.
- design-taste checker: 28 FAIL at first run, 11 left, all waived below.

### Measured on the players table

- JavaScript 146 KB gzip, HTML 41 KB gzip (the packed rows included). No sideways page scroll from 320 px up; the table scrolls inside the page with rank and player pinned below 1280 px, and its header row stays in view above 1280 px.
- Found and fixed: screen-reader labels inside the sort buttons are absolutely positioned and escaped the scroll box, widening the whole page on phones. The scroll box now sets `position: relative`.

### Waivers

Rules from the required tools that are deliberately not followed, each with its reason.

| Tool and rule | Where | Reason |
|---|---|---|
| taste: no violet or lavender | whole site | `DESIGN.md` is the binding visual system and makes lavender the accent (owner decision 3). |
| taste: `hero-fill`, `hero-screen`, `one-section`, `section-height`, `one-heading`, `section-gaps`, `flush`, `cta`, `no-visual`, `moment-none` | tool pages (player, team, table, charts, games) | Marketing-page structure: a hero alone on the first screen, one section per screen, a closing call to action. A data page puts the answer and the charts on the first screen. Applied in full on the home page. |
| taste: `copy-headline`, `copy-headings` | player page | The `h1` is the player's name and section headings are the questions fans ask; the checker wants a product category noun in each. |
| taste: `container-edges` | whole site | The checker looks for its own `.wrap` class. The site has one container: content sits 80 px from both edges at 1440 px and 16 px on a phone, and the two-column split is on the 12-column grid. |
| taste: `row-lines` ("every item one height"), `top-stagger` | percentile card, stat tables | A chart row holds a label, a track and a value of different heights by design; table groups flow in two balanced columns. |
| taste: `no-visual`, `card-visual` | home page sections 2 to 4 | The checker wants a picture or a mock beside the text. These sections are the product itself: live ranked lists with real numbers and bars. They are not marked as mocks (`data-ui`), because that would hide their links from the tap-size and text checks. The hero's percentile card, which is a still preview, is marked. |
| taste: `container-edges` (text inside a panel starts 9 px in; a box over half the container must span it) | home page lists | DESIGN.md's panels carry inner padding, and the lists need 7 of 12 columns to show a full box line. |
| taste: dealt palette, hero, moments and the kit's CSS and scripts | home page | DESIGN.md fixes the palette and type, and the kit is a large library (owner rule: no big new libraries). The hero entrance, hover lifts and press states are written by hand. |
| taste: `copy-stat-strip`, `copy-length`, `label-centre`, `action-repeat` (warnings) | home page | A stats site shows numbers in rows; list rows count as words; the search control is a field, so its label is left-aligned; search is in the top bar on every page and is also the hero's main action. |
| taste: `stagger` | players table | Rank numbers are right-aligned, so "1" starts further right than "10": standard numeric alignment. |
| taste: `visual-caption` | game detail under the trend chart | It is the readout of the selected game (it changes on click and arrow keys), not a description of the chart. Explanations are in "How to Read This". |
| guidelines: Title Case for headings | section headings | Headings are questions in sentence case ("Is he heating up?"). Buttons, navigation and controls use Title Case. |
| guidelines: `Intl.NumberFormat` / `Intl.DateTimeFormat` | `lib/format.ts` | Moved unchanged so every number matches the pipeline's rounding exactly; the site is English only. |
| guidelines: animate transform and opacity only | hover states | Color and background transitions of 150 ms on hover; nothing else animates except one 250 ms opacity and transform load-in per chart. |
| guidelines: `<div>` with a click handler | `charts/TrendChart.tsx` | The chart is one focusable group with arrow-key support and a text summary; each game is also in the table view. |
| DESIGN.md: hover fill `#828fff`, 50% focus ring, lavender text | buttons, focus, links | Fail WCAG AA. See the `tokens.css` header and section 4. |
| dataviz validator: lightness band and chroma floor | percentile scale | Categorical checks; the scale is diverging with a gray middle. Its separation and contrast checks pass on the new surface. |

Position colors were re-picked for the new surface, as planned: guards `#1baf7a`, forwards `#c98500`, centers `#b565d9` (validator: all pairs pass, worst color-vision separation 10.6).

### Found while building

- Next.js 16 writes each route's prefetch file as a nested path but the browser requests a dotted file name, so a plain static host returns 404 on link hover. `web/scripts/postbuild.mjs` moves the files to the requested names after every build.
