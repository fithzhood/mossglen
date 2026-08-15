# STATE.md

*Rewritten every cycle. This is the resume point for a session with no memory
of the last one. Written for a stranger, because that is what you are.*

---

## Where things stand

**Current version: v001, accepted at 16/25. Tagged and pushed. Nothing is in
progress and nothing is broken.** The next cycle starts clean at Phase 1.

`16/25` is now the ratchet floor. v002 must total 17 or more or it is rejected,
regardless of how good it looks.

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

Iteration 0: bootstrap. Repository, immutable documents, the whole tool chain,
23 hand-authored sprites, and v001 itself. The arbiter accepted it at 16/25 and
was right to be unimpressed — see `reports/001/scorecard.md`, which is worth
reading in full before choosing anything.

Three things the tooling caught that playing did not:
- `fire()` compared every action field except `area`, and did not stop at the
  first match, so "go inside" resolved to whichever travel action was last in
  the list. Going home silently walked you to the pond.
- `actGather` never checked the area, so the core allowed gathering a spot in
  another place. The tap handler masked it.
- The first dialogue ordering buried hints under item chatter, and five hint
  lines were unreachable across all five seeds.

## What comes next

**Take BACKLOG.md item 1 or item 2.** They are the arbiter's two 5/5 items and
they are the same problem seen from two sides: the game is over in about twelve
real minutes.

- Item 1 (village projects that keep consuming what you gather) adds a sink.
- Item 2 (stretch the unlock arc from 3 in-game days to ~30) slows the drain.

Item 1 is the stronger pick — it touches three pillars and directly moves the
two numbers the arbiter named. **If you take item 2, do it by spreading gates
over time, not by raising costs**: `gather:hollowtree` already needs 13
repetitions against a grind threshold of 15, so raising prices trips the veto.

One standing obligation regardless of what you pick: **`marla.home.feather` is
a dialogue node no seed reaches.** The arbiter recorded it explicitly so it
cannot later be waved through as pre-existing. If it survives v002 it counts as
standing dead content.

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
node tools/regression.js                     # 6117 checks against src/
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
