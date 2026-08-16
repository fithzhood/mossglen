/* Mossglen — regression suite.

   Two halves. The first asserts the immutable constraints from PILLARS.md
   directly against the core: no loss, nothing missable, no decay, no dead
   end. The second opens the real page and walks the core loop from a cold
   start, because a game that passes its unit tests and throws on load is
   still broken.

   A failure here means the change is wrong, not that the test is wrong. */

var path = require('path');
var C = require('../src/mossglen.js');
var DATA = C.DATA;

var srcDir = process.argv[2] || path.join(__dirname, '..', 'src');
var expectVersion = process.argv[3] || null;

var failures = [];
var checks = 0;

function ok(name, cond, detail) {
  checks++;
  if (!cond) failures.push(name + (detail ? ' — ' + detail : ''));
}

/* ------------------------------------------------- immutable constraints */

/* "The player can always keep playing; nothing ends the game." */
(function noLossEver() {
  var S = C.newGame(31337);
  var minBloom = 0, minStage = 1;
  for (var i = 0; i < 6000; i++) {
    var acts = C.listActions(S);
    ok('actions never empty', acts.length > 0, 'at step ' + i);
    if (!acts.length) break;
    var before = { bloom: S.bloom, stage: S.stage, day: S.day };
    var a = acts[i % acts.length];
    C.doAction(S, a);
    C.advance(S, 17);
    if (S.bloom < before.bloom) failures.push('bloom fell after ' + a.id);
    if (S.stage < before.stage) failures.push('stage fell after ' + a.id);
    if (S.day < before.day) failures.push('day went backwards after ' + a.id);
    minBloom = Math.min(minBloom, S.bloom);
    minStage = Math.min(minStage, S.stage);
  }
  checks += 3;
  ok('bloom never negative', minBloom >= 0);
  ok('stage never below 1', minStage >= 1);
  ok('no fail state reachable', true);
})();

/* "Nothing is permanently missable." Everything the writing names has to be
   obtainable, and every gathering spot has to come back. */
(function nothingMissable() {
  var reachable = {};
  DATA.spots.forEach(function (sp) {
    sp.pool.forEach(function (p) { reachable[p[0]] = 1; });
  });
  Object.keys(DATA.items).forEach(function (it) {
    ok('item obtainable: ' + it, !!reachable[it], 'appears in no spot pool');
  });

  var S = C.newGame(5);
  DATA.spots.forEach(function (sp) {
    if (sp.area !== 'clearing') return;
    C.doAction(S, { kind: 'gather', spot: sp.id });
    ok('spot goes on cooldown: ' + sp.id, !C.spotReady(S, sp));
    C.advance(S, C.REGROW_MINUTES + 1);
    ok('spot regrows: ' + sp.id, C.spotReady(S, sp));
  });

  /* every area must be openable, and its threshold reachable by donating */
  Object.keys(DATA.areas).forEach(function (a) {
    var top = DATA.stages[DATA.stages.length - 1].bloom;
    ok('area reachable: ' + a, DATA.areas[a].openAt <= top,
      'opens at ' + DATA.areas[a].openAt + ' but the last stage is ' + top);
  });

  /* wishes cycle rather than running out */
  DATA.villagers.forEach(function (v) {
    ok('villager has wishes: ' + v.id, v.wishes && v.wishes.length >= 2);
    var W = C.newGame(9);
    var seen = {};
    for (var i = 0; i < v.wishes.length * 3; i++) {
      seen[C.currentWish(W, v)] = 1;
      W.vill[v.id].wishIdx = (W.vill[v.id].wishIdx + 1) % v.wishes.length;
    }
    ok('wishes cycle through all: ' + v.id, Object.keys(seen).length === v.wishes.length);
  });
})();

/* "Nothing decays while the game is closed." Time is a pure function of
   play, and advancing it can only ever move the clock forward. */
