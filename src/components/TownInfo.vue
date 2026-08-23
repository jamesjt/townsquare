<template>
  <!-- FT-993 (user correction, second pass): the blood splat no longer
       paints as THIS element's own background -- it is its own layer now,
       in App.vue, stacked between the dial art and the clock hands (see
       App.vue's <FaceHands> comment for why: nothing nested inside
       TownSquare could sit behind the hands while `.info` itself, right
       here at z-index 2, has to stay above them).

       This panel's only remaining job re: the splat is to STAND ASIDE once
       one exists. `.info`'s CSS background is demon-head.png again,
       unconditionally (the rule below) -- but left painted it would sit ON
       TOP of and hide the real layer underneath, since both are centred on
       the same dial point. `splat-live` (hasFaceSplat below) clears it,
       letting the layer beneath show through this box's own transparent
       gaps once the mark exists. -->
  <ul class="info" :class="{ 'splat-live': hasFaceSplat }">
    <!-- FT-880/FT-1051: CALL THE TOWN BACK — every connected client makes a
         noise at once. It lived in the top strip (Menu.vue); FT-1051 (user)
         stood it here instead, ABOVE the script name, in the phase chip's
         own engraved-plate idiom — the table's own control, not one mark
         among ten. Storyteller only by v-if, so a player's tree never
         contains it. No confirm and no arm-then-press: there is nothing to
         undo, and a summons that takes two clicks arrives after the
         conversation it was meant to interrupt. The cooling guard is the
         same nervous-double-press swallow it always had — a summons chopped
         off at half a second and restarted sounds like a fault.

         FT-1063 (user, "all controls for the storyteller in one place"):
         STOOD DOWN, not deleted, per the house never-delete rule. The bell
         moved to App.vue's `.storyteller-post` column, above the grimoire
         book — same click handler, same cooling guard, same round plate,
         just a different address. The script logic below (callBackCooling,
         callTownBack) stays too, now unused here on purpose. -->
    <li class="info-call" v-if="false">
      <!-- FT-1061 (user: "the clock face is getting really busy"): text off,
           icon only — see the CSS block below for where this control moved
           to and why. `aria-label` steps in for the vanished visible label
           (title alone is a mouse-only disclosure; a bare icon button with
           neither would have no accessible name at all) — same wording as
           the tooltip, so a screen reader and a mouse hover say the same
           thing. -->
      <button
        type="button"
        class="call-now"
        :class="{ cooling: callBackCooling }"
        :title="
          callBackCooling
            ? 'Just called the town back'
            : 'Call the town back — everyone hears a sound'
        "
        :aria-label="
          callBackCooling
            ? 'Just called the town back'
            : 'Call the town back — everyone hears a sound'
        "
        @click="callTownBack"
      >
        <font-awesome-icon icon="bell" class="call-mark" />
      </button>
    </li>
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
           work.

         FT-1063 (user, "all controls for the storyteller in one place"):
         STOOD DOWN, not deleted, per the house never-delete rule — and this
         time for EVERY seat, not just relocated for the storyteller. The
         PLAYER-facing readout retires entirely: the day/night already lives
         in the digital clock and the hour hand, so a second line saying the
         same thing had no reason to exist once it was not also carrying a
         button (user: "just remove what the player-facing version of the
         End-day button is"). The STORYTELLER's button half moves to
         App.vue's `.storyteller-post` column, below the grimoire book —
         same component :is button/span split, same isPhaseLive gating, same
         click path (onPhaseClick -> endPhase()), same plate. Below the VI
         numeral is empty for every seat now. -->
    <li class="info-phase" v-if="false">
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
    <!-- FT-1058b (user): the small winner line stands down — the ceremony's
         big centered banner (EndCeremony) says it now, for every seat. The
         markup is unmounted, not deleted, per the house rule.

         FT-1063: `v-else-if` -> `v-if` — its own chain partner (.info-phase,
         just above) also stood down to `v-if="false"` this same pass, and
         two literal `false`s back to back trips vue/no-dupe-v-else-if. Same
         never-renders behaviour either way; only the directive changed. -->
    <li class="info-result" v-if="false">
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
      <!-- FT-998 (user call): the DEAD count is gone — it said nothing "in the
           town" and "alive" didn't already say between them. Its slot counts
           GHOST VOTES LEFT instead: dead players whose one ghost vote is still
           unspent (isDead && !isVoteless — the same pair of flags Vote.vue
           locks a dead hand with and the seat's own ghost-vote mark reads).
           The icon is the cowl, which has meant "unspent ghost vote" app-wide
           since the seat mark started wearing it (254a674). -->
      <span class="stat ghost" tabindex="0" :aria-label="'Ghost votes left: ' + teams.ghostVotes">
        {{ teams.ghostVotes }}
        <img class="count-icon" :src="ghostCowl" alt="" />
        <span class="tip" role="tooltip">Ghost votes left</span>
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
      <!-- FT-998 (user call, superseding the hand above the same way the hand
           superseded the gallows): "votes available" is out — the number that
           matters at a glance is VOTES TO EXECUTE, the majority a nomination
           has to clear. Same arithmetic as Vote.vue's `majority` (non-exile
           branch: ceil of the living / 2, off the same isDead filter its
           players/alive getter uses) — mirrored, never a second rule. The
           icon is the fork's own baked noose (ui-noose.png; source SVG sits
           next to it), and the digit dropped its gold: the gold hand measured
           1.06:1 against the face art on FT-993. -->
      <span class="stat execute" tabindex="0" :aria-label="'Votes to execute: ' + teams.execute">
        {{ teams.execute }}
        <img class="count-icon" :src="nooseIcon" alt="" />
        <span class="tip" role="tooltip">Votes to execute</span>
      </span>
    </li>
    <li class="teams-row" v-if="players.length - teams.traveler >= 5">
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
// FT-998: the two count marks this readout wears that COUNT_ICONS doesn't
// carry — the cowl (the app-wide "unspent ghost vote" mark the seats already
// wear, 254a674) and the fork's own baked noose (votes-to-execute; its source
// SVG sits beside the PNG). Imported here rather than added to golem/glyphs
// because this readout is their only count-row consumer today.
import ghostCowl from "../assets/ui-ghost-cowl.png";
import nooseIcon from "../assets/ui-noose.png";
// FT-880/FT-1051: the town summons — trigger moved here from the strip
// (Menu.vue). The storyteller's press plays it locally too, since the relay
// never echoes a message back to whoever sent it.
import { playCallBack, CALL_BACK_COOLDOWN } from "../golem/callBack";
// FT-993: this panel no longer picks or draws the splat itself -- that
// moved to App.vue with the visible layer. It only needs to know whether
// one exists, to clear its own knocker background out of that layer's way
// -- see hasFaceSplat below.

