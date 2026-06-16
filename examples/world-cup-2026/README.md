# World Cup 2026 — full tournament dashboard example

A complete, real-data World Cup dashboard using ESPN's public API — no API key, no
secrets, nothing leaves your instance except outbound GETs to `site.api.espn.com`.
Three tabs: **Bracket** (tournament-bracket-card), **Groups** (12 group tables), and
**Matches** (today / live / results / upcoming).

## How it works

```
ESPN public API ──(rest:)──▶ raw sensors ──(template:)──▶
   • sensor.wc_bracket   .rounds   → tournament-bracket-card  (Bracket tab)
   • sensor.wc_standings .groups   → markdown group tables     (Groups tab)
   • sensor.wc_schedule  .matches  → markdown match lists       (Matches tab)
```

ESPN already publishes the 32-match knockout structure with TBD placeholders
(`2A`, "Group B 2nd Place", …), so the bracket renders **now** and fills in real
teams/scores automatically as the tournament progresses — no seeding logic needed.

## Setup

1. **Install the card** (HACS custom repository → category *Dashboard*, or copy
   `tournament-bracket-card.js` to `<config>/www/` and add it as a dashboard
   resource of type *JavaScript Module*).

2. **Add the data glue.** Copy [`package.yaml`](./package.yaml) to
   `<config>/packages/world_cup_bracket.yaml` and enable packages in
   `configuration.yaml`:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

   (Or merge the `rest:` and `template:` sections straight into
   `configuration.yaml`.) Restart Home Assistant.

3. **Verify** `sensor.wc_bracket` exists and its `rounds` attribute is populated
   (Developer Tools → States). It should list the rounds present in ESPN's feed.

4. **Add the card** to a dashboard using [`dashboard-card.yaml`](./dashboard-card.yaml).

   **Display it in a panel-mode view.** A full bracket is wide, so give it the whole
   page width — otherwise the card's container query drops it into the narrow,
   single-column (tab) layout. Create a view with **View type → Panel (1 card)**, or in
   YAML:

   ```yaml
   views:
     - title: Bracket
       path: bracket
       panel: true
       cards:
         - type: custom:tournament-bracket-card
           title: World Cup 2026 — Knockout Bracket
           entity: sensor.wc_bracket
           attribute: rounds
   ```

## Full dashboard (Groups & Matches)

For the complete three-tab dashboard, use [`dashboard.yaml`](./dashboard.yaml) — it adds:

- **Groups** — a row of clickable group tabs (A–L) backed by `input_select.wc_group`
  (defined in `package.yaml`), with a markdown table for the selected group showing
  flag, full name, code, and P/W/D/L/GF/GA/GD/Pts.
- **Matches** — today's matches on top, then live, recent results, and upcoming —
  each with national flags.

All group/match cards are **native markdown** (no third-party card, no `eval`). The
only optional dependency is **card-mod** (HACS), used purely to highlight the active
group tab — without it the tabs still work, just unhighlighted. Flags use ESPN's image
combiner (`?h=20&w=20`) so they render small inline without HTML sizing.

## Notes

- `dates=20260628-20260719` in the resource URL bounds the knockout window; adjust
  if FIFA shifts the schedule.
- The raw events attribute is sizeable — the package suggests excluding both
  sensors from the recorder (see the commented block in `package.yaml`).
- During live matches the feed updates each poll (120 s); scores, the `LIVE`
  badge, and winner advancement update automatically.
