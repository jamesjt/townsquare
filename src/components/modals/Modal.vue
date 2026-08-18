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
             OURS (user call): a blood ×, not upstream's icon button. -->
        <div class="top-right-buttons">
          <span class="close-x" title="Close" @click="close">×</span>
        </div>
        <div class="slot">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
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

  .vote-history &,
  .night-reference &,
  .characters & {
    overflow-y: auto;
  }

  .roles &,
  .characters & {
    max-height: 100%;
    max-width: 60%;
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
    // Golem fork: OUR close — a blood ×. Line-drawn, no button chrome;
    // brightens and bleeds a soft glow on hover.
    > .close-x {
      cursor: pointer;
      font-size: 30px;
      line-height: 1;
      font-weight: bold;
      color: #8a1010;
      text-shadow: 0 0 1px #000;
      transition: color 150ms, text-shadow 150ms;
      &:hover {
        color: #d42020;
        text-shadow: 0 0 8px rgba(210, 40, 40, 0.7);
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
.modal-backdrop.editions.workbench .modal {
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

.modal-fade-enter,
.modal-fade-leave-active {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
</style>
