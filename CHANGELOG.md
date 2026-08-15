# CHANGELOG.md

Append-only. One entry per accepted version.

---

## v001 — 2026-08-16

**The clearing, the well, and three neighbours.**

The first playable Mossglen. All four pillars are present and wired to each
other, thinly on purpose: the point of a first version is that the circle
closes, not that any one arc of it is long.

- **Gathering** — three spots in the clearing, four more in the two places
  that open later. Ten things to find, weighted so that a glass bead is a
  genuine surprise. Every spot regrows after two in-game hours; nothing can
  be used up.
- **Decorating** — six places in your house to put things down: the
  windowsill, two shelves, the table, the floor by the bed, and the rug.
  Taking something back returns it to the bag exactly.
- **Villagers** — Pim, Marla and Bodkin. They react to the village changing,
  to what is sitting in your house, to what you are carrying, and to the time
  of day, in that order. Each of them is hoping someone brings them a
  particular thing, and the hoping cycles round forever.
- **Village growth** — the old well takes anything and turns it into bloom.
  Bloom opens the pond path, then lights the hollow. Growth also moves the
  villagers: once the well holds water Marla spends her afternoons at the
  pond, and once the lantern is lit Bodkin is in the hollow before dawn.

Time runs at six in-game minutes per real second — a day is four real
minutes — and only while you are playing.

Sprites: 23 hand-authored pixel-art PNGs on one shared 30-colour palette.

Tooling built alongside it: a headless simulation that plays 300 in-game days
across five seeds, a fixed-scene screenshot capture at a phone viewport, and a
regression suite of 6,118 checks that asserts the immutable constraints from
`PILLARS.md` directly against the core and then walks the core loop in a real
browser.

Two bugs the tooling caught that play did not: going indoors resolved to the
wrong travel destination, and the core allowed gathering from a spot in
another area.

**Arbiter: 16/25** — interlock 3, systemic health 2, visual charm 3, voice 4,
session feel 4. Accepted, thinly. All seven vetoes clear. The verdict names the
economy as the thing that has to move next: the whole content arc finishes on
in-game day 3 of a 300-day run, and after that gathering feeds nothing.
