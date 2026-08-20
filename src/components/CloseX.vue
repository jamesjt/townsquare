<template>
  <img class="close-mark" :src="mark" alt="Close" />
</template>

<script>
// Golem fork (FT-951): THE close mark, used by every close control in the
// app — the reminder token's own hover-to-remove × (icons/x.png, a bold
// painted red X with a white outline), not the blood alphabet's drippy
// letter Modal.vue used to wear alone (user call: "that is the wrong x…
// it is the one that shows up on this element on hover" + "we should use
// it for all close buttons").
import mark from "../assets/icons/x.png";

export default {
  name: "CloseX",
  data() {
    return { mark };
  },
};
</script>

<style scoped lang="scss">
// This component owns the GLYPH ONLY: its art and its brighten-on-hover
// glow. It does NOT own where it sits, how big its box is, or the
// coarse-pointer touch target — every call site keeps its own scoped
// .close-x / .sd-close / .rd-close rule for position, width/height and the
// enlarged tap area, exactly as before this component existed (six
// surfaces, six different layouts; a shared component reaching into any of
// that would move the drawers for what should be a one-line asset swap).
// Because this element is the ROOT node of the component, a call site's own
// scoped selector (e.g. ".sd-close { width: 16px; ... }") still targets it
// directly — Vue applies a parent's scoped-CSS attribute to a child
// component's root node, so nothing about the existing per-site CSS had to
// change to keep working.
.close-mark {
  display: block;
  cursor: pointer;
  filter: drop-shadow(0 0 1px #000);
  transition: filter 150ms;

  &:hover {
    filter: drop-shadow(0 0 8px rgba(210, 40, 40, 0.7)) brightness(1.25);
  }
}
</style>
