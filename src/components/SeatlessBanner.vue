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

    THE LOOK, RE-DRESSED (2026-08-30, user call — "put it in the middle of
    the clock face, wearing the glass, purple border not red"): dead centre
    on the disc rather than a bottom-centre plate, and its material is now
    `face-disc-menu-plate` — the same glass the seat menu, the top-right
    menus, the sign-in panels and the hotkey guide wear (faceDisc.scss) —
    with `--fd-edge-color` repainted to `$control-edge-hover`, the app's
    standard selected-control purple (controls.scss), in place of the
    plate's own default plum hairline. `position: fixed` both centres it
    (`#vote`'s own comment: flex/inset-free positioning on `#app` puts a
    box's centre at the viewport centre, and the disc sits there too) and
    satisfies the plate mixin's "must be positioned" requirement, so no
    extra wrapper is needed.

    Z-ORDER: the disc centre is also where the vote overlay (`#vote`,
    z-index 20) and the storyteller's night ask can stand, and unlike the
    old bottom plate this one can now share their spot. The banner reads
    BELOW the vote overlay (z-index 15) on purpose — an active nomination is
    the more urgent of the two and must never be obscured by a seatless
    reminder; if a nomination opens while this banner is showing, the vote
    card simply paints over it, and the banner is exactly where it was once
    the nomination closes. Still over the ring's own furniture (z-index
    1..96) at every point other than dead centre where nothing else lives,
    and still UNDER every modal (Modal.vue holds 100) and the whisper toasts
    (120).
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
@import "../vars.scss";
@import "../controls.scss";
@import "../faceDisc.scss";

// THE GLASS (2026-08-30): `face-disc-menu-plate`, the same material the seat
// plate, the top-right menus and the hotkey guide wear — one include, no
// copy of its numbers. `$r: 460px` matches the plate's own max-width below
// (its blur is a fraction of this, so the frost tracks the box). `--fd-r`'s
// sibling token `--fd-edge-color` is repainted from the plate's default plum
// hairline to `$control-edge-hover` — the app's standard selected-control
// purple (controls.scss) — because this is a NOTICE, not the grimoire; red
// used to say "chosen"/urgent here and purple keeps that job everywhere
// else in the fork.
//
// `position: fixed` centred by inset (top/left 50% + translate(-50%,-50%))
// both puts the plate dead centre on the disc (see the template comment —
// `#vote` establishes that a flex/inset-free box on `#app` centres on the
// viewport, and a fixed box centred by transform lands the same place) AND
// satisfies `face-disc-menu-plate`'s "must be positioned" requirement, so
// the plate's absolutely-positioned tint/rim layers paint on this element
// rather than leaking onto an ancestor.
.seatless-banner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 15; // under the vote overlay's 20 (see template comment), over
  // the ring's own furniture, under modals (100) and toasts (120)
  --fd-edge-color: #{$control-edge-hover};
  @include face-disc-menu-plate($r: 460px, $radius: 10px);
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: min(92vw, 460px);
  padding: 8px 14px;
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

// gentle arrival/departure — a notice, not an event. The base transform is
// now the centring one (see .seatless-banner); the offset state adds the
// same 8px rise on top of it rather than replacing it.
.slb-enter-active,
.slb-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}
.slb-enter,
.slb-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 8px));
}
</style>
