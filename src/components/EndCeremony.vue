<template>
  <!-- Golem fork (FT-1053): THE END-GAME CEREMONY — the visual half.
       The state machine, timers, hand-spin and sound live in
       src/golem/endCeremony.js; this component renders the dressing over the
       town and owns the TRIGGER (the armed watch on session.isEnded below).
       Everything here is presentation: one click anywhere skips to the
       settled state, and unmounting mid-show (a reload) leaves exactly the
       end state today's flow already reaches. DESKTOP ONLY this pass. -->
  <div
    id="end-ceremony"
    v-if="active || bannerOn"
    :class="rootClasses"
    @click="skip"
  >
    <!-- everything the ceremony PAINTS lives in .ec-show, which is what the
         fade phase fades — the verdict banner below stays outside it, so it
         can persist over the settled town (FT-1053d) -->
    <div class="ec-show" v-if="active">
      <!-- the held breath: the veil deepens over everything but this show -->
      <div class="ec-veil"></div>

      <!-- ── EVIL: the face cracks, shatters inward, and something rises ───── -->
      <template v-if="verdictOn && winner === 'evil'">
        <!-- the dark hole the face leaves — under the shards, over the art.
           FT-1062: its two thumps ride the hunt's measured clock (the last
           whip's overshoot, then the swallow) via inline custom properties -->
        <div class="ec-hole" :style="holeStyle"></div>
        <!-- the hairline crack racing across the dial -->
        <div class="ec-crack"></div>
        <!-- the face itself, as clip-path shards of the REAL dial art (the
           same background #app.in-game paints, re-declared here so each
           piece can fall on its own transform) -->
        <div class="ec-shards">
          <div
            v-for="(s, i) in shards"
            :key="'shard-' + i"
            class="ec-shard"
            :style="s"
          ></div>
        </div>
        <!-- FT-1062: THE HUNT — one tentacle per good seat, measured at the
           verdict (buildEvilVerdict). Each rises with the FT-1053f staggered
           whip, sways, then ALL lunge at once toward their seats, seize the
           coins, and drag them under. Art cycles the six painted assets
           (end-tentacle-*.svg), flipped/re-scaled past six so no two read
           identical. -->
        <div class="ec-tentacles">
          <div
            v-for="(t, i) in tentacles"
            :key="'tent-' + i"
            class="ec-tent"
            :style="t.style"
          >
            <img
              class="ec-tent-art"
              :src="tentArts[t.art]"
              :style="t.artStyle"
              alt=""
            />
          </div>
        </div>
        <!-- the red wash -->
        <div class="ec-redwash"></div>
        <!-- FT-1062: THE PRIZES — one coin proxy per hunted seat (the seat's
           real Token, the procession's idiom), appearing in the tentacle's
           grip at tip-arrival and dragged along the seat→hole vector as its
           tentacle retracts, shrinking and darkening as it goes under -->
        <div class="ec-grabs">
          <div v-for="g in grabs" :key="g.key" class="ec-grab" :style="g.style">
            <Token :role="g.role" />
          </div>
        </div>
        <!-- FT-1053b: THE PROCESSION — every evil seat rises centre one at a
           time (dead minions, living minions, the demon last), each the
           seat's REAL coin with its name plate, minions settling aside into
           the flanks while the demon ends centre-stage -->
        <div class="ec-procession">
          <div
            v-for="p in procession"
            :key="p.key"
            class="ec-proc"
            :class="{ 'ec-proc-demon': p.demon, 'ec-proc-dead': p.dead }"
            :style="p.style"
          >
            <Token :role="p.role" />
            <span class="ec-proc-name">{{ p.name }}</span>
          </div>
        </div>
      </template>

      <!-- ── GOOD: dawn breaks over the face, the dead ascend ──────────────── -->
      <template v-if="verdictOn && winner === 'good'">
        <!-- FT-1053d: the horizon glow behind the dawn line — a warm dome
           breathing over the top of the face, with a dusky rose spill -->
        <div class="ec-dawn-sky"></div>
        <div class="ec-dawn"></div>
        <!-- FT-1053c: each beam finds ONE good seat — alive first, then the
           dead, one toll per beam, the beam's whole animation as long as the
           toll (SINGLE_TOLL_SEC). Geometry is measured px (dawn point to the
           seat's real coin box), set inline per beam. -->
        <!-- FT-1053d gave each beam a BODY: a taper-clipped shaft holding
           streaming light and drifting dust motes, plus an impact bloom that
           pops ON the coin at the strike moment (the reveal's overexposure
           kiss). Children inherit the beam's own delay/duration. -->
        <div class="ec-beams">
          <div
            v-for="(b, i) in beams"
            :key="'beam-' + i"
            class="ec-beam"
            :style="b"
          >
            <div class="ec-beam-shaft">
              <div class="ec-beam-streaks"></div>
              <div class="ec-beam-motes"></div>
            </div>
            <div class="ec-beam-bloom"></div>
          </div>
        </div>
        <img
          v-for="(g, i) in ghosts"
          :key="'ghost-' + i"
          class="ec-ghost"
          :src="ghostArt"
          alt=""
          :style="g"
        />
      </template>

      <!-- the dawn point, as a measurable 0×0 probe: the beams' shared origin
         in real pixels (CSS owns the calc; JS reads the resolved box) -->
      <div class="ec-dawn-origin" ref="dawnOrigin"></div>
      <!-- FT-1062: two more probes on the same idiom — the hole's centre (the
         tentacles' shared root) and one face-pixel × 100, so the hunt's
         geometry is computed in real px with CSS still owning every calc -->
      <div class="ec-hole-origin" ref="holeOrigin"></div>
      <div class="ec-fpx-probe" ref="fpxProbe"></div>
    </div>

    <!-- FT-1280 (user, from a game-end screenshot): "lets put the disck up
         behind evil/good wins, and above everything else on the clock face."
         In the shot the script emblem and the count rows sit on top of the
         "Evil wins" lettering and the verdict cannot be read.

         THE DISC IS THE APP'S OWN PLATE — the dark glass the Script-setup
         panel and the night checklist stand on ("this is what I meant by the
         disk", pointing at that panel). The first pass read it as the carved
         dial in the background art and rebuilt that instead; the result was
         invisible, because a clone of the page's own paint laid back over the
         page's own paint changes nothing you can see. The material, not the
         picture, is what rises here — see the rule's own comment for how, and
         for what the ordering costs the emblem and the counts underneath. -->
    <div v-if="bannerOn" class="ec-face-disc"></div>

    <!-- FT-1053d: THE VERDICT SHOUTS. A display-voice banner over the clock
         face — arriving with the settle (the fade phase), standing over the
         settled town until the next game clears isEnded. Composition call:
         it hangs ABOVE the face centre, clearing the procession's coin line
         (the demon stays centre-stage beneath it) and the centre stats
         block; z-topmost in the ceremony's own stack, pointer-transparent so
         the skip surface (the root) still takes the one click through it. -->
    <!-- FT-1053e (user): the banner IS the small result line, made big — the
         team glyph + "Evil wins" / "Good wins" as one piece, standing in the
         MIDDLE of the clock face (not hung above it). -->
    <div
      v-if="bannerOn"
      class="ec-banner"
      :class="'ec-banner-' + settledWinner"
      aria-live="polite"
    >
      <span class="ec-banner-text">
        <img class="ec-banner-glyph" :src="bannerGlyph" alt="" />
        {{ settledWinner === "evil" ? "Evil wins" : "Good wins" }}
      </span>
    </div>
  </div>
</template>

<script>
import Token from "./Token";
import { teamGlyph } from "../golem/glyphs";
import {
  ceremonyState,
  beginCeremony,
  skipCeremony,
  stopCeremony,
  ceremonyAllowed,
  evilProcession,
  evilSequence,
  goodSequence,
  rayToll,
  END_CEREMONY_EVENT,
} from "../golem/endCeremony";

/** The measured dial centre, in face-pixels off `--face-cx/cy` — the same
 *  -11,-20 FaceHands carries (the art's dial is not quite at the art's
 *  centre; see FaceHands.vue's measurement block). Restated as numbers here
 *  because the shard polygons are computed in JS. */
const ART_DX = -11;
const ART_DY = -20;

/** How far out the shards reach, in face-pixels: past the numeral ring (196)
 *  and the outer bronze rim (~259), so the whole face goes with them. */
const SHARD_RIM_MIN = 244;
const SHARD_RIM_MAX = 272;

export default {
  name: "EndCeremony",
  components: { Token },
  data() {
    return {
      /** mirrored module state — Vue.observable, so these bindings track */
      ceremony: ceremonyState,
      /** armed only once THIS client has seen a live game (see gameLive) —
       *  a reload of an ended town, or a spectator joining one, must restore
       *  to the settled state, never replay the show */
      armed: false,
      shards: [],
      ghosts: [],
      /** FT-1053b: the evil team's one-at-a-time rise, marshalled at verdict */
      procession: [],
      /** FT-1053c: one measured beam per good seat, alive first */
      beams: [],
      /** FT-1062: one hunting tentacle per good seat, aimed at the verdict
       *  (was a static six-config computed through FT-1053f) */
      tentacles: [],
      /** FT-1062: the seized coins — one proxy Token per hunted seat */
      grabs: [],
      /** FT-1062: the hole's thump times, on the hunt's measured clock */
      holeStyle: {},
      /** the good seats veiled for the choreographed reveal — their li
       *  elements, so skip/settle can unveil exactly what was veiled */
      veiledEls: [],
      /** FT-1062: the seats whose coins the deep has taken — their li
       *  elements, so skip/settle can warm exactly what went cold */
      takenEls: [],
      ghostArt: require("../assets/ui-ghost-cowl.png"),
      /** FT-1053d: the six painted tentacle assets, in generator order */
      tentArts: [
        require("../assets/end-tentacle-1.svg"),
        require("../assets/end-tentacle-2.svg"),
        require("../assets/end-tentacle-3.svg"),
        require("../assets/end-tentacle-4.svg"),
        require("../assets/end-tentacle-5.svg"),
        require("../assets/end-tentacle-6.svg"),
      ],
      noteTimers: [],
    };
  },
  computed: {
    phase() {
      return this.ceremony.phase;
    },
    winner() {
      return this.ceremony.winner;
    },
    active() {
      return this.phase !== "idle";
    },
    /** the verdict dressing stays mounted through the fade so it fades in
     *  place instead of vanishing on the phase edge */
    verdictOn() {
      return this.phase === "verdict" || this.phase === "fade";
    },
    isEnded() {
      return this.$store.state.session.isEnded;
    },
    /** "a game is live on this client" — the arming condition. chat.gameId
     *  is the synced fact every client holds while a dealt game runs (set on
     *  every gamestate sync, null between games), so a client that joins or
     *  reloads an ALREADY-ended town never sees this true and never arms:
     *  its endGame commit lands in the same tick as the gameId it rode in
     *  with, and Vue's watchers only ever see the settled pair. */
    gameLive() {
      return !!this.$store.state.chat.gameId && !this.isEnded;
    },
    /** FT-1053d: the standing verdict banner — up from the settle (the fade
     *  phase) and for as long as the town stays ended. A reload of an ended
     *  town shows it too: the banner is part of the SETTLED state, not of
     *  the show (which never replays). Hidden through breath and verdict so
     *  the ceremony keeps its suspense. */
    bannerOn() {
      return this.isEnded && (this.phase === "fade" || this.phase === "idle");
    },
    /** the winner as the STORE knows it — ceremonyState.winner clears at
     *  idle, and the banner outlives the show */
    settledWinner() {
      return this.storeWinner();
    },
    /** FT-1053e: the small result line's own glyph, at banner size */
    bannerGlyph() {
      return teamGlyph(this.settledWinner === "evil" ? "demon" : "townsfolk");
    },
    rootClasses() {
      return ["ec-" + this.phase, "ec-" + (this.winner || this.settledWinner)];
    },
  },
  watch: {
    /** arm on the first sight of a live game; re-arms after Play again the
     *  same way (gameId clears between games and returns on the next deal) */
    gameLive(live) {
      if (live) this.armed = true;
    },
    /** THE TRIGGER — the end broadcast landing on this client (the host's
     *  own endGame commit, or a player's via the gamestate sync). */
    isEnded(now, was) {
      if (!now || was || !this.armed) return;
      this.armed = false;
      if (!ceremonyAllowed(this.$store)) {
        // motion-reduced / the app's static kill-switch: no show — the
        // settled end state is already what renders. Say so for the rig.
        try {
          window.dispatchEvent(
            new CustomEvent(END_CEREMONY_EVENT, {
              detail: { beat: "reduced", winner: this.storeWinner() },
            }),
          );
        } catch (e) {
          // no CustomEvent; nothing to announce to
        }
        return;
      }
      const winner = this.storeWinner();
      const cast = this.castCounts();
      if (winner === "good") {
        // FT-1053c: the choreographed reveal — good seats hide their
        // identity NOW (synchronously, before Vue paints the end reveal
        // this same flush), and each seat's ray strike lifts its veil
        this.veilGoodSeats();
      }
      beginCeremony(winner, {
        isMuted: this.$store.state.grimoire.isMuted,
        evilCount: cast.evil,
        goodCount: cast.good,
        anyDeadGood: cast.deadGood > 0,
      });
    },
    /** the verdict phase mounting is when the dressing is measured/cut —
     *  shards off the face geometry, beams/ghosts off the real seat boxes */
    phase(now) {
      if (now !== "verdict") {
        // fade or idle: pending strikes die and every veil lifts — the skip
        // and the settle both land on the fully revealed board
        if (now === "fade" || now === "idle") {
          this.clearNotes();
          this.unveilAll();
          this.warmTaken();
        }
        return;
      }
      if (this.winner === "evil") {
        this.shards = this.cutShards();
        this.buildEvilVerdict();
      } else {
        this.buildGoodVerdict();
      }
    },
  },
  mounted() {
    // a client that mounts INTO a live game (reload mid-game) arms here —
    // the watcher only fires on change, and gameLive may already be true
    if (this.gameLive) this.armed = true;
  },
  beforeDestroy() {
    this.clearNotes();
    this.unveilAll();
    this.warmTaken();
    stopCeremony();
  },
  methods: {
    storeWinner() {
      return this.$store.state.session.winningTeam === "evil" ? "evil" : "good";
    },
    skip() {
      skipCeremony();
    },
    clearNotes() {
      this.noteTimers.forEach(clearTimeout);
      this.noteTimers = [];
    },
    /**
     * THE FACE, CUT INTO TWELVE. Each shard is a full-viewport div wearing
     * the SAME background #app.in-game paints, clipped to one irregular
     * wedge of the dial (polygon points in face-pixels around the measured
     * centre, spoken as calc() off --face-cx/cy so they track the art at
     * every viewport), falling INWARD on its own transform: translate toward
     * the centre, shrink, fade — the dial becomes the hole beneath.
     */
    cutShards() {
      const pt = (angleDeg, r) => {
        const a = (angleDeg * Math.PI) / 180;
        const x = ART_DX + Math.sin(a) * r;
        const y = ART_DY - Math.cos(a) * r;
        return { x, y };
      };
      const cs = (p) =>
        `calc(var(--face-cx) + ${p.x.toFixed(1)} * var(--fpx)) ` +
        `calc(var(--face-cy) + ${p.y.toFixed(1)} * var(--fpx))`;
      const shards = [];
      for (let i = 0; i < 12; i++) {
        const a0 = i * 30 + (Math.random() * 8 - 4);
        const a1 = (i + 1) * 30 + (Math.random() * 8 - 4);
        const mid = (a0 + a1) / 2;
        // apex near (never exactly at) the centre — a jittered break point
        const apex = pt(mid + (Math.random() * 14 - 7), 4 + Math.random() * 26);
        const rim = (t) =>
          SHARD_RIM_MIN + Math.random() * (SHARD_RIM_MAX - SHARD_RIM_MIN) - t;
        const points = [
          apex,
          pt(a0, rim(0)),
          pt(a0 + (a1 - a0) * 0.33, rim(6)),
          pt(a0 + (a1 - a0) * 0.66, rim(6)),
          pt(a1, rim(0)),
        ];
        // the fall: most of the way back toward the centre, in face-pixels
        const centroid = points.reduce(
          (acc, p) => ({ x: acc.x + p.x / 5, y: acc.y + p.y / 5 }),
          { x: 0, y: 0 },
        );
        shards.push({
          clipPath: "polygon(" + points.map(cs).join(", ") + ")",
          // each piece shrinks about ITS OWN centre while it flies — one
          // shared origin made the twelve read as a whole face zooming out
          // rather than shards tumbling in (first-run screenshot)
          transformOrigin: cs(centroid),
          "--ec-dx": (-(centroid.x - ART_DX) * 0.82).toFixed(1),
          "--ec-dy": (-(centroid.y - ART_DY) * 0.82).toFixed(1),
          "--ec-rot": (Math.random() * 50 - 25).toFixed(0) + "deg",
          animationDelay: (0.8 + Math.random() * 0.6).toFixed(2) + "s",
        });
      }
      return shards;
    },
    /** who stands where, team-wise — the counts the sequencer sizes both
     *  verdicts by */
    castCounts() {
      let evil = 0;
      let good = 0;
      let deadGood = 0;
      this.$store.state.players.players.forEach((p) => {
        const team = p.role && p.role.team;
        if (team === "minion" || team === "demon") evil++;
        else if (team === "townsfolk" || team === "outsider") {
          good++;
          if (p.isDead) deadGood++;
        }
      });
      return { evil, good, deadGood };
    },
    /** every seat's li beside its player, in seat order */
    seatRows() {
      const players = this.$store.state.players.players;
      const els = document.querySelectorAll("#townsquare .circle > li");
      return players.map((player, i) => ({ player, li: els[i] || null, i }));
    },
    /**
     * FT-1053b: THE PROCESSION, marshalled. Order is the user's: dead
     * minions first, living minions, the demon(s) last — the crescendo.
     * Minions settle aside into alternating flank slots (inner-out, a
     * shallow arc dipping with distance); whoever comes last holds centre,
     * which is the demon whenever one is seated. Slots/timing in face-px
     * and seconds; the entry keyframe reads them as custom properties.
     * FT-1062: the procession now follows the hunt — `start` arrives from
     * evilSequence (the last coin swallowed), not the fixed 3.2s beat.
     */
    marshalProcession(start) {
      const evil = [];
      this.$store.state.players.players.forEach((p, i) => {
        const team = p.role && p.role.team;
        if (team !== "minion" && team !== "demon") return;
        evil.push({ p, seat: i, demon: team === "demon", dead: !!p.isDead });
      });
      const rank = (e) => (e.demon ? 2 : e.dead ? 0 : 1);
      evil.sort((a, b) => rank(a) - rank(b) || a.seat - b.seat);
      const t = evilProcession(evil.length, start);
      const flanks = [-105, 105, -190, 190, -275, 275, -360, 360];
      let m = 0;
      return evil.map((e, i) => {
        // exactly ONE centre — the last to rise (the demon whenever one is
        // seated; a second demon flanks like a minion rather than stacking)
        const center = i === evil.length - 1;
        const x = center ? 0 : flanks[m++ % flanks.length];
        return {
          key: "proc-" + e.seat,
          role: e.p.role,
          name: e.p.name || `Seat ${e.seat + 1}`,
          dead: e.dead,
          demon: e.demon,
          style: {
            "--px": x.toFixed(0),
            "--py": center ? "0" : (26 + Math.abs(x) * 0.06).toFixed(0),
            "--ps": center ? "1" : "0.78",
            zIndex: center ? 3 : 2,
            animationDelay: (t.start + i * t.stagger).toFixed(2) + "s",
            animationDuration: t.entry.toFixed(2) + "s",
          },
        };
      });
    },
    /**
     * FT-1062: THE DEEP TAKES ITS DUE. One tentacle per good seat (alive and
     * dead alike; travelers stand apart — the hunt takes only townsfolk and
     * outsiders, the same net the good verdict's beams cast). Geometry is
     * measured px, the beams' idiom: the hole centre and one face-pixel come
     * off CSS-owned probes, each seat's coin box off its real li. Every
     * tentacle knows its rise slot (shuffled, FT-1053f's non-marching
     * entrance, compressed for big casts), its lunge vector (rotate/stretch
     * from its own base to its seat's coin — transform-only), and its
     * retraction start (a shared beat plus ~100ms of scatter). The coin
     * proxies (grabs) ride the SAME clock and easing as their tentacle's
     * retraction, so coin and tip travel as one gripped thing.
     */
    buildEvilVerdict() {
      const rows = this.seatRows().filter(({ player }) => {
        const team = player.role && player.role.team;
        return team === "townsfolk" || team === "outsider";
      });
      const seq = evilSequence(rows.length);
      this.procession = this.marshalProcession(seq.procStart);
      const holeEl = this.$refs.holeOrigin;
      const fpxEl = this.$refs.fpxProbe;
      if (!holeEl || !fpxEl || !rows.length) {
        // nothing to hunt (or nothing to measure): hole + procession only
        this.tentacles = [];
        this.grabs = [];
        this.holeStyle = {};
        return;
      }
      const hole = holeEl.getBoundingClientRect();
      const fpx = fpxEl.getBoundingClientRect().width / 100 || 1;
      const artH = 288 * fpx; // one tentacle's unscaled height (see .ec-tent)
      const baseY = hole.top + 76 * fpx; // the wrappers' shared bottom edge
      const targets = [];
      rows.forEach((row) => {
        const el = row.li && (row.li.querySelector(".token") || row.li);
        if (!el) return;
        const box = el.getBoundingClientRect();
        targets.push({
          row,
          box,
          sx: box.left + box.width / 2,
          sy: box.top + box.height / 2,
        });
      });
      // base slots left→right in the order the seats fan around the hole, so
      // the lunges cross each other no more than the circle demands
      targets.sort(
        (a, b) =>
          Math.atan2(a.sx - hole.left, baseY - a.sy) -
          Math.atan2(b.sx - hole.left, baseY - b.sy),
      );
      const n = targets.length;
      // the shuffled rise order — no two fan-neighbours back-to-back by luck,
      // and whoever draws the LAST slot rises biggest (the crescendo the
      // hole's first thump is timed to)
      const order = targets.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const riseSlot = [];
      order.forEach((t, k) => (riseSlot[t] = k));
      const tentacles = [];
      const grabs = [];
      targets.forEach((t, i) => {
        const tx = n > 1 ? -150 + (300 * i) / (n - 1) : 0;
        const bx = hole.left + tx * fpx;
        const dx = t.sx - bx;
        const dy = t.sy - baseY;
        const dist = Math.hypot(dx, dy);
        // the risen lean, outward with the base slot (the old fan's read)
        const lean = (tx / 150) * 14;
        // the strike angle: for a bottom-anchored up-pointing element,
        // rotate(θ) sends the tip along (sinθ, −cosθ) — θ = atan2(dx, −dy),
        // brought within a half-turn of the lean so the sweep is the short way
        let la = (Math.atan2(dx, -dy) * 180) / Math.PI;
        while (la - lean > 180) la -= 360;
        while (la - lean < -180) la += 360;
        const last = riseSlot[i] === n - 1;
        const ts = last ? 1.2 : 0.76 + ((i * 37) % 34) / 100;
        const rt =
          seq.grabAt + seq.holdGrip + Math.random() * seq.retractJitter;
        tentacles.push({
          art: i % 6,
          // past six the assets repeat — mirrored, so the repeat hides
          artStyle: i >= 6 ? { scale: "-1 1" } : undefined,
          style: {
            "--tx": tx.toFixed(0),
            "--ts": ts.toFixed(2),
            "--tr": lean.toFixed(1) + "deg",
            "--td":
              (seq.riseStart + riseSlot[i] * seq.stagger).toFixed(2) + "s",
            "--wa": (2.2 + ((i * 13) % 17) / 10).toFixed(1) + "deg",
            "--wd": (3.3 + ((i * 7) % 16) / 10).toFixed(1) + "s",
            "--wa2": (1.2 + ((i * 11) % 9) / 10).toFixed(1) + "deg",
            "--wd2": (4.9 + ((i * 17) % 21) / 10).toFixed(1) + "s",
            "--la": la.toFixed(1) + "deg",
            "--ls": Math.max(0.4, dist / artH).toFixed(3),
            "--lt": seq.lungeAt.toFixed(2) + "s",
            "--ld": seq.lungeDur.toFixed(2) + "s",
            "--rt": rt.toFixed(2) + "s",
            "--rd": seq.retractDur.toFixed(2) + "s",
          },
        });
        const w = Math.max(36, t.box.width);
        grabs.push({
          key: "grab-" + t.row.i,
          role: t.row.player.role,
          style: {
            left: (t.sx - w / 2).toFixed(0) + "px",
            top: (t.sy - w / 2).toFixed(0) + "px",
            width: w.toFixed(0) + "px",
            height: w.toFixed(0) + "px",
            "--gdx": (bx - t.sx).toFixed(0),
            "--gdy": (baseY - t.sy).toFixed(0),
            "--gt": seq.grabAt.toFixed(2) + "s",
            "--rt": rt.toFixed(2) + "s",
            "--rd": seq.retractDur.toFixed(2) + "s",
          },
        });
        // the seat goes cold the moment its coin is torn away
        this.noteTimers.push(
          setTimeout(
            () => {
              if (t.row.li) {
                t.row.li.classList.add("ec-taken");
                this.takenEls.push(t.row.li);
              }
            },
            Math.round(rt * 1000),
          ),
        );
      });
      this.tentacles = tentacles;
      this.grabs = grabs;
      this.holeStyle = {
        "--ec-ripple-at":
          (seq.riseStart + (n - 1) * seq.stagger + 0.35).toFixed(2) + "s",
        "--ec-swallow-at": (seq.swallowAt - 0.2).toFixed(2) + "s",
      };
    },
    /**
     * FT-1053c: THE DAWN FINDS EACH OF THE GOOD. One measured beam per good
     * seat — dawn point to the seat's real coin box — alive seats first,
     * then the dead; each beam brings one toll (rayToll) as it leaves, its
     * whole animation exactly the toll's length; the seat's veil lifts (the
     * choreographed reveal) at the beam's LANDING; a dead seat's ghost
     * ascends a beat after its strike.
     */
    buildGoodVerdict() {
      const isMuted = this.$store.state.grimoire.isMuted;
      const rows = this.seatRows().filter(({ player }) => {
        const team = player.role && player.role.team;
        return team === "townsfolk" || team === "outsider";
      });
      const order = [
        ...rows.filter((r) => !r.player.isDead),
        ...rows.filter((r) => r.player.isDead),
      ];
      const t = goodSequence(
        order.length,
        order.some((r) => r.player.isDead),
      );
      const probe = this.$refs.dawnOrigin;
      const o = probe
        ? probe.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: 0 };
      const beams = [];
      const ghosts = [];
      order.forEach((row, i) => {
        const el = row.li && (row.li.querySelector(".token") || row.li);
        if (!el) return;
        const box = el.getBoundingClientRect();
        const sx = box.left + box.width / 2;
        const sy = box.top + box.height / 2;
        const dx = sx - o.left;
        const dy = sy - o.top;
        const len = Math.hypot(dx, dy);
        // a div hanging from the dawn point, rotated so its far end lands on
        // the seat: for rotate(θ) about top-centre, (0, len) → (−sinθ·len,
        // cosθ·len), so θ = atan2(−dx, dy)
        const rot = (Math.atan2(-dx, dy) * 180) / Math.PI;
        const w = Math.max(24, box.width * 0.7);
        const delay = t.start + i * t.cadence;
        beams.push({
          left: (o.left - w / 2).toFixed(0) + "px",
          top: o.top.toFixed(0) + "px",
          width: w.toFixed(0) + "px",
          height: len.toFixed(0) + "px",
          "--ba": rot.toFixed(2) + "deg",
          animationDelay: delay.toFixed(2) + "s",
          animationDuration: t.rayDur.toFixed(2) + "s",
        });
        // the toll leaves with the beam; the veil lifts when the beam lands
        this.noteTimers.push(
          setTimeout(() => rayToll(i, isMuted), Math.round(delay * 1000)),
        );
        this.noteTimers.push(
          setTimeout(
            () => row.li && row.li.classList.remove("ec-unstruck"),
            Math.round((delay + t.rayLand) * 1000),
          ),
        );
        if (row.player.isDead) {
          ghosts.push({
            left: sx.toFixed(0) + "px",
            top: box.top.toFixed(0) + "px",
            height: Math.max(48, box.height * 0.9).toFixed(0) + "px",
            animationDelay: (delay + t.ghostLag).toFixed(2) + "s",
          });
        }
      });
      this.beams = beams;
      this.ghosts = ghosts;
    },
    /** FT-1053c: the good seats hold their pre-verdict face until their ray
     *  lands — the veil is a class on the seat's own li */
    veilGoodSeats() {
      this.veiledEls = [];
      this.seatRows().forEach(({ player, li }) => {
        const team = player.role && player.role.team;
        if (!li || (team !== "townsfolk" && team !== "outsider")) return;
        li.classList.add("ec-unstruck");
        this.veiledEls.push(li);
      });
    },
    /** every veil lifts — the skip's, the settle's and the unmount's floor:
     *  whatever happens, the board ends fully revealed */
    unveilAll() {
      this.veiledEls.forEach((li) => li.classList.remove("ec-unstruck"));
      this.veiledEls = [];
    },
    /** FT-1062: every taken seat warms back up — the skip's, the settle's and
     *  the unmount's floor, the unveil's mirror on the evil side */
    warmTaken() {
      this.takenEls.forEach((li) => li.classList.remove("ec-taken"));
      this.takenEls = [];
    },
  },
};
</script>

<style scoped lang="scss">
// FT-1280: for `face-disc-gate` and `face-disc-frame` — the app's own plate,
// the one the build panel and the night checklist stand on. Definitions only;
// this file emits no rules of its own, so importing it costs nothing.
@import "../faceDisc.scss";

/* ── THE CEREMONY OVERLAY ──────────────────────────────────────────────────
   z-index 85: over the town, the readout and the strip (#controls is 75), so
   the veil genuinely quiets the working UI — and under EndGameOverlay (90)
   and the vote-history/edition modals (100+), none of which are up when this
   plays. The root takes THE ONE CLICK (skip); during the fade the pointer is
   released so the settled town is immediately live again. */
#end-ceremony {
  position: absolute;
  inset: 0;
  z-index: 85;
  overflow: hidden;
  cursor: pointer;
  /* the dial's measured centre — the same -11,-20 face-pixel correction the
     hands carry (FaceHands.vue's measurement block) */
  --ec-cx: calc(var(--face-cx) + -11 * var(--fpx));
  --ec-cy: calc(var(--face-cy) + -20 * var(--fpx));

  &.ec-fade {
    pointer-events: none;
    /* everything the ceremony painted lets go together — but only the show:
       the verdict banner (a sibling of .ec-show) stands through the settle */
    .ec-show {
      opacity: 0;
      transition: opacity 1.05s ease-out;
    }
  }
  /* FT-1053d: the standing state — the show is gone, only the banner
     remains, and the settled town underneath is fully live */
  &.ec-idle {
    pointer-events: none;
    cursor: default;
  }
}

.ec-show {
  position: absolute;
  inset: 0;
}

/* the held breath — darkness soaks in over one long beat */
.ec-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at var(--ec-cx) var(--ec-cy),
    rgba(4, 4, 10, 0.42) 0%,
    rgba(3, 3, 8, 0.66) 70%,
    rgba(2, 2, 6, 0.8) 100%
  );
  opacity: 0;
  animation: ec-veil-in 1.1s ease-out 0.05s forwards;
}
@keyframes ec-veil-in {
  to {
    opacity: 1;
  }
}

