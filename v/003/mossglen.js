/* Mossglen.

   The top half of this file is the core: plain functions over a plain state
   object, with no DOM anywhere. The headless simulation bot loads exactly
   this half, which is the only way its numbers mean anything.

   The bottom half is the browser: canvas, taps, panels. It runs only when
   there is a document to run in. */

var DATA = (typeof MOSSGLEN_DATA !== 'undefined') ? MOSSGLEN_DATA : require('./mossglen-data.js');

/* Freeze scripts rewrite this line. It namespaces the save so that opening a
   new version never disturbs an older one sitting in the same origin. */
var VERSION = '003';

/* In-game minutes per real second. A day is 1440 minutes, so 6 means an
   in-game day passes in four real minutes. This is the tuning dial. */
var TIME_COMPRESSION = 6;

var SAVE_V = 1;
var REGROW_MINUTES = 120;      /* a gathering spot comes back after two in-game hours */
/* Portrait, because a phone is portrait. A near-square stage leaves a
   third of the screen empty no matter how it is scaled. */
var WORLD_W = 176, WORLD_H = 304;

/* ------------------------------------------------------------------ rng */
/* mulberry32 — small, seedable, and the same in the browser and in Node, so
   a screenshot at seed 7 is the same clearing the simulation walked. */
function makeRng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(pool, rng) {
  var total = 0, i;
  for (i = 0; i < pool.length; i++) total += pool[i][1];
  var r = rng() * total;
  for (i = 0; i < pool.length; i++) {
    r -= pool[i][1];
    if (r <= 0) return pool[i][0];
  }
  return pool[pool.length - 1][0];
}

/* ---------------------------------------------------------------- state */
function newGame(seed) {
  var S = {
    v: SAVE_V,
    seed: seed >>> 0,
    rolls: 0,
    day: 1,
    minute: 7 * 60,
    area: 'clearing',
    px: 84, py: 212,
    inv: {},
    seen: {},
    home: [null, null, null, null, null, null],
    bloom: 0,       /* the purse — spent on projects and planting */
    bloomEver: 0,   /* the high-water mark — what the village has grown on */
    stage: 1,
    spots: {},
    built: {},
    plantings: 0,
    vill: {},
    seenLines: {}
  };
  DATA.villagers.forEach(function (v) {
    S.vill[v.id] = { met: false, stageSeen: 1, said: {}, idle: {}, wishIdx: 0, given: 0, wishDay: 0 };
  });
  return S;
}

/* What this villager is hoping someone brings them. Wishes cycle forever, so
   there is always something to look for and never a last one. */
function currentWish(S, v) {
  return v.wishes[(S.vill[v.id].wishIdx || 0) % v.wishes.length];
}

/* Each villager hopes for one thing a day. Nothing is lost by being late —
   tomorrow they hope again — but handing over four things in an afternoon
   turns a small kindness into an errand. */
function wishOpen(S, v) {
  return S.day > (S.vill[v.id].wishDay || 0);
}

/* The rng is rebuilt from (seed, rolls) rather than stored, so a saved game
   resumes on exactly the sequence it left off on. */
function roll(S) {
  S.rolls++;
  return makeRng((S.seed + S.rolls * 2654435761) >>> 0)();
}

function nowMinutes(S) { return (S.day - 1) * 1440 + S.minute; }

