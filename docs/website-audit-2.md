# Website audit, round 2 (Phase 1, read-only)

Date: 2026-11-16. Subject: the finished `web/` site (commit `499ffd8`), not the old Expo app.
Screenshots: 17 pages x 1440 / 768 / 390, full page, in the session scratchpad (`audit/<page>-d|t|p.png`).

Skills and their roles in this audit:

| Skill | Role here |
|---|---|
| `DESIGN.md` | Binding visual system. Findings that trace back to it are marked; they need an owner decision, not a fix. |
| ui-ux-pro-max | Product and UX rules (its priority table, 120 UX guidelines, chart guidance). Its generated design system (blue and amber, Fira, an "Enterprise Gateway" landing pattern) does not fit this product and is not used. Also stands in for ui-ux-design-principles (hierarchy, consistency, feedback, states), which is not installed. |
| frontend-design | Taste lens, especially its list of AI-template traits. |
| design-taste-frontend | Its checker results from the build, plus the same taste lens. |
| web-design-guidelines | Code-level audit of `web/src` plus the browser checks below. |
| playwright-cli | Screenshots and measurements. |

## 1. Architecture

- Next.js 16 static export in `web/` (App Router, React 19, TypeScript strict, CSS Modules, hand-written SVG charts, no UI or chart library). 559 static pages: 467 players, 30 teams, 47 stats, the rest fixed routes.
- Routing: `app/(home)` for the home page, `app/(site)` for everything else; canonical URLs in `lib/routes.ts`; view state in the query string.
- Data: the Python pipeline publishes `/v2/*.json` to `gh-pages`. `scripts/fetch-data.mjs` copies it into `web/.data/` at build time; `server/data.ts` reads it; each page gets only the rows it shows. The browser fetches three small JSON files (search index, followed players, compare data).
- Charts: `web/src/charts/` (scatter, beeswarm, quadrant, luck strip, trend, dumbbell) on the pure math in `graphs/*.ts`, all inside `ChartFrame`.
- Deploy (built in Phase 4, not yet pushed): data and site published together to GitHub Pages.

## 2. What passes

- web-design-guidelines code sweep is clean: no `transition: all`, no click handlers on `div`/`span`, no images, zoom not disabled, no raw colors in components, the one removed outline has a replacement, `autoFocus` only in search dialogs.
- No sideways scroll on any page at any width; one `h1` per page; no console errors (only the 404's own status).
- `npm run check`: 559 pages, 52,972 links and files, 0 problems. Token contrast is tested.
- Charts have hover, arrow keys, table views and legends; reduced motion is respected; first-load JavaScript is 143 to 161 KB gzip.
- Controls measured under 24 px are inline text links or links whose hit area is extended by an overlay; the table stat links (17 px tall on desktop) sit in 40 px rows and meet WCAG 2.5.8's spacing exception.

## 3. Critique, most important first

### P0. It looks like a dark software dashboard, not a basketball product

- The palette, type and panels are frontend-design's AI-template traits 2, 4 and 5: near-black with one bright accent; content cut into identical rounded panels; meta lines joined with middle dots (70 of them in the code). The first two come from `DESIGN.md` (owner decision), but everything `DESIGN.md` leaves free has also gone to defaults.
- Nothing on any page says basketball: no court geometry, no team identity, no signature visual moment. The one element with character is the percentile ring card.
- Team identity is broken. Team colors appear only as 8 px squares, and 10 of 30 primaries are near-black navy or black (BKN `#000000`; MIN and NOP `#0C2340`; DEN `#0E2240`; CHA and PHX `#1D1160`; and others). On dark panels they disappear (Teams page, "Which teams have proven it?"). A team page has no color of its own.

### P0. Every module is the same box, so nothing leads

- Every panel follows one recipe: title, grey meta line, answer sentence, legend, chart, "How to Read This". It repeats three or four times per page, so the eye gets no hierarchy.
- On the player page, the first screen holds six equal tiles, a warning banner and a toggle. The page's question ("How good is he, really?") starts about 520 px down.
- Small grey text everywhere: `t-caption` is used 91 times; "games through Nov 13, 2026" appears three or four times on a page; axis and chart labels are 11 px in seven places (below ui-ux-pro-max's 12 px floor).

### P1. Rhythm and dead space

- The home page's rule of one section per screen leaves 250 to 400 px of empty black under the shorter sections at 1440 (league leaders, best games).
- Most pages end in 150 to 250 px of nothing before a sparse footer: brand at far left, two link columns at far right, legal text under a half-width rule.
- The home hero's figures (467 / 183 / 49) are dim and small, so they read as an afterthought.
- The games hub shows a new visitor six zeros ("0 0 – 0 0 0"): an empty state that reads as a failure.

### P1. Inconsistencies (ui-ux-pro-max standing in for ui-ux-design-principles)

- The "Table" toggle sits top right on every chart panel except Compare's "Do they play alike?", where it drops under the subtitle.
- One panel uses "N. Jokic", the next "Nikola Jokic", a caption "Jokic".
- One stat has four labels: "PTS" (tiles), "Points" (card), "Points per game" (tables), "Pts" (chips).
- Three different controls do the same "pick one" job: question chips (Explore), a segmented pool switch (player page), stat tabs (trend chart).
- The early-season note is styled as a warning (icon in a bordered box) and sits above the fold on every player page. It reads as an error.

### P1. Phone

- The player page is 7,100 px (8.5 screens) with no way to jump between sections; "Every stat" labels wrap to two lines. The glossary is 15,900 px.
- On Explore, the empty "Who's this?" panel holds its space until a dot is chosen.

### P2. Charts

- Team quadrant: 30 identical grey dots; the net-rating diagonal labels (+5, −10) float without obvious meaning. Luck strip: dots overlap at the center.
- Explore scatter: small, muted dots on black read as noise at 1440.
- Trend chart: two y-axis ticks (0, 20).
- ui-ux-pro-max's chart guidance for sports comparison suggests a radar chart, but warns against it when values need precise comparison. The dumbbell chart on Compare is the better choice and stays.

### P2. Code (a senior engineer's read)

- `Compare.tsx` (927 lines), `Explore.tsx` (819) and `DailyGame.tsx` (693) each hold several components; `games.module.css` is 1,030 lines. They should be split by part.

## 4. Data flags (unchanged, not touched)

- Names arrive without accents ("Nikola Jokic").
- `GAME_MARGIN_SD = 12` is still an assumption now that box scores exist.
- Rings round 99.7 up to "100" while sentences stop at 99 (CLAUDE.md keeps rings on the 0 to 100 scale).
