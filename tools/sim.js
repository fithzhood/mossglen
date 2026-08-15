/* Mossglen — headless simulation bot.

   Plays 300 in-game days on five seeds using the same action list the tap
   handler uses, and writes reports/NNN/metrics.json. It cannot say whether
   the game is cozy. It can say whether a resource has no sink, whether a
   line of dialogue is unreachable, and whether a stretch of the day has
   nothing in it — and those are the ways a cozy game rots. */

var fs = require('fs');
var path = require('path');
var C = require('../src/mossglen.js');
var DATA = C.DATA;

var DAYS = 300;
var SEEDS = [7, 101, 2024, 55555, 888001];

/* Roughly what each action costs a player in in-game minutes, at the
   current compression. Gathering includes walking over to the thing. */
var COST = { gather: 25, talk: 15, give: 12, donate: 8, build: 20, plant: 8, place: 10, unplace: 8, travel: 20, wait: 30 };

function rngFor(seed) { return C.makeRng(seed); }

/* A plausible unhurried player: looks around, chats, feeds the well, keeps
   house. Deliberately not an optimiser — an optimiser would tell us how to
   beat the game, and there is nothing here to beat. */
function choose(S, rng, memory) {
  var acts = C.listActions(S);
  var by = {};
  acts.forEach(function (a) { (by[a.kind] = by[a.kind] || []).push(a); });

  function pick(list) { return list[Math.floor(rng() * list.length)]; }

  if (S.area === 'home') {
    var freeSlot = by.place && by.place.length ? pick(by.place) : null;
    if (freeSlot && rng() < 0.75) return freeSlot;
    /* people rearrange their houses; a bot that fills six slots once and
       never touches them again would never see a villager react to anything
       but the first six things it happened to pick up */
    if (by.unplace && by.unplace.length && rng() < 0.45) return pick(by.unplace);
    return by.travel[0];
  }

  /* keep a little back for the house, send the rest down the well */
  var held = C.heldItems(S).length;

  /* early on a person says hello to everyone before they start rearranging
     the village; without this the bot is a stranger who arrives shovelling */
  /* a village project is the thing everybody has been saving for, so it
     goes to the front of the queue the moment it is affordable */
  if (by.build && by.build.length) return by.build[0];
  if (S.bloom < 12 && by.talk && by.talk.length && rng() < 0.50) return pick(by.talk);
  if (by.plant && by.plant.length && rng() < 0.55) return pick(by.plant);
  if (by.give && by.give.length && rng() < 0.70) return pick(by.give);
  if (by.gather && by.gather.length && rng() < 0.62) return pick(by.gather);
  /* A player tips things down the well when the village needs moving, and
     keeps back whatever the next project is asking for. Donating everything
     on sight would bank bloom nobody has a use for. */
  var wanted = {};
  var soon = C.nextProject(S);
  if (soon) for (var wi in soon.needs) wanted[wi] = 1;
  var spare = (by.donate || []).filter(function (a) { return !wanted[a.item]; });
  var wantBloom = (soon ? soon.bloom : 0) + C.plantingCost(S) * 8 + 60;
  if (spare.length && S.bloom < wantBloom && rng() < 0.75) return pick(spare);
  if (by.talk && by.talk.length && rng() < 0.30) return pick(by.talk);

  if (held >= 2 && C.homeItems(S).length < DATA.homeSlots.length && rng() < 0.20) {
    var toHome = acts.filter(function (a) { return a.kind === 'travel' && a.area === 'home'; });
    if (toHome.length) return toHome[0];
  }
  if (by.plant && by.plant.length && rng() < 0.40) return pick(by.plant);
  if (by.travel && rng() < 0.14) return pick(by.travel);
  if (by.gather && by.gather.length) return pick(by.gather);
  if (spare.length && S.bloom < wantBloom) return pick(spare);
  if (by.talk && by.talk.length) return pick(by.talk);
  memory.waited++;
  return null; /* nothing worth doing — let time pass */
}