function timeOfDay(S) {
  var h = Math.floor(S.minute / 60);
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function clockText(S) {
  var h = Math.floor(S.minute / 60), m = Math.floor(S.minute % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/* Time moves only while the player is here. Nothing in this function can
   reduce anything the player owns. */
function advance(S, mins) {
  S.minute += mins;
  while (S.minute >= 1440) { S.minute -= 1440; S.day++; }
  return S;
}

function stageFor(bloom) {
  var st = DATA.stages[0];
  DATA.stages.forEach(function (s) { if (bloom >= s.bloom) st = s; });
  return st;
}

/* Growth is measured against everything the well has ever been given, never
   against what is left in it. A village does not un-build itself because the
   money got spent. */
function bloomEver(S) {
  return typeof S.bloomEver === 'number' ? S.bloomEver : S.bloom;
}

function openAreas(S) {
  return Object.keys(DATA.areas).filter(function (a) {
    return bloomEver(S) >= DATA.areas[a].openAt;
  });
}

function spotById(id) {
  for (var i = 0; i < DATA.spots.length; i++) if (DATA.spots[i].id === id) return DATA.spots[i];
  return null;
}

function spotReady(S, sp) {
  var t = S.spots[sp.id];
  return !t || nowMinutes(S) >= t;
}

/* Villagers drift with the village. This is one of the seams that keeps the
   pillars tied together: growing the village changes who you run into where. */
function villagerArea(S, v) {
  var t = timeOfDay(S);
  if (v.id === 'marla' && S.stage >= 2 && (t === 'day' || t === 'evening')) return 'pondpath';
  if (v.id === 'bodkin' && S.stage >= 3 && (t === 'night' || t === 'morning')) return 'hollow';
  return v.home;
}

function villagerById(id) {
  for (var i = 0; i < DATA.villagers.length; i++) if (DATA.villagers[i].id === id) return DATA.villagers[i];
  return null;
}

function invCount(S) {
  var n = 0;
  for (var k in S.inv) n += S.inv[k];
  return n;
}

function heldItems(S) {
  return Object.keys(S.inv).filter(function (k) { return S.inv[k] > 0; }).sort();
}

function homeItems(S) {
  return S.home.filter(function (x) { return !!x; });
}


/* What a roomful of things adds up to. A tag that three or more placed items
   share is the room's character; failing that, a room with every surface used
   is its own statement. Returns null for a room that has not decided yet. */
function roomMood(S) {
  var placed = homeItems(S);
  if (!placed.length) return null;
  var count = {};
  placed.forEach(function (it) {
    (DATA.items[it].tags || []).forEach(function (t) {
      if (DATA.roomMoods[t]) count[t] = (count[t] || 0) + 1;
    });
  });
  var best = null, n = 0;
  Object.keys(count).sort().forEach(function (t) {
    if (count[t] > n) { n = count[t]; best = t; }
  });
  if (best && n >= 3) return best;
  if (placed.length >= DATA.homeSlots.length) return 'full';
  return null;
}

/* -------------------------------------------------------------- actions */
/* One list, read by both the tap handler and the simulation. If an action
   is not in here it does not exist. */
function listActions(S) {
  var out = [];
  if (S.area === 'home') {
    DATA.homeSlots.forEach(function (sl, i) {
      if (S.home[i]) {
        out.push({ id: 'unplace:' + i, kind: 'unplace', slot: i, label: 'take back the ' + DATA.items[S.home[i]].name.toLowerCase() });
      } else {
        heldItems(S).forEach(function (it) {
          out.push({ id: 'place:' + i + ':' + it, kind: 'place', slot: i, item: it, label: 'put the ' + DATA.items[it].name.toLowerCase() + ' on the ' + sl.name });
        });
      }
    });
    out.push({ id: 'travel:clearing', kind: 'travel', area: 'clearing', label: 'step outside' });
    return out;
  }

  DATA.spots.forEach(function (sp) {
    if (sp.area === S.area && spotReady(S, sp)) {
      out.push({ id: 'gather:' + sp.id, kind: 'gather', spot: sp.id, label: 'search the ' + sp.name });
    }
  });
  DATA.villagers.forEach(function (v) {
    if (villagerArea(S, v) !== S.area) return;
    out.push({ id: 'talk:' + v.id, kind: 'talk', who: v.id, label: 'talk to ' + v.name });
    var w = currentWish(S, v);
    if (S.inv[w] && S.vill[v.id].met && wishOpen(S, v)) {
      out.push({ id: 'give:' + v.id, kind: 'give', who: v.id, item: w,
        label: 'give ' + v.name + ' the ' + DATA.items[w].name.toLowerCase() });
    }
  });
  if (S.area === 'clearing') {
    heldItems(S).forEach(function (it) {
      out.push({ id: 'donate:' + it, kind: 'donate', item: it, label: 'drop the ' + DATA.items[it].name.toLowerCase() + ' in the well' });
    });
    var pr = nextProject(S);
    if (pr && canAfford(S, pr)) {
      out.push({ id: 'build:' + pr.id, kind: 'build', project: pr.id, label: 'build ' + pr.name.toLowerCase() });
    }
    plantableItems(S).forEach(function (it) {
      out.push({ id: 'plant:' + it, kind: 'plant', item: it,
        label: 'plant ' + DATA.items[it].name.toLowerCase() + ' in the green' });
    });
    out.push({ id: 'travel:home', kind: 'travel', area: 'home', label: 'go inside' });
  }
  openAreas(S).forEach(function (a) {
    if (a !== S.area) out.push({ id: 'travel:' + a, kind: 'travel', area: a, label: 'walk to ' + DATA.areas[a].name });
  });
  return out;
}

function doAction(S, act) {
  var ev = [];
  if (act.kind === 'gather') return actGather(S, act, ev);
  if (act.kind === 'talk') return actTalk(S, act, ev);
  if (act.kind === 'give') return actGive(S, act, ev);
  if (act.kind === 'build') return actBuild(S, act, ev);
  if (act.kind === 'plant') return actPlant(S, act, ev);
  if (act.kind === 'donate') return actDonate(S, act, ev);
  if (act.kind === 'place') return actPlace(S, act, ev);
  if (act.kind === 'unplace') return actUnplace(S, act, ev);
  if (act.kind === 'travel') { S.area = act.area; ev.push({ type: 'travel', area: act.area }); return ev; }
  return ev;
}


/* ------------------------------------------------------ village projects */
/* Projects unlock in order, so there is always exactly one next thing. The
   green is the last named one and it never closes: from then on anything
   gathered can go into the ground, for ever, at a bloom price that climbs.
   That is what stops bloom becoming a number that only goes up. */
function nextProject(S) {
  for (var i = 0; i < DATA.projects.length; i++) {
    if (!S.built[DATA.projects[i].id]) return DATA.projects[i];
  }
  return null;
}

function projectById(id) {
  for (var i = 0; i < DATA.projects.length; i++) if (DATA.projects[i].id === id) return DATA.projects[i];
  return null;
}

function builtProjects(S) {
  return DATA.projects.filter(function (p) { return !!S.built[p.id]; });
}

function canAfford(S, pr) {
  if (S.bloom < pr.bloom) return false;
  for (var it in pr.needs) if ((S.inv[it] || 0) < pr.needs[it]) return false;
  return true;
}

/* What is still outstanding, so the board can say so plainly rather than
   just refusing. Nothing here is a deadline; it is a shopping list. */
function projectShortfall(S, pr) {
  var out = [];
  for (var it in pr.needs) {
    var short = pr.needs[it] - (S.inv[it] || 0);
    if (short > 0) out.push({ item: it, need: pr.needs[it], have: S.inv[it] || 0, short: short });
  }
  return out;
}

function plantingOpen(S) {
  return DATA.projects.some(function (p) { return p.unlocksPlanting && S.built[p.id]; });
}

function plantingCost(S) {
  return DATA.planting.bloomBase + DATA.planting.bloomStep * (S.plantings || 0);
}

/* Anything at all, five of a kind, goes into the green. */
function plantableItems(S) {
  if (!plantingOpen(S)) return [];
  var need = DATA.planting.itemsEach;
  if (S.bloom < plantingCost(S)) return [];
  return heldItems(S).filter(function (it) { return S.inv[it] >= need; });
}

function actBuild(S, act, ev) {
  var pr = projectById(act.project);
  if (!pr || S.built[pr.id] || nextProject(S) !== pr || !canAfford(S, pr)) return ev;
  for (var it in pr.needs) {
    S.inv[it] -= pr.needs[it];
    if (S.inv[it] <= 0) delete S.inv[it];
  }
  S.bloom -= pr.bloom;
  S.built[pr.id] = 1;
  var v = villagerById(pr.by);
  var key = 'project.' + pr.id + '.done';
  S.seenLines[key] = 1;
  ev.push({ type: 'built', project: pr.id, name: pr.name });
  ev.push({ type: 'say', who: v.id, name: v.name, sprite: v.sprite, text: pr.done, key: key });
  var next = nextProject(S);
  if (next) {
    var nv = villagerById(next.by);
    var nk = 'project.' + next.id + '.pitch';
    S.vill[nv.id].said[nk] = 1;
    S.seenLines[nk] = 1;
    ev.push({ type: 'pitch', who: nv.id, name: nv.name, project: next.id, text: next.pitch, key: nk });
  }
  return ev;
}

function actPlant(S, act, ev) {
  if (!plantingOpen(S)) return ev;
  var need = DATA.planting.itemsEach, cost = plantingCost(S);
  if ((S.inv[act.item] || 0) < need || S.bloom < cost) return ev;
  S.inv[act.item] -= need;
  if (S.inv[act.item] <= 0) delete S.inv[act.item];
  S.bloom -= cost;
  S.plantings = (S.plantings || 0) + 1;
  ev.push({ type: 'planted', item: act.item, plantings: S.plantings });
  return ev;
}

function actGather(S, act, ev) {
  var sp = spotById(act.spot);
  if (!sp || sp.area !== S.area || !spotReady(S, sp)) return ev;
  var n = 1 + (roll(S) < 0.55 ? 1 : 0) + (roll(S) < 0.12 ? 1 : 0);
  var got = [], fresh = [];
  for (var i = 0; i < n; i++) {
    var it = pickWeighted(sp.pool, roll.bind(null, S));
    S.inv[it] = (S.inv[it] || 0) + 1;
    got.push(it);
    if (!S.seen[it]) { S.seen[it] = true; fresh.push(it); }
  }
  S.spots[sp.id] = nowMinutes(S) + REGROW_MINUTES;
  ev.push({ type: 'found', spot: sp.id, items: got, fresh: fresh });
  return ev;
}

/* Giving a villager the thing they hoped for. This is the seam that ties
   gathering to the villagers to the village at once: you find it, they are
   pleased by it, and the village grows more from a wanted thing than from
   the same thing dropped anonymously down the well. */
function actGive(S, act, ev) {
  var v = villagerById(act.who);
  var st = S.vill[v.id];
  var w = currentWish(S, v);
  if (!S.inv[w] || !wishOpen(S, v)) return ev;
  S.inv[w]--;
  if (!S.inv[w]) delete S.inv[w];
  st.wishIdx = (st.wishIdx + 1) % v.wishes.length;
  st.wishDay = S.day;
  st.given++;
  var before = S.stage;
  S.bloom += DATA.items[w].bloom * 2;
  S.bloomEver = bloomEver(S) + DATA.items[w].bloom * 2;
  var stg = stageFor(bloomEver(S));
  S.stage = Math.max(S.stage, stg.n);
  var key = v.id + '.thanks.' + w;
  S.seenLines[key] = 1;
  ev.push({ type: 'say', who: v.id, name: v.name, sprite: v.sprite, text: v.lines.thanks[w], key: key });
  ev.push({ type: 'gave', who: v.id, item: w, bloom: S.bloom });
  if (S.stage > before) ev.push({ type: 'stage', stage: S.stage, name: stg.name, note: stg.note });
  return ev;
}

function actDonate(S, act, ev) {
  if (!S.inv[act.item]) return ev;
  S.inv[act.item]--;
  if (!S.inv[act.item]) delete S.inv[act.item];
  var before = S.stage;
  S.bloom += DATA.items[act.item].bloom;
  S.bloomEver = bloomEver(S) + DATA.items[act.item].bloom;
  var st = stageFor(bloomEver(S));
  S.stage = Math.max(S.stage, st.n);
  ev.push({ type: 'donate', item: act.item, bloom: S.bloom });
  if (S.stage > before) ev.push({ type: 'stage', stage: S.stage, name: st.name, note: st.note });
  return ev;
}

function actPlace(S, act, ev) {
  if (!S.inv[act.item] || S.home[act.slot]) return ev;
  S.inv[act.item]--;
  if (!S.inv[act.item]) delete S.inv[act.item];
  S.home[act.slot] = act.item;
  ev.push({ type: 'place', slot: act.slot, item: act.item });
  return ev;
}

function actUnplace(S, act, ev) {
  var it = S.home[act.slot];
  if (!it) return ev;
  S.home[act.slot] = null;
  S.inv[it] = (S.inv[it] || 0) + 1;
  ev.push({ type: 'unplace', slot: act.slot, item: it });
  return ev;
}

/* ------------------------------------------------------------- dialogue */
/* Priority order is the whole design here. A villager acknowledges the
   village first, then your house, then what you are carrying, and only
   falls back to weather-and-mood when there is nothing of yours to notice.
   That ordering is what makes them feel like they are paying attention. */
function actTalk(S, act, ev) {
  var v = villagerById(act.who);
  var st = S.vill[v.id];
  var L = v.lines, line = null;

  if (!st.met) {
    st.met = true;
    line = { key: v.id + '.meet', text: L.meet };
  }

  if (!line) {
    for (var n = S.stage; n >= 2; n--) {
      if (L.stage[n] && st.stageSeen < n) {
        st.stageSeen = n;
        line = { key: v.id + '.stage.' + n, text: L.stage[n] };
        break;
      }
    }
  }

  /* Guidance comes before chatter. A villager who tells you where you
     cannot go yet, or what they are hoping for, has given you something to
     do; a villager admiring your moss has not. Getting this order wrong
     buries every hint under a pile of pleasantries. */
  if (!line) {
    for (var a in L.hint) {
      if (DATA.areas[a] && bloomEver(S) < DATA.areas[a].openAt) {
        var k3 = v.id + '.hint.' + a;
        if (!st.said[k3]) { st.said[k3] = 1; line = { key: k3, text: L.hint[a] }; }
        break;
      }
    }
  }

  /* The person who wants the next thing built is the person who brings it
     up. This is the edge that turns "gather more stuff" into "Pim would like
     a bench", which is the same request with a reason attached. */
  if (!line) {
    var pr = nextProject(S);
    if (pr && pr.by === v.id) {
      var kp = 'project.' + pr.id + '.pitch';
      if (!st.said[kp]) { st.said[kp] = 1; line = { key: kp, text: pr.pitch }; }
    }
  }

  if (!line && plantingOpen(S)) {
    var kg = v.id + '.planting';
    if (!st.said[kg]) { st.said[kg] = 1; line = { key: kg, text: DATA.planting.lines[v.id] }; }
  }

  if (!line) {
    var w = currentWish(S, v);
    var kw = v.id + '.wish.' + w;
    if (!st.said[kw] && !S.inv[w]) { st.said[kw] = 1; line = { key: kw, text: L.wishLines[w] }; }
  }

  if (!line) {
    var mood = roomMood(S);
    if (mood) {
      var km = v.id + '.room.' + mood;
      if (!st.said[km]) { st.said[km] = 1; line = { key: km, text: DATA.roomMoods[mood][v.id] }; }
    }
  }

  if (!line) {
    var placed = homeItems(S);
    for (var i = 0; i < placed.length; i++) {
      var k = v.id + '.home.' + placed[i];
      if (L.home[placed[i]] && !st.said[k]) { st.said[k] = 1; line = { key: k, text: L.home[placed[i]] }; break; }
    }
    if (!line && placed.length) {
      var ka = v.id + '.home.any';
      if (!st.said[ka]) { st.said[ka] = 1; line = { key: ka, text: L.home.any }; }
    }
  }

  if (!line) {
    var held = heldItems(S);
    for (var j = 0; j < held.length; j++) {
      var k2 = v.id + '.item.' + held[j];
      if (L.item[held[j]] && !st.said[k2]) { st.said[k2] = 1; line = { key: k2, text: L.item[held[j]] }; break; }
    }
    if (!line && held.length) {
      var kb = v.id + '.item.any';
      if (!st.said[kb]) { st.said[kb] = 1; line = { key: kb, text: L.item.any }; }
    }
  }

  if (!line) {
    var tod = timeOfDay(S);
    var pool = L.idle[tod];
    var idx = st.idle[tod] || 0;
    line = { key: v.id + '.idle.' + tod + '.' + idx, text: pool[idx % pool.length] };
    st.idle[tod] = (idx + 1) % pool.length;
  }

  S.seenLines[line.key] = 1;
  ev.push({ type: 'say', who: v.id, name: v.name, sprite: v.sprite, text: line.text, key: line.key });
  return ev;
}

/* Every line the writing defines, so reachability can be measured against
   something real rather than against what happened to come up. */
function allLineKeys() {
  var keys = [];
  DATA.villagers.forEach(function (v) {
    var L = v.lines;
    keys.push(v.id + '.meet');
    Object.keys(L.stage).forEach(function (n) { keys.push(v.id + '.stage.' + n); });
    Object.keys(L.home).forEach(function (i) { keys.push(v.id + '.home.' + i); });
    Object.keys(L.item).forEach(function (i) { keys.push(v.id + '.item.' + i); });
    Object.keys(L.hint).forEach(function (a) { keys.push(v.id + '.hint.' + a); });
    Object.keys(L.wishLines).forEach(function (i) { keys.push(v.id + '.wish.' + i); });
    Object.keys(L.thanks).forEach(function (i) { keys.push(v.id + '.thanks.' + i); });
    keys.push(v.id + '.planting');
    Object.keys(DATA.roomMoods).forEach(function (m) { keys.push(v.id + '.room.' + m); });
    Object.keys(L.idle).forEach(function (tod) {
      L.idle[tod].forEach(function (_, i) { keys.push(v.id + '.idle.' + tod + '.' + i); });
    });
  });
  DATA.projects.forEach(function (p) {
    keys.push('project.' + p.id + '.pitch');
    keys.push('project.' + p.id + '.done');
  });
  return keys;
}

var CORE = {
  DATA: DATA, VERSION: VERSION, TIME_COMPRESSION: TIME_COMPRESSION,
  roomMood: roomMood,
  nextProject: nextProject, projectById: projectById, builtProjects: builtProjects,
  canAfford: canAfford, projectShortfall: projectShortfall,
  plantingOpen: plantingOpen, plantingCost: plantingCost, plantableItems: plantableItems,
  REGROW_MINUTES: REGROW_MINUTES, WORLD_W: WORLD_W, WORLD_H: WORLD_H,
  makeRng: makeRng, newGame: newGame, advance: advance, nowMinutes: nowMinutes,
  timeOfDay: timeOfDay, clockText: clockText, stageFor: stageFor, openAreas: openAreas,
  bloomEver: bloomEver,
  spotById: spotById, spotReady: spotReady, villagerArea: villagerArea,
  villagerById: villagerById, currentWish: currentWish, wishOpen: wishOpen,
  heldItems: heldItems, homeItems: homeItems,
  invCount: invCount, listActions: listActions, doAction: doAction,
  allLineKeys: allLineKeys
};
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;

/* ==================================================================== */
/* Everything below needs a browser.                                     */
/* ==================================================================== */
if (typeof document !== 'undefined') (function () {

  /* Freeze scripts rewrite this line too, so a frozen version reads the
     assets sitting beside it rather than the working copy's. */
  var ASSETS = 'assets/';

  var KEY = 'mossglen:v' + VERSION + ':save';
  var S = null, SCALE = 4, sprites = {}, ready = false;
  var canvas, ctx, elDay, elWhere, elLog, elPanel, elSay;
  var walkTo = null, pending = null, bob = 0, pickingSlot = -1;
  var wander = {};

  /* ---------------------------------------------------------- sprites */
  var SPRITE_NAMES = [
    'char_player', 'char_pim', 'char_marla', 'char_bodkin',
    'port_pim', 'port_marla', 'port_bodkin',
    'item_moss', 'item_berries', 'item_pebble', 'item_mushroom', 'item_feather',
    'item_glassbead', 'item_acorn', 'item_pinecone', 'item_snailshell', 'item_reed',
    'prop_bush', 'prop_bush_berries', 'prop_mossrock', 'prop_stump', 'prop_reeds',
    'prop_tree', 'prop_well', 'prop_house', 'prop_signpost',
    'prop_bench', 'prop_lantern', 'prop_flowerbed', 'prop_bridge'
  ];

  function loadSprites(done) {
    var left = SPRITE_NAMES.length;
    SPRITE_NAMES.forEach(function (n) {
      var img = new Image();
      img.onload = img.onerror = function () { if (--left === 0) done(); };
      img.src = ASSETS + n + '.png';
      sprites[n] = img;
    });
  }

  function spr(name) { return sprites[name]; }

  /* ------------------------------------------------------------- save */
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full or blocked; play on */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== SAVE_V || typeof d.day !== 'number' || !d.vill) return null;
      if (typeof d.bloomEver !== 'number') {
        /* a save from before growth and spending were separated: credit it
           with at least what its current stage would have required */
        var reached = DATA.stages.filter(function (x) { return x.n <= (d.stage || 1); }).pop();
        d.bloomEver = Math.max(d.bloom || 0, reached ? reached.bloom : 0);
      }
      DATA.villagers.forEach(function (v) {
        var vs = d.vill[v.id];
        if (!vs) vs = d.vill[v.id] = { met: false, stageSeen: 1, said: {}, idle: {} };
        if (typeof vs.wishIdx !== 'number') vs.wishIdx = 0;
        if (typeof vs.given !== 'number') vs.given = 0;
        if (typeof vs.wishDay !== 'number') vs.wishDay = 0;
        if (!vs.said) vs.said = {};
        if (!vs.idle) vs.idle = {};
      });
      return d;
    } catch (e) { return null; }
  }

  /* ---------------------------------------------------------- palette */
  var SKY = {
    meadow: { morning: '#cfe3b4', day: '#c2dda6', evening: '#c8d69c', night: '#5c7a72' },
    water:  { morning: '#bfdcd8', day: '#b2d6d4', evening: '#bcd0c0', night: '#4f6f74' },
    dusk:   { morning: '#b6c8a4', day: '#aec39c', evening: '#b0bc90', night: '#4a5f60' }
  };
  var TINT = {
    morning: 'rgba(255,226,170,0.14)',
    day: null,
    evening: 'rgba(255,146,72,0.20)',
    night: 'rgba(38,48,104,0.42)'
  };

  /* --------------------------------------------------------- geometry */
  function areaProps() {
    if (S.area === 'home') return [];
    return (DATA.areas[S.area].props || []).slice();
  }

  function areaSpots() {
    return DATA.spots.filter(function (sp) { return sp.area === S.area; });
  }

  function areaVillagers() {
    return DATA.villagers.filter(function (v) { return villagerArea(S, v) === S.area; });
  }

  function vpos(v) {
    if (!wander[v.id] || wander[v.id].area !== S.area) {
      wander[v.id] = { area: S.area, x: v.x, y: v.y, tx: v.x, ty: v.y, wait: 0 };
    }
    return wander[v.id];
  }

  /* A mossy rock is 18 world pixels wide; a thumb is not. Tap targets are
     grown around the sprite to at least MIN_HIT world pixels, which lands
     near 60 CSS px on a phone. */
  var MIN_HIT = 30;
  function hitBox(x, y, w, h) {
    var mw = Math.max(w, MIN_HIT), mh = Math.max(h, MIN_HIT);
    return { x: x + w / 2 - mw / 2, y: y + h / 2 - mh / 2, w: mw, h: mh };
  }

  function hotspots() {
    var hs = [];
    if (S.area === 'home') {
      DATA.homeSlots.forEach(function (sl, i) {
        hs.push({ box: hitBox(sl.x - 8, sl.y - 8, 16, 16), tap: function () { slotTapped(i); }, walk: null });
      });
      hs.push({ box: { x: 134, y: 116, w: 44, h: 172 }, tap: function () { go('clearing'); }, walk: null });
      return hs;
    }
    areaSpots().forEach(function (sp) {
      var im = spr(sp.sprite);
      hs.push({
        box: hitBox(sp.x, sp.y, im ? im.width : 16, im ? im.height : 16),
        walk: [sp.x + (im ? im.width : 16) / 2, sp.y + (im ? im.height : 16) + 6],
        tap: function () { fire({ kind: 'gather', spot: sp.id }); }
      });
    });
    areaVillagers().forEach(function (v) {
      var p = vpos(v);
      hs.push({
        box: hitBox(p.x, p.y, 16, 22),
        walk: [p.x + 8, p.y + 26],
        tap: function () { fire({ kind: 'talk', who: v.id }); }
      });
    });
    (DATA.areas[S.area].props || []).forEach(function (pr) {
      var im = spr(pr.sprite);
      if (pr.id === 'house') {
        hs.push({ box: hitBox(pr.x, pr.y, im ? im.width : 24, im ? im.height : 24), walk: [pr.x + 12, pr.y + 30], tap: function () { go('home'); } });
      }
    });
    if (S.area === 'clearing') {
      (DATA.areas.clearing.props || []).forEach(function (pr) {
        var im = spr(pr.sprite);
        var w = im ? im.width : 20, h = im ? im.height : 22;
        if (pr.id === 'well') hs.push({ box: hitBox(pr.x, pr.y, w, h), walk: [pr.x + w / 2, pr.y + h + 8], tap: openWell });
        if (pr.id === 'signpost') hs.push({ box: hitBox(pr.x, pr.y, w, h), walk: [pr.x + w / 2, pr.y + h + 8], tap: openBoard });
      });
    } else {
      hs.push({ box: { x: 2, y: WORLD_H - 42, w: 44, h: 40 }, tap: openTravel, walk: null });
    }
    return hs;
  }

  /* ----------------------------------------------------------- render */
  function layout() {
    var box = canvas.parentNode.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var s = Math.max(1, Math.floor((box.width * dpr) / WORLD_W));
    var used = 0;
    ['hud', 'log', 'bar'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) used += el.getBoundingClientRect().height;
    });
    var maxH = (window.innerHeight - used - 22) * dpr;
    while (s > 1 && WORLD_H * s > maxH) s--;
    SCALE = s;
    canvas.width = WORLD_W * s;
    canvas.height = WORLD_H * s;
    canvas.style.width = (WORLD_W * s / dpr) + 'px';
    canvas.style.height = (WORLD_H * s / dpr) + 'px';
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  }

  function px(v) { return Math.round(v) * SCALE; }

  function blit(name, x, y) {
    var im = spr(name);
    if (!im || !im.width) return;
    ctx.drawImage(im, px(x), px(y), im.width * SCALE, im.height * SCALE);
  }

  function shadow(x, y, w) {
    ctx.fillStyle = 'rgba(50,60,45,0.16)';
    ctx.beginPath();
    ctx.ellipse(px(x), px(y), (w / 2) * SCALE, (w / 5) * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Deterministic scatter so the ground has texture without a tile map and
     without shimmering between frames. */
  function drawGround() {
    var tod = timeOfDay(S);
    var def = DATA.areas[S.area] || { sky: 'meadow' };
    ctx.fillStyle = SKY[def.sky][tod];
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var r = makeRng(({ clearing: 11, pondpath: 23, hollow: 37 })[S.area] || 5);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (var i = 0; i < 26; i++) {
      var cx = r() * WORLD_W, cy = 20 + r() * (WORLD_H - 30), rr = 8 + r() * 18;
      ctx.beginPath();
      ctx.ellipse(px(cx), px(cy), rr * SCALE, (rr * 0.5) * SCALE, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(58,92,52,0.30)';
    for (var j = 0; j < 90; j++) {
      var gx = Math.floor(r() * WORLD_W), gy = 16 + Math.floor(r() * (WORLD_H - 20));
      ctx.fillRect(px(gx), px(gy), SCALE, SCALE * 2);
    }
    /* a handful of flowers, placed by the same fixed seed so they stay put */
    var petals = S.area === 'hollow' ? ['#d8a0c8', '#a88cc4', '#c8b0e0'] : ['#f5cd74', '#faf6ec', '#d8a0c8', '#b7d98a'];
    var blooms = 16 + Math.min(84, Math.floor(S.plantings || 0));
    for (var k = 0; k < blooms; k++) {
      var fx = Math.floor(r() * (WORLD_W - 6)) + 3;
      var fy = 70 + Math.floor(r() * (WORLD_H - 84));
      ctx.fillStyle = 'rgba(58,92,52,0.45)';
      ctx.fillRect(px(fx), px(fy + 2), SCALE, SCALE * 2);
      ctx.fillStyle = petals[k % petals.length];
      ctx.fillRect(px(fx), px(fy), SCALE, SCALE);
      ctx.fillRect(px(fx - 1), px(fy + 1), SCALE, SCALE);
      ctx.fillRect(px(fx + 1), px(fy + 1), SCALE, SCALE);
    }

    if (S.area === 'pondpath') {
      ctx.fillStyle = 'rgba(96,150,168,0.60)';
      ctx.fillRect(0, px(266), canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(190,225,235,0.45)';
      for (var w = 0; w < 14; w++) {
        var wx = Math.floor(r() * WORLD_W), wy = 270 + Math.floor(r() * 30);
        ctx.fillRect(px(wx), px(wy), SCALE * (2 + Math.floor(r() * 4)), SCALE);
      }
    }
  }

  /* Your house, drawn front-on and nothing else.

     The previous version mixed four projections in one room — shelves in
     elevation, a rug and a bed from above, a table in side view carrying a
     top-down object — and it read as a collage. Everything here is seen from
     the front, standing on one floor line, and every slot sits on a surface
     that is genuinely underneath it. */
  function drawHome() {
    var FLOOR = 196, tod = timeOfDay(S);

    /* wall */
    ctx.fillStyle = '#e3caa2';
    ctx.fillRect(0, 0, canvas.width, px(FLOOR));
    ctx.fillStyle = 'rgba(198,166,124,0.45)';
    for (var i = 0; i < WORLD_W; i += 11) ctx.fillRect(px(i), 0, SCALE, px(FLOOR));
    ctx.fillStyle = '#b98d5c';
    ctx.fillRect(0, px(FLOOR - 6), canvas.width, px(6));
    ctx.fillStyle = '#8a6540';
    ctx.fillRect(0, px(FLOOR - 2), canvas.width, px(2));

    /* floorboards, running across because we are looking straight at them */
    ctx.fillStyle = '#a8784c';
    ctx.fillRect(0, px(FLOOR), canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(126,88,54,0.55)';
    for (var f = FLOOR + 10; f < WORLD_H; f += 10) ctx.fillRect(0, px(f), canvas.width, SCALE);
    ctx.fillStyle = 'rgba(226,190,146,0.20)';
    for (var f2 = FLOOR + 4; f2 < WORLD_H; f2 += 10) ctx.fillRect(0, px(f2), canvas.width, SCALE);

    /* window */
    ctx.fillStyle = '#5d4230';
    ctx.fillRect(px(56), px(12), px(64), px(52));
    ctx.fillStyle = SKY.meadow[tod];
    ctx.fillRect(px(60), px(16), px(56), px(44));
    ctx.fillStyle = 'rgba(74,124,66,0.65)';
    ctx.fillRect(px(60), px(44), px(56), px(16));
    ctx.fillStyle = 'rgba(52,96,50,0.75)';
    ctx.fillRect(px(96), px(26), px(14), px(18));
    ctx.fillRect(px(66), px(34), px(10), px(10));
    ctx.fillStyle = '#5d4230';
    ctx.fillRect(px(85), px(12), SCALE * 2, px(52));
    ctx.fillRect(px(60), px(36), px(56), SCALE * 2);
    ctx.fillStyle = '#8a5f3a';
    ctx.fillRect(px(50), px(62), px(76), px(6));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(50), px(68), px(76), px(2));

    /* picture */
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(130), px(20), px(34), px(28));
    ctx.fillStyle = '#cfe0b4';
    ctx.fillRect(px(133), px(23), px(28), px(22));
    ctx.fillStyle = '#7fa864';
    ctx.fillRect(px(133), px(36), px(28), px(9));
    ctx.fillStyle = '#5a8a48';
    ctx.fillRect(px(141), px(29), px(5), px(7));
    ctx.fillRect(px(151), px(31), px(4), px(5));

    /* shelves */
    ctx.fillStyle = '#8a5f3a';
    ctx.fillRect(px(8), px(106), px(50), px(6));
    ctx.fillRect(px(118), px(106), px(50), px(6));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(14), px(112), px(5), px(7));
    ctx.fillRect(px(47), px(112), px(5), px(7));
    ctx.fillRect(px(124), px(112), px(5), px(7));
    ctx.fillRect(px(157), px(112), px(5), px(7));

    /* the doorway, and a woven mat in front of it instead of a word */
    ctx.fillStyle = '#4a3322';
    ctx.fillRect(px(140), px(118), px(34), px(78));
    ctx.fillStyle = '#7a5433';
    ctx.fillRect(px(143), px(121), px(28), px(75));
    ctx.fillStyle = '#c9a267';
    ctx.fillRect(px(147), px(125), px(20), px(71));
    ctx.fillStyle = 'rgba(90,62,38,0.35)';
    for (var d = 129; d < 194; d += 8) ctx.fillRect(px(147), px(d), px(20), SCALE);
    ctx.fillStyle = '#e6b653';
    ctx.fillRect(px(150), px(158), px(4), px(5));
    drawMat();

    /* bed, seen from the foot */
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(6), px(140), px(9), px(84));
    ctx.fillRect(px(64), px(150), px(9), px(74));
    ctx.fillStyle = '#8c9ec0';
    ctx.fillRect(px(10), px(172), px(58), px(40));
    ctx.fillStyle = '#a8b8d4';
    ctx.fillRect(px(10), px(172), px(58), px(12));
    ctx.fillStyle = '#f2ead6';
    ctx.fillRect(px(14), px(160), px(34), px(14));
    ctx.fillStyle = '#7488ac';
    ctx.fillRect(px(10), px(212), px(58), px(10));
    ctx.fillStyle = '#5d3f28';
    ctx.fillRect(px(12), px(222), px(6), px(12));
    ctx.fillRect(px(60), px(222), px(6), px(12));

    /* table */
    ctx.fillStyle = '#a0703f';
    ctx.fillRect(px(80), px(206), px(58), px(7));
    ctx.fillStyle = '#7a5433';
    ctx.fillRect(px(80), px(213), px(58), px(3));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(86), px(216), px(6), px(34));
    ctx.fillRect(px(126), px(216), px(6), px(34));

    /* stool, in front of the table rather than behind its leg */
    ctx.fillStyle = '#a0703f';
    ctx.fillRect(px(88), px(262), px(30), px(6));
    ctx.fillStyle = '#7a5433';
    ctx.fillRect(px(88), px(268), px(30), px(2));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(92), px(270), px(5), px(20));
    ctx.fillRect(px(109), px(270), px(5), px(20));

    /* crate */
    ctx.fillStyle = '#b0834f';
    ctx.fillRect(px(12), px(250), px(36), px(30));
    ctx.fillStyle = '#8a6540';
    ctx.fillRect(px(12), px(250), px(36), px(4));
    ctx.fillRect(px(12), px(263), px(36), px(3));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(12), px(277), px(36), px(3));
    ctx.fillStyle = 'rgba(107,71,40,0.5)';
    ctx.fillRect(px(29), px(254), SCALE * 2, px(23));

    /* Placed things, and — only while you are choosing — where one could go.
       The dashed outline used to be painted permanently into the room, which
       read as a debug drop-target rather than as furniture. */
    DATA.homeSlots.forEach(function (sl, i) {
      var it = S.home[i];
      if (it) {
        shadowFlat(sl.x, sl.y + 7, 14);
        blit('item_' + it, sl.x - 6, sl.y - 6);
      }
      if (pickingSlot === i) {
        var t = (Date.now() / 320) % (Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,236,160,' + (0.65 + 0.3 * Math.sin(t)).toFixed(2) + ')';
        ctx.lineWidth = Math.max(2, SCALE * 0.75);
        ctx.strokeRect(px(sl.x - 10), px(sl.y - 10), px(20), px(20));
      } else if (!it && invCount(S)) {
        var b = (Date.now() / 900 + i * 0.7) % (Math.PI * 2);
        ctx.fillStyle = 'rgba(255,244,206,' + (0.20 + 0.10 * Math.sin(b)).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(px(sl.x), px(sl.y + 4), SCALE * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /* woven, so it is not the one flat untextured object in the room */
  function drawMat() {
    ctx.fillStyle = '#8a6f98';
    ctx.fillRect(px(142), px(200), px(38), px(18));
    ctx.fillStyle = '#a98cb8';
    ctx.fillRect(px(145), px(203), px(32), px(12));
    ctx.fillStyle = 'rgba(112,88,126,0.55)';
    var m;
    for (m = 147; m < 177; m += 5) ctx.fillRect(px(m), px(203), SCALE, px(12));
    for (m = 205; m < 215; m += 4) ctx.fillRect(px(145), px(m), px(32), SCALE);
  }

  function shadowFlat(x, y, w) {
    ctx.fillStyle = 'rgba(60,40,30,0.20)';
    ctx.beginPath();
    ctx.ellipse(px(x), px(y), (w / 2) * SCALE, (w / 6) * SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    if (!ready) return;
    if (S.area === 'home') {
      drawHome();
    } else {
      drawGround();
      var layers = [];
      (DATA.areas[S.area].props || []).forEach(function (pr) {
        var im = spr(pr.sprite);
        layers.push({ y: pr.y + (im ? im.height : 16), draw: function () { blit(pr.sprite, pr.x, pr.y); } });
      });
      builtProjects(S).forEach(function (bp) {
        if (bp.place.area !== S.area) return;
        var im = spr(bp.place.sprite);
        var h = im ? im.height : 16, w = im ? im.width : 16;
        layers.push({
          y: bp.place.y + h, draw: function () {
            shadow(bp.place.x + w / 2, bp.place.y + h - 1, w * 0.75);
            blit(bp.place.sprite, bp.place.x, bp.place.y);
            if (bp.place.sprite === 'prop_lantern') {
              var g2 = ctx.createRadialGradient(px(bp.place.x + 6), px(bp.place.y + 6), 0,
                                                px(bp.place.x + 6), px(bp.place.y + 6), 40 * SCALE);
              g2.addColorStop(0, 'rgba(255,214,130,0.30)');
              g2.addColorStop(1, 'rgba(255,214,130,0)');
              ctx.fillStyle = g2;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
          }
        });
      });
      areaSpots().forEach(function (sp) {
        var im = spr(sp.sprite);
        var h = im ? im.height : 16, w = im ? im.width : 16;
        var rdy = spotReady(S, sp);
        layers.push({
          y: sp.y + h, draw: function () {
            shadow(sp.x + w / 2, sp.y + h - 1, w * 0.8);
            ctx.globalAlpha = rdy ? 1 : 0.55;
            blit(sp.sprite, sp.x, sp.y);
            ctx.globalAlpha = 1;
            if (rdy) {
              var t = (Date.now() / 460) % (Math.PI * 2);
              ctx.fillStyle = 'rgba(255,240,170,' + (0.45 + 0.35 * Math.sin(t)).toFixed(2) + ')';
              ctx.fillRect(px(sp.x + w - 3), px(sp.y - 4 + Math.sin(t) * 1.2), SCALE * 2, SCALE * 2);
            }
          }
        });
      });
      areaVillagers().forEach(function (v) {
        var p = vpos(v);
        var moving = Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) > 0.6;
        var off = moving ? Math.round(Math.sin(Date.now() / 150)) : 0;
        layers.push({
          y: p.y + 22, draw: function () {
            shadow(p.x + 8, p.y + 21, 13);
            blit(v.sprite, p.x, p.y + off);
          }
        });
      });
      var moving = !!walkTo;
      var poff = moving ? Math.round(Math.sin(Date.now() / 130)) : 0;
      layers.push({
        y: S.py + 22, draw: function () {
          shadow(S.px + 8, S.py + 21, 13);
          blit('char_player', S.px, S.py + poff);
        }
      });
      layers.sort(function (a, b) { return a.y - b.y; });
      layers.forEach(function (l) { l.draw(); });

      if (S.area === 'clearing' && S.stage >= 3) {
        var sign = (DATA.areas.clearing.props || []).filter(function (p) { return p.id === 'signpost'; })[0];
        var lx = sign ? sign.x + 7 : 140, ly = sign ? sign.y + 4 : 104;
        var g = ctx.createRadialGradient(px(lx), px(ly), 0, px(lx), px(ly), 52 * SCALE);
        g.addColorStop(0, 'rgba(255,214,130,0.34)');
        g.addColorStop(1, 'rgba(255,214,130,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    var tint = TINT[timeOfDay(S)];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  }

  /* ------------------------------------------------------------- loop */
  var last = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!ready) return;
    var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
    last = t;
    if (document.hidden) return;

    advance(S, dt * TIME_COMPRESSION);

    if (walkTo) {
      var dx = walkTo[0] - 8 - S.px, dy = walkTo[1] - 22 - S.py;
      var d = Math.sqrt(dx * dx + dy * dy);
      var step = 44 * dt;
      if (d <= step) {
        S.px = walkTo[0] - 8; S.py = walkTo[1] - 22;
        walkTo = null;
        if (pending) { var p = pending; pending = null; p(); }
      } else {
        S.px += (dx / d) * step; S.py += (dy / d) * step;
      }
    }

    areaVillagers().forEach(function (v) {
      var p = vpos(v);
      var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.7) {
        p.wait -= dt;
        if (p.wait <= 0) {
          p.tx = Math.max(6, Math.min(WORLD_W - 22, v.x + (Math.random() - 0.5) * 56));
          p.ty = Math.max(96, Math.min(WORLD_H - 26, v.y + (Math.random() - 0.5) * 48));
          p.wait = 2 + Math.random() * 6;
        }
      } else {
        var s2 = 12 * dt;
        p.x += (dx / d) * Math.min(s2, d);
        p.y += (dy / d) * Math.min(s2, d);
      }
    });

    updateHud();
    draw();
  }

  /* --------------------------------------------------------------- ui */
  function updateHud() {
    var tod = timeOfDay(S);
    var glyph = { morning: '☀', day: '☀', evening: '◕', night: '☾' }[tod];
    elDay.textContent = glyph + ' Day ' + S.day + ' · ' + clockText(S);
    elWhere.textContent = S.area === 'home' ? 'Your house' : DATA.areas[S.area].name;
  }

  function say(text) { elLog.textContent = text; }

  function nameOf(it) { return DATA.items[it].name; }

  function listSentence(arr) {
    var counts = {};
    arr.forEach(function (i) { counts[i] = (counts[i] || 0) + 1; });
    var parts = Object.keys(counts).map(function (i) {
      return counts[i] > 1 ? counts[i] + ' × ' + nameOf(i) : nameOf(i);
    });
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  function handle(events) {
    events.forEach(function (e) {
      if (e.type === 'found') {
        say('You found ' + listSentence(e.items) + '.');
        if (e.fresh.length) {
          setTimeout(function () {
            say('✦ Something new: ' + listSentence(e.fresh) + '.');
          }, 1400);
        }
      } else if (e.type === 'say') {
        showSay(e);
      } else if (e.type === 'donate') {
        say('You let the ' + nameOf(e.item).toLowerCase() + ' go into the well.');
      } else if (e.type === 'built') {
        say('The village built ' + e.name.toLowerCase() + '.');
      } else if (e.type === 'pitch') {
        setTimeout(function () { say(e.name + ' already has another idea: ' + e.text); }, 2600);
      } else if (e.type === 'planted') {
        say('You put the ' + nameOf(e.item).toLowerCase() + ' in the ground. That is ' +
            e.plantings + ' now.');
      } else if (e.type === 'gave') {
        say('You gave the ' + nameOf(e.item).toLowerCase() + ' away, and Mossglen is a little further along for it.');
      } else if (e.type === 'stage') {
        setTimeout(function () { showStage(e); }, 500);
      } else if (e.type === 'place') {
        var mood = roomMood(S);
        say('The ' + nameOf(e.item).toLowerCase() + ' looks right there.' +
            (mood ? '  The room is looking ' + DATA.roomMoods[mood].name + '.' : ''));
      } else if (e.type === 'unplace') {
        say('You take the ' + nameOf(e.item).toLowerCase() + ' back.');
      }
    });
    save();
  }

  function fire(act) {
    var all = listActions(S);
    var match = null;
    for (var i = 0; i < all.length && !match; i++) {
      var a = all[i];
      if (a.kind === act.kind && a.spot === act.spot && a.who === act.who &&
          a.item === act.item && a.slot === act.slot && a.area === act.area) match = a;
    }
    if (!match) {
      if (act.kind === 'gather') say('Nothing more here just now. It will come back.');
      return;
    }
    handle(doAction(S, match));
  }

  function go(area) {
    closePanel();
    fire({ kind: 'travel', area: area });
    walkTo = null; pending = null;
    S.px = 84; S.py = area === 'home' ? WORLD_H - 54 : WORLD_H - 92;
    save();
  }

  /* ------------------------------------------------------------ panels */
  function closePanel() {
    pickingSlot = -1;
    elPanel.className = 'panel';
    elPanel.innerHTML = '';
  }

  function panel(title, bodyEl, sub, short) {
    elPanel.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'phead';
    var h = document.createElement('h2'); h.textContent = title; head.appendChild(h);
    if (sub) { var p = document.createElement('p'); p.textContent = sub; head.appendChild(p); }
    var x = document.createElement('button');
    x.className = 'px'; x.textContent = '×'; x.setAttribute('aria-label', 'close');
    x.onclick = closePanel; head.appendChild(x);
    elPanel.appendChild(head);
    elPanel.appendChild(bodyEl);
    elPanel.className = short ? 'panel open short' : 'panel open';
  }

  function itemGrid(onPick, emptyText) {
    var g = document.createElement('div');
    g.className = 'grid';
    var held = heldItems(S);
    if (!held.length) {
      var e = document.createElement('p');
      e.className = 'empty';
      e.textContent = emptyText;
      g.appendChild(e);
      return g;
    }
    held.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'cell';
      var img = document.createElement('img');
      img.src = ASSETS + 'item_' + it + '.png';
      img.alt = '';
      b.appendChild(img);
      var n = document.createElement('span'); n.className = 'cn'; n.textContent = nameOf(it);
      b.appendChild(n);
      if (S.inv[it] > 1) { var c = document.createElement('em'); c.textContent = S.inv[it]; b.appendChild(c); }
      if (onPick) b.onclick = function () { onPick(it); };
      else b.disabled = true;
      g.appendChild(b);
    });
    return g;
  }

  function openBag() {
    var n = invCount(S);
    panel('Your bag', itemGrid(null, 'Empty for now. The clearing is generous if you look.'),
      n ? 'You are carrying ' + n + (n === 1 ? ' thing.' : ' things.') : null);
  }

  function openWell() {
    var grown = bloomEver(S);
    var st = stageFor(grown);
    var next = null;
    DATA.stages.forEach(function (s) { if (!next && s.bloom > grown) next = s; });

    var wrap = document.createElement('div');
    var bar = document.createElement('div');
    bar.className = 'bloom';
    var fill = document.createElement('i');
    var lo = st.bloom, hi = next ? next.bloom : st.bloom + 1;
    fill.style.width = Math.round(((grown - lo) / (hi - lo)) * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);
    var note = document.createElement('p');
    note.className = 'note';
    note.textContent = next ? st.note : st.note;
    wrap.appendChild(note);
    wrap.appendChild(itemGrid(function (it) {
      handle(doAction(S, { kind: 'donate', item: it }));
      openWell();
    }, 'Bring the well something and it will do something with it.'));

    panel('The old well', wrap, st.name);
  }

  /* The board at the signpost: what the village is trying to build, what it
     still needs, and — once the green is open — somewhere to put anything at
     all, indefinitely. */
  function openBoard() {
    var wrap = document.createElement('div');
    var pr = nextProject(S);

    if (pr) {
      var card = document.createElement('div');
      card.className = 'proj';
      var h = document.createElement('h3');
      h.textContent = pr.name;
      card.appendChild(h);
      var who = document.createElement('p');
      who.className = 'by';
      who.textContent = villagerById(pr.by).name + "'s idea";
      card.appendChild(who);

      var need = document.createElement('ul');
      need.className = 'needs';
      Object.keys(pr.needs).forEach(function (it) {
        var have = S.inv[it] || 0, want = pr.needs[it];
        var li = document.createElement('li');
        if (have >= want) li.className = 'got';
        var img = document.createElement('img');
        img.src = ASSETS + 'item_' + it + '.png'; img.alt = '';
        li.appendChild(img);
        var t = document.createElement('span');
        t.textContent = nameOf(it) + '  ' + Math.min(have, want) + ' / ' + want;
        li.appendChild(t);
        need.appendChild(li);
      });
      var lb = document.createElement('li');
      if (S.bloom >= pr.bloom) lb.className = 'got';
      var lt = document.createElement('span');
      lt.className = 'bl';
      lt.textContent = 'from the well  ' + Math.min(S.bloom, pr.bloom) + ' / ' + pr.bloom;
      lb.appendChild(lt);
      need.appendChild(lb);
      card.appendChild(need);

      var go = document.createElement('button');
      go.className = 'place';
      if (canAfford(S, pr)) {
        go.textContent = 'Build it';
        go.onclick = function () { handle(doAction(S, { kind: 'build', project: pr.id })); openBoard(); };
      } else {
        go.textContent = 'Not yet — keep looking';
        go.disabled = true;
      }
      card.appendChild(go);
      wrap.appendChild(card);
    }

    if (plantingOpen(S)) {
      var g = document.createElement('div');
      g.className = 'proj';
      var gh = document.createElement('h3');
      gh.textContent = 'The village green';
      g.appendChild(gh);
      var gp = document.createElement('p');
      gp.className = 'by';
      gp.textContent = (S.plantings || 0) + ' planted so far. ' +
        DATA.planting.itemsEach + ' of anything, and ' + plantingCost(S) + ' from the well.';
      g.appendChild(gp);
      var can = plantableItems(S);
      if (can.length) {
        var row = document.createElement('div');
        row.className = 'grid';
        can.forEach(function (it) {
          var b = document.createElement('button');
          b.className = 'cell';
          var im = document.createElement('img');
          im.src = ASSETS + 'item_' + it + '.png'; im.alt = '';
          b.appendChild(im);
          var n = document.createElement('span'); n.className = 'cn'; n.textContent = nameOf(it);
          b.appendChild(n);
          var c = document.createElement('em'); c.textContent = S.inv[it];
          b.appendChild(c);
          b.onclick = function () { handle(doAction(S, { kind: 'plant', item: it })); openBoard(); };
          row.appendChild(b);
        });
        g.appendChild(row);
      } else {
        var e = document.createElement('p');
        e.className = 'note';
        e.textContent = 'Nothing ready to go in yet. Five of any one thing will do it.';
        g.appendChild(e);
      }
      wrap.appendChild(g);
    }

    var done = builtProjects(S);
    if (done.length) {
      var d = document.createElement('p');
      d.className = 'note';
      d.textContent = 'Already standing: ' + done.map(function (x) { return x.name.toLowerCase(); }).join(', ') + '.';
      wrap.appendChild(d);
    }
    if (!pr && !plantingOpen(S)) {
      var f = document.createElement('p');
      f.className = 'note';
      f.textContent = 'Nothing on the board just now.';
      wrap.appendChild(f);
    }

    panel('The village board', wrap, pr ? 'What Mossglen is working on.' : 'Everything on the list is standing.');
  }

  function openTravel() {
    var wrap = document.createElement('div');
    wrap.className = 'places';
    openAreas(S).concat(S.area === 'home' ? [] : ['home']).forEach(function (a) {
      if (a === S.area) return;
      var b = document.createElement('button');
      b.className = 'place';
      b.textContent = a === 'home' ? 'Your house' : DATA.areas[a].name;
      b.onclick = function () { go(a); };
      wrap.appendChild(b);
    });
    var locked = Object.keys(DATA.areas).filter(function (a) { return bloomEver(S) < DATA.areas[a].openAt; });
    panel('Where to?', wrap, locked.length ? 'The way to ' + DATA.areas[locked[0]].name + ' is not open yet.' : null);
  }

  function slotTapped(i) {
    if (S.home[i]) {
      fire({ kind: 'unplace', slot: i });
      return;
    }
    pickingSlot = i;

    var wrap = document.createElement('div');
    var row = document.createElement('div');
    row.className = 'shelfrow';
    var held = heldItems(S);

    if (!held.length) {
      var e = document.createElement('p');
      e.className = 'empty';
      e.textContent = 'Your bag is empty. Bring something back and it can live here.';
      row.appendChild(e);
    } else {
      held.forEach(function (it) {
        var b = document.createElement('button');
        b.className = 'cell';
        var img = document.createElement('img');
        img.src = ASSETS + 'item_' + it + '.png';
        img.alt = '';
        b.appendChild(img);
        var n = document.createElement('span');
        n.className = 'cn';
        n.textContent = nameOf(it);
        b.appendChild(n);
        if (S.inv[it] > 1) { var c = document.createElement('em'); c.textContent = S.inv[it]; b.appendChild(c); }
        b.onclick = function () { closePanel(); fire({ kind: 'place', slot: i, item: it }); };
        row.appendChild(b);
      });
    }
    wrap.appendChild(row);
    panel('On the ' + DATA.homeSlots[i].name, wrap, 'Pick something to put down.', true);
  }

  function showSay(e) {
    elSay.innerHTML = '';
    var img = document.createElement('img');
    img.src = ASSETS + 'port_' + e.who + '.png'; img.alt = '';
    var box = document.createElement('div');
    var nm = document.createElement('strong'); nm.textContent = e.name;
    var tx = document.createElement('p'); tx.textContent = e.text;
    box.appendChild(nm); box.appendChild(tx);

    /* If you happen to be carrying the thing they hoped for, the offer sits
       right here in the conversation rather than behind a menu. */
    var offer = null;
    listActions(S).forEach(function (a) { if (a.kind === 'give' && a.who === e.who) offer = a; });
    if (offer) {
      var b = document.createElement('button');
      b.className = 'offer';
      b.textContent = 'Give them the ' + nameOf(offer.item).toLowerCase();
      b.onclick = function (evt) {
        evt.stopPropagation();
        elSay.className = 'say';
        handle(doAction(S, offer));
      };
      box.appendChild(b);
    }

    elSay.appendChild(img); elSay.appendChild(box);
    elSay.className = 'say open';
    elSay.onclick = function () { elSay.className = 'say'; };
  }

  function showStage(e) {
    var wrap = document.createElement('div');
    var p = document.createElement('p');
    p.className = 'note big';
    p.textContent = e.note;
    wrap.appendChild(p);
    var b = document.createElement('button');
    b.className = 'place';
    b.textContent = 'Go and look';
    b.onclick = closePanel;
    wrap.appendChild(b);
    panel(e.name, wrap, 'Mossglen has changed a little.');
  }

  /* ------------------------------------------------------------ input */
  function onTap(ev) {
    if (elSay.className === 'say open') { elSay.className = 'say'; return; }
    var r = canvas.getBoundingClientRect();
    var pt = ev.changedTouches ? ev.changedTouches[0] : ev;
    var wx = ((pt.clientX - r.left) / r.width) * WORLD_W;
    var wy = ((pt.clientY - r.top) / r.height) * WORLD_H;
    var hs = hotspots(), best = null, bestD = 1e9;
    hs.forEach(function (h) {
      var b = h.box;
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) {
        var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        var d = (wx - cx) * (wx - cx) + (wy - cy) * (wy - cy);
        if (d < bestD) { bestD = d; best = h; }
      }
    });
    if (!best) {
      walkTo = [Math.max(10, Math.min(WORLD_W - 10, wx)), Math.max(64, Math.min(WORLD_H - 6, wy))];
      pending = null;
      return;
    }
    if (!best.walk) { best.tap(); return; }
    walkTo = best.walk;
    pending = best.tap;
  }

  /* ------------------------------------------------------------- boot */
  function boot() {
    canvas = document.getElementById('world');
    elDay = document.getElementById('day');
    elWhere = document.getElementById('where');
    elLog = document.getElementById('log');
    elPanel = document.getElementById('panel');
    elSay = document.getElementById('say');

    S = load() || newGame((Math.random() * 1e9) | 0);

    document.getElementById('bag').onclick = openBag;
    document.getElementById('places').onclick = openTravel;
    document.getElementById('board').onclick = openBoard;
    document.getElementById('well').onclick = openWell;

    canvas.addEventListener('click', onTap);
    window.addEventListener('resize', layout);

    layout();
    loadSprites(function () {
      ready = true;
      updateHud();
      say(S.day === 1 && !invCount(S)
        ? 'Tap something to walk over and have a look at it.'
        : 'Welcome back to Mossglen.');
      requestAnimationFrame(frame);
    });
  }

  /* A hook for tools/shots.js and tools/regression.js, so screenshots can be
     posed at a known state instead of being played into position by luck.
     It exposes nothing the player could not do by playing. */
  window.__moss = {
    core: CORE,
    state: function () { return S; },
    set: function (next) { S = next; save(); updateHud(); draw(); },
    fire: fire,
    go: go,
    tick: function (mins) { advance(S, mins); save(); },
    panels: { bag: openBag, well: openWell, travel: openTravel, board: openBoard, slot: slotTapped, close: closePanel },
    ready: function () { return ready; },
    spriteLoaded: function (n) { var im = sprites[n]; return !!(im && im.naturalWidth > 0); },
    pickingSlot: function () { return pickingSlot; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
