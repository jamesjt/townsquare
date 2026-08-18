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
              ><img :src="capSrc('A')" :class="capClass('a')" :style="capStyle('A')" alt="A"
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
        <div
          class="title"
          aria-label="Blood on the Clocktower"
          :style="titleStyle"
        >
          <!-- Golem fork: clicking the word cycles its lettering — 0 the
               blood-alphabet PNGs, 1 the official-style gold logo art
               (extracted from the source header, FT-853). Persisted so the
               choice survives reloads; fixed row height so nothing below
               shifts. -->
          <div class="blood-word">
            <template v-if="fontState.key !== 'logo'">
              <img
                v-for="(g, i) in titleGlyphs"
                :key="fontState.key + i"
                :src="g.src"
                :style="g.style"
                :alt="g.alt"
              />
            </template>
            <img v-else class="blood-logo" :src="bloodLogo" alt="Blood" />
          </div>
          <!-- "on the": the gold script art, or any family's lowercase
               (the font lab picks) -->
        </div>
        <!-- "on the" anchors on its OWN image point — the rosette ring's
             centre (822, 147), which sits left of the title axis -->
        <div class="on-the" :style="ontheStyle">
          <img
            v-if="fontState.ontheKey === 'goldart'"
            class="onthe-logo"
            :src="ontheLogo"
            alt="on the"
          />
          <span v-else class="onthe-glyphs" aria-label="on the">
            <template v-for="(g, i) in ontheGlyphs">
              <span v-if="g.space" :key="'sp' + i" class="sp"></span>
              <img
                v-else
                :key="fontState.ontheKey + i"
                :src="g.src"
                :style="g.style"
                :alt="g.alt"
              />
            </template>
          </span>
        </div>
        <ul class="doors" v-if="!mode">
          <li @click="openHost">
            <span class="key"
              ><img :src="capSrc('H')" :class="capClass('h')" :style="capStyle('H')" alt="H"
            /></span>ost
          </li>
          <li @click="openJoin">
            <span class="key"
              ><img :src="capSrc('J')" :class="capClass('j')" :style="capStyle('J')" alt="J"
            /></span>oin
          </li>
          <li @click="openCreate">
            <span class="key"
              ><img :src="capSrc('A')" :class="capClass('a')" :style="capStyle('A')" alt="A"
            /></span>lmanac
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
            <label title="Town name"><font-awesome-icon icon="home" /></label>
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
          <!-- Golem fork (FT-854): THE shared ScriptPicker — the identical
               component the Almanac workbench renders. Change it there,
               change it here. -->
          <div class="field">
            <label title="Script"><font-awesome-icon icon="scroll" /></label>
            <ScriptPicker
              :cards="scriptCards"
              :picked-id="scriptId"
              @pick="pickScript"
              @open="peekVaultMeta"
            />
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
            <label title="Invite link"><font-awesome-icon icon="link" /></label>
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
            <span class="back" title="Back" @click="mode = null"
              ><font-awesome-icon icon="arrow-left"
            /></span>
            <!-- Golem fork (FT-854): the primary action wears WORDS in the
                 door idiom — blood-O drop cap + label. The blood letter is
                 the hotkey promise: O opens the town while this panel is up. -->
            <button
              class="confirm open-town"
              :class="{ disabled: !townIdClean }"
              title="Open the town (O)"
              @click="confirmHost"
            >
              <span class="key"
                ><img :src="capSrc('O')" :class="capClass('o')" :style="capStyle('O', 1)" alt="O"
              /></span>pen the town
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
            <label title="Town name"><font-awesome-icon icon="home" /></label>
            <input
              v-model="joinId"
              spellcheck="false"
              placeholder="paste a link or a town name"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="field">
            <label title="Your name"><font-awesome-icon icon="user" /></label>
            <input
              v-model="joinName"
              spellcheck="false"
              placeholder="what the town calls you"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="acts">
            <span class="back" title="Back" @click="mode = null"
              ><font-awesome-icon icon="arrow-left"
            /></span>
            <button
              class="confirm"
              :class="{ disabled: !canJoin }"
              title="Enter the town"
              @click="confirmJoin"
            >
              <font-awesome-icon icon="sign-in-alt" />
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
// (title letters now come from titleFonts.js — the font-set registry)
// Golem fork (FT-853): the title's alternate lettering — official-style gold
// logo art extracted from the source header (Blood + the small "on the"
// script), keyed to transparent PNGs.
import bloodLogo from "../assets/title/blood-logo.png";
import ontheLogo from "../assets/title/onthe-logo.png";
// FT-854: the Open-the-town button's blood O (alphabet archive; ems baked
// from its metrics at the title conversion — 341x410, baseline 352, /370).
import bloodO from "../assets/blood/alphabet/O.png";
// Golem fork (FT-854): the picker + its art moved to shared homes — the host
// panel and the Almanac workbench render the SAME component and imagery.
import ScriptPicker from "./ScriptPicker";
import { EDITION_ICONS, edCustom, OFFICIAL_BLURBS } from "../golem/editionArt";
import { getRecents, peekScript } from "../golem/scripts";
// the app-wide PNG-font choices (the Aa font lab in App is the control)
import {
  fontState,
  glyph,
  glyphStyle,
  glyphFrom,
  glyphStyleFrom,
  resolvedCapKey,
  CAP_SHRINK
} from "../golem/titleFonts";

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
// its own scale ({w, h, baseline} image px); titleFonts.js now owns the
// registry and normalizes every family by its B's cap height.

