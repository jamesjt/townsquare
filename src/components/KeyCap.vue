<template>
  <!-- Golem fork (FT-880, font-picker parity FT-948): ONE way to print a
       hotkey. The index page's entry doors have always worn a drop-cap; the
       menu wore "[G]" in plain brackets, and the keys themselves were printed
       nowhere else at all. This is that treatment, extracted so every surface
       that names a key names it the same way. capFor (golem/hotkeys.js) now
       resolves through the SAME font picker the doors read (resolvedCapKey),
       so this panel and the doors always agree and both move when the picker
       cycles — with the baked blood alphabet, then plain text, as fallback
       tiers for a letter (or a multi-character key like "Esc") the active
       family doesn't carry. A letter with no art still lands inside the same
       `.key` span rather than falling back to something that looks like a
       different app. -->
  <span class="key">
    <img v-if="cap" :src="cap.src" :style="cap.style" :alt="letter" />
    <template v-else>{{ letter }}</template>
  </span>
</template>

<script>
import { capFor } from "../golem/hotkeys";

export default {
  props: {
    letter: {
      type: String,
      required: true,
    },
  },
  computed: {
    cap() {
      return capFor(this.letter);
    },
  },
};
</script>

<style scoped lang="scss">
/* Lifted from Intro.vue's `.key`, unchanged in substance: Bloody, blood red,
   outlined in black so it holds against any background the app paints. The
   drop-cap image rides inside it where a letter has been cut; ten have been
   (see golem/hotkeys), and the rest print as lettering in the same face. */
.key {
  font-family: Bloody, WetPaint, sans-serif;
  color: #c00;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  display: inline-block;
  line-height: 1;
  img {
    position: relative;
    z-index: 2;
  }
}
</style>
