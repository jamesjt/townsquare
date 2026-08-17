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
          <li @click="press('a')">
            <span class="key"
              ><img :src="blood.A.src" :style="bloodStyle('A')" alt="A"
            /></span>dd Players
          </li>
        </ul>
      </template>
      <p class="hint" v-else-if="session.sessionId && session.isSpectator">
        Joined <b>{{ session.sessionId }}</b> — waiting for the storyteller to
        add seats…
      </p>
      <template v-else>
        <ul class="doors" v-if="!mode">
          <li @click="openHost">
            <span class="key"
              ><img :src="blood.H.src" :style="bloodStyle('H')" alt="H"
            /></span>ost
          </li>
          <li @click="openJoin">
            <span class="key"
              ><img :src="blood.J.src" :style="bloodStyle('J')" alt="J"
            /></span>oin
          </li>
          <li @click="press('c')">
            <span class="key"
              ><img :src="blood.C.src" :style="bloodStyle('C')" alt="C"
            /></span>reate
          </li>
        </ul>

        <!-- Golem fork: Host and Join swap the doors for in-app panels —
             no browser dialogs anywhere in the entry flow. -->
        <div class="panel" v-else-if="mode === 'host'">
          <p class="hint">Open a town — players join by the link.</p>
          <ul class="towns" v-if="hostTowns.length">
            <li
              v-for="t in hostTowns"
              :key="t.id"
              :class="{ picked: townId === t.id }"
              @click="townId = t.id"
            >
              <span class="dot" :class="dotClass(t.id)"></span>
              <span class="name" :title="t.id">
                {{ townLabel(t) }}
                <small class="tid" v-if="townLabel(t) !== t.id">{{ t.id }}</small>
              </span>
              <small class="yours" v-if="t.editKey">yours</small>
              <small>{{ statusLabel(t.id) }}</small>
            </li>
          </ul>
          <div class="field">
            <label>Town</label>
            <input
              v-model="townId"
              spellcheck="false"
              @keyup.enter="confirmHost"
            />
            <span class="tool" @click="reroll" title="Roll a new name">
              <font-awesome-icon icon="random" />
            </span>
          </div>
          <div class="field">
            <label>Script</label>
            <select v-model="scriptId" @change="scriptTouched = true">
              <option v-if="attachedScriptId" value="__attached">
                This town's saved script
              </option>
              <option v-for="e in editionList" :key="e.id" :value="e.id">{{
                e.name
              }}</option>
              <option value="__custom">Custom / vault…</option>
            </select>
          </div>
          <!-- FT-847: owned towns. Claiming saves the town's name (and later
               its script) on the server, keyed to THIS browser — the same
               anonymous edit-key model as the script vault. -->
          <div class="field keep" v-if="!ownsPicked">
            <label></label>
            <label class="tick">
              <input type="checkbox" v-model="keepTown" />
              Keep this town — remember its name &amp; script
            </label>
          </div>
          <div class="field keep" v-else>
            <label></label>
            <small class="owned-note"
              >yours — its name{{ attachedScriptId ? " and script" : "" }}
              travel with it</small
            >
          </div>
          <p class="claim-error" v-if="claimError">{{ claimError }}</p>
          <div class="field">
            <label>Link</label>
            <span
              class="share"
              @click="copyShare"
              :title="copied ? 'Copied!' : 'Copy the invite link'"
            >
              <span class="url">{{ shareLink }}</span>
              <font-awesome-icon :icon="copied ? 'check' : 'copy'" />
            </span>
          </div>
          <div class="acts">
            <span class="back" @click="mode = null">Back</span>
            <button
              class="confirm"
              :class="{ disabled: !townIdClean }"
              @click="confirmHost"
            >
              Open the town
            </button>
          </div>
        </div>

        <div class="panel" v-else>
          <p class="hint">Join a town.</p>
          <ul class="towns" v-if="joinTowns.length">
            <li
              v-for="t in joinTowns"
              :key="t.id"
              :class="{ picked: joinId === t.id }"
              @click="joinId = t.id"
            >
              <span class="dot" :class="dotClass(t.id)"></span>
              <span class="name" :title="t.id">
                {{ townLabel(t) }}
                <small class="tid" v-if="townLabel(t) !== t.id">{{ t.id }}</small>
              </span>
              <small>{{ statusLabel(t.id) }}</small>
            </li>
          </ul>
          <div class="field">
            <label>Town</label>
            <input
              v-model="joinId"
              spellcheck="false"
              placeholder="paste a link or a town name"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="field">
            <label>Name</label>
            <input
              v-model="joinName"
              spellcheck="false"
              placeholder="what the town calls you"
              @keyup.enter="confirmJoin"
            />
          </div>
          <div class="acts">
            <span class="back" @click="mode = null">Back</span>
            <button
              class="confirm"
              :class="{ disabled: !canJoin }"
              @click="confirmJoin"
            >
              Enter the town
            </button>
          </div>
        </div>
      </template>
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
import editionJSON from "../editions.json";
import {
  listTowns,
  townStatuses,
  mintTownId,
  normalizeTownId,
  editKeyFor,
  claimTown,
  townMeta
} from "../golem/towns";
import bloodH from "../assets/blood/blood-H.png";
import bloodJ from "../assets/blood/blood-J.png";
import bloodC from "../assets/blood/blood-C.png";
import bloodA from "../assets/blood/blood-A.png";
import bloodMetrics from "../assets/blood/metrics.json";

