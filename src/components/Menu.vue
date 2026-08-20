<template>
  <div id="controls">
    <!-- Golem fork: the session badge + vote-history count moved to the
         BOTTOM-RIGHT session pill (App.vue) — up here they sat ON TOP of the
         standing toolbar and stole its clicks. -->
    <!-- Golem fork: the gear is gone — the tab row IS the menu, always
         visible. Clicking a tab opens its section; clicking the open tab
         collapses back to the bare toolbar. -->
    <div class="menu open" :class="{ collapsed: tab === null }">
      <ul>
        <!-- Golem fork (2026-08-18, user call): the grimoire/help tabs left;
             the strip is the PLAYER surface now — script, vote history,
             night order — in our engraved art. Menu sections stay in-tree. -->
        <li class="tabs player-strip" :class="tab" v-if="inGame">
          <!-- FT-857: script + night open the SAME drawer, on their own tab.
               (The old reference / night-order overlays stay in-tree.) -->
          <img
            :src="uiScript"
            title="The script (reference sheet)"
            @click="openScriptDrawer('team')"
          />
          <!-- FT-858: the gallows opens the vote-history DRAWER, on the same
               right-hand rail as the script (the old overlay stays in-tree). -->
          <img
            :src="uiVotes"
            title="Vote history"
            @click="toggleModal('voteDrawer')"
          />
          <!-- (the moon retired 2026-08-18 as a NIGHT-ORDER door — that is a
               tab inside the script drawer now. FT-860 gives it a different
               job: a player's OWN night notes, and only where the town has
               opted into sharing them.) -->
          <img
            v-if="showNightInfo"
            :src="uiNight"
            title="What you learned at night"
            @click="toggleModal('nightDrawer')"
          />
          <!-- THE DEMON'S BLUFFS (2026-08-19, user call): show or hide the
               three coins that sit against the demon's own seat. It replaces
               the cluster's old "Demon bluffs ✕" pill — a floating label beside
               three coins that already read as coins, and the one part of the
               cluster wide enough to need placing on its own.

               HERE, beside the moon, because both are PRIVATE-INFORMATION
               doors: the moon is a seated player's own night notes, this is a
               seated demon's own bluffs. The ledger marks (records, chronicle)
               come after; the bell and the keys stay last.

               Same viewer test as the cluster itself, AND the same "is there a
               demon dealt" test (both from golem/bluffs), so the mark is
               present for exactly the people who have something to show or
               hide — the storyteller, the demon, and the Lunatic, once a demon
               is on the board — and is absent from an ordinary player's
               component tree entirely. Without the second half, a storyteller
               mid-build got a switch with nothing behind it.
               A LUNATIC SEES IT because their own client holds a demon in its
               seat; there is no branch here that could tell them apart.

               A mask, baked to the strip's measured stone (128px, silhouette
               only, no outline, mean rgb 154,146,133, luminance 115-180,
               coverage 24%). Judged at 26px against its neighbours — a fan of
               three coins was the other candidate and read as an ellipsis at
               that size, and the app is already full of coins. -->
          <img
            v-if="canSeeBluffs"
            :src="uiBluffs"
            :title="
              grimoire.isBluffsOpen
                ? 'Hide the demon\'s bluffs'
                : 'Show the demon\'s bluffs'
            "
            :class="{ off: !grimoire.isBluffsOpen }"
            @click="toggleBluffsOpen"
          />
          <!-- TOWN RECORDS — the recorded-games ledger (StatsOverlay). Same
               door, same overlay, same store flag as before; only the mark
               changed (user call 2026-08-19): the quill that used to sit on
               the chronicle moved here — a quill and inkwell reads as the
               written ledger, which is what finished games are. Baked to the
               strip's measured stone (128px, silhouette only, no outline,
               mean rgb 154,146,133, luminance wandering 110-176). The
               hourglass this mark replaced is unused now; ui-records.png
               stays in the tree. -->
          <img :src="uiQuill" title="Town records" @click="$emit('records')" />
          <!-- FT-886: THE CHRONICLE — what has happened in the game being
               played right now, which until now had no door at all — it was
               scattered across the night log, the vote history and the
               shrouds on the seats.

               Open to everyone. What each viewer gets differs, and the
               difference is enforced in the store rather than here: the drawer
               reads night/visibleEntries, which hands a storyteller the whole
               log and a player either nothing or only their own rows with the
               storyteller's marks stripped off. Nominations, executions and
               the dead are public at the table and public here.

               A CHAT BUBBLE now (user call 2026-08-19): the chronicle is the
               live, conversational log of the game in progress, so it wears
               the mark for that rather than the quill, which moved to Town
               records. Same baked stone as the rest of the strip (128px,
               silhouette only, no outline, mean rgb 154,146,133, luminance
               wandering 110-176). -->
          <img
            :src="uiChat"
            title="Chronicle — what has happened this game"
            @click="toggleModal('chronicleDrawer')"
          />
          <!-- FT-880: CALL THE TOWN BACK — every connected client makes a
               noise at once. During the day the town scatters into private
               conversations and the storyteller has no way to end them.

               STORYTELLER ONLY, by `v-if`, so a player's component tree never
               contains the control at all — there is no rule here for a
               missing stylesheet to fail to apply. (The strip already varies
               by viewer: the moon two lines up is a seated PLAYER's door and
               a storyteller never gets it.)

               Here rather than in the session pill, where the host's other
               controls live, for the reason the records door moved: this is
               wanted at exactly one moment — mid-day, nothing open — and the
               strip is the one piece of chrome that is never hidden by a
               drawer or a phone's orientation. A summons behind a closed
               drawer is not a summons.

               No confirm and no arm-then-press: unlike Leave there is nothing
               to undo, and a summons that takes two clicks arrives after the
               conversation it was meant to interrupt. -->
          <font-awesome-icon
            v-if="!session.isSpectator"
            class="call-back"
            :class="{ cooling: callBackCooling }"
            icon="bell"
            :title="
              callBackCooling
                ? 'Just called the town back'
                : 'Call the town back — everyone hears a sound'
            "
            @click="callTownBack"
          />
          <!-- FT-880: THE KEYS. Every one of this app's hotkeys has been
               undiscoverable since upstream — no screen mentions them. This is
               the door onto the list, and it is last in the row on purpose:
               it is the one mark here that is never part of running a game,
               so it sits where the eye stops rather than where it starts. -->
          <font-awesome-icon
            icon="question"
            title="Keys"
            @click="$emit('hotkeys')"
          />
          <!-- THE DOOR OUT OF A TOWNLESS TABLE (2026-08-19, user stranded
               twice).

               A table can hold seats with NO session behind them — the roster
               persists to this browser independently of the town, so a bare URL
               boots the square with everybody still sitting in it. FT-889 made
               a bare URL mean the entry screen; it does not, while a roster
               survives, because the entry screen's own test also demands an
               empty table (App.vue's `Intro` v-else-if).

               In that state there was no way back at all: the session pill —
               which carries the app's Leave door — renders only `v-if
               ="session.sessionId"`, and the entry screen will not take the
               centre while seats exist. Menu's own clearPlayers() has been
               unreachable since the tab row retired (nothing calls setTab, so
               no section ever renders).

               HERE, in the strip, for the reason the summons two marks up gives
               and this needs even more: it is the one piece of chrome that is
               never hidden by a drawer or a phone's orientation. A door out
               behind a closed drawer is not a door out.

               SESSIONLESS ONLY. Inside a real town the pill's Leave is the
               door and this would be a second one saying the same thing.

               TWO-CLICK ARM, no confirm(). This is the control that unsticks a
               stuck user, and a native dialog is silently auto-dismissed in
               driven and embedded contexts — which is what made Leave read as
               dead (FT-852), what would have swallowed the deal (2026-08-18),
               and the worst thing that could happen to this button. The arm is
               the pill's, and it says what the second click does out loud
               through the app's own transient hint, since a lone mark in an
               icon strip has no room to wear "Sure?". -->
          <font-awesome-icon
            v-if="!session.sessionId && players.length"
            class="clear-table"
            :class="{ armed: clearArmed }"
            icon="door-open"
            :title="
              clearArmed
                ? 'Click again to clear the table'
                : 'Clear the table and go back'
            "
            @click="clearTable"
          />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">Grimoire</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">Hide</template>
            <template v-if="grimoire.isPublic">Show</template>
            <!-- FT-880: the coins moved off G (which is the grimoire drawer
                 now) onto R, and the badge wears the index page's own key
                 treatment rather than bracketed plain text. -->
            <em><KeyCap letter="R" /></em>
          </li>
          <!-- Golem fork (2026-08-18, user call): Switch to Night, Select
               Edition, Show Custom Images and Disable Animations left the
               menu — redundant beside the workbench/host tools (the S and E
               hotkeys still answer). Methods untouched. -->
          <li v-if="!session.isSpectator" @click="toggleModal('fabled')">
            Add Fabled
            <em><font-awesome-icon icon="dragon" /></em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            Night order
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square',
                ]"
              />
            </em>
          </li>
          <li v-if="players.length">
            Zoom
            <em>
              <font-awesome-icon
                @click="setZoom(grimoire.zoom - 1)"
                icon="search-minus"
              />
              {{ Math.round(100 + grimoire.zoom * 10) }}%
              <font-awesome-icon
                @click="setZoom(grimoire.zoom + 1)"
                icon="search-plus"
              />
            </em>
          </li>
          <li @click="toggleMuted">
            Mute Sounds
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isMuted ? 'volume-mute' : 'volume-up']"
            /></em>
          </li>
        </template>

        <!-- Golem fork (FT-852): the Characters tab retired — Choose & Assign
             and Remove all live in the host tools; Select Edition and Add
             Fabled relocated into the Grimoire section below so no host
             capability is lost. Methods untouched. -->

        <template v-if="tab === 'help'">
          <!-- Help -->
          <li class="headline">Help</li>
          <!-- FT-857: both entries open the one script drawer, on their tab -->
          <li @click="openScriptDrawer('team')">
            Reference Sheet
            <!-- FT-880: S is the script key now, but for a HOST it opens the
                 editor, not this sheet — so this entry claims no letter
                 rather than promising one that does something else. The
                 strip's scroll mark is its other door. -->
          </li>
          <li @click="openScriptDrawer('first')">
            Night Order Sheet
            <em><KeyCap letter="F" /></em>
          </li>
          <li @click="openScriptDrawer('other')">
            Other Nights
            <em><KeyCap letter="N" /></em>
          </li>
          <li @click="$emit('hotkeys')">
            All keys
            <em><font-awesome-icon icon="question" /></em>
          </li>
          <li @click="toggleModal('gameState')">
            Game State JSON
            <em><font-awesome-icon icon="file-code" /></em>
          </li>
          <!-- Golem fork: the upstream Discord + source-code items are removed
               from the menu. Source availability (GPL) is carried by our public
               fork, credited on the intro screen. -->
        </template>
      </ul>
    </div>

    <!-- THE MENU'S ONE ASK — an inline panel, never prompt()/confirm().
         Every dialog in this file was silently auto-dismissed in dialog-less
         contexts (driven browser panes, embeds, some webviews): a prompt came
         back empty and a confirm came back false, so the caller's own guard
         returned and the control did nothing, with nothing said. That is what
         killed Leave (FT-852), the script editor's save, and the custom
         reminder note.

         WHY A PANEL AND NOT THE PILL'S TWO-CLICK ARM: an arm needs a control
         standing on screen to click a second time. Every door left in this
         file is opened by a KEY (A adds a player, J leaves a town) or is not
         rendered at all — there is nothing to click twice. The arm stays where
         it belongs, on the strip's own door out (`clearTable`, above) and on
         the pill's Leave.

         The destructive ones still ASK: `confirm` mode names what is about to
         happen and takes a second, deliberate press. Cancel is always there,
         and Escape closes it. -->
    <div class="ask-panel" v-if="ask" @click.stop>
      <h3>{{ ask.title }}</h3>
      <p class="ask-note" v-if="ask.note">{{ ask.note }}</p>
      <template v-if="ask.mode === 'input'">
        <label>{{ ask.label }}</label>
        <input
          ref="askInput"
          v-model="ask.value"
          :placeholder="ask.placeholder"
          spellcheck="false"
          @keyup.enter="askOk"
          @keyup.esc="askCancel"
        />
      </template>
      <div class="ask-error" v-if="askError">{{ askError }}</div>
      <div class="ask-acts">
        <div class="button" @click="askCancel">
          <font-awesome-icon icon="times" /> Cancel
        </div>
        <div
          class="button ask-go"
          :class="{ danger: ask.danger }"
          @click="askOk"
        >
          <font-awesome-icon
            :icon="ask.danger ? 'exclamation-triangle' : 'check'"
          />
          {{ ask.okText }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import uiScript from "../assets/ui-script.png";
import uiVotes from "../assets/ui-votes.png";
import uiNight from "../assets/ui-night.png";
// FT-886: the chronicle's chat bubble — this game's live, running timeline
import uiChat from "../assets/ui-chat.png";
// the town-records quill — moved here from the chronicle 2026-08-19; the file
// is still named for its old home (ui-chronicle.png) but the drawing on it,
// a quill in an inkwell, is now the Town records door's mark. ui-records.png
// (the hourglass this replaced) is unused but stays in the tree.
import uiQuill from "../assets/ui-chronicle.png";
// 2026-08-19: the demon's-bluffs door — a masquerade mask, baked to the same
// stone as the rest of the strip.
import uiBluffs from "../assets/ui-bluffs.png";
// ...and the one rule that says who may look at them, shared with the clock
// face and the socket's sender.
import { canSeeBluffs, demonSeatIndex } from "../golem/bluffs";
// FT-880: the town summons — the storyteller's press plays it here too, since
// the relay never echoes a message back to whoever sent it.
import { playCallBack, CALL_BACK_COOLDOWN } from "../golem/callBack";
// FT-890: leaving a town is one call, not a commit sequence copied per caller.
import { leaveTown, resolveTownRole } from "../golem/townRoute";
// 2026-08-19: joining a town nobody has opened yet is a wait, not an entry —
// the same gate the Join panel and an invite link answer to.
import { enterWhenOpen, normalizeTownId } from "../golem/towns";
import { flashHint } from "../golem/hint";
// FT-880: the index page's key lettering, shared so the menu's badges and the
// key list print a key the same way.
import KeyCap from "./KeyCap";

export default {
  components: { KeyCap },
  computed: {
    ...mapState([
      "grimoire",
      "session",
      "edition",
      "modals",
      "scriptDrawerView",
      "night",
    ]),
    ...mapState("players", ["players"]),
    /**
     * FT-860: the night-notes door. It appears only where the town's night
     * setting is "Everyone" AND this viewer holds a chair — the drawer behind
     * it shows that seat's own rows and nothing else. The storyteller has the
     * night sheet instead and never needs this.
     */
    showNightInfo() {
      if (this.night.mode !== "everyone") return false;
      if (!this.session.isSpectator) return false;
      return (
        this.session.claimedSeat >= 0 ||
        this.players.some((p) => p.id && p.id === this.session.playerId)
      );
    },
    /**
     * 2026-08-19: is there a bluffs cluster for this viewer to show or hide?
     * The storyteller, the demon, and the Lunatic — the same single rule the
     * clock face's own `canSeeBluffs` and the socket's sender read, so the
     * mark can never appear for someone with nothing behind it, nor go missing
     * for someone who has.
     */
    canSeeBluffs() {
      return (
        canSeeBluffs(this.$store.state) && demonSeatIndex(this.players) > -1
      );
    },
    // the player strip is IN-GAME chrome — on the intro there is no script,
    // no votes and no night to look at (user call, 2026-08-18)
    inGame() {
      return !!this.session.sessionId || this.players.length > 0;
    },
  },
  data() {
    return {
      uiScript,
      uiVotes,
      uiNight,
      uiChat,
      uiQuill,
      uiBluffs,
      // FT-880: the nervous-double-press guard, held locally the same way the
      // pill's Leave holds its two-click arm — it is about this one button's
      // feel, not about the town's state, so it does not belong in the store.
      callBackCooling: false,
      callBackTimer: null,
      // ...and the same shape for the townless table's door out — held here
      // rather than in the store for the same reason: it is about this one
      // button's feel, not about the town's state.
      clearArmed: false,
      clearTimer: null,
      // The inline ask panel (see its markup for why it exists): null, or
      // { mode, title, note, label, value, placeholder, okText, danger,
      //   allowEmpty, onOk }.
      ask: null,
      askError: "",
      // Golem fork: null = collapsed to the bare toolbar (the default).
      tab: null,
    };
  },
  beforeDestroy() {
    clearTimeout(this.callBackTimer);
    clearTimeout(this.clearTimer);
  },
  watch: {
    // The intro screen's "Menu" button flips the store flag the old gear used;
    // honour it by expanding the first section.
    "grimoire.isMenuOpen"(open) {
      if (open && this.tab === null) this.tab = "grimoire";
    },
  },
  methods: {
    // Click the open tab → collapse to the toolbar; click another → switch.
    setTab(name) {
      this.tab = this.tab === name ? null : name;
    },
    /**
     * FT-857: the strip's script + night icons open ONE drawer on their own
     * tab. Clicking the icon whose tab is already showing closes it, so each
     * icon still feels like a toggle.
     */
    openScriptDrawer(view) {
      if (this.modals.scriptDrawer && this.scriptDrawerView === view) {
        this.toggleModal("scriptDrawer");
        return;
      }
      this.$store.commit("setScriptDrawerView", view);
      if (!this.modals.scriptDrawer) this.toggleModal("scriptDrawer");
    },
    /**
     * FT-880: ring the town.
     *
     * Two things happen, and the second is not decoration: the mutation is
     * what travels (the socket plugin owns the storyteller-only guard on it),
     * and the local play is because the relay never sends a message back to
     * the client that sent it — without it the storyteller presses a button
     * and gets total silence, which is indistinguishable from a broken one.
     *
     * The guard here is a courtesy, not a defence: the real refusals are in
     * socket.js and the relay. This one just keeps a twitchy double-tap from
     * chopping the clip off at half a second and starting it again.
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
    // ── the inline ask ───────────────────────────────────────────────────
    /**
     * Open the panel. `onOk` receives the trimmed text in "input" mode and
     * nothing in "confirm" mode; Cancel and Escape both close without calling
     * it, so cancelling is always possible and always visible.
     */
    openAsk(opts) {
      this.askError = "";
      this.ask = {
        mode: "input",
        title: "",
        note: "",
        label: "",
        value: "",
        placeholder: "",
        okText: "OK",
        danger: false,
        allowEmpty: false,
        onOk: () => {},
        ...opts,
      };
      if (this.ask.mode !== "input") return;
      this.$nextTick(() => {
        const el = this.$refs.askInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    askCancel() {
      this.ask = null;
      this.askError = "";
    },
    askOk() {
      const a = this.ask;
      if (!a) return;
      if (a.mode === "input") {
        const value = (a.value || "").trim();
        // Empty is a no-op for most asks, and a REAL ANSWER for the ones that
        // clear a setting (the background). Saying so beats closing silently —
        // a silent close is the failure this panel replaces.
        if (!value && !a.allowEmpty) {
          this.askError = "Type something first, or cancel.";
          return;
        }
        this.ask = null;
        this.askError = "";
        a.onOk(value);
        return;
      }
      this.ask = null;
      this.askError = "";
      a.onOk();
    },
    setBackground() {
      this.openAsk({
        title: "Custom background",
        note: "Leave it empty to go back to the default background.",
        label: "Image URL",
        value: this.grimoire.background || "",
        placeholder: "https://…",
        okText: "Apply",
        allowEmpty: true,
        onOk: (background) => this.$store.commit("setBackground", background),
      });
    },
    hostSession() {
      if (this.session.sessionId) return;
      this.openAsk({
        title: "Open a town",
        label: "Channel number / name",
        value: String(Math.round(Math.random() * 10000)),
        okText: "Open",
        onOk: (sessionId) => {
          this.$store.commit("session/clearVoteHistory");
          this.$store.commit("session/setSpectator", false);
          this.$store.commit("session/setSessionId", sessionId);
          this.copySessionUrl();
        },
      });
    },
    copySessionUrl() {
      const link = window.location.origin + "/" + this.session.sessionId;
      navigator.clipboard.writeText(link);
    },
    /**
     * Deal the assigned characters out to the seated players. No confirm:
     * starting the game IS the intent, and a native dialog is worse than
     * redundant here — driven and embedded contexts auto-dismiss it, which
     * returns false and silently swallows the deal (the same trap FT-852
     * hit on Leave). (user call 2026-08-18)
     */
    distributeRoles() {
      if (this.session.isSpectator) return;
      this.$store.commit("session/distributeRoles", true);
      setTimeout(
        (() => {
          this.$store.commit("session/distributeRoles", false);
        }).bind(this),
        2000,
      );
    },
    imageOptIn() {
      // Turning it OFF is not a risk and never asked; turning it ON still
      // asks, because the warning is the whole point of the question.
      if (this.grimoire.isImageOptIn) return this.toggleImageOptIn();
      this.openAsk({
        mode: "confirm",
        title: "Allow custom images?",
        note: "A malicious script file author might track your IP address this way.",
        okText: "Allow images",
        danger: true,
        onOk: () => this.toggleImageOptIn(),
      });
    },
    joinSession() {
      if (this.session.sessionId) return this.leaveSession();
      this.openAsk({
        title: "Join a town",
        label: "Channel number / name",
        placeholder: "a name, a number, or an invite link",
        okText: "Join",
        onOk: (entered) => this.enterSession(entered),
      });
    },
    /**
     * The join itself, given what was typed. Split out of joinSession so the
     * asking and the entering are separable — the panel hands this the text
     * once the second press lands.
     */
    enterSession(typed) {
      let sessionId = typed;
      if (sessionId.match(/^https?:\/\//i)) {
        const hashAt = sessionId.indexOf("#");
        sessionId =
          hashAt >= 0
            ? sessionId.slice(hashAt + 1)
            : sessionId.replace(/^https?:\/\/[^/]+\/?/i, "").split(/[/?]/)[0];
      }
      if (sessionId) {
        const enter = () => {
          this.$store.commit("session/clearVoteHistory");
          this.$store.commit("session/setSpectator", true);
          this.$store.commit("toggleGrimoire", false);
          this.$store.commit("session/setSessionId", sessionId);
        };
        // 2026-08-19: THE SAME GATE the Join panel and an invite link answer
        // to — a town no storyteller has opened is waited for, not entered.
        // A host is never gated: opening a town is exactly the moment nobody
        // is connected to it.
        if (resolveTownRole(sessionId) === "host") return enter();
        enterWhenOpen(sessionId, enter).then((entered) => {
          // This door can be reached with seats already on the table, where
          // the entry screen — and so the waiting panel — is not rendered.
          // The transient notice is the only surface guaranteed to be here.
          if (entered) return;
          const town = normalizeTownId(sessionId);
          flashHint(`${town} isn't open yet — waiting for its storyteller.`);
        });
      }
    },
    // FT-852: `confirmed === true` (the pill's own two-click arm) leaves
    // straight away — the arm WAS the asking. Every other caller gets the
    // inline panel; there is no native confirm() left here, because a driven
    // or embedded context auto-dismissed it and deadened the caller.
    leaveSession(confirmed) {
      if (confirmed === true) return this.doLeaveTown();
      this.openAsk({
        mode: "confirm",
        title: "Leave the active live game?",
        note: "The town keeps running. You can come back to it by name.",
        okText: "Leave",
        danger: true,
        onOk: () => this.doLeaveTown(),
      });
    },
    doLeaveTown() {
      // Golem fork: ONE way out of a town, shared with a Back press and
      // with a relay-initiated close — leaveTown owns what leaving has to
      // take with it (seats, bluffs, fabled, any live nomination), because
      // clearing the session id alone leaves the sessionless in-person
      // square standing. An owned town re-loads its saved script when
      // re-hosted.
      leaveTown(this.$store);
    },
    addPlayer() {
      if (this.session.isSpectator) return;
      if (this.players.length >= 20) return;
      this.openAsk({
        title: "Add a player",
        label: "Player name",
        okText: "Add",
        onOk: (name) => this.$store.commit("players/add", name),
      });
    },
    randomizeSeatings() {
      if (this.session.isSpectator) return;
      this.openAsk({
        mode: "confirm",
        title: "Randomize the seating?",
        note: "Everyone at the table moves to a new chair.",
        okText: "Randomize",
        danger: true,
        onOk: () => this.$store.dispatch("players/randomize"),
      });
    },
    /**
     * THE TOWNLESS TABLE'S DOOR — arm on the first click, clear on the second.
     * See the strip's own note for why it is there and why there is no dialog
     * in it.
     *
     * It calls leaveTown, not players/clear, because a table standing with no
     * town behind it is a HALF-LEFT town, and leaving is what has to finish:
     * the bluffs, the fabled and any live nomination are the same local mirror
     * the seats are, and clearing the roster alone would leave them standing on
     * the entry screen. leaveTown is the app's one way out and already owns
     * that list — the pill's Leave, a Back press and a relay-initiated close
     * all end there too (golem/townRoute).
     *
     * NO SPECTATOR GUARD, deliberately, unlike clearPlayers below. With no
     * session there is no storyteller and no player, only a browser holding
     * seats — and a stale spectator flag turning the one unsticking control
     * into a no-op is precisely the failure this exists to end.
     */
    clearTable() {
      if (!this.clearArmed) {
        this.clearArmed = true;
        flashHint("Click the door again to clear the table and go back.");
        this.clearTimer = setTimeout(() => {
          this.clearArmed = false;
        }, 3000);
        return;
      }
      clearTimeout(this.clearTimer);
      this.clearArmed = false;
      leaveTown(this.$store);
    },
    // `confirmed === true` skips the asking, exactly as leaveSession above
    // does and for the same reason — a caller that has already armed (the
    // pill's two-click door) has asked once and must not ask twice. Anything
    // else gets the inline panel. (Unreachable from the UI today: the menu
    // section it belonged to has no tab left to open it.)
    clearPlayers(confirmed) {
      if (this.session.isSpectator) return;
      if (confirmed === true) return this.doClearPlayers();
      this.openAsk({
        mode: "confirm",
        title: "Remove all players?",
        note: "Every chair is emptied. This cannot be undone.",
        okText: "Remove all",
        danger: true,
        onOk: () => this.doClearPlayers(),
      });
    },
    doClearPlayers() {
      // abort vote if in progress
      if (this.session.nomination) {
        this.$store.commit("session/nomination");
      }
      this.$store.commit("players/clear");
    },
    clearRoles(confirmed) {
      if (confirmed === true) {
        return this.$store.dispatch("players/clearRoles");
      }
      this.openAsk({
        mode: "confirm",
        title: "Remove all player roles?",
        note: "The chairs stay; every character on them is taken off.",
        okText: "Remove roles",
        danger: true,
        onOk: () => this.$store.dispatch("players/clearRoles"),
      });
    },
    toggleNight() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    ...mapMutations([
      "toggleGrimoire",
      "toggleBluffsOpen",
      "toggleMenu",
      "toggleImageOptIn",
      "toggleMuted",
      "toggleNightOrder",
      "toggleStatic",
      "setZoom",
      "toggleModal",
    ]),
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// success animation
@keyframes greenToWhite {
  from {
    color: green;
  }
  to {
    color: white;
  }
}

