<template>
  <!--
    Golem fork (FT-1180): THE NAMEPLATE SCHEME'S ANSWER — a glassy plate laid
    ON the player's coin.

    THE USER'S WORDS: "Clicking the name plate should bring up a menu that
    overlays the player coin, is glassy. it shouldn't be to the side."

    ── WHAT THIS FILE USED TO BE, AND WHY IT CHANGED ──────────────────────────
    FT-1169 built ONE menu and opened it from BOTH non-click schemes, on the
    reading that the user's spec ended both in the same object. The user's
    verdict: "no this is wrong for the settings. You reused the elements for
    both the nameplate click and the hover coin which made them both bad." The
    two gestures want opposite shapes and sharing one component gave neither
    of them its own. So the ring is `SeatRing.vue` now, this is the plate, and
    the only thing the two share is `golem/seatActions` — the vocabulary, not
    the box. There is deliberately no `variant` prop: that would be the same
    mistake wearing a flag.

    ── ON THE COIN, NOT BESIDE IT ─────────────────────────────────────────────
    FT-1169 placed this beside the coin, on the argument that covering the
    coin would block the drag the user insisted stays live in every scheme.
    The user has overruled the placement, and the drag is kept another way:
    THE PLATE ITSELF DRAGS. It carries the seat's own coin drag (see
    `dragstart` below), so a grab that lands on the plate starts exactly the
    drag a grab on the coin under it would have started, and the plate gets
    out of the way as it goes. The coin is covered; the gesture is not
    blocked, which is what the rule was protecting.

    The old side placement is kept below as `placeBeside`, stood down rather
    than deleted — it is a solved problem (four candidates ordered by the
    seat's outward vector, with a dodge past the centre disc) and the day a
    surface wants it back, it is there.

    ── THE GLASS IS THIS FORK'S OWN ───────────────────────────────────────────
    `face-disc-plate` (src/faceDisc.scss) is the material the centre disc, the
    night checklist, the entry panels and the vote plate are all made of, and
    this plate is made of it too rather than of a third recipe invented here.
    What a surface is allowed to own is its own SIZE and its own EDGE, so this
    one sets `--fd-r` (the material's blur is a fraction of its host's size),
    `--fd-radius` (a plate, not an ellipse) and the ground's tint. See the
    style block for the one thing that had to be turned up and why.

    ── THE PORTAL ─────────────────────────────────────────────────────────────
    A `position: fixed` box inside one of these rotated, clipped seats is
    re-rooted to the seat's own transform and every viewport number would be a
    lie. But the component's own ROOT must not move: FT-1169 measured that
    hoisting it throws `NotFoundError: insertBefore … not a child of this
    node` on the next patch of the seat's dozen conditional siblings and
    freezes the seat's DOM — a killed player's menu went on offering "Kill".
    So the root stays here, unpainted, and only the plate travels.
  -->
  <div class="seat-menu-portal">
    <ul
      class="seat-menu seat-plate"
      :style="style"
      ref="menu"
      :draggable="String(!!dragLive)"
      @dragstart="onPlateDrag"
      @mouseenter="$emit('hold')"
      @mouseleave="$emit('release')"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        :class="{ disabled: entry.disabled, on: entry.armed }"
        :title="entry.title"
        @click="pick(entry)"
      >
        <font-awesome-icon :icon="entry.icon" />
        <span class="sm-label">{{ entry.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { centrePlateBox } from "../golem/clockFace";

/** How far off the coin's own rim the SUPERSEDED side placement sat — the
 *  same 8px RoleHoverCard puts between itself and what it describes. Kept
 *  with `placeBeside`, which is the only thing that reads it. */
const GAP = 8;
/** Never nearer the window's edge than this. */
const MARGIN = 8;

export default {
  props: {
    /** The coin this plate covers. Measured fresh at placement time, so a
     *  seat that has moved (a zoom, a seat added) still lands correctly. */
    anchor: { default: null },
    /**
     * THE SEAT'S OWN OUTWARD DIRECTION in screen space. The plate no longer
     * leans anywhere — it sits on the coin — so this is read only by the
     * stood-down `placeBeside`. It is kept on the props for that reason and
     * because `SeatRing` next door needs the identical value: one thing the
     * seat measures, two surfaces that may ask for it.
     */
    outward: { type: Object, default: () => ({ x: 0, y: -1 }) },
    /** `[{ id, icon, label, title, disabled, reason, armed }]` — six of them,
     *  always, from golem/seatActions. */
    entries: { type: Array, default: () => [] },
    /**
     * The seat's own `<li>`. A press inside it is NOT outside — the plate,
     * the coin and the name plate are one control while this is up, and a
     * menu that shut on the very element that opened it could never be
     * re-opened by a second click.
     */
    owner: { default: null },
    /** Is there a drag under this plate at all right now — the coin's, or (on
     *  a claimed chair with no character on it) the name plate's? The seat's
     *  own answer, handed in rather than re-derived here, and the seat also
     *  decides WHICH of the two a grab starts. See the template note on why
     *  the plate carries a drag at all. */
    dragLive: { type: Boolean, default: false },
  },
  data() {
    return { style: { top: "-9999px", left: "-9999px" } };
  },
  mounted() {
    this.hoist();
    this.place();
    // Anything that moves what we are pinned to takes the plate down rather
    // than dragging it along: a menu is a decision in progress, and one that
    // slides across the ring while the storyteller scrolls is worse than one
    // that asks to be opened again.
    window.addEventListener("scroll", this.onDismiss, true);
    window.addEventListener("resize", this.onDismiss);
    document.addEventListener("dragstart", this.onDismiss, true);
    // FT-1174's pair, verbatim in shape: MOUSEDOWN, never click. A document
    // `click` listener registered while handling the click that OPENED this
    // menu receives that same event as it finishes bubbling, and the menu
    // shuts in the gesture that opened it. `mousedown` has already been and
    // gone by then, so the first event this sees is the next press.
    document.addEventListener("mousedown", this.onOutsideDown);
    document.addEventListener("keydown", this.onOutsideKey);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.onDismiss, true);
    window.removeEventListener("resize", this.onDismiss);
    document.removeEventListener("dragstart", this.onDismiss, true);
    document.removeEventListener("mousedown", this.onOutsideDown);
    document.removeEventListener("keydown", this.onOutsideKey);
    // WE MOVED THE PLATE, SO WE PUT IT AWAY. Vue only ever removes this
    // component's ROOT, which never left the seat.
    const el = this.$refs.menu;
    if (el && el.parentElement === document.body) document.body.removeChild(el);
  },
  watch: {
    anchor() {
      this.place();
    },
    entries() {
      // the rows changed (a seat died while its plate was open), so its size
      // may have changed and the centring has to be re-solved
      this.$nextTick(this.place);
    },
  },
  methods: {
    pick(entry) {
      if (entry.disabled) return;
      this.$emit("pick", entry.id);
    },
    onDismiss() {
      this.$emit("dismiss");
    },
    /**
     * THE PLATE CARRIES THE SEAT'S DRAG. It covers the coin — and, on a
     * six-row plate, the name plate under it too — and the user's standing
     * rule is that the drags stay live in every scheme, so the thing on top
     * has to hand the gesture on rather than eat it. The seat runs its own
     * `onRoleDragStart` (or `onPlayerDragStart`, on a chair with no character
     * to carry) with THIS VERY EVENT — same ghost, same payload, same drop
     * targets — and the document `dragstart` listener above takes the plate
     * down in the same gesture.
     */
    onPlateDrag(e) {
      if (!this.dragLive) return;
      this.$emit("seat-drag", e);
    },
    /**
     * OUTSIDE IS THREE TESTS, and the second and third are the ones FT-1174
     * paid for.
     *
     *   · not this plate           — reaching for a row is not leaving
     *   · not the seat that owns it — the name plate is this menu's own
     *     trigger, and the seat also holds the drag handles the user insisted
     *     stay live in every scheme
     *   · not a HOISTED popup      — a row that opens a dropdown puts that
     *     list on `<body>`, so a containment-only check would close the menu
     *     the instant somebody reached for one of its own options.
     *
     * IT NEVER EATS THE CLICK: no `preventDefault`, no `stopPropagation`.
     * Clicking a neighbouring coin closes this menu AND lands on that coin,
     * which is what a storyteller mid-decision means by it.
     */
    onOutsideDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      const menu = this.$refs.menu;
      if (menu && menu.contains(t)) return;
      if (this.owner && this.owner.contains(t)) return;
      if (t.closest(".gsel-menu, .sp-list, .cp-list")) return;
      this.$emit("dismiss");
    },
    /**
     * Escape closes it — unless something nearer has already answered the
     * key. `defaultPrevented` is the test rather than "is a dropdown still in
     * the DOM": a microtask checkpoint runs between listeners, so Vue has
     * already flushed that list out by the time this handler runs. Measured
     * by FT-1174, not re-derived here.
     */
    onOutsideKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("dismiss");
    },
    hoist() {
      const el = this.$refs.menu;
      if (el && el.parentElement !== document.body)
        document.body.appendChild(el);
    },
    /**
     * ON THE COIN. The plate's centre is the coin's centre, and the only
     * thing allowed to move it is the window edge.
     *
     * NOTHING ELSE GETS A VOTE, and that is the correction. FT-1169 gave the
     * centre disc a vote and let it push the plate around the window; the
     * user's instruction is that this plate belongs on the coin, so a disc it
     * happens to overlap is simply behind it — which is exactly what glass is
     * for. `centrePlateBox` stays imported for `placeBeside` below.
     *
     * TWO PASSES, the same one RoleHoverCard and golem/floatingPicker take:
     * the plate's own size is not known until it has laid out once, and a box
     * measured at its off-screen park position reports a stale size that
     * every clamp then works off.
     */
    place() {
      const el = this.$refs.menu;
      const a = this.anchor;
      if (!el || !a || typeof a.getBoundingClientRect !== "function") return;
      const run = () => {
        const rect = a.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const w = box.width;
        const h = box.height;
        if (!w || !h) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clamp = (v, lo, hi) =>
          Math.min(Math.max(v, lo), Math.max(lo, hi));
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        this.style = {
          left: `${Math.round(clamp(cx - w / 2, MARGIN, vw - w - MARGIN))}px`,
          top: `${Math.round(clamp(cy - h / 2, MARGIN, vh - h - MARGIN))}px`,
        };
      };
      run();
      requestAnimationFrame(run);
    },

    /**
     * ── SUPERSEDED (FT-1180): THE SIDE PLACEMENT ───────────────────────────
     * FT-1169's answer, kept whole rather than deleted. It is not called from
     * anywhere; `place()` above is what runs.
     *
     * It put the plate BESIDE the coin, on the seat's own outward side: four
     * candidates scored by the seat's outward vector, the first fully on
     * screen and clear of the centre disc winning, and a set of "dodges" that
     * nudged a candidate just past the disc on one axis when no whole side
     * worked — picked by distance from the coin, because an earlier cut that
     * picked by list order answered the 12 o'clock chair with a plate at the
     * bottom of the window, 470px from the coin it belonged to.
     *
     * The user has since said the plate goes ON the coin, which retires the
     * whole question. Everything below still WORKS and is still correct about
     * this app's geometry, which is why it stays.
     */
    placeBeside() {
      const el = this.$refs.menu;
      const a = this.anchor;
      if (!el || !a || typeof a.getBoundingClientRect !== "function") return;
      const rect = a.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const w = box.width;
      const h = box.height;
      if (!w || !h) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const avoid = centrePlateBox();
      const ox = this.outward.x || 0;
      const oy = this.outward.y || 0;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
      const cands = [
        {
          k: "up",
          score: -oy,
          left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN),
          top: rect.top - GAP - h,
        },
        {
          k: "down",
          score: oy,
          left: clamp(cx - w / 2, MARGIN, vw - w - MARGIN),
          top: rect.bottom + GAP,
        },
        {
          k: "left",
          score: -ox,
          left: rect.left - GAP - w,
          top: clamp(cy - h / 2, MARGIN, vh - h - MARGIN),
        },
        {
          k: "right",
          score: ox,
          left: rect.right + GAP,
          top: clamp(cy - h / 2, MARGIN, vh - h - MARGIN),
        },
      ];
      cands.sort((p, q) => q.score - p.score);
      const overlap = (c) => {
        if (!avoid) return 0;
        const iw =
          Math.min(c.left + w, avoid.right) - Math.max(c.left, avoid.left);
        const ih =
          Math.min(c.top + h, avoid.bottom) - Math.max(c.top, avoid.top);
        return iw > 0 && ih > 0 ? iw * ih : 0;
      };
      const onScreen = (c) =>
        c.left >= MARGIN &&
        c.top >= MARGIN &&
        c.left + w <= vw - MARGIN &&
        c.top + h <= vh - MARGIN;
      const dodges = (c) => {
        if (!avoid) return [];
        return [
          { ...c, left: avoid.left - GAP - w },
          { ...c, left: avoid.right + GAP },
          { ...c, top: avoid.top - GAP - h },
          { ...c, top: avoid.bottom + GAP },
        ];
      };
      const ladder = cands.concat(...cands.map(dodges));
      let pickC = null;
      for (const c of cands) {
        if (onScreen(c) && overlap(c) === 0) {
          pickC = c;
          break;
        }
      }
      if (!pickC) {
        const near = ladder
          .filter((c) => onScreen(c) && overlap(c) === 0)
          .sort(
            (p, q) =>
              Math.hypot(p.left + w / 2 - cx, p.top + h / 2 - cy) -
              Math.hypot(q.left + w / 2 - cx, q.top + h / 2 - cy),
          );
        if (near.length) pickC = near[0];
      }
      if (!pickC) {
        const ranked = ladder.slice().sort((p, q) => {
          const fp = onScreen(p) ? 0 : 1;
          const fq = onScreen(q) ? 0 : 1;
          if (fp !== fq) return fp - fq;
          return overlap(p) - overlap(q);
        });
        pickC = ranked[0];
      }
      this.style = {
        top: `${Math.round(clamp(pickC.top, MARGIN, vh - h - MARGIN))}px`,
        left: `${Math.round(clamp(pickC.left, MARGIN, vw - w - MARGIN))}px`,
      };
    },
  },
};
</script>

