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

- `src/app/`: screens. The player list is `index.tsx`; a player's page is `player/[id].tsx`.
- `src/data/`: the `DataSource` interface, the GitHub Pages source with on-device caching, and the React provider.
- `src/stats/catalog.ts`: stat labels, units and direction. A test checks it against the pipeline's `metrics.py`.
- `src/theme/`: light and dark color tokens and team colors.

See the repository's `CLAUDE.md` for conventions.
