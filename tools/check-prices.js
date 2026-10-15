// Checks every calculated price against the figures printed on the source canvass.
// Run: node tools/check-prices.js data/2026-10-birra.csv tools/expected-2026-10.json
const fs = require('fs');
const vm = require('vm');
const [, , csvPath, expectedPath] = process.argv;

// Load the browser engine in a sandbox so the test uses the exact same maths.
const sandbox = { window: {}, location: { search: '' }, URLSearchParams, Intl, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/../assets/promo.js', 'utf8'), sandbox);
const P = sandbox.window.Promo;

const products = P.parseCSV(fs.readFileSync(csvPath, 'utf8')).map(P.enrich);
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
let fails = 0;
for (const [code, exp] of Object.entries(expected)) {
  const p = products.find(x => x.code === code);
  if (!p) { console.log(`MISSING ${code}`); fails++; continue; }
  const checks = [['net', p.net, exp.net], ['unit', p.unit, exp.unit]];
  if (exp.standard_net) checks.push(['standard net', p.compare && p.compare.net, exp.standard_net], ['standard unit', p.compare && p.compare.unit, exp.standard_unit]);
  for (const [label, got, want] of checks) {
    const ok = Math.abs(got - want) < 0.005;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${code} ${p.name.padEnd(32)} ${label.padEnd(13)} got ${got} want ${want}`);
  }
}
console.log(fails ? `\n${fails} mismatch(es)` : `\nAll ${Object.keys(expected).length} products match the canvass.`);
process.exit(fails ? 1 : 0);
