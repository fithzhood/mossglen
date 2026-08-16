# STATE.md

*Rewritten every cycle. This is the resume point for a session with no memory
of the last one. Written for a stranger, because that is what you are.*

---

## Where things stand

**Current version: v005, accepted at 20/25. Tagged, pushed, live. Working tree
clean, nothing in progress.** The next cycle starts at Phase 1.

`20/25` is the ratchet floor and v005 tied it exactly, with zero margin. v006
must total **21 or more**.

| axis | v001 | v002 | v003 | v004 (rejected) | v005 |
|---|---|---|---|---|---|
| A interlock | 3 | 4 | 4 | 4 | 4 |
| B systemic health | 2 | 4 | 4 | 4 | 4 |
| C visual charm | 3 | 3 | 4 | 3 | 4 |
| D voice | 4 | 4 | 4 | 3 | 4 |
| E session feel | 4 | 4 | 4 | 4 | 4 |
| **total** | 16 | 19 | **20** | 18 | **20** |

Two versions in a row at 20. Every axis is 4 and none has ever been a 5. **The
next point has to come from making one axis genuinely excellent**, and the
arbiter has said plainly which item does that: BACKLOG item 1 closes A, B and D
at once.

## What was just tried, and what happened

**v005 - voice and the room.** Taken because v004 was rejected on those two axes
and the cycle rules require a different pillar after a rejection.

Thirty-six new idle lines (four per villager per time of day became seven), a
second way of thanking you for a repeated wish, and an idle rotation that steps
by three so three villagers stop marching through their pools in lockstep. On
the room: the mat put into the house palette, a mouth for Bodkin, the placement
highlight anchored to the surface as a pool of light, and the item ghosted into
place before you commit.

It worked on what it aimed at - **14 of 14 dialogue lines unique** against
v004's 11, defined lines 147 to 192, reachability reversing a three-version
slide - and it tied rather than beat the floor.

**What the arbiter took from it, and it is the useful part:** repetition was
*restored*, not *reduced*. `mostRepeatedActionOfAnyKind` reads 65 and
`worstAbsoluteRepetition` reads 55 - the same numbers, in the same seeds, on the
same actions, as v003. Reverting v004 put them back; it did not improve them.
The arbiter rejected the "down from 290" framing outright and was right to.

**And it voided its own predecessor's gate**, finding the `shareOfWindow <= 0.20`
rule inversely correlated with the defect it was meant to catch. That is twice
now that a numeric gate set in one version has turned out to be miscalibrated
when applied to the next. The lesson to carry: a gate written against one
build's numbers is a hypothesis, not a law.

## What comes next

**Take BACKLOG item 1 - queue villager reactions.** Not more writing; the
writing is fine. The reactions the game already has are being *discarded before
delivery*: zero of fourteen sample lines across 38 in-game days name anything
the player gathered, placed or built, and `marla.stage.2` has now been
superseded before it could be spoken in five consecutive versions.

Interlock check: villagers + decorating + village growth. Three pillars, so it
is eligible as it stands.

Do the two binding metrics items in the same cycle - they are small, they are
overdue, and one of them is a veto that currently cannot fire.

## What the game currently is

Mossglen runs in one HTML file with no build step. You stand in a clearing and
tap things to walk over and look at them.

- **Gathering** — 7 spots across 3 areas, 10 findable things, each spot
  regrowing after 120 in-game minutes. A glass bead is the rare one.
- **Decorating** — 6 places in your house. The picker is a pinned row so the
  room stays visible, and the spot you are filling pulses while you choose.
- **Villagers** — Pim, Marla, Bodkin. They respond in priority order: first
  meeting → the village changing → a hint about somewhere you cannot reach yet
  → the next thing the village wants built → what your house adds up to → a
  particular object in your house → what is in your bag → weather and mood.
- **Village growth** — the well converts anything into bloom. Bloom opens the
  pond path and lights the hollow, and pays for six projects on the board, each
  proposed by a villager and each placing a real object. Then the village green,
  which takes five of anything for ever.
- **Giving** — each villager hopes for one thing a day, cycling for ever.

Time runs at `TIME_COMPRESSION = 6` in-game minutes per real second and only
while the tab is visible. Nothing decays, ever.

## What was just tried, and what happened

**v003 — the room, and one hope a day.** BACKLOG items 1 and 4 folded together
so a repaint would touch two pillars instead of one. It worked: visual charm
went 3 → 4, the first movement on that axis in three versions, and 14 of 14
dialogue lines in the sample were unique for the first time.

**But the important thing that happened was a bug.** Village stage and open
areas were gated on the *current* bloom balance. v001 had no way to spend
bloom, so it was invisible. v002 gave bloom a sink — and thereby made spending
it walk the village backwards: the pond path and the hollow closing again, the
stage falling from 4 to 1. That is loss, and unreachable content, and PILLARS
forbids both. **It shipped in v002 and was live for a full version.**

Three things are worth carrying forward from how it was caught:

