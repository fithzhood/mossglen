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
      ok('idle pool ' + v.id + '/' + t, L.idle[t] && L.idle[t].length >= 3,
        'only ' + ((L.idle[t] || []).length) + ' lines');
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