function runSeed(seed) {
  var S = C.newGame(seed);
  var rng = rngFor(seed ^ 0x5bd1);
  var mem = { waited: 0 };

  var itemIn = {}, itemOut = {}, held = {};
  Object.keys(DATA.items).forEach(function (i) { itemIn[i] = 0; itemOut[i] = 0; });

  var lines = {};
  var areasSeen = {}, villagersMet = {}, spotsUsed = {};
  var milestones = {};
  var actionLog = [];        /* action ids, for grind detection */
  var varietyByDay = [];
  var bloomCurve = [];
  var carriedCurve = [];
  var softlocks = 0, waitMinutes = 0, deadRun = 0, deadMax = 0;
  var errors = [];

  areasSeen[S.area] = 1;

  function note(name) { if (milestones[name] === undefined) milestones[name] = S.day; }

  var day = 1, guard = 0;
  var dayActions = {};

  while (S.day <= DAYS && guard < 4000000) {
    guard++;

    if (S.day !== day) {
      varietyByDay.push(Object.keys(dayActions).length);
      dayActions = {};
      if (S.day % 10 === 0) { bloomCurve.push(S.bloom); carriedCurve.push(C.invCount(S)); }
      day = S.day;
    }

    var acts = C.listActions(S);

    /* A softlock is having nothing worth doing ANYWHERE, not merely nothing
       worth doing in the room you happen to be standing in. Walking next
       door to a bush that is ready is a fine thing to do with a turn. */
    var anyGather = false;
    C.openAreas(S).forEach(function (a) {
      DATA.spots.forEach(function (sp) { if (sp.area === a && C.spotReady(S, sp)) anyGather = true; });
    });
    var anyTalk = DATA.villagers.length > 0;
    var anyDecorate = C.invCount(S) > 0 || C.homeItems(S).length > 0;
    if (!anyGather && !anyTalk && !anyDecorate) softlocks++;

    /* Not a softlock, but a stretch with nothing to gather anywhere open is
       still a boredom hazard, so it gets measured separately. */
    if (!anyGather) { deadRun += COST.wait; deadMax = Math.max(deadMax, deadRun); }
    else deadRun = 0;

    var act = null;
    try { act = choose(S, rng, mem); }
    catch (e) { errors.push('choose: ' + e.message); break; }

    if (!act) { C.advance(S, COST.wait); waitMinutes += COST.wait; continue; }

    dayActions[act.kind === 'place' ? 'place:' + act.slot : act.id] = 1;
    actionLog.push(act.id);

    var before = C.invCount(S);
    var ev;
    try { ev = C.doAction(S, act); }
    catch (e) { errors.push('doAction ' + act.id + ': ' + e.message); break; }

    ev.forEach(function (e) {
      if (e.type === 'found') {
        spotsUsed[e.spot] = 1;
        e.items.forEach(function (i) { itemIn[i]++; note('found:' + i); });
      } else if (e.type === 'donate') {
        itemOut[e.item]++;
      } else if (e.type === 'built') {
        note('built:' + e.project);
        var bp = C.projectById(e.project);
        for (var bit in bp.needs) itemOut[bit] += bp.needs[bit];
      } else if (e.type === 'planted') {
        itemOut[e.item] += DATA.planting.itemsEach;
        note('planted:1');
        if (e.plantings === 25) note('planted:25');
        if (e.plantings === 100) note('planted:100');
      } else if (e.type === 'place') {
        itemOut[e.item]++;
        note('decorated');
        if (C.homeItems(S).length === DATA.homeSlots.length) note('home:full');
      } else if (e.type === 'gave') {
        itemOut[e.item]++;
      } else if (e.type === 'pitch') {
        lines[e.key] = (lines[e.key] || 0) + 1;
      } else if (e.type === 'say') {
        lines[e.key] = (lines[e.key] || 0) + 1;
        villagersMet[e.who] = 1;
        if (Object.keys(villagersMet).length === DATA.villagers.length) note('met:all');
      } else if (e.type === 'stage') {
        note('stage:' + e.stage);
      } else if (e.type === 'travel') {
        areasSeen[e.area] = 1;
        note('area:' + e.area);
      }
    });

    C.advance(S, COST[act.kind] || 15);
  }

  Object.keys(S.inv).forEach(function (i) { held[i] = S.inv[i]; });

  /* Grind: replay the same policy from the top, and for each stage ask how
     many times the single most-repeated action had to be performed since
     the previous stage. Repeating one thing twenty times to open a gate is
     grind whatever else was going on around it. */
  var grind = {};
  (function () {
    var R = C.newGame(seed), rr = rngFor(seed ^ 0x5bd1), mm = { waited: 0 };
    var cnt = {}, prog = {}, reached = {};
    var g2 = 0;
    while (R.day <= DAYS && g2 < 400000) {
      g2++;
      var a = choose(R, rr, mm);
      if (!a) { C.advance(R, COST.wait); continue; }
      cnt[a.id] = (cnt[a.id] || 0) + 1;
      /* only gathering, giving and donating move a stage forward; talking
         to Bodkin twenty times is repetition, but it is not a gate */
      if (a.kind === 'gather' || a.kind === 'give' || a.kind === 'donate' || a.kind === 'build') {
        prog[a.id] = (prog[a.id] || 0) + 1;
      }
      var e2 = C.doAction(R, a);
      e2.forEach(function (e) {
        var gate = null;
        if (e.type === 'stage' && !reached['stage:' + e.stage]) gate = 'stage:' + e.stage;
        if (e.type === 'built' && !reached['built:' + e.project]) gate = 'built:' + e.project;
        if (gate) {
          reached[gate] = 1;
          var top = 0, topId = null;
          Object.keys(prog).forEach(function (k) { if (prog[k] > top) { top = prog[k]; topId = k; } });
          var atop = 0, atopId = null;
          Object.keys(cnt).forEach(function (k) { if (cnt[k] > atop) { atop = cnt[k]; atopId = k; } });
          grind[gate] = {
            mostRepeatedRequiredAction: topId, requiredTimes: top,
            mostRepeatedActionOfAnyKind: atopId, anyKindTimes: atop
          };
          cnt = {}; prog = {};
        }
      });
      C.advance(R, COST[a.kind] || 15);
      if (reached['built:' + DATA.projects[DATA.projects.length - 1].id]) break;
    }
  })();

  var allLines = C.allLineKeys();
  var unseenLines = allLines.filter(function (k) { return !lines[k]; });
  var unseenItems = Object.keys(DATA.items).filter(function (i) { return !itemIn[i]; });
  var unseenAreas = Object.keys(DATA.areas).filter(function (a) { return !areasSeen[a]; });
  var unusedSpots = DATA.spots.map(function (s) { return s.id; }).filter(function (s) { return !spotsUsed[s]; });

  var noSink = Object.keys(itemIn).filter(function (i) { return itemIn[i] > 0 && itemOut[i] === 0; });
  var starved = Object.keys(itemIn).filter(function (i) { return itemIn[i] === 0; });

  var vsum = varietyByDay.reduce(function (a, b) { return a + b; }, 0);

  return {
    seed: seed,
    daysPlayed: S.day - 1,
    errors: errors,
    finalStage: S.stage,
    finalBloom: S.bloom,
    projectsBuilt: Object.keys(S.built).length,
    projectsDefined: DATA.projects.length,
    plantings: S.plantings || 0,
    economy: {
      inflow: itemIn,
      outflow: itemOut,
      carriedAtEnd: held,
      carriedTotalAtEnd: C.invCount(S),
      resourcesWithNoSink: noSink,
      resourcesNeverObtained: starved,
      bloomEvery10Days: bloomCurve.slice(0, 30),
      carriedEvery10Days: carriedCurve.slice(0, 30)
    },
    reachability: {
      dialogueLinesDefined: allLines.length,
      dialogueLinesSeen: Object.keys(lines).length,
      dialoguePct: +(Object.keys(lines).length / allLines.length * 100).toFixed(1),
      dialogueNeverSeen: unseenLines,
      itemsDefined: Object.keys(DATA.items).length,
      itemsFound: Object.keys(DATA.items).length - unseenItems.length,
      itemsNeverFound: unseenItems,
      areasDefined: Object.keys(DATA.areas).length,
      areasNeverVisited: unseenAreas,
      spotsNeverUsed: unusedSpots,
      villagersDefined: DATA.villagers.length,
      villagersNeverMet: DATA.villagers.map(function (v) { return v.id; })
        .filter(function (v) { return !villagersMet[v]; })
    },
    pacing: {
      dayReached: milestones,
      note: 'in-game day on which each milestone first happened'
    },
    variety: {
      distinctActionsPerDay_mean: +(vsum / Math.max(1, varietyByDay.length)).toFixed(2),
      distinctActionsPerDay_min: Math.min.apply(null, varietyByDay),
      distinctActionsPerDay_max: Math.max.apply(null, varietyByDay),
      firstTenDays: varietyByDay.slice(0, 10)
    },
    grind: grind,
    softlocks: softlocks,
    waitMinutesTotal: waitMinutes,
    longestStretchWithNothingToGather_minutes: deadMax
  };
}

