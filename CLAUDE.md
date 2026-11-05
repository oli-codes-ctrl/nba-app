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
- The system as built: tokens in `app/src/theme/tokens.ts` (colors, `percentileScale`, type sizes, spacing, radius, `motion`); text through `AppText` variants (`display`, `large`, `title`, `body`, `bodyStrong`, `small`, `caption`, `kicker`, `number`); shared pieces in `app/src/components/` (`Card`, `Segmented`, `Section`, `Avatar`, `Skeleton`/`FirstLoad`, `PercentileBar`, `TeamChip`, `Button`). `__tests__/contrast.test.ts` checks every text color on every surface, white on `accentFill`, every percentile step against track and card, and all 30 team chips.
- Percentile bars use the cold-to-hot scale (blue, gray, orange; validated with the dataviz validator). Neutral stats show a dot on the line instead. The player card (`players/PercentileCard`) draws rings (surface fill, colored ring, text-colored number, so contrast holds in both modes) with the rank band (`rankBand` of `ci`) as a bar under each ring, always visible (a settled rank shows as a short dash), and a key above the rows; usage gets a gray ring.
- Insights only claim what ranges support (`players/card.ts`): "Elite" needs the whole rank band at or above the 80th percentile, "Weak spot" at or below the 20th, "Not settled" flags top/bottom 10% with a wider band. Stats without a range (Game Score) and neutral stats are never judged.
- "Who's he like?" (`players/similar.ts`): cosine similarity of z-scores over ten style stats (usage, TS%, shot diet, AST%, TOV%, OREB%/DREB%, STL%, BLK%) among qualified players with enough attempts; reasons are the stats where both are at least 0.5 SD on the same side. `success`/`danger` are for game feedback only. Fills behind white text use `accentFill`, never `accent`.
- Charts (`app/src/graphs/`): every chart answers one question (its title), says who is included (n, filter, date), and explains itself in a caption. Relationships are described with Spearman's rank correlation and only called a link when |rho| clears 1.96/sqrt(n-1); quadrants come from medians of the plotted players; dots with under half the median minutes are hollow; position colors are `chartColors.positions` (green / violet / magenta, validated all-pairs), never the blue/orange of the percentile scale. Axis titles are words, with "up" meaning better (lower-is-better Y axes are flipped). One-stat views (distribution) put better on the right, reversing lower-is-better axes, and pack dots in a beeswarm; ranks of a likely range come from `rankBand` (mid-rank percentiles of its two ends), called unsettled when 25+ points wide. Any chart colored by position shows `PositionLegend`.
- Box score charts (`games/logs.ts`): the trend line is the average of up to the last 10 games with a band of 1.96 s / sqrt(n), s the player's game-to-game spread over the season. The heat check compares each qualified player's last 3 games (5 once the median player has 10) with his earlier games, z = difference / (s sqrt(1/n1 + 1/n2)), and flags only |z| >= 2.5 because hundreds of players are checked at once. The games file loads on demand (`useGameLogs`), cached by its hashed name.
- Chart taps go through `pressPoint` (graphs/math.ts): React Native Web has no `locationX`, so it falls back to the DOM's `offsetX`.
- Sentences say "better than X%" with `betterPct` (capped at 99: no one beats himself); rings keep the 0-100 scale.
- Appearance: `ThemePreferenceProvider` (System / Dark / Light, default Dark, saved on device) applies the choice through `Appearance.setColorScheme` so native parts follow; Settings lives at `(today)/settings`.

## Layout
- `pipeline/`: Python 3.12 package `hoops_pipeline`, managed with uv. Pulls ESPN season stats, computes derived stats, publishes JSON.
- `app/`: Expo (TypeScript, expo-router). iOS first, plus a static web build. Built and submitted with EAS, no Mac.
- `.github/workflows/nightly-data.yml`: tries the pipeline four times each morning (10:15-15:45 UTC) and publishes to the `gh-pages` branch under `/v2/` (plus the `/v1/` compatibility copy) once ESPN has caught up. `nightly` exits 75 when ESPN is still behind (retry later) and 76 when those games are already published; only the last attempt fails loudly.
- Pipeline state (last ESPN response, rebound splits, team totals and standings, puzzle history, nightly totals, box scores, last published date) lives on the `pipeline-state` branch as one force-pushed commit. The app never reads it.

