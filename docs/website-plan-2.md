# Website plan, round 2 (Phase 2): raise the craft

Status: proposed 2026-11-16, waiting for the owner's approval. No code until then.
Owner decisions so far: keep the current site's structure, URLs and data layer and raise its craft significantly (option a); `DESIGN.md` may be departed from where that serves the product.
Input: the Phase 1 audit, `docs/website-audit-2.md`.

Skills and their roles:
- ui-ux-pro-max: product structure and UX rules. It also stands in for ui-ux-design-principles (not installed) on hierarchy, consistency, feedback and states.
- frontend-design + design-taste-frontend: the visual direction and the check against generic defaults.
- dataviz: the chart colors, validated with its script.
- web-design-guidelines: the audit gate for every page.
- playwright-cli: proof in a real browser.

No stat, calculation or pipeline change: every number stays identical, and the 184 tests guard that.

## 1. Direction: broadcast, not dashboard

**Subject and job.** Fans settling arguments in a group chat. The site answers a question ("How good is he, really?") and hands over the proof as something worth sharing. The world it borrows from is the TV stats package, the trading card and the court itself, not a software admin panel.

**The one bold thing: the player card.** Every player and team page opens on a field in the team's color, with the name set big in condensed type, half-court lines drawn faintly into the field, and the percentile rings on it. The same card is the home hero, the two sides of the Compare scoreboard (two teams' fields facing each other) and the share image. Everything else stays quiet and disciplined.

**Color is information.** The interface itself is monochrome: chalk-white ink on cool graphite. Chromatic color appears only as data (the percentile scale, positions) or as a team's identity. The lavender accent is retired; the primary action is an inverted chalk-white button with graphite text.

**Type: one family, with width as the voice.** Archivo, a variable font with a width axis from 62 to 125, self-hosted. Condensed and heavy for names and big numbers (scoreboard and jersey vernacular), normal width for reading, semi-condensed for dense tables so more columns fit. Tabular figures for every stat (checked: Archivo has `tnum`). It replaces Inter.

### Checked against the generic defaults (frontend-design)