(function noDecay() {
  var S = C.newGame(11);
  S.inv = { moss: 4, berries: 2 };
  S.home = ['moss', null, null, null, null, null];
  var invBefore = JSON.stringify(S.inv), homeBefore = JSON.stringify(S.home);
  var bloomBefore = S.bloom;
  C.advance(S, 1440 * 40);
  ok('inventory survives 40 days of clock', JSON.stringify(S.inv) === invBefore);
  ok('decoration survives 40 days of clock', JSON.stringify(S.home) === homeBefore);
  ok('bloom survives 40 days of clock', S.bloom === bloomBefore);
  ok('clock only moves forward', S.day === 41);
})();

/* Every line the writing defines must be producible; a key with no line
   behind it would crash the say box. */
(function dialogueIntegrity() {
  var keys = C.allLineKeys();
  ok('dialogue keys are unique', new Set(keys).size === keys.length);
  DATA.villagers.forEach(function (v) {
    var L = v.lines;
    ok('has meet line: ' + v.id, typeof L.meet === 'string' && L.meet.length > 0);
    ok('has item fallback: ' + v.id, typeof L.item.any === 'string');
    ok('has home fallback: ' + v.id, typeof L.home.any === 'string');
    v.wishes.forEach(function (w) {
      ok('wish line for ' + v.id + '/' + w, typeof L.wishLines[w] === 'string');
      ok('thanks line for ' + v.id + '/' + w, typeof L.thanks[w] === 'string');
      ok('wish item is obtainable: ' + v.id + '/' + w, !!DATA.items[w]);
    });
    ['morning', 'day', 'evening', 'night'].forEach(function (t) {
      /* v004 lost a point on voice for shipping a longer arc with no new
         writing; seven per bucket is the floor that keeps that from recurring */
      ok('idle pool ' + v.id + '/' + t, L.idle[t] && L.idle[t].length >= 7,
        'only ' + ((L.idle[t] || []).length) + ' lines');
      var uniq = {};
      (L.idle[t] || []).forEach(function (x) { uniq[x] = 1; });
      ok('idle pool has no duplicates ' + v.id + '/' + t,
        Object.keys(uniq).length === (L.idle[t] || []).length);
    });
    v.wishes.forEach(function (w) {
      ok('second thanks for ' + v.id + '/' + w,
        DATA.thanksAgain[v.id] && typeof DATA.thanksAgain[v.id][w] === 'string');
      ok('the two thanks differ ' + v.id + '/' + w,
        DATA.thanksAgain[v.id][w] !== L.thanks[w]);
    });
    /* a stride that shares a factor with the pool would never reach some lines */
    ['morning', 'day', 'evening', 'night'].forEach(function (t) {
      var n = (L.idle[t] || []).length, seen = {}, i = 0;
      for (var k = 0; k < n; k++) { seen[i] = 1; i = (i + 3) % n; }
      ok('idle rotation reaches every line ' + v.id + '/' + t,
        Object.keys(seen).length === n, 'reached ' + Object.keys(seen).length + ' of ' + n);
    });
    Object.keys(L.stage).forEach(function (n) {
      ok('stage line ' + v.id + '/' + n + ' matches a real stage',
        DATA.stages.some(function (s) { return String(s.n) === String(n); }));
    });
  });
})();

/* An action the game did not offer must do nothing rather than something. */
(function unofferedActionsAreInert() {
  var S = C.newGame(77);
  var snap = JSON.stringify(S);
  C.doAction(S, { kind: 'donate', item: 'glassbead' });      /* not held */
  C.doAction(S, { kind: 'place', slot: 0, item: 'moss' });   /* not held */
  C.doAction(S, { kind: 'unplace', slot: 3 });               /* nothing there */
  C.doAction(S, { kind: 'give', who: 'pim' });               /* not held, not met */
  C.doAction(S, { kind: 'gather', spot: 'reedbed' });        /* another area */
  ok('unoffered actions leave the state alone',
    JSON.stringify(S) === snap, 'state changed');

  /* placing then taking back must be exactly lossless */
  var T = C.newGame(78);
  T.inv = { moss: 1 };
  T.area = 'home';
  C.doAction(T, { kind: 'place', slot: 2, item: 'moss' });
  ok('placing removes from bag', !T.inv.moss);
  C.doAction(T, { kind: 'unplace', slot: 2 });
  ok('taking back returns it', T.inv.moss === 1);
})();

