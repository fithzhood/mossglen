/* Mossglen.

   The top half of this file is the core: plain functions over a plain state
   object, with no DOM anywhere. The headless simulation bot loads exactly
   this half, which is the only way its numbers mean anything.

   The bottom half is the browser: canvas, taps, panels. It runs only when
   there is a document to run in. */

var DATA = (typeof MOSSGLEN_DATA !== 'undefined') ? MOSSGLEN_DATA : require('./mossglen-data.js');

/* Freeze scripts rewrite this line. It namespaces the save so that opening a
   new version never disturbs an older one sitting in the same origin. */
var VERSION = 'dev';

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
    bloom: 0,
    stage: 1,
    spots: {},
    vill: {},
    seenLines: {}
  };
  DATA.villagers.forEach(function (v) {
    S.vill[v.id] = { met: false, stageSeen: 1, said: {}, idle: {}, wishIdx: 0, given: 0 };
  });
  return S;
}

/* What this villager is hoping someone brings them. Wishes cycle forever,
   so there is always something to look for and never a last one. */
function currentWish(S, v) {
  return v.wishes[(S.vill[v.id].wishIdx || 0) % v.wishes.length];
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

function openAreas(S) {
  return Object.keys(DATA.areas).filter(function (a) {
    return S.bloom >= DATA.areas[a].openAt;
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
    if (S.inv[w] && S.vill[v.id].met) {
      out.push({ id: 'give:' + v.id, kind: 'give', who: v.id, item: w,
        label: 'give ' + v.name + ' the ' + DATA.items[w].name.toLowerCase() });
    }
  });
  if (S.area === 'clearing') {
    heldItems(S).forEach(function (it) {
      out.push({ id: 'donate:' + it, kind: 'donate', item: it, label: 'drop the ' + DATA.items[it].name.toLowerCase() + ' in the well' });
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
  if (act.kind === 'donate') return actDonate(S, act, ev);
  if (act.kind === 'place') return actPlace(S, act, ev);
  if (act.kind === 'unplace') return actUnplace(S, act, ev);
  if (act.kind === 'travel') { S.area = act.area; ev.push({ type: 'travel', area: act.area }); return ev; }
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
  if (!S.inv[w]) return ev;
  S.inv[w]--;
  if (!S.inv[w]) delete S.inv[w];
  st.wishIdx = (st.wishIdx + 1) % v.wishes.length;
  st.given++;
  var before = S.stage;
  S.bloom += DATA.items[w].bloom * 2;
  var stg = stageFor(S.bloom);
  S.stage = stg.n;
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
  var st = stageFor(S.bloom);
  S.stage = st.n;
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
      if (DATA.areas[a] && S.bloom < DATA.areas[a].openAt) {
        var k3 = v.id + '.hint.' + a;
        if (!st.said[k3]) { st.said[k3] = 1; line = { key: k3, text: L.hint[a] }; }
        break;
      }
    }
  }

  if (!line) {
    var w = currentWish(S, v);
    var kw = v.id + '.wish.' + w;
    if (!st.said[kw] && !S.inv[w]) { st.said[kw] = 1; line = { key: kw, text: L.wishLines[w] }; }
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
    Object.keys(L.idle).forEach(function (tod) {
      L.idle[tod].forEach(function (_, i) { keys.push(v.id + '.idle.' + tod + '.' + i); });
    });
  });
  return keys;
}

var CORE = {
  DATA: DATA, VERSION: VERSION, TIME_COMPRESSION: TIME_COMPRESSION,
  REGROW_MINUTES: REGROW_MINUTES, WORLD_W: WORLD_W, WORLD_H: WORLD_H,
  makeRng: makeRng, newGame: newGame, advance: advance, nowMinutes: nowMinutes,
  timeOfDay: timeOfDay, clockText: clockText, stageFor: stageFor, openAreas: openAreas,
  spotById: spotById, spotReady: spotReady, villagerArea: villagerArea,
  villagerById: villagerById, currentWish: currentWish,
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
  var ASSETS = '../assets/';

  var KEY = 'mossglen:v' + VERSION + ':save';
  var S = null, SCALE = 4, sprites = {}, ready = false;
  var canvas, ctx, elDay, elWhere, elLog, elPanel, elSay;
  var walkTo = null, pending = null, bob = 0;
  var wander = {};

  /* ---------------------------------------------------------- sprites */
  var SPRITE_NAMES = [
    'char_player', 'char_pim', 'char_marla', 'char_bodkin',
    'item_moss', 'item_berries', 'item_pebble', 'item_mushroom', 'item_feather',
    'item_glassbead', 'item_acorn', 'item_pinecone', 'item_snailshell', 'item_reed',
    'prop_bush', 'prop_bush_berries', 'prop_mossrock', 'prop_stump', 'prop_reeds',
    'prop_tree', 'prop_well', 'prop_house', 'prop_signpost'
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
      DATA.villagers.forEach(function (v) {
        var vs = d.vill[v.id];
        if (!vs) vs = d.vill[v.id] = { met: false, stageSeen: 1, said: {}, idle: {} };
        if (typeof vs.wishIdx !== 'number') vs.wishIdx = 0;
        if (typeof vs.given !== 'number') vs.given = 0;
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
      hs.push({ box: { x: 130, y: 256, w: 44, h: 46 }, tap: function () { go('clearing'); }, walk: null });
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
        if (pr.id === 'signpost') hs.push({ box: hitBox(pr.x, pr.y, w, h), walk: [pr.x + w / 2, pr.y + h + 8], tap: openTravel });
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
    var petals = S.area === 'hollow' ? ['#d8a0c8', '#a88cc4'] : ['#f5cd74', '#faf6ec', '#d8a0c8'];
    for (var k = 0; k < 16; k++) {
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

  /* Your house. Everything drawn here is furniture the slots can sit on, so
     a placed item always looks put down rather than floating. */
  function drawHome() {
    var WALL = 168, tod = timeOfDay(S);

    ctx.fillStyle = '#e3caa2';
    ctx.fillRect(0, 0, canvas.width, px(WALL));
    ctx.fillStyle = 'rgba(198,166,124,0.50)';
    for (var i = 0; i < WORLD_W; i += 11) ctx.fillRect(px(i), 0, SCALE, px(WALL));
    ctx.fillStyle = '#a97f52';
    ctx.fillRect(0, px(WALL - 5), canvas.width, px(5));

    ctx.fillStyle = '#9c7048';
    ctx.fillRect(0, px(WALL), canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(120,86,56,0.45)';
    for (var f = WALL + 9; f < WORLD_H; f += 9) ctx.fillRect(0, px(f), canvas.width, SCALE);

    /* window, with whatever the weather is doing showing through */
    ctx.fillStyle = '#5d4230';
    ctx.fillRect(px(58), px(12), px(60), px(50));
    ctx.fillStyle = SKY.meadow[tod];
    ctx.fillRect(px(62), px(16), px(52), px(42));
    ctx.fillStyle = 'rgba(80,132,72,0.60)';
    ctx.fillRect(px(62), px(44), px(52), px(14));
    ctx.fillStyle = 'rgba(60,104,56,0.70)';
    ctx.fillRect(px(94), px(28), px(12), px(16));
    ctx.fillStyle = '#5d4230';
    ctx.fillRect(px(85), px(12), SCALE * 2, px(50));
    ctx.fillRect(px(54), px(60), px(68), px(5));

    /* a framed something, because a blank wall is not a room */
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(126), px(24), px(30), px(24));
    ctx.fillStyle = '#cfe0b4';
    ctx.fillRect(px(129), px(27), px(24), px(18));
    ctx.fillStyle = '#7fa864';
    ctx.fillRect(px(129), px(38), px(24), px(7));
    ctx.fillStyle = '#e6b653';
    ctx.fillRect(px(134), px(30), px(5), px(5));

    /* shelves */
    ctx.fillStyle = '#7a5433';
    ctx.fillRect(px(10), px(112), px(48), px(5));
    ctx.fillRect(px(118), px(112), px(48), px(5));
    ctx.fillStyle = '#5d3f28';
    ctx.fillRect(px(16), px(117), px(4), px(6));
    ctx.fillRect(px(48), px(117), px(4), px(6));
    ctx.fillRect(px(124), px(117), px(4), px(6));
    ctx.fillRect(px(156), px(117), px(4), px(6));

    /* bed */
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(8), px(184), px(50), px(58));
    ctx.fillStyle = '#8c9ec0';
    ctx.fillRect(px(11), px(196), px(44), px(43));
    ctx.fillStyle = '#a8b8d4';
    ctx.fillRect(px(11), px(214), px(44), px(25));
    ctx.fillStyle = '#f2ead6';
    ctx.fillRect(px(15), px(188), px(36), px(14));
    ctx.fillStyle = '#5d3f28';
    ctx.fillRect(px(8), px(180), px(50), px(6));

    /* table */
    ctx.fillStyle = '#8a5f3a';
    ctx.fillRect(px(70), px(200), px(56), px(6));
    ctx.fillStyle = '#6b4728';
    ctx.fillRect(px(77), px(206), px(6), px(24));
    ctx.fillRect(px(113), px(206), px(6), px(24));

    /* rug */
    ctx.fillStyle = '#9a7fa8';
    ctx.fillRect(px(64), px(238), px(70), px(38));
    ctx.fillStyle = '#b79cc2';
    ctx.fillRect(px(69), px(243), px(60), px(28));
    ctx.fillStyle = '#9a7fa8';
    ctx.fillRect(px(80), px(251), px(38), px(12));

    DATA.homeSlots.forEach(function (sl, i) {
      var it = S.home[i];
      if (it) {
        shadowFlat(sl.x, sl.y + 7, 14);
        blit('item_' + it, sl.x - 6, sl.y - 6);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.36)';
        ctx.lineWidth = Math.max(1, SCALE / 2);
        ctx.setLineDash([SCALE * 2, SCALE * 2]);
        ctx.strokeRect(px(sl.x - 8), px(sl.y - 8), px(16), px(16));
        ctx.setLineDash([]);
      }
    });

    /* the way out */
    ctx.fillStyle = '#4a3322';
    ctx.fillRect(px(132), px(258), px(40), px(44));
    ctx.fillStyle = '#7a5433';
    ctx.fillRect(px(135), px(261), px(34), px(41));
    ctx.fillStyle = '#e6b653';
    ctx.fillRect(px(140), px(280), px(4), px(4));
    ctx.fillStyle = '#f6ecd6';
    ctx.font = 'bold ' + (9 * SCALE) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('out', px(154), px(275));
    ctx.textAlign = 'left';
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
      } else if (e.type === 'gave') {
        say('You gave the ' + nameOf(e.item).toLowerCase() + ' away, and Mossglen is a little further along for it.');
      } else if (e.type === 'stage') {
        setTimeout(function () { showStage(e); }, 500);
      } else if (e.type === 'place') {
        say('The ' + nameOf(e.item).toLowerCase() + ' looks right there.');
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
  function closePanel() { elPanel.className = 'panel'; elPanel.innerHTML = ''; }

  function panel(title, bodyEl, sub) {
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
    elPanel.className = 'panel open';
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
    var st = stageFor(S.bloom);
    var next = null;
    DATA.stages.forEach(function (s) { if (!next && s.bloom > S.bloom) next = s; });

    var wrap = document.createElement('div');
    var bar = document.createElement('div');
    bar.className = 'bloom';
    var fill = document.createElement('i');
    var lo = st.bloom, hi = next ? next.bloom : st.bloom + 1;
    fill.style.width = Math.round(((S.bloom - lo) / (hi - lo)) * 100) + '%';
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
    var locked = Object.keys(DATA.areas).filter(function (a) { return S.bloom < DATA.areas[a].openAt; });
    panel('Where to?', wrap, locked.length ? 'The way to ' + DATA.areas[locked[0]].name + ' is not open yet.' : null);
  }

  function slotTapped(i) {
    if (S.home[i]) {
      fire({ kind: 'unplace', slot: i });
      return;
    }
    var wrap = document.createElement('div');
    wrap.appendChild(itemGrid(function (it) {
      closePanel();
      fire({ kind: 'place', slot: i, item: it });
    }, 'Your bag is empty. Bring something back and it can live here.'));
    panel('On the ' + DATA.homeSlots[i].name, wrap, 'Pick something to put down.');
  }

  function showSay(e) {
    elSay.innerHTML = '';
    var img = document.createElement('img');
    img.src = ASSETS + e.sprite + '.png'; img.alt = '';
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
    panels: { bag: openBag, well: openWell, travel: openTravel, slot: slotTapped, close: closePanel },
    ready: function () { return ready; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