export default {
  data() {
    return {
      countIcons: COUNT_ICONS,
      ghostCowl,
      nooseIcon,
      // FT-880/FT-1051: the summons' nervous-double-press guard, moved here
      // with its button — about this one control's feel, not town state.
      callBackCooling: false,
      callBackTimer: null,
    };
  },
  beforeDestroy() {
    clearTimeout(this.callBackTimer);
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
        // FT-998: `dead` and `votes` (alive + unspent ghost votes) retired
        // with their stats — the two numbers this row reads now:
        // ghost votes still unspent — the same isDead/isVoteless pair the
        // old `votes` sum counted, minus the living it folded in
        ghostVotes: players.filter(
          player => player.isDead === true && player.isVoteless !== true
        ).length,
        // the majority a nomination must clear — Vote.vue's `majority`
        // (non-exile branch), mirrored exactly: ceil of the living / 2,
        // where "living" is the same isDead filter `alive` above and the
        // store's players/alive getter both apply
        execute: Math.ceil(alive / 2)
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
    /**
     * FT-993: does a splat exist right now? `grimoire.faceSplatSeed` is the
     * same frozen STORE field App.vue's own visible copy reads (frozen once,
     * by TownSquare's created(), on session/distributeRoles or this
     * client's own seat receiving a role) -- this panel just needs to know
     * ONE exists, not which file or what rotation, since it no longer draws
     * the mark itself. Read fresh off the store rather than tracked locally
     * for the same reason it always was: this panel is not always mounted
     * (App.vue swaps it out for Vote.vue on every nomination, back again
     * after), so a local flag would forget across a remount.
     *
     * THE WASH IS GONE (this same correction pass). It existed only to
     * rescue `.minion`'s contrast against the raw splat art once this panel
     * started painting it as its own background (measured regression:
     * claude_temp_test/2026-08-20-ft991-pass2-shots/pass2-contrast-
     * results.json) -- now that the splat is a separate layer this panel
     * doesn't paint at all, there is nothing here for a wash to rescue.
     */
    hasFaceSplat() {
      return !!this.grimoire.faceSplatSeed;
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
    /**
     * FT-880 (moved here by FT-1051): ring the town.
     *
     * Two things happen, and the second is not decoration: the mutation is
     * what travels (the socket plugin owns the storyteller-only guard on
     * it), and the local play is because the relay never sends a message
     * back to the client that sent it — without it the storyteller presses
     * a button and gets total silence, which is indistinguishable from a
     * broken one.
     *
     * The guard here is a courtesy, not a defence: the real refusals are in
     * socket.js and the relay. This one just keeps a twitchy double-tap
     * from chopping the clip off at half a second and starting it again.
     */
    callTownBack() {
      if (this.session.isSpectator) return;
      if (this.callBackCooling) return;
      this.callBackCooling = true;
      this.callBackTimer = setTimeout(() => {
        this.callBackCooling = false;
      }, CALL_BACK_COOLDOWN);
      this.$store.commit("session/callBack");
      playCallBack(this.grimoire.isMuted);
    },
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

  // FT-1061: THE DIAL'S MEASURED CENTRE, reproduced locally rather than
  // inherited. FaceHands.vue computes this exact point as --fh-cx/--fh-cy on
  // its own #face-hands-root -- but that element and this one (.info) are
  // SIBLINGS under #app (App.vue mounts <FaceHands> and <TownInfo>
  // separately), and a custom property set inline on one element's own node
  // does not cascade sideways to a sibling's subtree, only down its own.
  // --face-cx / --face-cy / --fpx (measured before the art-offset
  // correction, published on #app itself -- FaceHands.vue's own comment
  // block on "THE PIVOT") and --fh-centre-x / --fh-centre-y (the face lab's
  // nudge, published on document.documentElement by
  // golem/faceHands.js#publishFaceHandsLab -- an ANCESTOR of everything, so
  // already inherited here) are all already in scope; only the measured
  // art-vs-dial offset constants (-11, -20 face-px) needed restating to
  // land on the SAME point the numeral ring is centred on.
  --ti-dial-cx: calc(
    var(--face-cx) + (-11 + var(--fh-centre-x, 0)) * var(--fpx)
  );
  --ti-dial-cy: calc(
    var(--face-cy) + (-20 + var(--fh-centre-y, 0)) * var(--fpx)
  );
  // THE KNOCKER, unconditional again (FT-993): shown whenever no game has
  // dealt a splat yet -- during setup, on the index page's own preview of
  // this panel if any, and for a spectator who has not yet learned a game
  // is live. Never deleted or conditionally compiled out (MEMORY-CORE rule
  // 1) -- the asset and the rule stay exactly as originally authored.
  background: url("../assets/demon-head.png") center center no-repeat;
  background-size: auto 100%;

  // FT-993: once a splat exists, the real mark now lives in its OWN layer
  // in App.vue, behind the clock hands and in front of the dial art -- and
  // this panel sits at z-index 2, well above both. Left painted, the
  // knocker above would sit on top of and hide that lower layer, since
  // both are centred on the same dial point. Clearing it here (not
  // swapping in the splat image, as an earlier pass did) is what lets the
  // real layer show through this box's own transparent gaps instead.
  &.splat-live {
    background: none;
  }

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

    // FT-993 (user correction, pointing at the clock face: "you added a
    // black background to this.. remove it, it is bad"): the FT-975 plate
    // that used to be here (background/border/radius/box-shadow, sized to
    // this row) is gone, not softened — no scrim, no per-glyph halo, no
    // replacement ground of any kind. The type sits directly on the art
    // again, the way it did before FT-975 added the plate. Several counts
    // measure low against it; that is reported, not fixed here, per the
    // user's own call — a measured number is not standing permission to add
    // something back.
    //
    // FT-998 (user clarification of that correction): "we wanted to remove
    // the BIGGER black box, not that one... it can be fainter than it was
    // and even maybe black glass." So the stat rows get a GROUND back —
    // but black glass, not the plate: a low-opacity dark pill whose edges
    // the blur dissolves (no border, no hard rectangle, much fainter than
    // FT-975's 'rgba(0,0,0,.5) + border + box-shadow' plate was). It rides
    // a ::before at z-index -1 — the li's own drop-shadow filter makes the
    // li a stacking context, so -1 lands behind the type but still in
    // front of the clock art.

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
    // FT-998: `.dead`'s slot and its drained grey pass to the ghost-vote
    // count — a ghost vote is exactly the dead's leftover agency, so the
    // "colour taken out of it" note carries over whole
    .ghost {
      color: #9b9b9b;
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(155, 155, 155, 0.85))
          drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      }
    }
    // FT-998: the gold went with the hand (it measured 1.06:1 against the
    // face art on FT-993). The execution threshold wears pale bone — the
    // same ink family as the count icons themselves and the brightest note
    // on the row, distinct from `.players`' darker parchment beside it
    .execute {
      color: #f0e6d8;
      .count-icon {
        filter: drop-shadow(0 0 4px rgba(240, 230, 216, 0.85))
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
      // FT-998: the same two layers as its neighbours PLUS an omni dark
      // halo. The shared recipe's only dark note is the 0/1px contact
      // shadow, and on the minion it never reads: $minion's orange glow
      // sits in the face art's own warm range, so glyph, glow and ground
      // melt together where blue/red/purple separate for free (the user's
      // screenshot: flat against the art). The extra 3px black pass is the
      // dark seat the others get optically, made explicit here.
      .team-glyph {
        filter: drop-shadow(0 0 4px rgba($minion, 0.8))
          drop-shadow(0 0 3px rgba(0, 0, 0, 0.9))
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

  // FT-998: the black-glass ground itself — see the comment block above for
  // the history (plate added FT-975, removed FT-993, faint ground reinstated
  // here on the user's clarification). One pill per stat row; the two sit
  // close enough that their blurred edges read as one piece of glass.
  li.counts-row,
  li.teams-row {
    position: relative;
    &::before {
      content: "";
      position: absolute;
      // FT-998b (user call: "this black shadow behind the stats shouldn't
      // be wider than they are") — the pill hugged the row's box, not its
      // content, and 14px of side reach plus a 6px blur read as a shadow
      // hanging past the last icon. Tighter reach, tighter blur.
      // FT-1020 (user: "tighter on the stats... less padding left and right")
      inset: -2px -3px;
      z-index: -1;
      border-radius: 999px;
      background: rgba(10, 5, 7, 0.4);
      filter: blur(4px);
      pointer-events: none;
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

  // FT-1051: THE SUMMONS. ORIGINALLY above the script name — anchored to
  // the edition badge's own TOP edge, lifted fully above itself, clearing
  // FaceHands' digital readout by 36 face-px (FT-1059). SUPERSEDED BELOW
  // (FT-1061): that whole derivation described a slot this control no
  // longer occupies. Kept rather than rewritten, per the house rule — the
  // history of why it once stood there is still true, just not where it
  // stands now.
  //
  // FT-1061 (user: "the clock face is getting really busy"): TWO CONTROLS
  // SWAPPED SLOTS. This one drops its label and becomes a bare icon, and
  // moves INTO the phase chip's old position — `.info-phase`'s own
  // pre-FT-1061 top/left/transform, copied verbatim below. The phase chip
  // itself relocates to the dial's six-o'clock spot; see its own block
  // just below for where and why. Nothing about `.call-now`'s BEHAVIOUR
  // moved: same click handler, same cooling guard, same host-only v-if,
  // same tooltip text (now doubling as `aria-label` in the template, since
  // the visible label is gone).
  .info-call {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, calc(-50% + 105px));
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    z-index: 5;

    // FT-1061: A ROUND, ICON-ONLY PLATE — the engraved-control feel kept
    // (same ground/edge/hover/cooling recipe `.call-now` always wore), but
    // circular and sized as a touch target (46px — clears the WCAG 44px
    // minimum) rather than a pill wrapping text that no longer exists.
    .call-now {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      color: #d8cdb4;
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 50%;
      background: rgba(20, 16, 22, 0.9);
      width: 46px;
      height: 46px;
      padding: 0;
      cursor: pointer;
      transition:
        background 150ms,
        border-color 150ms,
        color 150ms;

      &:hover,
      &:focus-visible {
        background: rgba(32, 24, 38, 0.95);
        border-color: rgba(150, 130, 175, 0.75);
        color: #fff;
        outline: none;
      }
      // "not yet" — the cooling swallow dims like the strip's bell did
      &.cooling {
        color: #7a736a;
        cursor: default;
        pointer-events: none;
      }
    }
    // FT-1061: ~1.9x the old 14px mark — an icon carrying the whole
    // control's meaning alone needs to read at a glance, not just confirm
    // a label that used to sit beside it.
    .call-mark {
      width: 26px;
      height: 26px;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
    }
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
  // FT-975 (correction pass): THIS BOX WAS THE OLD BUTTON'S BOX (its
  // `top: 50%; left: 50%; transform: translate(-50%, calc(-50% + 105px))`)
  // — centred on `.info`'s own centre, which sits on #app's own centre at
  // every size (claude_temp_test/2026-08-20-ft975-evidence). SUPERSEDED
  // BELOW (FT-1061): that box now belongs to `.info-call`, the bell —
  // see its own block above. Kept, not rewritten, per the house rule.
  //
  // FT-1061 (user: "the clock face is getting really busy"): OFF THE
  // STATS STACK, ONTO THE DIAL. This control moves to the six-o'clock
  // spot below the VI numeral — the same face-pixel coordinate system
  // FaceHands' numeral ring and digital readout use, not a percentage of
  // `.info`'s own box, so it scales with the dial and stays put at every
  // viewport exactly as they do. `--ti-dial-cx`/`--ti-dial-cy` (declared on
  // `.info` above) are the measured dial centre; VI (numeral 6 of 12) sits
  // at that centre + 196 face-px straight down (FaceHands.vue's
  // NUMERAL_RADIUS_FACE, angle 180deg — six o'clock is x=0 by construction).
  //
  // 420 FACE-PX, NOT SOMETHING CLOSER TO THE RIM — MEASURED, not the first
  // guess. The outer bronze rim is a circle at ~238 face-px (App.vue's
  // `--face-r`), and VI's own bottom edge lands only ~17 face-px past its
  // 196 centre — a control dropped straight after the rim (measured at
  // 1280x800, claude_temp_test/2026-08-22-ft1061-shots.mjs: rim edge at
  // screen y=590.75, this element's own box is 42.8px tall) lands ON TOP
  // OF THE PLAYER RING, not past it: TownSquare seats its own seven coins
  // no further out than face-radius ~347 (measured centre-to-centre) with
  // a name label riding another ~40px past THAT — so the entire band from
  // the rim's edge to a seat's own name tag is claimed the moment a town
  // has any players in it, with no gap in it wide enough for this
  // control's own height. 420 face-px is where it clears the SEAT COIN'S
  // own circle by a real margin (~19px at 1280x800) — the rounder, more
  // visually loud of the two things below it. It still sits close enough
  // to graze an "Open"/name label's own box at some player counts; `.info`
  // outranks the seat ring in the stack (z-index 2 vs the ring's auto —
  // FT-975's own note on this same file), so where that happens this
  // control's own plate paints OVER the label, not through it — reported
  // here rather than chased further, since clearing it outright would push
  // the control's own box past the 800px test viewport's bottom edge.
  .info-phase {
    position: absolute;
    left: var(--ti-dial-cx);
    top: calc(var(--ti-dial-cy) + 420 * var(--fpx));
    transform: translate(-50%, -50%);
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
