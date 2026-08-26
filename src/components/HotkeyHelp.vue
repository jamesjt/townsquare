<template>
  <!-- Golem fork (FT-880): THE KEY LIST. The app has always had hotkeys and
       has never once said so — they lived in a switch statement and in the
       heads of whoever wrote it. This is the door onto them.

       FT-1197 (user): "we'll want to expand it to be general useability
       instructions vs just hotkeys." THE GUIDE now — the key list grew into
       the app's own usability guide, in sections you jump between: getting
       in, the seats, running a game, playing one, the Chronicle, the keys
       (kept whole, still filtered to YOUR keys), and the personal settings.
       Everything in golem/guide.js is written against the code that makes it
       true; the keys section still reads golem/hotkeys the way it always
       has, so a remapped key changes here without anyone remembering to. -->
  <div class="hotkey-help" @click="$emit('close')">
    <div class="panel" @click.stop>
      <!-- FT-991 (user call): "lets replace that with just text that says
           Hotkeys — no red and blue marks on the left and right." Was
           "Keys" on a linear-gradient plate running $townsfolk blue into
           $demon red (below) — plain text now, no team colours; the
           font-family/letter-spacing/centering below still mark it as a
           heading. (FT-1197: the word is "The guide" now — the panel
           outgrew its key list; same plain heading treatment.) -->
      <h3>The guide</h3>
      <!-- THE SECTION RAIL. Plain words, not drop-caps — the blood letters
           in this panel belong to the KEYS (KeyCap's rows below), and a row
           of seven bleeding tabs above them would drown the thing the caps
           are there to mark. The open section wears the app's own gold
           (the tower menu's pick idiom). -->
      <nav class="rail" role="tablist" aria-label="Guide sections">
        <button
          v-for="s in sections"
          :key="s.id"
          role="tab"
          class="rail-tab"
          :class="{ on: s.id === open }"
          :aria-selected="s.id === open ? 'true' : 'false'"
          @click="open = s.id"
        >
          {{ s.label }}
        </button>
      </nav>
      <!-- FT-1193's scroller shape survives: the plate's ground and rim are
           pinned to the panel, only THIS list scrolls, the footnote stays
           put beneath it. -->
      <ul v-if="open !== 'keys'" :key="open">
        <li v-for="(e, i) in openSection.entries" :key="i" class="g-row">
          <span class="what">
            <b
              >{{ e.lead
              }}<i v-if="e.who === 'host'" class="who">storyteller</i></b
            >
            <em>{{ e.note }}</em>
          </span>
        </li>
      </ul>
      <ul v-else key="keys">
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
      <div class="foot">{{ openSection.foot || defaultFoot }}</div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { hotkeysFor } from "../golem/hotkeys";
import { GUIDE_SECTIONS } from "../golem/guide";
import KeyCap from "./KeyCap";

export default {
  components: { KeyCap },
  data() {
    return {
      sections: GUIDE_SECTIONS,
      // THE GUIDE OPENS ON YOUR OWN CHAPTER: a browser with no town gets
      // "Getting in", a storyteller gets "Storytelling", a player gets
      // "Playing". Set once on open — jumping the rail after that is the
      // reader's own business.
      open: null,
    };
  },
  created() {
    if (!this.session.sessionId) this.open = "in";
    else this.open = this.session.isSpectator ? "play" : "host";
  },
  computed: {
    ...mapState(["session"]),
    openSection() {
      return this.sections.find((s) => s.id === this.open) || this.sections[0];
    },
    keys() {
      return hotkeysFor({
        inSession: !!this.session.sessionId,
        isSpectator: this.session.isSpectator,
      });
    },
    defaultFoot() {
      // the key list's original footnote — true for every section, since the
      // guide floats over a town whose keys stay live while it is open.
      return "Keys are ignored while you are typing in a field.";
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
  // FT-1197: 460px -> 560px. The key list's width fit a cap and two lines; a
  // guide's rows are sentences, and at 460px the long ones broke to a third
  // line often enough to read as a wall rather than a list. The extra 100px
  // is the difference between "skim at the table" and "settle in to read".
  max-width: 560px;
  width: calc(100% - 40px);
  max-height: 80vh;
  // ── FT-1193: THE GLASS ─────────────────────────────────────────────────
  // The same `face-disc-menu-plate` the seat plate and the top-right menus
  // wear — one include, no copy of its numbers.
  //
  // `--fd-r` IS THIS PANEL'S OWN SIZE, and that is the only dial it overrides.
  // The material's blur is a fraction of the host's scale (0.05r), which is
  // what keeps one setting one material at every window size — the number
  // tracks the box (FT-1193 set 460px for the 460px panel; the panel is
  // 560px now and the dial moves with it, same fraction, same glass).
  //
  // 10px, NOT THE DEFAULT 14px: the corner this panel already had. A radius is
  // a function of a box's size and this box is the widest of the four.
  //
  // `position: relative` is the plate's own requirement (see the mixin) — the
  // layers are `absolute; inset: 0`, and the nearest positioned ancestor here
  // is the FULL-WINDOW scrim above, so without it the tint would wash the
  // whole screen.
  position: relative;
  @include face-disc-menu-plate($r: 560px, $radius: 10px);
  // THE SCROLL LIVES ON THE LIST (below). It used to be here, and a plate
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
  margin: 0 0 8px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  color: #e8ddd0;
}

// ── FT-1197: THE RAIL ──────────────────────────────────────────────────────
// Seven words in one wrapping row. Buttons, for the keyboard's sake, but
// dressed as the app's own quiet chrome: no boxes until you are on one, and
// the on-state is the tower menu's gold rather than a new colour.
.rail {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px 4px;
  margin-bottom: 8px;
  flex: 0 0 auto;
}
.rail-tab {
  appearance: none;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px 8px;
  font: inherit;
  font-size: 85%;
  color: rgba(232, 221, 208, 0.75);
  cursor: pointer;
  &:hover {
    color: #fff;
  }
  &.on {
    color: #0d0a12;
    background: #caa662;
    border-color: #caa662;
  }
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  // FT-1193: THE SCROLLER, taken off `.panel` so the plate's ground and rim
  // stay pinned to the panel instead of scrolling out of it. The rows are the
  // only thing long enough to need it; the title, the rail and the footnote
  // stay put.
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

/* FT-1197: "say so inline" — a storyteller-only entry carries this small tag
   after its lead instead of being hidden from players; half the point of a
   guide is knowing what the other chair can do. Dim and lowercase so it
   reads as a footnote to the line, not a second line. */
.who {
  font-style: normal;
  font-size: 70%;
  letter-spacing: 0.5px;
  margin-left: 8px;
  padding: 0 5px;
  border: 1px solid rgba(202, 166, 98, 0.5);
  border-radius: 3px;
  color: rgba(202, 166, 98, 0.9);
  vertical-align: 1px;
  white-space: nowrap;
}

.foot {
  margin-top: 10px;
  font-size: 80%;
  text-align: center;
  color: rgba(232, 221, 208, 0.5);
  flex: 0 0 auto;
}
</style>
