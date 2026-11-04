# Hoops Analytics (working name)

A phone-first iOS app (and website) for exploring current-season NBA player and team stats, with daily stat games.
It is a port of a MATLAB App Designer app kept in `legacy/`.

Not affiliated with the NBA or ESPN.

## How data flows

1. A GitHub Action tries every morning from 10:15 UTC and publishes once ESPN's stats have caught up with last night's games.
2. `pipeline/` reads ESPN's public feeds (no key needed): every player's season totals, every team's own and opponent totals, the standings, and one small request per player for the offensive/defensive rebound split.
3. It computes derived stats (formulas in `pipeline/hoops_pipeline/formulas.py`, with sources), percentiles and team ratings, and schedules the daily puzzle.
4. JSON is published to the `gh-pages` branch at `https://<user>.github.io/<repo>/v2/manifest.json` (plus a `/v1/` copy in the old format).
5. The app fetches the manifest, then the files it names, and caches them on the device.

The ESPN feed is unofficial and undocumented. If it changes shape, the pipeline fails loudly and the last good data stays published.

## One-time setup

1. Make the repository public, so GitHub Pages is free.
2. Run the **Nightly data** workflow once by hand from the Actions tab.
3. Under Settings, Pages, choose "Deploy from a branch", then `gh-pages` and `/ (root)`.

## Local pipeline

```sh
cd pipeline
uv run --extra dev pytest
uv run python -m hoops_pipeline nightly --state ../.state --out ../out
```

See `CLAUDE.md` for conventions.
