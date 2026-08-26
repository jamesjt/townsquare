<template>
  <!-- Golem fork (FT-1164): THE THIN MARK — the one glyph on the Chronicle
       that says "this percentage is real arithmetic over too little evidence".

       A win rate prints two digits whether it was computed over four games or
       four hundred, and those two digits look identical. That is the failure
       this exists to prevent: "Fortune Teller and Ravenkeeper: good wins 67%"
       off nine games reads exactly as authoritative as the same sentence off
       ninety, and a reader has no way to tell them apart unless the page tells
       them. So every rate below the line wears this, and the legend under each
       table says what the line is.

       It marks, it does not hide. The number is still printed — a thin sample
       is still the only evidence there is, and withholding it would be its own
       kind of dishonesty. What changes is that the reader knows.

       `bare` renders the glyph alone, for the legend line that explains it. -->
  <sup class="thin-mark" :title="bare ? null : hint">†</sup>
</template>

<script>
export default {
  name: "ThinMark",
  props: {
    /** How many games the rate sat on — named in the hover hint. */
    n: {
      type: Number,
      default: 0,
    },
    /** The legend's own copy of the glyph: no hint, it IS the hint. */
    bare: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    hint() {
      return `Only ${this.n} ${
        this.n === 1 ? "game" : "games"
      } — too few for the rate to be reliable`;
    },
  },
};
</script>

<style scoped lang="scss">
.thin-mark {
  // Amber, the app's own "careful" colour (the ledger marks the town you are
  // standing in with the same one), at a weight that catches the eye scanning
  // a column of numbers without competing with the numbers themselves.
  color: #e8b23a;
  font-size: 0.85em;
  line-height: 0;
  margin-left: 2px;
  cursor: help;
}
</style>
