# STATE.md

*Rewritten every cycle. This is the resume point for a session with no memory
of the last one. Written for a stranger, because that is what you are.*

---

## Where things stand

**Current version: v003, accepted at 20/25. Tagged, pushed, live. The working
tree is clean at that tag and nothing is in progress.**

**v004 was built and REJECTED at 18/25.** The tree has been reset and cleaned;
`v/004/` and `reports/004/` are gone from the working copy. Its scorecard is
preserved at `reports/004-rejected-scorecard.md` because the ruling in it
governs v005.

`20/25` is the ratchet floor. v005 must total 21 or more.

| axis | v001 | v002 | v003 | v004 (rejected) |
|---|---|---|---|---|
| A interlock | 3 | 4 | 4 | 4 |
| B systemic health | 2 | 4 | 4 | 4 |
| C visual charm | 3 | 3 | **4** | 3 |
| D voice | 4 | 4 | 4 | 3 |
| E session feel | 4 | 4 | 4 | 4 |
| **total** | 16 | 19 | **20** | 18 |

## Read this before choosing anything

**v004 added twenty named milestones to the back half of the game — which the
arbiter called the largest structural improvement in the series — and was
rejected anyway, because C and D each lost a point for reasons that had nothing
to do with it.**

- **C fell because zero of four itemised visual faults were fixed in their
  fourth consecutive version**, and a new one arrived. The four are the rug,
  Bodkin's missing mouth in his portrait, the decorating highlight that floats
  free of the surface, and the absent ghost preview. The new one: the picker
  sheet clips the legs of the stool it is asking you to decorate.
- **D fell because a longer arc was shipped without a word of new writing.**
  The sample held 11 distinct texts in 14 slots, the worst of any version.
  `talk:pim` fires 220–290 times in a single window against a fixed idle pool.

**The bias to correct.** Three times in four versions I have deferred the cheap
visible fixes in favour of the interesting systemic one, and the scorecards have
said so each time. Treat that as a known fault in the judgement of whoever is
running this loop rather than something to rediscover a fifth time. **The next
cycle takes the visual and voice work** — that is also what the cycle rules
require after a rejection: a different pillar from the one that failed.

**Binding gates for v005**, from `reports/004-rejected-scorecard.md`. Its
predecessor's `worstAbsoluteRepetition < 55` condition was **voided** by the
arbiter itself as arithmetically incompatible with its own pacing demand — do
not reinstate it. The replacements:
1. `shareOfWindow` no higher than **0.20** in any milestone window (v004 sat at
   0.19 — hold the line).
2. `mostRepeatedActionOfAnyKind` must not exceed **290**. This is the number
   that actually exploded: `talk:pim` went 65 → 290, about eighteen
   conversations per in-game day against a pool of 158 lines.
3. Add a `mostRepeatedActionPerInGameDay` field so the figure stops scaling
   with the length of the arc.

**If groves are ever attempted again**, each milestone must *place* something
and *cost* something. In v004, `plantings`, `meanCarriedAtEnd` and
`utilisationPct.moss` were identical to v003 to the decimal — twenty new events
that drew not one extra item out of the bag. The arbiter's phrase for it is
worth keeping: *structure without content*.

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