/* ══ EVIL ══════════════════════════════════════════════════════════════════ */

/* the dark hole the face leaves behind — revealed as the shards fall */
.ec-hole {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: calc(540 * var(--fpx));
  height: calc(540 * var(--fpx));
  margin: calc(-270 * var(--fpx)) 0 0 calc(-270 * var(--fpx));
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #010103 0%,
    #030208 44%,
    #08040e 58%,
    rgba(8, 4, 14, 0.55) 66%,
    transparent 72%
  );
  opacity: 0;
  /* FT-1053f's thump, re-clocked by FT-1062: the ripple lands with the LAST
     riser's whip overshoot and a second, bigger thump marks the swallow (the
     tentacles plunging under with their prizes) — both times measured inline
     (holeStyle), transform-only, held state unaffected after */
  animation:
    ec-fade-in 0.9s ease-out 0.75s forwards,
    ec-hole-ripple 0.55s ease-out var(--ec-ripple-at, 3.85s) 1,
    ec-hole-swallow 0.6s ease-out var(--ec-swallow-at, 999s) 1;
}
@keyframes ec-fade-in {
  to {
    opacity: 1;
  }
}
@keyframes ec-hole-ripple {
  0% {
    transform: scale(1);
  }
  38% {
    transform: scale(1.045);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes ec-hole-swallow {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.07);
  }
  100% {
    transform: scale(1);
  }
}

