# CHANGELOG.md

Append-only. One entry per accepted version.

---

## v003 — 2026-08-16

**The room, and one hope a day.**

The village had been getting better for two versions while the house stayed
where it was. Two consecutive scorecards named the same faults in it and
neither was touched, so this version is the one that fixes them — and, because
a repaint touches only one pillar, the villagers learned to read the room.

- **The house is drawn front-on and nothing else.** It used to mix four
  projections in one room. Everything now stands on one floor line and every
  place you can put something down sits on a surface genuinely underneath it:
  the sill, two shelves, the table, a stool, a crate. The rug is gone — a floor
  rug seen from the front is a stripe — and a woven mat at the foot of the door
  replaces both it and the word "out" that used to be painted on the door.
- **Decorating happens in the room.** The picker was a full-height sheet that
  covered the very thing it was decorating, so you chose blind. It is now a
  single pinned row, the room stays on screen, and the spot you are filling
  pulses while you choose.
- **Empty places get a small warm dot**, and only while you are carrying
  something to put down. The old dashed outline read as a debug drop-target.
- **Villagers have faces.** Three portraits drawn at portrait size, instead of
  a 16-pixel world sprite blown up to three times its width.
- **Villagers read the room as a whole** — whether your house has gone tidy,
  soft, strange, or like the pond, or simply has no surface left. Five moods,
  fifteen new lines, read off the tags the items already carried.
- **Each villager hopes for one thing a day.** The simulation was handing one
  villager 169 gifts inside a single stretch. Nothing is lost by being late —
  a wish missed for a hundred days is still waiting.

### The bug this version found

Village stage and open areas were gated on the **current** bloom balance. v001
had no way to spend bloom, so it never showed. v002 gave bloom a sink — and so
made spending it walk the village backwards: the pond path and the hollow
closing again, the stage falling from 4 to 1. That is loss, and unreachable
content, and `PILLARS.md` forbids both. **It shipped in v002.**

The arbiter found the symptom in the artifacts alone — three seeds reporting a
final stage below the stage their own pacing tables said they had reached on
day 2 — and declined to fire on an ambiguity it could not resolve from outside.
It was right to be suspicious. Bloom is now two numbers: a high-water mark that
only rises and is the only thing growth is gated on, and a purse you spend.
There is a regression check that grows the village, spends the well dry every
way the game allows, and asserts nothing closed.

**Arbiter: 20/25** (from 19) — interlock 4, systemic health 4, visual charm
3→4, voice 4, session feel 4. Accepted. Two standing rulings against v004: the
grind rule must stop computing its veto under a narrowed definition, and
`worstAbsoluteRepetition` must come down from 55 or v004 is rejected outright.

---

## v002 — 2026-08-16

**The village keeps having a next thing.**

v001's whole content arc finished on in-game day 3 of a 300-day run, after
which gathering fed nothing. v002 gives the back half of the pillar circle
somewhere to put what the front half produces.

- **The village board**, at the signpost. Six projects, each proposed by a
  particular villager, each costing a real pile of gathered material plus
  bloom, each putting a visible object in the world: a bench by the well, a bed
  of flowers by your door, a lantern on the pond path, stepping stones across
  the shallows, a second light for the hollow, and finally the village green.
  They arrive in order, so there is always exactly one next thing.
- **The village green** never closes. Five of anything goes into the ground for
  ever, and the whole village visibly thickens up as it fills in — compare
  `reports/002/1-village-morning.png` with `6-village-built.png`.
- **Villagers propose and then react.** Whoever thought of the next project
  brings it up the moment the last one is finished, which turns "gather more
  things" into "Pim would like a bench" — the same request with a reason
  attached.

What moved, measured over 300 in-game days across five seeds:

| | v001 | v002 |
|---|---|---|
| items left unused at end of run | 3,958.6 | **16** |
| bloom overspill factor | 277.8 | **2.4** |
| dialogue reached | 93.2% | **98.2%** |
| unreachable dialogue nodes | 1 | **0** |
| worst required repetition (threshold 15) | 13 | **8** |
| last first-time milestone | day 3 | **day 34+** |

The arc stretched without being padded: the worst repetition needed to reach a
gate went *down* while the arc got roughly ten times longer.

Four new sprites (bench, lantern, flowerbed, stepping stones), and a regression
check that walks every sprite named anywhere in the data and asserts it loaded
— because all four were drawn, referenced, and never registered with the
loader, and nothing but a screenshot noticed.

**Arbiter: 19/25** (from 16) — interlock 3→4, systemic health 2→4, visual charm
3, voice 4, session feel 4. Accepted, ratchet cleared. The verdict is blunt
about what did *not* move: every visual fault named in v001's scorecard is
still on screen, and visual charm held only because the two new screens are
good. That is v003's job.

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
