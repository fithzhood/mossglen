# BACKLOG.md

Candidate directions. Never empty — if this drops below five items, the next
arbiter session opens a new axis of evaluation and refills it.

Each item states which pillars it connects. Anything touching fewer than two is
not eligible to be picked, and should be reshaped or dropped.

Scores are the arbiter's expected value, 1–5.

---

## Ranked

### 1. Repaint the home interior *(4/5 — arbiter, raised twice: v001 and v002)*
**Pillars: decorating + villagers.**

**This has now been raised in two consecutive scorecards and is the cheapest
item on the list. Visual charm is the only axis that has not moved in two
versions, and it has not moved because nothing named here was touched.**

In `reports/002/4-home-interior.png`, during ordinary play:
- The rug has a **dashed white placement rectangle rendered permanently inside
  it** — it reads unmistakably as a debug drop-target. Make it a selection or
  hover state, not a decal.
- The rug is **the only flat, untextured, off-palette object in the build**.
  Give it a woven texture inside the existing green/brown/cream ramp.
- The door carries **"out" in white sans-serif baked onto it**. Replace with a
  mat or a step.
- **Four projections in one room**: window, picture and shelves in elevation;
  bed and rug top-down; table in side view carrying a top-down moss ball; a
  door standing up in elevation out of a top-down floor. Commit to one.

Also: Bodkin's conversation portrait in `3-conversation.png` is still an
upscaled world sprite with a pink smear across the lower face and no readable
eyes at portrait size. A villager needs a portrait drawn at portrait size.

### 2. A growing display for rare finds *(5/5 — arbiter, v002)*
**Pillars: gathering + decorating + villagers (+ growth at village scale).**

Glass bead is found 740–798 times per seed and used 32–59. Feather is found
518–578 and used 66–127. Both are the best-drawn items in the game, and the
glass bead is already sitting on a shelf in `4-home-interior.png` — the art has
already decided they are display objects.

Add a case or mantel that accepts rare finds in quantity, gains a new tier each
time it fills, and gives each villager a line keyed to what is currently on
show.

Target: glassbead and feather outflow above 40% of inflow. `utilisationPct` and
`resourcesUnderUsed` are now in `metrics.json` to measure exactly this —
`resourcesWithNoSink: []` was passing a 96% waste rate as healthy.

### 3. Make the last 260 days acknowledge themselves *(5/5 — arbiter, v002)*
**Pillars: villagers + village growth + gathering.**

Every seed performs ~1,600 plantings. The last recorded milestone is
`planted:100` on days 30–40. The ~1,500 that follow register nowhere — no
milestone, no board entry, no line.

Put planting on the board as a named, growing goal — a meadow, an orchard, a
lantern route along the pond path — with a threshold every few hundred that
adds a visible change beyond the current flower density and triggers a villager
line.

Target: at least one new named milestone every 20 in-game days out to day 200.

### 4. Let the decorating sheet show what is being decorated *(4/5 — arbiter, raised twice)*
**Pillars: decorating + villagers.**

`5-decorating.png` is titled "On the rug" while the rug sits entirely beneath
the sheet, so the player picks blind — the identical failure v001 recorded as
"On the corner". Naming the target while hiding it is, if anything, more
conspicuous than v001 was.

Replace the full-height grid with a single pinned scrollable row, keep the
target spot visible and highlighted in the room above, and ghost the selected
item into place before confirming.

This matters more than it looks: `home:full` lands on in-game day 1 in three of
five seeds and the finished interior holds about five placed objects, so the
one screen where decorating happens is seen once and never rewards returning.

### 5. Queue stage reactions, and split the repeat lines *(3/5 — arbiter, v002)*
**Pillars: villagers + village growth.**

`marla.stage.2` is never seen in 4 of 5 seeds and `bodkin.stage.2` in 3 of 5,
because stages 2 and 3 both complete on in-game day 1 and the reaction is
superseded before the player next talks to anyone. Hold stage reactions in a
queue that survives a stage change.

In the same pass, break the duplicates: Bodkin's "Ohh, it's got the spots and
everything" fires on days 36 and 38 — two consecutive appearances — and
Marla's "It's lighter than it looks" on days 11 and 31. Both are `thanks`
lines, which recur because wishes cycle; they need variants. The sample's
unique-line rate is 12 of 14, exactly what it was in v001: the repetition was
redistributed between characters, not reduced.

### 6. Decorating saturates on day 1 *(—)*
**Pillars: decorating + gathering.**

Six slots, filled on the first day in three of five seeds, and never a reason
to return. Decorating is the pillar whose job is to absorb what gathering
produces, and it is exactly as short as it was in v001. Overlaps with items 2
and 4 — do those first and re-measure before designing more slots.

### 7. Villagers who notice each other, not only you *(—)*
**Pillars: villagers + decorating.**

Pim, Marla and Bodkin never refer to one another. Three people in a clearing
with no opinions about each other read as three vending machines.

### 8. The three areas look like one area with different props *(—)*
**Pillars: gathering + village growth.**

Clearing, pond path and hollow share a ground routine with a tint swap.

### 9. Weather *(—)*
**Pillars: gathering + villagers.**

Rain that changes what the spots yield and gives every villager something new
and specific to say.

### 10. Nothing to do at night but the same things *(—)*
**Pillars: gathering + villagers.**

Night changes the palette and the idle lines, and that is all.

---

## Held for later

- **Sound.** No audio at all yet.
- **One three-minute session sample ended without decorating** (seed 888001).
  Minor, but the session-shape probe only samples from day 1, which is not
  where the doubt is — sample a cold session at day 30 and day 100 too.
- **Canvas scale wastes width on short, wide viewports.** 90% of the width on a
  390 × 844 phone, about 57% on a 678 × 730 window. Deliberate — see
  DECISIONS.md. Revisit only if density is scored down.
- **Save-slot migration.** `SAVE_V` is still 1. The v002 save added `built` and
  `plantings`; the loader tolerates their absence. The first change that
  genuinely invalidates a save will need a real migration.
