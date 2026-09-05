<template>
  <!-- FT-1320: THE GOLEM MARK'S OWN MENU. The mark used to be a bare
       sign-in click; it drops this small plate now — the account act that
       applies (Sign in signed out, Sign out signed in, riding golem/account's
       existing flow untouched), the change log's door, and room for the
       rows that come next (a row here is one <li> in the acts block below).

       ONE IDIOM WITH PlayerSettings.vue, built the same day: the same
       face-disc-menu-plate glass, the same body-hoist (the strip's .menu is
       overflow: hidden), the same fixed drop under its strip anchor, the
       same mousedown-not-click outside close, the same z-index 76. The rows
       differ because their JOBS differ: settings rows are name + control
       (no red hover lie); these are ACT rows, and they wear the corner
       menu's own clickable-row voice (pointer, red hover). -->
  <div class="account-menu" :style="posStyle">
    <ul class="am-plate">
      <li class="headline headline-plain">
        <img class="hl-mark" :src="uiGolem" alt="" />
        Golem
        <img class="hl-mark" :src="uiGolem" alt="" />
      </li>
      <!-- who you are, said quietly — a fact, not a row to click -->
      <li class="am-whoami" v-if="account">
        You're in as <b>{{ account.name || account.email }}</b>
      </li>
      <!-- ── the acts ── one <li> per row; future rows append here ── -->
      <li
        class="am-act"
        v-if="!account"
        title="Sign in to the platform — seats you claim prefill your name"
        @click="act('account')"
      >
        <font-awesome-icon icon="user" class="am-mark" />
        Sign in
      </li>
      <li
        class="am-act"
        v-else
        title="Sign out of the platform on this browser"
        @click="signOut"
      >
        <font-awesome-icon icon="user" class="am-mark" />
        Sign out
      </li>
      <li
        class="am-act"
        title="What changed lately — the app's own change log"
        @click="act('changelog')"
      >
        <font-awesome-icon icon="bullhorn" class="am-mark" />
        Change log
      </li>
      <!-- FT-1398: THE NIGHT LAB — preview any role's night art on a ring of
           fake seats, no town needed. DISABLED inside a live town, and that
           is the deliberate (safer) half of the strictly-local contract: the
           lab only ever runs on a client with no session — the socket only
           connects on session/setSessionId, which the lab never commits —
           so a lab state cannot reach a relay by construction. Auto-exiting
           the session from a preview row was the rejected alternative: a
           destructive act has no business behind a "have a look" button. -->
      <li
        class="am-act"
        :class="{ 'am-inert': inTown }"
        :title="
          inTown
            ? 'Night lab — leave the town first: the lab is a client-local preview and never runs beside a live session'
            : 'Night lab — preview any role\'s night art on a ring of fake seats; client-local, no town needed'
        "
        @click="nightLab"
      >
        <font-awesome-icon icon="cloud-moon" class="am-mark" />
        Night lab
      </li>
    </ul>
  </div>
</template>

<script>
// The platform's own sign-out — the exact call AccountDoor's button makes,
// so this row IS the existing flow with a second door, not new auth.
import { logout } from "../golem/account";
import uiGolem from "../assets/golem-mark.png";

export default {
  name: "AccountMenu",
  props: {
    /** The strip's golem mark — an element, the same anchor contract
     *  PlayerSettings and PrefsMenu keep. */
    anchor: { default: null },
  },
  data() {
    return {
      uiGolem,
      top: 0,
      left: 0,
    };
  },
  computed: {
    account() {
      return this.$store.state.session.account;
    },
    /** FT-1398: in a live town the Night lab row goes inert — see its note. */
    inTown() {
      return !!this.$store.state.session.sessionId;
    },
    posStyle() {
      return { top: this.top + "px", left: this.left + "px" };
    },
  },
  mounted() {
    document.body.appendChild(this.$el);
    this.$nextTick(this.place);
    window.addEventListener("resize", this.place);
    window.addEventListener("scroll", this.place, true);
    // mousedown, not click — Menu.vue's watchOutside carries the reasoning
    document.addEventListener("mousedown", this.onDocDown);
    document.addEventListener("keydown", this.onDocKey);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.place);
    window.removeEventListener("scroll", this.place, true);
    document.removeEventListener("mousedown", this.onDocDown);
    document.removeEventListener("keydown", this.onDocKey);
    if (this.$el && this.$el.parentElement === document.body) {
      this.$el.remove();
    }
  },
  methods: {
    /** Under the mark, centred on it, clamped — PlayerSettings' own drop. */
    place() {
      const a = this.anchor;
      if (!a || !a.getBoundingClientRect) return;
      const r = a.getBoundingClientRect();
      const w = this.$el ? this.$el.offsetWidth : 0;
      const vw = window.innerWidth;
      this.left = Math.round(
        Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8),
      );
      this.top = Math.round(r.bottom + 8);
    },
    onDocDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      if (this.$el.contains(t)) return;
      if (this.anchor && this.anchor.contains && this.anchor.contains(t)) {
        return;
      }
      this.$emit("close");
    },
    onDocKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("close");
    },
    /** A row that opens another surface: hand the ask up and fold — the
     *  menu is a doorway, not a place to stand. */
    act(what) {
      this.$emit(what);
      this.$emit("close");
    },
    /** FT-1398: the Night lab's door — an act row like the others, except
     *  it refuses (rather than hides) inside a town so the reason is
     *  readable on hover. The guard here is the courtesy; golem/nightLab's
     *  canEnter is the fact. */
    nightLab() {
      if (this.inTown) return;
      this.act("nightlab");
    },
    async signOut() {
      this.$emit("close");
      await logout(this.$store);
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../faceDisc.scss";

.account-menu {
  position: fixed;
  z-index: 76;
  width: max-content;
  text-align: left;
}

.am-plate {
  position: relative;
  @include face-disc-menu-plate($radius: 10px);
  list-style-type: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;
  min-width: 150px;

  li {
    padding: 2px 10px;
    color: white;
    display: flex;
    align-items: center;
    min-height: 30px;
    background: transparent;
    gap: 8px;
  }

  .headline {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    padding: 0 10px;
    text-align: center;
    justify-content: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  img.hl-mark {
    width: 13px;
    height: 13px;
    object-fit: contain;
    opacity: 0.75;
  }

  // the signed-in fact — AccountDoor's whoami line at row scale, not a row
  .am-whoami {
    font-size: 85%;
    opacity: 0.75;
    cursor: default;
    b {
      margin-left: 4px;
    }
  }

  // ACT rows — the corner menu's own clickable-row voice
  .am-act {
    cursor: pointer;
    transition: color 250ms;
    &:hover {
      color: red;
    }
  }
  // FT-1398: a row that currently refuses (the Night lab inside a live
  // town) — half-lit, no red promise on hover; the title says why.
  .am-act.am-inert {
    opacity: 0.4;
    cursor: default;
    &:hover {
      color: white;
    }
  }
  .am-mark {
    width: 14px;
    opacity: 0.7;
  }
}
</style>
