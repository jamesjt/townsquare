<template>
  <transition name="modal-fade">
    <div class="modal-backdrop" @click="close">
      <div
        class="modal"
        :class="{ maximized: isMaximized }"
        role="dialog"
        aria-labelledby="modalTitle"
        aria-describedby="modalDescription"
        @click.stop=""
      >
        <!-- Golem fork: the maximize toggle is gone (user call 2026-08-17) —
             modals that need room size themselves by design. The close is
             OURS (user call): a painted ×, not upstream's icon button. -->
        <div class="top-right-buttons">
          <!-- FT-951: THE close mark (CloseX) — the reminder token's own
               hover-to-remove × (icons/x.png), the same mark every close
               control in the app now wears. It replaces the blood alphabet's
               drippy letter this modal used to show alone. -->
          <span class="close-x" title="Close" @click="close">
            <CloseX />
          </span>
        </div>
        <div class="slot">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import CloseX from "../CloseX.vue";

export default {
  components: { CloseX },
  data: function() {
    return {
      isMaximized: false
    };
  },
  methods: {
    close() {
      this.$emit("close");
    }
  }
};
</script>

<style lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: rgba(0, 0, 0, 0.8);
  padding: 10px 20px;
  border-radius: 10px;
  box-shadow: 2px 2px 20px 1px #000;
  display: flex;
  flex-direction: column;
  max-height: 80%;
  max-width: 80%;

  // 80% of a desktop is a comfortable dialog; 80% of a 375px phone throws away
  // 75px of the little width there is, and every modal in this app is a grid
  // of round tokens that then has to shrink to fit. On a small screen the
  // dialog takes the screen.
  @media (max-width: 640px) {
    max-height: 92%;
    max-width: 96%;
    padding: 10px 10px;
  }

  .vote-history &,
  .night-reference &,
  .characters & {
    overflow-y: auto;
  }

  .roles &,
  .characters & {
    max-height: 100%;
    max-width: 60%;
    // 60% of a phone is 225px — narrower than the token grid it holds. (This
    // selector outranks the small-screen rule above whatever the media query
    // says, so the override has to live here too.)
    @media (max-width: 640px) {
      max-width: 96%;
    }
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
    justify-content: center;
    line-height: 100%;
  }

  > .top-right-buttons {
    position: absolute;
    z-index: 100;
    top: 10px;
    right: 16px;
    // Golem fork (FT-951): OUR close — the shared CloseX mark, at the size
    // the old blood letter occupied. CloseX owns the art and the
    // brighten-on-hover glow (src/components/CloseX.vue); this block only
    // sizes and positions it for the modal's corner.
    //
    // NO vertical nudge here. The blood alphabet's X needed `margin-top:
    // -4px` because its drawn crossing sits above the file's centre (the
    // drips hang below it, pulling the visual weight down). icons/x.png is a
    // different file with different geometry — measured, its alpha bounding
    // box is centred within its own square canvas to within half a percent
    // (bbox 86–446 of 539px tall; centre 266 vs canvas centre 269.5), so it
    // needs no compensating offset. Carrying the old nudge over would have
    // pushed this X off-centre for no reason.
    > .close-x {
      cursor: pointer;
      line-height: 1;
      display: block;
      // the painted mark, at the size the typed one occupied
      .close-mark {
        width: 30px;
        height: auto;
      }
    }
  }

  > .slot {
    max-height: 100%;
    position: initial;
  }
}

.maximized {
  background: rgba(0, 0, 0, 0.95);
  padding: 0;
  border-radius: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-content: center;
  justify-content: center;
  .roles &,
  .characters & {
    max-width: 100%;
    padding: 10px;
  }
}

// Golem fork (FT-854): the Almanac workbench claims the room it needs — the
// class rides the backdrop (component class passthrough) while it is open.
//
// FT-1188: THE CHRONICLE JOINS IT, on the same selector rather than a second
// copy of these six declarations. Both are BIG SURFACES — a page-sized thing
// you go to, standing over the town rather than replacing it — and the whole
// point of the redesign was that they be the same object at the same size, so
// they read the same numbers. A third such surface adds its class here; it
// does not restate the block.
.modal-backdrop.editions.workbench .modal,
.modal-backdrop.records .modal {
  width: 94vw;
  height: 92vh;
  max-width: 94vw;
  max-height: 92vh;
  > .slot {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}

// SMALL SCREEN: the workbench does not lay out its bench there — EditionModal
// swaps the body for a short note (its SMALL_BENCH query, kept in step with
// this one). A full-screen shell around one paragraph reads as a page that
// failed to load, so the shell shrinks to what it holds.
@media (max-width: 699px), (pointer: coarse) and (max-height: 519px) {
  .modal-backdrop.editions.workbench .modal {
    height: auto;
    max-height: 92vh;
    // a plate, not a pane: at 0.8 the build panel behind it read straight
    // through the note (the full-screen bench never had anything behind it)
    background: rgba(0, 0, 0, 0.94);
    // A LANDSCAPE PHONE is 345px tall and the note is taller than that, which
    // put its own Close button one pixel below the fold. The slot is the
    // scroller so the whole note — including the way out — is always reachable.
    > .slot {
      height: auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
  }
}

// A thumb cannot reliably hit a 30px glyph in a corner. Every modal's close
// gets a real box on a coarse pointer; the glyph inside is unchanged, so the
// corner still reads as one ×.
@media (pointer: coarse) {
  .modal > .top-right-buttons {
    top: 2px;
    right: 6px;
    > .close-x {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      font-size: 34px;
    }
  }
}

.modal-fade-enter,
.modal-fade-leave-active {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
</style>
