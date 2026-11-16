# Design system (website, round 2)

The binding visual system for `web/`. It replaces `DESIGN.md` for the website (owner decision, 2026-11-16); `DESIGN.md` stays in the repo as history. Values live in one file, `web/src/styles/tokens.css`; components use the variables only; `web/__tests__/tokens.test.ts` checks every pairing below.

Direction: **broadcast, not dashboard.** The site borrows from the TV stats package, the trading card and the court.

## Principles

1. **Color is information.** The interface is monochrome: chalk on graphite. Hue appears only as data (the percentile scale, positions) or as a team's identity. The site has no brand hue.
2. **Answer first.** Every page and panel opens with its question and the answer in words, then the proof (chart, table), then the method behind "How to Read This".
3. **One bold thing:** the card field, a team-colored panel with the name set big in condensed type, half-court lines drawn faintly, and the percentile rings. It is the player and team page headers, the home hero, the Compare scoreboard sides and the share images. Everything else is quiet.
4. **Width is the voice.** One family, Archivo; condensed for names and score figures, normal for reading, semi-condensed for tables.
5. **One orchestrated moment.** The card's rings sweep in on first view. Nothing else moves on its own; motion otherwise answers the reader (press, hover, open).

## Color

Variable names are semantic and kept from round 1; the values changed.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#0c0f13` | Page background (arena dark with a cool cast). |
| `--surface-1` to `-4` | `#12161b`, `#181d23`, `#1f252d`, `#252c35` | Panels, raised rows, controls, tooltips. |
| `--hairline`, `-strong`, `-tertiary` | `#262d36`, `#343d48`, `#465260` | Dividers, control borders, link underlines. |
| `--ink` | `#f3f5f7` | Primary text. |
| `--ink-muted` | `#bac2cd` | Body copy and secondary text (at least 7:1 on every surface). |
| `--ink-subtle` | `#929ba8` | Captions and labels only (at least 4.5:1). |
| `--ink-disabled` | `#646d79` | Disabled controls only (3:1). |
| `--accent`, `-hover`, `-pressed` | `#f3f5f7`, `#e3e8ed`, `#d6dce3` | The primary action's fill (chalk), with `--on-accent` `#0c0f13` text. |
| `--accent-text` | `#f3f5f7` | Links (with a permanent underline in `--hairline-tertiary`, chalk on hover) and the focus ring (2 px, 2 px offset). |
| `--success`, `--danger` | `#2fb352`, `#f06a6a` | Game feedback only, always with an icon and a word. |
| `--viz-*` | percentile scale, positions, axis, band | Data only; validated with the dataviz script against `--surface-1`. |

**Team colors** (`web/src/theme/teams.ts`): each team's published colors, primary first (teamcolorcodes.com, checked 2026-11-16). The display color is the first chromatic color reaching 3:1 on `--surface-1`, else the first neutral that does; tested for all 30. It appears as:
- the card field;
- chip swatches (10 px);
- a 2.5 px ring on the team's chart mark;
- a 3 px band on a tooltip's top edge.

It is never text and never a data encoding. Chip swatches sit on `--surface-2`, where the red teams fall just under 3:1; there the abbreviation beside the swatch carries the identity.

## Type

Archivo, variable (`wdth` 62 to 125, `wght` 100 to 900), self-hosted by `next/font`. Tabular figures (`.num`, `.t-score`) for every stat.

| Class | Size / line height (phone) | Width / weight |
|---|---|---|
| `.t-display-lg` | 76 / 0.95 (44) | 75% / 780 |
| `.t-display-md` (h1) | 49 / 1.05 (34) | 85% / 720 |
| `.t-headline` (h2) | 31 / 1.15 (25) | 92% / 680 |
| `.t-card-title` (h3, panel titles) | 20 / 1.3 (18) | 100% / 620 |
| `.t-body-lg`, `.t-body`, `.t-body-sm` | 18, 16, 14 / 1.5 to 1.55 | 100% / 400 |
| `.t-caption` | 13 / 1.4 | 100% / 400 |
| `.t-eyebrow` | 13 / 1.3 | 100% / 600, sentence case (never uppercase or tracked) |
| `.t-score` | set by context | 68% / 800, tabular |
| Chart labels | 12 minimum | 87% / 650 |

Headings balance their lines; paragraphs use `pretty`. No meta strings joined with "·": use label-value pairs or a sentence. "Games through" appears once per page.

## Space, radius, elevation, motion

- **Space:** 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96 (`--space-section`, 64 on phones). Sections take their natural height.
- **Radius by role:**
  - `--radius-xs` 3: tags, badges;
  - `--radius-sm` 4: small marks, segments;
  - `--radius-md` 6: controls (buttons, chips, segmented, inputs);
  - `--radius-lg` 10: panels;
  - `--radius-xl` 16: the card field;
  - pills only for avatars, bars, tracks and switches.
- **Elevation:** surfaces climb the ladder; `--shadow-float` only on floating layers (search dialog, popovers, tooltips, toasts).
- **Motion:**
  - `--motion-press` 120 ms (press scales to 0.98);
  - `--motion-fast` 180 ms (hover, state);
  - `--motion-base` 240 ms (opening, chart settle);
  - `--motion-slow` 320 ms;
  - `--motion-signature` 600 ms (the card's rings).
  - Enter easing `--ease-out`, exits faster. Transform and opacity only. Reduced motion zeroes every duration.

## Components

Every component covers default, hover, focus-visible, active, loading (a skeleton in the final shape), empty, error and disabled where the state can occur.

- **Button:** primary (chalk fill, one per page), secondary (surface with a hairline), tertiary (text). 44 px on touch.
- **Choice controls, one per job:** segmented for 2 to 4 views of one thing; chips for 5 or more, wrapping; tabs only for in-page section navigation.
- **Chart frame:**
  - title and controls (the table toggle always top right);
  - the answer as the lead (17 px, ink);
  - the visual;
  - a footer row with who is included and "How to Read This" (stacked on phones).
- **Stat tiles:** one panel divided by hairlines; label, score figure (34 px condensed), rank.
- **Notices:** a quiet inline line for context; toasts for confirmations; errors carry an icon, the cause and the fix.

## Charts

- **Axes and grid:** hairline axes; gridlines on the value axis only; 4 to 6 ticks at nice numbers; axis titles in words; up and right mean better.
- **Marks:**
  - dots of radius 5 (7.5 when highlighted), each with a 1 to 1.5 px ring in the panel color;
  - lines 2 px;
  - bands as regions;
  - thin samples hollow.
- **Text:** labels 12 px or larger, never in the series color, direct labels never covering a dot.
- **Tooltips:**
  - `--surface-4` with `--shadow-float`;
  - the team band on top;
  - the name, then "Team position", then values with units and the rank;
  - the same card on keyboard focus.
- **Numbers:** tabular, a real minus sign, one decimal for rates, ordinal ranks, signed net ratings.
- **Load:** marks settle once (240 ms) only when on screen; nothing under reduced motion.
