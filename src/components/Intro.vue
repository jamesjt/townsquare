<template>
  <div class="intro">
    <img src="static/apple-icon.png" alt="" class="logo" />
    <div>
      <!-- Golem fork: the walkthrough paragraph is three themed doors. Each
           button drives the SAME path as its hotkey (a synthetic keyup), so
           there is exactly one host/join/create flow to maintain. -->
      <ul class="doors">
        <li @click="press('h')">Host<em>[H]</em></li>
        <li @click="press('j')">Join<em>[J]</em></li>
        <li @click="press('c')">Create<em>[C]</em></li>
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
export default {
  data() {
    return {
      language: window.navigator.userLanguage || window.navigator.language
    };
  },
  methods: {
    press(key) {
      document.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
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

      em {
        display: block;
        font-family: sans-serif;
        font-style: normal;
        font-size: 50%;
        opacity: 0.6;
        margin-top: 4px;
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
</style>
