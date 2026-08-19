# Design source material (not bundled)

Nothing here ships — webpack only bundles what `src/` imports. This folder is
the source-of-truth art the runtime assets are cut from.

## clocktower/
The background art, in variants (creative director, 2026-08-16):

- `clocktower.png` — the live background (hands + numerals), cut down to
  `src/assets/background-clocktower.png`, which the FT-anon 2026-08-19
  recentre trims further into the actually-shipped
  `src/assets/background-clocktower-centered.png` (dial's centre moved to the
  image's own centre — 30px off the left, 41px off the bottom). The
  untrimmed `background-clocktower.png` stays in `src/assets/` unshipped by
  any current reference, kept per the never-delete rule.
- `clocktower-blank.png` — SAME scene, no hands, no numerals. Same story:
  shipped as `src/assets/background-clocktower-blank-centered.png` now. The
  base for the live clock-hands layer idea: render hands (and player-count
  numerals) as DOM on top, use them for voting.
- `clocktower-blank-blood.png` / `-blood2.png` — the blank face with blood
  treatments; candidate backgrounds for dramatic moments (executions, demon
  win) or as an alternate skin.

## blood/
- `blood-pack.jpg` — 16 blood splatters. JPG with a baked checkerboard, NOT
  transparent — the source `cut/` was extracted from.
- `cut/blood-01..16.png` — the splatters as true-alpha PNGs, ready for decal
  use (seat death marks, vote stamps, panel dressing). Recipe: alpha keyed off
  min(G,B) against the neutral checker (soft ramp 120→~195), edge colors
  un-mixed against the mid checker gray, connected-component grouping so each
  splat keeps its own satellite droplets (a plain grid cut bled neighbors'
  spray across cell lines).
- `cut-contact-sheet.png` — all 16 over a dark ground, for eyeballing edges.