// Golem fork (FT-846): the door initials are pre-rendered blood letters
// (Creepster + an SVG goo/drip/crust treatment, baked at 2x). Baked PNGs, not
// the live filter, because the filter's radii fall below one device pixel at
// door size and quantize the letterforms apart.
// Metrics are image px against a 180px reference font with the glyph baseline
// at image y=400; the drop-cap displays at 1.45x the key font, so ems convert
// as 1.45 / (180 * 2x).
const BLOOD_EM_PER_PX = 1.45 / 360;
const BLOOD = {
  H: { src: bloodH, ...bloodMetrics.H },
  J: { src: bloodJ, ...bloodMetrics.J },
  C: { src: bloodC, ...bloodMetrics.C },
  A: { src: bloodA, ...bloodMetrics.A }
};

export default {
  computed: {
    ...mapState(["session", "edition"]),
    editionList() {
      return editionJSON;
    },
    townIdClean() {
      return normalizeTownId(this.townId);
    },
    // FT-847: does THIS browser hold the picked town's edit key?
    ownsPicked() {
      return !!(this.townIdClean && editKeyFor(this.townIdClean));
    },
    // The script an OWNED picked town carries in its server meta (if any).
    attachedScriptId() {
      const id = this.townIdClean;
      if (!id || !editKeyFor(id)) return null;
      const m = this.meta[id];
      return (m && m.scriptId) || null;
    },
    shareLink() {
      const url = window.location.href.split("#")[0];
      return url + "#" + this.townIdClean;
    },
    canJoin() {
      return !!(this.joinIdClean && this.joinName.trim());
    },
    joinIdClean() {
      let raw = this.joinId.trim();
      if (raw.match(/^https?:\/\//i)) raw = raw.split("#").pop();
      return normalizeTownId(raw);
    }
  },
  data() {
    return {
      language: window.navigator.userLanguage || window.navigator.language,
      blood: BLOOD,
      // Golem fork: the entry panels.
      mode: null, // null = doors | "host" | "join"
      townId: mintTownId(),
      scriptId: "",
      joinId: "",
      joinName: "",
      hostTowns: [],
      joinTowns: [],
      statuses: {},
      copied: false,
      statusTimer: null,
      // FT-847: owned towns.
      meta: {}, // id → server public meta {name, scriptId, ...}
      keepTown: false,
      claimError: "",
      scriptTouched: false // the user chose a script by hand this visit
    };
  },
  watch: {
    // Live-normalize the host field: junk chars become dashes, capped at 24 —
    // the id the socket joins IS the id on the screen. (Edge dashes survive
    // while typing; townIdClean applies the full trim.)
    townId(value) {
      const live = String(value || "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 24);
      if (live !== value) this.townId = live;
    },
    townIdClean() {
      this.claimError = "";
      this.syncAttached();
    }
  },
  beforeDestroy() {
    clearInterval(this.statusTimer);
  },
  methods: {
    openHost() {
      this.mode = "host";
      this.hostTowns = this.sortOwnedFirst(listTowns("host"));
      this.scriptId = editionJSON.some(e => e.id === this.edition.id)
        ? this.edition.id
        : "__custom";
      this.scriptTouched = false;
      this.claimError = "";
      this.watchTowns();
      this.refreshMeta();
    },
    openJoin() {
      this.mode = "join";
      this.joinTowns = listTowns("player");
      this.joinName = localStorage.getItem("golem.playerName") || "";
      this.watchTowns();
      this.refreshMeta();
    },
    /** FT-847: owned towns lead the shelf; recency holds within each group. */
    sortOwnedFirst(towns) {
      return towns
        .slice()
        .sort((a, b) => (b.editKey ? 1 : 0) - (a.editKey ? 1 : 0));
    },
    /** Best-effort batch meta: display names + attached scripts. */
    refreshMeta() {
      const ids = [
        ...new Set([...listTowns("host"), ...listTowns("player")].map(t => t.id))
      ];
      townMeta(ids).then(meta => {
        this.meta = meta;
        // re-list: townMeta cached fresh display names onto the shelf
        if (this.mode === "host")
          this.hostTowns = this.sortOwnedFirst(listTowns("host"));
        if (this.mode === "join") this.joinTowns = listTowns("player");
        this.syncAttached();
      });
    },
    /** Keep the script select honest about an owned town's saved script. */
    syncAttached() {
      if (this.attachedScriptId) {
        if (!this.scriptTouched) this.scriptId = "__attached";
      } else if (this.scriptId === "__attached") {
        this.scriptId = editionJSON.some(e => e.id === this.edition.id)
          ? this.edition.id
          : "__custom";
      }
    },
    /** Display name for a shelf row: cached/server name, else the id. */
    townLabel(t) {
      const m = this.meta[t.id];
      return (m && m.name) || t.name || t.id;
    },
    /** Poll the relay for awake/quiet while a panel is open. */
    watchTowns() {
      clearInterval(this.statusTimer);
      const refresh = () => {
        if (!this.mode) return clearInterval(this.statusTimer);
        const ids = [
          ...new Set([...this.hostTowns, ...this.joinTowns].map(t => t.id))
        ];
        townStatuses(ids).then(statuses => {
          this.statuses = statuses;
        });
      };
      refresh();
      this.statusTimer = setInterval(refresh, 10000);
    },
    dotClass(id) {
      const s = this.statuses[id];
      if (!s) return "unknown";
      if (s.host) return "awake";
      return s.players ? "stirring" : "quiet";
    },
    statusLabel(id) {
      const s = this.statuses[id];
      if (!s) return "";
      if (s.host)
        return `awake · ${s.players} in town`;
      return s.players ? `${s.players} waiting` : "quiet";
    },
    reroll() {
      this.townId = mintTownId();
    },
    copyShare() {
      try {
        navigator.clipboard.writeText(this.shareLink);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 1500);
      } catch (e) {
        // clipboard is a bonus, never a blocker
      }
    },
    async confirmHost() {
      const id = this.townIdClean;
      if (!id) return;
      this.claimError = "";
      // FT-847: claim first when asked to keep — but BEST-EFFORT: a dead API
      // never blocks plain hosting; only an honest "taken" does.
      if (this.keepTown && !editKeyFor(id)) {
        try {
          const claimed = await claimTown(id, id);
          if (claimed.taken) {
            this.claimError = `“${id}” is already someone's town — roll a new name, or untick “Keep” to host it anyway.`;
            return;
          }
        } catch (e) {
          // unreachable / server error → host without keeping, quietly
        }
      }
      if (
        this.scriptId !== "__custom" &&
        this.scriptId !== "__attached" &&
        this.scriptId !== this.edition.id
      ) {
        const edition = editionJSON.find(e => e.id === this.scriptId);
        if (edition) this.$store.commit("setEdition", edition);
      }
      this.$store.commit("session/clearVoteHistory");
      this.$store.commit("session/setSpectator", false);
      this.$store.commit("session/setSessionId", id);
      this.copyShare();
      // "Custom / vault…" hands off to the script picker once the town is up.
      if (this.scriptId === "__custom") {
        this.$store.commit("toggleModal", "edition");
      } else if (this.scriptId === "__attached" && this.attachedScriptId) {
        // FT-847: an owned town carries its script — load it through the same
        // vault path as a ?script= link (no re-attach round trip).
        const editionModal = this.$parent.$refs.edition;
        if (editionModal) editionModal.loadFromVault(this.attachedScriptId, false);
      }
    },
    confirmJoin() {
      const id = this.joinIdClean;
      const name = this.joinName.trim();
      if (!id || !name) return;
      localStorage.setItem("golem.playerName", name);
      this.$store.commit("session/clearVoteHistory");
      this.$store.commit("session/setSpectator", true);
      this.$store.commit("toggleGrimoire", false);
      this.$store.commit("session/setSessionId", id);
    },
    bloodStyle(ch) {
      const m = BLOOD[ch];
      const em = (px) => (px * BLOOD_EM_PER_PX).toFixed(3) + "em";
      return {
        width: em(m.w),
        height: em(m.h),
        // sink the drip overhang below the text baseline
        verticalAlign: "-" + em(m.below)
      };
    },
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
// Bloody (J. Fordyce, 1994, freeware) — the user's pick for the initials;
// Rubik Wet Paint (OFL) stays as the licensed fallback.
@font-face {
  font-family: Bloody;
  src: url("../assets/fonts/bloody.ttf");
  font-display: swap;
}
@font-face {
  font-family: WetPaint;
  src: url("../assets/fonts/rubikwetpaint.ttf");
  font-display: swap;
}

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
        font-family: Bloody, WetPaint, sans-serif;
        font-size: 105%;
        margin-right: 2px;
        color: #c00;
        text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
          1px 1px 0 #000;
        display: inline-block;

        // Golem fork (FT-846): the baked blood drop-cap; drips hang over the
        // door edge, above its border.
        img {
          position: relative;
          z-index: 2;
        }
      }
    }
  }

  // Golem fork: the Host / Join entry panels (replacing browser dialogs).
  .panel {
    width: 100%;
    max-width: 420px;
    text-align: left;

    > .hint {
      text-align: center;
      margin-bottom: 8px;
    }

    ul.towns {
      list-style: none;
      margin: 0 0 10px;
      padding: 0;
      max-height: 30vh;
      overflow-y: auto;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid transparent;

        &:hover {
          color: red;
        }
        &.picked {
          border-color: #400;
          background: rgba(0, 0, 0, 0.5);
        }
        .name {
          flex-grow: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          small.tid {
            opacity: 0.5;
            margin-left: 4px;
          }
        }
        small {
          opacity: 0.7;
          white-space: nowrap;
        }
        small.yours {
          opacity: 1;
          color: #c66;
          border: 1px solid #400;
          border-radius: 4px;
          padding: 0 5px;
          font-size: 65%;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dot {
          flex-shrink: 0;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #333;
          box-shadow: 0 0 3px black;

          &.awake {
            background: #c00;
            box-shadow: 0 0 6px #c00;
          }
          &.stirring {
            background: #a60;
            box-shadow: 0 0 5px #a60;
          }
        }
      }
    }

    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;

      label {
        width: 55px;
        flex-shrink: 0;
        opacity: 0.8;
      }
      input,
      select {
        flex-grow: 1;
        min-width: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border: 2px solid black;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 90%;
        outline: none;

        &:focus {
          border-color: #400;
        }
      }
      select option {
        background: black;
      }
      .tool {
        cursor: pointer;
        &:hover {
          color: red;
        }
      }
      .share {
        flex-grow: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 80%;
        opacity: 0.9;

        .url {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        &:hover {
          color: red;
        }
      }
    }

    // FT-847: the keep-this-town row + claim feedback.
    .field.keep {
      .tick {
        flex-grow: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 85%;
        opacity: 0.9;

        input[type="checkbox"] {
          flex-grow: 0;
          width: 15px;
          height: 15px;
          accent-color: #400;
          cursor: pointer;
        }
        &:hover {
          color: red;
        }
      }
      .owned-note {
        font-size: 80%;
        color: #c66;
      }
    }
    .claim-error {
      margin: 4px 0 0;
      font-size: 80%;
      color: #e88;
      text-shadow: 0 0 3px black;
    }

    .acts {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;

      .back {
        cursor: pointer;
        opacity: 0.7;
        &:hover {
          color: red;
          opacity: 1;
        }
      }
      button.confirm {
        font-family: PiratesBay, sans-serif;
        letter-spacing: 1px;
        font-size: 110%;
        color: white;
        cursor: pointer;
        padding: 8px 20px;
        background: rgba(0, 0, 0, 0.7);
        border: 3px solid #400;
        border-radius: 10px;
        box-shadow: 0 0 10px black;

        &:hover {
          color: red;
        }
        &.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: black;
        }
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
