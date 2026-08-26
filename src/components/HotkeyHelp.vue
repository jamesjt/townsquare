<template>
  <!-- Golem fork (FT-880): THE KEY LIST. The app has always had hotkeys and
       has never once said so — they lived in a switch statement and in the
       heads of whoever wrote it. This is the door onto them.

       It shows YOUR keys, not every key: hotkeysFor() filters by whether you
       are hosting, playing, or standing on the index page, because a
       storyteller and a player really do have different maps and printing the
       other one's would be the same mistake as showing them the other one's
       controls. -->
  <div class="hotkey-help" @click="$emit('close')">
    <div class="panel" @click.stop>
      <!-- FT-991 (user call): "lets replace that with just text that says
           Hotkeys — no red and blue marks on the left and right." Was
           "Keys" on a linear-gradient plate running $townsfolk blue into
           $demon red (below) — plain text now, no team colours; the
           font-family/letter-spacing/centering below still mark it as a
           heading. -->
      <h3>Hotkeys</h3>
      <ul>
        <li v-for="k in keys" :key="k.key">
          <!-- the index page's own key treatment, through the one component
               that owns it -->
          <KeyCap class="cap" :letter="k.key" />
          <span class="what">
            <b>{{ k.label }}</b>
            <em>{{ k.note }}</em>
          </span>
        </li>
      </ul>
      <div class="foot">Keys are ignored while you are typing in a field.</div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { hotkeysFor } from "../golem/hotkeys";
import KeyCap from "./KeyCap";

export default {
  components: { KeyCap },
  computed: {
    ...mapState(["session"]),
    keys() {
      return hotkeysFor({
        inSession: !!this.session.sessionId,
        isSpectator: this.session.isSpectator,
      });
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// FT-1193: the glass this panel is made of — `face-disc-menu-plate`, the same
// material the seat's plate and the top-right menus wear.
@import "../faceDisc.scss";

.hotkey-help {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  // FT-1193: 0.7 -> 0.5. THE SCRIM IS WHAT THE GLASS LOOKS THROUGH, and that
  // is the whole reason it had to move. A backdrop-filter samples everything
  // painted behind it, this wash included, so at 0.7 the panel's glass was
  // reading a town that was already 70% gone: blur, tint and bevel on top of a
  // near-black rectangle is a near-black rectangle with a rim. Measured on the
  // ground behind the shipped panel, 0.7 left the town's own structure at a
  // standard deviation of 0.0021 — a flat wash by any reading. At 0.5 it is
  // 0.0135, six times as much, which is the same order as what the disc's own
  // fourth pass bought on the night checklist (0.0141).
  //
  // IT DOES NOT GO TO ZERO. The scrim is also what says "the town is behind a
  // door right now", and the panel is a full-window overlay rather than a menu
  // hanging off a mark — 0.5 keeps that reading and still lets the tower show.
  background: rgba(0, 0, 0, 0.5);
}

.panel {
  max-width: 460px;
  width: calc(100% - 40px);
  max-height: 80vh;
  // ── FT-1193: THE GLASS ─────────────────────────────────────────────────
  // "and the hotkeys overlay" (user). The same `face-disc-menu-plate` the seat
  // plate and the top-right menus wear — one include, no copy of its numbers.
  //
  // `--fd-r` IS THIS PANEL'S OWN SIZE, and that is the only dial it overrides.
  // The material's blur is a fraction of the host's scale (0.05r here), which
  // is what keeps one setting one material at every window size; a 460px panel
  // asked the 200px default for a 10px frost and got a 10px frost on a surface
  // more than twice as big, which reads as a THINNER glass than the seat
  // plate's rather than the same one. 460px puts it at 23px — the same
  // fraction of this object as the seat plate's is of that one.
  //
  // 10px, NOT THE DEFAULT 14px: the corner this panel already had. A radius is
  // a function of a box's size and this box is the widest of the four.
  //
  // `position: relative` is the plate's own requirement (see the mixin) — the
  // layers are `absolute; inset: 0`, and the nearest positioned ancestor here
  // is the FULL-WINDOW scrim above, so without it the tint would wash the
  // whole screen.
  position: relative;
  @include face-disc-menu-plate($r: 460px, $radius: 10px);
  // THE SCROLL MOVED TO THE LIST (below). It used to be here, and a plate
  // cannot carry it: the ground and rim layers are absolutely positioned
  // children, so they scroll with the content and the tint would slide off the
  // top of its own panel on a short window. The panel clips; the list scrolls.
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 20px 16px;
  // STOOD DOWN, FT-1193 — the plate brings its own ground, edge and shadow.
  //   background: rgba(8, 6, 8, 0.96);
  //   border: 3px solid black;
  //   border-radius: 10px;
  //   box-shadow: 0 0 20px black;
  //   overflow-y: auto;
  color: #e8ddd0;
}

// FT-991: plain heading — no team-coloured gradient plate. Kept as a
// heading by type alone: PiratesBay, letter-spacing, centered, same as
// every other panel title in this fork (RoleDrawer's .rd-title, TownInfo's
// li.meta) rather than a plate.
h3 {
  margin: 0 0 10px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  color: #e8ddd0;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  // FT-1193: THE SCROLLER, taken off `.panel` so the plate's ground and rim
  // stay pinned to the panel instead of scrolling out of it. The keys are the
  // only thing long enough to need it; the title and the footnote stay put.
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

li {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  &:last-child {
    border-bottom: 0;
  }
}

/* The lettering itself is KeyCap's; this only gives the column a width so the
   descriptions line up whether the key is a drop-cap image or a letter. */
.cap {
  flex: 0 0 auto;
  min-width: 1.5em;
  text-align: center;
  font-size: 130%;
}

.what {
  display: flex;
  flex-direction: column;
  b {
    font-weight: normal;
    color: #fff;
  }
  em {
    font-style: normal;
    font-size: 85%;
    color: rgba(232, 221, 208, 0.62);
  }
}

.foot {
  margin-top: 10px;
  font-size: 80%;
  text-align: center;
  color: rgba(232, 221, 208, 0.5);
}
</style>
