# STATE.md

*Rewritten every cycle. This is the resume point for a session with no memory
of the last one. Written for a stranger, because that is what you are.*

---

## Where things stand

**Current version: v002, accepted at 19/25. Tagged, pushed, live. Nothing is in
progress and nothing is broken.** The next cycle starts clean at Phase 1.

`19/25` is the ratchet floor. v003 must total 20 or more or it is rejected,
regardless of how good it looks.

Scores so far — v001 16/25, v002 19/25:

| axis | v001 | v002 |
|---|---|---|
| A interlock | 3 | 4 |
| B systemic health | 2 | 4 |
| C visual charm | 3 | **3** |
| D voice | 4 | 4 |
| E session feel | 4 | 4 |

**Read that C column.** Visual charm has not moved in two versions, and both
scorecards say the same thing about why: the specific faults they named were
never touched. B is nearly maxed and A is close. **C is where the remaining
points are, and it is also the cheapest work on the board.**

## What the game currently is

Mossglen is a cozy village game that runs in one HTML file with no build step.
You stand in a clearing. You tap things to walk over and look at them.

- **Gathering** — 7 spots across 3 areas, 10 findable things. Each spot
  regrows after 120 in-game minutes. A glass bead is the rare, surprising one.
- **Decorating** — 6 places in your house (windowsill, two shelves, table,
  floor by the bed, rug). Placing consumes from the bag, taking back returns it
  exactly.
- **Villagers** — Pim (hedgehog, brisk, keeps lists), Marla (heron, slow and
  poetic), Bodkin (mole, funny, delighted by everything). They respond in
  priority order: first meeting → the village changing → a hint about a place
  you cannot reach yet → what they are hoping someone brings them → what is in
  your house → what is in your bag → weather-and-mood by time of day.
- **Village growth** — the old well converts anything into *bloom*. Bloom opens
  the pond path (12) and lights the hollow (55), with a final stage at 140.
  Growth also moves villagers: Marla is at the pond in the afternoons once the
  well holds water; Bodkin is in the hollow before dawn once the lantern is lit.
- **Giving** — each villager cycles through three wishes forever. Handing over
  the wished-for thing is worth double bloom and gets a warm line. This is the
  edge that ties gathering → villagers → growth in a single action.

Time runs at `TIME_COMPRESSION = 6` in-game minutes per real second (a day is
four real minutes) and **only while the tab is visible**. Nothing decays, ever.

## What was just tried, and what happened

**v002 — village projects.** BACKLOG item 1 from v001's arbiter. The village
board at the signpost: six projects, each proposed by a villager, each costing
gathered material plus bloom, each placing a real object in the world — then
the village green, which takes five of anything for ever.

It worked, on the numbers it was aimed at:

| | v001 | v002 |
|---|---|---|
| items left unused after 300 days | 3,958.6 | 16 |
| bloom overspill factor | 277.8 | 2.4 |
| dialogue reached | 93.2% | 98.2% |
| unreachable dialogue | 1 node | 0 |
| worst required repetition (threshold 15) | 13 | 13 (median 13 → 8) |
| last first-time milestone | day 3 | day 30–40 |

The arbiter confirmed the arc was extended with content rather than padded with
cost, which is the part that mattered.

Three things worth knowing:
- **Four new sprites were drawn, referenced by the project data, and never
  added to the loader's list.** The renderer drew each one's ground shadow and
  silently skipped the sprite. Nothing threw. Regression passed. The simulation
  was happy. Only looking at a screenshot caught it. There is now a check that
  walks every sprite named anywhere in the data and asserts it loaded.
- **The planting price took three attempts.** Too steep and plantings stall
  while the bag fills; flat and the bag drains but bloom banks up. Both were
  fixed by making the *bot* behave like a person — donate when the village
  needs moving rather than on sight, and keep back what the next project needs.
- **The arbiter found a hole in the instrument, not the game**: gifts were
  consuming items that `outflow` never counted, so ~26% of everything gathered
  left through an unnamed channel. Fixed after the verdict, along with
  `utilisationPct` / `resourcesUnderUsed` (because `resourcesWithNoSink: []`
  was passing a 96% waste rate as healthy) and grind measurement for the
  project arc, which carried days 3–38 entirely unmeasured. **The next
  `metrics.json` will therefore have fields v002's did not.**

