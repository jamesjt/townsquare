<template>
  <!--
    Golem fork (FT-1340): THE SEATLESS VIEWER'S QUIET BANNER — a client that
    is in a live town but holds no chair gets one unobtrusive line: claim a
    seat, or watch. Two viewers earn it:

      · the visitor who never sat — quiet, dismissible ("Spectate" below);
      · the LOST SEAT — someone who WAS seated this session and became
        seatless under their own open tab (kicked, shuffled out, removed).
        For them the banner returns even past an earlier dismissal, because
        the state changed out from under them (see the `seated` watcher).

    "Spectate" is NOT a mode. It only puts this banner away — nothing else
    changes, and the one-tap claim overlay on every open chair (Player.vue's
    `canOneTapClaim`) keeps working exactly as before, so a dismisser can
    still sit down whenever they like. The memory is session-local
    (sessionStorage, keyed to THIS town) — never a synced or persisted pref.

    THE GATE MATCHES THE AFFORDANCE IT POINTS AT: `session.sessionId &&
    session.isSpectator` is `canOneTapClaim`'s own live-town test, so the
    banner can never stand in a town where tapping a chair would not work.
    The storyteller is `isSpectator === false` and never sees it. The
    roster-synced guard (`players.length`) keeps it from flashing in the
    beat between joining and the first gamestate.

    THE LOOK IS flashHint's (golem/hint.js) — the fork's quiet-notice
    register: dark plate, blood border, bottom-centre — made persistent and
    given its two affordances. z-index 90: over the ring, UNDER every modal
    (Modal.vue holds 100) and the whisper toasts (120).
  -->
  <transition name="slb">
    <div class="seatless-banner" role="status" v-if="showing">
      <span class="slb-msg">
        You're not in a seat — claim one, or watch.
        <span class="slb-hint">Tap any open chair to sit there.</span>
      </span>
      <button type="button" class="slb-spectate" @click="dismiss">
        Spectate
      </button>
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";

/**
 * The dismissal note's sessionStorage key. The VALUE is the town it was
 * dismissed in — a dismissal in one town says nothing about the next.
 * sessionStorage on purpose (per-tab, gone when the tab goes): the user's
 * rule is session-local memory, not a synced preference.
 */
const DISMISS_KEY = "golem.seatlessSpectate";

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) || "";
  } catch (e) {
    return "";
  }
};

export default {
  data() {
    return {
      // The town this tab pressed "Spectate" in ("" = none). Mirrored from
      // sessionStorage so `showing` stays reactive; storage is the memory,
      // this is the live copy.
      dismissedIn: readDismissed(),
    };
  },
  computed: {
    ...mapState(["session"]),
    ...mapState("players", ["players"]),
    /**
     * Does this client hold a chair? Asked of the ROSTER, not of
     * `session.claimedSeat` — the claimed-seat note goes stale exactly in
     * the cases this banner exists for (a kick empties the roster id but
     * commits nothing to session; a host-side remove shifts every index).
     * Same derivation as Player.vue's `isSeatedElsewhere`.
     */
    seated() {
      const me = this.session.playerId;
      return !!me && this.players.some((p) => p.id === me);
    },
    showing() {
      return (
        !!this.session.sessionId &&
        this.session.isSpectator &&
        this.players.length > 0 &&
        !this.seated &&
        this.dismissedIn !== this.session.sessionId
      );
    },
  },
  watch: {
    /**
     * THE LOST-SEAT RETURN. Seated → seatless while still in the town means
     * the chair went away under the viewer, and a banner they put away for
     * "I'm just watching" is standing news again — the dismissal is
     * re-armed.
     *
     * `claimedSeat >= 0` is what separates TAKEN from GIVEN UP: standing up
     * by hand commits `session/claimSeat -1` first (TownSquare.claimSeat)
     * and the roster empties after, so at this transition a voluntary
     * vacater already reads -1 — their earlier dismissal is respected. A
     * kicked / swept / removed player's note still points at the chair they
     * believed they held (nothing on those paths commits it away), which is
     * precisely "the state changed out from under them".
     */
    seated(now, was) {
      if (
        was &&
        !now &&
        this.session.sessionId &&
        this.session.claimedSeat >= 0
      ) {
        this.dismissedIn = "";
        try {
          sessionStorage.removeItem(DISMISS_KEY);
        } catch (e) {
          // storage refused (private mode etc.) — the live copy did the job
        }
      }
    },
  },
  methods: {
    /** Put the banner away for THIS town, this tab. Nothing else. */
    dismiss() {
      this.dismissedIn = this.session.sessionId;
      try {
        sessionStorage.setItem(DISMISS_KEY, this.dismissedIn);
      } catch (e) {
        // storage refused — the live copy still dismisses for this mount
      }
    },
  },
};
</script>

<style scoped lang="scss">
// flashHint's plate (golem/hint.js), persistent: dark ground, blood border,
// bottom-centre, small type. Interactive, so pointer-events stay on.
.seatless-banner {
  position: fixed;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90; // over the ring, under modals (100) and toasts (120)
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: min(92vw, 560px);
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.85);
  border: 2px solid #400;
  border-radius: 8px;
  box-shadow: 0 0 8px black;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
}

.slb-msg {
  text-align: left;
}

.slb-hint {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.slb-spectate {
  flex: 0 0 auto;
  padding: 5px 14px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: #fff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.08);
  }
}

// gentle arrival/departure — a notice, not an event
.slb-enter-active,
.slb-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}
.slb-enter,
.slb-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
