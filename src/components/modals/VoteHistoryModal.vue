<template>
  <!-- Golem fork (FT-858): the vote history is a DRAWER now (VoteDrawer) —
       this overlay stays mounted and keeps working, and renders the very
       same body (VoteHistoryView), so the two surfaces can never drift.
       Nothing routes here by default. -->
  <Modal
    class="vote-history"
    v-if="modals.voteHistory && (session.voteHistory || !session.isSpectator)"
    @close="toggleModal('voteHistory')"
  >
    <h3>Vote history</h3>
    <VoteHistoryView />
  </Modal>
</template>

<script>
import Modal from "./Modal";
import VoteHistoryView from "../VoteHistoryView";
import { mapMutations, mapState } from "vuex";

export default {
  components: {
    Modal,
    VoteHistoryView
  },
  computed: {
    ...mapState(["session", "modals"])
  },
  methods: {
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style lang="scss" scoped>
h3 {
  margin: 0 40px 10px 10px;
  svg {
    vertical-align: middle;
  }
}
</style>
