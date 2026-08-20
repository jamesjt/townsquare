<template>
  <ul class="info">
    <li
      class="edition"
      :class="['edition-' + edition.id]"
      :style="{
        backgroundImage: `url(${
          edition.logo && grimoire.isImageOptIn
            ? edition.logo
            : require('../assets/editions/' + edition.id + '.png')
        })`
      }"
    ></li>
    <!-- FT-862/FT-975: the PUBLIC phase readout — everyone at the table sees
         which day or night it is; that was never a secret. FT-975 folded
         NightSheet's "End night"/"End day" button INTO this element rather
         than leaving two objects that only looked like one (see NightSheet
         .vue's retired day pill for the other half of that move) — and a
         correction pass the same day moved it again: the merge takes the
         BUTTON's own position, size and plate (see the .info-phase CSS
         below), not the old readout LINE's — the label that used to sit
         under the edition badge is gone; this IS that slot now, just
         relocated to where the button always rendered, and it is not a
         separate line any more.

         - Storyteller, checklist not up (isPhaseLive true): a real
           <button> — "End day 3" / "End night 3" — wired to the SAME
           flipPhase() the E hotkey has always called, via App.vue's
           endPhase() (one dispatch path, never duplicated here).
         - Everyone else, and the storyteller too once the checklist card
           IS up (it already carries its own gated "End night" button —
           this steps back rather than doubling that control): a plain
           <span>, same size, shape, plate and marks as the button, but no
           role and not focusable — it reads to a mouse, a keyboard and a
           screen reader as text, not as a dead control. A greyed-out
           disabled BUTTON was rejected on purpose: a control-sized element
           that refuses a click is worse than a small one that never
           pretended to take one, and it invites a click that can never
           work. -->
    <li class="info-phase" v-if="!session.isEnded">
      <component
        :is="isPhaseLive ? 'button' : 'span'"
        :type="isPhaseLive ? 'button' : null"
        class="phase-now"
        :class="{ 'is-live': isPhaseLive }"
        :title="
          isPhaseLive
            ? grimoire.isNight
              ? 'End the night'
              : 'End the day'
            : null
        "
        @click="onPhaseClick"
      >
        <font-awesome-icon
          v-if="!grimoire.isNight"
          icon="sun"
          class="phase-sun"
        />
        <img v-else class="phase-mark" :src="moonMark" alt="" />
        {{ isPhaseLive ? phaseActionLabel : phaseLabel }}
        <font-awesome-icon
          v-if="!grimoire.isNight"
          icon="sun"
          class="phase-sun"
        />
        <img v-else class="phase-mark" :src="moonMark" alt="" />
      </component>
    </li>
    <!-- FT-931: THE RESULT. Once the town has ended there is no next phase
         to read — this is what every seat sees in its place, host and
         player alike (this readout has never been storyteller-only). Same
         team art the counts below and EndGameOverlay's own winner buttons
         already wear (golem/glyphs teamGlyph) — never a new pictogram for
         the same "which team" fact. -->
    <li class="info-result" v-else>
      <span class="result-now" :class="session.winningTeam">
        <img class="result-glyph" :src="resultGlyph" alt="" />
        {{ session.winningTeam === "evil" ? "Evil wins" : "Good wins" }}
      </span>
    </li>
    <li v-if="players.length - teams.traveler < 5">
      Please add more players!
    </li>
    <li class="counts-row">
      <span class="meta" v-if="!edition.isOfficial">
        {{ edition.name }}
        {{ edition.author ? "by " + edition.author : "" }}
      </span>
      <!-- Golem fork: our own count art (golem/glyphs), not Font Awesome —
           the town, the living, the dead, the votes those hands can cast.

           FT-863: the native `title` box is gone — it either never showed
           (mobile has no hover to trigger it) or showed the browser's own
           unstyled tooltip, which reads as a bug next to everything else
           here wearing the fork's own chrome. `.tip` is a light,
           purpose-built readout for a ONE-LINE label — RoleHoverCard's
           dark-plate idiom (rgba(10,4,4,.97) ground, #400 border, black
           glow), not RoleHoverCard itself: that component carries an icon,
           an ability paragraph and tag chips built for a ROLE, which is the
           wrong shape for "Alive" in eight point type. `tabindex` + a real
           `aria-label` (not the bare word — the number too, since the label
           overrides the span's own text for anyone not reading it visually)
           puts the count in front of keyboard and screen-reader users the
           same as a mouse. -->
      <span class="stat players" tabindex="0" :aria-label="'In the town: ' + players.length">
        {{ players.length }}
        <img class="count-icon" :src="countIcons.town" alt="" />
        <span class="tip" role="tooltip">In the town</span>
      </span>
      <span class="stat alive" tabindex="0" :aria-label="'Alive: ' + teams.alive">
        {{ teams.alive }}
        <!-- FT-975 (correction pass, user call): THE HEART READS RED NOW.
             countIcons.alive (ui-alive.png) is the shared "bone tone, one
             light origin, film grain" family (golem/glyphs.js) — an <img>
             can only ever show that native beige, a CSS `filter` glow
             around it (below) was never the shape itself. `.count-icon
             -mask` swaps the paint source: the <img> stays for layout
             (hidden, not removed — the box it reserves is what `.alive
             ::before` fills), and a masked ::before shows the SAME PNG's
             alpha as a stencil over a flat #ff4a50 fill — the digit's own
             red, already authored and reviewed here, not $demon (#ce0100):
             that exact hex is the DEMON team's own colour three rows below
             in this same panel, and reusing it on "alive" would read as
             "this is about the demon" the instant both are on screen
             together. -->
        <!-- A SPAN, not an <img> (fix 2026-08-20, user: "seems like we lost the
             heart symbol"). The recolour was written as `::before` on the
             image — and a replaced element does not render pseudo-elements,
             so the mask layer never painted while the image itself stayed
             `visibility: hidden`. The heart was not lost; it was covered by
             nothing. A span is not replaced, so it carries the mask itself. -->
        <span
          class="count-icon count-icon-masked"
          :style="{ '--count-mask': 'url(' + countIcons.alive + ')' }"
          aria-hidden="true"
        ></span>
        <span class="tip" role="tooltip">Alive</span>
      </span>
      <span class="stat dead" tabindex="0" :aria-label="'Dead: ' + teams.dead">
        {{ teams.dead }}
        <img class="count-icon" :src="countIcons.dead" alt="" />
        <span class="tip" role="tooltip">Dead</span>
      </span>
      <!-- FT-863: "votes" is not "in town" or "alive" restated — it is ALIVE
           PLUS every dead player still holding a vote token, so on a fresh,
           undamaged town it prints the same digit as the other three (the
           actual bug report: "why does the last one say 7"). The gallows
           stays — recolouring it away from its Menu-strip twin (which opens
           the vote-history drawer, unrelated) and giving it its own gold,
           token-coloured glow is the fix, not a new pictogram: this fork's
           own vote token (assets/vote-golem.png) IS gold but reads as a
           featureless blob at 17px (no internal contrast to survive the
           downscale — checked in claude_temp_test/count-icon-compare-40.png
           before choosing this over swapping the source image), so tinting
           the readable gallows silhouette beats replacing it with a blurrier
           "distinct" mark. The tooltip does the rest: it says what the
           strip's identical-looking icon does not — "available", not
           "history". -->
      <!-- OVERRULED 2026-08-19 by the user, who looked at the shipped version
           and said "still not sure what this means... available votes?". The
           reasoning above is sound about the ART and wrong about the answer:
           a tooltip cannot rescue a glyph that reads as the wrong thing, and
           the gallows reads as execution because that is what it opens from
           the strip. This number is how many HANDS can still be raised, so it
           wears the hand the seats themselves vote with — already in the app
           (Player.vue's vote overlay) and unmistakable at 17px. -->
      <span class="stat votes" tabindex="0" :aria-label="'Votes available: ' + teams.votes">
        {{ teams.votes }}
        <font-awesome-icon class="count-icon votes-hand" icon="hand-paper" />
        <span class="tip" role="tooltip">Votes available</span>
      </span>
    </li>
    <li v-if="players.length - teams.traveler >= 5">
      <!-- the composition, in the same team art the drawer and the script
           workbench wear (golem/glyphs) — and the same "tint the digit in
           the team's own colour" idiom ScriptView's composition meter
           already wears (.wb-meter .chip), not a new convention -->
      <span class="stat townsfolk" tabindex="0" :aria-label="'Townsfolk: ' + teams.townsfolk">
        {{ teams.townsfolk }}
        <img class="team-glyph" :src="teamGlyph('townsfolk')" alt="" />
        <span class="tip" role="tooltip">Townsfolk</span>
      </span>
      <span class="stat outsider" tabindex="0" :aria-label="'Outsiders: ' + teams.outsider">
        {{ teams.outsider }}
        <img class="team-glyph" :src="teamGlyph('outsider')" alt="" />
        <span class="tip" role="tooltip">Outsiders</span>
      </span>
      <span class="stat minion" tabindex="0" :aria-label="'Minions: ' + teams.minion">
        {{ teams.minion }}
        <img class="team-glyph" :src="teamGlyph('minion')" alt="" />
        <span class="tip" role="tooltip">Minions</span>
      </span>
      <span class="stat demon" tabindex="0" :aria-label="'Demons: ' + teams.demon">
        {{ teams.demon }}
        <img class="team-glyph" :src="teamGlyph('demon')" alt="" />
        <span class="tip" role="tooltip">Demons</span>
      </span>
      <span v-if="teams.traveler" class="stat traveler" tabindex="0" :aria-label="'Travellers: ' + teams.traveler">
        {{ teams.traveler }}
        <img class="team-glyph" :src="teamGlyph('traveler')" alt="" />
        <span class="tip" role="tooltip">Travellers</span>
      </span>
      <span v-if="grimoire.isNight" class="stat night" tabindex="0" aria-label="Night phase">
        Night phase
        <img class="count-icon" :src="countIcons.night" alt="" />
        <span class="tip" role="tooltip">Night phase</span>
      </span>
    </li>
  </ul>
</template>

<script>
import gameJSON from "./../game";
import { mapState, mapGetters } from "vuex";
// Golem fork: the fork's own icon art, defined once (golem/glyphs) and shared
// with the role drawer, the script workbench and the edition modal.
import { COUNT_ICONS, teamGlyph } from "../golem/glyphs";
// FT-862: the phase mark NightSheet's own header wears — same filenames, so
// whatever art lands there (another lane is redrawing the moon) shows up
// here too without a second import to keep in sync.
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";

export default {
  data() {
    return { countIcons: COUNT_ICONS };
  },
  computed: {
    teams: function() {
      const { players } = this.$store.state.players;
      const nonTravelers = this.$store.getters["players/nonTravelers"];
      const alive = players.filter(player => player.isDead !== true).length;
      return {
        ...gameJSON[nonTravelers - 5],
        traveler: players.length - nonTravelers,
        alive,
        dead: players.length - alive,
        votes:
          alive +
          players.filter(
            player => player.isDead === true && player.isVoteless !== true
          ).length
      };
    },
    // FT-862: PUBLIC phase readout, split off NightSheet's storyteller-only
    // checklist header (which keeps the "End night"/"End day" BUTTON where it was —
    // this is the label half, for every session role). Reads the same state
    // that header reads (night.day, grimoire.isNight, night/isFirstNight) —
    // no second phase counter. Day 0 (before the town's first night) reads
    // as "Day 1" here rather than NightSheet's storyteller-jargon "Before
    // the first night": a player has no checklist to be "before", they are
    // just in the town's first day.
    phaseLabel() {
      return (
        (this.grimoire.isNight ? "Night " : "Day ") +
        Math.max(this.night.day, 1)
      );
    },
    /**
     * FT-975: is this element ALSO the live end-phase control right now?
     * Storyteller-only, and only when NightSheet's own checklist card
     * isn't the one standing — this mirrors NightSheet.showList exactly
     * (night.mode !== "off" && grimoire.isNight). When the checklist IS
     * up it already carries its own gated "End night" button with the
     * ready/warn states this one-line readout has no room for, so this
     * element steps back to a label instead of doubling that control.
     */
    isPhaseLive() {
      return (
        !this.session.isSpectator &&
        !(this.night.mode !== "off" && this.grimoire.isNight)
      );
    },
    /**
     * FT-975: the live button's own label — the ACTION ("End night 3" /
     * "End day 3"), the same wording NightSheet's retired pill used
     * (its flipLabel), with the count riding alongside exactly where it
     * always sat next to phaseLabel's "Night 3" / "Day 3".
     */
    phaseActionLabel() {
      return (
        (this.grimoire.isNight ? "End night " : "End day ") +
        Math.max(this.night.day, 1)
      );
    },
    moonMark() {
      return this.isFirstNight ? moonFirst : moonOther;
    },
    /** FT-931: the result banner's own art — the same team glyph the counts
     *  below and EndGameOverlay's choice buttons already wear. */
    resultGlyph() {
      return teamGlyph(
        this.session.winningTeam === "evil" ? "demon" : "townsfolk"
      );
    },
    ...mapState(["edition", "grimoire", "night", "session"]),
    ...mapState("players", ["players"]),
    ...mapGetters("night", ["isFirstNight"])
  },
  methods: {
    teamGlyph,
    /**
     * FT-975: the merged element's click. Routed UP to App.vue via
     * `end-phase` — never dispatched here — because App.vue is what holds
     * the $refs.nightSheet ref the E hotkey already calls flipPhase()
     * through (see App.vue's endPhase()). One call site, whether the press
     * comes from a key or a click.
     *
     * A player's copy (isPhaseLive false) is a <span>, not a <button>, so
     * this only ever fires from a real click on the storyteller's live
     * copy — the isPhaseLive guard here is a second, cheap backstop, not
     * the thing doing the work.
     */
    onPhaseClick() {
      if (this.isPhaseLive) this.$emit("end-phase");
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";
// FT-912: for `face-disc-gate` — the one copy of the
// condition that decides whether the menus on the clock face are discs or
// rectangles.
@import "../faceDisc.scss";

.info {
  position: absolute;
  // FT-975: TownSquare's seat ring (`.square > ul.circle`) is ALSO
  // `position` + `z-index: auto`, and it comes later in the DOM — so with
  // both auto, stacking falls back to DOM order and the ring's own
  // (empty, at the centre) hit box wins every point under this element,
  // including here. That never mattered while everything in here was
  // inert text; it does now that `.info-phase` can be a live <button> —
  // measured via elementFromPoint(): without this, a real click at the
  // button's own on-screen centre resolved to `ul.circle`, not the
  // button, though a synthetic dispatchEvent (which skips hit-testing)
  // reached it fine and masked the bug. A small explicit z-index is
  // enough to move this whole element into the "positive z-index" paint
  // group, ahead of the ring's "auto" one, without touching TownSquare.vue
  // (held) or fighting the disc menus above it (.night-sheet is 19; this
  // stays well under that, and the face-disc-gate rule just below already
  // drops this to pointer-events:none whenever one of those is open).
  z-index: 2;
  display: flex;
  width: 20%;
  height: 20%;
  padding: 50px 0 0;
  align-items: center;
  align-content: center;
  justify-content: center;
  flex-wrap: wrap;
  background: url("../assets/demon-head.png") center center no-repeat;
  background-size: auto 100%;

  // ── FT-912: THE READOUT STANDS DOWN UNDER A DISC ──────
  //
  // A face disc is a menu that stops being a rectangle over the dial and
  // becomes a plate laid ON it — same centre, same radius (src/faceDisc.scss).
  // This readout sits directly underneath one, and hiding it was the disc's
  // material's job for three passes: 22px of blur and a 78%-opaque wash, which
  // is the recipe for FROSTED glass and is what the user rejected, three
  // times, in the same words.
  //
  // It does not have to be there at all. Nothing on this line is being read
  // while a storyteller is working a checklist laid over the top of it, and
  // every one of these numbers is back the instant the disc closes. Standing
  // it down is what let the plate's tint fall from .78 to .22 and its blur to
  // a sixth of the frost's — measured both ways in
  // claude_temp_test/2026-08-19-glassclear-sweep.mjs.
  //
  // THE GATE IS THE POINT OF THIS RULE, not decoration on it. `#app
  // .face-disc-open` is true whenever one of those menus is showing, disc or
  // not; BELOW the disc's own media query (a phone, a small window) they are
  // ordinary rectangles that do not cover the hub at all, and standing the
  // readout down there would hide it for no reason whatsoever. So the flag
  // says what is SHOWING and this gate says whether it is a DISC — one copy of
  // the condition, shared with all four surfaces.
  //
  // FADE, NOT CUT — and the fade is already here rather than declared again:
  // App.vue's boot gate gives every direct child of #app `transition: opacity
  // 400ms ease-in`, this element is one, and that rule outranks anything a
  // scoped class can say. So opacity is the only thing this needs to set, and
  // the readout dissolves under the disc instead of blinking out. It is well
  // inside the second the night backdrop takes to fall, so it never races the
  // checklist's own arrival.
  @include face-disc-gate {
    #app.face-disc-open > & {
      opacity: 0;
      // no hover targets and no tooltips under an opaque plate
      pointer-events: none;
    }
  }

  li {
    font-weight: bold;
    width: 100%;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.7));
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    text-shadow: 0 2px 1px black, 0 -2px 1px black, 2px 0 1px black,
      -2px 0 1px black;

    span {
      white-space: nowrap;
    }

    .meta {
      text-align: center;
      flex-basis: 100%;
      font-family: PiratesBay, sans-serif;
      font-weight: normal;
    }

    svg {
      margin-right: 10px;
    }

    // Golem fork: our own count + team art, sized to the type it rides beside
    // so it tracks the panel instead of being pinned to a pixel size
    .count-icon,
    .team-glyph {
      width: 1.05em;
      height: 1.05em;
      object-fit: contain;
      margin-right: 10px;
      vertical-align: -0.17em;
      // the counts sit on the lit clock face, so pale art needs its own
      // edge — the li's shadow alone leaves thin work (the gallows) faint
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
    }

    // FT-975 (correction pass): THE MASKED HEART. The <img> stays in the
    // DOM (still `alt=""`, still what reserves the box other stats' icons
    // size against) but paints nothing — `::before` reads the same source
    // PNG's alpha as a stencil over a flat fill, which is the only way to
    // put an exact colour ON a raster icon rather than glowing a colour
    // NEAR it (a `filter` cannot recolour a bitmap's own pixels). One rule,
    // reusable by name (`.count-icon-masked`) if another count ever wants
    // its own icon recoloured the same way — only `.alive` calls it today.
    // The mask rides the element ITSELF now — see the template for why the
    // `::before` it used to sit on never rendered. The mask URL comes in as a
    // custom property from the same `countIcons` the other stats use, so the
    // asset is still resolved by the bundler in one place rather than named a
    // second time here.
    .count-icon-masked {
      // `.count-icon` above already gives it the box, the margin and the
      // baseline every other stat icon has — this only adds what a MASK
      // needs, so the heart cannot drift out of line with its neighbours.
      display: inline-block;
      background-color: #ff4a50; // the same red the digit beside it already
      // wears — one red, not a second one for the icon
      -webkit-mask: var(--count-mask) center / contain no-repeat;
      mask: var(--count-mask) center / contain no-repeat;
    }

    // FT-975 (correction pass): THE COUNTS' OWN GROUND. Measured against the
    // real art, not a flat assumption (claude_temp_test/2026-08-20-ft975-
    // evidence/): these rows sit on a gold-and-bronze rose window whose OWN
    // brightness varies by seat — some stats landed on a lit fold (WCAG
    // ~1.1-3.3 against their current ink), others on a darker one. A
    // per-glyph pale halo — the reminder tiles' own recipe, checked first
    // (ReminderModal.vue's `.text`, `#f6dfbd`) — only rescues the DARK
    // spots; against the LIT gold, pale ink on a pale halo still blends
    // (measured 1.2-2.6:1 fill-vs-halo for exactly the stats sitting there).
    // One dark plate under the whole row is what a scattered set of halos
    // cannot do: every stat measured 3.5:1-12.7:1 against it, uniformly,
    // regardless of which fold of the window it happens to sit on.
    //
    // TEAM COLOURS ARE UNTOUCHED — this rule sets no `color:` on
    // `.townsfolk`/`.outsider`/`.minion`/`.demon`/`.traveler`, only what
    // sits BEHIND them (below). `.tip`'s own dark plate a few dozen lines
    // down (rgba(10,4,4,.97), #400 edge) is the source, not a new colour —
    // this is the same ground at a lighter alpha (.86) so the window still
    // shows through faintly, the way NightSheet's own pill plate (.7-.9)
    // does rather than going fully opaque.
    &.counts-row {
      background: rgba(10, 4, 4, 0.86);
      border: 1px solid rgba(64, 0, 0, 0.55);
      border-radius: 8px;
      padding: 4px 10px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    // FT-863: each stat gets ONE colour, worn by both its digit and a glow
    // behind its icon — so "which number goes with which glyph" reads at a
    // glance instead of by position alone. `.players` / `.alive` / `.votes`
    // are the same class names an earlier pass left behind when the icons
    // were still Font Awesome glyph-fonts (a bare `color` recoloured the
    // glyph itself, not just text) — the classes went dead when the markup
    // moved to these <img>s and nothing wore them; this pass puts them back
    // on the elements and repoints two of the three values (`.players` was
    // neon #00f700, `.votes` was plain white — both edited below, `.dead` is
    // new, `.alive` and every team colour were already right and are
    // untouched). `.night` stays uncoloured — it already carries its label
    // as visible text and was never one of the four numbers in question.
    .players {
      color: #d8cdb4; // the app's own muted parchment-label tone (RoleDrawer,
      // RoleTray, RoleActions) — neutral: this count isn't good or bad news
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(216, 205, 180, 0.85))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .alive {
      color: #ff4a50; // kept as authored: this fork already answers "alive"
      // with blood-red, in theme for a game called Blood on the Clocktower
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(255, 74, 80, 0.85))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .dead {
      color: #9b9b9b; // the one cool, drained note against a line that is
      // otherwise all warm reds and golds — dead is what has the colour
      // taken out of it
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(155, 155, 155, 0.85))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .votes {
      color: #e0b45f; // gold, matching this fork's vote-token art
      // (assets/vote-golem.png) — ties the number to "a token", the actual
      // thing being counted, and reads as its OWN mark next to a neutral
      // town count, a red alive count and a grey dead count
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(224, 180, 95, 0.9))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .townsfolk {
      color: $townsfolk;
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($townsfolk, 0.8))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .outsider {
      color: $outsider;
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($outsider, 0.8))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .minion {
      color: $minion;
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($minion, 0.8))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .demon {
      color: $demon;
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($demon, 0.8))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    .traveler {
      color: $traveler;
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($traveler, 0.8))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }

    // FT-863: the readout's OWN tooltip — RoleHoverCard's dark-plate idiom
    // (see the template comment above) scaled to one line, not that shared
    // component: a role card's icon + ability + chips is the wrong shape for
    // "Alive". Positioned relative to the stat itself rather than hoisted to
    // <body> — nothing in this row sits inside a rotated or clipped
    // ancestor the way seats in the ring do, so a plain absolute child is
    // enough.
    .stat {
      position: relative;
      border-radius: 4px;
      // keyboard users get the same disclosure a mouse gets on :hover
      &:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.55);
      }
    }
    .tip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translate(-50%, -6px);
      margin-bottom: 4px;
      padding: 5px 10px;
      background: rgba(10, 4, 4, 0.97);
      border: 1px solid #400;
      border-radius: 6px;
      box-shadow: 0 0 10px black;
      font-size: 12px;
      font-weight: normal;
      line-height: 1.3;
      color: #f0e6d8;
      text-shadow: none;
      letter-spacing: 0.2px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.12s ease, transform 0.12s ease;
      z-index: 15;
    }
    .stat:hover .tip,
    .stat:focus .tip {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -10px);
    }
  }

  li.edition {
    width: 220px;
    height: 200px;
    max-width: 100%;
    max-height: 100%;
    background-position: 0 center;
    background-repeat: no-repeat;
    background-size: 100% auto;
    position: absolute;
    top: -25%;
  }

  // FT-875: the phase readout, pinned to the BOTTOM EDGE of the edition
  // badge's own BOX — not to a padding number tuned against Trouble
  // Brewing's art. It landed ON the badge (FT-862's first pass: an in-flow
  // row under a flat 50px padding-top) because that padding was sized to
  // clear the ART a square-canvas edition happens to paint, and a taller
  // custom-script logo (a user can upload any aspect, including portrait)
  // would paint past it.
  //
  // li.edition (untouched, just above) is `position: absolute; top: -25%;
  // height: 200px; max-height: 100%`. Repeating those three declarations
  // here — unchanged — makes THIS element's box the same top and the same
  // (possibly max-height-clamped) rendered height as the badge's box,
  // whatever that clamp resolves to for the current window. `top: calc(-25%
  // + min(200px, 100%))` is that same box's BOTTOM edge, computed the same
  // way the browser computes the badge's own height (the smaller of the
  // fixed 200px or 100% of the container) — so it tracks the badge's actual
  // bottom for any window size without re-deriving anything. None of this
  // reads the LOGO's pixels at all, only the fixed box every edition (any
  // aspect ratio) is drawn into — that is what makes it aspect-independent.
  // Taken out of the flex-centered flow below (`position: absolute`) so it
  // no longer shifts where that stack's own vertical centering lands —
  // restoring the stats block to its pre-FT-862 position, which already
  // cleared the badge.
  // FT-975 (correction pass): THIS BOX IS NOW THE OLD BUTTON'S BOX, not the
  // old readout's. Measured off the pristine app at 1280x800 before any of
  // this landed (claude_temp_test/2026-08-20-ft975-evidence): `.info` (this
  // element's own parent) sits centred on #app's own centre at every size
  // (its 20%/20% box, static-positioned by the flex-centred layout #app
  // gives every un-inset absolute child) — and NightSheet's day pill, ALSO
  // un-inset and static-positioned the same way, sat on that exact same
  // centre before its own `transform: translateY(105px)` moved it down.
  // `top: 50%; left: 50%; transform: translate(-50%, calc(-50% + 105px))`
  // reproduces that precisely: centre on `.info`'s own centre (== the
  // button's pre-transform centre, by construction), then the identical
  // 105px. The label line that used to live under the edition badge
  // (`top: calc(-25% + min(200px,100%))`) is gone — that was the readout's
  // slot, and the readout is not a separate line any more, it IS this.
  .info-phase {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, calc(-50% + 105px));
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;

    // FT-975 (correction pass): THE BUTTON'S OWN PLATE, SIZE AND WEIGHT —
    // not the readout's. Lifted verbatim from NightSheet's own (now-
    // retired) .phase-flip: same ground, edge, radius, padding and type
    // size (measured 21.888px there; 22px here, its own ambient font-size
    // chain not being worth reproducing for a fraction of a pixel). Applied
    // to BOTH the button and the label — a player's copy is the same
    // control-sized shape, per the user: a big control-shaped thing that
    // refuses clicks is worse than a small one, so the size difference
    // between roles is exactly zero; only `cursor`/`:hover`/`:focus-visible`
    // (a real target, gated by isPhaseLive/is-live) differ.
    .phase-now {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: inherit;
      font-size: 22px;
      color: #d8cdb4;
      letter-spacing: inherit;
      text-shadow: inherit;
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 6px;
      background: rgba(20, 16, 22, 0.9);
      padding: 5px 16px;
      cursor: default;
      transition: background 150ms, border-color 150ms, color 150ms;

      // the only thing isPhaseLive actually changes on the plate: a pointer
      // and the hover/focus purple this app's controls answer the pointer
      // with everywhere (controls.scss $control-edge-hover), rather than
      // the OFF-state a player's non-interactive copy just sits at.
      &.is-live {
        cursor: pointer;
        &:hover,
        &:focus-visible {
          background: rgba(32, 24, 38, 0.95);
          border-color: rgba(150, 130, 175, 0.75);
          color: #fff;
          outline: none;
        }
      }
    }
    .phase-mark {
      width: 22px;
      height: 22px;
      object-fit: contain;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
    }
    // the same gold NightSheet's own sun wears (.phase-sun there) — one
    // phase mark, one colour, wherever it renders
    .phase-sun {
      width: 20px;
      height: 20px;
      color: #d8b45a;
    }
  }

  // FT-931: THE RESULT banner — the same box .info-phase computes just
  // above (position/top/etc — copied rather than merged into that selector
  // so the long derivation comment there stays attached to the rule it
  // explains; .info-phase and .info-result are never both in the DOM at
  // once, so nothing here needs to fight that rule for the slot).
  .info-result {
    position: absolute;
    left: 0;
    width: 100%;
    top: calc(-25% + min(200px, 100%));
    padding-top: 8px;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;

    .result-now {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 115%;
      // same team-colour + glyph-glow recipe the counts below and
      // EndGameOverlay's own choice buttons already wear — one definition
      // of "this readout belongs to team X", not a fourth copy of it
      &.good {
        color: $townsfolk;
        .result-glyph {
          filter: drop-shadow(0 0 4px rgba($townsfolk, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      &.evil {
        color: $demon;
        .result-glyph {
          filter: drop-shadow(0 0 4px rgba($demon, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
    }
    .result-glyph {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
  }
}

/* THE PLATE FOLLOWS THE RING. It is the town's centre mark, and it is pinned
   to the WINDOW's centre — which is the same place until the phone layouts
   move the square. Once the night sheet takes the bottom (portrait) or the
   right (landscape), the plate stayed behind: measured 375x812 it sat 244px
   below the ring, underneath the checklist's first row; at 812x375 it sat
   179px to the right of the ring, half under the sheet.

   Translating by exactly what the square gave up is what keeps it centred:
   the square loses 60% of the window's height in portrait (100% → 40%, so
   its centre rises 30vh) and 44% of the width in landscape (100% → 56%, so
   its centre moves 22vw left). */
@media (pointer: coarse) and (orientation: portrait) {
  #app.checklist-up .info {
    transform: translateY(-30vh);
  }
}
@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
  #app.night-sheet-up .info {
    transform: translateX(-22vw);
  }
}
</style>