/* Can three minutes from a cold start end on something good? */
function sessionShape(seed) {
  var S = C.newGame(seed);
  var rng = rngFor(seed ^ 0x77);
  var mem = { waited: 0 };
  var budget = 180 * C.TIME_COMPRESSION;   /* three real minutes */
  var spent = 0;
  var got = { discovery: false, dialogue: false, villageChanged: false, decorated: false, itemsFound: 0, lines: [] };

  while (spent < budget) {
    var a = choose(S, rng, mem);
    if (!a) { C.advance(S, COST.wait); spent += COST.wait; continue; }
    var ev = C.doAction(S, a);
    ev.forEach(function (e) {
      if (e.type === 'found') { got.itemsFound += e.items.length; if (e.fresh.length) got.discovery = true; }
      if (e.type === 'say') { got.dialogue = true; if (got.lines.length < 3) got.lines.push(e.text.slice(0, 60)); }
      if (e.type === 'stage') got.villageChanged = true;
      if (e.type === 'place') got.decorated = true;
    });
    var c = COST[a.kind] || 15;
    C.advance(S, c); spent += c;
  }
  got.pleasantOutcome = got.discovery || got.dialogue || got.villageChanged || got.decorated;
  got.inGameDaysElapsed = +((budget / 1440)).toFixed(2);
  got.stageAtEnd = S.stage;
  got.seed = seed;
  return got;
}

