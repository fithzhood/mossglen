# DECISIONS.md

Append-only. Every autonomous choice, with the reasoning that produced it.
Nothing here is ever deleted, including the things that turned out wrong —
a future session needs to know what has already been tried.

---

## Iteration 0 — bootstrap

**The core is a plain module with no DOM in it, and the browser half is
guarded behind `typeof document`.** The simulation bot has to load the real
game logic or its numbers are fiction. A build step was rejected: the brief
says the game opens by loading `mossglen.html` directly, so the file exports
via `module.exports` when Node is present and defines globals otherwise.

**Sprites are written as ASCII rows against one shared palette, and saved at
1×.** Authoring 12×12 items procedurally produced mush I could not evaluate
without rendering; ASCII is its own debug view, which is what the pixel-art
process asks for anyway. One palette across characters, items and props is
what makes the screen read as a single place. Saving at 1× keeps the canvas
in charge of the zoom, so scaling stays crisp and integral.

**`tools/sprites.py` validates row length and reports orphan pixels rather
than auto-cleaning them.** Auto-cleaning silently deletes intentional
texture. A report makes me look.

**v001 ships all four pillars thinly rather than one pillar thickly.** The
brief gives design authority here and asks for the interlock to be visible
from the first version. So: gathering feeds decorating and the well;
decorating and the well both feed villager dialogue; villagers' wishes feed
village growth; growth opens new places to gather and moves villagers
around. Every edge exists, none of them deeply.

**Villager wishes were added to v001 rather than deferred.** The first
simulation showed items had a sink on paper but the game had no reason to
care *which* item you brought anywhere. Wishes tie gathering → villagers →
growth in one action, which is three pillars, and they give the item table a
reason to have distinct entries. Wishes cycle forever, so there is never a
last one.

**World is 176 × 304 logical pixels, portrait.** The first build used
176 × 192, which is nearly square; on a 390 × 844 phone that left roughly a
third of the screen as empty background no matter how it was scaled. The
stage now flexes and centres the canvas, so the integer-scale remainder
reads as a mat rather than a gap.

**`TIME_COMPRESSION = 6`** (in-game minutes per real second), so an in-game
day is four real minutes. Chosen so that a three-minute session covers most
of a day and therefore crosses at least one time-of-day boundary, which is
what makes villagers say something different on the way out. This is the
dial the arbiter is allowed to direct.

**Stage thresholds moved from 12 / 30 / 60 to 12 / 55 / 140.** The first
simulation reached the final stage inside a single three-minute session,
which meant the entire village-growth pillar completed before the player had
met everybody. Stage 2 still lands inside the first session on purpose — a
first session should end on the village changing.

**Dialogue priority is meet → stage → hint → wish → home → item → idle.**
The first ordering put hints and wishes below item reactions, and the
simulation found five hint lines that no seed ever reached: they were buried
under a pile of pleasantries about moss and never surfaced before the area
they described had already opened. Guidance goes above chatter.

**The simulation's softlock detector was wrong and was rewritten.** It first
counted "no meaningful action in the current area", which flagged 10,132
softlocks — almost all of them the perfectly reasonable situation of
standing in a room with nothing to do and walking next door. A softlock is
having nothing worth doing *anywhere*.

**Grind is measured against actions that actually gate a milestone**
(gather / give / donate), with the most-repeated action of any kind reported
alongside it for context. The first version flagged "talked to Bodkin twenty
times" as grind toward stage 4, which is repetition but is not a gate. Both
numbers are in `metrics.json` so the distinction stays visible rather than
being quietly assumed away.

**`metrics.json` reports `bloomHasNoSinkAfterFinalStage` as a standing
flag.** Bloom is a currency, and past stage 4 it rises forever with nothing
left to buy. This is the honest limitation of v001 and it is recorded rather
than hidden.

**Freezing rewrites exactly two lines** (`VERSION` and `ASSETS`) and then
asserts neither original survived. Every archived version shares one origin,
so an unnamespaced save key would corrupt every older version in the
gallery. The assertion is the point.

### Bugs found by the tooling during bootstrap

