<template>
  <Modal
    class="editions"
    :class="{ workbench: isCustom }"
    v-if="modals.edition"
    @close="toggleModal('edition')"
  >
    <div v-if="!isCustom">
      <h3>Select an edition:</h3>
      <ul class="editions">
        <li
          v-for="edition in editions"
          class="edition"
          :class="['edition-' + edition.id]"
          :style="{
            backgroundImage: `url(${require('../../assets/editions/' +
              edition.id +
              '.png')})`
          }"
          :key="edition.id"
          @click="setEdition(edition)"
        >
          {{ edition.name }}
        </li>
        <li
          class="edition edition-custom"
          @click="isCustom = true"
          :style="{
            backgroundImage: `url(${require('../../assets/editions/custom.png')})`
          }"
        >
          Custom Script / Characters
        </li>
      </ul>
    </div>
    <!-- Golem fork (FT-854): the Almanac WORKBENCH — the full script-editing
         surface. Top: script selector + actions + the composition meter.
         Left: every role (officials + your library) with search and team
         filters. Main: the current script in three views. The meter INFORMS,
         never blocks — non-conforming scripts save, share and play. -->
    <div class="custom workbench" v-else>
      <div class="wb-top">
        <!-- Row 1: the title, the composition meter at its right.
             Row 2: THE shared ScriptPicker (identical component to the host
             panel's — change one, change both) + the action buttons. -->
        <div class="wb-row1">
          <h3 class="almanac-title">
            <img :src="bloodA" class="blood-cap-a" alt="A" />lmanac
          </h3>
          <div class="wb-meter" :class="{ nonconforming: !servableCounts.length }">
            <span class="chip team-townsfolk">{{ teamCounts.townsfolk }} townsfolk</span>
            <span class="chip team-outsider">
              {{ teamCounts.outsider }} outsider{{ teamCounts.outsider === 1 ? "" : "s" }}
            </span>
            <span class="chip team-minion">
              {{ teamCounts.minion }} minion{{ teamCounts.minion === 1 ? "" : "s" }}
            </span>
            <span class="chip team-demon">
              {{ teamCounts.demon }} demon{{ teamCounts.demon === 1 ? "" : "s" }}
            </span>
            <span class="verdict" v-if="servableCounts.length">
              plays {{ servableText }} players
            </span>
            <span class="verdict" v-else>
              <font-awesome-icon icon="exclamation-triangle" />
              outside the rules — still playable
            </span>
          </div>
        </div>
        <div class="wb-row2">
          <ScriptPicker
            class="wb-script-picker"
            :cards="wbScriptCards"
            :picked-id="wbPickedId"
            @pick="onScriptPick"
          />
          <div class="wb-actions">
          <div class="button" @click="newScript">
            <font-awesome-icon icon="scroll" /> New script
          </div>
          <div class="button" @click="openRoleForm()">
            <font-awesome-icon icon="plus-circle" /> New role
          </div>
          <div class="button" @click="importRoleOpen = !importRoleOpen">
            <font-awesome-icon icon="file-code" /> Import role
          </div>
          <div class="button" @click="saveToVault">
            <font-awesome-icon icon="file-upload" /> Save script
          </div>
          <div class="button" @click="promptVaultLoad">
            <font-awesome-icon icon="link" /> Load by link
          </div>
          <div class="button" @click="openUpload">
            <font-awesome-icon icon="file-upload" /> Upload JSON
          </div>
          <div class="button" @click="promptURL">
            <font-awesome-icon icon="link" /> Enter URL
          </div>
          <div class="button" v-if="recents.length" @click="copyLinks">
            <font-awesome-icon icon="clipboard" /> Export my links
          </div>
          <div class="button" @click="isCustom = false">
            <font-awesome-icon icon="undo" /> Back
          </div>
          </div>
        </div>
        <div class="wb-import-role" v-if="importRoleOpen">
          <textarea
            v-model="importRoleText"
            rows="3"
            placeholder='Paste one role as JSON — an official id ("chef") or a role object {"name": …, "ability": …, "team": …}'
          ></textarea>
          <div class="button" @click="importRole">
            <font-awesome-icon icon="plus-circle" /> Add to script
          </div>
        </div>
      </div>

      <div class="wb-body">
        <aside class="wb-sidebar">
          <input
            v-model="roleQuery"
            class="wb-search"
            placeholder="Search every role…"
            @keyup.enter="searchRoles"
          />
          <div class="wb-chips">
            <span
              v-for="chip in teamChips"
              :key="chip.value"
              class="wb-chip"
              :class="{ active: wbTeam === chip.value }"
              @click="wbTeam = wbTeam === chip.value ? '' : chip.value"
            >{{ chip.label }}</span>
          </div>
          <ul class="wb-all-roles">
            <li
              v-for="entry in sidebarRoles"
              :key="entry.key"
              :class="['team-' + entry.team, { inscript: entry.inScript }]"
              @click="toggleRole(entry)"
              :title="entry.ability || entry.name"
            >
              <span
                class="icon"
                v-if="entry.iconUrl"
                :style="{ backgroundImage: `url(${entry.iconUrl})` }"
              ></span>
              <span class="wb-role-name">{{ entry.name }}</span>
              <small v-if="entry.isLib">{{ entry.mine ? "yours" : "library" }}</small>
              <span class="wb-in" v-if="entry.inScript">✓</span>
            </li>
          </ul>
          <div class="button-group">
            <div class="button" @click="searchRoles">
              <font-awesome-icon icon="search-plus" /> Browse library
            </div>
          </div>
        </aside>

        <main class="wb-main">
          <div class="wb-views">
            <span
              class="wb-tab"
              :class="{ active: wbView === 'team' }"
              @click="wbView = 'team'"
            >By team</span>
            <span
              class="wb-tab"
              :class="{ active: wbView === 'first' }"
              @click="wbView = 'first'"
            >First night</span>
            <span
              class="wb-tab"
              :class="{ active: wbView === 'other' }"
              @click="wbView = 'other'"
            >Other nights</span>
          </div>
          <div class="wb-empty" v-if="!scriptRoles.length">
            An empty page. Add roles from the shelf on the left, or pick a
            script above.
          </div>
          <div class="wb-groups" v-else>
            <section
              v-for="group in viewGroups"
              :key="group.label"
              :class="[group.team ? 'team-' + group.team : '', { dim: group.dim }]"
            >
              <h4>
                {{ group.label }} <small>({{ group.roles.length }})</small>
              </h4>
              <ul class="wb-cards">
                <li
                  v-for="role in group.roles"
                  :key="role.id"
                  class="wb-card"
                  :class="'team-' + role.team"
                >
                  <span
                    class="icon"
                    :style="{ backgroundImage: `url(${roleIconUrl(role)})` }"
                  ></span>
                  <span class="wb-card-head">
                    <span class="wb-card-name">{{ role.name }}</span>
                    <span class="night-num" v-if="wbView !== 'team'">
                      {{ wbView === "first" ? role.firstNight : role.otherNight }}
                    </span>
                  </span>
                  <span class="wb-card-ability">{{ role.ability }}</span>
                  <span class="wb-card-actions">
                    <font-awesome-icon
                      v-if="role.isCustom"
                      icon="pen"
                      title="Edit this role"
                      @click.stop="openRoleForm(role)"
                    />
                    <font-awesome-icon
                      icon="times"
                      title="Remove from script"
                      @click.stop="removeRole(role.id)"
                    />
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </main>
      </div>

      <!-- Golem fork (FT-851): the custom-role library — author a role once,
           save it to the library, and drop it into the current script as a
           full snapshot (the script carries the whole role). Fork-on-edit
           like scripts: saving someone else's role forks your own copy.
           FT-854: the forge floats over the workbench as an overlay. -->
      <div class="role-form" v-if="roleForm">
        <div class="row">
          <input
            v-model="roleForm.name"
            placeholder="Role name"
            maxlength="40"
          />
          <select v-model="roleForm.roleType">
            <option value="townsfolk">Townsfolk</option>
            <option value="outsider">Outsider</option>
            <option value="minion">Minion</option>
            <option value="demon">Demon</option>
            <option value="traveller">Traveller</option>
          </select>
        </div>
        <div class="row">
          <textarea
            v-model="roleForm.ability"
            placeholder="Ability text"
            maxlength="600"
            rows="3"
          ></textarea>
        </div>
        <div class="row nights">
          <span>Wakes:</span>
          <label>
            first night
            <input
              type="number"
              min="0"
              max="200"
              v-model.number="roleForm.firstNight"
            />
          </label>
          <label>
            other nights
            <input
              type="number"
              min="0"
              max="200"
              v-model.number="roleForm.otherNight"
            />
          </label>
          <small>(night-order position; 0 = doesn't wake)</small>
        </div>
        <div class="row">
          <input
            v-model="roleForm.reminders"
            class="wide"
            placeholder="Reminder tokens, comma-separated"
          />
        </div>
        <div class="row">
          <label>
            <input type="checkbox" v-model="roleForm.setup" />
            affects setup
          </label>
          <input
            v-model="roleForm.authorName"
            placeholder="Author"
            maxlength="200"
          />
        </div>
        <div class="icon-picker">
          <input
            v-model="iconSearch"
            placeholder="Icon: search official roles (optional)…"
          />
          <div class="icon-grid">
            <div
              class="icon-cell"
              v-for="official in iconMatches"
              :key="official.id"
              :class="{ selected: roleForm.icon === official.id }"
              @click="pickIcon(official.id)"
            >
              <span
                class="icon"
                :style="{ backgroundImage: `url(${iconUrl(official.id)})` }"
              ></span>
              <span class="label">{{ official.name }}</span>
            </div>
          </div>
        </div>
        <div class="role-error" v-if="roleError">{{ roleError }}</div>
        <div class="button-group">
          <div class="button" @click="saveRoleForm">
            <font-awesome-icon icon="file-upload" /> Save role
          </div>
          <div class="button" @click="closeRoleForm">
            <font-awesome-icon icon="times" /> Cancel
          </div>
        </div>
      </div>
      <div class="role-error wb-error" v-if="roleError">{{ roleError }}</div>

      <input
        type="file"
        ref="upload"
        accept="application/json"
        @change="handleUpload"
      />
    </div>
  </Modal>
</template>

<script>
import editionJSON from "../../editions";
import rolesJSON from "../../roles.json";
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import * as vault from "../../golem/scripts";
import * as roleLib from "../../golem/roles";
import * as towns from "../../golem/towns";
import { flashHint } from "../../golem/hint";
import bloodA from "../../assets/blood/blood-A.png";
// FT-854: THE shared script picker + its art — the same component the host
// panel renders (user-directed: one component, both surfaces).
import ScriptPicker from "../ScriptPicker";
import {
  EDITION_ICONS,
  edCustom,
  OFFICIAL_BLURBS
} from "../../golem/editionArt";

// Golem fork (FT-854): the official setup table — players: [townsfolk,
// outsiders, minions, demons]. The meter measures a script's POOL against it:
// a count is servable when the pool covers each column. Purely informational.
const SETUP_TABLE = {
  5: [3, 0, 1, 1],
  6: [3, 1, 1, 1],
  7: [5, 0, 1, 1],
  8: [5, 1, 1, 1],
  9: [5, 2, 1, 1],
  10: [7, 0, 2, 1],
  11: [7, 1, 2, 1],
  12: [7, 2, 2, 1],
  13: [9, 0, 3, 1],
  14: [9, 1, 3, 1],
  15: [9, 2, 3, 1]
};
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon", "traveler"];
const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
  traveler: "Travellers"
};
// roles.json spells it "traveler"; the server's roleType vocabulary spells it
// "traveller". Normalize to the app side everywhere the two meet.
const normTeam = t => (t || "").replace("traveller", "traveler");

export default {
  components: {
    Modal,
    ScriptPicker
  },
  data: function() {
    return {
      editions: editionJSON,
      isCustom: false,
      bloodA,
      // Golem fork: the vault shelf + which vault script is currently loaded
      // (the fork/update decision key on save).
      recents: vault.getRecents(),
      // Golem fork (FT-851): the custom-role library state — the form (null
      // when closed), the library id being edited (fork/update decision), the
      // icon-picker filter, browse query/filter/results, the roles shelf.
      roleForm: null,
      editingLibId: null,
      iconSearch: "",
      roleQuery: "",
      roleTypeFilter: "",
      roleResults: [],
      roleShelf: roleLib.getRecents(),
      roleError: "",
      // Golem fork (FT-854): the workbench — active view, sidebar team filter,
      // the import-role paste row, and the non-conforming marks by script id
      // (derived from the setup table; informational only, never a gate).
      wbView: "team",
      wbTeam: "",
      importRoleOpen: false,
      importRoleText: "",
      ncMap: JSON.parse(localStorage.getItem("golem.scriptNC") || "{}"),
      officials: [
        ["trouble-brewing", "Trouble Brewing"],
        ["bad-moon-rising", "Bad Moon Rising"],
        ["sects-and-violets", "Sects & Violets"]
      ],
      vaultSourceId: null,
      scripts: [
        [
          "Deadly Penance Day",
          "https://gist.githubusercontent.com/bra1n/0337cc44c6fd2c44f7589256ed5486d2/raw/16be38fa3c01aaf49827303ac80577bdb52c0b25/penanceday.json"
        ],
        [
          "Catfishing 11.1",
          "https://gist.githubusercontent.com/bra1n/8a5ec41a7bbf945f6b7dfc1cef72b569/raw/a312ab93c2f302e0ef83c8b65a4e8e82760fda3a/catfishing.json"
        ],
        [
          "On Thin Ice (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/8dacd9f2abc6f428331ea1213ab153f5/raw/0cacbcaf8ed9bddae0cca25a9ada97e9958d868b/on-thin-ice.json"
        ],
        [
          "Race To The Bottom (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/63e1354cb3dc9d4032bcd0623dc48888/raw/5acb0eedcc0a67a64a99c7e0e6271de0b7b2e1b2/race-to-the-bottom.json"
        ],
        [
          "Frankenstein's Mayor by Ted (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/32c52b422cc01b934a4291eeb81dbcee/raw/5bf770693bbf7aff5e86601c82ca4af3222f4ba6/Frankensteins_Mayor_by_Ted.json"
        ],
        [
          "Vigormortis High School (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/1f65bd4a999524719d5dabe98c3c2d27/raw/22bbec6bf56a51a7459e5ae41ed47e41971c5445/VigormortisHighSchool.json"
        ]
      ]
    };
  },
  computed: {
    ...mapState(["modals"]),
    // Golem fork (FT-851): the current script's custom roles (editable rows).
    // state.roles is REPLACED wholesale on every setCustomRoles, so this
    // recomputes despite being a Map.
    editionCustomRoles() {
      const list = [];
      this.$store.state.roles.forEach(role => {
        if (role.isCustom) list.push(role);
      });
      return list;
    },
    // The icon picker's grid: official roles, name-filtered.
    iconMatches() {
      const q = this.iconSearch.trim().toLowerCase();
      if (!q) return rolesJSON;
      return rolesJSON.filter(role => role.name.toLowerCase().includes(q));
    },
    // The shelf, narrowed by the browse query so search reads as one list.
    roleShelfFiltered() {
      const q = this.roleQuery.trim().toLowerCase();
      if (!q) return this.roleShelf;
      return this.roleShelf.filter(entry =>
        (entry.name || "").toLowerCase().includes(q)
      );
    },
    // ── Golem fork (FT-854): the workbench ───────────────────────────────
    myScripts() {
      return this.recents.filter(e => e.editKey);
    },
    viewedScripts() {
      return this.recents.filter(e => !e.editKey);
    },
    /** What the picker should show as current. */
    wbPickedId() {
      const edition = this.$store.state.edition;
      if (edition && edition.id !== "custom") return edition.id;
      return this.vaultSourceId || "";
    },
    /** The picker's cards: officials, then your scripts, then viewed ones.
     *  Non-conforming scripts wear the warning right in their name. */
    wbScriptCards() {
      const cards = [];
      this.editions.forEach(e => {
        cards.push({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL"
        });
      });
      const vaultCard = (entry, source) => ({
        id: entry.id,
        name: (this.ncMap[entry.id] ? "⚠ " : "") + (entry.name || entry.id),
        icon: edCustom,
        blurb: this.ncMap[entry.id]
          ? "Outside the rules — still playable."
          : "",
        source
      });
      this.myScripts.forEach(e => cards.push(vaultCard(e, "yours")));
      this.viewedScripts.forEach(e => cards.push(vaultCard(e, "viewed")));
      return cards;
    },
    /** The current script as a list (state.roles is replaced wholesale). */
    scriptRoles() {
      const list = [];
      this.$store.state.roles.forEach(role => list.push(role));
      return list;
    },
    teamCounts() {
      const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0 };
      this.scriptRoles.forEach(role => {
        const team = normTeam(role.team);
        if (counts[team] !== undefined) counts[team] += 1;
      });
      return counts;
    },
    /** Player counts the pool can serve under the official table. */
    servableCounts() {
      const c = this.teamCounts;
      return Object.keys(SETUP_TABLE)
        .map(Number)
        .filter(n => {
          const [t, o, m, d] = SETUP_TABLE[n];
          return (
            c.townsfolk >= t && c.outsider >= o && c.minion >= m && c.demon >= d
          );
        });
    },
    /** "5–15" / "5, 7, 10–13" — collapse runs for the meter. */
    servableText() {
      const runs = [];
      this.servableCounts.forEach(n => {
        const last = runs[runs.length - 1];
        if (last && n === last[1] + 1) last[1] = n;
        else runs.push([n, n]);
      });
      return runs
        .map(([a, b]) => (a === b ? String(a) : a + "–" + b))
        .join(", ");
    },
    // Travellers left the script surface (user call 2026-08-17): a script is
    // the town's regular menu; travellers join IN the town — the seat's role
    // picker already lists every traveller, in-script or not (otherTravelers).
    teamChips() {
      return [
        { value: "townsfolk", label: "Townsfolk" },
        { value: "outsider", label: "Outsiders" },
        { value: "minion", label: "Minions" },
        { value: "demon", label: "Demons" },
        { value: "mine", label: "Yours" }
      ];
    },
    /** The sidebar: every official + your library + browse results, filtered. */
    sidebarRoles() {
      const q = this.roleQuery.trim().toLowerCase();
      const inScriptIds = new Set(this.scriptRoles.map(r => r.id));
      const inScriptLibIds = new Set(
        this.scriptRoles.map(r => r.golemRoleId).filter(Boolean)
      );
      const entries = [];
      rolesJSON.forEach(role => {
        if (normTeam(role.team) === "traveler") return; // town-side, not script
        entries.push({
          key: "off-" + role.id,
          id: role.id,
          name: role.name,
          team: normTeam(role.team),
          ability: role.ability,
          iconUrl: this.iconUrl(role.id),
          official: true,
          inScript: inScriptIds.has(role.id)
        });
      });
      const seen = new Set();
      this.roleShelf.forEach(entry => {
        seen.add(entry.id);
        if (normTeam(entry.role) === "traveler") return;
        entries.push({
          key: "lib-" + entry.id,
          libId: entry.id,
          name: entry.name,
          team: normTeam(entry.role),
          isLib: true,
          mine: !!entry.editKey,
          inScript: inScriptLibIds.has(entry.id)
        });
      });
      this.roleResults.forEach(row => {
        if (seen.has(row.id)) return;
        if (normTeam(row.roleType) === "traveler") return;
        entries.push({
          key: "browse-" + row.id,
          libId: row.id,
          name: row.name,
          team: normTeam(row.roleType),
          isLib: true,
          mine: false,
          inScript: inScriptLibIds.has(row.id)
        });
      });
      return entries.filter(entry => {
        if (q && !(entry.name || "").toLowerCase().includes(q)) return false;
        if (this.wbTeam === "mine") return entry.isLib && entry.mine;
        if (this.wbTeam) return entry.team === this.wbTeam;
        return true;
      });
    },
    /** The main area's groups, per view. Night views sink non-wakers, dim.
     *  Travellers never render here — they are town-side content. */
    viewGroups() {
      const roles = this.scriptRoles.filter(
        r => normTeam(r.team) !== "traveler"
      );
      if (this.wbView === "team") {
        return ["townsfolk", "outsider", "minion", "demon"].map(team => ({
          label: TEAM_LABELS[team],
          team,
          roles: roles
            .filter(r => normTeam(r.team) === team)
            .sort((a, b) => a.name.localeCompare(b.name))
        })).filter(g => g.roles.length);
      }
      const prop = this.wbView === "first" ? "firstNight" : "otherNight";
      const wakers = roles
        .filter(r => (r[prop] || 0) > 0)
        .sort((a, b) => a[prop] - b[prop] || a.name.localeCompare(b.name));
      const sleepers = roles
        .filter(r => !(r[prop] || 0))
        .sort((a, b) => a.name.localeCompare(b.name));
      const groups = [
        {
          label: this.wbView === "first" ? "Wake the first night" : "Wake on other nights",
          roles: wakers
        }
      ];
      if (sleepers.length)
        groups.push({ label: "Don't wake", roles: sleepers, dim: true });
      return groups;
    }
  },
  // Golem fork: a ?script=<id> share link auto-loads its script on arrival.
  // The QUERY string is used (not the hash) because the hash is the live
  // session's join token upstream — the two must coexist on one URL.
  created() {
    const id = new URLSearchParams(window.location.search).get("script");
    if (id) this.loadFromVault(id);
  },
  methods: {
    // ── Golem fork: the script vault ─────────────────────────────────────
    async loadFromVault(id, attach = true) {
      try {
        const script = await vault.loadScript(id);
        // roles verbatim; carry the vault name in as _meta so the script's
        // name survives the round trip and seeds the save prompt later.
        const roles = Array.isArray(script.roles) ? script.roles.slice() : [];
        if (!roles.some(r => r && r.id === "_meta")) {
          roles.unshift({ id: "_meta", name: script.name, author: script.author });
        }
        this.parseRoles(roles);
        this.vaultSourceId = script.id;
        this.recents = vault.getRecents();
        this.markNC(script.id);
        // FT-847: the host of an OWNED town picked a vault script → save it
        // to the town (skipped when the town itself supplied the script).
        if (attach) this.maybeAttachToTown(script.id);
      } catch (e) {
        alert("Could not load that script: " + e.message);
      }
    },
    /**
     * FT-847: attach the loaded script to the current town — only when this
     * browser HOSTS the session AND holds the town's edit key. Spectators are
     * never prompted; failures are silent (best-effort, like all town calls).
     */
    maybeAttachToTown(scriptId) {
      const { session } = this.$store.state;
      if (session.isSpectator || !session.sessionId) return;
      if (!towns.editKeyFor(session.sessionId)) return;
      towns
        .updateTown(session.sessionId, { scriptId })
        .then(town => flashHint(`Script saved to ${town.name || town.id}`))
        .catch(() => {});
    },
    promptVaultLoad() {
      const ref = prompt("Paste a script link (or its id)");
      const id = vault.parseScriptRef(ref);
      if (id) this.loadFromVault(id);
      else if (ref) alert("That does not look like a script link.");
    },
    async saveToVault() {
      // The CURRENT custom script = what the store holds. Plain base-role
      // entries collapse back to id references; custom roles ship whole.
      const custom = this.$store.state.roles;
      if (this.$store.state.edition.id !== "custom" || !custom.size) {
        alert("Load or build a custom script first — the vault stores custom scripts.");
        return;
      }
      const meta = this.$store.state.edition;
      const name = prompt("Script name", meta.name || "My script");
      if (!name) return;
      // A role whose id exists upstream collapses back to a bare id reference
      // (the Script Tool convention); a custom role ships whole, minus the
      // store's derived display fields.
      const base = this.$store.getters.rolesJSONbyId;
      const roles = [];
      custom.forEach(role => {
        if (base.has(role.id)) {
          roles.push(role.id);
        } else {
          const rest = { ...role };
          delete rest.imageAlt; // the store's derived display field
          roles.push(rest);
        }
      });
      try {
        const { script, created, forked } = await vault.saveScript({
          name,
          author: meta.author,
          roles,
          sourceId: this.vaultSourceId
        });
        this.vaultSourceId = script.id;
        this.recents = vault.getRecents();
        // FT-854: stamp (or clear) the non-conforming mark — a marker, not a
        // gate; the save above already succeeded whatever the composition.
        this.markNC(script.id);
        // FT-847: a save/fork lands a (possibly new) script id — keep the
        // owned town pointing at what its host actually plays.
        this.maybeAttachToTown(script.id);
        const link = vault.shareLink(script.id);
        const what = forked
          ? "Forked into your own copy"
          : created
            ? "Saved"
            : "Updated";
        try {
          await navigator.clipboard.writeText(link);
          alert(`${what}. Share link copied:\n${link}`);
        } catch (e) {
          alert(`${what}. Share link:\n${link}`);
        }
      } catch (e) {
        alert("Save failed: " + e.message);
      }
    },
    async copyLinks() {
      try {
        await navigator.clipboard.writeText(vault.exportLinks());
        alert("Your script links (edit keys included) are on the clipboard — paste them somewhere safe.");
      } catch (e) {
        alert(vault.exportLinks());
      }
    },
    // ── Golem fork (FT-851): the custom-role library ─────────────────────
    /** Open the form — blank, or seeded from an existing edition role. */
    openRoleForm(role) {
      this.roleError = "";
      this.iconSearch = "";
      if (role) {
        this.editingLibId = role.golemRoleId || null;
        this.roleForm = {
          name: role.name,
          roleType: roleLib.roleTypeFromTeam(role.team),
          ability: role.ability,
          firstNight: role.firstNight || 0,
          otherNight: role.otherNight || 0,
          reminders: (role.reminders || []).join(", "),
          setup: !!role.setup,
          authorName: localStorage.getItem("golem.playerName") || "",
          icon: role.golemIcon || "",
          // the app-side id to replace in the script (a fork mints a new
          // library id, so the library id alone can't find the old row)
          appId: role.id
        };
      } else {
        this.editingLibId = null;
        this.roleForm = {
          name: "",
          roleType: "townsfolk",
          ability: "",
          firstNight: 0,
          otherNight: 0,
          reminders: "",
          setup: false,
          authorName: localStorage.getItem("golem.playerName") || "",
          icon: "",
          appId: null
        };
      }
    },
    closeRoleForm() {
      this.roleForm = null;
      this.roleError = "";
    },
    /** Click an icon to select it; click again to clear (icon is optional). */
    pickIcon(id) {
      this.roleForm.icon = this.roleForm.icon === id ? "" : id;
    },
    /** The bundled icon URL for an official role id. */
    iconUrl(id) {
      try {
        return require("../../assets/icons/" + id + ".png");
      } catch (e) {
        return require("../../assets/icons/custom.png");
      }
    },
    /** Save to the library (create/update/fork), then into the script. */
    async saveRoleForm() {
      const f = this.roleForm;
      const reminders = f.reminders
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      // honest inline validation, mirroring the server's bounds
      const nightsOk = [f.firstNight, f.otherNight].every(
        n => Number.isInteger(n) && n >= 0 && n <= 200
      );
      const problem = !f.name.trim()
        ? "A role needs a name."
        : f.name.trim().length > 40
          ? "Name is limited to 40 characters."
          : !f.ability.trim()
            ? "A role needs an ability."
            : f.ability.trim().length > 600
              ? "Ability is limited to 600 characters."
              : !nightsOk
                ? "Night positions are whole numbers 0–200."
                : reminders.length > 20
                  ? "At most 20 reminder tokens."
                  : reminders.some(r => r.length > 40)
                    ? "Reminder tokens are limited to 40 characters."
                    : "";
      if (problem) {
        this.roleError = problem;
        return;
      }
      try {
        const { role, created, forked } = await roleLib.saveRole({
          sourceId: this.editingLibId,
          name: f.name.trim(),
          roleType: f.roleType,
          ability: f.ability.trim(),
          icon: f.icon || "",
          firstNight: f.firstNight,
          otherNight: f.otherNight,
          reminders,
          setup: f.setup,
          authorName: f.authorName.trim() || undefined
        });
        this.roleShelf = roleLib.getRecents();
        this.insertRoleIntoEdition(roleLib.toAppRole(role), f.appId);
        flashHint(
          forked
            ? "Forked into your own copy — script updated"
            : created
              ? "Saved to the role library — added to this script"
              : "Updated — script refreshed"
        );
        this.closeRoleForm();
      } catch (e) {
        this.roleError = "Save failed: " + e.message;
      }
    },
    /** Click a shelf/browse row: fetch the role and add it to the script. */
    async addLibraryRole(id) {
      this.roleError = "";
      try {
        const role = await roleLib.loadRole(id);
        this.roleShelf = roleLib.getRecents();
        this.insertRoleIntoEdition(roleLib.toAppRole(role), null);
        flashHint(`${role.name} added to this script`);
      } catch (e) {
        this.roleError = e.message;
      }
    },
    /** Browse the library (shelf rows are listed separately, so dedupe). */
    async searchRoles() {
      this.roleError = "";
      try {
        // FT-854: the sidebar's team chip doubles as the browse type filter.
        const type = ["townsfolk", "outsider", "minion", "demon"].includes(
          this.wbTeam
        )
          ? this.wbTeam
          : "";
        const rows = await roleLib.browseRoles({
          q: this.roleQuery.trim(),
          type,
          limit: 20
        });
        const shelfIds = new Set(this.roleShelf.map(e => e.id));
        this.roleResults = rows.filter(r => !shelfIds.has(r.id));
      } catch (e) {
        this.roleError = "Browse failed: " + e.message;
      }
    },
    /**
     * Insert (or replace) a role in the CURRENT script — snapshot semantics,
     * saveToVault's collapse: official ids as {id} refs, custom roles whole
     * (minus the store's derived display field). An official edition growing
     * a custom role becomes a custom script.
     */
    insertRoleIntoEdition(appRole, replaceAppId) {
      const base = this.$store.getters.rolesJSONbyId;
      const list = [];
      this.$store.state.roles.forEach(role => {
        if (base.has(role.id)) {
          list.push({ id: role.id });
        } else {
          const rest = { ...role };
          delete rest.imageAlt;
          list.push(rest);
        }
      });
      const at = list.findIndex(
        r =>
          (replaceAppId && r.id === replaceAppId) ||
          (appRole.golemRoleId && r.golemRoleId === appRole.golemRoleId) ||
          r.id === appRole.id
      );
      if (at > -1) list.splice(at, 1, appRole);
      else list.push(appRole);
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script"
        });
      }
    },
    // ── Golem fork (FT-854): the workbench ───────────────────────────────
    /**
     * setEdition (and friends) close the modal as a side effect — upstream's
     * flow ended there. The workbench keeps working, so re-open in place.
     */
    ensureOpen() {
      if (!this.$store.state.modals.edition)
        this.$store.commit("toggleModal", "edition");
      this.isCustom = true;
    },
    onScriptPick(card) {
      const edition = editionJSON.find(e => e.id === card.id);
      if (edition) {
        this.$store.commit("setEdition", edition);
        this.vaultSourceId = null;
        this.ensureOpen();
      } else {
        this.loadFromVault(card.id).then(() => this.ensureOpen());
      }
    },
    /** A blank page: empty custom script, no vault lineage. */
    newScript() {
      this.$store.commit("setCustomRoles", []);
      this.$store.commit("setEdition", { id: "custom", name: "Untitled script" });
      this.vaultSourceId = null;
      this.ensureOpen();
      flashHint("A blank script — add roles from the shelf");
    },
    /** Sidebar click: in the script → out; not in it → in. */
    async toggleRole(entry) {
      this.roleError = "";
      if (entry.official) {
        if (entry.inScript) this.removeRole(entry.id);
        else {
          this.insertRoleIntoEdition({ id: entry.id }, null);
          this.ensureOpen();
        }
        return;
      }
      // library entries: the script carries snapshots keyed by golemRoleId
      if (entry.inScript) {
        const role = this.scriptRoles.find(r => r.golemRoleId === entry.libId);
        if (role) this.removeRole(role.id);
      } else {
        await this.addLibraryRole(entry.libId);
        this.ensureOpen();
      }
    },
    /** Remove one role from the current script (never blocks on composition). */
    removeRole(appId) {
      const base = this.$store.getters.rolesJSONbyId;
      const list = [];
      this.$store.state.roles.forEach(role => {
        if (role.id === appId) return;
        if (base.has(role.id)) list.push({ id: role.id });
        else {
          const rest = { ...role };
          delete rest.imageAlt;
          list.push(rest);
        }
      });
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script"
        });
      }
      this.ensureOpen();
    },
    /** Paste one role — an official id, or a Script-Tool-shaped object. */
    importRole() {
      this.roleError = "";
      let parsed;
      try {
        parsed = JSON.parse(this.importRoleText);
      } catch (e) {
        // a bare official id without quotes is a kindness worth extending
        parsed = this.importRoleText.trim();
      }
      if (Array.isArray(parsed)) parsed = parsed[0];
      const base = this.$store.getters.rolesJSONbyId;
      if (typeof parsed === "string") {
        const id = parsed.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!base.has(id)) {
          this.roleError = `No official role called ${JSON.stringify(parsed)} — paste a role object for customs.`;
          return;
        }
        this.insertRoleIntoEdition({ id }, null);
      } else if (parsed && typeof parsed === "object") {
        if (parsed.id && base.has(parsed.id)) {
          this.insertRoleIntoEdition({ id: parsed.id }, null);
        } else {
          const team = normTeam(parsed.team || parsed.roleType);
          if (!parsed.name || !parsed.ability || !TEAM_ORDER.includes(team)) {
            this.roleError =
              "A role needs at least a name, an ability, and a team (townsfolk / outsider / minion / demon / traveler).";
            return;
          }
          const id =
            (parsed.id && String(parsed.id)) ||
            "imported_" + parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          this.insertRoleIntoEdition(
            {
              ...parsed,
              id,
              team,
              firstNight: Math.abs(parsed.firstNight || 0),
              otherNight: Math.abs(parsed.otherNight || 0),
              reminders: parsed.reminders || [],
              setup: !!parsed.setup,
              isCustom: true
            },
            null
          );
        }
      } else {
        this.roleError = "Paste one role as JSON.";
        return;
      }
      this.importRoleText = "";
      this.importRoleOpen = false;
      this.ensureOpen();
      flashHint("Role added to this script");
    },
    /** The icon for any script role — official art, borrowed art, or generic. */
    roleIconUrl(role) {
      const base = this.$store.getters.rolesJSONbyId;
      if (base.has(role.id)) return this.iconUrl(role.id);
      return this.iconUrl(role.imageAlt || "custom");
    },
    /**
     * Mark (or clear) a vault script's non-conforming flag — DERIVED from the
     * meter at load/save time, stored so the selector can badge without
     * fetching. Marking is the whole enforcement: play proceeds regardless.
     */
    markNC(scriptId) {
      if (!scriptId) return;
      const nc = !this.servableCounts.length;
      const map = { ...this.ncMap };
      if (nc) map[scriptId] = true;
      else delete map[scriptId];
      this.ncMap = map;
      localStorage.setItem("golem.scriptNC", JSON.stringify(map));
    },
    // ── upstream methods ─────────────────────────────────────────────────
    openUpload() {
      this.$refs.upload.click();
    },
    handleUpload() {
      const file = this.$refs.upload.files[0];
      if (file && file.size) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          try {
            const roles = JSON.parse(reader.result);
            this.parseRoles(roles);
          } catch (e) {
            alert("Error reading custom script: " + e.message);
          }
          this.$refs.upload.value = "";
        });
        reader.readAsText(file);
      }
    },
    promptURL() {
      const url = prompt("Enter URL to a custom-script.json file");
      if (url) {
        this.handleURL(url);
      }
    },
    async handleURL(url) {
      const res = await fetch(url);
      if (res && res.json) {
        try {
          const script = await res.json();
          this.parseRoles(script);
        } catch (e) {
          alert("Error loading custom script: " + e.message);
        }
      }
    },
    async readFromClipboard() {
      const text = await navigator.clipboard.readText();
      try {
        const roles = JSON.parse(text);
        this.parseRoles(roles);
      } catch (e) {
        alert("Error reading custom script: " + e.message);
      }
    },
    parseRoles(roles) {
      if (!roles || !roles.length) return;
      roles = roles.map(role => typeof role === "string" ? { id: role } : role);
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit(
        "setEdition",
        Object.assign({}, meta, { id: "custom" })
      );
      // check for fabled and set those too, if present
      if (roles.some((role) => this.$store.state.fabled.has(role.id || role))) {
        const fabled = [];
        roles.forEach((role) => {
          if (this.$store.state.fabled.has(role.id || role)) {
            fabled.push(this.$store.state.fabled.get(role.id || role));
          }
        });
        this.$store.commit("players/setFabled", { fabled });
      }
      // Golem fork (FT-854): loading a script LANDS IN the workbench (the
      // setEdition side effect above closed the modal; upstream also bounced
      // back to the tiles). A silent ?script= auto-load — modal never open —
      // stays silent.
      if (this.isCustom) this.ensureOpen();
    },
    ...mapMutations(["toggleModal", "setEdition"])
  }
};
</script>

