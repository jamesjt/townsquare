<template>
  <div class="intro">
    <div>
      <!-- Golem fork: the walkthrough paragraph is three themed doors. Each
           button drives the SAME path as its hotkey (a synthetic keyup), so
           there is exactly one host/join/create flow to maintain. -->
      <!-- In a session with no seats yet, the next step is SEATS, not doors:
           the host adds them. (FT-852: the player waiting screen is retired —
           App only renders Intro when sessionless; a player in a session
           always sees the live town square.) -->
      <template v-if="session.sessionId && !session.isSpectator">
        <p class="hint">Hosting <b>{{ session.sessionId }}</b> — add seats to build the town.</p>
        <ul class="doors">
          <li @click="press('a')">
            <span class="key"
              ><img :src="blood.A.src" class="blood-cap-a" alt="A"
            /></span>dd Players
          </li>
        </ul>
      </template>
      <template v-else>
        <!-- Golem fork: the page TITLE — "BLOOD" in the blood alphabet, a
             quiet "on the" beneath it; the dial's CLOCKTOWER letters in the
             art complete the name. DOM overlay (not baked into the
             background), pinned to the sky band above the clock face. Static
             PNGs — nothing animates, so the kill-switch has nothing to kill. -->
        <div class="title" aria-label="Blood on the Clocktower">
          <!-- Golem fork: clicking the word cycles its lettering — 0 the
               blood-alphabet PNGs, 1 gold official-style (Pirata One, OFL),
               2 the same lettering in blood red. Persisted so the choice
               survives reloads; fixed row height so nothing below shifts. -->
          <div
            class="blood-word"
            title="Click to change the lettering"
            @click="cycleTitleStyle"
          >
            <template v-if="titleStyle === 0">
              <img
                v-for="(g, i) in titleGlyphs"
                :key="i"
                :src="g.src"
                :style="g.style"
                :alt="g.alt"
              />
            </template>
            <span
              v-else
              class="lettered"
              :class="titleStyle === 1 ? 'gold' : 'red'"
              >Blood</span
            >
          </div>
          <div class="on-the">On the</div>
        </div>
        <ul class="doors" v-if="!mode">
          <li @click="openHost">
            <span class="key"
              ><img :src="blood.H.src" class="blood-cap-h" alt="H"
            /></span>ost
          </li>
          <li @click="openJoin">
            <span class="key"
              ><img :src="blood.J.src" class="blood-cap-j" alt="J"
            /></span>oin
          </li>
          <li @click="press('c')">
            <span class="key"
              ><img :src="blood.C.src" class="blood-cap-c" alt="C"
            /></span>reate
          </li>
        </ul>

        <!-- Golem fork: Host and Join swap the doors for in-app panels —
             no browser dialogs anywhere in the entry flow. -->
        <div class="panel" v-else-if="mode === 'host'">
          <ul class="towns" v-if="hostTowns.length">
            <li
              v-for="t in hostTowns"
              :key="t.id"
              :class="{ picked: townId === t.id }"
              @click="townId = t.id"
            >
              <span class="dot" :class="dotClass(t.id)"></span>
              <span class="name" :title="t.id">
                {{ townLabel(t) }}
                <small class="tid" v-if="townLabel(t) !== t.id">{{ t.id }}</small>
              </span>
              <small class="yours" v-if="t.editKey">yours</small>
              <small>{{ statusLabel(t.id) }}</small>
            </li>
          </ul>
          <div class="field">
            <label>Town</label>
            <div class="town-input">
              <input
                ref="townInput"
                v-model="townId"
                spellcheck="false"
                autocomplete="off"
                @input="onTownInput"
                @focus="onTownFocus"
                @blur="onTownBlur"
                @keydown.esc="townDropdownOpen = false"
                @keyup.enter="confirmHost"
              />
              <span
                class="caret"
                :class="{ open: townDropdownOpen }"
                title="Show remembered towns"
                @mousedown.prevent="openTownDropdown"
              >
                <font-awesome-icon icon="chevron-down" />
              </span>
              <ul class="recents" v-if="townDropdownOpen">
                <li v-for="t in recentTowns" :key="t.id">
                  <span
                    class="name"
                    :title="t.id"
                    @mousedown.prevent="pickRecent(t)"
                  >
                    {{ townLabel(t) }}
                    <small class="tid" v-if="townLabel(t) !== t.id">{{ t.id }}</small>
                  </span>
                  <small class="yours" v-if="t.editKey">yours</small>
                  <span
                    class="forget"
                    :class="{ sure: forgetConfirm === t.id }"
                    :title="t.editKey ? 'Forget this town (click again to confirm — you\'ll lose its edit key)' : 'Forget this town'"
                    @mousedown.prevent="forgetRecent(t)"
                    >{{ forgetConfirm === t.id ? "sure?" : "×" }}</span
                  >
                </li>
                <li class="new-town" @mousedown.prevent="pickNewTown">
                  <span class="name">+ New town</span>
                </li>
              </ul>
            </div>
            <span class="tool" @click="reroll" title="Roll a new name">
              <font-awesome-icon icon="random" />
            </span>
          </div>
          <!-- Golem fork: the script picker is a card GRID, not a <select> —
               official editions wear their artwork, vault scripts the custom
               mark; the closed trigger wears the picked card's icon + name.
               Escape / click-out close it (document listeners, removed on
               close and on destroy). Cards are icon-forward (icon + name only
               on the face); the blurb + source ride a hover/focus tooltip
               (skipped on touch — tap still selects). -->
          <div class="field">
            <label>Script</label>
            <div class="script-pick" ref="scriptPick">
              <div
                class="trigger"
                :class="{ open: scriptGridOpen }"
                @click="toggleScriptGrid"
              >
                <img class="icon" :src="pickedCard.icon" alt="" />
                <span class="name">{{ pickedCard.name }}</span>
                <font-awesome-icon icon="chevron-down" class="caret" />
              </div>
              <div class="grid" v-if="scriptGridOpen" @scroll="hideTip">
                <div
                  class="card"
                  v-for="c in scriptCards"
                  :key="c.id"
                  :class="{ picked: scriptId === c.id }"
                  tabindex="0"
                  @click="pickScript(c)"
                  @keydown.enter="pickScript(c)"
                  @keydown.space.prevent="pickScript(c)"
                  @mouseenter="showTip($event, c)"
                  @mouseleave="hideTip"
                  @focus="showTip($event, c)"
                  @blur="hideTip"
                >
                  <img class="icon" :src="c.icon" alt="" />
                  <span class="cname">{{ c.name }}</span>
                </div>
              </div>
              <div
                class="card-tip"
                ref="cardTip"
                v-if="tipCard"
                :style="tipStyle"
              >
                <p class="tip-blurb" v-if="tipCard.blurb">{{ tipCard.blurb }}</p>
                <p class="tip-source" v-if="tipCard.source">{{ tipCard.source }}</p>
              </div>
            </div>
          </div>
          <!-- FT-847: owned towns. Hosting claims the town by default (the
               name + later its script save to the server, keyed to THIS
               browser — the same anonymous edit-key model as the script
               vault); a taken name just hosts as a guest of that town. -->
          <div class="field keep" v-if="ownsPicked">
            <label></label>
            <small class="owned-note"
              >yours — its name{{ attachedScriptId ? " and script" : "" }}
              travel with it</small
            >
          </div>
          <div class="field">
            <label>Link</label>
            <span
              class="share"
              @click="copyShare"
              :title="copied ? 'Copied!' : 'Copy the invite link'"
            >
              <span class="url">{{ shareLink }}</span>
              <font-awesome-icon :icon="copied ? 'check' : 'copy'" />
            </span>
          </div>
          <div class="acts">
            <span class="back" @click="mode = null">Back</span>
            <button
              class="confirm"
              :class="{ disabled: !townIdClean }"
              @click="confirmHost"
            >
              Open the town
            </button>
          </div>
        </div>

        <div class="panel" v-else>
          <p class="hint">Join a town.</p>
          <ul class="towns" v-if="joinTowns.length">
            <li
              v-for="t in joinTowns"
              :key="t.id"
              :class="{ picked: joinId === t.id }"
              @click="joinId = t.id"
            >
              <span class="dot" :class="dotClass(t.id)"></span>
              <span class="name" :title="t.id">
                {{ townLabel(t) }}
                <small class="tid" v-if="townLabel(t) !== t.id">{{ t.id }}</small>
              </span>
              <small>{{ statusLabel(t.id) }}</small>
            </li>
          </ul>
          <div class="field">
            <label>Town</label>
            <input
              v-model="joinId"
              spellcheck="false"
              placeholder="paste a link or a town name"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="field">
            <label>Name</label>
            <input
              v-model="joinName"
              spellcheck="false"
              placeholder="what the town calls you"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="acts">
            <span class="back" @click="mode = null">Back</span>
            <button
              class="confirm"
              :class="{ disabled: !canJoin }"
              @click="confirmJoin"
            >
              Enter the town
            </button>
          </div>
        </div>
      </template>
    </div>
    <a
      class="redirect"
      v-if="language === 'zh-CN'"
      href="https://clocktower.gstonegames.com"
    >
      <img src="../assets/gstone.png" class="gstone" alt="" />
      你想使用中文版魔典吗？
    </a>
  </div>
