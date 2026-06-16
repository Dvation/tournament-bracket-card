/*
 * Tournament Bracket Card
 * A generic single-elimination bracket card for Home Assistant (Lovelace).
 *
 * Safe by construction: no eval, no inline event handlers, no remote scripts,
 * no network/API calls of its own. It renders only the entity data you give it.
 * (Optional team crests load <img> from URLs present in that data; disable with
 * show_logos: false.)
 *
 * Repo: https://github.com/Dvation/tournament-bracket-card
 */

const CARD_VERSION = "0.3.1";

console.info(
  `%c TOURNAMENT-BRACKET-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#03a9f4;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#03a9f4;background:#fff;border-radius:0 3px 3px 0;padding:2px 4px"
);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function fmtKickoff(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return esc(iso);
  try {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (e) {
    return d.toISOString();
  }
}

const isThirdPlace = (r) =>
  /third|3rd/i.test(`${(r && r.id) || ""} ${(r && r.name) || ""}`);

class TournamentBracketCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._sig = null;
    this._data = null;
  }

  static getStubConfig() {
    return {
      title: "Tournament",
      rounds: [
        {
          id: "sf",
          name: "Semifinals",
          matches: [
            { sideA: { name: "Team A", score: 2, winner: true }, sideB: { name: "Team B", score: 1 }, state: "post", statusDetail: "FT" },
            { sideA: { name: "Team C" }, sideB: { name: "Team D" }, state: "pre" },
          ],
        },
        {
          id: "final",
          name: "Final",
          matches: [{ sideA: { name: "Team A" }, sideB: { name: "SF2 Winner" }, state: "pre" }],
        },
      ],
    };
  }

  static getConfigElement() {
    return document.createElement("tournament-bracket-card-editor");
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (!Array.isArray(config.rounds) && !config.entity)
      throw new Error("tournament-bracket-card: set `entity` or inline `rounds`");
    if (config.entity && typeof config.entity !== "string")
      throw new Error("tournament-bracket-card: `entity` must be a string");

    this._config = {
      title: config.title ?? null,
      entity: config.entity ?? null,
      attribute: config.attribute || "rounds",
      rounds: Array.isArray(config.rounds) ? config.rounds : null,
      show_third_place: config.show_third_place !== false,
      show_logos: config.show_logos !== false,
      compact: config.compact === true,
      theme: typeof config.theme === "string" ? config.theme : null,
      accent_color: typeof config.accent_color === "string" ? config.accent_color : null,
      connector_color: typeof config.connector_color === "string" ? config.connector_color : null,
      theme_vars: config.theme_vars && typeof config.theme_vars === "object" ? config.theme_vars : null,
    };
    this._sig = null;
    this._update(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._update(false);
  }

  _resolve() {
    const c = this._config;
    if (!c) return null;
    if (Array.isArray(c.rounds)) return c.rounds;
    if (c.entity && this._hass) {
      const st = this._hass.states[c.entity];
      let v = st && st.attributes ? st.attributes[c.attribute] : null;
      // Attribute may arrive as a native list or as a JSON string (e.g. a
      // template sensor using `| to_json`). Accept both.
      if (typeof v === "string") {
        try { v = JSON.parse(v); } catch (e) { return undefined; }
      }
      return Array.isArray(v) ? v : undefined; // undefined = entity exists but no data yet
    }
    return null;
  }

  _update(force) {
    const data = this._resolve();
    let sig;
    try {
      sig = JSON.stringify(data ?? null);
    } catch (e) {
      sig = String(Date.now());
    }
    if (!force && sig === this._sig) return;
    this._sig = sig;
    this._data = data;
    this._render();
  }

  getCardSize() {
    const d = this._data;
    if (!Array.isArray(d) || !d.length) return 3;
    const m = Math.max(1, ...d.map((r) => (r && Array.isArray(r.matches) ? r.matches.length : 0)));
    return Math.min(12, Math.max(3, m + 1));
  }

  _render() {
    if (!this.shadowRoot) return;
    const c = this._config;
    const data = this._data;

    let rounds = Array.isArray(data) ? data.filter((r) => r && typeof r === "object") : [];
    if (c && !c.show_third_place) rounds = rounds.filter((r) => !isThirdPlace(r));

    const header = c && c.title ? `<div class="tbc-title">${esc(c.title)}</div>` : "";

    let body;
    if (!Array.isArray(data)) {
      body = `<div class="tbc-empty">${
        c && c.entity ? `Waiting for <code>${esc(c.entity)}</code>…` : "No bracket data"
      }</div>`;
    } else if (!rounds.length) {
      body = `<div class="tbc-empty">No rounds to display</div>`;
    } else {
      let lastMain = -1;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (!isThirdPlace(rounds[i])) { lastMain = i; break; }
      }
      const tabs = rounds
        .map((r, i) => `<button class="tbc-tab" data-i="${i}">${esc(r.name || r.id || "Round " + (i + 1))}</button>`)
        .join("");
      const cols = rounds
        .map((r, i) => this._round(r, i, { isFinal: i === lastMain, isThird: isThirdPlace(r) }))
        .join("");
      body = `<div class="tbc-tabs">${tabs}</div><div class="tbc-scroll"><div class="tbc-bracket">${cols}</div></div>`;
    }

    const THEMES = { neon: "tbc-theme-neon", bronze: "tbc-theme-bronze" };
    let cardCls = "tbc-card";
    if (c && c.compact) cardCls += " tbc-compact";
    if (c && c.theme && THEMES[c.theme]) cardCls += " " + THEMES[c.theme];
    this.shadowRoot.innerHTML = `<style>${this._styles()}</style><div class="${cardCls}">${header}${body}</div>`;

    // Optional theming via CSS custom properties. setProperty validates the value
    // (invalid colors are ignored by the CSSOM), so this is injection-safe.
    const cardEl = this.shadowRoot.querySelector(".tbc-card");
    if (cardEl && c) {
      if (c.accent_color) cardEl.style.setProperty("--tbc-accent", c.accent_color);
      if (c.connector_color) cardEl.style.setProperty("--tbc-line", c.connector_color);
      // Full custom theming: override any --tbc-* variable. Restricted to custom
      // properties (keys starting with --) and applied via setProperty, which the
      // CSSOM validates — so it can't inject arbitrary CSS or break layout.
      if (c.theme_vars) {
        for (const [k, v] of Object.entries(c.theme_vars)) {
          if (typeof k === "string" && k.startsWith("--") && typeof v === "string") {
            cardEl.style.setProperty(k, v);
          }
        }
      }
    }

    // Wire interactions WITHOUT inline handlers (CSP-safe).
    const roundEls = this.shadowRoot.querySelectorAll(".tbc-round");
    this.shadowRoot.querySelectorAll(".tbc-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const col = roundEls[+btn.dataset.i];
        if (col) col.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        this.shadowRoot.querySelectorAll(".tbc-tab").forEach((b) => b.classList.toggle("active", b === btn));
      });
    });
    this.shadowRoot.querySelectorAll(".tbc-crest").forEach((img) => {
      img.addEventListener("error", () => {
        img.style.display = "none";
      });
    });
  }

  _round(r, i, flags) {
    flags = flags || {};
    const slots =
      (Array.isArray(r.matches) ? r.matches : []).map((m) => this._match(m)).join("") ||
      `<div class="tbc-slot"><div class="tbc-match tbc-match--pre"><div class="tbc-side tbc-side--tbd"><span class="tbc-team"><span class="tbc-name">—</span></span></div></div></div>`;
    let cls = "tbc-round";
    if (flags.isThird) cls += " tbc-round--third";
    if (flags.isFinal) cls += " tbc-round--final";
    return `<div class="${cls}">
      <div class="tbc-round-title">${esc(r.name || r.id || "Round " + (i + 1))}</div>
      <div class="tbc-matches">${slots}</div>
    </div>`;
  }

  _match(m) {
    m = m || {};
    const state = (m.state || "").toLowerCase();
    const a = m.sideA || {};
    const b = m.sideB || {};
    const badge = m.statusDetail
      ? `<span class="tbc-badge tbc-badge--${esc(state) || "pre"}">${esc(m.statusDetail)}</span>`
      : state === "live"
      ? `<span class="tbc-badge tbc-badge--live">LIVE</span>`
      : "";
    const when = state === "pre" && m.date ? `<span class="tbc-when">${esc(fmtKickoff(m.date))}</span>` : "";
    // Always render the meta row so every match card is the same height. Uniform
    // card heights keep the bracket connectors aligned regardless of which
    // matches have a badge/date.
    const meta = `<div class="tbc-meta">${badge}${when}</div>`;
    return `<div class="tbc-slot"><div class="tbc-match tbc-match--${esc(state) || "pre"}">
      ${this._side(a, state)}
      ${this._side(b, state)}
      ${meta}
    </div></div>`;
  }

  _side(s, state) {
    const named = !!(s.name || s.short);
    const name = s.name || s.short || "TBD";
    const showScore = (state === "live" || state === "post") && s.score != null;
    const score = showScore ? `<span class="tbc-score">${esc(s.score)}</span>` : "";
    const logo =
      this._config.show_logos && s.logo
        ? `<img class="tbc-crest" src="${esc(s.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : "";
    return `<div class="tbc-side${s.winner ? " tbc-side--win" : ""}${named ? "" : " tbc-side--tbd"}">
      <span class="tbc-team">${logo}<span class="tbc-name">${esc(name)}</span></span>
      ${score}
    </div>`;
  }

  _styles() {
    return `
      :host { display:block; }
      .tbc-card {
        --tbc-bg: var(--ha-card-background, var(--card-background-color, #fff));
        --tbc-fg: var(--primary-text-color, #212121);
        --tbc-muted: var(--secondary-text-color, #727272);
        --tbc-match-bg: var(--secondary-background-color, #fafafa);
        --tbc-border: var(--divider-color, #e6e6e6);
        --tbc-accent: var(--primary-color, #03a9f4);
        --tbc-on-accent: #fff;
        --tbc-live: var(--error-color, #e53935);
        --tbc-line: color-mix(in srgb, var(--tbc-muted) 60%, transparent);
        --tbc-radius: var(--ha-card-border-radius, 12px);
        --tbc-match-radius: 8px;
        --tbc-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.12));
        --tbc-card-border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, transparent));
        background: var(--tbc-bg);
        color: var(--tbc-fg);
        border-radius: var(--tbc-radius);
        box-shadow: var(--tbc-shadow);
        border: var(--tbc-card-border);
        padding: 12px;
        overflow: hidden;
        container-type: inline-size;
      }

      /* ---- bundled themes (selectable via the theme config option) ---- */
      .tbc-card.tbc-theme-neon {
        --tbc-bg: #0d1117;
        --tbc-fg: #f2f5f8;
        --tbc-muted: #8b97a6;
        --tbc-match-bg: #1a212b;
        --tbc-border: #2c3744;
        --tbc-accent: #b6ff3a;
        --tbc-on-accent: #0d1117;
        --tbc-live: #ff2d8e;
        --tbc-line: color-mix(in srgb, var(--tbc-accent) 55%, transparent);
        --tbc-radius: 16px;
        --tbc-match-radius: 12px;
        --tbc-shadow: 0 4px 18px rgba(0,0,0,.45);
        --tbc-card-border: 1px solid #1c2530;
      }
      .tbc-card.tbc-theme-bronze {
        --tbc-bg: #272019;
        --tbc-fg: #f3efe6;
        --tbc-muted: #a89c86;
        --tbc-match-bg: #332b1f;
        --tbc-border: #4a4030;
        --tbc-accent: #cda860;
        --tbc-on-accent: #271f12;
        --tbc-live: #e0563b;
        --tbc-line: color-mix(in srgb, #ffffff 32%, transparent);
        --tbc-radius: 14px;
        --tbc-match-radius: 10px;
        --tbc-shadow: 0 4px 18px rgba(0,0,0,.4);
        --tbc-card-border: 1px solid #3a3225;
      }
      .tbc-card.tbc-theme-bronze .tbc-round--final .tbc-match {
        border-color: var(--tbc-accent); box-shadow: 0 0 0 1px var(--tbc-accent);
      }

      .tbc-title { font-size: 1.25rem; font-weight: 600; padding: 4px 4px 12px; }
      .tbc-empty { padding: 24px; text-align: center; color: var(--tbc-muted); }
      .tbc-empty code { background: var(--tbc-match-bg); padding:1px 5px; border-radius:4px; }

      .tbc-tabs { display:none; gap:6px; overflow-x:auto; padding:0 2px 10px; scrollbar-width:thin; }
      .tbc-tab {
        flex:0 0 auto; cursor:pointer; font:inherit; font-size:.8rem;
        background: var(--tbc-match-bg); color: var(--tbc-fg);
        border:none; border-radius:14px; padding:5px 12px; white-space:nowrap;
      }
      .tbc-tab.active { background: var(--tbc-accent); color: var(--tbc-on-accent); }

      .tbc-scroll { overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
      .tbc-bracket { display:flex; align-items:stretch; width:max-content; min-width:100%; padding:4px 2px; }
      .tbc-round { flex:0 0 auto; display:flex; flex-direction:column; min-width:176px; padding:0 14px; scroll-margin-left:8px; }
      .tbc-round-title {
        font-size:.72rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
        color: var(--tbc-muted); text-align:center; padding-bottom:8px;
      }
      .tbc-matches { flex:1; display:flex; flex-direction:column; }
      /* flex-basis:auto so a slot never shrinks below its card (no clipping in
         tall rounds); slots still grow to spread out in shorter rounds. */
      .tbc-slot { flex:1 1 auto; display:flex; align-items:center; position:relative; padding:6px 0; }

      .tbc-match {
        width:100%; background: var(--tbc-match-bg);
        border:1px solid var(--tbc-border); border-radius: var(--tbc-match-radius); overflow:hidden;
      }
      .tbc-match--live { border-color: var(--tbc-live); box-shadow:0 0 0 1px var(--tbc-live); }

      /* bracket connectors: elbows joining each pair to the next round */
      .tbc-round:not(.tbc-round--final):not(.tbc-round--third) .tbc-slot::after {
        content:""; position:absolute; left:100%; width:14px; box-sizing:border-box;
        border-right:2px solid var(--tbc-line);
      }
      .tbc-round:not(.tbc-round--final):not(.tbc-round--third) .tbc-slot:nth-child(odd):not(:last-child)::after {
        top:50%; height:100%; border-top:2px solid var(--tbc-line);
      }
      .tbc-round:not(.tbc-round--final):not(.tbc-round--third) .tbc-slot:nth-child(even)::after {
        bottom:50%; height:100%; border-bottom:2px solid var(--tbc-line);
      }
      /* odd-count round: the lone unpaired (last) match gets only a forward stub */
      .tbc-round:not(.tbc-round--final):not(.tbc-round--third) .tbc-slot:nth-child(odd):last-child::after {
        top:50%; height:0; border-top:2px solid var(--tbc-line); border-right:none;
      }
      .tbc-round:not(:first-child):not(.tbc-round--third) .tbc-slot::before {
        content:""; position:absolute; right:100%; top:50%; width:14px; height:2px; background: var(--tbc-line);
      }

      .tbc-side {
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:7px 10px; font-size:.9rem;
      }
      .tbc-side + .tbc-side { border-top:1px solid var(--tbc-border); }
      .tbc-team { display:flex; align-items:center; gap:8px; min-width:0; }
      .tbc-crest { width:20px; height:20px; object-fit:contain; flex:0 0 auto; }
      .tbc-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .tbc-score { font-variant-numeric:tabular-nums; font-weight:700; flex:0 0 auto; }
      .tbc-side--win { font-weight:700; }
      .tbc-side--win .tbc-score { color: var(--tbc-accent); }
      .tbc-side--tbd .tbc-name { color: var(--tbc-muted); font-style:italic; }

      .tbc-meta { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:3px 10px 6px; min-height:14px; }
      .tbc-badge { font-size:.62rem; font-weight:700; letter-spacing:.05em; padding:1px 6px; border-radius:8px;
        background: var(--tbc-border); color: var(--tbc-fg); }
      .tbc-badge--live { background: var(--tbc-live); color:#fff; }
      @media (prefers-reduced-motion: no-preference) {
        .tbc-badge--live { animation: tbc-pulse 1.3s ease-in-out infinite; }
      }
      .tbc-badge--post { background: var(--tbc-border); color: var(--tbc-muted); }
      .tbc-when { font-size:.68rem; color: var(--tbc-muted); }
      @keyframes tbc-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

      .tbc-compact { padding:8px; }
      .tbc-compact .tbc-title { font-size:1.05rem; padding:2px 2px 8px; }
      .tbc-compact .tbc-round { min-width:142px; padding:0 10px; }
      .tbc-compact .tbc-side { padding:4px 8px; font-size:.82rem; }
      .tbc-compact .tbc-crest { width:16px; height:16px; }
      .tbc-compact .tbc-slot { padding:4px 0; }
      .tbc-compact .tbc-meta { padding:2px 8px 4px; }

      @container (max-width: 560px) {
        .tbc-tabs { display:flex; }
        .tbc-round { min-width: 100%; padding: 0 4px; }
        .tbc-round:not(.tbc-round--final):not(.tbc-round--third) .tbc-slot::after,
        .tbc-round:not(:first-child):not(.tbc-round--third) .tbc-slot::before { display:none; }
      }
    `;
  }
}