export default {
  components: { ScriptPicker },
  computed: {
    ...mapState(["session", "edition"]),
    editionList() {
      return editionJSON;
    },
    /** "on the" in the chosen family's lowercase (goldart mode bypasses). */
    /** Title GLUED to the art: positioned + sized in image coordinates
     *  (tower axis x 837; the dark band above the arch tops at y 60; the
     *  lettering is 88 image-px tall), so no window size moves it. */
    titleStyle() {
      const { x, y, s } = this.bgA;
      return {
        left: x + 837 * s + "px",
        top: y + 86 * s + "px",
        fontSize: 88 * s + "px"
      };
    },
    /** "on the" — user-calibrated 2026-08-18: two text-heights below the
     *  ring centre (the ring seat hid it behind BLOOD's descenders). */
    ontheStyle() {
      const { x, y, s } = this.bgA;
      return {
        left: x + 862 * s + "px",
        top: y + 188 * s + "px",
        fontSize: 26.4 * s + "px"
      };
    },
    ontheGlyphs() {
      const key = this.fontState.ontheKey;
      const out = [];
      ["o_lc", "n_lc", null, "t_lc", "h_lc", "e_lc"].forEach(letter => {
        if (!letter) {
          out.push({ space: true });
          return;
        }
        const g = glyphFrom(key, letter);
        if (g)
          out.push({
            src: g.src,
            alt: letter[0],
            style: glyphStyleFrom(key, letter, 1)
          });
      });
      return out;
    },
    // Golem fork: the title's BLOOD letter row, from the ACTIVE font set
    // (titleFonts.js normalizes sizes across families by the B's cap height).
    titleGlyphs() {
      if (this.fontState.key === "logo") return [];
      return ["B", "L", "O", "O2", "D"].map(letter => {
        const g = glyph(letter) || {};
        return {
          src: g.src,
          alt: letter[0],
          style: glyphStyle(letter, 1)
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
            source: meta && meta.author ? `by ${meta.author}` : "Almanac"
          });
        });
      cards.push({
        id: "__custom",
        name: "Almanac…",
        icon: edCustom,
        blurb: "Build your own script, or load any script by link.",
        source: "Almanac"
      });
      return cards;
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
    return {
      language: window.navigator.userLanguage || window.navigator.language,
      blood: BLOOD,
      bloodLogo,
      ontheLogo,
      bloodO,
      // Golem fork (2026-08-18, user diagnosis): the background renders
      // center/cover, so anything positioned in VIEWPORT pixels drifts
      // against the art as the window changes — the title was a moving
      // target. It now anchors in IMAGE coordinates (the art is 1672x941;
      // the tower band's centre sits at x 837): this holds the cover math.
      bgA: { x: 0, y: 0, s: 1 },
      // Golem fork: the app-wide PNG-font choice (titleFonts.js) — reactive,
      // persisted; the title click is the dev control.
      fontState,
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
      // Golem fork: the script grid (the widget itself is the shared
      // ScriptPicker component; only the card DATA lives here).
      vaultShelf: [], // recents-shelf entries snapshotted on openHost
      scriptMeta: {} // script id → {count, author} (lazy, best-effort)
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
    // (The picker cleans up its own document listeners on unmount now —
    // it is the shared ScriptPicker component.)
    // FT-854: the blood-O on "Open the town" promises a hotkey — live only
    // while the host panel is up, deaf while typing in a field.
    mode(v) {
      if (v === "host") document.addEventListener("keyup", this.onHostPanelKey);
      else document.removeEventListener("keyup", this.onHostPanelKey);
    }
  },
  mounted() {
    this.computeBgAnchor();
    window.addEventListener("resize", this.computeBgAnchor);
  },
  beforeDestroy() {
    clearInterval(this.statusTimer);
    document.removeEventListener("keyup", this.onHostPanelKey);
    window.removeEventListener("resize", this.computeBgAnchor);
  },
  methods: {
    /** The background's cover transform: scale + top-left offset. */
    computeBgAnchor() {
      const W = 1672,
        H = 941;
      const vw = window.innerWidth,
        vh = window.innerHeight;
      const s = Math.max(vw / W, vh / H);
      this.bgA = { x: (vw - W * s) / 2, y: (vh - H * s) / 2, s };
    },
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
    /** FT-854: O = Open the town, while the host panel is up. */
    onHostPanelKey(e) {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target && e.target.isContentEditable) return;
      if ((e.key === "o" || e.key === "O") && this.townIdClean) {
        this.confirmHost();
      }
    },
    // ── Golem fork: the script grid (widget = the shared ScriptPicker) ───
    pickScript(card) {
      this.scriptId = card.id;
      this.scriptTouched = true;
    },
    /** On picker open: best-effort vault metadata (role count + author) —
     *  blank until known. peekScript never touches the recents shelf. */
    peekVaultMeta() {
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
    /** Door/button drop-caps wear their OWN font (the Aa panel is the
     *  control; "follow" mirrors the title). Blood keeps the door-baked art
     *  + its pixel-tuned classes; sheet families render CAP_SHRINK smaller
     *  (the ornate letters overpower the labels at full size). */
    capKeyNow() {
      const k = resolvedCapKey();
      return k === "logo" ? "blood" : k;
    },
    capIsBaked() {
      return this.capKeyNow() === "blood";
    },
    capSrc(letter) {
      if (!this.capIsBaked()) {
        const g = glyphFrom(this.capKeyNow(), letter);
        if (g) return g.src;
      }
      return letter === "O" ? this.bloodO : this.blood[letter].src;
    },
    capClass(letter) {
      return this.capIsBaked()
        ? "blood-cap-" + letter.toLowerCase()
        : "font-cap";
    },
    capStyle(letter, scale = 1.09) {
      if (this.capIsBaked()) return null;
      return glyphStyleFrom(this.capKeyNow(), letter, scale * CAP_SHRINK);
    },
    /** Golem fork: the Create door opens the script editor straight to its
     *  Custom Script surface — same access pattern as the "Custom / vault…"
     *  script-grid card in confirmHost. */
    openCreate() {
      this.$store.commit("toggleModal", "edition");
      const editionModal = this.$parent.$refs.edition;
      if (editionModal) editionModal.isCustom = true;
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

// Intro
// Golem fork: NO outer box — the doors and panels carry their own chrome,
// and the stack centers over the clock face (the dial sits at the cover-fit
// background's center, which is the viewport center #app already flexes to).
.intro {
  // FT-852: the intro is a full-screen COORDINATE LAYER now — same box the
  // background paints in — so everything inside anchors to the art, not to
  // a floating 460px overlay (the old drift) nor the browser viewport
  // (which mobile URL bars shrink — the fixed-position drift).
  text-align: center;
  position: absolute;
  inset: 0;
  font-size: 120%;
  z-index: 3;
  pointer-events: none;
  a {
    color: white;
  }

  > div {
    // full-size passthrough: absolute children (doors/panel/title) resolve
    // their percentages against THIS box when a transform/filter (the blur
    // transition) makes it their containing block — so it must span the
    // layer, not collapse to content height (the off-screen-doors bug).
    width: 100%;
    height: 100%;
  }

  // Golem fork: the page title — BLOOD (blood alphabet) / "on the" — pinned
  // to the sky band above the face; the dial's letters finish the name.
  // Fixed, so it holds the top-center regardless of the stack's height.
  .title {
    position: absolute;
    // left/top/font-size come from titleStyle — IMAGE-space anchoring
    // (the art is center/cover; viewport pixels drift against it)
    transform: translateX(-50%);
    text-align: center;
    pointer-events: none;
    z-index: 3;

    .blood-word {
      font-size: 1em;
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

      // Golem fork (FT-853): state 1's official-style gold logo art — fills
      // the same fixed row height as the PNG-glyph state, so nothing shifts.
      img.blood-logo {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        transform: translateX(-50%);
        height: 100%;
        width: auto;
        margin: 0;
        filter: drop-shadow(0 0.05em 0.08em rgba(0, 0, 0, 0.65));
      }
    }
  }

  // "on the" — its OWN image-space anchor (ontheStyle): centred on the
  // rosette ring, independent of the title block
  .on-the {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 3;
    pointer-events: none;
    white-space: nowrap;
    font-family: "Roboto Condensed", sans-serif;
    letter-spacing: 0.5em;
    text-indent: 0.5em; // recenter the letter-spaced run
    text-transform: uppercase;
    // glyph mode: the family's lowercase letters at this row's size
    .onthe-glyphs {
      display: inline-flex;
      align-items: baseline;
      gap: 0.14em;
      text-indent: 0;
      font-size: 1.4em;
      .sp {
        width: 0.5em;
      }
    }
    color: #e8e2d8;
    opacity: 0.9;
    text-shadow: 0 1px 3px black, 0 0 10px rgba(0, 0, 0, 0.9);

    // Golem fork (FT-853): state 1's onthe-logo image — matched to the
    // text row's own height so the title block doesn't shift.
    img.onthe-logo {
      display: inline-block;
      height: 0.9em;
      width: auto;
      vertical-align: middle;
      filter: drop-shadow(0 1px 3px black)
        drop-shadow(0 0 6px rgba(0, 0, 0, 0.6));
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
    // FT-852: sized in door face-pixels (--dfpx — face-proportional with a
    // phone cap, see App.vue). ANCHORED THE SAME WAY THE DIAL LETTERS ARE:
    // fixed to the app box at the hub point (+15,-20.5 image px) — NOT
    // centered inside .intro, whose 460px overlay box moves with the
    // viewport (the drift that kept eating the calibration). Nudge with
    // --stack-trim, in image pixels, positive = down.
    --stack-trim: 0;
    position: absolute;
    pointer-events: auto;
    left: calc(50% + 15 * var(--fpx));
    // -36.5 = the face's VISUAL center (the hands' boss, image y=434) —
    // measured against the art and confirmed by eye, not by formula alone.
    top: calc(50% + (-36.5 + var(--stack-trim)) * var(--fpx));
    transform: translate(-50%, -50%);
    margin: 0;
    gap: calc(5.5 * var(--dfpx));
    padding: calc(14 * var(--dfpx)) 0;
    width: calc(164 * var(--dfpx));
    font-size: calc(53 * var(--dfpx));

    li {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      font-size: 100%;
      cursor: pointer;
      text-align: center;
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
      // Host and Create sit 25% smaller. Fixed heights (user spec: 70/50)
      // with line-height centering — the words center in their boxes while
      // the blood caps keep their baseline hang over the border.
      box-sizing: border-box;
      white-space: nowrap;
      height: 70px;
      line-height: 64px;
      padding: 0 0.18em;
      &:nth-child(1),
      &:nth-child(3) {
        font-size: 75%;
        height: 50px;
        line-height: 44px;
      }
      // "Almanac" runs longer than the old "Create" — its own step down so
      // the word fits the same door on one line.
      &:nth-child(3) {
        font-size: 60%;
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
    // FT-852: hub-anchored exactly like the doors and the dial letters —
    // one coordinate system for everything sitting on the clock face.
    position: absolute;
    pointer-events: auto;
    left: calc(50% + 15 * var(--fpx));
    top: calc(50% + -36.5 * var(--fpx));
    transform: translate(-50%, -50%);
    width: min(92vw, 420px);
    margin: 0;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.9);
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
        // LOUD, like the picker's picked card (user call 2026-08-17)
        &.picked {
          border-color: #a01414;
          background: rgba(160, 20, 20, 0.18);
          box-shadow: 0 0 10px rgba(210, 40, 40, 0.55),
            inset 0 0 16px rgba(160, 20, 20, 0.3);
          .name {
            text-shadow: 0 0 6px rgba(255, 60, 60, 0.7);
          }
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

      // Golem fork: labels are icon-only now (title attr carries the
      // tooltip) — the column shrinks to the glyph, fields widen to fill it.
      label {
        width: 26px;
        flex-shrink: 0;
        opacity: 0.8;
        text-align: center;
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

      // (script-pick styles live in the shared ScriptPicker component)
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
        font-size: 130%;
        line-height: 1;
        &:hover {
          color: red;
          opacity: 1;
        }
      }
      // Golem fork (FT-854): the primary action wears WORDS in the door
      // idiom — a blood drop-cap + the label, like the intro doors.
      button.confirm {
        font-size: 120%;
        font-family: inherit;
        line-height: 1.1;
        color: white;
        cursor: pointer;
        padding: 8px 22px;
        background: rgba(0, 0, 0, 0.7);
        border: 3px solid #400;
        border-radius: 10px;
        box-shadow: 0 0 10px black;

        .blood-cap-o {
          // 341x410, baseline 352, at the title's /370 conversion
          width: 0.922em;
          height: 1.108em;
          vertical-align: -0.157em;
        }

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
