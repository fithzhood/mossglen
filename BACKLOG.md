# BACKLOG.md

Candidate directions. Never empty — if this drops below five items, the next
arbiter session opens a new axis of evaluation and refills it.

Each item states which pillars it connects. Anything touching fewer than two
is not eligible to be picked, and should be reshaped or dropped.

Scores are the arbiter's expected value, 1–5.

---

## Ranked

### 1. Village projects that keep consuming what you gather *(5/5 — arbiter, v001)*
**Pillars: gathering + decorating + village growth (+ villagers when one proposes a project).**

Village-scale builds that unlock *after* the final stage and can be
commissioned repeatedly: a bridge, a bench, a lantern path — each costing
hundreds of moss / acorn / pebble plus bloom, each placing a visible object on
the shared village map.

Targets to hit: `bloomOverspillFactor` under 5 (currently **277.8**) and
`itemsLeftUnusedAtEnd` under 400 (currently **3,958.6**) across a 300-day run.

> This is the item that stops the game dying at minute twelve. The arbiter's
> single most important weakness for v001 is that the whole content arc —
> all ten items, all three areas, all three villagers, `home:full` and
> `stage:4` — completes on in-game days 1–3 of a 300-day simulation, after
> which gathering feeds nothing. Glass bead, the rarest and best-drawn find in
> the game, runs 769 inflow against 25 outflow.

### 2. Stretch the unlock arc from 3 in-game days to about 30 *(5/5 — arbiter, v001)*
**Pillars: gathering + village growth.**

Every seed reaches `stage:4` on day 2 or 3 and `home:full` on day 1. Gate the
later areas and the later items (reed, feather, glass bead) behind stages that
need small contributions across several days rather than one burst, so
`dayReached` still shows first-time milestones on days 4 through 30.

Do this by **spreading gates over time, not by raising costs**:
`gather:hollowtree` already sits at 13 required repetitions against a grind
threshold of 15. Raising prices would trip the veto.

### 3. Decorating should show what is being decorated *(4/5 — arbiter, v001)*
**Pillars: decorating + villagers.**

In `reports/001/5-decorating.png` the sheet titled "On the corner" covers the
entire floor it is decorating, so the player picks blind — no view of the
target spot, what is already there, or a preview. Replace the full-height grid
with a single pinned scrollable row, highlight the target spot in the room
above it, and ghost the selected item into place before confirming.

Pair it with reaction lines keyed to specific placed items: the v001 sample
contains exactly one such line, and the game's only dead dialogue node,
`marla.home.feather`, is precisely this kind of line.

### 4. Redraw the home interior *(4/5 — arbiter, v001)*
**Pillars: decorating + villagers.**

Three named defects in `reports/001/4-home-interior.png`:
- The rug is a flat lavender slab **with a dashed white placement rectangle
  rendered inside it during normal play** — it reads unmistakably as a debug
  drop-target, and it is the only untextured, un-outlined, off-palette object
  in the build.
- The door carries the word **"out" in large white sans-serif baked onto its
  texture**. Replace with a mat or a step.
- **Four projections in one room**: shelves and window in elevation, bed and
  rug top-down, table in side view with a moss ball resting on it as if seen
  from above. Commit the room to one projection.

### 5. Give Bodkin a real line pool *(3/5 — arbiter, v001)*
**Pillars: villagers + gathering.**

"I dig at night as well. It's the same dark, so it's no extra trouble." fires
on days 17, 23 and 27 — three of Bodkin's four appearances in a fourteen-line
sample are the same sentence, while Marla's six lines are all distinct. Write
him 8–10 more day and night lines and key several to what is in the bag, so
his repeat rate over a 300-day run falls to Marla's.

His conversation portrait in `3-conversation.png` is also the weakest sprite in
the game: an upscaled world sprite with a pink smear where the face should be
and no readable eyes at portrait size.

### 6. `marla.home.feather` is dead content *(—)*
**Pillars: villagers + decorating.**

One dialogue node no seed ever reached. The arbiter recorded this explicitly so
it cannot be smuggled through later as pre-existing: **if it survives into
v002 it is standing dead content and should be treated as a veto then.**

### 7. Villagers who notice each other, not only you *(—)*
**Pillars: villagers + decorating.**

Pim, Marla and Bodkin never refer to one another. Three people in a clearing
with no opinions about each other read as three vending machines.

### 8. The three areas look like one area with different props *(—)*
**Pillars: gathering + village growth.**

Clearing, pond path and hollow share a ground routine with a tint swap. New
places should feel like arriving somewhere, which is the reward the whole
growth loop is paying out.

### 9. Weather *(—)*
**Pillars: gathering + villagers.**

Rain that changes what the spots yield and gives every villager something new
and specific to say — a lot of variety for a small amount of machinery.

### 10. Nothing to do at night but the same things *(—)*
**Pillars: gathering + villagers.**

Night changes the palette and the idle lines, and that is all.

---

## Held for later

- **Sound.** No audio at all yet. Cozy games lean on it heavily; it is also the
  axis most likely to be judged harshly the first time it appears.
- **The bag has no memory.** Nothing is lost, which is correct and must stay
  correct, but the hundredth moss is not a find. Something that makes a
  *particular* moss worth keeping — where it was found, what day, who mentioned
  it — would give the bag a memory instead of a tally. Overlaps heavily with
  item 1; do that first and re-measure.
- **Canvas scale wastes width on short, wide viewports.** 90% of the width on a
  390 × 844 phone, about 57% on a 678 × 730 window. Left alone deliberately —
  see DECISIONS.md. Revisit only if density is scored down.
- **Save-slot migration.** `SAVE_V` is 1 and nothing has needed migrating. The
  loader discards a save of another shape rather than throwing, so this is not
  urgent, but the first content change that invalidates a save will need it.