// Controls
#controls {
  position: absolute;
  right: 3px;
  top: 3px;
  text-align: right;
  padding-right: 50px;
  z-index: 75;

  svg {
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-block;
    cursor: pointer;
    z-index: 5;
    margin-top: 7px;
    margin-left: 10px;
  }

  span.nomlog-summary {
    color: $townsfolk;
  }

  span.session {
    color: $demon;
    &.spectator {
      color: $townsfolk;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
    color: gray;
  }
}

.menu {
  // Golem fork: no gear, no fold-away rotation — the tab row is a standing
  // toolbar; only the SECTION below it comes and goes.
  width: 220px;
  position: absolute;
  right: 0;
  top: 0;

  // collapsed = the strip alone: hug the icons instead of stretching them
  // across a 220px section width (user call — the gaps read as dead space)
  &.collapsed {
    width: auto;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      color: red;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
    border-radius: 10px 0 10px 10px;
    // Golem fork: collapsed = the toolbar alone, corners fully rounded.

    li {
      padding: 2px 5px;
      color: white;
      text-align: left;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 30px;

      &.tabs {
        display: flex;
        padding: 0;
        svg {
          flex-grow: 1;
          flex-shrink: 0;
          height: 35px;
          border-bottom: 3px solid black;
          border-right: 3px solid black;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: red;
          }
          &:last-child {
            border-right: 0;
          }
        }
        &.grimoire .fa-book-open,
        &.players .fa-users,
        &.characters .fa-theater-masks,
        &.help .fa-question {
          background: linear-gradient(
            to bottom,
            $townsfolk 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: red;
      }

      em {
        flex-grow: 0;
        font-style: normal;
        margin-left: 10px;
        font-size: 80%;
      }
    }

    .headline {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      padding: 0 10px;
      text-align: center;
      justify-content: center;
      background: linear-gradient(
        to right,
        $townsfolk 0%,
        rgba(0, 0, 0, 0.5) 20%,
        rgba(0, 0, 0, 0.5) 80%,
        $demon 100%
      );
    }
  }
}
.menu ul li.player-strip {
  justify-content: center;
  gap: 10px;
  padding: 3px 10px;
  min-height: 0;
}
.player-strip img {
  width: 26px;
  height: 26px;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px black);
}
/* TOGGLED OFF (2026-08-19): the bluffs mark is the strip's one door that is a
   SWITCH rather than an opener, so it has to say which way it is set without
   changing shape or leaving the row. It dims and desaturates, the same
   step-back the bell takes while it is cooling — a mark that vanished under
   the finger that pressed it would read as a fault, not as "hidden". */
