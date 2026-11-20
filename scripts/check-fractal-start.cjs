/* Regression: the first visible frame must contain a recognisable, opaque curve. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/fractals.js'), 'utf8');

function start({ paused = false, reduced = false, available = true } = {}) {
  const strokes = [];
  let points = 0, pending = null;
  const ctx = new Proxy({
    beginPath() { points = 0; },
    moveTo() { points += 1; },
    lineTo() { points += 1; },
    stroke() { strokes.push({ points, alpha: ctx.globalAlpha }); },
    createLinearGradient() { return { addColorStop() {} }; }
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  const background = { dataset: {} };
  const hero = { style: { setProperty() {} } };
  const canvas = {
    dataset: {}, parentElement: background,
    getContext() { return available ? ctx : null; },
    getBoundingClientRect() { return { width: 700, height: 700 }; },
    closest() { return hero; }
  };
  const caption = { textContent: '', style: {} };
  const root = { dataset: { theme: 'light', motion: paused ? 'paused' : 'running' }, lang: 'en', classList: { contains() { return false; } } };
  const observer = class { observe() {} };
  vm.runInNewContext(source, {
    document: { documentElement: root, hidden: false, getElementById(id) { return id === 'fractal-canvas' ? canvas : caption; }, addEventListener() {} },
    window: { devicePixelRatio: 1, matchMedia() { return { matches: reduced, addEventListener() {} }; }, addEventListener() {} },
    MutationObserver: observer, ResizeObserver: observer, IntersectionObserver: observer,
    requestAnimationFrame(callback) { pending = callback; return 1; },
    cancelAnimationFrame() { pending = null; }
  });
  return { background, canvas, strokes, pending };
}

const running = start();
assert.equal(running.background.dataset.ready, 'true');
assert(running.strokes.some(s => s.points >= 65 && s.alpha >= .9), 'The landing frame must show several visible folds before any animation callback.');
assert(Number(running.canvas.dataset.progress) >= 1/2 - .001);
assert(running.pending, 'Construction must continue after the visible landing frame.');
for (const options of [{ paused: true }, { reduced: true }]) {
  const staticView = start(options);
  assert.equal(staticView.canvas.dataset.progress, '1.000');
  assert.equal(staticView.pending, null);
  assert(staticView.strokes.some(s => s.points > 1000 && s.alpha >= .9));
}
const unsupported = start({ available: false });
assert.equal(unsupported.background.dataset.ready, undefined, 'Keep the inline SVG visible if Canvas cannot initialise.');
assert.equal(unsupported.pending, null);
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
assert(html.includes('class="fractal-fallback"'), 'The initial curve must be present in the HTML, before JavaScript runs.');
console.log('OK: visible initial curve, continued construction, paused/reduced static views, and no-Canvas fallback.');
