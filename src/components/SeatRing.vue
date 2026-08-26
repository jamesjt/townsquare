<template>
  <!--
    Golem fork (FT-1180): THE HOVER SCHEME'S ANSWER — a ring of little coins
    hung on the player's own rim.

    THE USER'S WORDS: "The hover coin should bring up buttons around the
    player coin as little coins with gears touching for each of the actions."

    So each action is a COIN, not a row, and it touches the player's coin the
    way a reminder token does — gears kissing, nothing overlapping. FT-1167
    solved that exact geometry for the reminders and this is its second
    reader; the arc, the proportional hair and the swing-round-the-rim are all
    that work, moved into screen space. See `place()` for what changed and
    why.

    A PORTAL, NOT A HOISTED ROOT — FT-1169 paid for this and it is not
    re-derived here. Vue's patcher keeps a vnode's element as the anchor its
    SIBLINGS insert before; the seat is a stack of a dozen conditional
    siblings, and moving this component's own root to the body threw
    `NotFoundError: insertBefore … not a child of this node` and froze the
    seat's DOM. So the root stays in the seat, unpainted, and only the ring
    travels.

    AND IT HAS TO TRAVEL. The seats sit inside rotated, clipped boxes: a
    `position: fixed` box inside one is re-rooted to that seat's own transform,
    every viewport number would be a lie, and `.circle`'s own overflow would
    shear the ring at the top of the ring anyway.
  -->
  <div class="seat-ring-portal">
    <div class="seat-ring" ref="ring">
      <button
        v-for="(a, i) in entries"
        :key="a.id"
        type="button"
        class="sr-coin"
        :class="{ disabled: a.disabled, on: a.armed }"
        :style="coinStyle(i)"
        :title="a.title"
        @click="pick(a)"
        @mouseenter="onEnter(i)"
        @mouseleave="onLeave()"
        @focus="hover = i"
        @blur="hover = -1"
      >
        <!-- FT-1194: same rule as the plate's rows — an entry that carries
             the app's own art (`img`, declared once in golem/seatActions) is
             drawn from it, the rest keep their glyph. One vocabulary, two
             surfaces, no second mapping to drift. draggable=false: a native
             image-drag from a little coin would open where the CLICK lives. -->
        <img v-if="a.img" :src="a.img" alt="" draggable="false" />
        <font-awesome-icon v-else :icon="a.icon" />
      </button>
      <!-- THE RING HAS NO ROOM FOR WORDS, so the words come to the pointer.
           A little coin can hold one glyph and nothing else, and the user's
           complaint was about not being able to SEE the whole vocabulary —
           an icon nobody can name is not an improvement on a missing row.
           One chip, for whichever coin is under the pointer, carrying the
           label and (when the act is refused) the reason. -->
      <div class="sr-label" v-if="hovered" ref="label" :style="labelStyle">
        <span class="sr-label-name">{{ hovered.label }}</span>
        <span class="sr-label-why" v-if="hovered.disabled">{{
          hovered.reason
        }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { centrePlateRect } from "../golem/clockFace";

/** The hair between two rims — FT-1167's own, and proportional for its own
 *  reason: 4% of the coin's radius is ~2.5px on a five-seat town's coins and
 *  ~1.7px on a twenty-seat ring's, where a fixed pixel value reads as a
 *  gutter on one and disappears on the other. */
const PAD = 0.04;
/** FT-1194: ONE size on every seat, as a fraction of the player's coin —
 *  fixed positions need a fixed size, or two towns' rings would disagree
 *  about where a coin sits. The middle of the stood-down ladder below. */
const SIZE = 0.32;
/** How big an action coin is, as a fraction of the player's coin, best first.
 *  The ladder is walked DOWN until the whole ring fits: see the stood-down
 *  `placeByBearing`. A reminder token is 0.55 of a coin, and six of those
 *  would wrap the rim twice over, so this set starts well below it. */
const SIZES = [0.34, 0.3, 0.26];
/**
 * …and how tightly the arc is packed, as a fraction of the tangent step, best
 * first. 1 is "gears touching" exactly. Anything below it lets the ACTION
 * coins overlap each other a little while each stays tangent to the player's
 * coin — which is the same trade FT-1167's reminder fan already makes on a
 * coarse pointer (it packs tokens to 0.59 of a token width on purpose,
 * because a twelve-seat phone ring has seats 60px apart). It buys arc, and
 * arc is exactly what the crowded case is short of.
 */
const PACKS = [1, 0.88, 0.78];
/** …but never smaller than a thing a mouse can hit. 22px is the smallest
 *  round target elsewhere in this fork's chrome. */
const MIN_D = 22;
/** Never nearer the window's edge than this. */
const MARGIN = 4;
/** The swing search — 5 degrees at a time, out to a half turn each way, which
 *  is FT-1167's own step and its own limit. */
const SWING_STEP = Math.PI / 36;
const SWING_MAX = 36;

export default {
  props: {
    /** The coin this ring hangs on — the seat's own `.player .token`. */
    anchor: { default: null },
    /** This seat's outward direction in screen space, unit length, handed in
     *  because the seat already knows it exactly off its own `<li>` matrix
     *  (Player.vue's `seatOutwardVector`). Deriving it a second time from
     *  bounding boxes is what this fork's notes record getting several seats
     *  backwards. */
    outward: { type: Object, default: () => ({ x: 0, y: -1 }) },
    /** `[{ id, icon, label, title, disabled, reason, armed }]`, in order. */
    entries: { type: Array, default: () => [] },
    /** The seat's own `<li>`. A press inside it is not a press outside the
     *  ring — the coin under the ring is the ring's own trigger, and it holds
     *  the drag handles that stay live in every scheme. */
    owner: { default: null },
  },
  data() {
    return {
      /** Solved by `place()`: screen centres for each coin, plus the radius
       *  each is drawn at. Off-screen until the first solve lands. */
      geom: null,
      hover: -1,
      /** The correction the window edge asked of the label chip, measured
       *  after it has laid out once — its width depends on the words in it,
       *  so nothing before the render can know it. */
      labelShift: { dx: 0, dy: 0 },
    };
  },
  computed: {
    hovered() {
      return this.hover >= 0 ? this.entries[this.hover] : null;
    },
    /**
     * THE LABEL CHIP rides the hovered coin's own bearing, pushed out past
     * its rim so it never sits on the thing it is naming, and clamped to the
     * window. It is placed by TRANSFORM off the coin's centre rather than by
     * top/left off its box, so a chip whose width changes with the label does
     * not have to be re-measured to stay centred.
     */
    labelStyle() {
      const g = this.geom;
      if (!g || this.hover < 0 || !g.coins[this.hover]) return { opacity: 0 };
      const c = g.coins[this.hover];
      const ux = c.x - g.cx;
      const uy = c.y - g.cy;
      const len = Math.hypot(ux, uy) || 1;
      const out = g.r + 12;
      const x = c.x + (ux / len) * out;
      const y = c.y + (uy / len) * out;
      return {
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`,
        // which way the chip hangs off that point — away from the coin, so it
        // never lies back across the ring it came from — plus whatever nudge
        // the window edge asked for once the chip's real width was known
        transform: `translate(${ux >= 0 ? "0px" : "-100%"}, ${
          uy >= 0 ? "0px" : "-100%"
        }) translate(${this.labelShift.dx}px, ${this.labelShift.dy}px)`,
      };
    },
  },
  mounted() {
    this.hoist();
    this.place();
    window.addEventListener("scroll", this.onDismiss, true);
    window.addEventListener("resize", this.onDismiss);
    // A DRAG IS A DIFFERENT INTENT. The ring never covers the coin — that is
    // the whole shape of it — so the grab the user insisted stays live in
    // every scheme is never under anything here; the ring simply gets out of
    // the way the moment one starts, the same contract RoleHoverCard keeps.
    document.addEventListener("dragstart", this.onDismiss, true);
    // FT-1174's pair, and its trap: MOUSEDOWN, never click. A document
    // `click` listener registered while handling the click that opened this
    // receives that same event as it finishes bubbling.
    document.addEventListener("mousedown", this.onOutsideDown);
    document.addEventListener("keydown", this.onOutsideKey);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.onDismiss, true);
    window.removeEventListener("resize", this.onDismiss);
    document.removeEventListener("dragstart", this.onDismiss, true);
    document.removeEventListener("mousedown", this.onOutsideDown);
    document.removeEventListener("keydown", this.onOutsideKey);
    // We moved the ring, so we put it away — Vue only ever removes this
    // component's ROOT, which never left the seat.
    const el = this.$refs.ring;
    if (el && el.parentElement === document.body) document.body.removeChild(el);
  },
  watch: {
    anchor() {
      this.place();
    },
    entries() {
      // a seat died under an open ring, so the fifth coin changed act — the
      // COUNT is fixed at six, so nothing about the geometry moves, but the
      // solve is cheap and re-running it keeps one code path
      this.$nextTick(this.place);
    },
  },
  methods: {
    pick(a) {
      if (a.disabled) return;
      this.$emit("pick", a.id);
    },
    /**
     * THE POINTER REACHED A COIN — this is not leaving the seat.
     *
     * The ring is summoned by resting on the player's coin, and the seat arms
     * its close the moment the pointer leaves that coin (Player.vue's
     * `onCoinLeave`). Without this pair the ring would vanish 120ms after the
     * pointer stepped onto the very thing it opened, which is the one gesture
     * a hover menu absolutely has to survive. The coins are TANGENT to the
     * player's coin and to each other, so there is no dead ground to cross in
     * either direction — the grace only has to cover a rounding step.
     */
    onEnter(i) {
      this.hover = i;
      this.labelShift = { dx: 0, dy: 0 };
      this.$emit("hold");
      this.$nextTick(this.clampLabel);
    },
    onLeave() {
      this.hover = -1;
      this.$emit("release");
    },
    /**
     * THE CHIP STAYS IN THE WINDOW. A ring on the twelve o'clock chair hangs
     * its top coins a few pixels below the window's edge, and a chip pushed
     * further out from there lands on the menu strip in the corner — measured
     * at 1280x800 on an eight-seat town, where the "Move player" chip for an
     * open chair sat at y=12, across the strip's own buttons.
     *
     * It is a NUDGE and not a re-anchor: the chip keeps the bearing that says
     * which coin it belongs to and only slides back on screen, the same
     * cross-axis-only discipline the retired side placement used.
     */
    clampLabel() {
      const el = this.$refs.label;
      if (!el) return;
      const b = el.getBoundingClientRect();
      if (!b.width) return;
      const M = 6;
      let dx = 0;
      let dy = 0;
      if (b.left < M) dx = M - b.left;
      else if (b.right > window.innerWidth - M)
        dx = window.innerWidth - M - b.right;
      if (b.top < M) dy = M - b.top;
      else if (b.bottom > window.innerHeight - M)
        dy = window.innerHeight - M - b.bottom;
      if (dx || dy)
        this.labelShift = { dx: Math.round(dx), dy: Math.round(dy) };
    },
    onDismiss() {
      this.$emit("dismiss");
    },
    /**
     * OUTSIDE IS THREE TESTS, FT-1174's own:
     *   · not this ring       — reaching for a coin is not leaving
     *   · not the owning seat — the coin under the ring is its trigger
     *   · not a HOISTED popup — a dropdown's options are on `<body>`, so a
     *     containment-only check would close on the ring's own children's
     *     children
     * IT NEVER EATS THE CLICK: no preventDefault, no stopPropagation.
     */
    onOutsideDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      const ring = this.$refs.ring;
      if (ring && ring.contains(t)) return;
      if (this.owner && this.owner.contains(t)) return;
      if (t.closest(".gsel-menu, .sp-list, .cp-list")) return;
      this.$emit("dismiss");
    },
    onOutsideKey(e) {
      if (e.key !== "Escape") return;
      // guarded on defaultPrevented rather than on "is a dropdown still in
      // the DOM" — a microtask checkpoint runs between listeners, so Vue has
      // already flushed that list by the time this runs (FT-1174, measured)
      if (e.defaultPrevented) return;
      this.$emit("dismiss");
    },
    hoist() {
      const el = this.$refs.ring;
      if (el && el.parentElement !== document.body)
        document.body.appendChild(el);
    },
    coinStyle(i) {
      const g = this.geom;
      if (!g || !g.coins[i]) return { opacity: 0, pointerEvents: "none" };
      const c = g.coins[i];
      const d = g.r * 2;
      return {
        left: `${Math.round(c.x - g.r)}px`,
        top: `${Math.round(c.y - g.r)}px`,
        width: `${Math.round(d)}px`,
        height: `${Math.round(d)}px`,
        // the glyph is a fixed share of the coin so a twenty-seat ring's
        // little coins read the same as a five-seat town's big ones
        fontSize: `${Math.round(d * 0.46)}px`,
        // FT-1194: where this coin's entrance starts — the vector back to the
        // player coin's own edge, so the ring slides OUT of the rim. Read by
        // the sr-coin-in keyframes; a coin's travel is its own, the timing is
        // shared. (Old geoms carry no edge; 0px means "appear in place".)
        "--sr-fx": `${Math.round((g.edge ? g.edge.x : c.x) - c.x)}px`,
        "--sr-fy": `${Math.round((g.edge ? g.edge.y : c.y) - c.y)}px`,
      };
    },

    /**
     * ── WHERE THE RING GOES (FT-1194) ─────────────────────────────────────
     *
     * THE SAME ARC ON EVERY SEAT. The user: "The buttons are moving per
     * player coin, can we make them always be in the same spot?" The first
     * cut (below, stood down as `placeByBearing`) hung the arc on the seat's
     * own outward bearing and swung it round the rim dodging obstacles —
     * geometrically polite, and exactly what makes the same six actions land
     * somewhere different on every chair, so no muscle memory ever forms.
     *
     * So the arc is FIXED now: six coins fanned over the player coin's TOP
     * edge, tangent to the coin and to each other, in entry order left to
     * right — kill, role, move player, move role, nominate/ghost, reminder —
     * identically on every seat. Whatever the arc happens to overlap sits
     * under it (z 201); a coin that is always in the same place beats one
     * that never covers anything.
     *
     * ONE DETERMINISTIC EXCEPTION: a seat so near the window's top that the
     * arc would leave the screen hangs it under the BOTTOM edge instead — a
     * pure vertical mirror (same order, same x), decided by one measure
     * (would the apex coin cross the top margin), never by search. Muscle
     * memory keeps the left-to-right order either way.
     *
     * THE SHAPE. Six coins, each tangent to the player's coin and to its
     * neighbours on the arc, laid on one circle about the coin's centre. Two
     * circles of radius `r` whose centres ride a circle of radius `d` touch
     * when they are `2·asin(r/d)` apart, so that angle IS the step — "only
     * their gears touching", stated twice: to the coin, and to each other.
     */
    place() {
      const el = this.$refs.ring;
      const a = this.anchor;
      if (!el || !a || typeof a.getBoundingClientRect !== "function") return;
      const rect = a.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const n = this.entries.length;
      if (!n) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const R = Math.min(rect.width, rect.height) / 2;
      // one size on every seat, proportional to the coin — the middle of the
      // stood-down ladder, floored at what a mouse can hit
      const r = Math.max(R * SIZE, MIN_D / 2);
      const d = R + r + R * PAD;
      const step = 2 * Math.asin(Math.min(1, r / d));
      // the flip: would the apex coin cross the window's top?
      const dir = cy - d - r < MARGIN ? 1 : -1;
      const coins = [];
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) * step;
        coins.push({ x: cx + d * Math.sin(t), y: cy + dir * d * Math.cos(t) });
      }
      this.geom = {
        cx,
        cy,
        r,
        coins,
        // where the entrance animation starts from: the player coin's own
        // edge on the side the arc hangs — the coins slide out of the rim
        edge: { x: cx, y: cy + dir * R },
      };
    },

    /**
     * ── SUPERSEDED (FT-1194): THE BEARING SOLVE ───────────────────────────
     * FT-1180's placement, kept whole rather than deleted — nothing calls
     * it; `place()` above is what runs. It hung the arc on the seat's
     * outward bearing, swung it round the rim past obstacles and walked a
     * size/packing ladder when nothing cleared. Everything below is still
     * correct about this app's geometry; what retired it is the user's call
     * that the six coins must sit in the SAME spot on every seat.
     *
     * IT IS ALL IN SCREEN PIXELS, which is the one thing that differs from
     * FT-1167. The reminders are children of the seat's own `<li>` and had to
     * be solved in that rotated frame; this ring lives on `document.body`, so
     * the seat's outward vector is the only thing it needs from the seat and
     * every obstacle can be read straight off a bounding box. That removes
     * the whole "the coin orbits the player's centre" correction FT-1167
     * needed — not because that reading was wrong, but because a body-level
     * box never enters the frame where it mattered.
     *
     * THE ARC SWINGS ROUND THE RIM, exactly as the reminder fan does. Zero
     * degrees is OUTWARD — away from the middle of the clock — which is the
     * one bearing that cannot cross the centre disc, is not where the
     * reminders sit (they fan INWARD) and is not where a neighbouring seat
     * is (those lie tangentially, at about ±90°). The fan then rotates
     * RIGIDLY, 5 degrees at a time, until nothing it carries collides. Rigid,
     * so whatever bearing it lands on the ring is as evenly spaced as the
     * ideal one — the same freedom-removing trick TownSquare's bluff column
     * and FT-1167's fan both use.
     *
     * AND IF NO BEARING CLEARS, THE COINS GET SMALLER. A twenty-seat ring is
     * the case that forces it: neighbouring coins sit ~100px apart there
     * against a 84px coin, and six coins at 0.34 reach ~72 degrees off
     * outward, which is 1.2px inside the neighbour's rim. Swinging cannot fix
     * a symmetric squeeze — both neighbours are equally close — so the ladder
     * drops the coins to 0.30 and the whole arc narrows with them. That is
     * the honest trade: a slightly smaller coin everybody can hit beats a
     * bigger one lying on the seat next door.
     *
     * LAST RESORT is outward at the smallest size, over whatever it lands on.
     * FT-1167 made the same call for the same reason: a token overlapping
     * something still reads as belonging to that seat, and one flung to a
     * corner does not.
     */
    placeByBearing() {
      const el = this.$refs.ring;
      const a = this.anchor;
      if (!el || !a || typeof a.getBoundingClientRect !== "function") return;
      const rect = a.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const n = this.entries.length;
      if (!n) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const R = Math.min(rect.width, rect.height) / 2;
      const ox = this.outward.x || 0;
      const oy = this.outward.y || -1;
      // the outward unit vector and the one at right angles to it. Screen y
      // grows downward, so this perpendicular is outward turned clockwise on
      // screen — which way the arc's first coin sits is arbitrary and only
      // has to be the SAME on every seat, or a ring would read as a fault.
      const px = -oy;
      const py = ox;
      const obstacles = this.readObstacles();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const solve = (K, pack) => {
        const r = Math.max(R * K, MIN_D / 2);
        const d = R + r + R * PAD;
        const step = 2 * Math.asin(Math.min(1, r / d)) * pack;
        const at = (phi) => {
          const out = [];
          for (let i = 0; i < n; i++) {
            const t = phi + (i - (n - 1) / 2) * step;
            const c = Math.cos(t);
            const s = Math.sin(t);
            out.push({
              x: cx + d * (c * ox + s * px),
              y: cy + d * (c * oy + s * py),
            });
          }
          return out;
        };
        // how badly a whole ring at this bearing collides — 0 is clean, and
        // the number is a real overlap in pixels so "least bad" means
        // something when nothing is clean
        const cost = (coins) => {
          let bad = 0;
          for (const c of coins) {
            if (c.x - r < MARGIN) bad += MARGIN - (c.x - r);
            if (c.y - r < MARGIN) bad += MARGIN - (c.y - r);
            if (c.x + r > vw - MARGIN) bad += c.x + r - (vw - MARGIN);
            if (c.y + r > vh - MARGIN) bad += c.y + r - (vh - MARGIN);
            for (const o of obstacles.circles) {
              const gap = Math.hypot(c.x - o.x, c.y - o.y) - (r + o.r);
              if (gap < 0) bad += -gap;
            }
            const p = obstacles.plate;
            if (p) {
              const dx = c.x - p.cx;
              const dy = c.y - p.cy;
              const dist = Math.hypot(dx, dy) || 1;
              // the ellipse's own radius along this bearing
              const rim = 1 / Math.hypot(dx / dist / p.rx, dy / dist / p.ry);
              const gap = dist - r - rim;
              if (gap < 0) bad += -gap;
            }
          }
          return bad;
        };
        let best = null;
        for (let k = 0; k <= SWING_MAX; k++) {
          for (const phi of k === 0 ? [0] : [k * SWING_STEP, -k * SWING_STEP]) {
            const coins = at(phi);
            const bad = cost(coins);
            if (bad === 0) return { r, coins, phi, cost: 0 };
            if (!best || bad < best.cost) best = { r, coins, phi, cost: bad };
          }
        }
        return best;
      };

      /**
       * THE LADDER IS WALKED SIZE-OUTERMOST, and the order is the design.
       * Losing a few pixels off every action coin is a cost everybody on the
       * ring pays and nobody notices; letting the coins overlap each other is
       * a cost you can SEE, and it stops the arc reading as six separate
       * things. So every size is tried at full spacing before any of them is
       * packed. The very last rung — smallest and tightest — is what the
       * twelve o'clock chair of a twenty-seat town in a short window gets.
       */
      let pick = null;
      outer: for (const pack of PACKS) {
        for (const K of SIZES) {
          const s = solve(K, pack);
          if (s && s.cost === 0) {
            pick = s;
            break outer;
          }
          if (!pick || (s && s.cost < pick.cost)) pick = s;
        }
      }
      if (!pick) return;
      this.geom = { cx, cy, r: pick.r, coins: pick.coins, phi: pick.phi };
    },

    /**
     * EVERYTHING THE RING MUST NOT LAND ON, as screen circles plus the one
     * ellipse.
     *
     * Read fresh at every solve rather than cached: a ring opens on a rest of
     * the pointer, so this runs a handful of times a minute at most, and the
     * cost of a stale reading is a coin sitting on a reminder that was
     * dragged away two seconds ago.
     *
     * THE OWNING SEAT'S OWN COIN IS NOT AN OBSTACLE — the ring is tangent to
     * it by construction, and listing it would make every bearing fail by a
     * rounding step.
     */
    readObstacles() {
      const circles = [];
      const own = this.owner;
      const seats = document.querySelectorAll("#townsquare .circle > li");
      const add = (el, shrink) => {
        if (!el) return;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return;
        circles.push({
          x: b.left + b.width / 2,
          y: b.top + b.height / 2,
          // a reminder token and a coin are both round art in a square box,
          // so the inscribed radius is the honest one — a corner-to-corner
          // radius would claim ground neither of them occupies
          r: (Math.min(b.width, b.height) / 2) * (shrink || 1),
        });
      };
      seats.forEach((li) => {
        const isOwn = own && li === own;
        if (!isOwn) add(li.querySelector(".player .token"));
        // …but the OWN seat's reminders very much are obstacles: they sit on
        // the same rim this ring wants, which is the collision the user will
        // see first
        li.querySelectorAll(".reminder:not(.add)").forEach((rem) => add(rem));
      });
      return { circles, plate: centrePlateRect() };
    },
  },
};
</script>

<style lang="scss">
/* NOT SCOPED, deliberately: this element is re-parented to document.body, so
   a scoped rule's data attribute still rides on it but every DESCENDANT
   selector written against an ancestor in the seat would stop matching. The
   class is namespaced instead — the same call RoleHoverCard and SeatMenu both
   record making, for the same reason. */

/* The anchor Vue keeps in the seat. It holds nothing once `mounted` has moved
   the ring onto the body and must never occupy a pixel of the seat. */
.seat-ring-portal {
  display: none;
}

.seat-ring {
  position: fixed;
  inset: 0;
  /* THE RING TAKES NO POINTER OF ITS OWN. It is a full-window box holding six
     small ones; if it swallowed the pointer it would cover the entire town,
     and the coin it hangs on — the one the drags start from — would be the
     first thing it took. Only the coins themselves are live. */
  pointer-events: none;
  /* above the role hover card (200) and level with the seat plate: if the two
     ever coincide, the ring is the one being operated */
  z-index: 201;
}

.sr-coin {
  position: fixed;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  cursor: pointer;
  color: #f4eeff;
  /* A LITTLE COIN, and it is the seat coin's own vocabulary at small scale:
     a dark ground, the grimoire's plum edge (#4b3565 — RoleDrawer's own
     border, which faceDisc.scss also names as `--fd-edge-color`'s ship), and
     a bronze thread outside it seating the piece on whatever it lies over.
     Not a new material: the same three layers the centre disc's bevel uses,
     drawn at coin size. */
  background: radial-gradient(
    circle at 50% 34%,
    rgba(58, 44, 74, 0.97) 0%,
    rgba(24, 18, 32, 0.97) 72%,
    rgba(12, 9, 16, 0.98) 100%
  );
  border: 2px solid #4b3565;
  box-shadow:
    inset 0 1px 2px rgba(250, 246, 255, 0.28),
    inset 0 -2px 3px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(150, 120, 60, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.66);
  transition:
    transform 90ms ease,
    color 90ms ease,
    border-color 90ms ease;

  svg {
    /* the glyph is sized by the inline font-size the solve computes, so the
       art scales with the ring instead of stepping between seat counts */
    width: 1em;
    height: 1em;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
  }

  /* FT-1194: the painted marks (ui-role, the two move bakes, the nominate
     hand) take the glyphs' exact em box and shadow, so a ring mixing the two
     kinds still reads as one set of coins. Slightly larger than the glyph's
     1em because the painted art carries its own margins inside the frame. */
  img {
    width: 1.25em;
    height: 1.25em;
    object-fit: contain;
    /* the same brightness lift the plate's rows wear, for the same reason —
       the painted marks must weigh what the white glyphs beside them weigh */
    filter: brightness(1.3) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
    pointer-events: none;
  }

  /* FT-1194: THE ENTRANCE — the little coins slide out of the player coin's
     own edge (each --sr-fx/--sr-fy is the vector back to the rim, computed
     with the geometry). Slight and fast on purpose: the ring must FEEL
     instant — the animation is a read of where the coins came from, never a
     wait. No stagger; six coins leaving one edge together read as one thing
     opening. */
  /* 110ms -> 60ms (FT-1203, user: "even faster") — at 60 the slide still
     reads as coming from the rim, but the ring is settled inside the same
     frame budget as the hover delay itself. */
  animation: sr-coin-in 60ms ease-out;

  &:hover,
  &:focus {
    outline: none;
    color: #fff;
    border-color: #a78fcd;
    /* FT-1167's purple — the picked-ring colour this fork already uses for
       "this is the one you are on". Not a new accent. */
    box-shadow:
      inset 0 1px 2px rgba(250, 246, 255, 0.34),
      inset 0 -2px 3px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(167, 143, 205, 0.55),
      0 0 10px rgba(167, 143, 205, 0.45),
      0 2px 6px rgba(0, 0, 0, 0.66);
    transform: scale(1.08);
  }

  /* the act is ARMED — this chair's character is in hand. Same ink the seat
     menu's armed row wears, so the two surfaces say it the same way. */
  &.on {
    color: #ff8a8a;
    border-color: #8d5a72;

    /* FT-1194: a painted mark cannot take the ink through `color`, so it
       wears the same red as a glow — the plate's armed rows do the same. */
    img {
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8))
        drop-shadow(0 0 4px rgba(255, 138, 138, 0.9));
    }
  }

  &.disabled {
    cursor: not-allowed;
    /* IT IS STILL THERE, and that is the whole point of this rework: a
       storyteller can see that the town has a "Move player" and that this
       chair has nobody on it. Dimmed enough to read as refused, lit enough
       to read at all. */
    opacity: 0.42;
    &:hover,
    &:focus {
      color: #f4eeff;
      border-color: #4b3565;
      transform: none;
      box-shadow:
        inset 0 1px 2px rgba(250, 246, 255, 0.28),
        inset 0 -2px 3px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(150, 120, 60, 0.3),
        0 2px 6px rgba(0, 0, 0, 0.66);
    }
  }
}

.sr-label {
  position: fixed;
  pointer-events: none;
  max-width: 15em;
  padding: 4px 9px;
  border-radius: 8px;
  background: rgba(8, 5, 12, 0.93);
  border: 1px solid #4b3565;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 14px;
  line-height: 1.25;
  text-align: left;
  z-index: 1;
}

.sr-label-name {
  display: block;
  white-space: nowrap;
  font-weight: bold;
}

/* the refusal, in the same chip as the name — one thing to read, in the one
   place the pointer already is */
.sr-label-why {
  display: block;
  margin-top: 2px;
  color: #d6c8f6;
  font-size: 12.5px;
  white-space: normal;
}

/* FT-1194: the entrance's keyframes — from the rim, small and clear, to
   settled. Only a `from`: the rest state is the coin's own, so the hover
   transition (scale 1.08) keeps working untouched once the entrance is done. */
@keyframes sr-coin-in {
  from {
    transform: translate(var(--sr-fx, 0px), var(--sr-fy, 0px)) scale(0.45);
    opacity: 0;
  }
}

/* the entrance is a flourish, never a requirement */
@media (prefers-reduced-motion: reduce) {
  .sr-coin {
    animation: none;
  }
}

/* A COARSE POINTER NEVER SEES THIS RING — there is no rest gesture on a
   finger, so Player.vue falls the hover scheme back to the nameplate one
   there (FT-1169, measured at 430x900). The floor below is belt-and-braces
   for a hybrid device that reports coarse while carrying a mouse. */
@media (pointer: coarse) {
  .sr-coin {
    min-width: 34px;
    min-height: 34px;
  }
}
</style>