| First idea | Why it was generic | Revised to |
|---|---|---|
| Basketball orange as the brand accent | The sports-template default, and it collides with the hot end of the percentile scale, so the brand color would read as "good". | No brand hue at all: monochrome chrome, with color reserved for data and teams. |
| Barlow Condensed with Barlow (ui-ux-pro-max's sports pairing), or Bebas | The face every sports template uses. | Archivo's width axis: one family, condensed only where it carries meaning (names, scores). |
| A court texture behind the sections | Decoration everywhere is the template look. | Court lines appear only inside the card field, faint, as the card's frame. |
| Keep the uppercase labels above headings and the "A · B · C" meta lines | frontend-design's template-chrome tells. | No uppercase labels; meta becomes structured (label-value pairs) or a plain sentence; "games through" appears once per page, in the page header. |

## 2. Tokens (one file: `web/src/styles/tokens.css`)

A new binding visual spec, `docs/design-system.md`, replaces `DESIGN.md` for the website. `DESIGN.md` stays in the repo as history. The contrast test is extended to every pairing below.

### Color

| Token | Value | Role |
|---|---|---|
| `--arena` | `#0C0F13` | Page background: arena dark with a cool cast (not a neutral near-black). |
| `--floor-1` / `-2` / `-3` | `#12161B` / `#181D23` / `#1F252D` | Surface ladder: panels, raised rows, controls. |
| `--line` / `--line-strong` | `#262D36` / `#343D48` | Hairlines and control borders. |
| `--chalk` | `#F3F5F7` | Primary ink; the inverted primary button. |
| `--chalk-muted` | `#BAC2CD` | Secondary text (at least 7:1 on every floor, so body text can use it). |
| `--chalk-subtle` | `#8C95A2` | Captions and labels only (at least 4.5:1). |
| `--focus` | `#F3F5F7` | 2 px ring with a 2 px arena gap: visible on any team color. |
| `--win` / `--loss` | kept | Game feedback only, always with an icon and a word. |
| `--viz-*` | percentile scale and position colors kept | Re-validated with the dataviz script against `--floor-1`; adjusted only where a check fails. |

**Team colors** (new: `theme/teams.ts` gains each team's second official color, hand-typed with its source cited, as the code rules require). Each team gets a display color: whichever of its two colors reaches 3:1 against `--floor-1`, tested for all 30 teams. Teams show it as the card field (a 16% tint over `--floor-1` with a 3 px full-color top band), chip swatches (10 px), rings on highlighted chart marks and the scoreboard sides. Never as text, never as a data encoding.

### Type (Archivo, modular scale 1.25 from 16)

| Role | Size / line height | Width / weight |
|---|---|---|
| Display (card names, the home hero) | 76 / 0.95 (phone 44) | 75 / 780, tracking −1.5% |
| Headline (h1 on tool pages) | 49 / 1.05 (phone 34) | 85 / 720 |
| Title (h2, the section question) | 31 / 1.15 (phone 25) | 90 / 680 |
| Subtitle (h3, panel titles) | 20 / 1.3 | 100 / 620 |
| Body | 16 / 1.55 | 100 / 400 |
| UI and table text | 14 / 1.4 | 87 / 450, tabular |
| Caption | 13 / 1.4 | 100 / 450 |
| Chart labels | 12 / 1.2 (never smaller) | 87 / 500, tabular |
| Score figures (tiles, scoreboards) | 31 to 76 | 68 / 800, tabular |

Headings use `text-wrap: balance`, body `pretty`; no orphaned words in headlines (checked in the screenshots).

### Space, radius, elevation, motion

- **Space:** a 4 px base (4, 8, 12, 16, 24, 32, 48, 64, 96, 128). Sections take their natural height with 96 px between them (64 on phones); the one-screen-per-section rule is dropped.
- **Radius by role, not one value everywhere:** 3 (chips, tags), 6 (controls), 10 (panels), 16 (the card field).
- **Elevation:** surfaces climb the floor ladder with no shadows, except one shadow for floating layers only (search dialog, popovers, toasts).
- **Motion:**
  - durations: 120 (press), 180 (hover and state changes), 240 (panels opening), 600 (the signature);
  - enter easing `cubic-bezier(.2,.8,.2,1)`; exits 30% faster;
  - the one orchestrated moment is the card's rings sweeping in on first view (staggered 40 ms), nothing else moves on its own;
  - reduced motion turns every duration to 0.

## 3. Product structure (ui-ux-pro-max)

URLs and the canonical scheme stay as they are; every player, team, stat and matchup keeps its shareable URL.

- **Navigation:** the top bar (Players, Teams, Compare, Explore, Games, search with Ctrl K) on every width, with a menu on phones. A bottom tab bar was considered and rejected: this is a website people arrive at from shared links, not an installed app.
- **Search:** the palette stays (autocomplete, keyboard). Results gain each team's display color and a "players / teams" grouping; recent searches appear when it opens empty.
- **Player page:**
  - The card comes first: name, team field, position and age as label-value pairs, the answer in one sentence ("Elite at assists, Game Score and points; steals not settled yet"), the rings, then Follow and Compare.
  - A sticky in-page nav (Overview, Heating up?, Plays like, Every stat) on all widths.
  - On phones, "Every stat" shows one group at a time with chips to switch, cutting about 8.5 screens to 4.
  - The early-season note becomes one quiet line under the card, not a warning box.
- **Team page:** the team's card field with the verdict ("Too early to tell") first, then ratings, luck, four factors, leaders and roster.
- **Home:**
  - The hero is the live card of the Game Score leader beside the search.
  - Last night, the heat check, then the league leaders as one tabbed leaderboard instead of eight identical cards.
  - The season's best games, then the games teaser.
- **Compare:** a broadcast scoreboard (two team fields facing, the stats won in big score figures), then the dumbbell chart, the style match and the suggestions.
- **Games:** scoreboard figures for records. A new visitor sees "Your record starts with today's puzzle" in place of six zeros.
- **Footer:** compact; brand and freshness on one side, links on the other, legal in one line. No dead band above it.

## 4. Component library (every state)

Each component is specified for default, hover, focus-visible, active/pressed, loading (a skeleton shaped like the final layout), empty, error and disabled where the state can occur. Feedback is under 100 ms, and every state change is announced when it is not visible from focus.

| Component | Notes beyond the shared states |
|---|---|
| Button: primary (inverted chalk), secondary (outline), quiet (text), icon | 44 px on touch; press scales to 0.98 in 120 ms; loading keeps its width and shows a spinner plus the word. |
| Card field (player and team header) | Team field, condensed name, label-value meta, answer sentence, rings; skeleton for the client-only parts (Follow). |
| Stat tile | Label, score figure, rank; links to the stat page; empty shows a dash with the reason in its title. |
| Chart frame (v2) | Answer-first: question title, the answer as the lead sentence, then the chart; who is included and "How to Read This" move into one footer line. Table toggle always top right. Loading: the chart's axes as a skeleton. Empty: a sentence plus the way out (switch pool, lower filter). |
| Sortable table | Sticky header, one sorted column highlighted, `aria-sort`, keyboard; rows at least 40 px; a thin sample shown dimmed with the reason on hover and focus. |
| Search with autocomplete | Palette dialog and the inline field (Compare, Explore highlight); grouped results, team colors, recent searches, no-result state with a suggestion. |
| Choice controls | One pattern per job: segmented (2 to 4 views of the same thing, such as the position pool), chips (5 or more, wrapping; question presets, stat picker). Tabs only for in-page section nav. |
| In-page section nav | Sticky under the top bar, current section marked, scrolls horizontally on phones with the active item kept in view. |
| Notice | Quiet inline line for context (early season); toast for confirmations (copied, trophy earned); errors with an icon, the cause and the fix. |
| Game UI | Answer buttons, reveal (icon plus word plus color), progress marks, result with share; the existing keyboard support kept. |
| Skeleton | Same shape as the content, a shimmer that stops under reduced motion. |
| Toast | One system for trophy notices and "Link copied": bottom right (bottom on phones), 6 s, pauses on hover and focus, dismissible, live region. |

## 5. The signature chart style

- **Frame:** the question as the title; the answer as the lead sentence; then the chart; the method in "How to Read This".
- **Axes:** hairline `--line`; ticks at nice numbers (4 to 6 per axis; the trend chart gets more than two); axis titles in words; "up" and "right" mean better, as now.
- **Gridlines:** value axis only, `--floor-3`, never over marks.
- **Marks:**
  - dots at least 8 px (scatter dots grow from 6 to 8, with a 1 px arena ring so overlaps separate);
  - lines 2 px; bands as a region color;
  - the highlighted player in chalk with a ring in his team's display color.
- **Team handling:** on the team quadrant each dot carries its team's display color as a ring around a chalk-subtle fill, labeled with its abbreviation. The color is identity, repeated by the label, never the encoding.
- **Tooltips:**
  - a `--floor-3` card with the team band at its top edge;
  - the name, both values with units, the percentile and rank;
  - keyboard focus shows the same card;
  - positioned to stay inside the chart at every width.
- **Number formatting:**
  - tabular figures and a real minus sign;
  - one decimal for rates and per-game stats, percent attached;
  - ordinal ranks ("4th of 350");
  - signed net ratings (+13.4).
- **Legibility:** labels never under 12 px; charts size by their container with a minimum height; direct labels never cover a dot (the current placement code).
- **Load animation:** marks fade and settle once over 240 ms, only when on screen at load; nothing under reduced motion.

## 6. Build order, by impact

Each step: [playwright-cli] screenshots at 1440, 768 and 390 with every interaction exercised and the console checked; the [web-design-guidelines] audit of the changed files with fixes; the [design-taste-frontend] checker plus a self-critique pass; then screenshots and a short summary for your OK before the next step. A commit after each.

| Step | What | Why this order |
|---|---|---|
| 0 | Foundation: tokens, Archivo, team display colors (with the test), base components, chart frame v2 and the chart style. This restyles the whole site at once, so every page moves with it. | Everything else builds on it. |
| 1 | Player page: card field, sticky section nav, phone "Every stat", share image. | The page people share most; it carries the signature. |
| 2 | Home: card hero, natural-height sections, tabbed leaderboard. | The first impression. |
| 3 | Teams index and team pages: team fields, team-colored chart rings. | The weakest identity today. |
| 4 | Compare: the broadcast scoreboard. | The most argued-over page. |
| 5 | Players table and stat pages. | Dense data, the type and table system. |
| 6 | Explore. | Chart legibility. |
| 7 | Games: hub, Daily Guess, Higher or Lower, Box Score Mystery, Trophies. | Score figures and empty states. |
| 8 | Glossary, About, 404, footer. | Reference pages. |
| 9 | Delivery polish:<br>- a full end-to-end pass and a full-site audit;<br>- split the three largest components;<br>- a clean build with no warnings;<br>- a loading state for every client fetch, re-checked;<br>- share images re-themed;<br>- hosting (GitHub Pages, as set up). | Last. |

## 7. Notes and risks

- Archivo replaces Inter: one variable file (latin subset), measured in step 0; Inter's files are removed.
- The new palette needs the dataviz validator again for the percentile scale and position colors against the new surface; any color that fails is re-stepped and reported.
- The share images pick up the new look in step 1 (players), 3 (teams) and 9 (the rest).
- CLAUDE.md's website section is updated to point at `docs/design-system.md`.

## 8. Build log (round 2)

| Step | State | Notes |
|---|---|---|
| 0. Foundation | done 2026-11-16, approved | Tokens, Archivo, team display colors (tested for all 30), chart frame v2 (answer first, table toggle top right, who is included in the footer), chart style (team rings, tooltip team band, larger dots, 12 px labels, more trend ticks), chalk buttons with a press state, controls squared to the control radius. `docs/design-system.md` replaces `DESIGN.md` for the website. |
| 1. Player page | done 2026-11-16, awaiting review | The card (`components/player/PlayerCard.tsx`): a field in the team's display color (10% tint behind text, 20% on the court side, tested for every team), the court drawn to scale in it (`components/CourtLines.tsx`), the name in the display face, the facts as label-value pairs, the verdict in one sentence from the gated insights, five rings that sweep in once (the one orchestrated moment), the pool switch beside them, the season numbers along the bottom. A quiet line under it for early season and the games-through date. A sticky section menu (`components/SectionNav.tsx`: Ranks, Form, Plays Like, Every Stat; current section marked). "Where does he rank in each stat?" answers with his highest and lowest percentile. On phones, "Every stat" shows one group at a time (`?group=`), cutting the page from 7,136 to 4,256 px. Share image redrawn as the card (Archivo instances cut from the variable font, `og/fonts`). |

### Measured on the player page (round 2)

- JavaScript 153 KB gzip (was 152), HTML 26.5 KB gzip. No sideways scroll at 1440, 768 and 390; no duplicate ids; no console errors.
- Checked in the click-through: the pool switch changes the verdict and the rings (true shooting: better than 26% of centers, 50% of all players), the section menu jumps under both sticky bars and marks the section, ring links open the stat page with the player and position, the phone group chips, an unqualified player (no rings, no Ranks or Plays Like in the menu), a traded player (earlier team chip), a long name at 1440 and 390, reduced motion (no sweep).

### Waivers (round 2)

| Rule | Where | Reason |
|---|---|---|
| guidelines: animate transform and opacity only | the card's ring sweep | `stroke-dashoffset` on five small SVG arcs, once on load, paint only (no layout); off under reduced motion. It is the page's one orchestrated moment. |
| taste: `container-edges`, `flush`, `hero-*`, `one-section`, `section-*`, `cta`, `no-visual`, `text-only`, `row-lines`, `top-stagger`, `visual-caption`, `copy-headline`, `copy-headings` | tool pages | As in round 1 (`docs/website-redesign.md`, section 7): data pages, not marketing pages. |