<style scoped lang="scss">
// Golem fork: the title's blood drop-cap — em sizes baked from the asset
// metrics, same conversion as the Intro doors.
.almanac-title {
  font-size: 140%;
  .blood-cap-a {
    width: 0.805em;
    height: 0.927em;
    vertical-align: -0.124em;
  }
}

ul.editions .edition {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  padding-top: 15%;
  background-position: center center;
  background-size: 100% auto;
  background-repeat: no-repeat;
  width: 30%;
  margin: 5px;
  font-size: 120%;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000, 0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  &:hover {
    color: red;
  }
}

.custom {
  text-align: center;
  input[type="file"] {
    display: none;
  }
  .scripts {
    list-style-type: disc;
    font-size: 120%;
    cursor: pointer;
    display: block;
    width: 50%;
    text-align: left;
    margin: 10px auto;
    li:hover {
      color: red;
    }
  }
}

// Golem fork (FT-851): the custom-role form + library browser.
.role-form,
.role-library {
  input:not([type="checkbox"]),
  select,
  textarea {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: 1px solid #666;
    border-radius: 4px;
    padding: 4px 6px;
    margin: 3px;
    font-size: 14px;
    font-family: inherit;
  }
  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }
  textarea,
  input.wide {
    width: 70%;
  }
  input[type="number"] {
    width: 60px;
  }
}
.role-form .nights small {
  opacity: 0.6;
  margin-left: 6px;
}
.icon-picker {
  margin: 5px auto;
  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-height: 150px;
    overflow-y: auto;
    margin: 5px auto;
    width: 90%;
    border: 1px solid #444;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
  }
  .icon-cell {
    width: 72px;
    padding: 4px 0;
    cursor: pointer;
    border-radius: 6px;
    .icon {
      display: block;
      width: 40px;
      height: 40px;
      margin: 0 auto;
      background-size: cover;
      background-position: center;
    }
    .label {
      display: block;
      font-size: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 3px;
    }
    &:hover {
      background: rgba(255, 0, 0, 0.25);
    }
    &.selected {
      outline: 2px solid red;
    }
  }
}
.role-error {
  color: #ff6b6b;
  margin: 5px;
  font-weight: bold;
}