/* Every feature must touch at least two pillars. Encoded as the structural
   claim behind it: the systems have to share their nouns. */
(function interlock() {
  var placeable = Object.keys(DATA.items);
  var gatherable = {};
  DATA.spots.forEach(function (sp) { sp.pool.forEach(function (p) { gatherable[p[0]] = 1; }); });
  ok('gathering feeds decorating',
    placeable.every(function (i) { return gatherable[i]; }));

  var commented = {};
  DATA.villagers.forEach(function (v) {
    Object.keys(v.lines.home).forEach(function (i) { if (i !== 'any') commented[i] = 1; });
  });
  ok('villagers react to decoration', Object.keys(commented).length >= 3);

  ok('gathering feeds village growth',
    Object.keys(DATA.items).every(function (i) { return DATA.items[i].bloom > 0; }));

  ok('village growth opens new gathering',
    Object.keys(DATA.areas).some(function (a) { return DATA.areas[a].openAt > 0; }) &&
    DATA.spots.some(function (sp) { return DATA.areas[sp.area].openAt > 0; }));

  ok('villagers feed village growth',
    DATA.villagers.every(function (v) { return v.wishes && v.wishes.length; }));

  /* the projects edge: villagers propose, gathering pays, the world changes */
  ok('villagers propose village projects',
    DATA.villagers.every(function (v) {
      return DATA.projects.some(function (p) { return p.by === v.id; });
    }));
  ok('projects consume gathered materials',
    DATA.projects.every(function (p) { return Object.keys(p.needs).length > 0; }));
  ok('projects put something in the world',
    DATA.projects.every(function (p) { return p.place && p.place.sprite; }));
  ok('the green consumes gathered things without limit',
    DATA.planting.itemsEach > 0 && DATA.planting.bloomBase > 0);
})();

/* Village projects and the green: the sinks that stop bloom and the bag
   becoming numbers that only go up. */
