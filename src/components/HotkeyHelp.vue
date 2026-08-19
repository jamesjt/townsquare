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
      <h3>Keys</h3>
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
  background: rgba(0, 0, 0, 0.7);
}

.panel {
  max-width: 460px;
  width: calc(100% - 40px);
  max-height: 80vh;
  overflow-y: auto;
  padding: 14px 20px 16px;
  background: rgba(8, 6, 8, 0.96);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 20px black;
  color: #e8ddd0;
}

h3 {
  margin: 0 0 10px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  background: linear-gradient(
    to right,
    $townsfolk 0%,
    rgba(0, 0, 0, 0.5) 20%,
    rgba(0, 0, 0, 0.5) 80%,
    $demon 100%
  );
  border-radius: 6px;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
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
