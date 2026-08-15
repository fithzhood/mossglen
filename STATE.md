# STATE.md

*Rewritten every cycle. This is the resume point for a session with no memory
of the last one. Written for a stranger, because that is what you are.*

---

## Where things stand

**Last pushed version: v002, accepted at 19/25, live.**

**v003 is built, frozen into `v/003/`, and awaiting a verdict.** It has not
been committed or pushed. `main` is clean at tag `v002`, so the deployed
gallery is unaffected whatever happened to the session that was building it.

### If you are resuming and do not know the outcome

Look at `reports/003/scorecard.md`:

- **ACCEPTED and total ≥ 19** → finish Phase 7. Append to `CHANGELOG.md`, add
  v003 to `index.html` (newest first, with its score), commit as
  `v003: the room, and one hope a day [score: N/25]`, tag `v003`, push, then
  confirm https://fithzhood.github.io/mossglen/v/003/mossglen.html returns 200.
  Then fold the new critique into `BACKLOG.md` and rewrite this file for v004.
- **REJECTED** → `git reset --hard v002` and `git clean -fd` to remove `v/003/`
  and `reports/003/`. Record why in `DECISIONS.md` under `## Dead ends`.
  **Take a different pillar next cycle** — do not retry a variation of the
  same idea.
- **Missing or truncated** → the arbiter never finished. Re-run it: a subagent
  with a fresh context, given only `PILLARS.md`, `RUBRIC.md`,
  `reports/003/metrics.json`, the seven screenshots in `reports/003/`,
  `dialogue-sample.txt`, and the previous scorecards. Tell it explicitly not to
  open any source file, and withhold the diff, the backlog item name, and any
  explanation of what was attempted.

`reports/003/scorecard-provisional.md` is a **real earlier verdict on an
earlier build of v003** (20/25, accepted). Do not treat it as the final word —
the artifacts were regenerated after it, for the reason below. Keep it; it is
part of the record.

## What v003 does, and the bug it uncovered

v003 took BACKLOG items 1 and 4 folded together: repaint the home interior, and
move decorating into the room instead of behind a sheet, with villagers
reacting to the character of what is on show.

- The room is committed to **front elevation** — one floor line, every slot on
  a surface genuinely underneath it. The rug is gone (a floor rug seen from the
  front is a stripe, and it was what made the old room a collage); a woven mat
  at the foot of the door replaces both it and the baked-in word "out".
- **Empty slots get a small warm dot**, and only while you are carrying
  something. The old dashed rectangle read as a debug drop-target.
- **Portraits are drawn at portrait size** (20 × 24) instead of blowing a
  16 × 22 world sprite up to 48 px wide.
- **Villagers read the room as a whole** — five moods off the item tags
  (`tidy`, `soft`, `odd`, `water`, and a full house). This is the villagers
  edge that made a pure repaint eligible under the interlock rule.
- **Each villager hopes for one thing a day.** The simulation showed the bot
  handing one villager 169 gifts inside a single milestone window.

### The bug, because it matters more than the feature

Village stage and open areas were gated on the **current** bloom balance.
v001 had no way to spend bloom, so this was invisible. v002 gave bloom a sink —
and thereby made spending it walk the village backwards: the pond path and the
hollow closing again, the stage dropping from 4 back to 1. **That is loss, and
unreachable content, and `PILLARS.md` forbids both.** It shipped in v002 and
nobody caught it — not two arbiter sessions, not 6,200 regression checks.

The arbiter found the *symptom* from the artifacts alone: three seeds reported
`finalStage` of 1, 1 and 2 while their own pacing tables said they had reached
stage 4 on day 2–4. It declined to fire on an ambiguity it could not resolve,
and said the veto would fire next version if the answer was that stage
regresses. The answer was that stage regresses.

**Bloom is now two numbers.** `bloomEver` is a high-water mark that only ever
rises and is the only thing growth is ever gated on; `bloom` is the purse you
spend. There is a regression check named `spendingNeverUnbuilds` that grows the
village, spends the well dry every way the game allows, and asserts the stage
and the open areas are unchanged. **Do not remove it.**

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

## Standing obligations for v004

These are the arbiter's, not mine, and they are binding:

1. **The grind rule.** `metrics.json` computes the grind veto as "more than 15
   repetitions AND more than half of all progress actions in the window",
   which is not the plain reading of `RUBRIC.md`. The arbiter cleared it once,
   under conditions: the raw count restored as a co-equal criterion reported
   alongside the share; `worstAbsoluteRepetition` must come **down** from 55,
   and any version where it rises above 55 is an automatic rejection; and no
   veto definition may be narrowed in the version where the narrowing is
   load-bearing. Read the ruling in the scorecard before touching this.
2. **The `finalStage` contradiction** must be visibly resolved in the metrics,
   not renamed.
3. **Per-playthrough dialogue reach is trending down** as lines are added —
   98.2% in v002, lower now. The union across seeds is still complete, but
   individual playthroughs are seeing less of the writing.

## Cycle discipline

One backlog item per cycle. Verify the interlock rule before starting — if the
item touches one pillar, reshape it until it touches two, and do not skip that
step to save effort. If the arbiter rejects: reset to the previous tag, record
why under `## Dead ends`, and take a different pillar. A rejected version is
never pushed.
