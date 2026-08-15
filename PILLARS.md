# PILLARS.md — Immutable

> This file is immutable in the strong sense. The developer role may not edit it,
> and neither may the arbiter. It is the fixed point the whole experiment turns on.
> If this file is modified, the next session must restore it from git history
> before doing anything else.

## The game

Mossglen — a cozy village life game in the spirit of Animal Crossing, played in a
browser, designed to be picked up on a phone for a few minutes at a time.

## The four pillars

The heart of the game is not any single one of these. It is the fact that they feed
each other in a closed circle:

1. **Gathering & discovery** — you collect things from the world, and some of them are surprising.
2. **Decorating** — what you gather furnishes and shapes your home and the village.
3. **Villagers** — the inhabitants notice, react to, and comment on what you have gathered and decorated.
4. **Village growth** — the village develops in response, which opens new places to gather from.

## The interlock rule

The arbiter enforces this absolutely: **every new feature must connect to at least two
of the four pillars.** A feature touching only one pillar is an isolated system, and
isolated systems are exactly how a cozy game rots into a resource-management
spreadsheet with cute graphics. This rule is the single strongest defence against that
outcome. It is not negotiable and it is not modifiable by any iteration.

## Immutable design constraints

These exist because an optimization loop, left alone, will discover that scarcity,
pressure and loss aversion generate engagement — and engagement is not the goal here.
Warmth is.

* The player can always keep playing; nothing ends the game.
* Nothing is permanently missable. Anything that appears once will appear again.
* Nothing decays, expires, or degrades while the game is closed. Time advances only
  while the player is actively playing, at a compressed rate — an in-game day passes
  in a few real minutes.
* No timer pressures the player, and no screen ever reports how efficient or
  inefficient they were.
* A three-minute session must be able to end on something pleasant: a small find, a bit
  of dialogue, a change to the village. The game never requires a long session to give
  something back.
* Villagers are kind. Their writing may be odd, melancholy, or funny, but never mean
  and never nagging.

The time compression ratio is an explicit, named constant in the code, and the arbiter
may tune it based on simulation metrics — it is one of the few numbers the arbiter is
allowed to direct.