/* the hairline crack — a lit fissure racing across the dial, then gone into
   the shatter it caused */
.ec-crack {
  position: absolute;
  left: calc(var(--ec-cx) - 250 * var(--fpx));
  top: var(--ec-cy);
  width: calc(500 * var(--fpx));
  height: calc(3 * var(--fpx));
  transform-origin: left center;
  rotate: -24deg;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 120, 90, 0.9) 12%,
    #fff3e0 50%,
    rgba(255, 120, 90, 0.9) 88%,
    transparent 100%
  );
  filter: drop-shadow(0 0 6px rgba(255, 100, 60, 0.85));
  transform: scaleX(0);
  animation: ec-crack-race 1.15s cubic-bezier(0.7, 0, 0.3, 1) 0.15s forwards;
}
@keyframes ec-crack-race {
  0% {
    transform: scaleX(0);
    opacity: 1;
  }
  32% {
    transform: scaleX(1);
    opacity: 1;
  }
  70% {
    transform: scaleX(1);
    opacity: 0.9;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

/* THE SHARDS — the real dial art, re-painted and cut. Same image, same
   position and size rules as #app.in-game's own background (App.vue), so
   before they move the pieces sit pixel-on-pixel over the face they were cut
   from; brightness matches the veil so the cut is invisible until it falls. */
.ec-shards {
  position: absolute;
  inset: 0;
  opacity: 0;
  animation: ec-fade-in 0.35s ease-out 0.45s forwards;
}
.ec-shard {
  position: absolute;
  inset: 0;
  background: #0b0d12 url("../assets/background-clocktower-blank-centered.png");
  background-position: calc(50% + 7px + var(--bg-off-x, 0px))
    calc(50% + var(--bg-off-y, 0px));
  background-size: auto calc(max(100vh, 100vw / 1.8244) + var(--bg-h, 0px));
  filter: brightness(0.62);
  animation: ec-shard-fall 2s cubic-bezier(0.55, 0, 0.85, 0.4) forwards;
  will-change: transform, opacity;
}
@keyframes ec-shard-fall {
  0% {
    transform: none;
    opacity: 1;
  }
  100% {
    transform: translate(
        calc(var(--ec-dx) * var(--fpx)),
        calc(var(--ec-dy) * var(--fpx))
      )
      scale(0.1) rotate(var(--ec-rot));
    opacity: 0;
  }
}

/* THE TENTACLES (FT-1053d, red + whip FT-1053f) — painted things from the
   deep, not shapes. Each wrapper carries placement (a face-pixel x offset, a
   lean, a scale, its own arrival time) plus its OWN sway amplitude/period;
   the art (end-tentacle-*.svg: blood-red gradient body, hot ember rim light,
   suckers, turbulence-roughened edges) adds a slower counter-sway of its
   own, so the two composed rotations undulate non-uniformly — transform/
   opacity only, the SVG filters are static.
   FT-1053f: the six no longer rise together — each WHIPS up fast, overshoots
   past its resting height, recoils below it, then settles into the same
   sway as before (ec-tent-whip replaces ec-tent-rise; the wiggle/sway
   keyframes are untouched, only their start time moved to the whip's end). */
.ec-tentacles {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: 0;
  height: 0;
}
.ec-tent {
  position: absolute;
  left: calc(var(--tx) * var(--fpx));
  bottom: calc(-76 * var(--fpx));
  width: calc(106 * var(--fpx));
  height: calc(288 * var(--fpx));
  margin-left: calc(-53 * var(--fpx));
  transform-origin: bottom center;
  rotate: var(--tr);
  transform: translateY(92%) scale(calc(var(--ts) * 0.7));
  opacity: 0;
  /* the deep's own light: a dark-red occlusion glow, matching the art's own
     palette (the drop-shadow reads the art's alpha, suckers and all) */
  filter: drop-shadow(0 0 10px rgba(60, 10, 10, 0.7));
  /* FT-1062: four movements, one element — whip up (FT-1053f), sway, LUNGE
     (all tentacles share one --lt), RETRACT (each its own --rt, jittered).
     List order is priority: whichever is running latest in the list owns the
     transform, so the sway hands off to the lunge and the lunge to the drag
     with no extra state. The lunge/retract keyframes drive the independent
     `rotate` property too — the sweep from the risen lean to the strike
     vector interpolates there, on top of the in-transform scale work. */
  animation:
    ec-tent-whip 0.75s cubic-bezier(0.3, 0.55, 0.25, 1) var(--td) forwards,
    ec-tent-wiggle var(--wd, 3.4s) ease-in-out calc(var(--td) + 0.75s) infinite
      alternate,
    ec-tent-lunge var(--ld, 0.6s) cubic-bezier(0.7, 0, 0.2, 1) var(--lt, 999s)
      forwards,
    ec-tent-retract var(--rd, 0.95s) cubic-bezier(0.55, 0, 0.75, 0.5)
      var(--rt, 999s) forwards;
  will-change: transform, opacity;
}
.ec-tent-art {
  width: 100%;
  height: 100%;
  display: block;
  transform-origin: 50% 96%;
  animation: ec-tent-sway var(--wd2, 5.5s) ease-in-out calc(var(--td) + 1.15s)
    infinite alternate;
}
/* the whip: a fast rise that flings past its resting height, recoils below
   it, then settles — one continuous transform/opacity run per tentacle,
   staggered entirely by each wrapper's own --td (see tentacles() above) */
@keyframes ec-tent-whip {
  0% {
    transform: translateY(92%) scale(calc(var(--ts) * 0.7));
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  46% {
    /* the strike — past the rest height, the tip flung highest */
    transform: translateY(-7%) scale(calc(var(--ts) * 1.1)) rotate(-4deg);
    opacity: 1;
  }
  68% {
    /* the recoil — dips back below rest before settling */
    transform: translateY(10%) scale(calc(var(--ts) * 0.96)) rotate(2deg);
  }
  86% {
    transform: translateY(1%) scale(calc(var(--ts) * 1.015));
  }
  100% {
    transform: translateY(4%) scale(var(--ts));
    opacity: 1;
  }
}
@keyframes ec-tent-wiggle {
  from {
    transform: translateY(4%) scale(var(--ts))
      rotate(calc(var(--wa, 3deg) * -1)) skewX(-1.5deg);
  }
  to {
    transform: translateY(2%) scale(var(--ts)) rotate(var(--wa, 3deg))
      skewX(1.5deg);
  }
}
@keyframes ec-tent-sway {
  from {
    transform: rotate(calc(var(--wa2, 1.5deg) * -1));
  }
  to {
    transform: rotate(var(--wa2, 1.5deg));
  }
}
/* FT-1062 THE REACH: a beat of anticipation (the crouch back toward the
   hole), then the strike — the whole body rotates onto its seat vector and
   stretches until the tip lands on the coin box (--ls is measured seat
   distance over the art's height; scaleX thins the stretched body). */
@keyframes ec-tent-lunge {
  0% {
    rotate: var(--tr);
    transform: translateY(4%) scale(var(--ts));
  }
  26% {
    rotate: var(--tr);
    transform: translateY(15%) scale(calc(var(--ts) * 0.9));
  }
  100% {
    rotate: var(--la, 0deg);
    transform: scaleY(var(--ls, 1)) scaleX(calc(var(--ts) * 0.8));
  }
}
/* FT-1062 THE DRAG: the tentacle hauls its prize home along the same vector
   — scaleY collapsing toward the hole, thickening as it shortens, gone under
   at the end. The grab's keyframes (ec-grab-drag) mirror these fractions
   exactly, so the coin rides the tip. */
@keyframes ec-tent-retract {
  0% {
    rotate: var(--la, 0deg);
    transform: scaleY(var(--ls, 1)) scaleX(calc(var(--ts) * 0.8));
    opacity: 1;
  }
  60% {
    rotate: var(--la, 0deg);
    transform: scaleY(calc(var(--ls, 1) * 0.4)) scaleX(calc(var(--ts) * 0.9));
    opacity: 1;
  }
  85% {
    rotate: var(--la, 0deg);
    transform: scaleY(calc(var(--ls, 1) * 0.12)) scaleX(calc(var(--ts) * 0.95));
    opacity: 1;
  }
  100% {
    rotate: var(--la, 0deg);
    transform: scaleY(calc(var(--ls, 1) * 0.05)) scaleX(var(--ts));
    opacity: 0;
  }
}

/* the red wash */
.ec-redwash {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at var(--ec-cx) var(--ec-cy),
    rgba(120, 8, 8, 0.34) 0%,
    rgba(70, 4, 10, 0.22) 55%,
    rgba(40, 0, 8, 0.12) 100%
  );
  opacity: 0;
  animation: ec-fade-in 1.4s ease-in 2.7s forwards;
}

/* FT-1062: THE PRIZES — one proxy coin per hunted seat (the seat's real
   Token), popping into the tentacle's grip at tip-arrival (--gt), then
   dragged along the seat→base vector (--gdx/--gdy, measured px) on the SAME
   clock and easing as its tentacle's retraction — coin and tip travel as one
   gripped thing, the coin shrinking and darkening as it goes under. */
.ec-grabs {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.ec-grab {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  filter: drop-shadow(0 0 10px rgba(140, 16, 16, 0.6));
  animation:
    ec-grab-seize 0.14s ease-out var(--gt, 999s) forwards,
    ec-grab-drag var(--rd, 0.95s) cubic-bezier(0.55, 0, 0.75, 0.5)
      var(--rt, 999s) forwards;
  will-change: transform, opacity;

  .token {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
}
/* the seizure: the coin jolts into the grip */
@keyframes ec-grab-seize {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    opacity: 1;
    transform: scale(1.12);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
/* the drag home — fractions mirror ec-tent-retract's scaleY collapse
   (translate fraction = 1 − scale fraction), so the coin tracks the tip */
@keyframes ec-grab-drag {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
    filter: brightness(1);
  }
  60% {
    transform: translate(
        calc(var(--gdx, 0) * 0.6px),
        calc(var(--gdy, 0) * 0.6px)
      )
      scale(0.55);
    opacity: 1;
    filter: brightness(0.55);
  }
  85% {
    transform: translate(
        calc(var(--gdx, 0) * 0.88px),
        calc(var(--gdy, 0) * 0.88px)
      )
      scale(0.25);
    opacity: 1;
    filter: brightness(0.3);
  }
  100% {
    transform: translate(
        calc(var(--gdx, 0) * 0.95px),
        calc(var(--gdy, 0) * 0.95px)
      )
      scale(0.12);
    opacity: 0;
    filter: brightness(0.2);
  }
}

/* FT-1053b: THE PROCESSION — each evil figure rises from the hole to
   centre-stage (coin + name plate), holds its moment, then settles aside to
   its flank slot as the next rises; the LAST figure (the demon) ends centre.
   One keyframe serves every figure: the flank slot rides custom properties,
   and the centre figure's slot is simply 0,0 — "slide to centre" is "stay". */
.ec-procession {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: 0;
  height: 0;
}
.ec-proc {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--pw, 120) * var(--fpx));
  margin-left: calc(var(--pw, 120) / -2 * var(--fpx));
  margin-top: calc(var(--pw, 120) / -2 * var(--fpx));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(5 * var(--fpx));
  /* the ceremony's one click is SKIP — the coins are pictures here, and
     Token's own click handler must never fire from inside the show */
  pointer-events: none;
  font-size: calc(12 * var(--fpx));
  filter: drop-shadow(0 0 12px rgba(140, 16, 16, 0.65));
  opacity: 0;
  transform: translateY(calc(80 * var(--fpx))) scale(0.45);
  animation: ec-proc-enter cubic-bezier(0.25, 0.7, 0.3, 1) forwards;
  will-change: transform, opacity;

  .token {
    width: calc(var(--pw, 120) * var(--fpx));
    height: calc(var(--pw, 120) * var(--fpx));
    pointer-events: none;
  }
}
/* the crescendo wears more: a bigger coin, a hotter halo */
.ec-proc-demon {
  --pw: 150;
  font-size: calc(15 * var(--fpx));
  filter: drop-shadow(0 0 18px rgba(160, 20, 20, 0.8))
    drop-shadow(0 0 46px rgba(120, 10, 10, 0.5));
}
/* a dead minion rises anyway — but wears its death */
.ec-proc-dead .token {
  filter: grayscale(0.45) brightness(0.82);
}
.ec-proc-dead .ec-proc-name {
  opacity: 0.7;
}
/* the seat plate idiom (Player.vue's .name: dark plate, black border, soft
   shadow), team-tinted for the occasion */
.ec-proc-name {
  max-width: calc(170 * var(--fpx));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  background: rgba(0, 0, 0, 0.65);
  border: 2px solid rgba(60, 0, 0, 0.9);
  border-radius: 10px;
  box-shadow: 0 0 5px black;
  padding: calc(1 * var(--fpx)) calc(9 * var(--fpx));
}
@keyframes ec-proc-enter {
  0% {
    transform: translateY(calc(80 * var(--fpx))) scale(0.45);
    opacity: 0;
  }
  25% {
    transform: translate(0, 0) scale(1.03);
    opacity: 1;
  }
  55% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(
        calc(var(--px, 0) * var(--fpx)),
        calc(var(--py, 0) * var(--fpx))
      )
      scale(var(--ps, 1));
    opacity: 1;
  }
}

/* ══ GOOD ══════════════════════════════════════════════════════════════════ */

/* FT-1053d: the horizon GLOW — a warm dome breathing around the dawn line
   (gold core, a dusky rose spill wider and fainter), screen-blended so it
   lights the face art instead of painting over it. Static after its fade. */
.ec-dawn-sky {
  position: absolute;
  left: calc(var(--ec-cx) - 420 * var(--fpx));
  top: calc(var(--ec-cy) - 520 * var(--fpx));
  width: calc(840 * var(--fpx));
  height: calc(480 * var(--fpx));
  /* every gradient reaches full transparency INSIDE its box — an ellipse
     larger than the box clips into a hard-edged plate (first-run frame) */
  background: radial-gradient(
      ellipse 30% 34% at 50% 54%,
      rgba(255, 238, 190, 0.5) 0%,
      rgba(255, 205, 130, 0.22) 52%,
      transparent 78%
    ),
    radial-gradient(
      ellipse 44% 48% at 50% 54%,
      rgba(226, 120, 90, 0.18) 0%,
      transparent 74%
    );
  mix-blend-mode: screen;
  opacity: 0;
  animation: ec-fade-in 1.7s ease-out 0.15s forwards;
}

/* the thin dawn line along the top of the face */
.ec-dawn {
  position: absolute;
  left: calc(var(--ec-cx) - 270 * var(--fpx));
  top: calc(var(--ec-cy) - 262 * var(--fpx));
  width: calc(540 * var(--fpx));
  height: calc(4 * var(--fpx));
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 226, 160, 0.85) 30%,
    #fff6dc 50%,
    rgba(255, 226, 160, 0.85) 70%,
    transparent 100%
  );
  filter: blur(1px) drop-shadow(0 0 10px rgba(255, 220, 150, 0.8));
  transform: scaleX(0.1);
  opacity: 0;
  animation: ec-dawn-in 0.9s ease-out 0.2s forwards;
}
@keyframes ec-dawn-in {
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* the light — beams fanned from above the dial, sweeping down over it.
   screen-blended, transform+opacity only. */
/* FT-1053c: the dawn point, measurable — the beams' shared origin. JS reads
   this 0×0 box's resolved position; CSS keeps sole ownership of the calc. */
.ec-dawn-origin {
  position: absolute;
  left: var(--ec-cx);
  top: calc(var(--ec-cy) - 262 * var(--fpx));
  width: 0;
  height: 0;
  pointer-events: none;
}
/* FT-1062: the hunt's probes, same idiom — the hole centre (the tentacles'
   shared root) and one face-pixel × 100, both read by buildEvilVerdict */
.ec-hole-origin {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: 0;
  height: 0;
  pointer-events: none;
}
.ec-fpx-probe {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(100 * var(--fpx));
  height: 0;
  visibility: hidden;
  pointer-events: none;
}
/* the beams — one per good seat, geometry set inline (measured px). Each
   hangs from the dawn point, rotated so its far end lands ON its seat; the
   animation is exactly one toll long (SINGLE_TOLL_SEC): the sweep reaches
   the seat ~30% in (the strike — the reveal moment), then the beam holds
   and dims with the bell's decay. */
.ec-beams {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
}
.ec-beam {
  position: absolute;
  transform-origin: top center;
  rotate: var(--ba, 0deg);
  transform: scaleY(0);
  opacity: 0;
  animation-name: ec-beam-strike;
  animation-timing-function: cubic-bezier(0.3, 0.5, 0.25, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
/* FT-1053d: the beam's BODY — a taper-clipped shaft (narrow at the dawn
   point, opening toward the seat) with a warm chromatic cross-section: a
   near-white gold core falling away through pale amber fringes. The clip
   also crops the streaming/mote children to the shaft's shape. */
.ec-beam-shaft {
  position: absolute;
  inset: 0;
  overflow: hidden;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  background: linear-gradient(
      90deg,
      rgba(255, 190, 120, 0) 0%,
      rgba(255, 196, 125, 0.14) 22%,
      rgba(255, 238, 196, 0.34) 44%,
      rgba(255, 250, 228, 0.44) 50%,
      rgba(255, 238, 196, 0.34) 56%,
      rgba(255, 196, 125, 0.14) 78%,
      rgba(255, 190, 120, 0) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 240, 200, 0.05) 0%,
      rgba(255, 236, 185, 0.2) 30%,
      rgba(255, 232, 175, 0.16) 68%,
      rgba(255, 246, 215, 0.42) 88%,
      rgba(255, 246, 215, 0) 100%
    );
  filter: blur(0.6px);
}
/* internal streaking — long noise-modulated bands streaming DOWN the shaft
   (the light's direction). The band pattern repeats every 10% of the double-
   height layer and the loop translates exactly five periods, so the stream
   is seamless; a static turbulence mask breaks the bands into volume. */
.ec-beam-streaks {
  position: absolute;
  left: 0;
  top: -100%;
  width: 100%;
  height: 200%;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 246, 215, 0) 0%,
    rgba(255, 246, 215, 0.17) 2.4%,
    rgba(255, 246, 215, 0.02) 4.4%,
    rgba(255, 250, 230, 0.12) 7.2%,
    rgba(255, 246, 215, 0) 10%
  );
  mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.045 0.008' numOctaves='3' seed='7'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.85 0 0 0 0.15'/></filter><rect width='140' height='420' filter='url(%23n)'/></svg>");
  mask-size: 100% 50%;
  animation: ec-beam-stream 5.5s linear infinite;
  animation-delay: inherit;
  will-change: transform;
}
@keyframes ec-beam-stream {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(50%);
  }
}
/* dust motes drifting UP inside the beam — few, small, blurred; one drift
   per toll (duration inherited from the beam) */
