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
          <!-- the DESIGNED Blood lockup, lifted whole from the user's
               blood-on-the.png (2026-08-18) — flourishes and all -->
          <div class="blood-word">
            <img class="blood-lockup" :src="bloodLockup" alt="Blood" />
          </div>
          <!-- "on the": the gold script art, or any family's lowercase
               (the font lab picks) -->
        </div>
        <!-- "on the" anchors on its OWN image point — the rosette ring's
             centre (822, 147), which sits left of the title axis -->
        <div class="on-the" :style="ontheStyle">
          <!-- the DESIGNED script lifted whole from the 800000 logo lockup
               (user call 2026-08-18) — swash rule + "on the" as one piece -->
          <img class="onthe-lockup" :src="ontheLockup" alt="on the" />
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
              ><img :src="capSrc('S')" :class="capClass('s')" :style="capStyle('S')" alt="S"
            /></span>cripts
          </li>
        </ul>

        <!-- Golem fork: Host and Join swap the doors for in-app panels —
             no browser dialogs anywhere in the entry flow. -->
        <!-- FT-887: both panels are DISCS on the desktop clock face now, the
             same object NightSheet's checklist already is (see the style
             block's disc media query) — a phone/small window still gets the
             original rectangle, untouched. The disc's two caps are furniture
             a circle can actually hold: the back arrow (+ the join panel's
             one-line hint) up top, the primary button at the foot. Everything
             else — the town list and the fields — is `.panel-body`, the
             band inscribed between them. -->
        <div class="panel" v-else-if="mode === 'host'">
          <div class="panel-head">
            <span class="panel-back" title="Back" @click="mode = null"
              ><font-awesome-icon icon="arrow-left"
            /></span>
          </div>
          <div class="panel-body">
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
            <!-- It read "yours — its name travel with it", which is a plural
                 verb left behind when the script half is absent, and it never
                 said what "travel with it" meant anyway (user 2026-08-19:
                 "what is this trying to say?"). Now it says the thing: you own
                 this town, so what you set on it is remembered and comes back
                 the next time anyone opens it. -->
            <small class="owned-note">
              This town is yours — its name{{
                attachedScriptId ? " and script are" : " is"
              }}
              saved and comes back next time.
            </small>
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
          </div>
          <div class="acts">
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
          <div class="panel-head">
            <span class="panel-back" title="Back" @click="mode = null"
              ><font-awesome-icon icon="arrow-left"
            /></span>
            <p class="hint">Enter a Town</p>
          </div>
          <div class="panel-body">
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
          </div>
          <div class="acts">
            <button
              class="confirm"
              :class="{ disabled: !canJoin }"
              title="Enter the town"
              @click="confirmJoin"
            >
              <!-- our own mark (user-supplied art, 2026-08-19): a figure on
                   the road to a town whose tallest building is a clocktower.
                   Baked to the same measured material as the strip's marks —
                   silhouette only, no outline, the fork's stone grain — from a
                   source that was white on TRANSPARENT, so its own alpha is
                   the mask rather than anything the pixels' darkness says. -->
              <img class="enter-mark" :src="uiEnter" alt="" />
            </button>
          </div>
        </div>
      </template>
    </div>
    <!-- the Pandemonium Institute footer credit lives in App.vue — inside the
         intro it was trapped under the town square's layer and took no click -->
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
import ontheLockup from "../assets/title/onthe-lockup.png";
import uiEnter from "../assets/ui-enter.png";
import bloodLockup from "../assets/title/blood-lockup.png";
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
     *  (tower axis x 807 — was x 837 on the original 1672-wide art, shifted
     *  -30 by the recentre trim; the dark band above the arch tops at y 60;
     *  the lettering is 88 image-px tall), so no window size moves it. */
    titleStyle() {
      const { x, y, s } = this.bgA;
      return {
        left: x + 807 * s + "px",
        top: y + 56 * s + "px",
        // the lockup draws at 360 image-px wide (1657x651 native)
        width: 318 * s + "px",
        fontSize: 88 * s + "px"
      };
    },
    /** "on the" — the lockup script, image-anchored (user-calibrated; x 820
     *  was x 850 on the original art, shifted -30 by the recentre trim). */
    ontheStyle() {
      const { x, y, s } = this.bgA;
      return {
        // + the background's baked 7px shift (FT-881). This lockup is anchored
        // to a point in the ART — the rosette ring's centre — so when the paint
        // moved right, it had to move with it or drift off the thing it sits
        // on. Reading the same variable means it tracks any future change to
        // that offset instead of needing to be re-found by hand.
        left: `calc(${x + 820 * s}px + 7px + var(--bg-off-x, 0px))`,
        top: y + 191 * s + "px",
        // the lockup renders at 42 image-px tall (431x98 native)
        height: 36 * s + "px"
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
            source: meta && meta.author ? `by ${meta.author}` : "Scripts"
          });
        });
      cards.push({
        id: "__custom",
        name: "Scripts…",
        icon: edCustom,
        blurb: "Build your own script, or load any script by link.",
        source: "Scripts"
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
      ontheLockup,
      uiEnter,
      bloodLockup,
      bloodO,
      // Golem fork (2026-08-18, user diagnosis): the background renders
      // center/cover, so anything positioned in VIEWPORT pixels drifts
      // against the art as the window changes — the title was a moving
      // target. It now anchors in IMAGE coordinates (the art is trimmed to
      // 1642x900 as of the recentre — FT-anon 2026-08-19 — with the dial's
      // centre now AT the image centre; the tower band's centre sits at
      // x 807, shifted from the original art's x 837 by the same 30px the
      // trim took off the left edge): this holds the cover math.
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
    /** The background's cover transform: scale + top-left offset.
     *  W/H are the recentred art's own dimensions (background-clocktower
     *  -centered.png) — the trim shaved 30px off the left and 41px off the
     *  bottom of the original 1672x941, so it must track this file, not the
     *  untrimmed original still in the tree. */
    computeBgAnchor() {
      const W = 1642,
        H = 900;
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
    /**
     * FT-anon (2026-08-19, user report — "the J is falling out of its box";
     * follow-up — "same with the H"): glyphStyleFrom (titleFonts.js)
     * normalizes every letter against the SET's reference letter (B) — the
     * right job when it's matching cap-height ACROSS families, the wrong
     * one WITHIN a family, where it silently assumes every capital crops to
     * the same baseline B does. Measured against red-97/metrics.json: most
     * capitals sit within a couple of px of B's baseline (173) — H at 174 is
     * close enough to pass unnoticed — but J crops to 182, a real ~5%
     * taller box, not an artifact (its hook genuinely extends the crop).
     * Scaled by B's ratio instead of its own, J rendered taller AND its
     * descender (computed the same wrong-reference way) rode 5% low too —
     * enough, together, to clear the door's fixed height. So this was never
     * one letter's exception: no two capitals in the set actually shared a
     * cap-height, J was just the one far enough off to be seen first.
     *
     * Fixed HERE (Intro.vue's own door/button caps only — glyphStyleFrom
     * and its title-word/"on the" callers are untouched) by normalizing
     * each letter against ITS OWN baseline rather than the set's reference
     * letter. That makes every letter's cap-top-to-baseline distance
     * exactly `scale*CAP_SHRINK` em — identical across H/J/S/A/O — while
     * width and the descender (h − baseline) scale at that same per-letter
     * rate, so aspect ratio and the glyph's actual baked descent are both
     * preserved exactly as trimmed.
     */
    capStyle(letter, scale = 1.09) {
      if (this.capIsBaked()) return null;
      const g = glyphFrom(this.capKeyNow(), letter);
      if (!g || !g.baseline) return null;
      const emPerPx = (scale * CAP_SHRINK) / g.baseline;
      const em = px => (px * emPerPx).toFixed(3) + "em";
      return {
        width: em(g.w),
        height: em(g.h),
        verticalAlign: "-" + em(Math.max(0, g.h - g.baseline))
      };
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
// FT-888: the clock face's disc — geometry, gate and material, shared with the
// night checklist and the build panel.
@import "../faceDisc.scss";

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
      img.blood-lockup {
        width: 100%;
        height: auto;
        display: block;
        filter: drop-shadow(0 0.05em 0.08em rgba(0, 0, 0, 0.65));
      }
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
    img.onthe-lockup {
      height: 100%;
      width: auto;
      display: block;
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
    // fixed to the app box at the hub point — NOT centered inside .intro,
    // whose 460px overlay box moves with the viewport (the drift that kept
    // eating the calibration). Recentred art (FT-anon 2026-08-19): the hub
    // sits at plain 50% left, no offset needed any more. Nudge with
    // --stack-trim, in image pixels, positive = down.
    --stack-trim: 0;
    position: absolute;
    pointer-events: auto;
    left: 50%;
    // -16.0 = the face's VISUAL center (the hands' boss, image y=434) —
    // measured against the art and confirmed by eye, not by formula alone.
    // (Was -36.5 against the original art's centre; the recentre trim
    // moved the reference point, not the boss itself, so the coefficient
    // shifted by +20.5 to match.)
    top: calc(50% + (-16.0 + var(--stack-trim)) * var(--fpx));
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
    // Recentred art (FT-anon 2026-08-19): left needs no offset now; top's
    // -16.0 is the same hands'-boss adjustment the doors block above uses.
    position: absolute;
    pointer-events: auto;
    left: 50%;
    top: calc(50% + -16.0 * var(--fpx));
    transform: translate(-50%, -50%);
    width: min(92vw, 420px);
    margin: 0;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.9);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    text-align: left;

    // FT-887: lives in .panel-head now (both the base rectangle and the
    // disc keep the wrapper — see the template), so this is a descendant
    // selector rather than the old direct child.
    .hint {
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
        // "roll a new town name" drew at 12x17px
        @media (pointer: coarse) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          min-height: 40px;
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
          // the door to the remembered-towns list, 26px wide inside a field
          // that is itself only 29px tall
          @media (pointer: coarse) {
            width: 40px;
          }

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

        // Copying the invite link is how anyone else gets into the town, and
        // the control is one line of 80%-size text — about 14px tall. It keeps
        // its type and gains a row.
        @media (pointer: coarse) {
          min-height: 40px;
        }

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

    // the way back sits at the panel's top-left (user call 2026-08-18), leaving
    // the bottom row to the action that matters — but IN FLOW, on a line of its
    // own. Floated over the corner it landed on the first remembered town, and
    // at a fingertip's 44px it covered that row's name outright (user report).
    .panel-back {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      margin: -2px 0 6px;
      cursor: pointer;
      opacity: 0.7;
      font-size: 120%;
      line-height: 1;
      &:hover {
        color: red;
        opacity: 1;
      }
      // A 13x16px arrow, and the only way back out of the Host and Join
      // panels. (The `.back` rule further down this file styles a class the
      // template no longer renders — this is the live one.)
      @media (pointer: coarse) {
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        margin: -6px 0 2px -8px;
      }
    }
    .acts {
      display: flex;
      align-items: center;
      // the primary action owns the bottom row: centred and wide
      justify-content: center;
      margin-top: 12px;

      button.confirm {
        min-width: 60%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

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

    // ── THE DISC (FT-887; shared in FT-888, desktop only) ───────────────
    //
    // The same object the night checklist and the build panel are: the
    // panel stops being a rectangle floating over the dial and becomes a
    // plate laid ON it. The geometry — radius off --face-r, cap fraction,
    // band chord, the gate, the material — is src/faceDisc.scss's, not
    // this file's. It used to be a COPY of NightSheet's numbers sitting
    // here (cap 0.21, half-width 0.8146, the same media query written out
    // again), which is exactly how a shape becomes three shapes.
    //
    // TWO CAPS, ONE BAND. The back arrow (+ the join panel's one-line
    // hint) rides the top cap; the primary button rides the bottom cap;
    // `.panel-body` — the town list and the fields — lives in the band
    // between them.
    //
    // NO overflow:hidden ON THE DISC, and that is this panel's own
    // departure from the checklist. The checklist's rows never open
    // anything outside themselves; this panel's town-name field and its
    // ScriptPicker both do (`ul.recents`, `.script-pick .grid` — both
    // `position: absolute`, both wider than the band). A circular clip
    // would cut them off along with everything else, so the ring here is
    // sized to hold ordinary content and a popup is left free to sit over
    // the rim the way it already sits over the rectangle's edge today —
    // asked for explicitly, and checked in the proof rig.
    @include face-disc-gate {
      @include face-disc-frame;
      overflow: visible;

      .panel-head {
        @include face-disc-head;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        padding: 0 0 4px;

        .panel-back {
          margin: 0;
        }
        .hint {
          margin: 4px 0 0;
        }
      }

      .panel-body {
        @include face-disc-band;
        padding: 0 6px;
        text-align: left;

        // the town list keeps its OWN internal scroll (unchanged — it
        // holds no popup, so clipping it costs nothing); it just stops
        // claiming most of the band the way 30vh did on a ~245px band.
        ul.towns {
          max-height: 96px;
        }
      }

      // THE FOOT SITS 10px LOWER HERE, not the disc's own +6px default.
      // The checklist's +6 was measured against a 42px button; this one is
      // 48px and its own sweep landed here. Passed as an argument rather
      // than pushed into the shared default, which the checklist would
      // then have to override back.
      .acts {
        @include face-disc-foot(10px);

        // "Open the town" wrapped to two lines at the rectangle's 120%/
        // 8px-22px sizing — measured against a 0.95r box (the same bound
        // the checklist's end-night button clears the arc at, at this same
        // foot offset) it needs to be smaller, not the box wider: past
        // 0.95r the button starts crossing the rim. The join panel's
        // icon-only button was never close to this bound and is untouched
        // by the size drop.
        button.confirm {
          font-size: 92%;
          padding: 7px 12px;
          min-width: 0;
          width: 100%;
          white-space: nowrap;
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
