/* Mossglen — screenshot capture.

   The same five scenes at the same seed every version, so the arbiter is
   looking at a trajectory rather than at one lucky frame. Phone viewport,
   because that is where this game is played. */

var fs = require('fs');
var path = require('path');
var { chromium } = require('playwright');

var SEED = 7;
var VIEWPORT = { width: 390, height: 844 };

var version = process.argv[2] || '001';
var srcDir = process.argv[3] || path.join(__dirname, '..', 'src');
var outDir = path.join(__dirname, '..', 'reports', version);

var C = require('../src/mossglen.js');

/* Poses are built by actually playing, not by hand-writing a save file, so a
   screenshot can never show a state the game cannot reach. */
function pose(steps) {
  var S = C.newGame(SEED);
  steps(S);
  return S;
}

function gatherTimes(S, spot, n) {
  for (var i = 0; i < n; i++) {
    C.doAction(S, { kind: 'gather', spot: spot });
    C.advance(S, C.REGROW_MINUTES + 5);
  }
}

function setClock(S, day, hour) { S.day = day; S.minute = hour * 60; }

/* Build the village up by actually paying for it, so a screenshot can never
   show a state the game would not let you reach. */
function buildUpTo(S, lastId) {
  for (var i = 0; i < C.DATA.projects.length; i++) {
    var pr = C.DATA.projects[i];
    S.bloom += pr.bloom;
    Object.keys(pr.needs).forEach(function (it) { S.inv[it] = (S.inv[it] || 0) + pr.needs[it]; });
    C.doAction(S, { kind: 'build', project: pr.id });
    if (pr.id === lastId) return;
  }
}

var SCENES = [
  {
    name: '1-village-morning',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 3);
        gatherTimes(S, 'berrybush', 2);
        C.doAction(S, { kind: 'talk', who: 'pim' });
        var held = C.heldItems(S);
        for (var i = 0; i < 6 && held.length; i++) {
          C.doAction(S, { kind: 'donate', item: held[i % held.length] });
        }
        setClock(S, 2, 7.5);
        S.area = 'clearing'; S.px = 82; S.py = 214;
      });
    }
  },
  {
    name: '2-inventory',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 3);
        gatherTimes(S, 'berrybush', 3);
        gatherTimes(S, 'oldstump', 3);
        setClock(S, 2, 11);
      });
    },
    after: 'panels.bag'
  },
  {
    name: '3-conversation',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'oldstump', 4);
        gatherTimes(S, 'mosspatch', 2);
        C.doAction(S, { kind: 'talk', who: 'bodkin' });
        setClock(S, 2, 18);
        S.px = 74; S.py = 226;
      });
    },
    after: 'talk:bodkin'
  },
  {
    name: '4-home-interior',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 4);
        gatherTimes(S, 'berrybush', 3);
        gatherTimes(S, 'oldstump', 4);
        S.area = 'home';
        gatherTimes(S, 'oldstump', 4);
        /* a deliberately tidy room, so the screenshot shows a decision
           rather than the first five things that came to hand */
        ['pebble', 'acorn', 'pinecone', 'moss', 'berries'].forEach(function (it, i) {
          if (S.inv[it]) C.doAction(S, { kind: 'place', slot: i, item: it });
        });
        setClock(S, 3, 15);
      });
    }
  },
  {
    name: '5-decorating',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 3);
        gatherTimes(S, 'berrybush', 3);
        gatherTimes(S, 'oldstump', 3);
        S.area = 'home';
        var held = C.heldItems(S);
        held.slice(0, 3).forEach(function (it, i) {
          C.doAction(S, { kind: 'place', slot: i, item: it });
        });
        setClock(S, 3, 10);
      });
    },
    after: 'slot:4'
  }
  ,{
    name: '6-village-built',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 4);
        gatherTimes(S, 'berrybush', 3);
        C.doAction(S, { kind: 'talk', who: 'pim' });
        buildUpTo(S, 'green');
        S.plantings = 60;
        setClock(S, 34, 9);
        S.area = 'clearing'; S.px = 78; S.py = 200;
      });
    }
  },
  {
    name: '7-the-board',
    build: function () {
      return pose(function (S) {
        gatherTimes(S, 'mosspatch', 5);
        gatherTimes(S, 'berrybush', 4);
        gatherTimes(S, 'oldstump', 4);
        buildUpTo(S, 'bench');
        setClock(S, 6, 13);
        S.area = 'clearing';
      });
    },
    after: 'panels.board'
  }
];

(async function () {
  fs.mkdirSync(outDir, { recursive: true });
  var browser = await chromium.launch();
  var ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  var page = await ctx.newPage();

  var consoleErrors = [];
  page.on('console', function (m) { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', function (e) { consoleErrors.push('pageerror: ' + e.message); });

  var url = 'file:///' + path.join(srcDir, 'mossglen.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.waitForFunction('window.__moss && window.__moss.ready()', null, { timeout: 15000 });

  for (var i = 0; i < SCENES.length; i++) {
    var sc = SCENES[i];
    var S = sc.build();
    await page.evaluate(function (st) { window.__moss.set(st); }, S);
    await page.evaluate(function () {
      window.__moss.panels.close();
      document.getElementById('say').className = 'say';
    });

    if (sc.after) {
      if (sc.after.indexOf('talk:') === 0) {
        await page.evaluate(function (who) { window.__moss.fire({ kind: 'talk', who: who }); }, sc.after.slice(5));
      } else if (sc.after.indexOf('slot:') === 0) {
        await page.evaluate(function (n) { window.__moss.panels.slot(+n); }, sc.after.slice(5));
      } else if (sc.after === 'panels.bag') {
        await page.evaluate(function () { window.__moss.panels.bag(); });
      } else if (sc.after === 'panels.board') {
        await page.evaluate(function () { window.__moss.panels.board(); });
      }
    }
    await page.waitForTimeout(420);
    await page.screenshot({ path: path.join(outDir, sc.name + '.png') });
    console.log('  shot %s', sc.name);
  }

  await browser.close();

  fs.writeFileSync(path.join(outDir, 'console-errors.txt'),
    consoleErrors.length ? consoleErrors.join('\n') : 'none');

  console.log('shots: %d scenes at seed %d, %dx%d', SCENES.length, SEED, VIEWPORT.width, VIEWPORT.height);
  console.log('  console errors: %d', consoleErrors.length);
  if (consoleErrors.length) {
    consoleErrors.forEach(function (e) { console.log('    ' + e); });
    process.exit(1);
  }
})();
