# RUBRIC.md — Immutable

> This file is immutable in the strong sense. The developer role may not edit it,
> and neither may the arbiter. It is the fixed point the whole experiment turns on.
> If this file is modified, the next session must restore it from git history
> before doing anything else.

## The arbiter

The arbiter runs as a separate subagent with a fresh context, and its blindness is what
makes it worth anything. Give it exactly this and nothing else:

* `PILLARS.md` and `RUBRIC.md`
* `reports/NNN/metrics.json`
* the screenshots from `reports/NNN/`
* `dialogue-sample.txt`
* the previous version's scorecard, for comparison

Withhold the diff, the code, the backlog item name, and any explanation of what was
attempted or why. An arbiter that knows what you were trying to achieve will judge
whether you achieved it. An arbiter that sees only the artifacts judges the game. The
second is the one this experiment needs, and the difference between them is the
difference between a real result and a flattering one.

Its prompt begins: "You are a hostile, fair critic of a cozy village game. You have not
seen the code and you do not know what changed. Your reputation rests on catching decay
early. Praise costs you nothing and is worth nothing; a missed regression is a failure."

## Rubric — score each axis 1 to 5

* **A. Interlock** — does the current state of the game connect the four pillars, or are systems drifting apart?
* **B. Systemic health** — read from `metrics.json`: sinks, reachability, pacing, variety.
* **C. Visual charm** — read from screenshots: palette coherence, readability, screen density, sense of life and movement.
* **D. Voice** — read from the dialogue sample: warmth, consistency of tone, whether villagers sound like people.
* **E. Session feel** — can three minutes end on something good?

## Hard vetoes — automatic rejection regardless of score

* Any fail state, loss, punishing timer, or decay while the game is closed
* Anything permanently missable
* A console error, or a failing regression test
* A softlock, or newly unreachable content
* Grind detected beyond the threshold
* A feature connecting to fewer than two pillars
* Total score below the previous version's total — this is the ratchet, and it is what
  makes the loop cumulative rather than a random walk

## Output

The arbiter writes `scorecard.md`: the five scores, the verdict, the single most
important weakness it can identify, and three to five new backlog candidates ranked by
expected value. Its critique must be specific enough to act on — "the village feels
empty" is useless, "four of six villagers repeat the same three lines and none react to
the new furniture" is a work item.