**`fire()` matched every field except the one `travel` uses.** It compared
kind, spot, who, item and slot — but not `area` — and did not stop at the
first match, so "go home" resolved to whichever travel action happened to be
last in the list. Going indoors silently walked you to the pond instead.
Found by the regression walk, not by playing.

**`actGather` did not check the area.** A gather action naming a spot in
another area succeeded from anywhere. The tap handler filtered it out, so it
was invisible in play, but the core was wrong.

### Process notes for the next session

**No source edits once the measure phase has started.** During bootstrap I
renamed two home slots after `tools/shots.js` had already run, so the
screenshots in `reports/001/` briefly disagreed with the frozen build over one
panel title. Harmless here, but the reports are the arbiter's only window into
the game, and they have to describe the thing that actually got frozen. Freeze
first, then measure, then judge.

**The preview pane cannot drive a `file://` page from outside the primary
working directory** — it renders a static snapshot with no scripts. Serve the
repo over `http://localhost:8755` instead (the `mossglen` entry in
`~/OneDrive/.claude/launch.json`), which also happens to be how GitHub Pages
will serve it.

**Integer canvas scaling wastes space on short, wide viewports.** The scale is
chosen as the largest integer that fits both width and height, so a viewport
that is just under the next step drops a whole step. On the target device
(390 × 844) this lands at 90% of the width and looks right; on a 678 × 730
window the world shrinks to about 57% of the available width. Left alone
because the game is a portrait phone game, and the stage centres the canvas so
the remainder reads as a mat. Revisit only if the arbiter scores density down.

---

## Cycle 2 — v002, village projects

**Took BACKLOG item 1 (arbiter 5/5) rather than item 2.** Both address the same
complaint — the game was over in twelve real minutes — but item 1 adds a sink
where item 2 only slows the drain, and item 1 touches four pillars where item 2
touches two. Doing item 1 first also made item 2 largely unnecessary: the
project chain gates itself over time as a side effect of costing real material.

**Six named projects, then an endless green.** The named chain is
hand-written — each one proposed by a particular villager, each placing a real
prop — because that is where the warmth is. But six of anything is still a
finite list, and a finite list is exactly the shape of the v001 problem. So the
last project opens the village green, which takes five of anything for ever.
The chain is the arc; the green is the tail.

**The planting price was tuned three times, and the first two were wrong in
opposite directions.** Starting at `12 + 4 × plantings`, the price climbed so
fast that planting stalled at 134 and the bag still ended a 300-day run holding
3,086 things. Flattening it to 12 drained the bag (16 left) but banked 23,752
bloom nobody could spend. The arithmetic says a flat price *should* drain both,
so the leftover was the bot's policy, not the design: it donated everything on
sight and manufactured bloom it had no use for. Teaching it to donate only when
the village actually needs moving — and to keep back whatever the next project
is asking for, which is what a person does — settled both at once: **16 items
and an overspill factor of 2.4**, against the arbiter's targets of 400 and 5.

**The bot now rearranges its house.** It used to fill six slots once and never
touch them again, so a villager's reaction to a *particular* placed object was
nearly unreachable — which is exactly how `marla.home.feather` became dead
content in v001. A player who never redecorates is not a realistic player.
Dialogue reachability went from 93.2% to 98.2%, with nothing unreachable.

**Villagers now propose the next project when the last one finishes.** Pitches
were originally reachable only by talking, and the bot built things faster than
it made conversation, so five of the six pitches were unreachable. Rather than
tune the bot around it, the proposer speaks up on completion — which is warmer
anyway, and makes the line reachable by construction.

### Bugs found this cycle

**Four new sprites were drawn, referenced by the project data, and never added
to the loader's list.** The renderer drew each project's ground shadow and then
silently skipped the sprite, so the built village showed bare ellipses on the
grass. Nothing threw; regression passed; the simulation was perfectly happy.
Only looking at a screenshot caught it. There is now a check that walks every
sprite named anywhere in the data and asserts it actually loaded, so this class
of failure cannot be invisible again.

**A `python` heredoc silently dropped a string replacement** because the search
text did not match (`if (...)` vs `} else if (...)`), and without an assertion
the script reported success. Every scripted edit to a source file now asserts
its anchor was found. The one that slipped through cost a full simulation run.

## Dead ends

*(nothing yet)*
