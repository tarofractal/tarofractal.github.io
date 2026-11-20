/* Regression: photo interaction, reload and browser history must not freeze the background. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sources = ['fractals.js', 'app.js'].map(file => fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8'));
const settle = () => new Promise(resolve => setImmediate(resolve));

function start({ storage = new Map(), reduced = false } = {}) {
  const mutations = [], intersections = new Map(), frames = new Map(), timers = new Map();
  let nextId = 0, clock = 0, pendingMutation = false;
  function notify() {
    if (pendingMutation) return;
    pendingMutation = true;
    queueMicrotask(() => { pendingMutation = false; mutations.forEach(callback => callback()); });
  }
  function element(id = '', parentElement = null, observed = false) {
    const events = new Map(), classes = new Set(), attributes = new Map();
    return {
      id, parentElement, style: { setProperty() {} }, textContent: '', hidden: false,
      dataset: new Proxy({}, { set(target, key, value) { target[key] = value; if (observed) notify(); return true; } }),
      classList: {
        contains: value => classes.has(value),
        add(value) { classes.add(value); if (observed) notify(); },
        remove(value) { classes.delete(value); if (observed) notify(); },
        toggle(value, state) {
          const add = state ?? !classes.has(value);
          if (add) classes.add(value); else classes.delete(value);
          if (observed) notify();
          return add;
        }
      },
      contains(child) { for (; child; child = child.parentElement) if (child === this) return true; return false; },
      setAttribute(key, value) { attributes.set(key, String(value)); },
      getAttribute: key => attributes.get(key) ?? null,
      addEventListener(type, callback) { if (!events.has(type)) events.set(type, []); events.get(type).push(callback); },
      emit(type, values = {}) { (events.get(type) || []).forEach(callback => callback({ target: this, ...values })); },
      focus() { document.activeElement = this; }
    };
  }
  function drawingContext() {
    return new Proxy({
      createLinearGradient: () => ({ addColorStop() {} }),
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) })
    }, { get: (target, key) => key in target ? target[key] : () => {} });
  }
  const root = element('root', null, true);
  const hero = element('hero', root), background = element('background', hero);
  const canvas = element('fractal-canvas', background);
  const ctx = drawingContext();
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () => ({ width: 390 });
  canvas.closest = () => hero;
  const ids = new Map([['fractal-canvas', canvas]]);
  const get = id => { if (!ids.has(id)) ids.set(id, element(id)); return ids.get(id); };
  const gallery = get('gallery'), motion = get('motion-toggle'), dialog = get('photo-viewer');
  motion.parentElement = gallery;
  const slides = Array.from({ length: 5 }, (_, index) => {
    const slide = element(`photo-${index}`, gallery), image = element(), title = element();
    slide.href = `photo-${index}.webp`;
    title.textContent = `Photograph ${index}`;
    image.decode = () => Promise.resolve();
    image.getAttribute = () => '100';
    slide.querySelector = selector => selector === 'img' ? image : title;
    return slide;
  });
  const selectors = slides.map((_, index) => {
    const button = element(`select-${index}`, gallery);
    button.dataset.slideSelect = String(index);
    return button;
  });
  const document = element('document');
  document.documentElement = root;
  document.hidden = false;
  document.activeElement = null;
  document.getElementById = id => get(id);
  document.querySelector = () => null;
  document.querySelectorAll = selector => ({
    '[data-photo]': slides, '.hero-slide': slides, '[data-slide-select]': selectors,
    '.js-control': [motion, get('language-toggle'), get('theme-toggle')]
  })[selector] || [];
  document.createElement = () => ({ getContext: drawingContext });
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.emit('close'); };
  const media = element('media');
  media.matches = reduced;
  const window = element('window');
  window.matchMedia = () => media;
  window.devicePixelRatio = 1;
  window.IntersectionObserver = true;
  window.ResizeObserver = true;
  window.setTimeout = callback => { const id = ++nextId; timers.set(id, callback); return id; };
  window.clearTimeout = id => timers.delete(id);
  const context = vm.createContext({
    document, window,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe() { mutations.push(this.callback); } },
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { constructor(callback) { this.callback = callback; } observe(target) { intersections.set(target, this.callback); } },
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  sources.forEach(source => vm.runInContext(source, context));
  return {
    root, canvas, document, window, dialog, gallery, motion, slides, selectors, storage, frames, timers,
    async advance(milliseconds = 1000) {
      clock += milliseconds;
      const callbacks = [...frames.values()]; frames.clear();
      callbacks.forEach(callback => callback(clock));
      await settle();
    },
    async focus(target) {
      const old = document.activeElement;
      document.activeElement = target;
      if (gallery.contains(old)) gallery.emit('focusout', { target: old, relatedTarget: target });
      if (gallery.contains(target)) gallery.emit('focusin', { target });
      await settle();
    },
    async intersect(target, visible) { intersections.get(target)([{ isIntersecting: visible }]); await settle(); },
    hero
  };
}

(async () => {
  const storage = new Map([['taro.motion', 'paused']]);
  let page = start({ storage });
  await settle();
  assert.equal(page.root.dataset.motion, 'running', 'Recover the obsolete pause saved by photo interaction.');
  await page.advance(0);
  const progress = page.canvas.dataset.progress;
  await page.focus(page.selectors[1]);
  page.selectors[1].emit('click');
  await settle();
  assert.equal(page.root.dataset.motion, 'running', 'Choosing a photo must leave the fractal running.');
  assert(!storage.has('taro.motion-v2'), 'Photo interaction must not persist a global pause.');
  assert.equal(page.timers.size, 0, 'Photo rotation should rest while its controls have focus.');
  await page.advance();
  assert.notEqual(page.canvas.dataset.progress, progress);
  await page.focus(null);
  assert.equal(page.timers.size, 1, 'Photo rotation should resume when focus leaves.');

  page.slides[1].emit('click', { button: 0, preventDefault() {} });
  await settle();
  assert.equal(page.frames.size, 0, 'Pause background rendering while the photo dialog is open.');
  page.dialog.close();
  await settle();
  assert.equal(page.frames.size, 1, 'Closing a photo must resume the fractal.');
  assert.equal(page.root.dataset.motion, 'running');

  // A fresh document after reload or a regular home link uses the same stored preferences.
  page = start({ storage });
  await settle();
  await page.advance(0);
  for (let i = 0; i < 12; i += 1) await page.advance();
  assert.equal(page.canvas.dataset.fractal, 'mandelbrot', 'Reload must progress past the opening dragon.');
  const scenes = new Set([page.canvas.dataset.fractal]);
  for (let i = 0; i < 170; i += 1) { await page.advance(); scenes.add(page.canvas.dataset.fractal); }
  assert.equal(scenes.size, 14, 'Every fractal must render and the sequence must keep looping.');

  page.window.emit('pagehide', { persisted: true });
  assert.equal(page.frames.size, 0);
  assert.equal(page.timers.size, 0);
  page.window.emit('pageshow', { persisted: true });
  await settle();
  assert.equal(page.frames.size, 1, 'Back/forward cache restoration must restart rendering.');
  assert.equal(page.timers.size, 1, 'Back/forward cache restoration must restart photo rotation.');
  await page.advance(60000);
  const resumed = page.canvas.dataset.progress;
  await page.advance();
  assert.notEqual(page.canvas.dataset.progress, resumed, 'Restored pages must keep animating.');
  page.document.hidden = true; page.document.emit('visibilitychange'); await settle();
  assert.equal(page.frames.size, 0);
  page.document.hidden = false; page.document.emit('visibilitychange'); await settle();
  assert.equal(page.frames.size, 1);
  await page.intersect(page.hero, false);
  assert.equal(page.frames.size, 0);
  await page.intersect(page.hero, true);
  assert.equal(page.frames.size, 1);

  page.motion.emit('click'); await settle();
  assert.equal(storage.get('taro.motion-v2'), 'paused', 'An explicit pause should still persist.');
  page = start({ storage }); await settle();
  assert.equal(page.frames.size, 0);
  page.motion.emit('click'); await settle();
  assert.equal(page.frames.size, 1);
  assert.equal(storage.get('taro.motion-v2'), 'running');
  const reduced = start({ reduced: true }); await settle();
  assert.equal(reduced.frames.size, 0, 'Respect reduced motion on the initial visit.');
  reduced.motion.emit('click'); await settle();
  assert.equal(reduced.frames.size, 1, 'Explicit play should work even with reduced motion enabled.');
  console.log('OK: photo controls, old preference recovery, reload, all 14 fractals, history restore, visibility, and explicit motion preferences.');
})().catch(error => { console.error(error); process.exitCode = 1; });
