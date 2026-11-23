// Run from repository root: node test/check-game-invariants.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const game = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const iphone = fs.readFileSync(path.join(root, 'iphone.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vehicles = fs.readFileSync(path.join(root, 'expressway-vehicle-models.js'), 'utf8');
for (const [name, source] of [['game.js',game], ['iphone.html',iphone], ['index.html',index], ['expressway-vehicle-models.js',vehicles]]) {
  assert.ok(source.length > 1000, `${name} appears truncated`);
}
for (const threshold of [3000, 8000, 10000, 12000]) {
  assert.match(game, new RegExp(`\\b${threshold}\\b`), `missing ${threshold} point transition`);
}
assert.match(game, /deviceorientation/i, 'tilt steering missing');
assert.match(game, /requestPermission/, 'iOS tilt permission flow missing');
assert.match(game, /touchSteer/, 'touch steering fallback missing');
assert.match(game, /fallbackPointer/, 'pointer steering fallback missing');
assert.match(game, /speed\s*=\s*120/, 'initial speed changed unexpectedly');
assert.match(game, /reset\s*\(/, 'restart/reset missing');
assert.match(vehicles, /makeExpresswayVehicle/, 'expressway vehicle factory missing');
assert.match(vehicles, /sportsCar/, 'sports car traffic missing');
assert.match(vehicles, /bus/, 'bus traffic missing');
console.log('PASS: scene markers, tilt/fallback, restart, initial speed, vehicle factory and entry points');