.ec-beam-motes {
  position: absolute;
  left: 0;
  top: 26%;
  width: 100%;
  height: 74%;
  background: radial-gradient(
      circle 2.6px at 32% 18%,
      rgba(255, 250, 230, 0.9),
      transparent 70%
    ),
    radial-gradient(
      circle 2px at 58% 42%,
      rgba(255, 244, 215, 0.8),
      transparent 70%
    ),
    radial-gradient(
      circle 3px at 47% 66%,
      rgba(255, 250, 235, 0.85),
      transparent 70%
    ),
    radial-gradient(
      circle 1.8px at 66% 82%,
      rgba(255, 240, 210, 0.7),
      transparent 70%
    ),
    radial-gradient(
      circle 2.2px at 38% 90%,
      rgba(255, 248, 225, 0.75),
      transparent 70%
    );
  filter: blur(0.9px);
  opacity: 0;
  transform: translateY(14%);
  animation-name: ec-beam-motes-drift;
  animation-duration: inherit;
  animation-delay: inherit;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
@keyframes ec-beam-motes-drift {
  0% {
    transform: translateY(14%);
    opacity: 0;
  }
  34% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.55;
  }
  100% {
    transform: translateY(-16%);
    opacity: 0;
  }
}
/* the impact bloom — a radial flare popping ON the coin at the strike beat
   (the beam's 30% keyframe = rayLand), opening with a brief overexposure
   kiss, then settling to a held halo for the toll's decay. It sits OUTSIDE
   the shaft clip so the flare can spill past the taper. */