if (!customElements.get("tournament-bracket-card")) {
  customElements.define("tournament-bracket-card", TournamentBracketCard);
}

/* Visual config editor (shown in the dashboard card editor). Uses Home
 * Assistant's own <ha-form>, so it only renders inside HA — that's fine, the
 * editor never runs in the standalone dev harness. */
class TournamentBracketCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) =>
        ({
          title: "Title",
          entity: "Entity (holds the bracket data)",
          attribute: "Attribute name (default: rounds)",
          show_third_place: "Show third-place match",
          show_logos: "Show team crests",
          compact: "Compact layout",
          theme: "Theme",
          accent_color: "Accent color (CSS color)",
          connector_color: "Connector line color (CSS color)",
        }[s.name] || s.name);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const config = { ...this._config, ...ev.detail.value };
        this.dispatchEvent(
          new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true })
        );
      });
      this.shadowRoot.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: "title", selector: { text: {} } },
      { name: "entity", selector: { entity: {} } },
      { name: "attribute", selector: { text: {} } },
      { name: "show_third_place", selector: { boolean: {} } },
      { name: "show_logos", selector: { boolean: {} } },
      { name: "compact", selector: { boolean: {} } },
      { name: "theme", selector: { select: { mode: "dropdown", options: [
        { value: "default", label: "Default (Home Assistant theme)" },
        { value: "neon", label: "Neon" },
        { value: "bronze", label: "Bronze" },
      ] } } },
      { name: "accent_color", selector: { text: {} } },
      { name: "connector_color", selector: { text: {} } },
    ];
    this._form.data = this._config || {};
  }
}

if (!customElements.get("tournament-bracket-card-editor")) {
  customElements.define("tournament-bracket-card-editor", TournamentBracketCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tournament-bracket-card",
  name: "Tournament Bracket Card",
  description: "Generic single-elimination bracket rendered from a neutral rounds data model.",
  preview: true,
  documentation: "https://github.com/Dvation/tournament-bracket-card",
});