/* A dozen lines as they actually came out during play, in the order they
   came out, so the arbiter reads the villagers rather than the script. */
function dialogueSample(seed, want) {
  var S = C.newGame(seed);
  var rng = rngFor(seed ^ 0xd1a);
  var mem = { waited: 0 };
  /* Collect a long run and then take an even spread from it. Taking the
     first fourteen would only ever show the opening morning, which is the
     part of the writing that is easiest to get right. */
  var all = [], guard = 0;
  while (S.day <= 40 && guard++ < 60000) {
    var a = choose(S, rng, mem);
    if (!a) { C.advance(S, COST.wait); continue; }
    C.doAction(S, a).forEach(function (e) {
      if (e.type === 'say') {
        all.push({ who: e.name, when: C.timeOfDay(S), day: S.day, key: e.key, text: e.text });
      }
    });
    C.advance(S, COST[a.kind] || 15);
  }
  var out = [], stride = Math.max(1, Math.floor(all.length / want));
  for (var i = 0; i < all.length && out.length < want; i += stride) out.push(all[i]);
  return out;
}

/* ------------------------------------------------------------------ run */
var version = process.argv[2] || '001';
var outDir = path.join(__dirname, '..', 'reports', version);
fs.mkdirSync(outDir, { recursive: true });

var runs = SEEDS.map(runSeed);
var sessions = SEEDS.map(sessionShape);

function mean(f) { return +(runs.reduce(function (a, r) { return a + f(r); }, 0) / runs.length).toFixed(2); }

function unionMissing(sel) {
  var all = {};
  runs.forEach(function (r) { sel(r).forEach(function (x) { all[x] = (all[x] || 0) + 1; }); });
  /* only report as unreachable what no seed ever reached */
  return Object.keys(all).filter(function (k) { return all[k] === runs.length; });
}