.ec-beam-bloom {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 210%;
  height: 30%;
  translate: -50% 50%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(255, 255, 250, 1) 0%,
    rgba(255, 244, 200, 0.6) 30%,
    rgba(255, 214, 140, 0.24) 60%,
    transparent 100%
  );
  transform: scale(0.15);
  opacity: 0;
  animation-name: ec-beam-bloom-pop;
  animation-duration: inherit;
  animation-delay: inherit;
  animation-timing-function: cubic-bezier(0.3, 0.6, 0.3, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
@keyframes ec-beam-bloom-pop {
  0%,
  25% {
    transform: scale(0.15);
    opacity: 0;
  }
  30% {
    /* the strike: the reveal's overexposure kiss */
    transform: scale(1.28);
    opacity: 1;
  }
  40% {
    transform: scale(0.95);
    opacity: 0.75;
  }
  70% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.06);
    opacity: 0.4;
  }
}
@keyframes ec-beam-strike {
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  8% {
    opacity: 0.9;
  }
  30% {
    /* the strike lands — rayLand: ~1.2s of the 3.98s toll */
    transform: scaleY(1);
    opacity: 0.9;
  }
  70% {
    transform: scaleY(1);
    opacity: 0.55;
  }
  100% {
    /* held glow, dimming with the bell's decay */
    transform: scaleY(1);
    opacity: 0.35;
  }
}