## Data
- Source: ESPN's public, unofficial, undocumented JSON feeds. No API key. The owner chose this over paid BallDontLie tiers; do not reintroduce paid sources without asking. The owner accepts the risk that ESPN's terms grant no republishing rights.
  - Bulk feed (`site.web.api.espn.com/.../statistics/byathlete`): one request returns every player's season totals, age, position (G/F/C only), debut year and team. Traded players come as one combined line, current team first in `teams`.
  - Core feed (`sports.core.api.espn.com/.../athletes/{id}/statistics`): one request per player, used for the offensive/defensive rebound split. Failures fall back to last night's split. It also carries games started, season plus/minus and ESPN's own usage/PER; use those only as test cross-checks, never as published metrics (formulas undocumented).
  - Team totals (`.../statistics/byteam`, one request, own and opponent totals for all 30 teams) and standings (`site.api.espn.com/apis/v2/sports/basketball/nba/standings`, one request) feed the freshness gate, team pages and every team-based player stat. Team totals are sums of player-credited stats (no team turnovers or team rebounds). ESPN publishes no team minutes: they are 240 per game times the league's overtime share.
  - Box scores (`games.py`): scoreboard (`site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=YYYYMMDD`, US Eastern date; its league calendar whitelists game dates) and game summaries (`.../summary?event={id}`: full box score with OREB/DREB and +/-, plus play-by-play with shot coordinates, not used yet). Finished regular-season games only, fetched incrementally into `games_v1.json` in pipeline state (a season backfill is about 130 requests). Published as `games.<hash>.json` in `/v2/` only (manifest `files.games`): `keys`, `games` ([id, date, home, away, home pts, away pts]) and per player rows [game index, side 0 home / 1 away, starter, ...keys], with each game's Game Score; `boxScoresThrough` lags `gamesThrough` only if a summary failed (retried next run). A box score failure never blocks the season stats. Game-log sums are checked against ESPN's season totals (warning only; ESPN occasionally drops a zero-minute appearance from its games played).
  - Not available: salaries, lineups/on-off, tracking data. Shot locations and clutch splits exist only via play-by-play (later).
  - Recent form from nightly season totals (`totals_history_v2.json` in pipeline state, keyed by games-through date: a single game since the previous snapshot becomes `g`; about a week back gives `r`) is now the fallback. When the games file is published, the player page ("Is he heating up?") and Today (the day's best, heat check, best games this season) use box scores; Following still uses `g`/`r`.
  - ESPN labels seasons by end year (2026-27 = 2027). Internally `season` is the start year.
  - ESPN team abbreviations (GS, NY, SA, NO, UTAH, WSH) are mapped to standard ones in `pipeline/hoops_pipeline/teams.py`.
- Freshness gate (`freshness.py`): a run publishes only when the team feed's games match the standings for all 30 teams and the players' points add up to the teams' points. Everything is labeled by `gamesThrough` (the last US Eastern date whose games are all included, normally yesterday), never by run date.
- The pipeline fails loudly if a stat column disappears, the season is wrong, too few players come back, or too many rebound splits are missing. A failed run never overwrites published data.
- Percentages come from season totals. Percentiles are empirical mid-rank over qualified players, computed in the pipeline. Never use a normal-distribution CDF.
- Qualified = GP >= max(3, 20% of the most team games) and MPG >= 10.
- Shooting percentages also need attempts before they rank (`ATTEMPT_MINIMUMS` in `config.py`, scaled to the season: max(floor, rate x most team games)). Players below it get no percentile for that stat and are left out of leaderboards, charts and head-to-head scoring. The app reads the rules from `minAttempts` and each player's `att` totals through `app/src/stats/samples.ts`.
- Formulas: every one lives in `pipeline/hoops_pipeline/formulas.py` with its source (Basketball-Reference glossary, Oliver, Hollinger, Morey). Team context and team pages are in `teamstats.py`. Traded players come as one combined line, so their team-based stats (usage, the other shares, per-100) use the average of their teams scaled to one game; box scores in milestone 9 will make this exact.
- Team noise (`formulas.py`, published per team): `net_noise` is the 95% half-width of a net rating from game-to-game luck, 1.96 x 12 / sqrt(GP) rescaled to per 100 possessions (`GAME_MARGIN_SD` = 12 points, Winston; replace with the measured spread once box scores arrive in V6). `luck_noise` is the 95% half-width of wins above the Pythagorean expectation if close games were coin flips: per game 1/4 + (ks)^2 - 2ks/sqrt(2 pi) with k = 14 / (4 x points per game), about 0.30 wins per game for any s from 11 to 13 (checked against a simulated league in the tests). The app calls a team better or worse than average, or lucky, only when it clears these.
- Game Score (Hollinger) is the one composite. The old homemade Offensive/Defensive Score split is retired and survives only in `/v1/`.
- Neutral stats (roles and volumes: usage, shot attempts, shot diet) are ranked but never colored as good or bad; `neutral` in the catalog.
- Honest samples (`samples.py`): makes-over-attempts stats get a 95% range (`ci`, whole percent). 3P% and FT% also get a sample-adjusted "skill estimate" (`adj`) from a beta-binomial prior fitted by maximum likelihood to qualified players; then the range is the matching posterior interval so the estimate always sits inside it, otherwise it is the Wilson interval. No estimate is published while the season's data cannot separate shooters (the fit hits its strength ceiling; 3P% early on). The app words ranges as long-run skill, never as the observed percentage. FG% and 2P% are never shrunk: shot location dominates them.
- Qualified players also get `ci` ranges (in the stat's units, 0.1) for counts per game / 36 / 100 (Poisson, Byar's approximation), points (compound Poisson), TS% and eFG% (binomial makes given attempts) and the team shares (Wilson on count over opportunities). Minutes, games and team context are held fixed. `/v1/` keeps shooting ranges only. The player page writes out ranges only for shot-based stats; the card and distribution view draw the rest.
- Percentiles and ranks are also published within position (`pctPos`, `rankPos`; ESPN gives only G/F/C), with `poolSizePos` and `medians` (all and by position). The player page defaults to his position.
- Published JSON is versioned (`/v2/`, `schemaVersion` 2: players, puzzles and teams files). Any breaking field change bumps the version; keep the old version published until the app has switched. `/v1/` is still written as a compatibility copy in the old format; drop it once no client reads it (before the first App Store build at the latest).
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
2. [x] Team data + formulas module: team totals and standings, usage/AST%/TOV%/REB%, per-36 and per-100, team ratings and pace, drop the Off/Def split (schema v2), reference tests.
3. [x] Honest samples + position percentiles: Wilson ranges, shrinkage for low-volume shooting, G/F/C percentile pools, medians, leaderboard toggles.
4a. [x] Design system: tokens, type scale, dark default with a System / Dark / Light setting, cold-to-hot percentile colors, avatars, skeletons, contrast test.

Visual track (approved 2026-11-04: charts come before the tab restructure):
V1. [x] Scatter playground: question presets with named quadrants at the medians, dots by position, hollow thin samples, labeled examples, up to 3 highlights, Spearman relationship in words (only when it beats chance), custom mode with optional least-squares line and a shared-inputs warning.
V2. [x] Distribution: one dot per player for any stat with median and quartiles and the player's range; tap any stat row on a player page to open it (`/stat?stat=&player=&pos=` in every tab).
V3. [x] Player card (Savant style) with rank-uncertainty bands and gated insights, plus "Who's he like?" comps (cosine similarity on standardized rates, with the stats that drive each match). Pipeline ranges for counts, points, efficiency and shares.
V4. [x] Team charts: offense vs. defense quadrant with net-rating lines and a noise note, luck meter with a noise band, four factors vs. league. On the Teams list ("Who's actually good?", "Who's been lucky?") and every team page ("Is X for real?", "Lucky or good?", "Where do they win and lose?"). Team quadrants split at the league average rating (the same for offense and defense), not medians; axes share one scale so net-rating diagonals run at 45 degrees.
V5. [x] Head-to-head as aligned percentile dots: player 1 a filled dot, player 2 a ring, both in text color (shape carries identity; no new hues). Each stat is a "clear edge" only when the two long-run estimates (range centers) differ by 1.96 combined standard errors in the raw winner's favor, else "too close to call"; the tally reports both raw wins and clear edges.
V6. [x] Box scores from game summaries, then trends (rolling 10-game lines with uncertainty bands), best performances, and a heat check that only flags changes bigger than noise.
  - V6a. [x] Box scores in the pipeline and the published `games` file.
  - V6b. [x] App: game logs on demand; "Is he heating up?" trend on the player page; Today's day's best, heat check and best games this season from box scores.

Then:
4b. [ ] Tabs (Explore / Players / Teams / Play) and one search for players and teams; cut Who Has More? Charts move into Explore and Teams.
5. [ ] Glossary and first-launch onboarding.
8. [ ] Website: static Expo web build on GitHub Pages, one deploy with the data, a link for every player, team and chart. Known: the web tab bar (expo-router NativeTabs, Radix) logs a hydration id mismatch on every page in dev, and its light-mode styling needs a pass.
11. [ ] Build your own MVP: weight sliders over standardized categories, shareable ladder.
14. [ ] Share cards for every chart and result.

Later: verified fun facts in the pipeline, rookie and breakout tracker, fantasy 9-cat preset, rule-based archetypes, season trajectory, season streaks and highs, shot charts, clutch splits, 3-player compare, games pass (Rank 'Em, Daily Guess hint ladder, percentile-gap difficulty).
Cut: age curve, lineups/on-off, salaries, Who Has More?, the trend-line coloring and density grid on Graphs (replaced by quadrants and the distribution view).

## Commands
- The repo lives at `C:\nba-app`. Keep it out of OneDrive: OneDrive breaks uv hardlinks and locks `.venv`. If uv reports "os error 396", run `uv cache clean <package>` for the named package.
- Pipeline tests: `cd pipeline && uv run --extra dev pytest`
- Pipeline local run (about 2 minutes): `cd pipeline && uv run python -m hoops_pipeline nightly --state ../.state --out ../out`
- Rebuild JSON from saved state without network: same with `build-only`.
- App: `cd app && npx expo start` (scan the QR code with Expo Go)
- App tests: `cd app && npx jest`
- App against local data: serve the pipeline's `--out` folder with CORS, then `EXPO_PUBLIC_DATA_URL=http://localhost:PORT/v2/ npx expo start --web`.
- iOS build: `cd app && eas build -p ios --profile production`, then `eas submit -p ios`
