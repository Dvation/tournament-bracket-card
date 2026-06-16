# Tournament Bracket Card

A generic, single-elimination **tournament bracket** card for Home Assistant (Lovelace).

## Why this card

It is **safe by construction**:

- **No API calls of its own** — renders only the Home Assistant entity data you give it. (Optional team-crest images load from URLs present in that data; turn off with `show_logos: false` for zero outbound requests.)
- **No `eval`**, no inline event handlers, no remote scripts, no telemetry.
- **No dependencies / no build step** — a single, auditable vanilla-JS web component.

It is **generic** — it renders any bracket described by a neutral data model, so it works
for the World Cup, cup competitions, playoffs, esports, etc. The World Cup 2026 is the
first consumer (data sourced from ESPN's public API via Home Assistant REST/template
sensors — see the [`examples/world-cup-2026/`](./examples/world-cup-2026/) folder).

## Features

- Rounds rendered as columns (Round of 32 → … → Final) with connectors.
- Optional third-place node next to the Final.
- Per-match: two sides with optional crest, score, and **winner highlighting**.
- Live / scheduled / finished states with a status badge.
- Responsive: horizontal tree on desktop, round selector on narrow screens.
- Theme-aware via Home Assistant CSS variables, with optional `compact` mode and `accent_color` / `connector_color` overrides.
- Graceful handling of odd / non-power-of-two brackets (byes, unpaired matches).

## Installation

**HACS (custom repository):** HACS → ⋮ → *Custom repositories* → add this repo with
category **Dashboard**, then install and add the resource.

**Manual:** copy `tournament-bracket-card.js` to `/config/www/`, then add a dashboard
resource of type **JavaScript Module** pointing at `/local/tournament-bracket-card.js`.

## Configuration

```yaml
type: custom:tournament-bracket-card
title: World Cup 2026          # optional header
entity: sensor.wc_bracket      # entity holding the bracket data
attribute: rounds              # attribute name (default: "rounds")
# rounds: [...]                # OR inline static data (overrides entity)
show_third_place: true         # optional (default: true)
show_logos: true               # optional (default: true) — team crests
compact: false                 # optional — denser layout
theme: ""                      # optional — "" (default) | "neon" | "bronze"
accent_color: ""               # optional — CSS color for winners / scores / active tab
connector_color: ""            # optional — CSS color for the bracket lines
# theme_vars: {}               # advanced — override any --tbc-* variable (see Theming)
```

> **Tip:** display the card in a **panel-mode view** (View type → *Panel (1 card)*, or
> `panel: true`). A bracket is wide, so it needs the full page width; in a normal
> column the card switches to its narrow single-column (tab) layout.

### Data model (`rounds`)

The card is sport-agnostic; it renders whatever this structure describes:

```jsonc
[
  {
    "id": "round-of-32",
    "name": "Round of 32",
    "matches": [
      {
        "id": "760486",
        "sideA": { "name": "Spain", "short": "ESP", "logo": "https://…", "score": 2, "winner": true },
        "sideB": { "name": "2A",    "short": "2A",  "logo": null,        "score": null, "winner": false },
        "state": "post",          // "pre" | "live" | "post"
        "statusDetail": "FT",     // free-text badge
        "date": "2026-06-28T19:00Z"
      }
    ]
  }
]
```

A missing team name falls back to its placeholder (e.g. `"2A"`) so undecided slots render
as TBD automatically. The `entity` attribute may be a **native list or a JSON string**, so
a template sensor can emit it with `| to_json`.

## Theming

The card inherits your Home Assistant theme by default. There are three layers of
customization, simplest first.

> **Note:** all of these are **card** options — set on the card itself (its visual
> editor or YAML). They are *not* the dashboard **view**'s "Theme" dropdown, which
> applies a whole Home Assistant theme to the entire view.

### 1. Built-in themes

```yaml
theme: neon      # or: bronze   (omit for the default Home Assistant look)
```

- **`neon`** — dark slate background, lime-green accents and connectors, magenta live state, rounded cards.
- **`bronze`** — warm dark background, gold accents, thin connectors, and a gold-highlighted Final.

In the visual editor, pick it from the **Theme** dropdown (Default / Neon / Bronze).

### 2. Quick tweaks

Layer these over any theme (or the default):

```yaml
accent_color: "#e91e63"     # winners, scores, active round tab
connector_color: "#8a8a8a"  # the bracket lines
compact: true               # denser padding / smaller text
```

### 3. Create your own theme (`theme_vars`)

Override any of the card's CSS custom properties for full control. `theme_vars` wins over
a built-in `theme` and over your HA theme:

```yaml
type: custom:tournament-bracket-card
entity: sensor.wc_bracket
theme_vars:
  "--tbc-bg": "#101418"
  "--tbc-match-bg": "#1b212b"
  "--tbc-fg": "#ffffff"
  "--tbc-accent": "#00e5ff"
  "--tbc-line": "#00e5ff"
  "--tbc-radius": "18px"
```

| Variable | Controls |
|---|---|
| `--tbc-bg` | Card background |
| `--tbc-fg` | Primary text |
| `--tbc-muted` | Secondary text (round titles, dates, TBD slots) |
| `--tbc-match-bg` | Match card & round-tab background |
| `--tbc-border` | Borders / dividers |
| `--tbc-accent` | Winner score & active tab |
| `--tbc-on-accent` | Text on the accent color |
| `--tbc-live` | Live-match border & LIVE badge |
| `--tbc-line` | Connector lines |
| `--tbc-radius` | Card corner radius |
| `--tbc-match-radius` | Match card corner radius |
| `--tbc-shadow` | Card shadow |
| `--tbc-card-border` | Card border |

(The same `--tbc-*` variables can also be set with `card-mod` if you prefer — but
`theme_vars` needs no extra dependency.)

## World Cup 2026 (real-data example)

A complete, no-API-key example that feeds live FIFA World Cup 2026 knockout data into
the card from ESPN's public API lives in
[`examples/world-cup-2026/`](./examples/world-cup-2026/) — a `rest:` + `template:`
package that builds `sensor.wc_bracket.attributes.rounds`, plus the dashboard card config.

## Development

`dev/index.html` mounts the component with a mock `hass` and sample data so you can iterate
on layout without a running Home Assistant.

## Roadmap

- `v0.1` — YAML-configured card, bracket rendering, mobile round-tabs. ✅
- `v0.2` — visual config editor (UI) + card-picker preview. ✅
- `v0.3` — odd-bracket edge cases + theming: compact, accent/connector colors, **neon & bronze themes**, and full `theme_vars` overrides. ✅
- next — packaging for the HACS default store.

## License

[MIT](./LICENSE)