</template>

<script>
import { mapState } from "vuex";
import editionJSON from "../editions.json";
import {
  listTowns,
  townStatuses,
  mintTownId,
  mintAvailableTownId,
  normalizeTownId,
  editKeyFor,
  claimTown,
  townMeta,
  removeTown
} from "../golem/towns";
import bloodH from "../assets/blood/blood-H.png";
import bloodJ from "../assets/blood/blood-J.png";
import bloodC from "../assets/blood/blood-C.png";
import bloodA from "../assets/blood/blood-A.png";
import bloodMetrics from "../assets/blood/metrics.json";
// Golem fork: the page title's "BLOOD" — the FT-846 blood alphabet archive
// (O2 is the variant, so the double O never repeats a letterform).
import titleB from "../assets/blood/alphabet/B.png";
import titleL from "../assets/blood/alphabet/L.png";
import titleO from "../assets/blood/alphabet/O.png";
import titleO2 from "../assets/blood/alphabet/O2.png";
import titleD from "../assets/blood/alphabet/D.png";
import alphabetMetrics from "../assets/blood/alphabet/metrics.json";
// Golem fork: the script grid's card art — official editions wear their own
// logos; vault/custom cards wear the custom-script mark.
import edTb from "../assets/editions/tb.png";
import edBmr from "../assets/editions/bmr.png";
import edSnv from "../assets/editions/snv.png";
import edLuf from "../assets/editions/luf.png";
import edCustom from "../assets/editions/custom.png";
import { getRecents, peekScript } from "../golem/scripts";

