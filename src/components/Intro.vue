<template>
  <div class="intro">
    <img src="static/apple-icon.png" alt="" class="logo" />
    <div>
      <!-- Golem fork: the walkthrough paragraph is three themed doors. Each
           button drives the SAME path as its hotkey (a synthetic keyup), so
           there is exactly one host/join/create flow to maintain. -->
      <!-- In a session with no seats yet, the next step is SEATS, not doors:
           the host adds them; a player waits for the storyteller. -->
      <template v-if="session.sessionId && !session.isSpectator">
        <p class="hint">Hosting <b>{{ session.sessionId }}</b> — add seats to build the town.</p>
        <ul class="doors">
          <li @click="press('a')"><span class="key">A</span>dd Players</li>
        </ul>
      </template>
      <p class="hint" v-else-if="session.sessionId && session.isSpectator">
        Joined <b>{{ session.sessionId }}</b> — waiting for the storyteller to
        add seats…
      </p>
      <ul class="doors" v-else>
        <li @click="press('h')"><span class="key">H</span>ost</li>
        <li @click="press('j')"><span class="key">J</span>oin</li>
        <li @click="press('c')"><span class="key">C</span>reate</li>
      </ul>
    </div>
    <a
      class="redirect"
      v-if="language === 'zh-CN'"
      href="https://clocktower.gstonegames.com"
    >
      <img src="../assets/gstone.png" class="gstone" alt="" />
      你想使用中文版魔典吗？
    </a>
  </div>
</template>

<script>
import { mapState } from "vuex";

export default {
  computed: mapState(["session"]),
  data() {
    return {
      language: window.navigator.userLanguage || window.navigator.language
    };
  },
  methods: {
    press(key) {
      // The hotkey listener lives on the App root element (@keyup), so a
      // document-dispatched synthetic event never reaches it. Intro is App's
      // direct child — call the one handler with the same payload the key
      // would carry: still exactly one flow per verb.
      this.$parent.keyup({ key, ctrlKey: false, metaKey: false });
    }
  }
};
</script>

<style scoped lang="scss">
// Intro
.intro {
  text-align: center;
  width: 50%;
  font-size: 120%;
  position: absolute;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 3px solid black;
  border-radius: 10px;
  z-index: 3;
  display: flex;
  justify-content: center;
  a {
    color: white;
  }

  // Golem fork: the three doors, in the editions' display face.
  .hint {
    margin: 6px 0 0;
    b { color: #c00; text-shadow: 0 0 4px black; }
  }

  ul.doors {
    list-style-type: none;
    display: flex;
    justify-content: center;
    gap: 15px;
    padding: 10px 0;
    margin: 0;

    li {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      font-size: 140%;
      cursor: pointer;
      padding: 10px 25px;
      background: rgba(0, 0, 0, 0.7);
      border: 3px solid black;
      border-radius: 10px;
      box-shadow: 0 0 10px black;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
        1px 1px 0 #000;
      transition: color 250ms;

      &:hover {
        color: red;
      }

      .key {
        color: #c00;
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
          1px 1px 0 #000;
        display: inline-block;

        // A bead of blood swells at the letter's foot...
        &::before {
          content: "";
          position: absolute;
          left: 40%;
          bottom: -2px;
          width: 5px;
          height: 5px;
          background: #a00;
          border-radius: 40% 40% 60% 60%;
          animation: bead 3.2s ease-in infinite;
        }
        // ...and a droplet breaks off and falls.
        &::after {
          content: "";
          position: absolute;
          left: 40%;
          bottom: -2px;
          width: 4px;
          height: 7px;
          background: #c00;
          border-radius: 50% 50% 60% 60% / 30% 30% 70% 70%;
          opacity: 0;
          animation: drip 3.2s ease-in infinite;
        }
      }
      // stagger the three doors so they do not bleed in unison
      li:nth-child(2) .key::before,
      li:nth-child(2) .key::after {
        animation-delay: 1.1s;
      }
      li:nth-child(3) .key::before,
      li:nth-child(3) .key::after {
        animation-delay: 2.2s;
      }
    }
  }

  a.redirect {
    display: block;
    text-decoration: none;
    position: absolute;
    top: 100%;
    margin-top: 2vh;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    border-radius: 10px;

    &:hover {
      color: red;
    }
    img {
      width: 120px;
      display: block;
      margin: auto;
      margin-bottom: 1vh;
    }
  }

  img.logo {
    position: absolute;
    bottom: 100%;
    width: 25vh;
    margin-bottom: 2vh;
    max-width: 192px;
    border-radius: 50%;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
  }
  .footer {
    font-size: 60%;
    opacity: 0.75;
  }
}

@keyframes bead {
  0%, 55% {
    transform: scaleY(0.6);
    opacity: 1;
  }
  70% {
    transform: scaleY(1.15) translateY(1px);
    opacity: 1;
  }
  78%, 100% {
    transform: scaleY(0.6);
    opacity: 1;
  }
}
@keyframes drip {
  0%, 70% {
    transform: translateY(0) scaleY(0.6);
    opacity: 0;
  }
  74% {
    opacity: 1;
    transform: translateY(2px) scaleY(1);
  }
  100% {
    transform: translateY(26px) scaleY(1.3);
    opacity: 0;
  }
}
</style>
