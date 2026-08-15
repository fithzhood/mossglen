# BACKLOG.md

Candidate directions. Never empty — if this drops below five items, the next
arbiter session opens a new axis of evaluation and refills it.

Each item states which pillars it connects. Anything touching fewer than two is
not eligible; reshape it until it does, or drop it.

Scores are the arbiter's expected value, 1–5.

---

## Binding on v004 — not optional, not scored

**The grind rule must be repaired before anything else ships.** The arbiter
cleared the narrowed definition once, spent the clearance, and ruled:

> v004 that reports `worstAbsoluteRepetition` at or above 55, or that still
> computes `grindViolations` under the conjunct alone, is a rejection on the
> grind veto with no further argument entertained.

Two things are required, and the second is a game change, not a metrics change:

1. `grindViolations` must apply the raw count as a **co-equal** criterion
   alongside the share, not merely report it. Reporting a number you have
   defined out of the test is not restoring it.
2. `worstAbsoluteRepetition` must come **down** from 55
   (`gather:berrybush`, seed 888001, `built:steppingstones`, 279-action
   window). It did not move during the v003 regeneration, and the arbiter
   noticed.

The arbiter also named the number to chase first, which no rule currently
tests at all: **`talk:marla` 65 times inside one project window.** Sixty-five
conversations in seven in-game days is the repetition a player actually feels.

---

## Ranked

### 1. The game is over on day 16 *(5/5 — arbiter, v003)*
**Pillars: village growth + gathering + villagers.**

Stage is terminal on in-game day 2–3. All six projects finish by day 17 — v002
reached day 38, so this got *worse*. The board then has nothing left to
display for 284 days, and the silence now shows up as a number:
`meanCarriedAtEnd` went 58 → **691.8** inside a single version, with
`carriedEvery10Days` climbing to 554–828 and **no plateau in any seed**, and
moss falling out of the healthy band to `utilisationPct: 79.4`.

The green absorbs material but produces no milestone, no board entry and no
line after `planted:100`. Give the back half of the game named, growing goals
on the board — a meadow, an orchard, a lantern route — with a threshold every
few hundred plantings that changes the clearing visibly and gets a villager
line. Target: a new named milestone every 20 in-game days out to day 200, and
`carriedEvery10Days` that plateaus.

### 2. Itemize where the bloom goes *(4/5 — arbiter, v003)*
**Pillars: village growth + gathering.**

Roughly **18,800 bloom is earned per seed and 0–18 is held at the end**, while
the only itemized sinks in the file are six projects and a
`finalStageBloomCost: 140`. `bloomHasNoSinkAfterFinalStage: false` asserts a
sink exists but never names it.

This is the same shape of unnamed channel as v002's 26% item leak — which is
exactly the shape that hid a hard-veto loss bug for two whole versions. An
unitemized flow is where defects live. Report bloom inflow and outflow by
source the way items already are.

### 3. Marla is the villager nobody hears *(4/5 — arbiter, v003)*
**Pillars: villagers + decorating.**

Marla gets 2 lines of 14 in the sample against Pim's 8, and she is also the
villager most often unheard in the data: `marla.stage.2`, `marla.hint.hollow`
and `marla.room.water` are each missed by 4 of 5 seeds.

Underneath it, **per-playthrough dialogue reach is falling and accelerating**:
98.18 (v002) → 96.86 → **94.98**, worst seed 91.2%, and the newest lines land
in the least-reachable slots. The union across seeds is still complete, so no
veto fires — but every individual playthrough is seeing less of the writing
than the one before, which is the trend that matters.

Two fixes, both cheap: hold stage reactions in a queue that survives the next
stage change (stages 2 and 3 both complete on day 1, so those lines are
superseded before anyone is spoken to), and make villager encounter rates even
rather than a function of who happens to stand nearest the player's start.

### 4. Recolour the door mat *(3/5 — arbiter, v003)*
**Pillars: decorating + villagers.**

The one visual fault still standing after three versions. It is lavender in a
cream-and-brown room, it is the only off-palette object left in the build, it
sits on the wall/floor seam, and it is clipped by the right edge of the panel.
It inherited the old rug's colours when it replaced it. Put it in the existing
green/brown/cream ramp and move it clear of the seam.

### 5. Prove a late session is pleasant, not just the tutorial *(3/5 — arbiter, v003)*
**Pillars: session feel — measurement, so pair it with a real change.**

For the third consecutive version every three-minute sample is taken at
`inGameDaysElapsed: 0.75` and every quoted line is a first meeting. The
artifacts only ever prove the tutorial is pleasant. Sample a cold three-minute
session at day 30 and day 100 as well. Seed 888001 also still reports
`decorated: false`.

### 6. Villagers who notice each other *(—)*
**Pillars: villagers + decorating.**

Pim, Marla and Bodkin still never refer to one another.

### 7. The three areas are one area with different props *(—)*
**Pillars: gathering + village growth.**

Clearing, pond path and hollow share a ground routine with a tint swap.

### 8. Weather *(—)*
**Pillars: gathering + villagers.**

Rain that changes what the spots yield and gives every villager something new
and specific to say.

### 9. Nothing to do at night but the same things *(—)*
**Pillars: gathering + villagers.**

Night changes the palette and the idle lines, and that is all.

---

## Held for later

- **Sound.** Still no audio at all.
- **Bodkin's portrait** is legible now but still the world-sprite design — a
  lilac blob for a mouth and a stray beige column across the jaw.
- **Canvas scale wastes width on short, wide viewports.** 90% on a 390 × 844
  phone, ~57% on a 678 × 730 window. Deliberate — see DECISIONS.md.
- **Save migration.** `SAVE_V` is still 1. v003 added `bloomEver`, `built`,
  `plantings` and `wishDay`; the loader tolerates all of them being absent and
  back-fills `bloomEver` from the recorded stage. The first change that
  genuinely invalidates a save will need a real migration.
