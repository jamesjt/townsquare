<template>
  <!--
    Golem fork (FT-1169): THE SEAT'S ACTIONS, as one menu.

    ONE MENU, TWO DOORWAYS. The user asked for three control schemes and two
    of them — "Nameplate click" and "Hover coin" — end in the same object:
    "hovering the coin brings up the menu of all of the things in the
    nameplate click menu". So this is built once and Player.vue decides only
    what OPENS it. Nothing here knows which doorway was used, and that is the
    property worth keeping: a row that behaved differently depending on how
    the menu was summoned would be two menus wearing one name.

    IT IS A DUMB PLATE ON PURPOSE. The seat owns which rows exist and what
    they do (Player.vue's `seatMenuEntries` / `runSeatAction`), because every
    one of those answers is a fact about the seat — is this player dead, is a
    nomination already running, is there a character on the chair. This
    component owns exactly two things the seat cannot answer from inside its
    own rotated, clipped box: WHERE the plate goes, and WHEN it closes.

    THE PLATE PARKS ON document.body, and it has to: the seats sit inside
    rotated boxes in a clipped circle, so `position: fixed` inside one is
    re-rooted to the seat's own transform and every viewport number the
    placement computes would be a lie. On the body it speaks the viewport.

    WHY IT IS A PORTAL AND NOT A HOISTED ROOT — measured, and it is a real
    crash rather than a preference. The first cut moved this component's OWN
    ROOT to the body, the way RoleHoverCard does. Vue's patcher keeps a
    vnode's element as the anchor its SIBLINGS are inserted before, and the
    seat is a stack of a dozen conditional siblings; the next patch of that
    subtree threw

      NotFoundError: Failed to execute 'insertBefore' on 'Node': the node
      before which the new node is to be inserted is not a child of this node

    and the seat stopped re-rendering entirely — a killed player's menu went
    on offering "Kill", because the component was alive and its DOM was
    frozen. (Caught in claude_temp_test/2026-08-26-ft1169-probe.mjs, not
    reasoned about.)

    So the ROOT never moves. It stays in the seat, empty and unpainted, and
    only the `<ul>` inside it travels — which Vue's sibling arithmetic cannot
    see, because a component's own children are patched against the `<ul>`
    itself, wherever that happens to live. The one thing this costs is that
    the root can no longer carry the pointer: the hover scheme's keep-open
    handlers sit on the `<ul>` and are re-emitted, rather than being bound by
    the seat with `.native`.
  -->
  <div class="seat-menu-portal">
    <ul
      class="seat-menu"
      :style="style"
      ref="menu"
      @mouseenter="$emit('hold')"
      @mouseleave="$emit('release')"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        :class="{ disabled: entry.disabled, on: entry.on }"
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

/** How far off the coin's own rim the plate sits. The same 8px RoleHoverCard
 *  puts between itself and what it describes — a menu and a card opening off
 *  the same coin should not sit at two different distances from it. */
const GAP = 8;
/** Never nearer the window's edge than this. */
const MARGIN = 8;

export default {
  props: {
    /** The coin this menu belongs to. Measured fresh at placement time, so a
     *  seat that has moved (a zoom, a seat added) still anchors correctly. */
    anchor: { default: null },
    /**
     * THE SEAT'S OWN OUTWARD DIRECTION, in screen space — `{ x, y }`, unit
     * length, pointing from the middle of the clock toward this chair.
     *
     * It is handed in rather than derived here because the seat already
     * knows it exactly: the ring's `on-circle` mixin rotates each `<li>` by a
     * CSS transform, and that matrix maps local "straight up" to screen
     * outward. Every other measured thing on the seat reads it the same way
     * (measureAddAnchor, the reminder fan, seatOutwardSide) — deriving it a
     * second time from bounding boxes is what those notes record getting
     * several seats backwards.
     */
    outward: { type: Object, default: () => ({ x: 0, y: -1 }) },
    /** `[{ id, icon, label, title, disabled, on }]`, in the order they show. */
    entries: { type: Array, default: () => [] },
    /**
     * The seat's own `<li>`. A press inside it is NOT outside — the plate,
     * the coin and the menu are one control while it is up, and a menu that
     * shut on the very element that opened it could never be re-opened by a
     * second click.
     */
    owner: { default: null },
  },
  data() {
    return { style: { top: "-9999px", left: "-9999px" } };
  },
  mounted() {
    this.hoist();
    this.place();
    // Anything that moves what we are pinned to takes the menu down rather
    // than dragging it along: a menu is a decision in progress, and one that
    // slides across the ring while the storyteller scrolls is worse than one
    // that asks to be opened again.
    window.addEventListener("scroll", this.onDismiss, true);
    window.addEventListener("resize", this.onDismiss);
    // A DRAG IS A DIFFERENT INTENT, and this menu is the one thing in the app
    // that could stop the user's own "the drags stay live" rule from holding:
    // it opens at the coin, and the coin is what gets grabbed. It never
    // covers the coin (see `place`), and it gets out of the way entirely the
    // moment a drag actually starts — the same contract RoleHoverCard keeps.
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
    // component's ROOT, which never left the seat — the `<ul>` on the body is
    // ours to clear, and a seat torn down whole (a chair removed from the
    // square with its menu up) would otherwise leave one standing there for
    // the rest of the session.
    const el = this.$refs.menu;
    if (el && el.parentElement === document.body) document.body.removeChild(el);
  },
  watch: {
    anchor() {
      this.place();
    },
    entries() {
      // the rows changed (a seat died while its menu was open), so the plate
      // is a different height and its placement has to be re-solved
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
     * OUTSIDE IS THREE TESTS, and the second and third are the ones FT-1174
     * paid for.
     *
     *   · not this menu          — reaching for a row is not leaving
     *   · not the seat that owns it — the plate and the coin are the
     *     menu's own trigger, and the seat also holds the drag handles the
     *     user insisted stay live in every scheme
     *   · not a HOISTED popup    — a row that opens a dropdown puts that
     *     list on `<body>`, so it is not a descendant of anything above and a
     *     containment-only check would close the menu the instant somebody
     *     reached for one of its own options. The three hoisted classes this
     *     app has are named rather than guessed at, exactly as Menu.vue does.
     *
     * IT NEVER EATS THE CLICK: no `preventDefault`, no `stopPropagation`.
     * Closing the menu and doing the thing under the pointer are not
     * alternatives — clicking a neighbouring coin closes this menu AND lands
     * on that coin, which is what a storyteller mid-decision means by it.
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
     * already flushed that list out by the time this handler runs, and the
     * menu closed along with every dropdown. Measured by FT-1174, not
     * re-derived here.
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
     * WHERE THE MENU OPENS — beside the coin, on the OUTWARD side, clear of
     * the plate in the middle of the clock.
     *
     * THE USER'S WORDS ARE "over the coin above the nameplate". Read as
     * "at that coin — the one above the plate you just clicked", which is
     * what the sentence is disambiguating: WHICH coin, not "covering it".
     * Covering it is refused on its own evidence — the user said twice that
     * the drags stay live in every scheme, and in the hover scheme the plate
     * appears under the pointer that is resting on the coin, so a menu drawn
     * over the coin would make that coin ungrabbable exactly where grabbing
     * it is the point. It sits ADJACENT instead, on the coin's outward side,
     * which also happens to be the one direction that cannot cross the disc.
     *
     * FOUR CANDIDATES, ordered by how outward they are. The seat's own
     * outward vector scores each side (dot product), so a 12 o'clock chair
     * tries ABOVE first, a 3 o'clock chair RIGHT, and a chair at 4 o'clock
     * tries the two sides that lean away from the middle before the two that
     * lean into it. The first candidate that is fully on screen and clear of
     * the centre plate wins; if none is, the one that overlaps the plate
     * LEAST wins, which is the honest answer on a 20-seat ring in a short
     * window where every direction is somebody's furniture.
     *
     * THE CROSS AXIS IS CLAMPED, NEVER THE OUTWARD ONE. A menu opened above a
     * 12 o'clock coin may slide left or right to stay on screen — it is still
     * above the coin, still nowhere near the disc. Clamping the outward axis
     * would push it back down over the very thing it is avoiding, so a
     * candidate that cannot fit outward is REJECTED rather than squeezed.
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
        const avoid = centrePlateBox();
        const ox = this.outward.x || 0;
        const oy = this.outward.y || 0;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const clamp = (v, lo, hi) =>
          Math.min(Math.max(v, lo), Math.max(lo, hi));
        // each candidate: the menu's top-left, plus how far it leans outward
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
        /**
         * THE DODGE — a candidate nudged just past the plate on one axis,
         * keeping the other exactly where its side put it.
         *
         * MEASURED CASE: the 12 o'clock chair at 1280x800 with the night
         * checklist up. The disc is 457x421 there, its top edge sits 176px
         * down the window, and a six-row menu is 187px tall — so "above the
         * coin" has 168px of window and cannot fit, "below" is the checklist
         * itself, and the two sides are vertically centred on a coin whose own
         * centre is already beside the plate. Every base candidate crossed it,
         * by 3690px² at 5 seats and 4183px² at 20.
         *
         * The way out is that the plate is a DISC in a WIDE window: at 1280
         * there is 411px of clear margin either side of a 457px checklist and
         * the menu is 190. So the menu keeps the height its side gave it and
         * steps sideways out of the middle — it ends up beside the coin, just
         * further out. FT-1167 met the same wall from the other direction and
         * took the same way round it: the reminder fan "swings round the coin's
         * own rim when the plate in the middle would swallow it".
         *
         * All four nudges are offered for every side, and WHICH ONE IS TAKEN
         * is decided by distance below, not by this list's order — the reason
         * a first cut of this got it wrong. Restricted to each side's cross
         * axis, it answered the 12 o'clock case with a plate at the BOTTOM of
         * the window, 470px from the coin it belongs to, which is the
         * "tooltips appearing incredibly far away from the hover target"
         * complaint FT-1167 already has on record.
         */
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
        // A BASE FIRST, most outward one that is clean — that is the design:
        // the menu leans away from the middle of the clock.
        for (const c of cands) {
          if (onScreen(c) && overlap(c) === 0) {
            pickC = c;
            break;
          }
        }
        if (!pickC) {
          // No side works whole. Take the NEAREST clean nudge — with the
          // outward side already lost, the property left worth protecting is
          // that the plate still reads as belonging to that coin.
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
          // nothing is clean, dodges included. Prefer a candidate that at
          // least fits the window (a menu half off screen cannot be read at
          // all, while one lying on the disc can), then least plate covered,
          // then most outward — `ladder` is already in outward order, so a
          // stable sort on the first two keys keeps that as the tie-break.
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
      };
      run();
      // the plate's own height is not known until it has laid out once — the
      // same two-pass RoleHoverCard and golem/floatingPicker both take, for
      // the same reason: a box measured at its off-screen park position
      // reports a stale size and every clamp above then works off it.
      requestAnimationFrame(run);
    },
  },
};
</script>

<style lang="scss">
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
  /* Above the role hover card (200), which is the only other thing that opens
     off a coin — if the two ever coincide the menu is the one being operated.
     Modals sit at 100 and are unaffected in practice: picking any row closes
     this menu, so it is never the thing standing over a dialog. */
  z-index: 201;
  margin: 0;
  padding: 3px;
  list-style: none;
  text-align: left;
  white-space: nowrap;
  /* opaque enough to be a PLATE. The retired seat menu learned this at six
     rows: a quarter-transparent box standing over the clock face let the
     dial's filigree read straight through the words. */
  background: rgba(0, 0, 0, 0.88);
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 16px;
  line-height: 1.2;
  min-width: 190px;
  cursor: pointer;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 9px;
    border-radius: 6px;

    &:hover {
      color: red;
      background: rgba(255, 255, 255, 0.06);
    }

    /* the icon column is fixed so the words line up down the plate rather
       than stepping in and out with each glyph's own width */
    svg {
      width: 18px;
      flex: 0 0 18px;
      text-align: center;
    }
  }

  /* a row whose act is currently ARMED — "Move role" while this chair's
     character is in hand. Same ink the retired menu's `li.char-act.on` used,
     so the state reads the same as it did there. */
  li.on {
    color: #ff8a8a;
  }

  li.disabled {
    cursor: not-allowed;
    opacity: 0.5;
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

  /* A LANDSCAPE PHONE is 375px tall; seven finger-sized rows want more than
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