/* a dead good player's cowled ghost, rising from their own seat into the
   rays — the seat's ghost art, ascending */
.ec-ghost {
  position: absolute;
  transform: translate(-50%, 0);
  opacity: 0;
  filter: drop-shadow(0 0 12px rgba(210, 230, 255, 0.55));
  animation: ec-ghost-rise 2.8s cubic-bezier(0.3, 0.1, 0.3, 1) forwards;
  will-change: transform, opacity;
}
@keyframes ec-ghost-rise {
  0% {
    transform: translate(-50%, 0) scale(0.9);
    opacity: 0;
  }
  18% {
    opacity: 0.95;
  }
  70% {
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -46vh) scale(1.05);
    opacity: 0;
  }
}

/* ══ THE FACE DISC (FT-1280) ═════════════════════════════════════
   The user's ordering, top to bottom: the verdict banner, then THE DISC, then
   everything else on the clock face.

   IT IS THE APP'S OWN PLATE, not a picture of one. The first pass of this rule
   read "the disc" as the carved dial in the art and rebuilt that — the same
   background, clipped to a circle — which put the right pixels in the right
   place and looked like nothing at all had happened ("not seeing the disk
   behind evil wins?"). Of course it didn't: a clone of the page's own paint,
   registered on the page's own paint, is invisible by construction. What the
   user was pointing at is the dark glass plate the Script-setup panel stands
   on, and that is a MATERIAL this app already owns.

   SO IT IS THE MIXIN, and the same one HostTools calls. `face-disc-frame`
   (src/faceDisc.scss) is geometry + material in one include: it positions the
   plate on `--face-cx/--face-cy` with the town map's own bake, sizes it off
   `--face-r`, and finishes with `face-disc-plate` — the backdrop blur, the two
   facing bevels, the plum hairline and the bronze thread that seats it on the
   dial's painted rim. Taking the default geometry is the point: `$face-disc-
   geo-town` is what the build panel and the night checklist take, so this is
   not a plate LIKE theirs, it is theirs.

   NOTHING ABOUT THE PLATE IS RESTATED HERE. No radius, no centre, no border,
   no shadow — hand-rolling a circle with a rim is exactly the drift that file
   exists to end, and it would also mean this plate stopped tracking the panel's
   the next time the geometry moved. Everything below the include is what makes
   it a LAYER rather than a panel: where it stands in the stack, and the fact
   that it never takes a click.

   THE GATE COMES WITH IT. Every disc in the app opens with `face-disc-gate`,
   because below it — a phone, a small window — the surfaces are ordinary
   rectangles and there is no disc at all. There is no rectangle to fall back
   to here: the verdict simply stands on the art, exactly as it did before this
   existed.

   THE ORDER falls out of the parent. `#end-ceremony` is z-index 85 and forms
   its own stacking context, so `z-index: 5` clears the readout (`ul.info`,
   z 2), the script emblem and the count rows inside it, the splat and the dial
   stains (z 0), the hands (z 0) and the seat ring (auto) in one move — no
   z-index anywhere else is touched. `.ec-banner`'s 10 keeps the verdict on top.

   WHAT THE ORDER COSTS, and it is the user's to keep or undo: everything the
   face carried is now UNDER the glass. It is glass, so they are not erased —
   the plate's own `brightness(0.34)` takes them down to about a third and the
   blur softens their edges, which is what stops the script emblem competing
   with the lettering. Nothing is hidden by a rule and nothing left the DOM;
   past the plate's rim every one of them still paints exactly as before.

   UP EXACTLY WHEN THE BANNER IS (`bannerOn` — the settle and the standing
   verdict), so the shatter, the hunt and the procession all still play against
   the real face. */