.player-strip img.off {
  opacity: 0.34;
  filter: drop-shadow(0 1px 2px black) grayscale(0.75) brightness(0.85);
}
.player-strip img.off:hover {
  opacity: 0.75;
}
/* THE STRIP IS ONE SET, not a row of PNGs with some icons after it.
   Two of the marks are our engraved art and two are Font Awesome, and the
   glyphs arrive already carrying `.tabs svg` from further up this file — 35px
   tall, 5px of vertical padding, black borders down two sides. That is the OLD
   tab treatment, and it out-specifies a plain `.player-strip svg`: measured,
   it stood the two new marks 26x35 beside the art's 26x26, and on a phone gave
   them a 29x48 tap box against the art's 42x42.

   Hence `li.tabs.player-strip` — the same row the old rule matches, named
   precisely enough to outrank it rather than tie with it on source order.
   Same 26px box, same shadow, same hover, so the eye reads four marks of one
   family and a finger finds four boxes of one size. */
.menu ul li.tabs.player-strip svg {
  width: 26px;
  height: 26px;
  flex-grow: 0;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  cursor: pointer;
  color: #e8e2d4;
  filter: drop-shadow(0 1px 2px black);
  transition:
    color 200ms,
    filter 200ms;
}
.menu ul li.tabs.player-strip svg:hover {
  color: #fff;
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
/* Just-pressed: the bell steps back and stops taking clicks for the cooldown,
   so a second press has something to say no with that the storyteller can
   see. It does not vanish — a control that disappears under your finger reads
   as a fault, not as a wait. */
.menu ul li.tabs.player-strip svg.call-back.cooling {
  color: #7a736a;
  cursor: default;
  pointer-events: none;
}
/* ARMED — the townless table's door, waiting for its second click. It goes the
   pill Leave's red rather than dimming like the cooling bell: the bell is
   saying "not yet", this is saying "again and it happens", and those must not
   look alike. Same box, same row — only the colour moves, so the strip still
   reads as one set. */
.menu ul li.tabs.player-strip svg.clear-table.armed {
  color: #d33;
  filter: drop-shadow(0 1px 2px black) brightness(1.25);
}
/* The scroll and the gallows are the only two doors a PLAYER has in a running
   game — the script and the vote history — and they were 26px marks with no
   box around them. The art keeps its size; the box a finger has to find grows
   under it. */
@media (pointer: coarse) {
  .menu ul li.player-strip {
    gap: 4px;
    padding: 0 4px;
  }
  .player-strip img,
  .menu ul li.tabs.player-strip svg {
    box-sizing: content-box;
    padding: 8px;
  }
}
.player-strip img:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}

