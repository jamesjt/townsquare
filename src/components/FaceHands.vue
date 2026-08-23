<template>
  <!-- ── THE CLOCK HANDS ON THE TOWN'S DIAL (FT-973), AND THE TOWER'S OWN
       FURNITURE (FT-1020) ────────────────────────────────────────────────────
       The town square is played on a BLANK plate: `#app.in-game` paints
       `background-clocktower-blank-centered.png`, the art with no hands on it,
       while the entry screen keeps the painting's own hands. This layer is what
       puts moving hands back — and it is mounted `v-if="inGame"` in App.vue for
       exactly that reason. On the entry screen it must not exist at all, or the
       painted hands and these would both be standing there.

       FT-1020 SPLIT THE ROOT IN TWO. The wrapper below carries NO z-index of
       its own (z auto forms no stacking context), so its two children join
       #app's stack independently:

         #face-hands  — the four hand sprites. PAINT, exactly as FT-973 left
                        them: z-index 0, pointer-events none, under the town's
                        working surface, dimmed by the night veil.
         #tower-top   — the anchor numeral (the hour display's own control),
                        the eleven other numerals, the digital readout and the
                        display-mode menu. FURNITURE: z-index 3 — the readout
                        `.info` sits at 2 (FT-995 re-measure) and a CONTROL has
                        to stay reachable above the veil — with pointer-events
                        none at the layer and auto only on the anchor and menu.

       WHAT DRIVES THE HANDS: `handAngles` in src/golem/faceHands.js, from two
       inputs now — how long this phase has been running (`phaseEpoch` below)
       and, since FT-1020, the game's own day counter for the hour hand.

       THE HANDS LAYER TAKES NO CLICKS, EVER — see FT-973's note below on why
       a decorative layer that could swallow a click is a bug. The tower layer
       re-enables the pointer ONLY on its two real controls. -->
  <div id="face-hands-root">
    <div
      id="face-hands"
      aria-hidden="true"
      ref="layer"
      :class="{ 'fh-tick': minuteTick }"
      v-show="handsVisible"
    >
      <!-- FT-1029 (user call): the ring wears the SEAT COINS' black numerals
           (PiratesBay, #14100a, the engraved pale under-light) and sits in
           the PAINT layer so the hands pass over it. The carved-glyph
           composer (FT-1020c) stands down unused in the script half, per
           the never-delete rule. -->
      <template v-if="showNumerals">
        <span
          v-for="spot in numeralSpots"
          :key="'num-' + spot.n"
          class="tw-numeral"
          aria-hidden="true"
          :style="spot.style"
        >
          <!-- FT-1031 (user: "the clock tower text is working fine, make the
               numerals look like that"): the CARVED glyphs return, with more
               glow and a wider ring. Text stays the fallback. -->
          <template v-if="spot.glyphs">
            <img
              v-for="(g, i) in spot.glyphs"
              :key="spot.n + '-' + i"
              class="tw-numeral-glyph"
              :src="g.src"
              :style="g.style"
              alt=""
            />
          </template>
          <template v-else>{{ spot.label }}</template>
        </span>
      </template>
      <!-- FT-1052: the HANDS answer their own toggle — the layer stays up
           for the ring alone (numerals without hands is a legal combination
           now), so the four parts gate on the clock flag themselves. -->
      <template v-if="showHands">
        <div
          class="fh-part fh-hour"
          :style="{ backgroundImage: sprite('hour') }"
        ></div>
        <div
          class="fh-part fh-minute"
          :style="{ backgroundImage: sprite('minute') }"
        ></div>
        <div
          class="fh-part fh-second"
          :style="{ backgroundImage: sprite('second') }"
        ></div>
        <div
          class="fh-part fh-boss"
          :style="{ backgroundImage: sprite('boss') }"
        ></div>
      </template>
    </div>

    <!-- ── THE TOWER'S TOP (FT-1020, control retired FT-1020b) ──────────────
         PURE DISPLAY NOW: the numeral ring (all twelve, in the dial letters'
         own ink — App.vue's CLOCKTOWER spans: same Times, same near-black,
         same soft shadow) and the digital readout.

         THE XII ANCHOR STOOD HERE for one revision — the twelve o'clock
         numeral doubled as the hour display's control, its menu opening
         under it. USER VETO (FT-1020b): the original ask's voice-transcribed
         "hour class" meant the HOURGLASS all along — ui-records.png, the old
         town-records door art — so the four-mode menu lives in the top-right
         strip behind that hourglass now (Menu.vue's Tower tab), and the dial
         goes back to being paint. The anchor/menu markup came off this
         template; its script half (pickMode, menuOpen, anchorTitle) and its
         styles stand down in place below, kept per the house never-delete
         rule. -->
    <div id="tower-top">
      <!-- FT-1029 (user call): the numeral ring moved DOWN into the paint
           layer (#face-hands, before the hands) so the hands pass OVER the
           numerals; it wears the seat coins' black ink now. -->
      <!-- the game's own moment, in the hands' place — which day or night it
           is and how long it has run. Decoration like the hands (the phase
           readout on the dial already states the same fact accessibly). -->
      <!-- FT-1055: `tw-zero` is the countdown's landed-on-zero pulse — a CSS
           flash and nothing more; the day itself never ends on its own. -->
      <span
        v-if="showDigital"
        class="tw-digital"
        :class="{ 'tw-zero': zeroFlash }"
        aria-hidden="true"
      >
        {{ digitalLabel
        }}<span class="tw-digital-clock">{{ digitalClock }}</span>
      </span>
      <!-- (FT-1020b: the XII anchor button and its four-mode menu stood here.
           Unmounted — the control is the strip's hourglass tab now, Menu.vue.
           With no control left, this whole layer is decoration again and the
           pointer never re-enters it.) -->
    </div>
  </div>
</template>

<script>
import {
  handAngles,
  handSprite,
  readFaceHandsStyle,
  readFaceHandsColorway,
  readFaceHandsFreeze,
  readFaceHandsMotion,
  readFaceHandsLab,
  overshootDegrees,
  FACE_HANDS_FROZEN,
  FACE_HANDS_EVENT,
} from "../golem/faceHands";
import {
  HOUR_LAYERS,
  TOWER_EVENT,
  towerState,
  effectiveHourFlags,
  hourAllOff,
  toggleHourLayer,
  loadTowerForTown,
  armTowerAudio,
  ringDayStart,
  // FT-1055: Tick/Sweep is personal now (the hourglass menu's row) — this
  // screen reads its own effective pick, not the town field raw.
  effectiveMinuteTick,
  // FT-1055: the phase's start survives a reload (wall-clock, per town), so
  // the day-length countdown resumes at the right remaining.
  recordPhaseStart,
  readPhaseStart,
} from "../golem/towerBells";
// FT-1020c: the ring numerals wear the carved Clocktower letter art — the
// same PNG glyphs the entry screen's CLOCKTOWER lettering is built from.
import { glyphFrom } from "../golem/titleFonts";
// FT-1053: the end-game ceremony's one line into this file — while the
// ceremony holds the hands (an evil win's "stopped dead mid-spin"), tick()
// writes nothing, so the blades stand exactly where the spin left them.
import { ceremonyState } from "../golem/endCeremony";

/**
 * ── THE NUMERAL RING (FT-1020) ────────────────────────────────────────────────
 * Where the twelve hour numerals stand, in face-pixels off the MEASURED dial
 * centre (the same `--fh-cx/cy` the hands pivot on). 168 sits inside the
 * entry screen's own lettering — App.vue's CLOCKTOWER spans were measured
 * onto the painted tick rays at radii 157–177 (they were placed by eye, ray
 * by ray) — so one constant radius keeps the ring true to that band without
 * inheriting its hand-placed wobble.
 */
// FT-1031 (user): further out — from the lettering band toward the rim.
const NUMERAL_RADIUS_FACE = 196;

/** FT-1020c: the ring numerals' cap height, in face-pixels — the carved
 *  glyphs render with this much letter above the baseline. 28: a step up
 *  from the live text's 26 for standout, still well clear of neighbours
 *  (the marks stand ~88 face-pixels apart; IIII is the widest at ~46). */
const NUMERAL_CAP_FACE = 28;

/** The clockmaker's convention — IIII, never IV (the call fbc9e39 already
 *  made for the seat numerals). Index n-1; XII is the anchor, not a span. */
const ROMAN = [
  "I",
  "II",
  "III",
  "IIII",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

export default {
  name: "FaceHands",
  data() {
    return {
      /**
       * ── THE INPUT. THIS IS THE LINE THAT CHANGES. ─────────────────────────
       *
       * When the current phase began, in `performance.now()` milliseconds.
       * The minute and second hands are `now - phaseEpoch` handed to
       * `handAngles`; the hour hand reads the store's own day counter instead
       * (FT-1020 — see `tick`).
       *
       * WHY IT IS OBSERVED RATHER THAN READ. The app records no phase-start
       * timestamp anywhere — checked, not assumed: `toggleNight`
       * (src/store/index.js) flips `grimoire.isNight` and increments
       * `night.day` and stores no time, and the chronicle's entries carry
       * `day` and `phase` but no wall clock. So this component watches those
       * two values and re-stamps the epoch when either moves. That is the
       * brief's page-load fallback plus the one thing the client genuinely
       * knows: mount stamps it, and every phase flip after that re-stamps it.
       *
       * WHEN THE REAL PHASE LOG LANDS, this becomes a read of the recorded
       * start instead of a stamp, and NOTHING ELSE MOVES — not the watcher's
       * job, not `handAngles`, not one line of the stylesheet. The hands change
       * their SOURCE, not their behaviour.
       *
       * `performance.now()` rather than `Date.now()` deliberately: it is
       * monotonic, so a system clock correction or a DST step cannot make the
       * hands jump backwards or spin.
       */
      phaseEpoch: 0,
      /** The lab's three non-numeric picks, re-read on the lab's event. The
       *  nine numeric dials never come through here — they are custom
       *  properties on <html> and the stylesheet reads them directly. */
      style: readFaceHandsStyle(),
      colorway: readFaceHandsColorway(),
      frozen: readFaceHandsFreeze(),
      /** How the second hand moves: escapement / tick / sweep. A CHOICE, so it
       *  arrives on the lab's event rather than as a custom property. */
      motion: readFaceHandsMotion(),
      /** The escapement's peak overshoot, in degrees. The one NUMERIC dial read
       *  here rather than by the stylesheet — the tick is arithmetic, not a
       *  transform, so no custom property could carry it. */
      overshoot: overshootDegrees(readFaceHandsLab().overshoot),
      raf: 0,
      // ── THE TOWER'S CHOICES (FT-1020), re-read on the tower's event ───────
      /** FT-1052: which display LAYERS this screen shows, as independent
       *  {clock, digital, numerals} flags — the town's on a storyteller's
       *  screen, the viewer's own set (falling back to the town's) on a
       *  player's (towerBells.js, FT-1020c). */
      hour: effectiveHourFlags(this.$store.state.session),
      /** Minute hand steps (the shipped tick) or creeps (Sweep) — FT-1055:
       *  this screen's own pick (the hourglass menu row), town default
       *  otherwise. */
      minuteTick: effectiveMinuteTick(this.$store.state.session),
      /** FT-1055: the town's day length in minutes (0 = Off) — a reactive
       *  snapshot of the synced tower field, refreshed on TOWER_EVENT. */
      dayLengthMin: towerState.dayLengthMin,
      /** FT-1055: the countdown has landed on zero — the readout wears the
       *  pulse class while this holds; cleared by the next phase. */
      zeroFlash: false,
      /** RETIRED (FT-1020b) with the XII anchor — nothing opens here now;
       *  the four-mode menu is the strip's hourglass tab (Menu.vue). */
      menuOpen: false,
      /** The digital readout's mm:ss half, rewritten at most once a second by
       *  the frame loop — never per frame; a data field sixty writes a second
       *  is the reactivity cost `tick` exists to avoid. */
      digitalClock: "0:00",
    };
  },
  computed: {
    /**
     * The phase, as the pair whose CHANGE marks a new one. Watched below.
     *
     * FT-1059: `isEnded` rides along as a THIRD field, appended (not
     * prepended — the watcher's dawn-bell check reads `.charAt(0)`, which
     * must stay the day/night letter). Play again resets the day counter to
     * 0 (App.vue), and a fresh game's very first phase is "d:0" — the EXACT
     * key a town's first game already used. On its own that is not a KEY
     * CHANGE the watcher below would ever see (Vue watches fire on a
     * different value, and "d:0" equals "d:0"), so nothing would re-stamp
     * the phase clock and a replayed town's Day 1 would silently inherit
     * the FIRST game's start — reported as a fresh game opening at 197
     * minutes. `isEnded` is the one flag GUARANTEED to flip true then false
     * across every End game → Play again cycle (the button is v-if'd on it
     * being true, and `playAgain` clears it), so folding it in forces this
     * computed to change at exactly that moment, which is what makes the
     * watcher's existing reset logic run at all.
     */
    phaseKey() {
      const s = this.$store && this.$store.state;
      if (!s) return "0:0:0";
      const night = s.night || {};
      const grimoire = s.grimoire || {};
      const session = s.session || {};
      return (
        (grimoire.isNight ? "n" : "d") +
        ":" +
        (night.day || 0) +
        ":" +
        (session.isEnded ? "1" : "0")
      );
    },
    /** The game's day counter, as the readout states it. */
    gameDay() {
      const s = this.$store && this.$store.state;
      return (s && s.night && s.night.day) || 0;
    },
    /**
     * The hour hand's whole input (FT-1020): how many DAYS HAVE BROKEN. The
     * store's counter increments at DUSK (`toggleNight` moves it when night N
     * begins), but the ask is a step at DAY START — so through the night the
     * hand holds the morning it last saw, and the +1 lands exactly when
     * "Day N breaks". The night the town has not yet survived is not counted.
     */
    hourDays() {
      const s = this.$store && this.$store.state;
      const night = (s && s.grimoire && s.grimoire.isNight) || false;
      return night ? Math.max(0, this.gameDay - 1) : this.gameDay;
    },
    /** The app's animation kill-switch. `#app.static` already kills the CSS
     *  tick transitions; watching it here is what stops the FRAME LOOP too —
     *  JS writes are motion the stylesheet cannot silence. */
    isStaticNow() {
      const s = this.$store && this.$store.state;
      return !!(s && s.grimoire && s.grimoire.isStatic);
    },
    /**
     * FT-1059: THE TOWN ENDED — the phase that was running when it did stays
     * whatever it was; nothing will ever flip it again this game (Play again
     * is a fresh mount, not a phase change). Before this flag existed the
     * digital readout kept counting real seconds forever past the end — an
     * ended town's clock climbing (or, with a day length set, sitting at a
     * long-since-crossed zero re-flashing) with no phase left for it to be
     * timing. `loop()` reads this the same way it reads `frozen`/`isStaticNow`.
     */
    isEnded() {
      const s = this.$store && this.$store.state;
      return !!(s && s.session && s.session.isEnded);
    },
    // FT-1052: the three layers render independently — digital was already
    // its own path (#tower-top); the ring shares the hands' LAYER (it lives
    // under the hands on purpose, FT-1029), so the layer stands for either
    // and the hand parts gate on their own flag inside it.
    handsVisible() {
      return this.hour.clock || this.hour.numerals;
    },
    showHands() {
      return this.hour.clock;
    },
    showNumerals() {
      return this.hour.numerals;
    },
    showDigital() {
      return this.hour.digital;
    },
    /**
     * FT-1055: how long the CURRENT phase is allowed to run, in ms — the
     * town's day length while a DAY runs, 0 otherwise (nights keep counting
     * up; no length set is today's behaviour everywhere). The countdown and
     * the zero moment both read this one gate.
     */
    dayCountdownMs() {
      const s = this.$store && this.$store.state;
      const night = s && s.grimoire && s.grimoire.isNight;
      if (night) return 0;
      return (this.dayLengthMin || 0) * 60000;
    },
    /** The digital readout's words: the phase readout's own fact, restated
     *  small — "Day 3" / "Night 3". The Math.max is TownInfo's own clamp
     *  (phaseLabel): the setup day, before the counter first moves, is
     *  "Day 1" on the pill and must be "Day 1" here — the two state the
     *  same fact an inch apart and may never disagree. */
    digitalLabel() {
      const s = this.$store.state;
      const night = s.grimoire && s.grimoire.isNight;
      return (night ? "Night " : "Day ") + Math.max(this.gameDay, 1);
    },
    /** RETIRED (FT-1020b) with the anchor it titled — see the template.
     *  FT-1052: restated over the layer flags for the day it returns. */
    anchorTitle() {
      const on = HOUR_LAYERS.filter((l) => this.hour[l.id]).map((l) => l.label);
      const shown = hourAllOff(this.hour) ? "Off" : on.join(" + ");
      return "Hour display: " + shown + " — click to choose";
    },
    /**
     * The twelve numerals of "Show numerals", I..XII on the tick rays.
     * (I..XI while the XII was the anchor button — FT-1020b returned the
     * twelve to the ring when the control left the dial.) Positioned in JS
     * rather than as twelve CSS blocks because the ring is one formula:
     * numeral n stands at n × 30° clockwise from twelve,
     * NUMERAL_RADIUS_FACE out from the measured centre, scaled by the
     * face's own `--fpx`.
     */
    numeralSpots() {
      const spots = [];
      for (let n = 1; n <= 12; n++) {
        const angle = (n * 30 * Math.PI) / 180;
        const x = Math.sin(angle) * NUMERAL_RADIUS_FACE;
        const y = -Math.cos(angle) * NUMERAL_RADIUS_FACE;
        spots.push({
          n,
          label: ROMAN[n - 1],
          // FT-1020c: the numeral as carved Clocktower glyphs — one img per
          // letter, each scaled to the shared cap height by its own metrics
          // (I is taller than V/X by a few source pixels; scaling per glyph
          // keeps the baseline true). Any unresolved letter drops the whole
          // numeral back to live text.
          // FT-1033 (user): the ring wears the MAIN PAGE letters' own look —
          // dark Times over the face — so the carved-glyph route stands down
          // (again; third taste swing, composer still intact below).
          glyphs: null,
          style: {
            left: `calc(var(--fh-cx) + ${x.toFixed(1)} * var(--fpx))`,
            top: `calc(var(--fh-cy) + ${y.toFixed(1)} * var(--fpx))`,
          },
        });
      }
      return spots;
    },
  },
  watch: {
    // A NEW PHASE RESTARTS THE COUNT. Both halves matter: the day/night flag
    // catches dusk and dawn, the day number catches a second night (the flag
    // is already true when it starts).
    phaseKey(now, before) {
      // FT-1055: the phase's start is remembered per town (wall-clock). A
      // key this browser has ALREADY seen begin is not a fresh flip — it is
      // a reload's sync re-announcing the running phase (mount stamped a
      // provisional epoch before the sync arrived) — so its clock RESUMES;
      // only a genuinely new key stamps and records a fresh start. Either
      // way the zero state stands down: this phase judges its own zero.
      const townId = this.$store.state.session.sessionId || "";
      const back = readPhaseStart(townId, now);
      if (back !== null) {
        this.phaseEpoch = performance.now() - back;
      } else {
        this.phaseEpoch = performance.now();
        recordPhaseStart(townId, now);
      }
      this._zeroFired = false;
      this._sawCountdown = false;
      this.zeroFlash = false;
      this.tick();
      // ── DAY BREAKS, THE BELL TOLLS (FT-1020) ──────────────────────────────
      // Night→day on the SAME counter is a genuine dawn — the one moment the
      // town's bell speaks — and it is the only transition that rings: a
      // joiner leaping "d:0"→"d:3" keeps the flag and stays silent, a
      // reconnect re-commits the same key and never gets here at all. Every
      // client runs this watcher on its own store, so host and players each
      // ring their own bell off the phase flip that already syncs — no new
      // wire traffic exists for it.
      if (before.charAt(0) === "n" && now.charAt(0) === "d") {
        ringDayStart(this.$store.state.grimoire.isMuted);
      }
    },
    frozen() {
      this.tick();
    },
    // The kill-switch flipping: silence the loop, or stand it back up.
    isStaticNow() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.loop();
    },
    // The day count can move WITHOUT a phase flip (the night sheet's day
    // scrub, FT-882) — the hour hand follows it wherever it goes. (A flip
    // moves this too, but the phaseKey watcher's tick has already run by
    // then and a second write of the same values is three no-op strings.)
    hourDays() {
      this.tick();
    },
  },
  mounted() {
    this.phaseEpoch = performance.now();
    // FT-1055: a reload mid-phase resumes the phase's own clock — the stored
    // wall-clock start (recorded on every flip below) backdates the epoch so
    // the countdown lands its zero at the same real moment it always would.
    // No match (a different phase, a stale record, a fresh join) records the
    // only start this client genuinely knows: now.
    {
      const townId = this.$store.state.session.sessionId || "";
      const back = readPhaseStart(townId, this.phaseKey);
      if (back !== null) {
        this.phaseEpoch = performance.now() - back;
      } else {
        recordPhaseStart(townId, this.phaseKey);
      }
    }
    // FT-1055: the zero moment's guards — fired-once per phase, and "saw the
    // countdown actually running" (a client that arrives, or reloads, PAST
    // zero flashes but never re-rings the moment it missed). Plain instance
    // fields like the angle guards below: nothing renders from them.
    this._zeroFired = false;
    this._sawCountdown = false;
    // last-written stepped angles, for the reset guard in `tick` — plain
    // instance fields, NOT data(): they change with the writes they guard and
    // nothing renders from them.
    this._lastMinute = -1;
    this._lastHour = -1;
    this._resetRaf = 0;
    window.addEventListener(FACE_HANDS_EVENT, this.readLab);
    window.addEventListener(TOWER_EVENT, this.readTower);
    // FT-1020: a HOST arriving in a town stands its remembered tower up (a
    // reload mid-game never passes through the build panel, so both mounts
    // load it — the read is idempotent). Every client arms the bell's silent
    // audio unlock; the first gesture pays for it.
    const session = this.$store.state.session;
    if (!session.isSpectator && session.sessionId) {
      loadTowerForTown(session.sessionId);
    }
    armTowerAudio();
    this.readTower();
    this.loop();
  },
  beforeDestroy() {
    window.removeEventListener(FACE_HANDS_EVENT, this.readLab);
    window.removeEventListener(TOWER_EVENT, this.readTower);
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._resetRaf) cancelAnimationFrame(this._resetRaf);
  },
  methods: {
    /**
     * FT-1020c: one ring numeral as carved-glyph imgs. Each letter of the
     * roman numeral resolves against the Clocktower set ("ct" — the entry
     * screen's own lettering); its img is sized so the ABOVE-BASELINE height
     * is NUMERAL_CAP_FACE face-pixels (the metrics' `baseline` is measured
     * from the top, so h/baseline is the small descender allowance). Returns
     * null if any letter is missing, and the template falls back to text.
     */
    numeralGlyphs(label) {
      const glyphs = [];
      for (const letter of label) {
        const g = glyphFrom("ct", letter);
        if (!g || !g.baseline) return null;
        const height = (NUMERAL_CAP_FACE * g.h) / g.baseline;
        glyphs.push({
          src: g.src,
          style: { height: `calc(${height.toFixed(1)} * var(--fpx))` },
        });
      }
      return glyphs;
    },
    /** The lab changed a pick. Storage is the single copy; re-read it. */
    readLab() {
      this.style = readFaceHandsStyle();
      this.colorway = readFaceHandsColorway();
      this.frozen = readFaceHandsFreeze();
      this.motion = readFaceHandsMotion();
      this.overshoot = overshootDegrees(readFaceHandsLab().overshoot);
      // A dial may have changed while the clock is stopped, and a frozen loop
      // is not coming back round to notice.
      this.tick();
    },
    /** The tower changed — the build panel, the anchor menu, or a host sync
     *  arriving. Same one-way re-read as the lab's. */
    readTower() {
      this.hour = effectiveHourFlags(this.$store.state.session);
      this.minuteTick = effectiveMinuteTick(this.$store.state.session);
      // FT-1055: the day length rides the same event (a panel scrub, a sync
      // arriving) — the loop reads the snapshot next frame.
      this.dayLengthMin = towerState.dayLengthMin;
      this.tick();
    },
    /**
     * RETIRED (FT-1020b): this answered the XII anchor's menu, unmounted
     * with it. The live pick runs through towerBells' toggleHourLayer —
     * Menu.vue's hourglass tab calls it — which carries the same split this
     * held: the STORYTELLER's toggle is the town's (persisted per town,
     * ridden out on the live tower frame and the full sync); a PLAYER's is
     * their own screen's override. FT-1052 repointed it at the layer model.
     */
    pickMode(id) {
      toggleHourLayer(this.$store.state.session, id);
      this.menuOpen = false;
    },
    sprite(part) {
      return "url(" + handSprite(this.style, this.colorway, part) + ")";
    },
    /**
     * ONE FRAME. Writes the three angles as custom properties STRAIGHT ONTO THE
     * LAYER, deliberately bypassing Vue's reactivity.
     *
     * WHY BYPASS IT: this runs 60 times a second, and a reactive style binding
     * would put a full render + patch of four elements on every one of those
     * frames for what is three string writes. The root carries no `:style`
     * binding at all, so Vue never touches its style attribute and cannot wipe
     * what is written here.
     *
     * THE STEPPED HANDS ANIMATE IN CSS (FT-1020). The minute and hour angles
     * change rarely now — once a minute, once a day — and the stylesheet
     * carries a short snap transition on exactly those two parts, so each
     * discrete write arrives as a tick rather than a jump. `#app.static`
     * already kills that transition globally.
     *
     * THE RESET GUARD: a transition animates BETWEEN values, so any write
     * that moves a stepped hand BACKWARDS — the phase flipping (elapsed back
     * to zero), Play again (the day counter home), the lab freezing into its
     * spread — would play as a fast anticlockwise lap. `.fh-reset` turns the
     * transition off for that one write and comes off on the next frame.
     *
     * The stylesheet composes these with the lab's `--fh-angle` offset, so the
     * Angle scrub works whether the clock is running or frozen.
     */
    tick() {
      const el = this.$refs.layer;
      if (!el) return;
      // FT-1053: the ceremony has stopped time — no writes while it holds.
      // The frame loop keeps running (cheap), so the hands resume on their
      // own the moment the hold lifts and the reset guard below absorbs the
      // backward snap exactly as it does for a phase flip.
      if (ceremonyState.holdHands) return;
      const a = this.frozen
        ? FACE_HANDS_FROZEN
        : handAngles(
            performance.now() - this.phaseEpoch,
            this.motion,
            this.overshoot,
            { minuteTick: this.minuteTick, day: this.hourDays },
          );
      if (a.minute < this._lastMinute || a.hour < this._lastHour) {
        el.classList.add("fh-reset");
        if (this._resetRaf) cancelAnimationFrame(this._resetRaf);
        this._resetRaf = requestAnimationFrame(() => {
          this._resetRaf = 0;
          el.classList.remove("fh-reset");
        });
      }
      this._lastMinute = a.minute;
      this._lastHour = a.hour;
      // NOTHING REACTIVE IS WRITTEN HERE, on purpose — see the note above. The
      // angles are not held in `data` at all: a component field nothing renders
      // from would still take Vue's reactive setter sixty times a second to
      // notify no one.
      el.style.setProperty("--fh-hour-angle", a.hour + "deg");
      el.style.setProperty("--fh-minute-angle", a.minute + "deg");
      el.style.setProperty("--fh-second-angle", a.second + "deg");
    },
    /**
     * THE FRAME LOOP, and it STOPS DEAD WHEN FROZEN OR STATIC — one write,
     * then no further frames until the clock is started again. The freeze is
     * the lab's (judging a still image); static is the app's own animation
     * kill-switch, which must silence JS-driven motion as surely as it
     * silences the stylesheet's (FT-1020).
     *
     * requestAnimationFrame rather than an interval, for the second hand: its
     * escapement wants the display's own cadence, and rAF pauses itself in a
     * hidden tab, which an interval would not.
     */
    loop() {
      this.tick();
      const elapsedMs = performance.now() - this.phaseEpoch;
      const countdownMs = this.dayCountdownMs;
      // ── FT-1055: THE ZERO MOMENT — once per day, on every client ─────────
      // Watched regardless of whether THIS screen shows the digital layer:
      // the display is personal, the bell is the town's. At zero the
      // day-start bell machinery tolls once (its own bellOn/mute/cooldown
      // gates apply) and the readout takes the pulse class — and NOTHING
      // ELSE happens: no phase change, no auto-end, ever; the storyteller
      // keeps control. `_sawCountdown` is the reload guard: only a client
      // that watched the countdown actually running rings the crossing — one
      // arriving past zero flashes silently (the moment already spoke).
      //
      // FT-1059: `!this.isEnded` joins the gate — an ended town's phase will
      // never flip again (Play again is a fresh mount, not a phase change),
      // so a bell tolling or a pulse starting after the game is over would be
      // announcing a moment that no longer means anything.
      if (countdownMs && !this.frozen && !this.isEnded) {
        if (countdownMs - elapsedMs > 0) {
          this._sawCountdown = true;
          // a LENGTHENED day re-arms: the countdown is visibly running
          // again, so its new zero deserves its moment (still once — after
          // firing, only a config change can put remaining back above 0).
          if (this._zeroFired) {
            this._zeroFired = false;
            this.zeroFlash = false;
          }
        } else if (!this._zeroFired) {
          this._zeroFired = true;
          this.zeroFlash = !this.isStaticNow;
          if (this._sawCountdown) {
            ringDayStart(this.$store.state.grimoire.isMuted);
          }
        }
      } else if (this.zeroFlash) {
        // the length went Off mid-flash, or the game just ended — either way
        // nothing left to announce
        this.zeroFlash = false;
      }
      // the digital readout's clock, at second-granularity — compare first so
      // 59 of every 60 frames write nothing reactive. FT-1055: with a day
      // length set the same readout counts DOWN (remaining, floored at 0:00);
      // nights — and days with no length — keep counting up. FT-1059: an
      // ENDED town's readout STOPS — it holds whatever it last read rather
      // than climbing (or re-flashing a long-crossed zero) forever after the
      // game is over; see the isEnded computed above.
      if (this.showDigital && !this.frozen && !this.isEnded) {
        const total = countdownMs
          ? Math.max(0, Math.ceil((countdownMs - elapsedMs) / 1000))
          : Math.max(0, Math.floor(elapsedMs / 1000));
        const clock =
          Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
        if (clock !== this.digitalClock) this.digitalClock = clock;
      }
      if (this.frozen || this.isStaticNow) {
        this.raf = 0;
        return;
      }
      this.raf = requestAnimationFrame(this.loop);
    },
  },
};
</script>

<style scoped lang="scss">
// ── THE TOWER'S TICK (FT-1020) ───────────────────────────────────────────────
// How long a stepped hand takes to arrive, and how it lands. 340ms is well
// under the minute hand's one-minute gap and long enough to read as movement
// rather than a cut; the ease overshoots a few percent and settles — the same
// personality the second hand's JS escapement already has, spoken in CSS.
$tower-tick-duration: 340ms;
$tower-tick-ease: cubic-bezier(0.2, 1.35, 0.4, 1);

// the numeral ring's ink — the entry screen's dial letters, restated
// (App.vue's `.dial-letters`: bold Times, near-black, a soft drop under it)
$numeral-ink: #0a0502;

// where the digital readout stands: on the twelve ray, under the anchor and
// above the readout's own edition badge — face-pixels off the measured centre
$digital-y-face: -122;

/* ── WHERE THESE LAYERS SIT IN THE STACK, AND WHY ────────────────────────────
   The ROOT wrapper carries inset: 0 and NO z-index — z auto forms no stacking
   context, so the two layers below join #app's stack on their own numbers,
   and the wrapper's place in the DOM (before `.backdrop`) is what the hands
   layer's veil ordering still reads from.

   #face-hands: z-index 0, exactly as FT-973 shipped it.

   ── z-index -1 WAS TRIED FIRST AND IT PAINTS NOTHING AT ALL ─────────────────
   Worth writing down, because the reasoning for it is seductive and wrong.
   The argument went: #app takes `container-type: size`, size containment
   implies LAYOUT containment, layout containment forms a stacking context, and
   a negative-z child of a stacking context paints above that element's own
   background — so -1 would put the hands on the dial art and under everything
   else. Every step of that is textbook, and the result is invisible hands.

   MEASURED, not reasoned (claude_temp_test/2026-08-20-ft973-zprobe.mjs — the
   layer swept through five z-indexes, each frame diffed against the same frame
   with the layer hidden, counting pixels the layer actually changes):

       z-index  -1  ->      0 px    invisible
       z-index   0  ->  3 962 px    PAINTS, under the readout and the seats
       z-index   1  ->  7 223 px    PAINTS, over the readout
       z-index   2  ->  7 223 px    identical to 1
       z-index  18  ->  7 223 px    identical to 1

   #app does NOT form a stacking context here, whatever the containment spec
   implies. So a negative-z child escapes to the ROOT context, where it lands
   beneath three opaque backgrounds — html, body and #app all paint
   `#0b0d12` plus the dial art — and is buried. The lesson generalises: on this
   element, negative z-index is not a "behind the furniture" slot, it is a hole.

   ── TABLE ABOVE IS STALE-DATED (2026-08-20, FT-995) ─────────────────────────
   Measured before the readout (`.info`) moved to z-index 2 (FT-975 era). Re-
   measured on the current tree by the FT-993 lane: z:1 and z:2 now behave
   IDENTICALLY to z:0 against the readout, and the hands only cross it at z:3+.
   The chosen slot (0) is still correct; "1 paints over the readout" is no
   longer the live threshold. The -1-is-a-hole finding is unaffected.

   ── WHY 0 AND NOT 1 ────────────────────────────────────────────────────────
   Every pixel above 0 is a pixel where a blade would be drawn ON TOP OF THE
   TOWN READOUT — the script lockup, the living/dead counts, the day number,
   the End-day button. THE HANDS ARE PAINT, NOT FURNITURE: they stand in for
   hands painted into the entry screen's own background image, so the town's
   working surface belongs over them. 0 is the slot that says so.

   WHAT COVERS THEM, top to bottom: the dev labs (60+), the vote (20), the face
   disc surfaces (19), #tower-top (3 — FT-1020, see below), the seats (1..N),
   the dial letters (1, and entry-only anyway), the town readout `.info` (2,
   FT-995) and the death stains `.blood-dial` (0, later in DOM so it takes the
   tie).

   WHAT THEY COVER: the dial art, and the blood splat `.face-splat` (-1) —
   which is the one relationship this slot gets the wrong way round. Blood
   thrown on the dial ought to sit on top of the hands, and at -1 the splat is
   in the same hole this layer just climbed out of, so it cannot. Reported
   rather than fixed: layering was declared out of scope for this lane, and
   moving the splat is a change to something that was already on the dial.

   AND THE NIGHT VEIL IS WON BY DOM ORDER, NOT BY z-index. `.backdrop` (opacity
   .5 at night) is also stack level 0, so whichever comes later in App.vue's
   template paints on top. This wrapper is mounted BEFORE it deliberately, so
   the veil dims the hands along with the art they lie on — the same treatment
   the entry screen's painted hands get.

   MEASURED, because an ordering claim that is merely reasoned is the kind that
   turns out backwards (claude_temp_test/2026-08-20-ft973-veilorder2.mjs). The
   veil's gradient is fully opaque and only its `opacity` hides it, so forcing
   that to 1 is a binary test — if the veil is on top, the hands are buried:

       veil off (daytime, opacity 0)     3 936 px of hand
       veil at NIGHT strength (0.5)      3 615 px
       veil forced fully OPAQUE (1.0)        0 px    <- buried

   A WARNING FOR WHOEVER MEASURES THIS NEXT: `.backdrop::after` is an ANIMATED
   CLOUD layer, invisible at its daytime opacity 0. Forcing the veil opaque also
   switches the clouds on, and their drift changes ~35 000 px between any two
   consecutive screenshots — which swamps the few thousand the hands are worth
   and makes every configuration look identical. Stop animation before
   diffing anything against this element. The first three runs of that rig
   "proved" the exact opposite of the truth.

   WHAT IT OVERLAPS, stated plainly because the centre is busy: the boss and the
   innermost part of all three blades sit BEHIND the town readout's demon head.
   The blades run to 226 face-pixels against a 238 face-pixel face, so the great
   majority of each is in clear air past it. Nothing here moves anything that
   was already on the dial. */
/* ── THE PIVOT: WHERE THE DIAL ACTUALLY IS, WHICH IS NOT WHERE #app SAYS ─────
   The hands first shipped centred on `--face-cx` / `--face-cy` and read low and
   right of the dial. The cause is not in this layer's arithmetic — it is that
   THOSE TWO PROPERTIES DO NOT POINT AT THE DIAL.

   `--face-cx/cy` describe where the ART's centre is painted: the container
   centre, plus the +7px nudge `#app`'s background-position carries. That would
   be the dial's centre only if the dial were centred IN the art, which App.vue
   states it is ("the art is now 1642x900 with the dial's centre AT the image
   centre"). MEASURED, IT IS NOT.

   HOW IT WAS MEASURED (claude_temp_test/2026-08-20-ft973-combined.mjs). The
   centre of a circle is the point from which its edge lies at a CONSTANT
   radius, so: cast rays, take the radius of strongest luminance gradient at
   each angle, and pick the centre minimising the median absolute deviation of
   those radii. Done for TWO independent features of the dial at once — the
   inner glow edge (r=196) and the outer bronze rim (r=259) — because two
   concentric edges agreeing is far stronger than one edge fitted well:

       dial centre in the art   810, 430
       the art's own centre     821, 450
       OFFSET                   -11 x, -20 y   (art pixels)
       fit cost                 7.0 here vs 24.0 at the art's centre

   Two earlier methods failed and are worth naming so they are not retried:
   thresholding for a bright rim (there is no bright ring — it is a glowing DISC
   with a soft edge on a lit facade; the two background plates landed 10.8px
   apart) and 45° rotational symmetry (the facade dominates the polar samples;
   61px apart, one answer pinned to the search boundary). Both judged the dial
   against its surroundings; this one judges it against itself.

   WHY THE ERROR LOOKED LIKE 'down and right' SPECIFICALLY: at 1280x800 one
   face-pixel is 0.889px, so the dial sits 11 x 0.889 = 9.8px left and 20 x
   0.889 = 17.8px up of where `--face-cx/cy` claim — and the +7px background
   nudge pushes the claim a further 7px right. Net: the pivot stood ~10.9px
   right and ~19.3px below the paint. That is the reported symptom, arithmetic.

   IT IS EXPRESSED IN FACE-PIXELS AND SCALED BY `--fpx`, never in CSS pixels.
   The offset is a property of the ARTWORK, so it must scale with the artwork:
   a constant pixel nudge would be correct at exactly one viewport, which is the
   definition of having fixed the symptom.

   ── THIS IS A LOCAL FIX TO A SHARED FAULT, AND THAT IS DELIBERATE ───────────
   `--face-cx/cy` are wrong for EVERYTHING registered to them, not just for the
   hands — the four face discs read them too. Correcting them centrally is the
   better fix and it is what the face lab exists for, but it would silently move
   all four discs, whose positions were dialled by eye and baked across three
   passes (FT-888 / FT-935) AGAINST the current value. That is a re-bake, not a
   side effect of a hands lane. Reported rather than done.

   THE CENTRE LIVES ON THE ROOT WRAPPER (FT-1020) so both layers — the hands
   AND the tower's numerals/menu — inherit one measurement instead of holding
   two copies of it. */
#face-hands-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* the measured art offset, in face-pixels — see the block above */
  --fh-art-dx: -11;
  --fh-art-dy: -20;
  /* …plus the lab's nudge, which defaults to zero, so the lab being absent
     computes to exactly the measurement */
  --fh-cx: calc(
    var(--face-cx) + (var(--fh-art-dx) + var(--fh-centre-x, 0)) * var(--fpx)
  );
  --fh-cy: calc(
    var(--face-cy) + (var(--fh-art-dy) + var(--fh-centre-y, 0)) * var(--fpx)
  );
}

#face-hands {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* NEVER TAKES A CLICK. The layer covers the entire face — the seats, the
     readout and the disc all sit inside its box — so this is not a nicety.
     None of the four parts turns it back on. */
  pointer-events: none;
  opacity: var(--fh-opacity, 1);
}

/* Each part is a square of SPRITE face-pixels centred on the face's own
   published centre, with the pivot at its middle.

   THE MARGINS DO THE CENTRING, not a translate(-50%, -50%) inside `transform`.
   `transform` here carries rotation and scale only, so `transform-origin:
   center` means the sprite's own pivot and nothing has to be composed around a
   translation. That pivot is (0.5, 0.5) of the sprite, which FT-968 verified
   against the bronze rim as the face's true rotation centre.

   `--face-cx` / `--face-cy` / `--fpx` are #app's own published face geometry
   (App.vue). Reading them is what makes this layer follow the art at every
   viewport, and follow the face lab's background nudges for free. */
.fh-part {
  position: absolute;
  /* the MEASURED dial centre, not `--face-cx/cy` — see the block above */
  left: var(--fh-cx);
  top: var(--fh-cy);
  /* 480 face-pixels: the span the sprites were baked to. The PNG is 960px —
     2x, so it stays crisp on a hi-DPI display at a large viewport. */
  width: calc(480 * var(--fpx));
  height: calc(480 * var(--fpx));
  margin-left: calc(-240 * var(--fpx));
  margin-top: calc(-240 * var(--fpx));
  background-repeat: no-repeat;
  background-position: center;
  /* the sprite is square and so is the box, so this is exact rather than a fit */
  background-size: 100% 100%;
  transform-origin: center;
  will-change: transform;
}

/* ROTATE THEN SCALE. CSS applies these right-to-left, so the upward-pointing
   sprite is scaled along its OWN axes first — X across the blade, Y along it —
   and the result is then rotated. Scaling after rotation would stretch the hand
   along the screen's axes instead of its own, which shears it at every angle
   that is not a multiple of 90.

   `--fh-angle` is the lab's assembly-wide offset and is added to all three, so
   the Angle scrub spins the whole arrangement rigidly whether the clock is
   running or frozen. Every var carries the identity as its fallback, so with
   the lab absent — `devLabs` off, storage cleared — this computes to exactly
   the baked art. */
.fh-hour {
  transform: rotate(calc(var(--fh-hour-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-hour-wid, 1), var(--fh-hour-len, 1));
  /* ── THE HOUR HAND TICKS (FT-1020) ───────────────────────────────────────
     It steps once a game day now, so each write is discrete and the snap
     lives here, in CSS — where `#app.static`'s global transition kill
     already silences it. Always on: the hand has no continuous mode left. */
  transition: transform $tower-tick-duration $tower-tick-ease;
}
.fh-minute {
  transform: rotate(calc(var(--fh-minute-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-minute-wid, 1), var(--fh-minute-len, 1));
}
/* THE MINUTE HAND'S SNAP IS GATED ON THE TICK CLASS: in Sweep the angle
   changes every frame, and a transition chasing a per-frame value smears the
   hand instead of moving it. The class comes off, the transition goes with
   it. */
#face-hands.fh-tick .fh-minute {
  transition: transform $tower-tick-duration $tower-tick-ease;
}
/* THE RESET WRITE — a stepped hand moving BACKWARDS (phase flip, Play again,
   the lab's freeze) snaps without animating; see `tick` for who sets this. */
#face-hands.fh-reset .fh-part {
  transition: none;
}
.fh-second {
  transform: rotate(calc(var(--fh-second-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-second-wid, 1), var(--fh-second-len, 1));
}
/* THE HUB TURNS WITH NOTHING. It is radially symmetric, so a rotation would be
   a transform that costs a composite layer and changes not one pixel. It is a
   separate sprite from the blades on purpose: the hub and the sweeping hands
   may want different stacking later. */
.fh-boss {
  transform: scale(var(--fh-boss, 1));
}

/* ── THE TOWER'S TOP (FT-1020; the ring and the readout only since 1020b) ──
   z-index 3: the first slot that clears the town readout (FT-995 measured the
   hands crossing `.info` at 3+) — chosen when this layer carried a CONTROL,
   kept now that it is pure display so the numerals stay legible above the
   night veil, the same slot the retired anchor earned. NOTHING here takes a
   click any more (FT-1020b): pointer-events none at the layer and no child
   turns it back on, so the seats and the readout lose not one pixel of
   their surface to decoration. */
#tower-top {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
}

/* the twelve ring numerals — the dial letters' ink at a numeral's size (the
   marks stand ~88 face-pixels apart; 26 keeps neighbours clear).
   FT-1020c: LEGIBILITY PASS (user: "hard to see"; baked art approved). The
   numerals are the CARVED CLOCKTOWER GLYPHS now — the entry screen's own
   lettering (titleFonts' "ct" set), I/V/X composed per numeral in the
   template. The standout treatment rides the container as drop-shadow, which
   follows each glyph's own alpha (the trick Player.vue's seat glow uses): a
   dark halo to cut the letter out of the lit face, and a faint pale glow so
   it also lifts off the dial's DARK bronze band — a plain black shadow was
   tried first and sank there, black-on-black. The font/text-shadow rules
   below dress the LIVE-TEXT FALLBACK only (a numeral whose glyph fails to
   resolve): the seat numerals' PiratesBay + pale-halo idiom. */
// FT-1029: the ink variant — RETIRED BY FT-1031 (the carved look returned);
// kept unused for the next taste swing. Was: the seat coins engraved treatment
// (Player.vue .seat-numeral: near-black, one pale under-light), replacing
// the FT-1020c four-way halo for the ring in the paint layer.
.tw-numeral-ink {
  color: #14100a !important;
  text-shadow: 0 calc(1 * var(--fpx)) calc(1 * var(--fpx))
    rgba(255, 250, 235, 0.45) !important;
}

.tw-numeral {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-end;
  gap: calc(2 * var(--fpx));
  line-height: 1;
  /* FT-1033 (user): the dial-letters' own dress — the entry page's CLOCK
     TOWER text: Times bold, its exact near-black, its soft dark shadow. */
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: calc(34 * var(--fpx));
  color: #0a0502;
  /* FT-1044 (user: "a bit of a border or glow — not heavy"): a faint warm
     halo joins the dark drop so the black ink also reads on the dial's dark
     bands; kept dim enough not to haze on the lit face.
     FT-1046b (user: "still hard to see, bit more glow"): the halo steps up —
     a crisp pale under-light (the seat numerals' engraved trick) plus a
     stronger close halo and a wider breath. Ink and font untouched.
     FT-1049 (user: "too much glow now" — a lab to tune it by eye): the four
     layers ride the numeral-glow lab's `--ng-*` dials now
     (src/golem/numeralGlow.js) — strengths in hundredths, radii in
     face-pixels. EVERY FALLBACK IS THE FT-1046b NUMBER, so with the lab
     absent — devLabs off, storage cleared — this computes to exactly the
     shipped dressing; when a look is found it gets baked back here as plain
     numbers and the vars come out with the lab. */
  text-shadow:
    0 calc(1 * var(--fpx)) calc(1 * var(--fpx))
      rgba(255, 250, 235, calc(var(--ng-under, 50) / 100)),
    0 calc(2 * var(--fpx)) calc(var(--ng-drop-blur, 3) * var(--fpx))
      rgba(0, 0, 0, calc(var(--ng-drop, 55) / 100)),
    0 0 calc(var(--ng-halo-size, 4) * var(--fpx))
      rgba(255, 246, 220, calc(var(--ng-halo, 60) / 100)),
    0 0 calc(var(--ng-breath-size, 12) * var(--fpx))
      rgba(255, 240, 200, calc(var(--ng-breath, 35) / 100));
  /* GOLD LETTERS SEPARATE WITH DARK, not with light: a pale glow was tried
     and hazed them into the lit face. Intro.vue's `.hint` black-halo pair,
     spoken as drop-shadow so it follows the carved alpha. */
  /* FT-1031 (user: "more glow"): the dark pair grows and a warm outer breath
     joins it — wide and faint enough not to haze gold-into-gold. */
  /* FT-1033: the gold-cutout glow stands down with the glyphs — dark text
     wears the dial letters' plain soft shadow above. */
}
.tw-numeral-glyph {
  display: block;
  width: auto;
}

/* THE ANCHOR — RETIRED (FT-1020b), rules kept with their unmounted markup.
   It was the XII as a real <button>, numeral ink over button chrome, gold on
   hover. The user's veto moved the menu behind the strip's HOURGLASS
   (Menu.vue) — the original ask's "hour class" was that hourglass all
   along — and the XII went back to being one numeral among twelve. */
.tw-anchor {
  position: absolute;
  left: var(--fh-cx);
  top: calc(var(--fh-cy) - 168 * var(--fpx));
  transform: translate(-50%, -50%);
  padding: calc(4 * var(--fpx));
  margin: 0;
  border: 0;
  background: none;
  font-family: inherit;
  font-weight: inherit;
  line-height: 1;
  font-size: calc(26 * var(--fpx));
  color: $numeral-ink;
  text-shadow: 0 calc(2 * var(--fpx)) calc(3 * var(--fpx)) rgba(0, 0, 0, 0.55);
  pointer-events: auto;
  cursor: pointer;
  &:hover,
  &:focus-visible,
  &.open {
    color: #caa662;
    outline: none;
    text-shadow: 0 0 calc(6 * var(--fpx)) rgba(202, 166, 98, 0.6);
  }
}

/* the game's moment, small on the twelve ray — decoration, like the hands.
   FT-1020c: the ink wears a WHITE GLOW now — the pale four-way halo the seat
   numerals and the role names wear (Player.vue's #f6dfbd idiom), scaled by
   the face's own pixel so it stays a rim at every viewport. */
.tw-digital {
  position: absolute;
  left: var(--fh-cx);
  top: calc(var(--fh-cy) + #{$digital-y-face} * var(--fpx));
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(2 * var(--fpx));
  line-height: 1;
  font-size: calc(20 * var(--fpx));
  color: $numeral-ink;
  text-shadow:
    0 calc(1 * var(--fpx)) calc(2 * var(--fpx)) #f6dfbd,
    0 calc(-1 * var(--fpx)) calc(2 * var(--fpx)) #f6dfbd,
    calc(1 * var(--fpx)) 0 calc(2 * var(--fpx)) #f6dfbd,
    calc(-1 * var(--fpx)) 0 calc(2 * var(--fpx)) #f6dfbd;
  white-space: nowrap;
}
.tw-digital-clock {
  font-size: calc(15 * var(--fpx));
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}

/* FT-1055: the countdown landed on zero — the readout breathes until the
   phase moves on (or the length comes off). A soft opacity pulse, no colour
   change: the readout is dial paint and stays in its own ink. The loop never
   adds the class while `#app.static` holds (isStaticNow), so the app's
   animation kill-switch silences this too. */
.tw-digital.tw-zero {
  animation: tw-zero-pulse 1.1s ease-in-out infinite;
}
@keyframes tw-zero-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

/* THE MENU — UI chrome, not dial paint, so it speaks the app's dark-plate
   idiom (RoleHoverCard's ground and border) at a fixed UI size rather than
   face-pixels: a control's legibility must not shrink with the viewport. */
.tw-menu {
  position: absolute;
  left: var(--fh-cx);
  top: calc(var(--fh-cy) - 150 * var(--fpx));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: rgba(10, 4, 4, 0.97);
  border: 1px solid #400;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7);
  pointer-events: auto;
  font-family: inherit;
}
.tw-mode {
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  color: #d8cdb4;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 3px 10px;
  cursor: pointer;
  &:hover,
  &:focus-visible {
    border-color: rgba(150, 130, 175, 0.75);
    outline: none;
  }
  &.on {
    color: #0d0a12;
    background: #caa662;
    border-color: #caa662;
  }
}
</style>
