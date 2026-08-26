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
        <div class="button" @click="doLogout">Sign out</div>
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
            <button class="button" type="submit" :class="{ disabled: busy }">
              {{ creating ? "Create account" : "Sign in" }}
            </button>
          </div>
        </form>
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

export default {
  data() {
    return {
      creating: false,
      email: "",
      password: "",
      name: "",
      error: "",
      busy: false,
    };
  },
  computed: {
    ...mapState("session", ["account"]),
    heading() {
      if (this.account) return "Your account";
      return this.creating ? "Create your account" : "Sign in to Golem";
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

// the app's shared .button chrome arrives unscoped from App.vue; the form's
// submit only needs its native chrome stripped so the pill is the pill.
button.button {
  font: inherit;
  font-weight: bold;
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
