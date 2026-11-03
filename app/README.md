# Hoops Analytics app

Expo (SDK 58, TypeScript, expo-router). iOS first. Reads the JSON the pipeline publishes to GitHub Pages.

## Run it

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go on your iPhone.

## Test against local data

```sh
EXPO_PUBLIC_DATA_URL=http://localhost:8130/v1/ npx expo start
```

Serve the pipeline's `--out` folder at that address with CORS allowed.

## Checks

```sh
npm test            # Jest
npm run typecheck   # TypeScript
npx expo lint       # ESLint
```

## Release (iOS)

Needs a paid Apple Developer account. No Mac required; EAS builds in the cloud.

```sh
npm install -g eas-cli
eas login            # same Expo account as `npx expo login`
eas init             # first time only: links the project, writes projectId to app.json
eas build -p ios --profile production
eas submit -p ios    # uploads the latest build to App Store Connect / TestFlight
```

The bundle identifier is `com.olicodes.hoopsanalytics` (in `app.json`). It is permanent once the app exists in App Store Connect. Build numbers are managed remotely by EAS (`autoIncrement`); bump `version` in `app.json` for each App Store release.

The icon is drawn from an SVG basketball (no league marks) and lives in `assets/images/`.

## Layout

- `src/app/`: screens, one folder per tab, each with its own stack:
  - `(today)/`: the home feed: daily puzzle status, latest games, form changes, followed players, leaders.
  - `players/`: player list.
  - `graphs/`: scatter, color-by and density charts.
  - `play/`: the games hub, Daily Guess, Higher or Lower and Who Has More?.
  Each tab has a `player/[id].tsx` that re-exports `src/screens/PlayerScreen.tsx`; `usePlayerLink()` opens the one in the current tab.
- `src/game/`: game rules as pure functions (tested), plus on-device saving.
- `src/today/`, `src/players/similar.ts`: Today feed and "Plays like" logic (tested).
- `src/notify/`: opt-in daily puzzle reminders (local notifications, no server).
- `src/follow/`: followed players, saved on the device.
- `src/graphs/`: chart math (tested) and the SVG chart.
- `src/data/`: the `DataSource` interface, the GitHub Pages source with on-device caching, and the React provider.
- `src/stats/catalog.ts`: stat labels, units and direction. A test checks it against the pipeline's `metrics.py`.
- `src/theme/`: light and dark color tokens and team colors.

See the repository's `CLAUDE.md` for conventions.
