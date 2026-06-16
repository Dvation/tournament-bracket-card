# World Cup 2026 — knockout bracket example

A complete, real-data example for **tournament-bracket-card** using ESPN's public
API — no API key, no secrets, nothing leaves your instance except an outbound GET
to `site.api.espn.com`.

## How it works

```
ESPN scoreboard API ──(rest:)──▶ sensor.wc_knockout_raw  (raw events in attribute)
                                          │  (template: trigger)
                                          ▼
                              sensor.wc_bracket.attributes.rounds  (neutral model)
                                          │
                                          ▼
                              custom:tournament-bracket-card
```

ESPN already publishes the full 32-match knockout structure with TBD placeholders
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

## Notes

- `dates=20260628-20260719` in the resource URL bounds the knockout window; adjust
  if FIFA shifts the schedule.
- The raw events attribute is sizeable — the package suggests excluding both
  sensors from the recorder (see the commented block in `package.yaml`).
- During live matches the feed updates each poll (120 s); scores, the `LIVE`
  badge, and winner advancement update automatically.
