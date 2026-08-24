<template>
  <Modal
    v-if="modals.reminder && availableReminders.length && players[playerIndex]"
    @close="toggleModal('reminder')"
  >
    <!-- WRITE THE NOTE HERE, never prompt(). A browser dialog is silently
         auto-dismissed in dialog-less contexts (driven panes, embeds, some
         webviews) and comes back empty — so the old `if (!name) return`
         swallowed every custom note and the token simply never appeared.
         The same trap took the Leave door (FT-852) and the script editor's
         save (which is why EditionModal's fork panel exists); this is the
         same answer in the same shape.

         It REPLACES the token list rather than sitting under it: the choice
         has already been made by the time this shows, and Cancel puts the
         list back with nothing added. -->
    <div class="custom-note" v-if="note !== null">
      <h3>Add a custom note</h3>
      <label>Note</label>
      <input
        ref="noteInput"
        class="cn-name"
        v-model="note"
        maxlength="60"
        @keyup.enter="commitNote"
        @keyup.esc="cancelNote"
      />
      <div class="cn-error" v-if="noteError">{{ noteError }}</div>
      <div class="cn-acts">
        <div class="button" @click="cancelNote">
          <font-awesome-icon icon="times" /> Cancel
        </div>
        <div class="button cn-go" @click="commitNote">
          <font-awesome-icon icon="check" /> Add note
        </div>
      </div>
    </div>
    <template v-else>
      <h3>Choose a reminder token:</h3>
      <ul class="reminders">
        <li
          v-for="reminder in availableReminders"
          class="reminder"
          :class="[reminder.role]"
          :key="reminder.role + ' ' + reminder.name"
          @click="addReminder(reminder)"
        >
          <span
            class="icon"
            :style="{
              backgroundImage: `url(${
                reminder.image && grimoire.isImageOptIn
                  ? reminder.image
                  : require('../../assets/icons/' +
                      (reminder.imageAlt || reminder.role) +
                      '.png')
              })`
            }"
          ></span>
          <span class="text">{{ reminder.name }}</span>
        </li>
      </ul>
    </template>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapMutations, mapState } from "vuex";
// FT-1117: a reminder entry may be a plain string or an authored object.
import { reminderName } from "../../golem/dealReminders";

/**
 * Helper function that maps a reminder name with a role-based object that provides necessary visual data.
 * @param role The role for which the reminder should be generated
 * @return {function(*): {image: string|string[]|string|*, role: *, name: *, imageAlt: string|*}}
 *
 * FT-1117: an authored reminder is a plain string OR `{ name, deal }` — a
 * character may declare that the deal places the token itself (the Fortune
 * Teller's red herring). `reminderName` is the one reader for both shapes, so
 * an entry carrying a rule still offers the same tile in this picker; only
 * where it CAME from differs. The object this builds is also, deliberately,
 * the object golem/dealReminders.js builds — a dealt token and a hand-placed
 * one are the same thing on the seat.
 */
const mapReminder = ({ id, image, imageAlt }) => entry => ({
  role: id,
  image,
  imageAlt,
  name: reminderName(entry)
});

