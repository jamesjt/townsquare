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
    <li v-if="players.length - teams.traveler < 5">
      Please add more players!
    </li>
    <li>
      <span class="meta" v-if="!edition.isOfficial">
        {{ edition.name }}
        {{ edition.author ? "by " + edition.author : "" }}
      </span>
      <!-- Golem fork: our own count art (golem/glyphs), not Font Awesome —
           the town, the living, the dead, the votes those hands can cast. -->
      <span title="In the town">
        {{ players.length }}
        <img class="count-icon" :src="countIcons.town" alt="players" />
      </span>
      <span title="Alive">
        {{ teams.alive }}
        <img class="count-icon" :src="countIcons.alive" alt="alive" />
      </span>
      <span title="Dead">
        {{ teams.dead }}
        <img class="count-icon" :src="countIcons.dead" alt="dead" />
      </span>
      <span title="Votes available">
        {{ teams.votes }}
        <img class="count-icon" :src="countIcons.votes" alt="votes" />
      </span>
    </li>
    <li v-if="players.length - teams.traveler >= 5">
      <!-- the composition, in the same team art the drawer and the script
           workbench wear (golem/glyphs) -->
      <span title="Townsfolk">
        {{ teams.townsfolk }}
        <img class="team-glyph" :src="teamGlyph('townsfolk')" alt="townsfolk" />
      </span>
      <span title="Outsiders">
        {{ teams.outsider }}
        <img class="team-glyph" :src="teamGlyph('outsider')" alt="outsiders" />
      </span>
      <span title="Minions">
        {{ teams.minion }}
        <img class="team-glyph" :src="teamGlyph('minion')" alt="minions" />
      </span>
      <span title="Demons">
        {{ teams.demon }}
        <img class="team-glyph" :src="teamGlyph('demon')" alt="demons" />
      </span>
      <span v-if="teams.traveler" title="Travellers">
        {{ teams.traveler }}
        <img class="team-glyph" :src="teamGlyph('traveler')" alt="travellers" />
      </span>
      <span v-if="grimoire.isNight">
        Night phase
        <img class="count-icon" :src="countIcons.night" alt="night" />
      </span>
    </li>
  </ul>
</template>

<script>
import gameJSON from "./../game";
import { mapState } from "vuex";
// Golem fork: the fork's own icon art, defined once (golem/glyphs) and shared
// with the role drawer, the script workbench and the edition modal.
import { COUNT_ICONS, teamGlyph } from "../golem/glyphs";

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
    ...mapState(["edition", "grimoire"]),
    ...mapState("players", ["players"])
  },
  methods: {
    teamGlyph
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";

.info {
  position: absolute;
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

    .players {
      color: #00f700;
    }
    .alive {
      color: #ff4a50;
    }
    .votes {
      color: #fff;
    }
    .townsfolk {
      color: $townsfolk;
    }
    .outsider {
      color: $outsider;
    }
    .minion {
      color: $minion;
    }
    .demon {
      color: $demon;
    }
    .traveler {
      color: $traveler;
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
