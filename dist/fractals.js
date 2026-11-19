/* One mathematical construction at a time. No images or rendering dependencies. */
(() => {
  'use strict';
  const canvas = document.getElementById('fractal-canvas');
  const caption = document.getElementById('fractal-caption');
  const hero = canvas?.closest('.hero');
  const context = canvas?.getContext('2d');
  if (!hero || !context) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a.map((value, i) => Math.round(value + (b[i] - value) * t));
  const rgba = (rgb, alpha = 1) => `rgba(${rgb.join(',')},${alpha})`;
  const scenes = [
    { id: 'dragon', en: 'Dragon curve', ja: 'ドラゴン曲線', duration: 9600, levels: 12 },
    { id: 'mandelbrot', en: 'Mandelbrot set', ja: 'マンデルブロ集合', duration: 9600, levels: 11 },
    { id: 'menger', en: 'Menger sponge', ja: 'メンガーのスポンジ', duration: 10000, levels: 3 },
    { id: 'koch', en: 'Koch curve', ja: 'コッホ曲線', duration: 8800, levels: 6 },
    { id: 'sierpinski', en: 'Sierpiński gasket', ja: 'シェルピンスキーのギャスケット', duration: 9200, levels: 7 },
    { id: 'fern', en: 'Barnsley fern', ja: 'バーンズリーのシダ', duration: 10000 },
    { id: 'romanesco', en: 'Romanesco', ja: 'ロマネスコ', duration: 10800, levels: 3 }
  ];
  const HOLD = 1400;
  const FADE = 650;
  let sceneIndex = 0;
  let elapsed = 0;
  let frame = 0;
  let lastTime = null;
  let lastPaint = -Infinity;
  let visible = true;
  let size = 0;
  let palette;
  let theme = '';
  let staticPreview = false;
  const sprites = new Map();
  const geometries = new Map();
  const fillColors = new Map();

  function usePalette() {
    theme = root.dataset.theme || 'light';
    palette = theme === 'dark'
      ? { ink: [129, 179, 255], base: [12, 21, 39] }
      : { ink: [37, 99, 200], base: [245, 248, 253] };
    sprites.clear();
    fillColors.clear();
  }

  function shaded(shade) {
    if (!fillColors.has(shade)) fillColors.set(shade, rgba(mix(palette.base, palette.ink, shade)));
    return fillColors.get(shade);
  }

  function surface() {
    const image = document.createElement('canvas');
    image.width = image.height = size;
    return image;
  }

  function unitContext(target) {
    const ctx = target.getContext('2d');
    ctx.setTransform(size / 2, 0, 0, size / 2, size / 2, size / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return ctx;
  }

  function path(ctx, points, close = false) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (close) ctx.closePath();
  }

  function normalizeStages(stages) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    stages.forEach(points => points.forEach(([x, y]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }));
    const scale = 1.8 / Math.max(maxX - minX, maxY - minY);
    return stages.map(points => points.map(([x, y]) => [
      (x - (maxX + minX) / 2) * scale,
      (y - (maxY + minY) / 2) * scale
    ]));
  }

  function curveStages(kind) {
    if (geometries.has(kind)) return geometries.get(kind);
    const stages = [[[0, 0], [1, 0]]];
    const count = kind === 'dragon' ? 12 : 6;
    for (let level = 0; level < count; level += 1) {
      const old = stages[level];
      const next = [old[0]];
      for (let i = 0; i < old.length - 1; i += 1) {
        const a = old[i], b = old[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        if (kind === 'dragon') {
          // Alternating right-angle folds give the Heighway dragon.
          const sign = i % 2 ? -1 : 1;
          next.push([(a[0] + b[0] + sign * dy) / 2, (a[1] + b[1] - sign * dx) / 2]);
        } else {
          next.push([a[0] + dx / 3, a[1] + dy / 3]);
          next.push([(a[0] + b[0]) / 2 + dy * Math.sqrt(3) / 6, (a[1] + b[1]) / 2 - dx * Math.sqrt(3) / 6]);
          next.push([a[0] + dx * 2 / 3, a[1] + dy * 2 / 3]);
        }
        next.push(b);
      }
      stages.push(next);
    }
    const result = normalizeStages(stages);
    geometries.set(kind, result);
    return result;
  }

  function drawCurve(kind, progress) {
    const stages = curveStages(kind);
    const position = progress * (stages.length - 1);
    const level = Math.min(stages.length - 2, Math.floor(position));
    const t = smooth(position - level);
    const old = stages[level], next = stages[level + 1];
    const ratio = (next.length - 1) / (old.length - 1);
    const points = next.map(([x, y], i) => {
      const index = Math.min(old.length - 2, Math.floor(i / ratio));
      const fraction = i / ratio - index;
      const ox = old[index][0] + (old[index + 1][0] - old[index][0]) * fraction;
      const oy = old[index][1] + (old[index + 1][1] - old[index][1]) * fraction;
      return [ox + (x - ox) * t, oy + (y - oy) * t];
    });
    path(context, points);
    context.strokeStyle = rgba(palette.ink, .87);
    context.lineWidth = Math.max(1.2, size / 650) * 2 / size;
    context.stroke();
  }

  const mandelbrotLimits = [2, 3, 4, 6, 9, 14, 22, 35, 56, 90, 145, 233];
  function mandelbrotData() {
    if (geometries.has('mandelbrot')) return geometries.get('mandelbrot');
    const width = 420, height = 336;
    const escapes = new Uint16Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const ci = (y / (height - 1) - .5) * 2.8;
      for (let x = 0; x < width; x += 1) {
        const cr = -2.5 + x / (width - 1) * 3.5;
        let zr = 0, zi = 0, n = 0;
        while (zr * zr + zi * zi <= 4 && n < 234) {
          const next = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = next;
          n += 1;
        }
        escapes[y * width + x] = n;
      }
    }
    const result = { width, height, escapes };
    geometries.set('mandelbrot', result);
    return result;
  }

  function mandelbrotSprite(level) {
    const key = `mandelbrot-${level}`;
    if (sprites.has(key)) return sprites.get(key);
    const { width, height, escapes } = mandelbrotData();
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    const ctx = image.getContext('2d');
    const pixels = ctx.createImageData(width, height);
    const limit = mandelbrotLimits[level];
    const insideColor = mix(palette.ink, [80, 184, 209], .08);
    const outsideColor = mix(palette.ink, [80, 184, 209], .35);
    escapes.forEach((escape, i) => {
      const inside = escape > limit;
      const x = i % width, y = Math.floor(i / width);
      const edge = smooth(Math.min(x, width - 1 - x, y, height - 1 - y) / 28);
      const alpha = inside ? .76 : escape <= 2 ? 0 : Math.min(.46, .045 + Math.sqrt(escape) * .032);
      const color = inside ? insideColor : outsideColor;
      pixels.data[i * 4] = color[0];
      pixels.data[i * 4 + 1] = color[1];
      pixels.data[i * 4 + 2] = color[2];
      pixels.data[i * 4 + 3] = Math.round(255 * alpha * edge);
    });
    ctx.putImageData(pixels, 0, 0);
    sprites.set(key, image);
    return image;
  }

  // Orthographic projection, viewed from above and along the positive x/z axes.
  const project = ([x, y, z]) => [(x - z) * .83, (x + z) * .36 - y * .92];
  function mengerFaces(level) {
    const key = `menger-${level}`;
    if (geometries.has(key)) return geometries.get(key);
    const n = 3 ** level;
    function solid(x, y, z) {
      if ([x, y, z].some(v => v < 0 || v >= n)) return false;
      for (let k = 0; k < level; k += 1) {
        if ([x % 3, y % 3, z % 3].filter(v => v === 1).length >= 2) return false;
        x = Math.floor(x / 3); y = Math.floor(y / 3); z = Math.floor(z / 3);
      }
      return true;
    }
    const faces = [];
    for (let x = 0; x < n; x += 1) for (let y = 0; y < n; y += 1) for (let z = 0; z < n; z += 1) {
      if (!solid(x, y, z)) continue;
      const a = x / n - .5, b = y / n - .5, c = z / n - .5, d = 1 / n;
      const add = (points, shade) => faces.push({ points: points.map(project), shade, depth: (x + y + z) / n + .5 / n });
      if (!solid(x + 1, y, z)) add([[a+d,b,c],[a+d,b+d,c],[a+d,b+d,c+d],[a+d,b,c+d]], .42);
      if (!solid(x, y, z + 1)) add([[a,b,c+d],[a+d,b,c+d],[a+d,b+d,c+d],[a,b+d,c+d]], .21);
      if (!solid(x, y + 1, z)) add([[a,b+d,c],[a,b+d,c+d],[a+d,b+d,c+d],[a+d,b+d,c]], .65);
    }
    faces.sort((a, b) => a.depth - b.depth);
    geometries.set(key, faces);
    return faces;
  }

  function mengerSprite(level) {
    const key = `menger-${level}`;
    if (sprites.has(key)) return sprites.get(key);
    const image = surface();
    const ctx = unitContext(image);
    mengerFaces(level).forEach(face => {
      path(ctx, face.points, true);
      ctx.fillStyle = shaded(face.shade);
      ctx.fill();
      ctx.strokeStyle = rgba(palette.ink, .56);
      ctx.lineWidth = 1.1 / size;
      ctx.stroke();
    });
    sprites.set(key, image);
    return image;
  }

  function drawRefinement(progress, count, sprite, ratio = 1) {
    const position = progress * count;
    const level = Math.min(count - 1, Math.floor(position));
    const t = smooth((position - level - .13) / .74);
    const alpha = context.globalAlpha;
    context.globalAlpha = alpha * (1 - t);
    context.drawImage(sprite(level), -.98, -.98 * ratio, 1.96, 1.96 * ratio);
    context.globalAlpha = alpha * t;
    context.drawImage(sprite(level + 1), -.98, -.98 * ratio, 1.96, 1.96 * ratio);
    context.globalAlpha = alpha;
  }

  function gasketGeometry() {
    if (geometries.has('sierpinski')) return geometries.get('sierpinski');
    const outer = [[0, -.86], [.99, .86], [-.99, .86]];
    const holes = [];
    const middle = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    function divide([a, b, c], depth) {
      if (depth === 7) return;
      const ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
      const points = [ab, bc, ca];
      holes.push({ points, depth, center: [(ab[0] + bc[0] + ca[0]) / 3, (ab[1] + bc[1] + ca[1]) / 3] });
      [[a, ab, ca], [ab, b, bc], [ca, bc, c]].forEach(points => divide(points, depth + 1));
    }
    divide(outer, 0);
    const result = { outer, holes: holes.sort((a, b) => a.depth - b.depth) };
    geometries.set('sierpinski', result);
    return result;
  }

  function drawGasket(progress) {
    const { outer, holes } = gasketGeometry();
    path(context, outer, true);
    context.fillStyle = rgba(palette.ink, .28); context.fill();
    context.strokeStyle = rgba(palette.ink, .78);
    context.lineWidth = 2.2 / size; context.stroke();
    const position = progress * 7;
    holes.forEach(({ points, center, depth }) => {
      const t = smooth((position - depth) / .85);
      if (!t) return;
      path(context, points.map(([x, y]) => [center[0] + (x - center[0]) * t, center[1] + (y - center[1]) * t]), true);
      context.globalCompositeOperation = 'destination-out';
      // Clear the hole even during the scene's entrance/exit fade.
      const alpha = context.globalAlpha;
      context.fillStyle = '#000';
      context.globalAlpha = 1; context.fill(); context.globalAlpha = alpha;
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = rgba(palette.ink, .73);
      context.lineWidth = 1.35 / size; context.stroke();
    });
  }

  function fernPoints() {
    if (geometries.has('fern')) return geometries.get('fern');
    const points = new Float32Array(100000);
    let x = 0, y = 0, seed = 1729;
    for (let i = -30; i < 50000; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const r = seed / 4294967296;
      let nx, ny;
      if (r < .01) { nx = 0; ny = .16 * y; }
      else if (r < .86) { nx = .85*x + .04*y; ny = -.04*x + .85*y + 1.6; }
      else if (r < .93) { nx = .2*x - .26*y; ny = .23*x + .22*y + 1.6; }
      else { nx = -.15*x + .28*y; ny = .26*x + .24*y + .44; }
      x = nx; y = ny;
      if (i >= 0) { points[i*2] = (x - .24) * .181; points[i*2+1] = .91 - y * .182; }
    }
    geometries.set('fern', points);
    return points;
  }

  function drawFern(progress) {
    let cache = sprites.get('fern');
    const target = Math.floor(progress * 50000);
    if (!cache || target < cache.count) {
      cache = { image: surface(), count: 0 };
      sprites.set('fern', cache);
    }
    const ctx = unitContext(cache.image), points = fernPoints();
    ctx.fillStyle = rgba(palette.ink, .62);
    const dot = 1.9 / size;
    for (let i = cache.count; i < target; i += 1) ctx.fillRect(points[i*2], points[i*2+1], dot, dot);
    cache.count = target;
    context.drawImage(cache.image, -1, -1, 2, 2);
  }

  function romanescoGeometry() {
    if (geometries.has('romanesco')) return geometries.get('romanesco');
    // A botanical model: self-similar conical florets in golden-angle spirals.
    const cones = [], goldenAngle = Math.PI * (3 - Math.sqrt(5));
    function cone(base, height, radius, depth, phase, birth) {
      const lean = depth ? .24 : 0;
      const direction = [lean * Math.cos(phase), 1, lean * Math.sin(phase)];
      const center = project(base);
      const faces = [];
      const sides = depth === 3 ? 8 : 14, rings = depth === 3 ? 2 : 4;
      function floretPoint(t, angle) {
        const r = radius * Math.pow(1 - t, 1.05) * (1 + .35 * Math.sin(Math.PI * t));
        return project([base[0] + direction[0]*height*t + Math.cos(angle)*r, base[1] + height*t, base[2] + direction[2]*height*t + Math.sin(angle)*r]);
      }
      for (let ring = 0; ring < rings; ring += 1) for (let i = 0; i < sides; i += 1) {
        const a = i / sides * Math.PI * 2, b = (i + 1) / sides * Math.PI * 2;
        const normal = Math.cos((a+b)/2) + Math.sin((a+b)/2) + radius / height;
        if (normal < 0) continue;
        const polygon = new Path2D();
        [floretPoint(ring/rings, a), floretPoint(ring/rings, b), floretPoint((ring+1)/rings, b), floretPoint((ring+1)/rings, a)].forEach(([x,y], j) => j ? polygon.lineTo(x,y) : polygon.moveTo(x,y));
        polygon.closePath();
        faces.push({ polygon, shade: .2 + .3 * clamp(normal / 2) + ring / rings * .04 });
      }
      cones.push({ center, faces, birth, depth: base[0] + base[2] + base[1] * .8 + height * .25 });
      if (depth === 3) return;
      const count = [21, 8, 4][depth];
      for (let i = 0; i < count; i += 1) {
        const u = .15 + .79 * (i + .5) / count, angle = phase + i * goldenAngle;
        const r = radius * u;
        const child = [base[0] + Math.cos(angle)*r, base[1] + height*(1-u), base[2] + Math.sin(angle)*r];
        cone(child, height * .36 * (.55 + .45*u), radius * .33 * (.45 + .55*u), depth + 1, angle, depth + .58 + i / count * .42);
      }
    }
    cone([0,-.67,0], 1.55, .78, 0, .2, -.2);
    cones.sort((a,b) => a.depth - b.depth);
    geometries.set('romanesco', cones);
    return cones;
  }

  function drawRomanesco(progress) {
    const position = progress * 3.6;
    context.save();
    context.scale(.74, .74);
    context.lineWidth = .75 / size;
    romanescoGeometry().forEach(({ center, faces, birth }) => {
      const scale = smooth((position - birth) / .55);
      if (!scale) return;
      context.save();
      context.translate(center[0], center[1]);
      context.scale(scale, scale);
      context.translate(-center[0], -center[1]);
      faces.forEach(({ polygon, shade }) => {
        context.fillStyle = shaded(shade);
        context.fill(polygon);
        context.strokeStyle = rgba(palette.ink, .13);
        context.stroke(polygon);
      });
      context.restore();
    });
    context.restore();
  }

  function paint(progressOverride) {
    if (!size) return;
    const scene = scenes[sceneIndex];
    const progress = progressOverride ?? clamp(elapsed / scene.duration);
    const fade = Math.min(smooth(elapsed / FADE), 1 - smooth((elapsed - scene.duration - HOLD) / FADE));
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, size, size);
    context.setTransform(size / 2, 0, 0, size / 2, size / 2, size / 2);
    context.lineCap = context.lineJoin = 'round';
    context.globalAlpha = progressOverride === undefined ? fade : 1;
    if (scene.id === 'dragon' || scene.id === 'koch') drawCurve(scene.id, progress);
    else if (scene.id === 'mandelbrot') drawRefinement(progress, 11, mandelbrotSprite, .8);
    else if (scene.id === 'menger') drawRefinement(progress, 3, mengerSprite);
    else if (scene.id === 'sierpinski') drawGasket(progress);
    else if (scene.id === 'fern') drawFern(progress);
    else drawRomanesco(progress);
    context.globalAlpha = 1;
    canvas.dataset.fractal = scene.id;
    canvas.dataset.progress = progress.toFixed(3);
    const language = root.lang === 'ja' ? 'ja' : 'en';
    const text = scene[language];
    if (caption && caption.textContent !== text) caption.textContent = text;
    if (caption) caption.style.opacity = String(progressOverride === undefined ? fade : 1);
  }

  function canRun() {
    return visible && !document.hidden && root.dataset.motion !== 'paused'
      && !reducedMotion.matches && !root.classList.contains('photo-viewer-open');
  }

  function tick(time) {
    frame = 0;
    if (!canRun()) { lastTime = null; return; }
    if (lastTime !== null) elapsed += Math.max(0, time - lastTime);
    lastTime = time;
    const scene = scenes[sceneIndex];
    if (elapsed >= scene.duration + HOLD + FADE) {
      elapsed = 0;
      sceneIndex = (sceneIndex + 1) % scenes.length;
      sprites.clear();
    }
    // Cap background rendering at 25 fps; no work runs offscreen or in another tab.
    if (time - lastPaint >= 40) { paint(); lastPaint = time; }
    frame = requestAnimationFrame(tick);
  }

  function refresh() {
    if (theme !== (root.dataset.theme || 'light')) usePalette();
    if (canRun()) {
      if (staticPreview) { elapsed = 0; staticPreview = false; }
      if (!frame) { lastTime = null; lastPaint = -Infinity; frame = requestAnimationFrame(tick); }
      paint();
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; lastTime = null;
      // A first visit with motion reduced still gets a complete, static fractal.
      if (elapsed === 0) staticPreview = true;
      paint(staticPreview ? 1 : undefined);
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const next = Math.round(Math.min(960, Math.max(1, bounds.width) * Math.min(window.devicePixelRatio || 1, 1.6)));
    if (next === size) return;
    size = next;
    canvas.width = canvas.height = size;
    sprites.clear();
    refresh();
  }

  usePalette();
  new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ['data-motion', 'data-theme', 'lang', 'class'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; refresh();
  }, { threshold: 0 }).observe(hero);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; lastTime = null; });
  window.addEventListener('pageshow', refresh);
  reducedMotion.addEventListener('change', refresh);
  resize();
})();
