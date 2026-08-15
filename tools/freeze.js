/* Mossglen — freeze /src into /v/NNN/.

   A frozen version is a complete, standalone copy: its own scripts, its own
   assets, and its own localStorage namespace. All versions share one origin
   on GitHub Pages, so a version that wrote to an unnamespaced key would eat
   the save of every other version in the archive. That is what the VERSION
   rewrite below is for, and why it is asserted rather than assumed. */

var fs = require('fs');
var path = require('path');

var version = process.argv[2];
if (!/^\d{3}$/.test(version || '')) {
  console.error('usage: node tools/freeze.js NNN');
  process.exit(1);
}

var root = path.join(__dirname, '..');
var src = path.join(root, 'src');
var dst = path.join(root, 'v', version);

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(path.join(dst, 'assets'), { recursive: true });

['mossglen.html', 'mossglen.css', 'mossglen-data.js'].forEach(function (f) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
});

var js = fs.readFileSync(path.join(src, 'mossglen.js'), 'utf8');

var swaps = [
  ["var VERSION = 'dev';", "var VERSION = '" + version + "';"],
  ["var ASSETS = '../assets/';", "var ASSETS = 'assets/';"]
];
swaps.forEach(function (pair) {
  if (js.indexOf(pair[0]) < 0) {
    console.error('freeze: could not find %j in src/mossglen.js', pair[0]);
    process.exit(1);
  }
  js = js.split(pair[0]).join(pair[1]);
});
fs.writeFileSync(path.join(dst, 'mossglen.js'), js);

fs.readdirSync(path.join(root, 'assets')).forEach(function (f) {
  if (/\.png$/.test(f)) fs.copyFileSync(path.join(root, 'assets', f), path.join(dst, 'assets', f));
});

/* prove the frozen copy is actually standalone */
var frozen = fs.readFileSync(path.join(dst, 'mossglen.js'), 'utf8');
if (frozen.indexOf("'../assets/'") >= 0) { console.error('freeze: an outside asset path survived'); process.exit(1); }
if (frozen.indexOf("var VERSION = 'dev'") >= 0) { console.error('freeze: version was not stamped'); process.exit(1); }
['mossglen.html', 'mossglen.css', 'mossglen.js', 'mossglen-data.js'].forEach(function (f) {
  if (!fs.existsSync(path.join(dst, f))) { console.error('freeze: missing ' + f); process.exit(1); }
});
var pngs = fs.readdirSync(path.join(dst, 'assets')).length;
if (pngs < 20) { console.error('freeze: only %d assets copied', pngs); process.exit(1); }

console.log('froze src -> v/%s  (%d sprites, save key mossglen:v%s:)', version, pngs, version);