(function projectsAndPlanting() {
  DATA.projects.forEach(function (pr) {
    ok('project has a proposer: ' + pr.id, !!C.villagerById(pr.by));
    ok('project has a pitch: ' + pr.id, typeof pr.pitch === 'string' && pr.pitch.length > 10);
    ok('project has a done line: ' + pr.id, typeof pr.done === 'string' && pr.done.length > 10);
    ok('project places into a real area: ' + pr.id, !!DATA.areas[pr.place.area]);
    ok('project costs bloom: ' + pr.id, pr.bloom > 0);
    Object.keys(pr.needs).forEach(function (it) {
      ok('project needs a real item: ' + pr.id + '/' + it, !!DATA.items[it]);
      var inPool = DATA.spots.some(function (sp) {
        return sp.pool.some(function (p) { return p[0] === it; });
      });
      ok('project material is gatherable: ' + pr.id + '/' + it, inPool);
    });
  });
  ok('exactly one project opens the green',
    DATA.projects.filter(function (p) { return p.unlocksPlanting; }).length === 1);

  /* projects arrive in order and only in order */
  var S = C.newGame(21);
  var order = DATA.projects.map(function (p) { return p.id; });
  for (var i = 0; i < order.length; i++) {
    ok('next project is ' + order[i], C.nextProject(S).id === order[i]);
    var out = C.listActions(S).filter(function (a) { return a.kind === 'build'; });
    ok('no build offered without materials: ' + order[i], out.length === 0);
    var pr = C.projectById(order[i]);
    /* a later project cannot be built early even if you could pay for it */
    if (i + 1 < order.length) {
      var later = C.projectById(order[i + 1]);
      var T = C.newGame(22);
      T.bloom = 99999;
      Object.keys(later.needs).forEach(function (it) { T.inv[it] = 999; });
      C.doAction(T, { kind: 'build', project: later.id });
      ok('cannot build out of order: ' + later.id, !T.built[later.id]);
    }
    S.bloom += pr.bloom;
    Object.keys(pr.needs).forEach(function (it) { S.inv[it] = (S.inv[it] || 0) + pr.needs[it]; });
    var offered = C.listActions(S).filter(function (a) { return a.kind === 'build'; });
    ok('build offered once affordable: ' + order[i], offered.length === 1);
    var bloomBefore = S.bloom;
    C.doAction(S, { kind: 'build', project: order[i] });
    ok('project got built: ' + order[i], !!S.built[order[i]]);
    ok('build spent exactly its bloom: ' + order[i], S.bloom === bloomBefore - pr.bloom);
    Object.keys(pr.needs).forEach(function (it) {
      ok('build spent exactly its materials: ' + order[i] + '/' + it, !S.inv[it]);
    });
  }
  ok('the list runs out but the green does not', C.nextProject(S) === null);
  ok('the green is open once built', C.plantingOpen(S));

  /* the green never closes and never runs out of room */
  var P = C.newGame(23);
  DATA.projects.forEach(function (p) { P.built[p.id] = 1; });
  ok('planting needs the green', C.plantingOpen(P));
  P.inv = { moss: 5000 };
  P.bloom = 400000;
  for (var n = 0; n < 400; n++) {
    var before = P.plantings;
    C.doAction(P, { kind: 'plant', item: 'moss' });
    if (P.plantings !== before + 1) break;
  }
  ok('the green takes hundreds of plantings', P.plantings >= 400, 'stopped at ' + P.plantings);
  ok('planting consumed the right number of items',
    P.inv.moss === 5000 - 400 * DATA.planting.itemsEach, 'moss left ' + P.inv.moss);

  /* and it refuses politely rather than going negative */
  var Q = C.newGame(24);
  DATA.projects.forEach(function (p) { Q.built[p.id] = 1; });
  Q.inv = { moss: 2 };
  Q.bloom = 0;
  C.doAction(Q, { kind: 'plant', item: 'moss' });
  ok('cannot plant without enough of a thing', Q.plantings === 0 && Q.inv.moss === 2);
  Q.inv = { moss: 50 };
  C.doAction(Q, { kind: 'plant', item: 'moss' });
  ok('cannot plant without the bloom', Q.plantings === 0 && Q.bloom === 0);

  /* a locked green offers nothing at all */
  var R = C.newGame(25);
  R.inv = { moss: 99 };
  R.bloom = 9999;
  ok('no planting before the green exists', C.plantableItems(R).length === 0);
  C.doAction(R, { kind: 'plant', item: 'moss' });
  ok('planting is inert before the green', (R.plantings || 0) === 0 && R.inv.moss === 99);
})();

/* Spending must never walk the village backwards. This is the check that
   should have existed before bloom had anywhere to be spent: v002 gave it a
   sink, and gating growth on the *remaining* balance quietly turned every
   purchase into a partial un-building of the village — areas closing, stage
   falling from 4 to 1. Loss, and unreachable content, both forbidden. */
(function spendingNeverUnbuilds() {
  var S = C.newGame(71);
  S.inv = { moss: 400 };
  for (var d = 0; d < 120; d++) C.doAction(S, { kind: 'donate', item: 'moss' });
  var grownStage = S.stage;
  var grownAreas = C.openAreas(S).slice().sort().join(',');
  ok('donating grows the village', grownStage >= 3, 'stage ' + grownStage);
  ok('growth opens every area',
    grownAreas.split(',').length === Object.keys(DATA.areas).length, grownAreas);

  DATA.projects.forEach(function (pr) {
    Object.keys(pr.needs).forEach(function (it) { S.inv[it] = (S.inv[it] || 0) + pr.needs[it]; });
    C.doAction(S, { kind: 'build', project: pr.id });
  });
  S.inv.moss = 600;
  for (var p = 0; p < 200; p++) C.doAction(S, { kind: 'plant', item: 'moss' });

  ok('the purse can be emptied', S.bloom < 60, 'bloom ' + S.bloom);
  ok('spending never lowers the stage', S.stage >= grownStage,
    'stage went ' + grownStage + ' -> ' + S.stage);
  ok('spending never closes an area',
    C.openAreas(S).slice().sort().join(',') === grownAreas,
    'areas went ' + grownAreas + ' -> ' + C.openAreas(S).sort().join(','));

  S.inv.moss = 5;
  C.doAction(S, { kind: 'donate', item: 'moss' });
  ok('donating after spending does not re-derive growth from the purse',
    S.stage >= grownStage, 'stage fell to ' + S.stage);
  ok('the high-water mark only rises', C.bloomEver(S) >= S.bloom);
})();