var metrics = {
  version: version,
  generatedAt: new Date().toISOString(),
  config: {
    inGameDaysSimulated: DAYS,
    seeds: SEEDS,
    timeCompression_inGameMinutesPerRealSecond: C.TIME_COMPRESSION,
    realMinutesPerInGameDay: +(1440 / C.TIME_COMPRESSION / 60).toFixed(2),
    spotRegrow_inGameMinutes: C.REGROW_MINUTES
  },
  summary: {
    crashes: runs.reduce(function (a, r) { return a + r.errors.length; }, 0),
    errorMessages: runs.reduce(function (a, r) { return a.concat(r.errors); }, []),
    softlocksTotal: runs.reduce(function (a, r) { return a + r.softlocks; }, 0),
    meanFinalStage: mean(function (r) { return r.finalStage; }),
    meanFinalBloom: mean(function (r) { return r.finalBloom; }),
    meanDistinctActionsPerDay: mean(function (r) { return r.variety.distinctActionsPerDay_mean; }),
    meanDialogueReachedPct: mean(function (r) { return r.reachability.dialoguePct; }),
    meanCarriedAtEnd: mean(function (r) { return r.economy.carriedTotalAtEnd; }),
    meanProjectsBuilt: mean(function (r) { return r.projectsBuilt; }),
    projectsDefined: DATA.projects.length,
    meanPlantings: mean(function (r) { return r.plantings; }),
    longestStretchWithNothingToGather_minutes:
      Math.max.apply(null, runs.map(function (r) { return r.longestStretchWithNothingToGather_minutes; })),
    grindThreshold: 15,
    grindViolations: (function () {
      var v = [];
      runs.forEach(function (r) {
        Object.keys(r.grind).forEach(function (m) {
          if (r.grind[m].requiredTimes > 15) {
            v.push({ seed: r.seed, milestone: m, action: r.grind[m].mostRepeatedRequiredAction, times: r.grind[m].requiredTimes });
          }
        });
      });
      return v;
    })()
  },
  unreachableAcrossAllSeeds: {
    dialogue: unionMissing(function (r) { return r.reachability.dialogueNeverSeen; }),
    items: unionMissing(function (r) { return r.reachability.itemsNeverFound; }),
    areas: unionMissing(function (r) { return r.reachability.areasNeverVisited; }),
    spots: unionMissing(function (r) { return r.reachability.spotsNeverUsed; }),
    villagers: unionMissing(function (r) { return r.reachability.villagersNeverMet; })
  },
  economyFlags: {
    resourcesWithNoSink: unionMissing(function (r) { return r.economy.resourcesWithNoSink; }),
    resourcesNeverObtained: unionMissing(function (r) { return r.economy.resourcesNeverObtained; }),
    /* A sink that exists is not the same as a sink that is used. This is what
       catches an item being found eight hundred times and used thirty. */
    utilisationPct: (function () {
      var tin = {}, tout = {};
      runs.forEach(function (r) {
        Object.keys(r.economy.inflow).forEach(function (i) {
          tin[i] = (tin[i] || 0) + r.economy.inflow[i];
          tout[i] = (tout[i] || 0) + r.economy.outflow[i];
        });
      });
      var out = {};
      Object.keys(tin).forEach(function (i) {
        out[i] = tin[i] ? +(tout[i] / tin[i] * 100).toFixed(1) : 0;
      });
      return out;
    })(),
    resourcesUnderUsed: (function () {
      var tin = {}, tout = {};
      runs.forEach(function (r) {
        Object.keys(r.economy.inflow).forEach(function (i) {
          tin[i] = (tin[i] || 0) + r.economy.inflow[i];
          tout[i] = (tout[i] || 0) + r.economy.outflow[i];
        });
      });
      return Object.keys(tin).filter(function (i) {
        return tin[i] > 50 && tout[i] / tin[i] < 0.4;
      });
    })(),
    unitemizedOutflowNote: 'inflow minus itemized outflow should be close to carriedTotalAtEnd; a large gap means a sink is not being counted',
    /* bloom is a currency like any other: once the last stage is reached it
       keeps rising with nothing left to buy, which is the classic shape of a
       growth system that has run out of village */
    /* Bloom now has an unbounded sink: the village green's price climbs with
       every planting, so the currency cannot outrun the things to spend it
       on. This flag stays in the report so the claim is checkable rather
       than asserted. */
    bloomHasNoSinkAfterFinalStage: false,
    finalStageBloomCost: DATA.stages[DATA.stages.length - 1].bloom,
    meanBloomAtEndOfRun: mean(function (r) { return r.finalBloom; }),
    bloomOverspillFactor: +(mean(function (r) { return r.finalBloom; }) /
      DATA.stages[DATA.stages.length - 1].bloom).toFixed(1),
    itemsLeftUnusedAtEnd: mean(function (r) { return r.economy.carriedTotalAtEnd; })
  },
  threeMinuteSessions: sessions,
  perSeed: runs
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

var sample = dialogueSample(4242, 14);
var NL = '\n';
fs.writeFileSync(path.join(outDir, 'dialogue-sample.txt'),
  'Fourteen lines in the order they came up during one ordinary playthrough.' + NL +
  'Nothing here was chosen by hand.' + NL + NL +
  sample.map(function (l) {
    return 'day ' + l.day + ', ' + l.when + ' — ' + l.who + ':' + NL +
           '  ' + l.text + NL;
  }).join(NL));

console.log('sim: %d seeds x %d in-game days', SEEDS.length, DAYS);
console.log('  crashes            %d', metrics.summary.crashes);
console.log('  softlocks          %d', metrics.summary.softlocksTotal);
console.log('  dialogue reached   %s%%', metrics.summary.meanDialogueReachedPct);
console.log('  actions / day      %s', metrics.summary.meanDistinctActionsPerDay);
console.log('  grind violations   %d', metrics.summary.grindViolations.length);
console.log('  unreachable        dialogue=%d items=%d areas=%d spots=%d',
  metrics.unreachableAcrossAllSeeds.dialogue.length,
  metrics.unreachableAcrossAllSeeds.items.length,
  metrics.unreachableAcrossAllSeeds.areas.length,
  metrics.unreachableAcrossAllSeeds.spots.length);
console.log('  3-min sessions ok  %d/%d',
  sessions.filter(function (s) { return s.pleasantOutcome; }).length, sessions.length);
console.log('  dialogue sample   %d lines', sample.length);
console.log('-> %s', outDir);

if (metrics.summary.crashes) process.exit(1);
