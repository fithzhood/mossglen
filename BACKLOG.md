# BACKLOG.md

Candidate directions. Never empty. Each item names the pillars it connects;
anything touching fewer than two is not eligible until reshaped.

Scores are the arbiter's expected value, 1-5.

---

## Binding on v006 — not optional, not scored

From `reports/005/scorecard.md`:

1. **Add `mostRepeatedActionPerInGameDay`.** Asked for in v004's scorecard,
   skipped in v005 "in the version with room for it". It is the cheapest of the
   three gates and it is the one that stops the repetition figure scaling with
   the length of the arc.
2. **Restore a grind rule that can actually fail.** v004 restored the plain
   reading of RUBRIC.md; v004 was reverted, so v005 silently inherited v003's
   conjunct rule again. `grindViolations: []` is now *structurally impossible*
   to trip — it needs a share above 0.50 and the file maximum is 0.38. A veto
   that cannot fire is not a veto.
3. The `shareOfWindow <= 0.20` gate was **voided** by the arbiter itself, which
   found it inversely correlated with the defect: the 0.38 breach is three
   mushroom donations in an eight-action window, while the genuinely worst
   window in the file — 55 berry-picks — scores 0.20 and passes. Do not
   reinstate it.

---

## Ranked

### 1. Queue villager reactions instead of firing them *(5/5 - arbiter, v005)*
**Pillars: villagers + decorating + village growth.**

The arbiter's single most important weakness, and it says this one item closes
A, B and D at once.

**The decorating -> villager arrow is written but never fires.** Zero of 14
sample lines across in-game days 1-38 name anything the player gathered, placed
or built. The `*.room.*` and `*.home.*` families are precisely the lines missed
by 3-4 of 5 seeds. `marla.stage.2` has been superseded before delivery for
**five straight versions** because stages 2 and 3 both complete on day 1 and the
reaction is overwritten before the player next speaks to anyone.

The fix is structural, not more writing: hold reactions in a per-villager queue
that survives the event that caused them, and deliver them on the next
conversation instead of discarding them. A villager who says "I saw what you did
with the shelf" three days late is still reacting; a villager whose reaction was
overwritten before you spoke to them never reacted at all.

### 2. Bodkin still has no mouth, fifth version *(4/5 - arbiter, v005)*
**Pillars: villagers + decorating.**

`1-village-morning.png` now proves it is an outlier rather than a style: the
other two villagers each carry a mouth mark and Bodkin has a featureless pink
blob. A mouth was added to the portrait in v005 and the arbiter still reads it
as absent, so the fix did not land visually — check the rendered PNG rather than
the ASCII, and check the world sprite as well as the portrait.

Also still open: the mat's right edge is clipped by the panel, and the picker
sheet still overlaps the stool by about 22px (down from 100).

### 3. The back half of the game is empty again *(5/5 - carried, unresolved)*
**Pillars: village growth + gathering + villagers.**

v004 fixed this with named groves, was rejected on other axes, and was reverted
whole - so the problem is exactly as it was. The arc is 16 in-game days of 300.

**If it is re-attempted, each milestone must place something and cost
something.** v004's twenty milestones left `plantings`, `meanCarriedAtEnd` and
`utilisationPct.moss` identical to v003 *to the decimal*. The arbiter's phrase
for that is worth keeping: **structure without content**. The grove data and
prose are recoverable from git history at the v004 attempt if wanted.

Five economy numbers have now been frozen for three consecutive versions.

### 4. Marla is disappearing *(3/5 - arbiter, v005)*
**Pillars: villagers.**

Down to 1 line of 14 in the sample. She is also the villager whose lines are
most often unheard. Whatever decides who the player runs into is weighted
against her.

### 5. Prove a late session is pleasant *(4/5 - arbiter, raised three times)*
**Pillars: session feel - measurement, so pair it with a real change.**

Fifth consecutive version where every `threeMinuteSessions` entry reads
`inGameDaysElapsed: 0.75` and every quoted line is a first meeting. The
artifacts only ever prove the tutorial is pleasant. Sample a cold three-minute
session at day 30 and day 100.

### 6. Villagers who notice each other *(-)*
**Pillars: villagers + decorating.**

Pim, Marla and Bodkin still never refer to one another.

### 7. The three areas are one area with a tint swap *(-)*
**Pillars: gathering + village growth.**

### 8. Weather *(-)*
**Pillars: gathering + villagers.**

### 9. Nothing to do at night but the same things *(-)*
**Pillars: gathering + villagers.**

---

## Held for later

- **Sound.** Still none.
- **Rare finds have nowhere to go.** Glass bead and feather are the best-drawn
  items and among the least used. Overlaps with item 3.
- **Canvas scale wastes width on short, wide viewports.** Deliberate; see
  DECISIONS.md.
- **Save migration.** `SAVE_V` is still 1 and the loader tolerates every field
  added so far.