<style lang="scss">
@import "../vars.scss";
@import "../faceDisc.scss";

/* NOT SCOPED, deliberately: this element is re-parented to document.body, so
   a scoped rule's data attribute still rides on it but every DESCENDANT
   selector written against an ancestor in the seat would stop matching. The
   class is namespaced instead — the same call RoleHoverCard's own note
   records making for the same reason. */

/* The anchor Vue keeps in the seat. It holds nothing once `mounted` has moved
   the plate onto the body, and it must never occupy a pixel of the seat — see
   the template's portal note for why it exists at all. */
.seat-menu-portal {
  display: none;
}

.seat-menu {
  position: fixed;
  /* Above the role hover card (200) and level with the hover ring — if any
     two of them ever coincide, this is the one being operated. */
  z-index: 201;
  margin: 0;
  padding: 6px;
  list-style: none;
  text-align: left;
  white-space: nowrap;
  color: white;
  font-size: 16px;
  line-height: 1.2;
  min-width: 200px;
  cursor: pointer;

  /* ── THE GLASS ─────────────────────────────────────────────────────────
     This fork's own material, not a third one. `face-disc-plate` is what the
     centre disc, the night checklist, the entry panels and the vote plate are
     made of; the three properties below are the surface's own dimensions, and
     everything else — the backdrop-filter, the two bevel crescents, the plum
     hairline, the bronze thread, the ground ramp and the rim layer — comes
     from the mixin exactly as it comes for those four.

     --fd-r  THE MATERIAL'S SCALE. The mixin's blur is a fraction of it
             (0.008r + the lab's own offset), which is what keeps one setting
             one material at every window size on the disc. A menu plate has
             no radius of its own, so it names the size it is: about 200px
             tall with six rows.

     --fd-radius  A PLATE, NOT AN ELLIPSE. The mixin's default is 50%, which
             on a rounded box would draw an oval; the disc wants that and this
             does not. The `::before` ground and `::after` rim both read this
             property, so one declaration re-shapes all three layers together.

     --fd-blur-adj  THE ONE THING TURNED UP, and the only place this surface
             argues with the disc. The disc's shipped blur is 0.008r — nearly
             clear glass — because what shows through it is the dial's own
             painted bronze, and blurring THAT would be blurring the art the
             plate exists to sit on. What shows through HERE is a character's
             face at coin size, three inches of engraved detail directly under
             six lines of type, and clear glass over it is unreadable. This is
             the lab's own dial (thousandths of r), so 0.008 + 0.042 = 0.05r —
             10px at this plate's size, a real frost. The disc is untouched:
             the property is declared HERE, on this element, and custom
             properties only ever inherit downward.

     --fd-tint / --fd-tint-rgb  A GROUND UNDER THE WORDS. The disc ships with
             its tint ramp at zero, because the multiply in the backdrop
             filter is doing that surface's calming on its own. It cannot do
             this one's: `brightness(0.34)` is a MULTIPLY, so over a dark
             backdrop — a shrouded seat, an empty chair's black life token —
             it takes almost nothing off and the plate would have no edge at
             all against the ring behind it. The ramp is a radial that is
             heaviest dead centre and gone by the rim, so the words get their
             ground and the plate still reads as glass at its edges. The
             colour is the mixin's own default literal, the grimoire's cool
             purple-black. */
  --fd-r: 200px;
  --fd-radius: 14px;
  --fd-blur-adj: 42;
  --fd-tint: 0.62;
  --fd-tint-rgb: 26, 20, 33;
  /* THE ELEMENT'S OWN CORNER IS NOT THE MIXIN'S. `face-disc-plate` rounds its
     two layers (`::before`, `::after`) off `--fd-radius` but leaves the box
     itself to its caller — on the disc that caller is `face-disc-frame`,
     which sets `border-radius: 50%`. Without this line the backdrop-filter
     and the bevel would be a hard rectangle behind two rounded layers. */
  border-radius: var(--fd-radius);
  @include face-disc-plate;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    /* the type has to survive whatever the glass lets through — a coin's
       engraved highlights are the brightest thing that can land under a
       letter here */
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);

    &:hover {
      color: #fff;
      background: rgba(167, 143, 205, 0.22);
    }

    /* the icon column is fixed so the words line up down the plate rather
       than stepping in and out with each glyph's own width */
    svg {
      width: 18px;
      flex: 0 0 18px;
      text-align: center;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    }
  }

  /* a row whose act is currently ARMED — "Move role" while this chair's
     character is in hand. Same ink the retired menu's `li.char-act.on` used
     and the same the hover ring's armed coin wears. */
  li.on {
    color: #ff8a8a;
  }

  /* ── REFUSED, NOT ABSENT (FT-1180) ─────────────────────────────────────
     The row stays. FT-1169 deleted a row whose guard failed, so an open chair
     offered three entries and never admitted the other three existed — which
     is what the user found ("neither of them have all of the needed
     buttons?"). Dimmed enough to read as refused, lit enough to read at all,
     and the reason is on the row's own tooltip. */
  li.disabled {
    cursor: not-allowed;
    opacity: 0.45;
    &:hover {
      color: white;
      background: none;
    }
  }

  /* A MENU ROW WAS 14px TALL on a phone (the retired menu measured it at
     375x812) — the thinnest target in the app, holding the seat's whole
     vocabulary. 40px is the size this fork's other coarse-pointer controls
     take, so the rows match them rather than inventing a third. */
  @media (pointer: coarse) {
    font-size: 17px;
    li {
      min-height: 40px;
      padding: 6px 12px;
    }
  }

  /* A LANDSCAPE PHONE is 375px tall; six finger-sized rows want more than
     that. Half the window is the room any chair is guaranteed — take it and
     scroll for the rest. Portrait never reaches the cap. */
  @media (pointer: coarse) and (max-height: 500px) {
    max-height: 45vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
