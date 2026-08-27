<template>
  <!-- Golem fork (FT-1200): THE ACCOUNT DOOR. The golem mark in the corner
       strip is the platform's signature, and now it is also the door onto the
       platform's account: signed out it opens this sign-in panel, signed in
       it shows who you are. The panel is the app's own glass
       (face-disc-menu-plate — the guide's and the seat plate's material), a
       small centered plate over the same 0.5 scrim the guide uses.

       WHAT THIS PANEL NEVER DOES: store a password (the inputs are plain
       type=email/type=password with honest autocomplete, so password
       managers work; the values go to /api/auth and nowhere else), or put
       anything account-shaped on the game's wire (golem/account.js holds
       that line). -->
  <div class="account-door" @click="$emit('close')">
    <div class="panel" @click.stop>
      <h3>{{ heading }}</h3>

      <!-- ── signed in: who you are, and the way out ─────────────────── -->
      <template v-if="account">
        <p class="whoami">
          You're in as <b>{{ account.name || account.email }}</b>
        </p>
        <p class="note">
          Seats you claim prefill this name, and finished games count toward
          your record.
        </p>
        <!-- FT-1233 (user): "make that signout button in our style. but
             red." — the submit's own disc-foot dress (below) with the
             leaving-red edge and ink; hover brightens rather than reddens,
             since red is already its resting statement. -->
        <button type="button" class="submit signout" @click="doLogout">
          Sign out
        </button>
      </template>

      <!-- ── signed out: sign in, or create an account ───────────────── -->
      <template v-else>
        <form @submit.prevent="submit">
          <label class="row">
            <span>Email</span>
            <input
              ref="email"
              v-model="email"
              type="email"
              name="email"
              autocomplete="email"
              spellcheck="false"
              required
            />
          </label>
          <label class="row">
            <span>Password</span>
            <input
              v-model="password"
              type="password"
              name="password"
              :autocomplete="creating ? 'new-password' : 'current-password'"
              required
            />
          </label>
          <label class="row" v-if="creating">
            <span>Name</span>
            <input
              v-model="name"
              type="text"
              name="nickname"
              autocomplete="nickname"
              spellcheck="false"
              placeholder="optional"
            />
          </label>
          <p class="note" v-if="creating">
            The name is what tables will call you — leave it blank and pick one
            at the door. Passwords need at least 8 characters.
          </p>
          <!-- the server's own words, in the app's error red -->
          <p class="error" v-if="error">{{ error }}</p>
          <div class="acts">
            <!-- FT-1222: the disc-foot family's skin (HostTools' .start /
                 the night sheet's finish button), not the App.vue pill —
                 dark plate, purple edge, the checklist's own #f4ecff ink.
                 The quill (the entry strip's ui-chronicle mark) signs it:
                 signing in IS putting your name to the page. -->
            <button class="submit" type="submit" :class="{ disabled: busy }">
              <img class="quill" :src="quill" alt="" />
              {{ creating ? "Create account" : "Sign in" }}
            </button>
          </div>
        </form>
        <!-- FT-1222: the account pitch — why sign in, in two sentences.
             Sits under the form on the sign-in view only; the create view
             already carries its own note. -->
        <p class="note pitch" v-if="!creating">
          No account needed to play. Your table name and settings live in this
          browser — clear it and they're gone. An account carries them between
          devices and keeps your games yours.
        </p>
        <p class="swap" v-if="!creating">
          New here?
          <a @click="swapMode(true)">Create an account</a>
        </p>
        <p class="swap" v-else>
          Already have one?
          <a @click="swapMode(false)">Sign in</a>
        </p>
      </template>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { login, signup, logout } from "../golem/account";
// FT-1222: the quill in its inkwell — the entry strip's own mark
// (Menu.vue imports this same file), signing the submit button.
import quill from "../assets/ui-chronicle.png";

export default {
  data() {
    return {
      creating: false,
      email: "",
      password: "",
      name: "",
      error: "",
      busy: false,
      quill,
    };
  },
  computed: {
    ...mapState("session", ["account"]),
    heading() {
      if (this.account) return "Your account";
      // FT-1222 (user call): just "Sign In" — the golem mark that opened
      // this door already says whose account it is.
      return this.creating ? "Create your account" : "Sign In";
    },
  },
  mounted() {
    document.addEventListener("keyup", this.onKeyup);
    this.focusEmail();
  },
  destroyed() {
    document.removeEventListener("keyup", this.onKeyup);
  },
  methods: {
    onKeyup(e) {
      if (e.key === "Escape") this.$emit("close");
    },
    focusEmail() {
      this.$nextTick(() => {
        const el = this.$refs.email;
        if (el) el.focus();
      });
    },
    swapMode(creating) {
      this.creating = creating;
      this.error = "";
      this.focusEmail();
    },
    /** One submit for both modes; the server's own message is the error. */
    async submit() {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      try {
        if (this.creating) {
          await signup(this.$store, this.email, this.password, this.name);
        } else {
          await login(this.$store, this.email, this.password);
        }
        // success flips the template to the signed-in view (the store's
        // account arrived); the password leaves this component's state the
        // moment it is no longer needed.
        this.password = "";
      } catch (e) {
        this.error = e.message || "Something went wrong — try again.";
      }
      this.busy = false;
    },
    async doLogout() {
      if (this.busy) return;
      this.busy = true;
      await logout(this.$store);
      this.busy = false;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// the glass — the same material the guide, the seat plate and the corner
// menus wear (FT-1193's mixin).
@import "../faceDisc.scss";
// FT-1222: the control tokens — the submit button's purple edge is
// $control-edge-hover, the same edge every plated control acknowledges the
// pointer with (and HostTools' Start button wears when ready).
@import "../controls.scss";

.account-door {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  // the guide's own scrim weight — enough to say "a door is open", thin
  // enough that the glass still has a town to look through.
  background: rgba(0, 0, 0, 0.5);
}

.panel {
  max-width: 360px;
  width: calc(100% - 40px);
  position: relative;
  @include face-disc-menu-plate($r: 360px, $radius: 10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 20px 16px;
  color: #e8ddd0;
}

h3 {
  margin: 0 0 10px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  color: #e8ddd0;
}

form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  span {
    flex: 0 0 72px;
    font-size: 90%;
    opacity: 0.85;
  }
  input {
    flex: 1 1 auto;
    min-width: 0;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(232, 221, 208, 0.25);
    border-radius: 5px;
    color: #e8ddd0;
    font: inherit;
    padding: 4px 8px;
    &:focus {
      outline: none;
      border-color: #caa662;
      box-shadow: 0 0 5px rgba(202, 166, 98, 0.5);
    }
  }
}

.note {
  margin: 2px 0 0;
  font-size: 80%;
  opacity: 0.7;
  text-align: center;
}

// FT-1222: the pitch stands a step off the button above it — same note
// voice, its own breath.
.pitch {
  margin-top: 10px;
}

.whoami {
  margin: 4px 0;
  text-align: center;
  b {
    color: #caa662;
  }
}

.error {
  margin: 2px 0 0;
  font-size: 85%;
  text-align: center;
  color: #ff6161;
  text-shadow: 0 1px 1px black;
}

.acts {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

// FT-1222: THE SUBMIT WEARS THE DISC-FOOT FAMILY'S SKIN, not App.vue's grey
// pill — the recipe is HostTools' `.start` in its ready state (dark plate,
// 3px edge, 10px radius, PiratesBay), scaled to a panel: the disc's 120%
// display size belongs to a button standing alone on a clock face, and here
// the button sits in a form column. The ready register comes with it:
// $control-edge-hover purple on the edge (controls.scss — the grimoire's own
// edge), #f4ecff ink (the night checklist's finish-button bone), red under
// the pointer — the app's one acknowledgement for "press me".
.submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-size: 105%;
  padding: 6px 18px;
  background: rgba(0, 0, 0, 0.7);
  border: 3px solid $control-edge-hover;
  border-radius: 10px;
  color: #f4ecff;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 200ms,
    opacity 200ms;
  &:hover {
    color: red;
  }
  &.disabled {
    opacity: 0.62;
    cursor: default;
  }
  // FT-1233: the sign-out variant — same plate, the app's blood red on edge
  // and ink ("but red"). Hover brightens instead of reddening: red is this
  // button's resting statement, so the acknowledgement is light, not colour.
  &.signout {
    border-color: rgba(178, 34, 34, 0.85);
    color: #e8a0a0;
    &:hover {
      color: #ff6b6b;
      border-color: rgba(220, 60, 60, 0.95);
    }
  }
  // the quill is ART, not a glyph (ScriptView's rule) — it carries its own
  // box at the label's own size so it never renders at natural scale.
  .quill {
    width: 18px;
    height: 18px;
    object-fit: contain;
    display: block;
  }
}

.swap {
  margin: 8px 0 0;
  font-size: 85%;
  text-align: center;
  opacity: 0.85;
  a {
    color: #caa662;
    cursor: pointer;
    &:hover {
      color: #e2c98a;
    }
  }
}
</style>
