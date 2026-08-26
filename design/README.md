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
- `blood-pack2.jpg` / `blood-pack3.jpg` — two more packs of 16 the creative
  director added 2026-08-25 (`D:/Projects/Golem/botc/splatter2.jpg` and
  `splatter3.jpg`). Same 1168x784 sheet, same light neutral ground — so the
  SAME recipe cut them, unchanged: the calibrator found the ground at 208-255
  and keyed alpha off min(G,B) exactly as it did for pack 1. Cut into
  `cut2/blood-01..16.png` and `cut3/blood-01..16.png`, with their own contact
  sheets (`cut2-contact-sheet.png`, `cut3-contact-sheet.png`).

  The cut script writes its sheet to `OUT/../cut-contact-sheet.png`, so
  running it for a second pack OVERWRITES the first pack's sheet. Pack 1's was
  restored from git and the new runs were pointed at their own filenames —
  worth knowing before anyone runs it a fourth time.

  48 splatters total now. Pack 1 is the one in use (`src/assets/blood/`);
  2 and 3 are cut and waiting, not yet imported by anything.