## What comes next

**Take BACKLOG item 1 — repaint the home interior.** It is not the
highest-scored item (items 2 and 3 are 5/5) but it is the right one:

- Visual charm is the only axis that has not moved, and it is now the cheapest
  point on the board.
- The same defects have been named in **two consecutive scorecards**. An
  optimisation loop that keeps deferring the cheap visible fix in favour of the
  interesting systemic one is a loop with a blind spot, and this is that blind
  spot showing up twice.
- It is small enough to finish cleanly in one cycle, which items 2 and 3 are
  not.

Concretely: kill the dashed placement rectangle rendered inside the rug, give
the rug a texture in the existing palette, replace the sans-serif "out" on the
door with a mat or a step, commit the room to one projection, and draw Bodkin a
portrait at portrait size instead of upscaling his world sprite.

Check the interlock rule before starting — a pure repaint touches decorating
only. **Reshape it so it touches two pillars**: the obvious way is to fold in
BACKLOG item 4 (make the decorating sheet show the room it is decorating, and
have villagers react to what is on show), which puts it on decorating +
villagers. Do not skip this step to save effort; the rule is not negotiable.

## Things you would otherwise have to rediscover

**Repository:** `github.com/fithzhood/mossglen`, deployed at
**https://fithzhood.github.io/mossglen/**. Working copy is
`C:\Users\lfili\OneDrive\Documenti\app\Mossglen`.

**The core loads in Node.** `src/mossglen.js` has no DOM above the
`typeof document !== 'undefined'` guard, and exports via `module.exports`.
That is what lets `tools/sim.js` play the real game. Keep it that way — the
moment the core touches `document`, every metric becomes fiction.

**Everything routes through `listActions(S)`.** The tap handler and the
simulation read the same list. If an action is not in there, it does not exist.
Adding a feature means adding to that list, or the bot will never find it.

**Two lines are rewritten at freeze time** and asserted afterwards:
`var VERSION = 'dev';` and `var ASSETS = '../assets/';`. Every archived version
shares one origin on Pages, so an unnamespaced save key would corrupt the save
of every older version in the gallery.

**Sprites are ASCII in `tools/sprites.py`**, one shared 30-colour palette, saved
at 1× so the canvas owns the zoom. The script hard-fails on a wrong row length
and reports orphan pixels rather than silently cleaning them. Run
`python tools/sprites.py` after editing; it rewrites all of `assets/`.

**Never edit source after the measure phase starts.** The reports are the
arbiter's only window into the game and must describe the build that got
frozen. During bootstrap two slot names were renamed after screenshots were
taken, so `reports/001/5-decorating.png` says "On the corner" where the frozen
v001 says "On the rug". Harmless once; do not repeat it. **Freeze, then
measure, then judge.**

**The preview pane cannot drive a `file://` page from outside the primary
working directory** — it renders a static snapshot with no scripts. Serve over
HTTP instead: the `mossglen` entry in `~/OneDrive/.claude/launch.json` serves
the repo on port 8755. Playwright reaches `file://` fine, which is what the
tools use.

**Commands:**

```bash
python tools/sprites.py                      # regenerate assets/
node tools/regression.js                     # 6233 checks against src/
node tools/sim.js NNN                        # 5 seeds x 300 days -> reports/NNN/
node tools/shots.js NNN                      # 5 fixed scenes at 390x844
node tools/freeze.js NNN                     # src/ -> v/NNN/, stamps version
node tools/regression.js "$PWD/v/NNN" NNN    # verify the frozen copy standalone
```

**The arbiter is a subagent with a fresh context.** Give it exactly
`PILLARS.md`, `RUBRIC.md`, `reports/NNN/metrics.json`, the five screenshots,
`dialogue-sample.txt`, and the previous scorecard. Tell it explicitly not to
open any source file. Withhold the diff, the backlog item name, and any
explanation of what you were attempting — an arbiter that knows the goal judges
whether you hit it, which is the wrong question.

## Cycle discipline

One backlog item per cycle. Verify the interlock rule before starting. If the
arbiter rejects: `git reset --hard` to the previous tag, `git clean -fd` to
remove the frozen directory, record why in `DECISIONS.md` under `## Dead ends`,
and **take a different pillar next cycle** — do not retry a variation of the
same idea. A rejected version is never pushed.
