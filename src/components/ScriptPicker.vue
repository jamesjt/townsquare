<template>
  <!-- Golem fork (FT-854): THE script picker — one component, used verbatim by
       the host panel and the Almanac workbench (user-directed: change it once,
       both change). A card GRID, not a <select>: official editions wear their
       artwork, vault scripts the custom mark; the closed trigger wears the
       picked card's icon + name. Escape / click-out close it. Cards are
       icon-forward; the blurb + source ride a hover/focus tooltip (skipped on
       touch — tap still selects). -->
  <div class="script-pick" ref="scriptPick">
    <div class="trigger" :class="{ open }" @click="toggle">
      <img class="icon" :src="pickedCard.icon" alt="" />
      <span class="name">{{ pickedCard.name }}</span>
      <font-awesome-icon icon="chevron-down" class="caret" />
    </div>
    <div class="grid" v-if="open" @scroll="hideTip">
      <div
        class="card"
        v-for="c in cards"
        :key="c.id"
        :class="{ picked: pickedId === c.id }"
        tabindex="0"
        @click="pick(c)"
        @keydown.enter="pick(c)"
        @keydown.space.prevent="pick(c)"
        @mouseenter="showTip($event, c)"
        @mouseleave="hideTip"
        @focus="showTip($event, c)"
        @blur="hideTip"
      >
        <img class="icon" :src="c.icon" alt="" />
        <span class="cname">{{ c.name }}</span>
        <!-- FORGET (FT-970) — the shelf-only remove, on the card because the
             card IS where the clutter is. Two-click arm, the pill Leave's
             idiom (App.vue): first click asks, second click does it, 3s and it
             forgets it asked. Never a native confirm() — those come back false
             unseen in a driven pane and the control reads as dead.
             It does NOT touch the server; the destructive one lives off the
             card entirely, so a slip here can never destroy anyone's script. -->
        <span
          v-if="manage && c.forgettable"
          class="forget"
          :class="{ armed: armedId === c.id }"
          :title="forgetTitle(c)"
          @click.stop="forget(c)"
          @mouseleave="disarm"
        >
          <font-awesome-icon :icon="armedId === c.id ? 'question' : 'times'" />
        </span>
      </div>
    </div>
    <div class="card-tip" ref="cardTip" v-if="tipCard" :style="tipStyle">
      <p class="tip-blurb" v-if="tipCard.blurb">{{ tipCard.blurb }}</p>
      <p class="tip-source" v-if="tipCard.source">{{ tipCard.source }}</p>
    </div>
  </div>
</template>

<script>
import { edCustom } from "../golem/editionArt";

