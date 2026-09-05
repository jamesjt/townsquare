<template>
  <!-- ── FT-1398: THE NIGHT LAB'S STRIP ─────────────────────────────────────
       The controls for golem/nightLab.js — the model, the guards, the
       snapshot/restore and every store commit live THERE; this file is only
       the compact strip (the chair/ghost-lab shell: left-docked plate, the
       same bone-on-dark voice), plus the door out.

       UNLIKE THE DEV COLUMN this is not behind `devLabs`: the lab is opened
       from the golem mark's own menu (AccountMenu's Night lab row) and only
       ever exists while the lab is running — the root v-if reads the
       module's observable, so App.vue mounts this unconditionally and the
       closed lab costs one comment node. -->
  <div id="night-lab" v-if="lab.open">
    <div class="nl-rows">
      <div class="nl-head">
        Night lab
        <span
          class="nl-live"
          title="Client-local preview — no town, no relay; nothing here can reach a live game"
          >offline</span
        >
        <button
          type="button"
          class="nl-exit"
          title="Close the lab and restore the table exactly as it was"
          @click="close"
        >
          Exit
        </button>
      </div>
      <!-- THE ROLE — grouped by script, plus the travellers who wake. Only
           characters with a night act are listed; a role without a bespoke
           dress previews its real fallback, which is the honest answer. -->
      <select
        class="nl-role"
        :value="lab.roleId"
        title="Whose night to preview — grouped by script; travellers with night acts at the bottom"
        @change="pickRole($event.target.value)"
      >
        <optgroup v-for="g in groups" :key="g.id" :label="g.name">
          <option v-for="r in g.roles" :key="r.id" :value="r.id">
            {{ r.name }}
          </option>
        </optgroup>
      </select>
      <!-- THE STATE — the role's own grammar, one chip per beat. Choosers
           walk invitation → staged → sealed → ST sent → reopened; told
           roles walk before → telling → settled → residue. -->
      <div class="nl-head nl-sub">State</div>
      <div class="nl-chips">
        <button
          type="button"
          v-for="s in grammar"
          :key="s"
          class="nl-chip"
          :class="{ on: lab.stateId === s }"
          :title="stateHint(s)"
          @click="pickState(s)"
        >
          {{ stateLabel(s) }}
        </button>
      </div>
      <!-- THE EYES — whose screen this is. The bystander sees nothing (that
           silence is the FT-1384/1385 privacy fact, shown rather than
           claimed); the storyteller sees the sheet, never the dress. -->
      <div class="nl-head nl-sub">Seen by</div>
      <div class="nl-chips">
        <button
          type="button"
          v-for="p in perspectives"
          :key="p.id"
          class="nl-chip"
          :class="{ on: lab.perspective === p.id }"
          :title="perspectiveHint(p.id)"
          @click="pickPerspective(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
      <button
        type="button"
        class="nl-replay"
        title="Re-fire this state's arrival animation (steps back one beat and forward again)"
        @click="fireReplay"
      >
        Replay
      </button>
      <div class="nl-hint" v-if="isChooser && lab.perspective === 'acting'">
        tap a seat to place or move the pick
      </div>
    </div>
  </div>
</template>

<script>
import {
  nightLab,
  roleGroups,
  grammarOf,
  applyState,
  setRole,
  setPerspective,
  replay,
  exit,
  STATE_LABELS,
  PERSPECTIVES,
} from "../golem/nightLab";
import { TOLD_ROLES } from "../golem/toldInfo";

const STATE_HINTS = {
  invite: "The night is asking — every coin breathes the invitation",
  staged: "A pick is placed but NOT sent — it can still move freely",
  sealed: "Confirm pressed — the choice is sealed on this side",
  "st-sent": "The storyteller answered and sent — the answer arrives",
  reopened: "The storyteller re-asked — the ring unlocks again",
  before: "Asleep — nothing has been delivered yet",
  telling: "The send lands — the information arrives in the role's own dress",
  settled: "The bright telling eases into the quiet residue",
  residue: "Day breaks — knowledge persists on the coins",
};

const PERSPECTIVE_HINTS = {
  acting: "The acting player's own screen",
  bystander: "Any other seat — sees nothing of this night action",
  storyteller: "The host's screen — the sheet and the record, never the dress",
};

export default {
  name: "NightLab",
  data() {
    return {
      lab: nightLab,
      groups: roleGroups(),
      perspectives: PERSPECTIVES,
    };
  },
  computed: {
    grammar() {
      return this.lab.roleId ? grammarOf(this.lab.roleId) : [];
    },
    isChooser() {
      return (
        this.lab.roleId &&
        !TOLD_ROLES[this.lab.roleId] &&
        this.grammar.indexOf("staged") !== -1
      );
    },
  },
  methods: {
    stateLabel(s) {
      return STATE_LABELS[s] || s;
    },
    stateHint(s) {
      return STATE_HINTS[s] || "";
    },
    perspectiveHint(p) {
      return PERSPECTIVE_HINTS[p] || "";
    },
    pickRole(id) {
      setRole(this.$store, id);
    },
    pickState(s) {
      applyState(this.$store, s);
    },
    pickPerspective(p) {
      setPerspective(this.$store, p);
    },
    fireReplay() {
      replay(this.$store);
    },
    close() {
      exit(this.$store);
    },
  },
};
</script>

<style scoped lang="scss">
// The dev column's shell voice (GhostLab et al.) — left-docked plate, bone
// text on near-black, plum accents — below the FT-1258 ladder's last rung so
// a devLabs browser can run both.
#night-lab {
  position: fixed;
  top: 306px;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  font-size: 13px;

  .nl-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    width: 168px;
    background: rgba(8, 6, 10, 0.92);
    border: 1px solid rgba(120, 105, 135, 0.45);
    border-left: none;
    border-radius: 0 8px 8px 0;
    max-height: calc(100vh - 330px);
    overflow-y: auto;
  }
  .nl-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 10px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #b6a8c8;
    opacity: 0.85;
    padding-bottom: 3px;
    border-bottom: 1px solid rgba(120, 105, 135, 0.28);
  }
  .nl-sub {
    margin-top: 4px;
  }
  .nl-live {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0d0a12;
    background: #b9a6e0;
    border-radius: 3px;
    padding: 1px 4px;
    cursor: help;
  }
  .nl-exit {
    margin-left: auto;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 1px 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  .nl-role {
    font-family: inherit;
    font-size: 12px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 4px;
    max-width: 100%;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  .nl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .nl-chip {
    font-family: inherit;
    font-size: 11px;
    color: #cdc2e2;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
    &.on {
      color: #0d0a12;
      background: #b9a6e0;
      border-color: #b9a6e0;
    }
  }
  .nl-replay {
    font-family: inherit;
    font-size: 11px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 4px;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  .nl-hint {
    font-size: 9px;
    letter-spacing: 0.04em;
    color: #8f82a6;
  }
}
</style>
