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
- Theme-aware via Home Assistant CSS variables.

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
- next — odd-bracket edge cases, theming options, packaging for the HACS default store.

## License

[MIT](./LICENSE)