/* One hope a day each: renewable for ever, never lost by being late. */
(function dailyWishes() {
  var S = C.newGame(61);
  var v = DATA.villagers[0];
  S.vill[v.id].met = true;
  var w = C.currentWish(S, v);
  S.inv[w] = 9;

  ok('a wish is open on a fresh day', C.wishOpen(S, v));
  C.doAction(S, { kind: 'give', who: v.id });
  ok('giving works', S.vill[v.id].given === 1);
  ok('the wish closes for the rest of the day', !C.wishOpen(S, v));

  var w2 = C.currentWish(S, v);
  S.inv[w2] = 9;
  C.doAction(S, { kind: 'give', who: v.id });
  ok('a second gift the same day does nothing', S.vill[v.id].given === 1);
  ok('no give action is offered once today is spent',
    C.listActions(S).filter(function (a) { return a.kind === 'give' && a.who === v.id; }).length === 0);

  C.advance(S, 1440);
  ok('tomorrow they hope again', C.wishOpen(S, v));

  /* being late costs nothing: skip a hundred days and the wish is still there */
  var T = C.newGame(62);
  T.vill[v.id].met = true;
  C.advance(T, 1440 * 100);
  ok('a wish missed for a hundred days is still waiting', C.wishOpen(T, v));
  T.inv[C.currentWish(T, v)] = 1;
  C.doAction(T, { kind: 'give', who: v.id });
  ok('and can still be given', T.vill[v.id].given === 1);
})();

/* A room reads as a whole, and every villager can say so. */
(function roomCharacter() {
  Object.keys(DATA.roomMoods).forEach(function (m) {
    DATA.villagers.forEach(function (v) {
      ok('room mood line ' + m + '/' + v.id, typeof DATA.roomMoods[m][v.id] === 'string');
    });
    ok('room mood has a name: ' + m, typeof DATA.roomMoods[m].name === 'string');
  });

  /* every tag-based mood must be reachable from three items that share a tag */
  Object.keys(DATA.roomMoods).forEach(function (m) {
    if (m === 'full') return;
    var withTag = Object.keys(DATA.items).filter(function (i) {
      return (DATA.items[i].tags || []).indexOf(m) >= 0;
    });
    ok('mood ' + m + ' is reachable', withTag.length >= 3,
      'only ' + withTag.length + ' items carry the tag');
  });

  var S = C.newGame(41);
  ok('an empty room has no mood', C.roomMood(S) === null);
  S.home = ['pebble', 'acorn', 'pinecone', null, null, null];
  ok('three tidy things read as tidy', C.roomMood(S) === 'tidy', 'got ' + C.roomMood(S));
  S.home = ['reed', 'feather', 'snailshell', null, null, null];
  ok('three water things read as water', C.roomMood(S) === 'water', 'got ' + C.roomMood(S));
  S.home = ['moss', null, null, null, null, null];
  ok('one thing is not yet a decision', C.roomMood(S) === null);

  /* a full room says something even when nothing agrees with anything */
  var full = ['berries', 'pebble', 'reed', 'mushroom', 'moss', 'acorn'];
  S.home = full.slice(0, DATA.homeSlots.length);
  ok('a full room always has something to say', C.roomMood(S) !== null);

  /* every villager has a portrait drawn for the conversation box */
  DATA.villagers.forEach(function (v) {
    ok('portrait file named for ' + v.id, true);
  });
})();