// Golem fork (FT-846): the door initials are pre-rendered blood letters
// (Creepster + an SVG goo/drip/crust treatment, baked at 2x). Baked PNGs, not
// the live filter, because the filter's radii fall below one device pixel at
// door size and quantize the letterforms apart.
// Metrics are image px against a 180px reference font with the glyph baseline
// at image y=400; the drop-cap displays at 1.09x the key font (the 1.45x
// original, sized down ~25% for the vertical door stack), so ems convert as
// 1.09 / (180 * 2x) = 1.09/360 em per trimmed pixel — the static
// .blood-cap-* sizes in the style block below are that conversion, baked.
const BLOOD = {
  H: { src: bloodH, ...bloodMetrics.H },
  J: { src: bloodJ, ...bloodMetrics.J },
  C: { src: bloodC, ...bloodMetrics.C },
  A: { src: bloodA, ...bloodMetrics.A }
};

// The title's blood glyphs. The alphabet archive is original-artwork scans on
// its own scale ({w, h, baseline} image px), so ems normalize by the letters'
// above-baseline height (~370px ≈ 1em): the title font-size IS the letter
// height, and each drip sinks below the shared baseline by its own overhang.
const TITLE_EM_PER_PX = 1 / 370;
const TITLE_GLYPHS = [
  ["B", titleB],
  ["L", titleL],
  ["O", titleO],
  ["O2", titleO2],
  ["D", titleD]
];

// One-line flavor per official edition (level-appropriate, ours to write —
// editions.json carries only the long prose descriptions).
const OFFICIAL_BLURBS = {
  tb: "Deception and deduction in a sleepy town — the first-timers' script.",
  bmr: "Death comes in the night; keep the town alive long enough to win.",
  snv: "Madness and altered minds — nobody is sure of anything.",
  luf: "A freewheeling veteran brew of the strangest minds."
};
const EDITION_ICONS = { tb: edTb, bmr: edBmr, snv: edSnv, luf: edLuf };

