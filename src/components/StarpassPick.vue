<template>
  <!-- Golem fork (FT-1314): THE STARPASS CHOOSER — "who inherits?"

       Rendered on exactly one client in the town: the dying Imp's, for as
       long as their `session.starpassOffer` stands (a direct "starpass"
       frame from the host put it there; their own pick — or the day
       breaking — takes it away). The choice is the Imp's last act, so the
       surface is small, modal in spirit but never blocking the table: a
       plated card at the ring's centre, one button per live Minion.

       The pick is one commit (`session/starpassAnswer` — the callBack
       idiom); socket.js sends it to the host on the direct lane and the
       host's engine (golem/automations) validates before any crown moves.
       Nothing here holds a secret beyond what this client was already sent:
       the minion NAMES, which the offer deliberately limits itself to. -->
  <div class="starpass" v-if="offer">
    <div class="sp-card">
      <h3 class="sp-title">The Imp falls</h3>
      <p class="sp-ask">Who inherits? Pick the Minion who becomes the Imp.</p>
      <ul class="sp-list">
        <li v-for="m in offer.minions" :key="m.seat">
          <button
            type="button"
            class="sp-pick"
            :title="m.name + ' becomes the Imp'"
            @click="pick(m.seat)"
          >
            {{ m.name }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  name: "StarpassPick",
  computed: {
    ...mapState(["session"]),
    offer() {
      return this.session.starpassOffer;
    },
  },
  methods: {
    pick(seat) {
      this.$store.commit("session/starpassAnswer", { seat });
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../controls.scss";

// Over the seats (11) and the centre panels (19) — this is the one question
// on this client's screen while it stands, and it takes no clicks beyond its
// own buttons (the backdrop is pointer-transparent; only the card is real).
.starpass {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.sp-card {
  pointer-events: all;
  @include control-plate;
  background: rgba(0, 0, 0, 0.88);
  border-color: $demon;
  box-shadow:
    0 0 24px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(206, 1, 0, 0.35);
  padding: 1em 1.4em 1.2em;
  max-width: 22em;
  text-align: center;
}

.sp-title {
  margin: 0 0 0.2em;
  color: $demon;
  font-family: PiratesBay, sans-serif;
  font-weight: normal;
  font-size: 1.4em;
}

.sp-ask {
  margin: 0 0 0.8em;
  color: #d8cdb4;
  font-size: 0.8em;
}

.sp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  justify-content: center;

  .sp-pick {
    @include control-plate;
    font-family: inherit;
    font-weight: bold;
    font-size: 0.85em;
    color: #d8cdb4;
    padding: 0.5em 1.1em;
    cursor: pointer;

    &:hover {
      color: #fff;
      @include control-plate-hover;
    }
    &:focus-visible {
      @include control-focus-ring;
    }
    @media (pointer: coarse) {
      min-height: 40px;
    }
  }
}
</style>
