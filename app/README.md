# Hoops Analytics app

Expo (SDK 58, TypeScript, expo-router). iOS first. Reads the JSON the pipeline publishes to GitHub Pages.

## Run it

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

## Checks

```sh
npm test            # Jest
npm run typecheck   # TypeScript
npx expo lint       # ESLint
```

## Layout

- `src/app/`: screens, one folder per tab, each with its own stack:
  - `(players)/`: player list and player pages.
  - `graphs/`: scatter, color-by and density charts.
  - `daily/`: the daily "Guess the Player" game.
  - `compare/`: the "Who has more?" game.
  Each tab has a `player/[id].tsx` that re-exports `src/screens/PlayerScreen.tsx`.
- `src/game/`: game rules as pure functions (tested), plus on-device saving.
- `src/graphs/`: chart math (tested) and the SVG chart.
- `src/data/`: the `DataSource` interface, the GitHub Pages source with on-device caching, and the React provider.
- `src/stats/catalog.ts`: stat labels, units and direction. A test checks it against the pipeline's `metrics.py`.
- `src/theme/`: light and dark color tokens and team colors.

See the repository's `CLAUDE.md` for conventions.
