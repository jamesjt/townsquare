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
      <h3>Load custom script / characters</h3>
      To play with a custom script, you need to select the characters you want
      to play with in the official
      <a href="https://script.bloodontheclocktower.com/" target="_blank"
        >Script Tool</a
      >
      and then upload the generated "custom-list.json" either directly here or
      provide a URL to such a hosted JSON file.<br />
      <br />
      To play with custom characters, please read
      <a
        href="https://github.com/bra1n/townsquare#custom-characters"
        target="_blank"
        >the documentation</a
      >
      on how to write a custom character definition file.
      <b>Only load custom JSON files from sources that you trust!</b>

      <!-- Golem fork: the script VAULT — save/share/fork by link. -->
      <h3>Script vault</h3>
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

      <h3>Some popular custom scripts:</h3>
      <ul class="scripts">
        <li
          v-for="(script, index) in scripts"
          :key="index"
          @click="handleURL(script[1])"
        >
          {{ script[0] }}
        </li>
      </ul>
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
        <div class="button" @click="readFromClipboard">
          <font-awesome-icon icon="clipboard" /> Use JSON from Clipboard
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
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import * as vault from "../../golem/scripts";

export default {
  components: {
    Modal
  },
  data: function() {
    return {
      editions: editionJSON,
      isCustom: false,
      // Golem fork: the vault shelf + which vault script is currently loaded
      // (the fork/update decision key on save).
      recents: vault.getRecents(),
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
  computed: mapState(["modals"]),
  // Golem fork: a ?script=<id> share link auto-loads its script on arrival.
  // The QUERY string is used (not the hash) because the hash is the live
  // session's join token upstream — the two must coexist on one URL.
  created() {
    const id = new URLSearchParams(window.location.search).get("script");
    if (id) this.loadFromVault(id);
  },
  methods: {
    // ── Golem fork: the script vault ─────────────────────────────────────
    async loadFromVault(id) {
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
      } catch (e) {
        alert("Could not load that script: " + e.message);
      }
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
</style>