// ── Golem fork (FT-854): the workbench ─────────────────────────────────
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff
);

.custom.workbench {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  text-align: left;

  // Our buttons, not upstream's shiny pills: small, flat, dark, hairline.
  // Pixel-sized — the app's base font is viewport-huge, so percentages lie.
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
    &:before,
    &:after {
      content: none;
    }
    &:hover {
      border-color: #a01414;
      color: #ff7070;
    }
  }

  .wb-top {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    .wb-row1 {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 18px;
      .almanac-title {
        margin: 0;
      }
    }
    .wb-row2 {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px 10px;
      .wb-script-picker {
        flex-grow: 0;
        width: 290px;
      }
      .wb-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-left: auto;
      }
    }
  }

  .wb-import-role {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    textarea {
      flex-grow: 1;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 4px 6px;
      font-family: inherit;
    }
    .button {
      margin: 0;
      flex-shrink: 0;
    }
  }

  .wb-meter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    .chip {
      padding: 1px 9px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-left: 3px solid transparent;
      @each $team, $color in $team-colors {
        &.team-#{$team} {
          border-left-color: $color;
        }
      }
    }
    .verdict {
      margin-left: 8px;
      color: #7ed67e;
    }
    &.nonconforming .verdict {
      color: #ff8a8a;
    }
  }

  .wb-body {
    display: flex;
    flex-grow: 1;
    min-height: 0;
    gap: 14px;
    padding-top: 8px;
  }

  .wb-sidebar {
    width: 270px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    .wb-search {
      width: 100%;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: inherit;
    }
    .wb-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin: 6px 0;
    }
    .wb-chip {
      cursor: pointer;
      padding: 1px 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      font-size: 85%;
      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      &.active {
        background: rgba(255, 255, 255, 0.35);
        color: black;
        font-weight: bold;
      }
    }
    .wb-all-roles {
      flex-grow: 1;
      overflow-y: auto;
      display: block;
      min-height: 0;
      li {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 6px;
        cursor: pointer;
        border-radius: 4px;
        border-left: 3px solid transparent;
        @each $team, $color in $team-colors {
          &.team-#{$team} {
            border-left-color: rgba($color, 0.65);
          }
        }
        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .icon {
          width: 26px;
          height: 26px;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }
        .wb-role-name {
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        small {
          color: rgba(255, 255, 255, 0.45);
        }
        .wb-in {
          color: #7ed67e;
          font-weight: bold;
        }
      }
    }
    .button-group {
      margin-top: 6px;
    }
  }

  .wb-main {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    .wb-views {
      display: flex;
      gap: 3px;
      margin-bottom: 6px;
      .wb-tab {
        cursor: pointer;
        padding: 3px 16px;
        border-radius: 4px 4px 0 0;
        background: rgba(255, 255, 255, 0.08);
        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        &.active {
          background: rgba(255, 255, 255, 0.3);
          font-weight: bold;
        }
      }
    }
    .wb-empty {
      color: rgba(255, 255, 255, 0.6);
      padding: 40px;
      text-align: center;
      font-size: 110%;
    }
    .wb-groups {
      overflow-y: auto;
      flex-grow: 1;
      min-height: 0;
      // Each group is a BOX in its team's color (user-directed, from the
      // official almanac reference) — night-view groups keep a neutral frame.
      section {
        margin-bottom: 12px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 4px;
        padding: 8px 12px 10px;
        @each $team, $color in $team-colors {
          &.team-#{$team} {
            border-color: $color;
          }
        }
        &.dim {
          opacity: 0.55;
        }
        h4 {
          margin: 0 0 8px;
          small {
            font-weight: normal;
            opacity: 0.6;
          }
        }
      }
    }
    .wb-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 8px 14px;
      align-items: stretch;
    }
    // The reference layout: a LARGE icon on the left, a small bold name, the
    // ability as the body. No team accent on the card — the group box says it.
    .wb-card {
      position: relative;
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      grid-template-rows: auto 1fr;
      column-gap: 10px;
      padding: 4px 26px 4px 6px;
      .icon {
        grid-row: 1 / span 2;
        width: 64px;
        height: 64px;
        background-size: cover;
        background-position: center;
      }
      .wb-card-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-weight: bold;
        font-size: 92%;
        .night-num {
          font-weight: normal;
          opacity: 0.7;
          font-size: 85%;
        }
      }
      .wb-card-ability {
        grid-column: 2;
        font-size: 82%;
        opacity: 0.85;
        line-height: 1.3;
      }
      // pinned to the card's TOP RIGHT (user call); resting state stays
      // visible (hover-only affordances are unreachable on touch)
      .wb-card-actions {
        position: absolute;
        top: 4px;
        right: 6px;
        display: flex;
        gap: 8px;
        opacity: 0.45;
        transition: opacity 0.15s;
        svg {
          cursor: pointer;
          width: 12px;
          &:hover {
            color: red;
          }
        }
      }
      &:hover .wb-card-actions {
        opacity: 1;
      }
    }
  }

  // The forge floats over the workbench instead of replacing it.
  .role-form {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: rgba(12, 12, 16, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    padding: 18px;
    z-index: 30;
    width: min(680px, 92%);
    max-height: 88%;
    overflow-y: auto;
    text-align: center;
    box-shadow: 0 6px 40px #000;
  }

  .wb-error {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    padding: 4px 14px;
    border-radius: 6px;
    z-index: 40;
  }
}
</style>