export default {
  components: { Modal },
  props: ["playerIndex"],
  data() {
    return {
      // null = the token list is showing; a string = the note field is open.
      // "" is a legal open state, which is why this is null-vs-string and not
      // a truthiness test.
      note: null,
      noteError: "",
    };
  },
  watch: {
    // The modal can be closed from outside this panel (the shell's ×, the
    // backdrop, a hotkey). Whatever was half-typed goes with it, so the next
    // open starts on the token list rather than on a stale field.
    "modals.reminder"(open) {
      if (!open) this.closeNote();
    },
  },
  computed: {
    availableReminders() {
      let reminders = [];
      const { players, bluffs } = this.$store.state.players;
      this.$store.state.roles.forEach(role => {
        // add reminders from player roles
        if (players.some(p => p.role.id === role.id)) {
          reminders = [...reminders, ...role.reminders.map(mapReminder(role))];
        }
        // add reminders from bluff/other roles
        else if (bluffs.some(bluff => bluff.id === role.id)) {
          reminders = [...reminders, ...role.reminders.map(mapReminder(role))];
        }
        // add global reminders
        if (role.remindersGlobal && role.remindersGlobal.length) {
          reminders = [
            ...reminders,
            ...role.remindersGlobal.map(mapReminder(role))
          ];
        }
      });
      // add fabled reminders
      this.$store.state.players.fabled.forEach(role => {
        reminders = [...reminders, ...role.reminders.map(mapReminder(role))];
      });

      // add out of script traveler reminders
      this.$store.state.otherTravelers.forEach(role => {
        if (players.some(p => p.role.id === role.id)) {
          reminders = [...reminders, ...role.reminders.map(mapReminder(role))];
        }
      });

      reminders.push({ role: "good", name: "Good" });
      reminders.push({ role: "evil", name: "Evil" });
      reminders.push({ role: "custom", name: "Custom note" });
      return reminders;
    },
    ...mapState(["modals", "grimoire"]),
    ...mapState("players", ["players"])
  },
  methods: {
    addReminder(reminder) {
      // The custom token doesn't add anything yet — it asks first.
      if (reminder.role === "custom") return this.openNote();
      this.commitReminder(reminder);
    },
    openNote() {
      this.note = "";
      this.noteError = "";
      this.$nextTick(() => {
        const el = this.$refs.noteInput;
        if (el) el.focus();
      });
    },
    /** Cancel adds NOTHING and puts the token list back. */
    cancelNote() {
      this.closeNote();
    },
    closeNote() {
      this.note = null;
      this.noteError = "";
    },
    commitNote() {
      const name = (this.note || "").trim();
      // An empty note would land a blank token nobody can read. Say so where
      // the typing is happening rather than closing on a silent no-op — the
      // silent no-op is the bug this panel replaces.
      if (!name) {
        this.noteError = "Type the note first, or cancel.";
        return;
      }
      this.closeNote();
      this.commitReminder({ role: "custom", name });
    },
    commitReminder(reminder) {
      const player = this.$store.state.players.players[this.playerIndex];
      this.$store.commit("players/update", {
        player,
        property: "reminders",
        value: [...player.reminders, reminder]
      });
      this.$store.commit("toggleModal", "reminder");
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style scoped lang="scss">
// The note field, wearing the workbench's fork-panel shape (its own comment
// explains why that panel is a panel and not a prompt).
.custom-note {
  width: min(420px, 92%);
  text-align: left;

  h3 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.6;
    margin-bottom: 4px;
  }

  .cn-name {
    width: 100%;
    font-size: 17px;
    padding: 7px 12px;
    margin: 0;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    &:focus {
      outline: none;
      border-color: #a01414;
    }
  }

  .cn-error {
    margin: 8px 0 0;
    font-size: 13px;
    color: #ff7070;
  }

  .cn-acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;

    // Our buttons, not upstream's shiny pills: small, flat, dark, hairline —
    // the same treatment the workbench's own panels use.
    .button {
      margin: 0;
      padding: 2px 9px;
      border: 1px solid #3d3d3d;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.65);
      box-shadow: none;
      font-weight: normal;
      font-size: 13px;
      line-height: 1.6;
      cursor: pointer;
      &:before,
      &:after {
        content: none;
      }
      &:hover {
        border-color: #a01414;
        color: #ff7070;
      }
    }

    .cn-go:hover {
      background: rgba(160, 20, 20, 0.35);
      color: white;
    }
  }
}

ul.reminders .reminder {
  // (user call 2026-08-20: "those need to use our player coins as the
  // background") — the SAME ground the seats' own reminders took in FT-940,
  // and the same one the character coins wear: `--coin`, painted onto the
  // document root by golem/coinArt.js's applyCoin(). Reading the property
  // rather than naming a file is what makes these tiles repaint with the
  // rest of the app when a different coin is picked.
  //
  // This rule lives HERE and not with the seats' because the picker's tiles
  // render inside the modal, outside `.circle` — which is also why FT-940's
  // fix reached the seats and left these behind.
  background: var(--coin, url("../../assets/token-golem.png")) center center;
  background-size: 100%;
  width: 14vh;
  height: 14vh;
  max-width: 100px;
  max-height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1%;

  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  line-height: 100%;
  transition: transform 500ms ease;

  .icon {
    position: absolute;
    top: 0;
    width: 90%;
    height: 90%;
    background-size: 100%;
    background-position: center center;
    background-repeat: no-repeat;
  }

  .text {
    color: black;
    font-size: 65%;
    font-weight: bold;
    text-align: center;
    top: 28%;
    width: 80%;
    line-height: 1;
    // (user call 2026-08-20: "the text on the reminders needs the white glow
    // for readability") — the SAME four-way pale halo the seats' own reminders
    // wear (Player.vue's `.circle .reminder .text`). Black type on the coin's
    // parchment was legible on the old flat ground and stopped being so the
    // moment these tiles took the real coin art, which is textured and darkens
    // toward its rim. Four offsets rather than a blur: a blur spreads and
    // greys at this size, where the offsets keep the letterform's own edge.
    text-shadow:
      0 1px 1px #f6dfbd,
      0 -1px 1px #f6dfbd,
      1px 0 1px #f6dfbd,
      -1px 0 1px #f6dfbd;
  }

  &:hover {
    transform: scale(1.2);
  }
}
</style>