.ec-face-disc {
  z-index: 5;
  /* the ceremony's one click is SKIP, and the root takes it — a plate laid
     over the whole dial must not be what swallows it */
  pointer-events: none;

  @include face-disc-gate {
    @include face-disc-frame;
  }
}

/* ══ THE VERDICT BANNER (FT-1053d) ═════════════════════════════════════════
   "GOOD WINS" / "EVIL WINS", loud — the app's display voice (PiratesBay, the
   entry page's tower lettering), sized to the face, hung above its centre so
   the procession's coins and the centre stats stay readable beneath it.
   Topmost in the ceremony's own stack; pointer-transparent. */
.ec-banner {
  position: absolute;
  left: var(--ec-cx);
  /* FT-1053e (user): dead centre of the clock face, not hung above it */
  top: var(--ec-cy);
  width: 0;
  height: 0;
  z-index: 10;
  pointer-events: none;
}
.ec-banner-text {
  position: absolute;
  translate: -50% -50%;
  display: flex;
  align-items: center;
  gap: calc(14 * var(--fpx));
  white-space: nowrap;
  font-family: PiratesBay, sans-serif;
  /* FT-1053e: the SMALL result line's own composition, made big — glyph +
     mixed-case "Evil wins", not the shouted uppercase. */
  font-size: calc(68 * var(--fpx));
  line-height: 1;
  letter-spacing: calc(3 * var(--fpx));
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  transform: scale(1.6);
  opacity: 0;
  animation: ec-banner-in 0.95s cubic-bezier(0.22, 0.9, 0.3, 1.05) forwards;
  will-change: transform, opacity;
}
/* FT-1053e: the glyph rides the line at cap height, outside the text's
   background-clip (an img keeps its own colors + drop shadow). */
