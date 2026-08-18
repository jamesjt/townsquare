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
    // [{ id, name, icon, blurb, source }]
    cards: { type: Array, required: true },
    pickedId: { type: String, default: "" },
    // What the closed trigger shows when pickedId matches no card.
    placeholder: { type: String, default: "Choose a script…" }
  },
  data() {
    return {
      open: false,
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
  },
  methods: {
    toggle() {
      this.open ? this.close() : this.doOpen();
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

    .card {
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
