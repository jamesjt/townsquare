<template>
  <Modal class="editions" v-if="modals.edition" @close="toggleModal('edition')">
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
    <div class="custom" v-else>
      <!-- Golem fork: the title wears the blood A, like its door. -->
      <h3 class="almanac-title">
        <img :src="bloodA" class="blood-cap-a" alt="A" />lmanac
      </h3>

      <!-- Golem fork: the script VAULT — save/share/fork by link. The three
           official scripts are UNOWNABLE bases (no edit key exists), so every
           save of one forks into the saver's own copy. -->
      <h3>Saved scripts</h3>
      <ul class="scripts" v-if="recents.length">
        <li v-for="entry in recents" :key="entry.id" @click="loadFromVault(entry.id)">
          {{ entry.name }}
          <small>({{ entry.editKey ? "yours" : entry.role }})</small>
        </li>
      </ul>
      <div class="button-group">
        <div class="button" @click="promptVaultLoad">
          <font-awesome-icon icon="link" /> Load by link
        </div>
        <div class="button" @click="saveToVault">
          <font-awesome-icon icon="file-upload" /> Save current script
        </div>
        <div class="button" v-if="recents.length" @click="copyLinks">
          <font-awesome-icon icon="clipboard" /> Export my links
        </div>
      </div>

      <!-- Golem fork (FT-851): the custom-role library — author a role once,
           save it to the library, and drop it into the current script as a
           full snapshot (the script carries the whole role). Fork-on-edit
           like scripts: saving someone else's role forks your own copy. -->
      <h3>Custom roles</h3>
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
      <div class="role-library" v-else>
        <ul class="scripts" v-if="editionCustomRoles.length">
          <li
            v-for="role in editionCustomRoles"
            :key="role.id"
            @click="openRoleForm(role)"
          >
            {{ role.name }}
            <small>(in this script — edit)</small>
          </li>
        </ul>
        <div class="row role-search">
          <input
            v-model="roleQuery"
            placeholder="Search the role library…"
            @keyup.enter="searchRoles"
          />
          <select v-model="roleTypeFilter" @change="searchRoles">
            <option value="">any type</option>
            <option value="townsfolk">Townsfolk</option>
            <option value="outsider">Outsider</option>
            <option value="minion">Minion</option>
            <option value="demon">Demon</option>
            <option value="traveller">Traveller</option>
          </select>
        </div>
        <ul class="scripts" v-if="roleShelfFiltered.length || roleResults.length">
          <li
            v-for="entry in roleShelfFiltered"
            :key="'shelf-' + entry.id"
            @click="addLibraryRole(entry.id)"
          >
            {{ entry.name }}
            <small>({{ entry.editKey ? "yours" : entry.role }})</small>
          </li>
          <li
            v-for="row in roleResults"
            :key="'browse-' + row.id"
            @click="addLibraryRole(row.id)"
          >
            {{ row.name }}
            <small
              >({{ row.roleType
              }}{{ row.authorName ? " by " + row.authorName : "" }})</small
            >
          </li>
        </ul>
        <div class="role-error" v-if="roleError">{{ roleError }}</div>
        <div class="button-group">
          <div class="button" @click="openRoleForm()">
            <font-awesome-icon icon="plus-circle" /> New role
          </div>
          <div class="button" @click="searchRoles">
            <font-awesome-icon icon="search-plus" /> Browse library
          </div>
        </div>
      </div>

      <input
        type="file"
        ref="upload"
        accept="application/json"
        @change="handleUpload"
      />
      <div class="button-group">
        <div class="button" @click="openUpload">
          <font-awesome-icon icon="file-upload" /> Upload JSON
        </div>
        <div class="button" @click="promptURL">
          <font-awesome-icon icon="link" /> Enter URL
        </div>
        <div class="button" @click="isCustom = false">
          <font-awesome-icon icon="undo" /> Back
        </div>
      </div>
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

export default {
  components: {
    Modal
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
        const rows = await roleLib.browseRoles({
          q: this.roleQuery.trim(),
          type: this.roleTypeFilter,
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
      this.isCustom = false;
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
</style>
