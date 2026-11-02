# Hoops Analytics (working name)

iOS app for exploring current-season NBA player stats, plus two games.
Ported from a MATLAB App Designer app kept at `legacy/FINAL_NOKEY.m` for reference only. Do not edit it.

## Layout
- `pipeline/`: Python 3.12 package `hoops_pipeline`, managed with uv. Pulls ESPN season stats, computes derived stats, publishes JSON.
- `app/`: Expo (TypeScript, expo-router). iOS first. Built and submitted with EAS, no Mac.
- `.github/workflows/nightly-data.yml`: runs the pipeline nightly, publishes to the `gh-pages` branch under `/v1/`.
- Pipeline state (last ESPN response, rebound splits, puzzle history) lives on the `pipeline-state` branch as one force-pushed commit. The app never reads it.

## Data
- Source: ESPN's public, unofficial, undocumented JSON feeds. No API key. The owner chose this over paid BallDontLie tiers; do not reintroduce paid sources without asking.
  - Bulk feed (`site.web.api.espn.com/.../statistics/byathlete`): one request returns every player's season totals, age, position and team. Traded players come as one combined line, current team first in `teams`.
  - Core feed (`sports.core.api.espn.com/.../athletes/{id}/statistics`): one request per player, used only for the offensive/defensive rebound split. Failures fall back to last night's split.
  - ESPN labels seasons by end year (2026-27 = 2027). Internally `season` is the start year.
  - ESPN team abbreviations (GS, NY, SA, NO, UTAH, WSH) are mapped to standard ones in `pipeline/hoops_pipeline/teams.py`.
- The pipeline fails loudly if a stat column disappears, the season is wrong, too few players come back, or too many rebound splits are missing. A failed run never overwrites published data.
- Percentages come from season totals. Percentiles are empirical mid-rank over qualified players, computed in the pipeline. Never use a normal-distribution CDF.
- Qualified = GP >= max(3, 20% of the most team games) and MPG >= 10.
- Composites: Offensive Score and Defensive Score are the two halves of Hollinger Game Score and sum to it.
- Published JSON is versioned (`/v1/`, `schemaVersion`). Any breaking field change bumps the version.
- Live stats are a future phase. All app reads go through the `DataSource` interface in `app/src/data/` so a live source can overlay in-progress games later.

## Conventions
- Stat ids are shared between pipeline and app. The single source of truth for labels, units and direction is `app/src/stats/catalog.ts`. Mirror any new id in `pipeline/hoops_pipeline/metrics.py`.
- No NBA, ESPN or team logos, player photos or silhouettes. Never use ESPN's logo or headshot URLs. Teams are shown as abbreviation + color chip. Do not put "NBA" in the app name.
- Every screen supports light and dark mode via `app/src/theme/tokens.ts`. No hard-coded colors in components.
- Phone-first layouts. Test in Expo Go before anything else.
- Name search is accent-insensitive on both sides (`searchName` from the pipeline, `fold()` in the app).
- TypeScript strict mode. No `any` in data types.
- Daily puzzles are frozen once published. Never change a past or current day's entry.

## Commands
- The repo lives at `C:\nba-app`. Keep it out of OneDrive: OneDrive breaks uv hardlinks and locks `.venv`. If uv reports "os error 396", run `uv cache clean <package>` for the named package.
- Pipeline tests: `cd pipeline && uv run --extra dev pytest`
- Pipeline local run (about 2 minutes): `cd pipeline && uv run python -m hoops_pipeline nightly --state ../.state --out ../out`
- Rebuild JSON from saved state without network: same with `build-only`.
- App: `cd app && npx expo start` (scan the QR code with Expo Go)
- App tests: `cd app && npx jest`
- iOS build: `cd app && eas build -p ios --profile production`, then `eas submit -p ios`