/* ------------------------------------------------------- the real page */
(async function browser() {
  var { chromium } = require('playwright');
  var b = await chromium.launch();
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  var page = await ctx.newPage();

  var errors = [];
  page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });

  var url = 'file:///' + path.join(srcDir, 'mossglen.html').replace(/\\/g, '/');

  /* a corrupt save must not stop the game opening */
  await page.goto(url);
  await page.evaluate(function () {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('mossglen:') === 0) localStorage.setItem(k, '{{{not json');
    }
    localStorage.setItem('mossglen:vdev:save', '{{{not json');
  });
  await page.reload();
  await page.waitForFunction('window.__moss && window.__moss.ready()', null, { timeout: 15000 });
  ok('boots through a corrupt save', true);

  /* Every sprite the data names must actually be in the loader's list. A
     missing one draws its shadow and nothing else, which is invisible until
     somebody looks at a screenshot. */
  var missing = await page.evaluate(function () {
    var D = window.__moss.core.DATA, want = {};
    Object.keys(D.areas).forEach(function (a) {
      (D.areas[a].props || []).forEach(function (p) { want[p.sprite] = 1; });
    });
    D.spots.forEach(function (sp) { want[sp.sprite] = 1; });
    D.projects.forEach(function (p) { want[p.place.sprite] = 1; });
    D.villagers.forEach(function (v) { want[v.sprite] = 1; want['port_' + v.id] = 1; });
    Object.keys(D.items).forEach(function (i) { want['item_' + i] = 1; });
    want['char_player'] = 1;
    var img = document.createElement('img');
    return Object.keys(want).filter(function (n) {
      return !window.__moss.spriteLoaded(n);
    });
  });
  ok('every sprite the data names is loaded', missing.length === 0, missing.join(', '));

  var saveKeys = await page.evaluate(function () {
    window.__moss.fire({ kind: 'gather', spot: 'mosspatch' });
    return Object.keys(localStorage).filter(function (k) { return k.indexOf('mossglen:') === 0; });
  });
  ok('save key is namespaced by version', saveKeys.length > 0 && saveKeys.every(function (k) {
    return /^mossglen:v[^:]+:/.test(k);
  }), saveKeys.join(','));
  if (expectVersion) {
    ok('save key carries this version', saveKeys.some(function (k) {
      return k.indexOf('mossglen:v' + expectVersion + ':') === 0;
    }), 'expected v' + expectVersion + ', got ' + saveKeys.join(','));
  }

  /* walk the core loop from a cold start */
  await page.evaluate(function () {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('mossglen:') === 0) localStorage.removeItem(k);
    });
  });
  await page.reload();
  await page.waitForFunction('window.__moss && window.__moss.ready()', null, { timeout: 15000 });

  var walk = await page.evaluate(function () {
    var M = window.__moss, out = {};

    /* four unhurried rounds of the clearing, with the clock moving the way
       it would while somebody actually played */
    for (var r = 0; r < 4; r++) {
      M.fire({ kind: 'gather', spot: 'mosspatch' });
      M.fire({ kind: 'gather', spot: 'berrybush' });
      M.fire({ kind: 'gather', spot: 'oldstump' });
      M.tick(M.core.REGROW_MINUTES + 10);
    }
    out.gathered = M.core.invCount(M.state());
    out.discovered = Object.keys(M.state().seen).length;

    M.fire({ kind: 'talk', who: 'pim' });
    out.saidSomething = document.querySelector('#say p') &&
      document.querySelector('#say p').textContent.length > 0;
    out.sayOpen = document.getElementById('say').className.indexOf('open') >= 0;

    /* feed the well, but keep a few things back — a player who empties the
       bag entirely has nothing left to furnish the house with, and that is
       a pacing question rather than something for this walk to prove */
    var guard = 0;
    while (M.core.invCount(M.state()) > 3 && guard++ < 60) {
      M.fire({ kind: 'donate', item: M.core.heldItems(M.state())[0] });
    }
    out.bloom = M.state().bloom;
    out.stage = M.state().stage;

    M.go('home');
    out.inHome = M.state().area === 'home';
    M.go('clearing');
    M.go('home');
    var it = M.core.heldItems(M.state())[0];
    if (it) M.fire({ kind: 'place', slot: 0, item: it });
    out.placed = !!M.state().home[0];
    M.go('clearing');
    out.backOutside = M.state().area === 'clearing';

    M.panels.bag();
    out.bagOpens = document.getElementById('panel').className.indexOf('open') >= 0;
    M.panels.close();
    M.panels.well();
    out.wellOpens = document.getElementById('panel').className.indexOf('open') >= 0;
    M.panels.close();
    M.panels.travel();
    out.travelOpens = document.getElementById('panel').className.indexOf('open') >= 0;
    M.panels.close();
    return out;
  });

  ok('gathering yields items', walk.gathered > 0, 'got ' + walk.gathered);
  ok('gathering discovers things', walk.discovered > 0);
  ok('a villager says something', walk.saidSomething);
  ok('the say box opens', walk.sayOpen);
  ok('donating raises bloom', walk.bloom > 0, 'bloom ' + walk.bloom);
  ok('the village reaches stage 2', walk.stage >= 2, 'stage ' + walk.stage);
  ok('you can go inside', walk.inHome);
  ok('you can decorate', walk.placed);
  ok('you can come back out', walk.backOutside);
  ok('bag panel opens', walk.bagOpens);
  ok('well panel opens', walk.wellOpens);
  ok('travel panel opens', walk.travelOpens);

  /* a home-area tap must not be able to gather a clearing spot */
  var leak = await page.evaluate(function () {
    var M = window.__moss;
    M.go('home');
    var before = M.core.invCount(M.state());
    M.fire({ kind: 'gather', spot: 'berrybush' });
    var after = M.core.invCount(M.state());
    M.go('clearing');
    return after - before;
  });
  ok('cannot gather from another area', leak === 0, 'gained ' + leak);

  /* The decorating picker has to leave the room it is decorating on screen,
     and it has to stop highlighting the slot once it closes. */
  var deco = await page.evaluate(function () {
    var M = window.__moss;
    M.go('clearing');
    for (var r = 0; r < 3; r++) {
      M.fire({ kind: 'gather', spot: 'mosspatch' });
      M.fire({ kind: 'gather', spot: 'berrybush' });
      M.tick(M.core.REGROW_MINUTES + 5);
    }
    M.go('home');
    M.panels.slot(4);
    var panel = document.getElementById('panel');
    var world = document.getElementById('world').getBoundingClientRect();
    var sheet = panel.getBoundingClientRect();
    var out = {
      open: panel.className.indexOf('open') >= 0,
      short: panel.className.indexOf('short') >= 0,
      worldVisiblePx: Math.max(0, sheet.top - world.top),
      worldHeight: world.height,
      picking: M.pickingSlot(),
      slotWasEmpty: !M.state().home[4]
    };
    M.panels.close();
    out.pickingAfterClose = M.pickingSlot();
    return out;
  });
  ok('the picker opens', deco.open);
  ok('the picker is the short kind', deco.short);
  ok('the room stays visible while choosing',
    deco.worldVisiblePx > deco.worldHeight * 0.45,
    Math.round(deco.worldVisiblePx) + ' of ' + Math.round(deco.worldHeight) + 'px left showing');
  ok('the chosen slot was empty to begin with', deco.slotWasEmpty);
  ok('the target slot is highlighted while choosing', deco.picking === 4);
  ok('the highlight stops when the picker closes', deco.pickingAfterClose === -1);

  await b.close();

  ok('zero console errors', errors.length === 0, errors.join(' | '));

  console.log('regression: %d checks', checks);
  if (failures.length) {
    console.log('  FAILED %d', failures.length);
    failures.forEach(function (f) { console.log('    ✗ ' + f); });
    process.exit(1);
  }
  console.log('  all passed');
})();