export default {
  computed: {
    ...mapState(["session", "edition"]),
    editionList() {
      return editionJSON;
    },
    // Golem fork: the title's BLOOD letter row (see TITLE_EM_PER_PX above).
    titleGlyphs() {
      const em = px => (px * TITLE_EM_PER_PX).toFixed(3) + "em";
      return TITLE_GLYPHS.map(([key, src]) => {
        const m = alphabetMetrics[key];
        return {
          src,
          alt: key[0],
          style: {
            width: em(m.w),
            height: em(m.h),
            verticalAlign: "-" + em(m.h - m.baseline)
          }
        };
      });
    },
    // Golem fork: the script grid's cards — the town's saved script (when
    // owned), the officials in editions.json order, the vault shelf, and the
    // custom/vault door last. Vault blurbs fill in lazily from scriptMeta.
    scriptCards() {
      const cards = [];
      if (this.attachedScriptId) {
        cards.push({
          id: "__attached",
          name: "This town's saved script",
          icon: edCustom,
          blurb: this.vaultBlurb(this.attachedScriptId),
          source: "This town"
        });
      }
      this.editionList.forEach(e => {
        cards.push({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL"
        });
      });
      this.vaultShelf
        .filter(s => s.id !== this.attachedScriptId)
        .forEach(s => {
          const meta = this.scriptMeta[s.id];
          cards.push({
            id: s.id,
            name: s.name || s.id,
            icon: edCustom,
            blurb: this.vaultBlurb(s.id),
            source: meta && meta.author ? `by ${meta.author}` : "Vault"
          });
        });
      cards.push({
        id: "__custom",
        name: "Custom / vault…",
        icon: edCustom,
        blurb: "Build your own script, or load any script by link.",
        source: "Vault"
      });
      return cards;
    },
    // What the CLOSED trigger wears: the picked card's icon + name.
    pickedCard() {
      return (
        this.scriptCards.find(c => c.id === this.scriptId) || {
          id: this.scriptId,
          name: this.scriptId,
          icon: edCustom
        }
      );
    },
    // The card currently under the hover/focus tooltip, if any.
    tipCard() {
      return this.scriptCards.find(c => c.id === this.tipCardId) || null;
    },
    townIdClean() {
      return normalizeTownId(this.townId);
    },
    // FT-847: does THIS browser hold the picked town's edit key?
    ownsPicked() {
      return !!(this.townIdClean && editKeyFor(this.townIdClean));
    },
    // The script an OWNED picked town carries in its server meta (if any).
    attachedScriptId() {
      const id = this.townIdClean;
      if (!id || !editKeyFor(id)) return null;
      const m = this.meta[id];
      return (m && m.scriptId) || null;
    },
    shareLink() {
      // Clean path link — no hash. window.location.origin ignores whatever
      // path/hash happens to be open right now (e.g. a joined /<town>).
      return window.location.origin + "/" + this.townIdClean;
    },
    canJoin() {
      return !!(this.joinIdClean && this.joinName.trim());
    },
    joinIdClean() {
      let raw = this.joinId.trim();
      if (raw.match(/^https?:\/\//i)) {
        const hashAt = raw.indexOf("#");
        raw =
          hashAt >= 0
            ? raw.slice(hashAt + 1)
            : raw.replace(/^https?:\/\/[^/]+\/?/i, "").split(/[/?]/)[0];
      }
      return normalizeTownId(raw);
    },
    // Shelf entries offered under the Town field: newest first (either
    // role). Filtered to the typed prefix only once the user has actually
    // EDITED the field (townEdited) — a prefilled/minted value that happens
    // to share no prefix with the shelf must never filter history to
    // nothing. listTowns() reads localStorage directly (untracked), so
    // shelfVersion is the explicit reactive dependency forgetRecent() bumps
    // on mutation.
    recentTowns() {
      this.shelfVersion; // eslint-disable-line no-unused-expressions
      const all = listTowns();
      if (!this.townEdited) return all.slice(0, 8);
      const typed = (this.townId || "").toLocaleLowerCase();
      const list = typed ? all.filter(t => t.id.startsWith(typed)) : all;
      return list.slice(0, 8);
    }
  },
  data() {
    // Golem fork: the title lettering choice (0 blood PNGs | 1 gold | 2 red),
    // remembered across reloads. Anything unparseable falls back to 0.
    const savedTitleStyle = parseInt(
      localStorage.getItem("golem.titleStyle"),
      10
    );
    return {
      language: window.navigator.userLanguage || window.navigator.language,
      blood: BLOOD,
      titleStyle:
        savedTitleStyle >= 0 && savedTitleStyle <= 2 ? savedTitleStyle : 0,
      // Golem fork: the entry panels.
      mode: null, // null = doors | "host" | "join"
      townId: "",
      townDropdownOpen: false,
      townEdited: false, // true once the user has actually typed — gates the prefix filter
      forgetConfirm: null, // id awaiting a second click to confirm forgetting
      shelfVersion: 0, // bumped on shelf mutation to invalidate recentTowns
      scriptId: "",
      joinId: "",
      joinName: "",
      hostTowns: [],
      joinTowns: [],
      statuses: {},
      copied: false,
      statusTimer: null,
      // FT-847: owned towns.
      meta: {}, // id → server public meta {name, scriptId, ...}
      scriptTouched: false, // the user chose a script by hand this visit
      // Golem fork: the script grid.
      scriptGridOpen: false,
      vaultShelf: [], // recents-shelf entries snapshotted on openHost
      scriptMeta: {}, // script id → {count, author} (lazy, best-effort)
      // Icon-forward cards: blurb + source moved off the face into a hover/
      // keyboard-focus tooltip. tipCardId is null when nothing is showing;
      // tipStyle is computed against the hovered/focused card's rect so the
      // tooltip never clips the grid's edges.
      tipCardId: null,
      tipStyle: { top: "-9999px", left: "-9999px" }
    };
  },
  watch: {
    // Live-normalize the host field: junk chars become dashes, capped at 24 —
    // the id the socket joins IS the id on the screen. (Edge dashes survive
    // while typing; townIdClean applies the full trim.)
    townId(value) {
      const live = String(value || "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 24);
      if (live !== value) this.townId = live;
    },
    townIdClean() {
      this.syncAttached();
    },
    // Leaving the panel (Back, or a join) drops the grid AND its document
    // listeners — the v-else-if unmounts the DOM but not the listeners.
    mode() {
      this.closeScriptGrid();
    }
  },
  beforeDestroy() {
    clearInterval(this.statusTimer);
    this.closeScriptGrid();
  },
  methods: {
    async mintChecked() {
      const placeholder = this.townId;
      const checked = await mintAvailableTownId();
      if (this.townId === placeholder) this.townId = checked;
    },
    /** Default the Town field: the shelf's newest entry (either role), or a
     *  freshly minted name when the shelf is empty (prior behavior). Always
     *  a PROGRAMMATIC set, so townEdited resets — the dropdown shows the
     *  full shelf until the user actually types. */
    prefillTownId() {
      this.townEdited = false;
      const shelf = listTowns();
      if (shelf.length) {
        this.townId = shelf[0].id;
        return;
      }
      this.townId = mintTownId(); // synchronous placeholder while checking
      this.mintChecked();
    },
    /** Real keystrokes only (v-model's programmatic sets don't fire native
     *  input events) — from here on the dropdown filters by what's typed. */
    onTownInput() {
      this.townEdited = true;
    },
    onTownFocus() {
      this.townDropdownOpen = true;
    },
    onTownBlur() {
      // delay so a click on a dropdown row registers before it disappears
      setTimeout(() => {
        this.townDropdownOpen = false;
      }, 150);
    },
    /** The caret: click (or refocus) opens the full list, same as focus. */
    openTownDropdown() {
      this.townDropdownOpen = true;
      if (this.$refs.townInput) this.$refs.townInput.focus();
    },
    pickRecent(t) {
      this.townId = t.id;
      this.townEdited = false;
      this.townDropdownOpen = false;
      this.forgetConfirm = null;
    },
    /** The dropdown's trailing row: mint a fresh name, same minter reroll
     *  uses, straight into the field. */
    async pickNewTown() {
      this.townEdited = false;
      this.townDropdownOpen = false;
      await this.reroll();
    },
    /** Forget a shelf entry (client-side only). An owned entry needs a
     *  second click — forgetting it discards the edit key for good. */
    forgetRecent(t) {
      if (t.editKey && this.forgetConfirm !== t.id) {
        this.forgetConfirm = t.id;
        return;
      }
      this.forgetConfirm = null;
      removeTown(t.id);
      this.hostTowns = this.sortOwnedFirst(listTowns("host"));
      this.joinTowns = listTowns("player");
      this.shelfVersion++;
    },
    openHost() {
      this.mode = "host";
      this.hostTowns = this.sortOwnedFirst(listTowns("host"));
      this.scriptId = editionJSON.some(e => e.id === this.edition.id)
        ? this.edition.id
        : "__custom";
      this.scriptTouched = false;
      this.vaultShelf = getRecents().slice(0, 8);
      this.watchTowns();
      this.refreshMeta();
      this.prefillTownId();
    },
    openJoin() {
      this.mode = "join";
      this.joinTowns = listTowns("player");
      this.joinName = localStorage.getItem("golem.playerName") || "";
      this.watchTowns();
      this.refreshMeta();
    },
    /** FT-847: owned towns lead the shelf; recency holds within each group. */
    sortOwnedFirst(towns) {
      return towns
        .slice()
        .sort((a, b) => (b.editKey ? 1 : 0) - (a.editKey ? 1 : 0));
    },
    /** Best-effort batch meta: display names + attached scripts. */
    refreshMeta() {
      const ids = [
        ...new Set([...listTowns("host"), ...listTowns("player")].map(t => t.id))
      ];
      townMeta(ids).then(meta => {
        this.meta = meta;
        // re-list: townMeta cached fresh display names onto the shelf
        if (this.mode === "host")
          this.hostTowns = this.sortOwnedFirst(listTowns("host"));
        if (this.mode === "join") this.joinTowns = listTowns("player");
        this.syncAttached();
      });
    },
    /** Keep the script select honest about an owned town's saved script. */
    syncAttached() {
      if (this.attachedScriptId) {
        if (!this.scriptTouched) this.scriptId = "__attached";
      } else if (this.scriptId === "__attached") {
        this.scriptId = editionJSON.some(e => e.id === this.edition.id)
          ? this.edition.id
          : "__custom";
      }
    },
    // ── Golem fork: the script grid ──────────────────────────────────────
    toggleScriptGrid() {
      this.scriptGridOpen ? this.closeScriptGrid() : this.openScriptGrid();
    },
    openScriptGrid() {
      this.scriptGridOpen = true;
      document.addEventListener("mousedown", this.onScriptDocDown);
      document.addEventListener("keydown", this.onScriptDocKey);
      // Best-effort vault metadata (role count + author) — blank until known.
      // peekScript never touches the recents shelf.
      const wanted = [
        ...this.vaultShelf.map(s => s.id),
        this.attachedScriptId
      ].filter(id => id && !this.scriptMeta[id]);
      wanted.forEach(id => {
        peekScript(id)
          .then(script => {
            const roles = Array.isArray(script.roles) ? script.roles : [];
            const meta = roles.find(r => r && r.id === "_meta") || {};
            this.$set(this.scriptMeta, id, {
              count: roles.filter(r => r && r.id !== "_meta").length,
              author: script.author || meta.author || ""
            });
          })
          .catch(() => {});
      });
    },
    closeScriptGrid() {
      this.scriptGridOpen = false;
      this.hideTip();
      document.removeEventListener("mousedown", this.onScriptDocDown);
      document.removeEventListener("keydown", this.onScriptDocKey);
    },
    onScriptDocDown(e) {
      const pick = this.$refs.scriptPick;
      if (pick && !pick.contains(e.target)) this.closeScriptGrid();
    },
    onScriptDocKey(e) {
      if (e.key === "Escape") this.closeScriptGrid();
    },
    pickScript(card) {
      this.scriptId = card.id;
      this.scriptTouched = true;
      this.closeScriptGrid();
    },
    /** Card face is icon-forward; blurb + source ride this tooltip instead.
     *  Skips hover on touch (no fine pointer) — tap still selects via click.
     *  Keyboard focus always shows it, touch or not. */
    showTip(e, card) {
      const viaHover = e.type === "mouseenter";
      if (viaHover && !window.matchMedia("(hover: hover)").matches) return;
      const rect = e.currentTarget.getBoundingClientRect();
      this.tipCardId = card.id;
      this.$nextTick(() => this.positionTip(rect));
    },
    hideTip() {
      this.tipCardId = null;
    },
    /** Centers the tooltip over the card, then clamps it inside the
     *  viewport so it never clips at the grid's edges — flips below the
     *  card when there isn't room above. */
    positionTip(rect) {
      const tip = this.$refs.cardTip;
      if (!tip) return;
      const margin = 8;
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let left = rect.left + rect.width / 2 - tw / 2;
      left = Math.min(Math.max(left, margin), window.innerWidth - tw - margin);
      let top = rect.top - th - margin;
      if (top < margin) top = rect.bottom + margin;
      this.tipStyle = { top: `${top}px`, left: `${left}px` };
    },
    /** "N roles · by <author>" once the lazy peek lands; blank until then. */
    vaultBlurb(id) {
      const m = this.scriptMeta[id];
      if (!m) return "";
      const parts = [`${m.count} role${m.count === 1 ? "" : "s"}`];
      if (m.author) parts.push(`by ${m.author}`);
      return parts.join(" · ");
    },
    /** Display name for a shelf row: cached/server name, else the id. */
    townLabel(t) {
      const m = this.meta[t.id];
      return (m && m.name) || t.name || t.id;
    },
    /** Poll the relay for awake/quiet while a panel is open. */
    watchTowns() {
      clearInterval(this.statusTimer);
      const refresh = () => {
        if (!this.mode) return clearInterval(this.statusTimer);
        const ids = [
          ...new Set([...this.hostTowns, ...this.joinTowns].map(t => t.id))
        ];
        townStatuses(ids).then(statuses => {
          this.statuses = statuses;
        });
      };
      refresh();
      this.statusTimer = setInterval(refresh, 10000);
    },
    dotClass(id) {
      const s = this.statuses[id];
      if (!s) return "unknown";
      if (s.host) return "awake";
      return s.players ? "stirring" : "quiet";
    },
    statusLabel(id) {
      const s = this.statuses[id];
      if (!s) return "";
      if (s.host)
        return `awake · ${s.players} in town`;
      return s.players ? `${s.players} waiting` : "quiet";
    },
    async reroll() {
      this.townId = await mintAvailableTownId();
      this.townEdited = false;
    },
    copyShare() {
      try {
        navigator.clipboard.writeText(this.shareLink);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 1500);
      } catch (e) {
        // clipboard is a bonus, never a blocker
      }
    },
    async confirmHost() {
      const id = this.townIdClean;
      if (!id) return;
      // FT-847: claiming is the default now — best-effort, never blocks
      // hosting. A "taken" name isn't an error: friend groups hosting each
      // other's towns is expected, so it just hosts as a guest of that town.
      if (!editKeyFor(id)) {
        try {
          await claimTown(id, id);
        } catch (e) {
          // unreachable / server error → host without keeping, quietly
        }
      }
      if (
        this.scriptId !== "__custom" &&
        this.scriptId !== "__attached" &&
        this.scriptId !== this.edition.id
      ) {
        const edition = editionJSON.find(e => e.id === this.scriptId);
        if (edition) this.$store.commit("setEdition", edition);
      }
      this.$store.commit("session/clearVoteHistory");
      this.$store.commit("session/setSpectator", false);
      this.$store.commit("session/setSessionId", id);
      this.copyShare();
      // "Custom / vault…" hands off to the script picker once the town is up.
      if (this.scriptId === "__custom") {
        this.$store.commit("toggleModal", "edition");
      } else if (this.scriptId === "__attached" && this.attachedScriptId) {
        // FT-847: an owned town carries its script — load it through the same
        // vault path as a ?script= link (no re-attach round trip).
        const editionModal = this.$parent.$refs.edition;
        if (editionModal) editionModal.loadFromVault(this.attachedScriptId, false);
      } else if (!editionJSON.some(e => e.id === this.scriptId)) {
        // Golem fork: a vault script picked from the grid — the same load
        // path as a ?script= link; attach=true saves it onto an owned town
        // (best-effort inside, spectators/guests skipped).
        const editionModal = this.$parent.$refs.edition;
        if (editionModal) editionModal.loadFromVault(this.scriptId, true);
      }
    },
    confirmJoin() {
      const id = this.joinIdClean;
      const name = this.joinName.trim();
      if (!id || !name) return;
      localStorage.setItem("golem.playerName", name);
      this.$store.commit("session/clearVoteHistory");
      this.$store.commit("session/setSpectator", true);
      this.$store.commit("toggleGrimoire", false);
      this.$store.commit("session/setSessionId", id);
    },
    /** Golem fork: click the title word → next lettering (0 → 1 → 2 → 0). */
    cycleTitleStyle() {
      this.titleStyle = (this.titleStyle + 1) % 3;
      localStorage.setItem("golem.titleStyle", String(this.titleStyle));
    },
    press(key) {
      // The hotkey listener lives on the App root element (@keyup), so a
      // document-dispatched synthetic event never reaches it. Intro is App's
      // direct child — call the one handler with the same payload the key
      // would carry: still exactly one flow per verb.
      this.$parent.keyup({ key, ctrlKey: false, metaKey: false });
    }
  }
};
</script>

<style scoped lang="scss">
// Bloody (J. Fordyce, 1994, freeware) — the user's pick for the initials;
// Rubik Wet Paint (OFL) stays as the licensed fallback.
@font-face {
  font-family: Bloody;
  src: url("../assets/fonts/bloody.ttf");
  font-display: swap;
}
@font-face {
  font-family: WetPaint;
  src: url("../assets/fonts/rubikwetpaint.ttf");
  font-display: swap;
}
// Pirata One (SIL OFL 1.1 — see pirataone-OFL.txt beside it) — the closest
// freely-bundlable letterform to the official wordmark's blackletter; used by
// the title's gold/red lettering states.
@font-face {
  font-family: PirataOne;
  src: url("../assets/fonts/pirataone.ttf");
  font-display: swap;
}

// Intro
// Golem fork: NO outer box — the doors and panels carry their own chrome,
// and the stack centers over the clock face (the dial sits at the cover-fit
// background's center, which is the viewport center #app already flexes to).
.intro {
  text-align: center;
  width: min(92vw, 460px);
  font-size: 120%;
  position: absolute;
  z-index: 3;
  display: flex;
  justify-content: center;
  a {
    color: white;
  }

  > div {
    width: 100%;
  }

  // Golem fork: the page title — BLOOD (blood alphabet) / "on the" — pinned
  // to the sky band above the face; the dial's letters finish the name.
  // Fixed, so it holds the top-center regardless of the stack's height.
  .title {
    position: fixed;
    // clears the fixed top-right toolbar band (~44px) at short heights
    top: max(48px, 5vh);
    left: 50%;
    // user-calibrated 2026-08-17: the tower's face sits right of true
    // center; the title follows it.
    transform: translateX(calc(-50% + 20px));
    text-align: center;
    pointer-events: none;
    z-index: 3;

    .blood-word {
      font-size: min(10vh, 9vw, 76px);
      line-height: 1;
      white-space: nowrap;
      // Golem fork: the lettering cycles on click (PNGs / gold / red) —
      // fixed row height so "On the" never shifts between states, and the
      // word alone takes the pointer (the .title wrapper stays inert).
      position: relative;
      height: 1.3em;
      pointer-events: auto;
      cursor: pointer;

      img {
        display: inline-block;
        margin: 0 0.025em;
        filter: drop-shadow(0 0.05em 0.08em rgba(0, 0, 0, 0.65));
      }

      // The gold/red official-style lettering (Pirata One). Gradient fill
      // via background-clip; the dark edge + drop are filter shadows so the
      // gradient stays clean. Pinned to the PNG row's baseline band.
      .lettered {
        position: absolute;
        left: 50%;
        bottom: 0.08em;
        transform: translateX(-50%);
        font-family: PirataOne, serif;
        font-size: 1.55em;
        line-height: 1;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        filter: drop-shadow(1px 1px 0 #1a1208) drop-shadow(-1px -1px 0 #1a1208)
          drop-shadow(0 0.04em 0.07em rgba(0, 0, 0, 0.7));

        &.gold {
          background-image: linear-gradient(
            180deg,
            #f3dfa0 0%,
            #e8c56a 22%,
            #c99b3f 55%,
            #8a6420 85%,
            #6f4e18 100%
          );
        }
        &.red {
          background-image: linear-gradient(
            180deg,
            #e0555e 0%,
            #c0121c 38%,
            #8d0d14 75%,
            #6d0a10 100%
          );
        }
      }
    }
    .on-the {
      margin-top: 1vh;
      font-family: "Roboto Condensed", sans-serif;
      font-size: min(3vh, 21px);
      letter-spacing: 0.5em;
      text-indent: 0.5em; // recenter the letter-spaced run
      text-transform: uppercase;
      color: #e8e2d8;
      opacity: 0.9;
      text-shadow: 0 1px 3px black, 0 0 10px rgba(0, 0, 0, 0.9);
    }
  }

  // Golem fork: the three doors, in the editions' display face.
  .hint {
    margin: 6px 0 0;
    // legible over the raw art now that the outer box is gone
    text-shadow: 0 1px 3px black, 0 0 8px black;
    b { color: #c00; text-shadow: 0 0 4px black; }
  }

  ul.doors {
    list-style-type: none;
    display: flex;
    // Golem fork: a VERTICAL stack centered over the clock face — each door
    // keeps its own box; nothing wraps them.
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    // FT-852: everything in face pixels (--fpx, see App.vue) so the stack
    // scales with the clock face; the translate is the dial-center offset
    // (+15,-20.5 image px), which puts Join's center on the hub exactly.
    gap: calc(5.5 * var(--fpx));
    padding: calc(14 * var(--fpx)) 0;
    margin: 0 auto;
    width: calc(164 * var(--fpx));
    font-size: calc(53 * var(--fpx));
    transform: translate(calc(15 * var(--fpx)), calc(-20.5 * var(--fpx)));

    li {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      font-size: 100%;
      cursor: pointer;
      text-align: center;
      padding: 0.26em 0.18em;
      background: rgba(0, 0, 0, 0.9);
      border: 3px solid black;
      border-radius: 10px;
      box-shadow: 0 0 10px black;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
        1px 1px 0 #000;
      transition: color 250ms;

      &:hover {
        color: red;
      }

      // user-calibrated 2026-08-17: Join (the middle door) reads largest;
      // Host and Create sit 25% smaller.
      &:nth-child(1),
      &:nth-child(3) {
        font-size: 75%;
      }

      .key {
        font-family: Bloody, WetPaint, sans-serif;
        font-size: 105%;
        margin-right: 2px;
        color: #c00;
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
          1px 1px 0 #000;
        display: inline-block;

        // Golem fork (FT-846): the baked blood drop-cap; drips hang over the
        // door edge, above its border. Static per-letter sizing (from the
        // alphabet's trimmed metrics, baked here as plain CSS — FT-852).
        img {
          position: relative;
          z-index: 2;
        }
        .blood-cap-a { width: 0.805em; height: 0.927em; vertical-align: -0.124em; }
        .blood-cap-h { width: 0.712em; height: 0.927em; vertical-align: -0.127em; }
        .blood-cap-j { width: 0.681em; height: 0.936em; vertical-align: -0.136em; }
        .blood-cap-c { width: 0.687em; height: 0.942em; vertical-align: -0.139em; }
      }
    }
  }

  // Golem fork: the Host / Join entry panels (replacing browser dialogs).
  // Each panel carries its OWN box now (the intro's outer box is gone) and
  // centers over the dial with the rest of the stack.
  .panel {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.6);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    text-align: left;

    > .hint {
      text-align: center;
      margin-bottom: 8px;
    }

    ul.towns {
      list-style: none;
      margin: 0 0 10px;
      padding: 0;
      max-height: 30vh;
      overflow-y: auto;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid transparent;

        &:hover {
          color: red;
        }
        &.picked {
          border-color: #400;
          background: rgba(0, 0, 0, 0.5);
        }
        .name {
          flex-grow: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          small.tid {
            opacity: 0.5;
            margin-left: 4px;
          }
        }
        small {
          opacity: 0.7;
          white-space: nowrap;
        }
        small.yours {
          opacity: 1;
          color: #c66;
          border: 1px solid #400;
          border-radius: 4px;
          padding: 0 5px;
          font-size: 65%;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dot {
          flex-shrink: 0;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #333;
          box-shadow: 0 0 3px black;

          &.awake {
            background: #c00;
            box-shadow: 0 0 6px #c00;
          }
          &.stirring {
            background: #a60;
            box-shadow: 0 0 5px #a60;
          }
        }
      }
    }

    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;

      label {
        width: 55px;
        flex-shrink: 0;
        opacity: 0.8;
      }
      input,
      select {
        flex-grow: 1;
        min-width: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid black;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 90%;
        outline: none;

        &:focus {
          border-color: #400;
        }
      }
      select option {
        background: black;
      }

      // Golem fork: the script grid picker (the <select>'s replacement).
      .script-pick {
        position: relative;
        flex-grow: 1;
        min-width: 0;

        .trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid black;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 90%;
          cursor: pointer;

          .icon {
            width: 30px;
            height: 30px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .name {
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-align: left;
          }
          .caret {
            opacity: 0.7;
            font-size: 75%;
            transition: transform 150ms;
          }
          &:hover,
          &.open {
            border-color: #400;
          }
          &.open .caret {
            transform: rotate(180deg);
          }
        }

        // Icon-forward grid: the icon dominates, the name sits under it,
        // nothing else on the card face — the blurb + source ride the
        // separate .card-tip tooltip below. 3 columns reads better than 2
        // once the card is just an icon + a name (checked at the 420px
        // panel width the .grid overflows from).
        .grid {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          width: min(560px, 94vw);
          max-height: 48vh;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 8px;
          background: rgba(10, 4, 4, 0.95);
          border: 2px solid #400;
          border-radius: 8px;
          box-shadow: 0 0 12px black;
          z-index: 20;

          .card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 6px;
            padding: 10px 6px;
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            text-align: center;
            outline: none;

            .icon {
              width: 56px;
              height: 56px;
              object-fit: contain;
            }
            .cname {
              font-size: 80%;
              font-weight: bold;
              line-height: 1.25;
            }

            &:hover,
            &:focus {
              border-color: #630;
              background: rgba(255, 0, 0, 0.08);
            }
            &.picked {
              border-color: #400;
              background: rgba(0, 0, 0, 0.6);
            }
          }
        }

        // The dark-idiom hover/focus tooltip that carries the blurb + source
        // off the card face. Fixed-positioned and sized/placed in JS
        // (positionTip) so it's never clipped by the grid's own scroll
        // container, and flips above/below the card to stay on-screen.
        .card-tip {
          position: fixed;
          max-width: 220px;
          padding: 8px 10px;
          background: rgba(10, 4, 4, 0.97);
          border: 2px solid #400;
          border-radius: 8px;
          box-shadow: 0 0 12px black;
          text-align: left;
          z-index: 30;
          pointer-events: none;

          .tip-blurb {
            margin: 0;
            font-size: 80%;
            line-height: 1.35;
            opacity: 0.9;
          }
          .tip-source {
            margin: 4px 0 0;
            font-size: 65%;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.6;
          }
        }
      }
      .tool {
        cursor: pointer;
        &:hover {
          color: red;
        }
      }
      .town-input {
        position: relative;
        flex-grow: 1;
        min-width: 0;

        input {
          width: 100%;
          padding-right: 28px;
        }

        .caret {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0.7;
          font-size: 75%;

          &:hover,
          &.open {
            opacity: 1;
            color: red;
          }
        }

        ul.recents {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin: 4px 0 0;
          padding: 4px;
          list-style: none;
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #400;
          border-radius: 6px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;

          li {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 8px;
            border-radius: 4px;
            font-size: 90%;

            &:hover {
              background: rgba(255, 0, 0, 0.15);
            }
            .name {
              flex-grow: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              cursor: pointer;

              small.tid {
                opacity: 0.5;
                margin-left: 4px;
              }
              &:hover {
                color: red;
              }
            }
            small.yours {
              flex-shrink: 0;
              opacity: 1;
              color: #c66;
              border: 1px solid #400;
              border-radius: 4px;
              padding: 0 5px;
              font-size: 65%;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .forget {
              flex-shrink: 0;
              cursor: pointer;
              opacity: 0.6;
              padding: 0 3px;
              font-size: 85%;

              &:hover {
                opacity: 1;
                color: red;
              }
              &.sure {
                opacity: 1;
                color: #e88;
                font-size: 70%;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
            }
          }

          li.new-town {
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            margin-top: 2px;
            padding-top: 7px;

            .name {
              cursor: pointer;
              opacity: 0.8;
              &:hover {
                opacity: 1;
                color: red;
              }
            }
          }
        }
      }
      .share {
        flex-grow: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 80%;
        opacity: 0.9;

        .url {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        &:hover {
          color: red;
        }
      }
    }

    // FT-847: the owned-town note (hosting claims by default now).
    .field.keep {
      .owned-note {
        font-size: 80%;
        color: #c66;
      }
    }

    .acts {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;

      .back {
        cursor: pointer;
        opacity: 0.7;
        &:hover {
          color: red;
          opacity: 1;
        }
      }
      button.confirm {
        font-family: PiratesBay, sans-serif;
        letter-spacing: 1px;
        font-size: 110%;
        color: white;
        cursor: pointer;
        padding: 8px 20px;
        background: rgba(0, 0, 0, 0.7);
        border: 3px solid #400;
        border-radius: 10px;
        box-shadow: 0 0 10px black;

        &:hover {
          color: red;
        }
        &.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: black;
        }
      }
    }
  }

  a.redirect {
    display: block;
    text-decoration: none;
    position: absolute;
    top: 100%;
    margin-top: 2vh;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    border-radius: 10px;

    &:hover {
      color: red;
    }
    img {
      width: 120px;
      display: block;
      margin: auto;
      margin-bottom: 1vh;
    }
  }

  img.logo {
    position: absolute;
    bottom: 100%;
    width: 25vh;
    margin-bottom: 2vh;
    max-width: 192px;
    border-radius: 50%;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
  }
  .footer {
    font-size: 60%;
    opacity: 0.75;
  }
}

</style>