1. **The arbiter found it from the artifacts alone**, with no access to the
   code — three seeds reporting a final stage below the stage their own pacing
   tables said they had reached on day 2. It declined to fire on an ambiguity
   it could not resolve from outside and said the veto would fire next version
   if the answer was that stage regresses. The answer was that stage regresses.
   The blindness is the whole value of the arrangement; this is what it bought.
2. **6,200 regression checks did not catch it**, because every one of them
   walked forward from a fresh game and none had a reason to spend a currency
   down past a threshold. A test suite only covers the sequences somebody
   thought of. `spendingNeverUnbuilds` exists now. Do not remove it.
3. **The fix was cheap and the detection was not.** Bloom is now a high-water
   mark that only rises, plus a purse you spend. Ten lines. The expensive part
   was noticing, and what did the noticing was a critic who could not see the
   code and therefore had nothing to compare the numbers against except each
   other.

## What comes next

**Read the "Binding on v004" section at the top of BACKLOG.md before choosing
anything.** The grind rule has to be repaired this cycle or the version is
rejected on the veto with no argument entertained, and part of that repair is a
game change rather than a metrics change: `worstAbsoluteRepetition` must come
down from 55, and `talk:marla` firing 65 times inside one project window is the
repetition a player would actually feel.

Then take **BACKLOG item 1** — the game is over on in-game day 16, and this got
worse rather than better in v003 (v002 reached day 38). The evidence is now
unambiguous: `meanCarriedAtEnd` went 58 → 691.8 inside a single version with no
plateau in any seed.

Those two fit together in one coherent change. Named, growing goals on the
board for the back half of the game give the green something to be *for*, which
is item 1; and giving a player more different things worth doing in a long
window is also what brings the worst repetition count down, which is the
binding condition. Do not treat the grind repair as a reporting exercise.

## Things you would otherwise have to rediscover

**Repository:** `github.com/fithzhood/mossglen`, deployed at
**https://fithzhood.github.io/mossglen/**. Working copy is
`C:\Users\lfili\OneDrive\Documenti\app\Mossglen`.

**The core loads in Node.** `src/mossglen.js` has no DOM above the
`typeof document !== 'undefined'` guard. That is what lets `tools/sim.js` play
the real game. The moment the core touches `document`, every metric is fiction.

**Everything routes through `listActions(S)`.** Tap handler and simulation read
the same list. If an action is not in there it does not exist, and the bot will
never find it.

**Two lines are rewritten at freeze time** and asserted afterwards:
`var VERSION = 'dev';` and `var ASSETS = '../assets/';`. Every archived version
shares one origin on Pages, so an unnamespaced save key would corrupt the save
of every older version in the gallery.

**Sprites are ASCII in `tools/sprites.py`**, one shared palette, saved at 1× so
the canvas owns the zoom. It hard-fails on a wrong row length and reports
orphan pixels rather than silently cleaning them.

**Do not edit source once the measure phase has started.** Freeze, then
measure, then judge. The reports are the arbiter's only window into the game
and must describe the build that got frozen.

**Bash heredocs eat backslashes and quotes on this machine, sometimes
silently.** Write source edits as a `.py` file in the scratchpad and run it,
with an `assert` on every anchor. Two patches failed this way in cycle 3, one
without saying so.

**A partially-applied patch is the dangerous case.** When a multi-swap script
asserts halfway through, the earlier swaps are already on disk. Write the
follow-up with only the remaining swaps.

**Commands:**

```bash
python tools/sprites.py                      # regenerate assets/
node tools/regression.js                     # 6287 checks against src/
node tools/sim.js NNN                        # 5 seeds x 300 days -> reports/NNN/
node tools/shots.js NNN                      # 7 fixed scenes at 390x844
node tools/freeze.js NNN                     # src/ -> v/NNN/, stamps version
node tools/regression.js "$PWD/v/NNN" NNN    # verify the frozen copy standalone
```

**The preview pane cannot drive a `file://` page from outside the primary
working directory.** Serve over HTTP: the `mossglen` entry in
`~/OneDrive/.claude/launch.json` serves the repo on port 8755. Playwright
reaches `file://` fine, which is what the tools use.

## Standing obligations

The `finalStage` contradiction is resolved and confirmed resolved. The grind
rule is not — see the binding section at the top of `BACKLOG.md`, and read the
arbiter's full ruling in `reports/003/scorecard.md`, which is worth reading in
full before touching any metric definition. `reports/003/scorecard-provisional.md`
is a genuine earlier verdict on an earlier build of the same version; it is kept
as part of the record.

One general rule the arbiter established, and it is a good one: **never narrow a
veto definition in the version where the narrowing is load-bearing.** If a
measurement needs changing, change it one version before it changes an outcome.

## Cycle discipline

One backlog item per cycle. Verify the interlock rule before starting — if the
item touches one pillar, reshape it until it touches two, and do not skip that
step to save effort. If the arbiter rejects: reset to the previous tag, record
why under `## Dead ends`, and take a different pillar. A rejected version is
never pushed.