export default {
  props: {
    // [{ id, name, icon, blurb, source, forgettable?, owned? }]
    cards: { type: Array, required: true },
    pickedId: { type: String, default: "" },
    // What the closed trigger shows when pickedId matches no card.
    placeholder: { type: String, default: "Choose a script…" },
    // FT-970: opt-in per consumer. Off, this is exactly the picker it always
    // was — the host panel and the intro pass nothing and gain no controls.
    // On, cards flagged `forgettable` wear the shelf-remove ×.
    manage: { type: Boolean, default: false }
  },
  data() {
    return {
      open: false,
      // FT-970: which card's forget is armed for its second click, and the
      // timer that gives up on it. Component-local like the pill's own arm —
      // this is about one button's feel, not about anything shared.
      armedId: null,
      armTimer: null,
      // Hover/keyboard-focus tooltip. tipCardId is null when nothing is
      // showing; tipStyle is computed against the card's rect so the tip
      // never clips inside the grid's scroll container.
      tipCardId: null,
      tipStyle: { top: "-9999px", left: "-9999px" }
    };
  },
  computed: {
    pickedCard() {
      return (
        this.cards.find(c => c.id === this.pickedId) || {
          id: this.pickedId,
          name: this.pickedId || this.placeholder,
          icon: edCustom
        }
      );
    },
    tipCard() {
      return this.cards.find(c => c.id === this.tipCardId) || null;
    }
  },
  beforeDestroy() {
    this.close();
    clearTimeout(this.armTimer);
  },
  methods: {
    toggle() {
      this.open ? this.close() : this.doOpen();
    },
    /** FT-970: says what the click will cost, which differs by card. Losing a
     *  key you hold is the case worth naming — nothing else can recover it. */
    forgetTitle(card) {
      if (this.armedId === card.id) return "Click again to remove it";
      return card.owned
        ? "Remove from this browser — you would lose the edit key, and the script stays online for everyone else"
        : "Remove from this browser — the script itself is untouched";
    },
    /** Two-click arm, then emit. The parent owns the shelf; the picker only
     *  reports that the user asked twice. */
    forget(card) {
      if (this.armedId !== card.id) {
        clearTimeout(this.armTimer);
        this.armedId = card.id;
        this.armTimer = setTimeout(() => {
          this.armedId = null;
        }, 3000);
        return;
      }
      clearTimeout(this.armTimer);
      this.armedId = null;
      this.$emit("forget", card);
    },
    disarm() {
      clearTimeout(this.armTimer);
      this.armedId = null;
    },
    doOpen() {
      this.open = true;
      document.addEventListener("mousedown", this.onDocDown);
      document.addEventListener("keydown", this.onDocKey);
      // Consumers lazy-load card metadata (vault peeks) on open.
      this.$emit("open");
    },
    close() {
      this.open = false;
      this.hideTip();
      // a half-armed forget must never survive the grid closing and be waiting,
      // already armed, the next time the same card is clicked
      this.disarm();
      document.removeEventListener("mousedown", this.onDocDown);
      document.removeEventListener("keydown", this.onDocKey);
    },
    onDocDown(e) {
      const pick = this.$refs.scriptPick;
      if (pick && !pick.contains(e.target)) this.close();
    },
    onDocKey(e) {
      if (e.key === "Escape") this.close();
    },
    pick(card) {
      this.close();
      this.$emit("pick", card);
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
    /** Centers the tooltip over the card, then clamps it inside the viewport
     *  so it never clips at the grid's edges — flips below the card when
     *  there isn't room above. */
    positionTip(rect) {
      const tip = this.$refs.cardTip;
      if (!tip) return;
      // The tip is fixed, so a transformed ancestor would re-root its
      // coordinates — hoist it to the body and it always speaks viewport.
      if (tip.parentElement !== document.body) document.body.appendChild(tip);
      const place = () => {
        const margin = 8;
        // measure the LAID-OUT box: offsetWidth read at the off-screen park
        // position gave a stale width, which the right-edge clamp then turned
        // into a squeezed box pinned to the wrong side of the screen
        const box = tip.getBoundingClientRect();
        const tw = box.width;
        const th = box.height;
        let left = rect.left + rect.width / 2 - tw / 2;
        left = Math.min(Math.max(left, margin), window.innerWidth - tw - margin);
        let top = rect.top - th - margin;
        if (top < margin) top = rect.bottom + margin;
        this.tipStyle = { top: `${top}px`, left: `${left}px` };
      };
      place();
      requestAnimationFrame(place);
    }
  }
};
</script>

<style scoped lang="scss">
// The shared control plate. This trigger IS the plate's reference — the three
// values below came off this rule — so nothing here changes shape; it now
// READS the numbers instead of owning the only copy of them.
@import "../controls.scss";

.script-pick {
  position: relative;
  flex-grow: 1;
  min-width: 0;

  .trigger {
    @include control-plate;
    display: flex;
    align-items: center;
    gap: 8px;
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
      @include control-plate-hover;
    }
    &.open .caret {
      transform: rotate(180deg);
    }
  }

  // Icon-forward grid: the icon dominates, the name sits under it, nothing
  // else on the card face — the blurb + source ride the .card-tip tooltip.
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

    // Below this width the popup stops being a centred sheet and becomes
    // exactly as wide as the control it hangs from. A 94vw box centred on a
    // trigger that is NOT itself centred in the window hangs off both edges —
    // which is what a phone was getting (user report). The trigger is always
    // on screen, so a popup measured from the trigger always is too.
    @media (max-width: 760px) {
      left: 0;
      right: 0;
      width: auto;
      transform: none;
      max-height: 44vh;
      // and the COUNT drops rather than the columns squeezing — three tracks
      // in a trigger-width popup is a ~90px card carrying a 56px icon and a
      // wrapping name. Two is a card you can actually hit.
      grid-template-columns: repeat(2, 1fr);
    }

    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      padding: 10px 6px;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      outline: none;

      // FT-970: the shelf-remove ×. Deliberately NOT blood — in this fork red
      // means "chosen" on a plated control and "ending or leaving" in the
      // pill, and this button ends nothing for anybody but the person
      // clicking it. It hovers PURPLE, the same call FT-931 made for Play
      // again: removing is not by itself a warning.
      //
      // Armed it goes amber and swaps × for ?, one step short of the blood the
      // delete-for-everyone panel wears. The two actions must not look alike:
      // this one is a shelf edit, that one reaches other people.
      .forget {
        position: absolute;
        top: 2px;
        right: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        font-size: 11px;
        opacity: 0;
        color: #b9b9b9;
        transition: opacity 120ms, color 120ms;

        &:hover {
          color: $control-edge-hover;
          background: rgba(0, 0, 0, 0.45);
        }
        &.armed {
          opacity: 1;
          color: #e5a33a;
          background: rgba(0, 0, 0, 0.55);
        }
      }
      // revealed by hovering or keyboard-focusing the card it belongs to, so
      // a resting grid stays the icon wall it was designed to be
      &:hover .forget,
      &:focus .forget,
      &:focus-within .forget {
        opacity: 0.75;
      }

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
      // The picked card is LOUD (user call: a quiet red border wasn't
      // enough): blood border, tinted fill, outer glow.
      &.picked {
        border-color: #a01414;
        background: rgba(160, 20, 20, 0.18);
        box-shadow: 0 0 10px rgba(210, 40, 40, 0.55),
          inset 0 0 16px rgba(160, 20, 20, 0.3);
        .cname {
          text-shadow: 0 0 6px rgba(255, 60, 60, 0.7);
        }
      }
    }
  }


}
// The dark-idiom hover/focus tooltip carrying the blurb + source. Fixed
// and placed in JS (positionTip) so it's never clipped by the grid's own
// scroll container; flips above/below the card to stay on-screen.
.card-tip {
  position: fixed;
  // sized by its own text, never by whatever space is left where it parks —
  // a shrink-to-fit box measured at the wrong moment is what pinned it to the
  // right edge in a squeezed column
  width: max-content;
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
</style>
