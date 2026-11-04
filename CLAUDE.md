# Hoops Analytics (working name)

iOS app and website (Expo web) for exploring current-season NBA stats, plus a few stat games. No name chosen yet; keep the working name until the owner picks one.
Ported from a MATLAB App Designer app kept at `legacy/FINAL_NOKEY.m` for reference only. Do not edit it.

## Product
A stats sandbox for fans who argue about basketball in group chats. Search any player or team, get the answer to the question fans actually argue about, ranked fairly against qualified players and explained in plain English, then share it as an image card. Tagline: "Settle it with stats."
- Every screen answers a question fans argue about: "Who's the best shooter?", "Is he overrated?", "Is my team for real?", "Who's he like?"
- Search first: any player or team is one tap away.
- Fun before completeness: six features people love beat twenty they ignore.
- Rigor stays: qualified samples, empirical percentiles, honest sample sizes, a plain-English caption on every chart.
- Shareable: any chart or result exports as a clean image card with the app name and the "games through" date.
- Target tabs: Explore (search, last night's best, heat check, Build your MVP, scatter playground), Players (search, leaderboards, player card), Teams (offense vs. defense, luck meter, team pages), Play (Daily Guess, Higher or Lower, Box Score Mystery, trophies).

## Design quality bar
Design every screen as a senior design engineer would. Concretely:
- Lead with the answer. A screen's title is its question; the answer sits above the fold; controls come second.
- Tokens only (`app/src/theme/`): color, type scale, spacing on a 4-pt grid, radius. No ad-hoc sizes or colors in components.
- Hierarchy from size, weight and space, not from color. All numbers use tabular figures.
- One accent color for actions. Team colors are identity accents only (chips, avatar rings), never text color or a data encoding.
- Contrast meets WCAG AA in both modes (4.5:1 text, 3:1 large text and chart marks). Check it, don't eyeball it.
- Charts follow the dataviz skill: one question per chart, plain-English title, axis labels and caption, validated colorblind-safe palettes (run the validator), never red vs. green, no dual axes, recessive grid, selective direct labels.
- Touch targets at least 44 pt. One primary action per screen. Destructive actions confirm.
- Design every state: skeletons shaped like the final layout, empty, offline, small-sample and error states. Never a blank screen or a lone spinner.
- Motion is short (150-250 ms), purposeful, built with Reanimated, and respects Reduce Motion. Haptics only for game feedback.
- Dark mode is the default with a System / Dark / Light setting; light mode is designed, not inverted.
- Before calling UI done, screenshot it at phone width in both modes and review it against this list.

## Layout
- `pipeline/`: Python 3.12 package `hoops_pipeline`, managed with uv. Pulls ESPN season stats, computes derived stats, publishes JSON.
- `app/`: Expo (TypeScript, expo-router). iOS first, plus a static web build. Built and submitted with EAS, no Mac.
- `.github/workflows/nightly-data.yml`: tries the pipeline four times each morning (10:15-15:45 UTC) and publishes to the `gh-pages` branch under `/v1/` once ESPN has caught up. `nightly` exits 75 when ESPN is still behind (retry later) and 76 when those games are already published; only the last attempt fails loudly.
- Pipeline state (last ESPN response, rebound splits, puzzle history, nightly totals, last published date) lives on the `pipeline-state` branch as one force-pushed commit. The app never reads it.

## Data
- Source: ESPN's public, unofficial, undocumented JSON feeds. No API key. The owner chose this over paid BallDontLie tiers; do not reintroduce paid sources without asking. The owner accepts the risk that ESPN's terms grant no republishing rights.
  - Bulk feed (`site.web.api.espn.com/.../statistics/byathlete`): one request returns every player's season totals, age, position (G/F/C only), debut year and team. Traded players come as one combined line, current team first in `teams`.
  - Core feed (`sports.core.api.espn.com/.../athletes/{id}/statistics`): one request per player, used for the offensive/defensive rebound split. Failures fall back to last night's split. It also carries games started, season plus/minus and ESPN's own usage/PER; use those only as test cross-checks, never as published metrics (formulas undocumented).
  - Team totals (`.../statistics/byteam`, one request, own and opponent totals for all 30 teams) and standings (`site.api.espn.com/apis/v2/sports/basketball/nba/standings`, one request) currently feed the freshness gate.
  - Approved, not yet used: scoreboard (`site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD`, one per day) and game summaries (`.../summary?event={id}`, one per game: full box score with OREB/DREB and +/-, plus play-by-play with shot coordinates).
  - Not available: salaries, lineups/on-off, tracking data. Shot locations and clutch splits exist only via play-by-play (later).
  - Recent form currently comes from nightly season totals (`totals_history_v2.json` in pipeline state, keyed by games-through date): a single game since the previous snapshot becomes `g`; about a week back gives `r`. Box scores from game summaries replace this in milestone 9.
  - ESPN labels seasons by end year (2026-27 = 2027). Internally `season` is the start year.
  - ESPN team abbreviations (GS, NY, SA, NO, UTAH, WSH) are mapped to standard ones in `pipeline/hoops_pipeline/teams.py`.
- Freshness gate (`freshness.py`): a run publishes only when the team feed's games match the standings for all 30 teams and the players' points add up to the teams' points. Everything is labeled by `gamesThrough` (the last US Eastern date whose games are all included, normally yesterday), never by run date.
- The pipeline fails loudly if a stat column disappears, the season is wrong, too few players come back, or too many rebound splits are missing. A failed run never overwrites published data.
- Percentages come from season totals. Percentiles are empirical mid-rank over qualified players, computed in the pipeline. Never use a normal-distribution CDF.
- Qualified = GP >= max(3, 20% of the most team games) and MPG >= 10.
- Shooting percentages also need attempts before they rank (`ATTEMPT_MINIMUMS` in `config.py`, scaled to the season: max(floor, rate x most team games)). Players below it get no percentile for that stat and are left out of leaderboards, charts and head-to-head scoring. The app reads the rules from `minAttempts` and each player's `att` totals through `app/src/stats/samples.ts`.
- Composites (until milestone 2 replaces them): Offensive Score and Defensive Score are the two halves of Hollinger Game Score and sum to it.
- Published JSON is versioned (`/v1/`, `schemaVersion`). Any breaking field change bumps the version; keep the old version published until the app has switched.
- Live stats are a future phase. All app reads go through the `DataSource` interface in `app/src/data/` so a live source can overlay in-progress games later.

## Conventions
- Stat ids are shared between pipeline and app. The single source of truth for labels, units and direction is `app/src/stats/catalog.ts`. Mirror any new id in `pipeline/hoops_pipeline/metrics.py`.
- Every formula lives in one documented pipeline module with its source cited in a comment.
- Test reference values may be hand-typed from published sources (for example Basketball-Reference player pages), with the source and date in a comment. Never scrape basketball-reference or stats.nba.com.
- No NBA, ESPN or team logos, player photos or silhouettes. Never use ESPN's logo or headshot URLs. Teams are shown as abbreviation + color chip; players as initials avatars. Do not put "NBA" in the app name.
- Every screen supports dark and light mode via `app/src/theme/tokens.ts`. No hard-coded colors in components.
- Phone-first layouts. Test in Expo Go before anything else; the web build must also work.
- Name search is accent-insensitive on both sides (`searchName` from the pipeline, `fold()` in the app).
- TypeScript strict mode. No `any` in data types.
- Daily puzzles are frozen once published. Never change a past or current day's entry.
- Each milestone is 2-4 hours and testable on a phone. After each one: commit, then update the roadmap below.

## Roadmap
Foundations:
1. [x] Trustworthy numbers: fresh data (retry until ESPN's totals include last night), "games through" date, attempt minimums for percentage stats, sample sizes shown.
2. [ ] Team data + formulas module: team totals and standings, usage/AST%/TOV%/REB%, per-36 and per-100, team ratings and pace, drop the Off/Def split (schema v2), reference tests.
3. [ ] Honest samples + position percentiles: Wilson ranges, shrinkage for low-volume shooting, G/F/C percentile pools, medians, leaderboard toggles.
4. [ ] Design system, tabs (Explore / Players / Teams / Play) and search; cut Who Has More?
5. [ ] Glossary and first-launch onboarding.

v1 features:
6. [ ] Player card (Savant-style percentiles vs. position, insights).
7. [ ] "Who's he like?" comps (cosine similarity on standardized stats, with the stats that drive the match).
8. [ ] Website: static Expo web build on GitHub Pages, one deploy with the data, a link for every player, team and chart.
9. [ ] Box scores from game summaries + best performances of the night and week.
10. [ ] Heat check: last 10 vs. season, league risers and fallers, small-sample warnings.
11. [ ] Build your own MVP: weight sliders over standardized categories, shareable ladder.
12. [ ] Teams: offense vs. defense quadrant, luck meter (Pythagorean), team identity.
13. [ ] Scatter playground: medians, labeled quadrants, up to 3 highlighted players.
14. [ ] Share cards for every chart and result.

Later: verified fun facts in the pipeline, rookie and breakout tracker, fantasy 9-cat preset, rule-based archetypes, season trajectory, season streaks and highs, shot charts, clutch splits, 3-player compare, games pass (Rank 'Em, Daily Guess hint ladder, percentile-gap difficulty), distribution histograms.
Cut: age curve, lineups/on-off, salaries, Who Has More?

## Commands
- The repo lives at `C:\nba-app`. Keep it out of OneDrive: OneDrive breaks uv hardlinks and locks `.venv`. If uv reports "os error 396", run `uv cache clean <package>` for the named package.
- Pipeline tests: `cd pipeline && uv run --extra dev pytest`
- Pipeline local run (about 2 minutes): `cd pipeline && uv run python -m hoops_pipeline nightly --state ../.state --out ../out`
- Rebuild JSON from saved state without network: same with `build-only`.
- App: `cd app && npx expo start` (scan the QR code with Expo Go)
- App tests: `cd app && npx jest`
- App against local data: serve the pipeline's `--out` folder with CORS, then `EXPO_PUBLIC_DATA_URL=http://localhost:PORT/v1/ npx expo start --web`.
- iOS build: `cd app && eas build -p ios --profile production`, then `eas submit -p ios`
