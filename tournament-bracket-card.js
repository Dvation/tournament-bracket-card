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

const CARD_VERSION = "0.2.0";

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
    const m = Math.max(1, ...d.map((r) => (r.matches || []).length));
    return Math.min(12, Math.max(3, m + 1));
  }

  _render() {
    if (!this.shadowRoot) return;
    const c = this._config;
    const data = this._data;

    let rounds = Array.isArray(data) ? data.slice() : [];
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

    this.shadowRoot.innerHTML = `<style>${this._styles()}</style><div class="tbc-card">${header}${body}</div>`;

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
      (r.matches || []).map((m) => this._match(m)).join("") ||
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
        --tbc-line: color-mix(in srgb, var(--secondary-text-color, #8a8a8a) 60%, transparent);
        background: var(--ha-card-background, var(--card-background-color, #fff));
        color: var(--primary-text-color, #212121);
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0,0,0,.12));
        border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, transparent));
        padding: 12px;
        overflow: hidden;
        container-type: inline-size;
      }
      .tbc-title { font-size: 1.25rem; font-weight: 600; padding: 4px 4px 12px; }
      .tbc-empty { padding: 24px; text-align: center; color: var(--secondary-text-color, #727272); }
      .tbc-empty code { background: var(--secondary-background-color,#f0f0f0); padding:1px 5px; border-radius:4px; }

      .tbc-tabs { display:none; gap:6px; overflow-x:auto; padding:0 2px 10px; scrollbar-width:thin; }
      .tbc-tab {
        flex:0 0 auto; cursor:pointer; font:inherit; font-size:.8rem;
        background: var(--secondary-background-color,#f0f0f0);
        color: var(--primary-text-color,#212121);
        border:none; border-radius:14px; padding:5px 12px; white-space:nowrap;
      }
      .tbc-tab.active { background: var(--primary-color,#03a9f4); color:#fff; }

      .tbc-scroll { overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
      .tbc-bracket { display:flex; align-items:stretch; width:max-content; min-width:100%; padding:4px 2px; }
      .tbc-round { flex:0 0 auto; display:flex; flex-direction:column; min-width:176px; padding:0 14px; scroll-margin-left:8px; }
      .tbc-round-title {
        font-size:.72rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
        color: var(--secondary-text-color,#727272); text-align:center; padding-bottom:8px;
      }
      .tbc-matches { flex:1; display:flex; flex-direction:column; }
      /* flex-basis:auto so a slot never shrinks below its card (no clipping in
         tall rounds); slots still grow to spread out in shorter rounds. */
      .tbc-slot { flex:1 1 auto; display:flex; align-items:center; position:relative; padding:6px 0; }

      .tbc-match {
        width:100%; background: var(--secondary-background-color,#fafafa);
        border:1px solid var(--divider-color,#e6e6e6); border-radius:8px; overflow:hidden;
      }
      .tbc-match--live { border-color: var(--error-color,#e53935); box-shadow:0 0 0 1px var(--error-color,#e53935); }

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
      .tbc-round:not(:first-child):not(.tbc-round--third) .tbc-slot::before {
        content:""; position:absolute; right:100%; top:50%; width:14px; height:2px; background: var(--tbc-line);
      }

      .tbc-side {
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:7px 10px; font-size:.9rem;
      }
      .tbc-side + .tbc-side { border-top:1px solid var(--divider-color,#e6e6e6); }
      .tbc-team { display:flex; align-items:center; gap:8px; min-width:0; }
      .tbc-crest { width:20px; height:20px; object-fit:contain; flex:0 0 auto; }
      .tbc-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .tbc-score { font-variant-numeric:tabular-nums; font-weight:700; flex:0 0 auto; }
      .tbc-side--win { font-weight:700; }
      .tbc-side--win .tbc-score { color: var(--primary-color,#03a9f4); }
      .tbc-side--tbd .tbc-name { color: var(--secondary-text-color,#9e9e9e); font-style:italic; }

      .tbc-meta { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:3px 10px 6px; min-height:14px; }
      .tbc-badge { font-size:.62rem; font-weight:700; letter-spacing:.05em; padding:1px 6px; border-radius:8px;
        background: var(--divider-color,#e0e0e0); color: var(--primary-text-color,#333); }
      .tbc-badge--live { background: var(--error-color,#e53935); color:#fff; }
      @media (prefers-reduced-motion: no-preference) {
        .tbc-badge--live { animation: tbc-pulse 1.3s ease-in-out infinite; }
      }
      .tbc-badge--post { background: var(--divider-color,#e0e0e0); color: var(--secondary-text-color,#555); }
      .tbc-when { font-size:.68rem; color: var(--secondary-text-color,#727272); }
      @keyframes tbc-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

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