/* THE INLINE ASK. It is a child of the strip in the DOM but it belongs to the
   middle of the screen, where the browser dialog it replaces used to stand —
   the strip is pinned to a 3px corner and anything laid out inside it would
   read as a tooltip on a toolbar rather than as a question. Above the modal
   layer (z-index 100), since a question can be asked from inside one. */
.ask-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 120;
  width: min(420px, 92vw);
  text-align: left;
  background: rgba(0, 0, 0, 0.92);
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 0 0 20px 2px #000;
  padding: 16px 20px;
  font-size: 16px;
  cursor: default;

  h3 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .ask-note {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.45;
    opacity: 0.7;
  }

  label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.6;
    margin-bottom: 4px;
  }

  input {
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

  .ask-error {
    margin: 8px 0 0;
    font-size: 13px;
    color: #ff7070;
  }

  .ask-acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;

    /* Our buttons, not upstream's shiny pills: small, flat, dark, hairline. */
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
      &:hover {
        border-color: #a01414;
        color: #ff7070;
      }
    }

    /* the irreversible ones wear the blood before they are pressed, not
       after — the same signal the pill's armed Leave gives */
    .ask-go.danger {
      border-color: #a01414;
      color: #ff9a9a;
      &:hover {
        background: rgba(160, 20, 20, 0.4);
        color: white;
      }
    }
  }
}
</style>