.ec-banner-glyph {
  /* FT-1058b (user): the good glyph was squished — the team art is wider
     than tall, so the box fixes HEIGHT and lets width follow the art. */
  height: calc(56 * var(--fpx));
  width: auto;
  filter: drop-shadow(
    0 calc(2 * var(--fpx)) calc(4 * var(--fpx)) rgba(0, 0, 0, 0.8)
  );
}
/* arriving with presence: oversized and gone → lands with a settle bounce */
@keyframes ec-banner-in {
  0% {
    transform: scale(1.6);
    opacity: 0;
  }
  55% {
    transform: scale(0.97);
    opacity: 1;
  }
  78% {
    transform: scale(1.025);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
/* GOOD: dawn-gold lettering with a warm halo and a cold blue under-glow */
.ec-banner-good .ec-banner-text {
  background-image: linear-gradient(
    180deg,
    #fffbe8 0%,
    #ffeaa9 34%,
    #eab659 62%,
    #a5762c 100%
  );
  filter: drop-shadow(0 0 calc(12 * var(--fpx)) rgba(255, 220, 140, 0.55))
    drop-shadow(0 0 calc(34 * var(--fpx)) rgba(120, 170, 255, 0.3))
    drop-shadow(
      0 calc(2 * var(--fpx)) calc(2 * var(--fpx)) rgba(30, 16, 0, 0.85)
    );
}
/* EVIL: blood lettering out of the red wash, dark-cored */
.ec-banner-evil .ec-banner-text {
  background-image: linear-gradient(
    180deg,
    #ffd9c9 0%,
    #ff7a56 30%,
    #bb1e12 62%,
    #4a0505 100%
  );
  filter: drop-shadow(0 0 calc(12 * var(--fpx)) rgba(255, 60, 30, 0.5))
    drop-shadow(0 0 calc(36 * var(--fpx)) rgba(120, 6, 6, 0.55))
    drop-shadow(0 calc(2 * var(--fpx)) calc(2 * var(--fpx)) rgba(0, 0, 0, 0.9));
}
/* motion-reduced clients get the verdict, not the entrance */
@media (prefers-reduced-motion: reduce) {
  .ec-banner-text {
    animation: none;
    transform: none;
    opacity: 1;
  }
}
</style>

<!-- ── THE CEREMONY'S REACH BEYOND ITS OWN BOX (deliberately unscoped) ──────
     Seat-level dressing and the hands' spin discipline. The phase classes ride
     #app's own root class binding (App.vue reads ceremonyState), and the seats
     already wear their team as a class (Player.vue puts player.role.team on
     .player) — at the end the roles are revealed on every client, so the teams
     are known exactly when this fires. `translate` is the independent
     transform property, so it composes with the ring's own rotate/scale
     without touching them. -->
<style lang="scss">
/* the hands' snap transitions die while the ceremony drives --fh-angle —
   a transition chasing a per-frame write smears the blade (FaceHands' own
   Sweep-mode rule, restated for the spin) */
#face-hands.ec-spin .fh-part {
  transition: none;
}

/* THE VERDICT IS THE CEREMONY'S TO ANNOUNCE. TownInfo's result pill renders
   the instant isEnded lands, which put "Evil wins" on screen during the held
   breath (first-run screenshot 01) — a spoiler over the show built to say it.
   Hidden through breath and verdict, it fades up WITH the settle (the fade
   phase no longer matches these selectors, so the transition below plays). */
#app.ec-active .result-now {
  transition: opacity 0.9s ease;
}
#app.ec-breath .result-now,
#app.ec-verdict .result-now {
  opacity: 0;
}

/* every seat learns to move/fade smoothly the moment the show starts */
#app.ec-breath #townsquare .circle > li,
#app.ec-verdict #townsquare .circle > li,
#app.ec-fade #townsquare .circle > li {
  transition:
    translate 1.1s ease,
    opacity 1.1s ease,
    filter 1.3s ease;
}
#app.ec-breath #townsquare .player,
#app.ec-verdict #townsquare .player,
#app.ec-fade #townsquare .player {
  transition: filter 1.3s ease;
}

/* ── EVIL WINS: each good seat goes cold AS ITS COIN IS TAKEN ────────────
   FT-1062: the blanket 1.1s dimming became per-seat — EndCeremony adds
   `.ec-taken` to a seat's li the moment its tentacle starts the drag, and
   the cold snaps in faster than the phase-wide transitions (the theft is a
   moment, not a mood). Keyed on ec-evil (not ec-verdict) so the taken seats
   stay cold through the fade and only warm at the settle. */
#app.ec-active.ec-evil #townsquare li.ec-taken .player.townsfolk,
#app.ec-active.ec-evil #townsquare li.ec-taken .player.outsider {
  filter: grayscale(1) brightness(0.5);
  transition: filter 0.5s ease;
}
/* ...and the winners burn a little */
#app.ec-verdict.ec-evil #townsquare .player.minion,
#app.ec-verdict.ec-evil #townsquare .player.demon {
  filter: drop-shadow(0 0 12px rgba(150, 12, 12, 0.75));
  transition-delay: 1.6s;
}

/* ── GOOD WINS: the choreographed reveal (FT-1053c) ────────────────────────
   Every good seat holds its PRE-VERDICT face while it waits: identity veiled
   (the coin's icon and name arc — the seat plate stays), no lift, no halo.
   The seat's own ray landing removes `.ec-unstruck` (EndCeremony's strike
   timer), and everything below arrives WITH the strike — the reveal, the
   lift and the halo are one moment now, so the old fixed transition-delays
   came off. The end-reveal publication underneath is untouched: this only
   choreographs WHEN each revealed face first shows. */
#app.ec-active #townsquare .token .icon-fit,
#app.ec-active #townsquare .token .name {
  transition: opacity 0.7s ease;
}
#app.ec-active #townsquare li.ec-unstruck .token .icon-fit,
#app.ec-active #townsquare li.ec-unstruck .token .name {
  opacity: 0;
  transition: none;
}
/* the living good lift, warm-haloed — struck seats only */
#app.ec-verdict.ec-good
  #townsquare
  .circle
  > li:not(.ec-unstruck):has(.player.townsfolk),
#app.ec-verdict.ec-good
  #townsquare
  .circle
  > li:not(.ec-unstruck):has(.player.outsider) {
  translate: 0 calc(-7 * var(--fpx));
}
#app.ec-verdict.ec-good #townsquare li:not(.ec-unstruck) .player.townsfolk,
#app.ec-verdict.ec-good #townsquare li:not(.ec-unstruck) .player.outsider {
  filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.7));
}
/* the evil seats are PINNED — pressed down, dimmed, cracks spidering under
   them (a pseudo-element the li did not otherwise use) */
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.minion),
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.demon) {
  translate: 0 calc(5 * var(--fpx));
  transition-delay: 1.1s;
}
#app.ec-verdict.ec-good #townsquare .player.minion,
#app.ec-verdict.ec-good #townsquare .player.demon {
  filter: brightness(0.6) saturate(0.7);
  transition-delay: 1.1s;
}
#app.ec-good #townsquare .circle > li:has(.player.minion)::before,
#app.ec-good #townsquare .circle > li:has(.player.demon)::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6%;
  width: 120%;
  height: 26%;
  translate: -50% 0;
  pointer-events: none;
  /* dark cracks: thin crossing seams, no art */
  background:
    linear-gradient(
        104deg,
        transparent 46%,
        rgba(5, 3, 8, 0.85) 48%,
        transparent 50%
      )
      0 0 / 42% 100% no-repeat,
    linear-gradient(
        76deg,
        transparent 47%,
        rgba(5, 3, 8, 0.8) 49%,
        transparent 51%
      )
      40% 0 / 40% 90% no-repeat,
    linear-gradient(
        94deg,
        transparent 46%,
        rgba(5, 3, 8, 0.75) 49%,
        transparent 52%
      )
      100% 0 / 34% 80% no-repeat;
  opacity: 0;
  transition: opacity 1s ease 1.3s;
}
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.minion)::before,
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.demon)::before {
  opacity: 1;
}
</style>
