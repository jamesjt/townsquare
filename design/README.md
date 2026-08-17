# Design source material (not bundled)

Nothing here ships — webpack only bundles what `src/` imports. This folder is
the source-of-truth art the runtime assets are cut from.

## clocktower/
The background art, in variants (creative director, 2026-08-16):

- `clocktower.png` — the live background (hands + numerals), currently shipped
  as `src/assets/background-clocktower.png`.
- `clocktower-blank.png` — SAME scene, no hands, no numerals. The base for the
  live clock-hands layer idea: render hands (and player-count numerals) as DOM
  on top, use them for voting.
- `clocktower-blank-blood.png` / `-blood2.png` — the blank face with blood
  treatments; candidate backgrounds for dramatic moments (executions, demon
  win) or as an alternate skin.

## blood/
- `blood-pack.jpg` — 16 blood splatters. JPG with a baked checkerboard, NOT
  transparent: cut individual splatters to alpha PNGs before using as decals
  (seat death marks, vote stamps, panel dressing).
