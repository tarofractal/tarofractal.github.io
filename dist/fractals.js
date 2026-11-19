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
    { id: 'dragon', en: 'Dragon curve', ja: 'ドラゴン曲線', duration: 9600, colors: [[70,208,235],[142,125,255]] },
    { id: 'mandelbrot', en: 'Mandelbrot set', ja: 'マンデルブロ集合', duration: 9600, colors: [[128,144,255],[79,225,225]] },
    { id: 'menger', en: 'Menger sponge', ja: 'メンガーのスポンジ', duration: 10000, colors: [[80,176,255],[153,127,255]] },
    { id: 'koch', en: 'Koch curve', ja: 'コッホ曲線', duration: 8800, colors: [[75,216,238],[108,139,255]] },
    { id: 'sierpinski', en: 'Sierpiński gasket', ja: 'シェルピンスキーのギャスケット', duration: 9200, colors: [[170,137,255],[92,206,242]] },
    { id: 'fern', en: 'Barnsley fern', ja: 'バーンズリーのシダ', duration: 10000, colors: [[67,215,179],[78,163,238]] },
    { id: 'julia', en: 'Julia set', ja: 'ジュリア集合', duration: 9600, colors: [[175,130,250],[73,212,230]] },
    { id: 'hilbert', en: 'Hilbert curve', ja: 'ヒルベルト曲線', duration: 9000, colors: [[92,174,255],[184,128,246]] },
    { id: 'pythagoras', en: 'Pythagoras tree', ja: 'ピタゴラスの木', duration: 9800, colors: [[64,173,228],[82,226,181]] },
    { id: 'levy', en: 'Lévy C curve', ja: 'レヴィC曲線', duration: 9400, colors: [[78,218,237],[146,132,255]] },
    { id: 'burning-ship', en: 'Burning Ship fractal', ja: 'バーニングシップ・フラクタル', duration: 9600, colors: [[238,143,133],[161,118,246]] },
    { id: 'vicsek', en: 'Vicsek fractal', ja: 'ヴィチェック・フラクタル', duration: 9000, colors: [[147,148,251],[82,205,231]] },
    { id: 'newton', en: 'Newton fractal', ja: 'ニュートン・フラクタル', duration: 9800, colors: [[86,211,229],[173,133,254]] },
    { id: 'cantor', en: 'Cantor dust', ja: 'カントールの塵', duration: 9000, colors: [[108,170,247],[185,134,239]] }
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
  let paletteScene = '';
  let staticPreview = false;
  const sprites = new Map();
  const geometries = new Map();
  const fillColors = new Map();

  function usePalette() {
    theme = root.dataset.theme || 'light';
    const scene = scenes[sceneIndex];
    const dark = theme === 'dark';
    paletteScene = scene.id;
    palette = {
      ink: dark ? scene.colors[0] : mix(scene.colors[0], [18,47,104], .38),
      tip: dark ? scene.colors[1] : mix(scene.colors[1], [27,44,112], .32),
      base: dark ? [12,21,39] : [245,248,253]
    };
    hero.style.setProperty('--fractal-ink', rgba(palette.ink));
    hero.style.setProperty('--fractal-tip', rgba(palette.tip));
    sprites.clear();
    fillColors.clear();
  }

  function shaded(shade) {
    if (!fillColors.has(shade)) fillColors.set(shade, rgba(mix(palette.base, mix(palette.ink, palette.tip, 1 - shade), shade)));
    return fillColors.get(shade);
  }

  function spectrum(ctx, alpha = 1) {
    const gradient = ctx.createLinearGradient(-.8, .8, .8, -.8);
    gradient.addColorStop(0, rgba(palette.ink, alpha));
    gradient.addColorStop(.55, rgba(mix(palette.ink, palette.tip, .46), alpha));
    gradient.addColorStop(1, rgba(palette.tip, alpha));
    return gradient;
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
    if (kind === 'hilbert') {
      const stages = [];
      for (let order = 1; order <= 6; order += 1) {
        const n = 2 ** order, points = [];
        for (let distance = 0; distance < n*n; distance += 1) {
          let x = 0, y = 0, t = distance;
          for (let scale = 1; scale < n; scale *= 2) {
            const rx = 1 & Math.floor(t / 2), ry = 1 & (t ^ rx);
            if (ry === 0) {
              if (rx === 1) { x = scale - 1 - x; y = scale - 1 - y; }
              [x,y] = [y,x];
            }
            x += scale*rx; y += scale*ry; t = Math.floor(t/4);
          }
          points.push([x/(n-1), y/(n-1)]);
        }
        stages.push(points);
      }
      const result = normalizeStages(stages);
      geometries.set(kind, result);
      return result;
    }
    const stages = [[[0, 0], [1, 0]]];
    const count = kind === 'koch' ? 6 : 12;
    for (let level = 0; level < count; level += 1) {
      const old = stages[level];
      const next = [old[0]];
      for (let i = 0; i < old.length - 1; i += 1) {
        const a = old[i], b = old[i + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1];
        if (kind === 'dragon' || kind === 'levy') {
          // Alternating folds form the dragon; equal turns form the Lévy C curve.
          const sign = kind === 'dragon' && i % 2 ? -1 : 1;
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
    context.strokeStyle = spectrum(context, .95);
    context.lineWidth = Math.max(1.2, size / 650) * 2 / size;
    context.stroke();
  }

  const escapeLimits = [2,3,4,6,9,14,22,35,56,90,145,233];
  const newtonLimits = [1,2,3,4,5,7,10,14,20,28,38,52];
  function escapeData(kind) {
    if (geometries.has(kind)) return geometries.get(kind);
    const width = 420, height = 336;
    const escapes = new Uint16Array(width*height), roots = new Uint8Array(width*height);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      let cr = -2.5 + x/(width-1)*3.5, ci = (y/(height-1)-.5)*2.8;
      let zr = 0, zi = 0, n = 0, basin = 0;
      if (kind === 'julia') {
        zr = (x/(width-1)-.5)*3.5; zi = ci; cr = -.8; ci = .156;
      } else if (kind === 'burning-ship') {
        cr = -2.2 + x/(width-1)*3.3; ci = 1 - y/(height-1)*2.85;
      } else if (kind === 'newton') {
        zr = (x/(width-1)-.5)*4.3; zi = (y/(height-1)-.5)*3.44;
      }
      if (kind === 'newton') {
        n = 53;
        for (let step = 1; step <= 52; step += 1) {
          const rr = zr*zr - zi*zi, ii = 2*zr*zi, denominator = 3*(rr*rr + ii*ii);
          if (denominator < 1e-20) break;
          zr = zr*2/3 + rr/denominator; zi = zi*2/3 - ii/denominator;
          const distances = [(zr-1)**2 + zi*zi, (zr+.5)**2 + (zi-Math.sqrt(3)/2)**2, (zr+.5)**2 + (zi+Math.sqrt(3)/2)**2];
          const nearest = Math.min(...distances);
          if (nearest < 1e-8) { n = step; basin = distances.indexOf(nearest); break; }
        }
      } else {
        while (zr*zr + zi*zi <= 4 && n < 234) {
          if (kind === 'burning-ship') { zr = Math.abs(zr); zi = Math.abs(zi); }
          const next = zr*zr - zi*zi + cr;
          zi = 2*zr*zi + ci; zr = next; n += 1;
        }
      }
      escapes[y*width+x] = n; roots[y*width+x] = basin;
    }
    const result = { width, height, escapes, roots };
    geometries.set(kind, result);
    return result;
  }

  function escapeSprite(kind, level) {
    const key = `${kind}-${level}`;
    if (sprites.has(key)) return sprites.get(key);
    const { width, height, escapes, roots } = escapeData(kind);
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    const ctx = image.getContext('2d'), pixels = ctx.createImageData(width,height);
    const limit = (kind === 'newton' ? newtonLimits : escapeLimits)[level];
    const bands = Array.from({length:235}, (_,n) => {
      const wave = .5 + .5*Math.cos(Math.log(n+1)*4.5);
      return { color:mix(palette.ink,palette.tip,.5+.5*Math.sin(Math.log(n+1)*2.2)), alpha:.1+.34*wave };
    });
    const blue = theme === 'dark' ? [103,155,255] : [61,106,187];
    const basinColors = [palette.ink,palette.tip,blue];
    for (let i = 0; i < escapes.length; i += 1) {
      const escape = escapes[i], x = i%width, y = Math.floor(i/width);
      let edge = smooth(Math.min(x,width-1-x,y,height-1-y)/32);
      let color, alpha;
      if (kind === 'newton') {
        color = basinColors[roots[i]];
        alpha = escape <= limit ? .42 + .2*Math.cos(escape*.9)**2 : 0;
        edge *= smooth((1.1-Math.hypot((x/width-.5)*2,(y/height-.5)*2))/.24);
      } else {
        const inside = escape > limit;
        color = inside ? mix(palette.ink,palette.tip,.35) : bands[escape].color;
        alpha = inside ? .32 : escape <= 2 ? 0 : bands[escape].alpha;
      }
      const j = i*4;
      pixels.data[j] = color[0]; pixels.data[j+1] = color[1]; pixels.data[j+2] = color[2];
      pixels.data[j+3] = Math.round(255*alpha*edge);
    }
    ctx.putImageData(pixels,0,0);
    sprites.set(key,image);
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
    context.strokeStyle = spectrum(context,.85);
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
      context.strokeStyle = spectrum(context,.8);
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
    ctx.fillStyle = spectrum(ctx,.72);
    const dot = 1.9 / size;
    for (let i = cache.count; i < target; i += 1) ctx.fillRect(points[i*2], points[i*2+1], dot, dot);
    cache.count = target;
    context.drawImage(cache.image, -1, -1, 2, 2);
  }

  function squareGeometry(kind, level) {
    const key = `${kind}-${level}`;
    if (geometries.has(key)) return geometries.get(key);
    let squares = [[-.9,-.9,1.8]];
    const positions = kind === 'cantor' ? [[0,0],[2,0],[0,2],[2,2]] : [[1,0],[0,1],[1,1],[2,1],[1,2]];
    for (let step = 0; step < level; step += 1) {
      squares = squares.flatMap(([x,y,side]) => positions.map(([a,b]) => [x+a*side/3,y+b*side/3,side/3]));
    }
    geometries.set(key,squares);
    return squares;
  }

  function squareSprite(kind, level) {
    const key = `${kind}-${level}`;
    if (sprites.has(key)) return sprites.get(key);
    const image = surface(), ctx = unitContext(image);
    ctx.fillStyle = spectrum(ctx,.25);
    ctx.strokeStyle = spectrum(ctx,.83);
    ctx.lineWidth = 1.4/size;
    squareGeometry(kind,level).forEach(([x,y,side]) => {
      ctx.fillRect(x,y,side,side); ctx.strokeRect(x,y,side,side);
    });
    sprites.set(key,image);
    return image;
  }

  function treeGeometry() {
    if (geometries.has('pythagoras')) return geometries.get('pythagoras');
    const squares = [];
    function branch(a,b,depth) {
      const dx = b[0]-a[0], dy = b[1]-a[1];
      const c = [b[0]+dy,b[1]-dx], d = [a[0]+dy,a[1]-dx];
      const peak = [(c[0]+d[0]+dy)/2,(c[1]+d[1]-dx)/2];
      squares.push({points:[a,b,c,d],depth});
      if (depth < 10) { branch(d,peak,depth+1); branch(peak,c,depth+1); }
    }
    branch([-.12,.9],[.12,.9],0);
    const normalized = normalizeStages(squares.map(square=>square.points));
    const result = squares.map((square,i)=>({...square,points:normalized[i]}));
    geometries.set('pythagoras',result);
    return result;
  }

  function drawTree(progress) {
    const position = progress*11;
    treeGeometry().forEach(({points,depth}) => {
      const growth = smooth((position-depth)/.85);
      if (!growth) return;
      const center = [(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2];
      path(context,points.map(([x,y])=>[center[0]+(x-center[0])*growth,center[1]+(y-center[1])*growth]),true);
      const color = mix(palette.ink,palette.tip,depth/10);
      context.fillStyle = rgba(color,.13); context.fill();
      context.strokeStyle = rgba(color,.83); context.lineWidth = 1.8/size; context.stroke();
    });
  }

  function paint(progressOverride) {
    if (!size) return;
    const scene = scenes[sceneIndex];
    if (paletteScene !== scene.id) usePalette();
    const progress = progressOverride ?? clamp(elapsed / scene.duration);
    const fade = Math.min(smooth(elapsed / FADE), 1 - smooth((elapsed - scene.duration - HOLD) / FADE));
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, size, size);
    context.setTransform(size / 2, 0, 0, size / 2, size / 2, size / 2);
    context.lineCap = context.lineJoin = 'round';
    context.globalAlpha = progressOverride === undefined ? fade : 1;
    if (['dragon','koch','hilbert','levy'].includes(scene.id)) drawCurve(scene.id,progress);
    else if (['mandelbrot','julia','burning-ship','newton'].includes(scene.id)) drawRefinement(progress,11,level=>escapeSprite(scene.id,level),.8);
    else if (scene.id === 'menger') drawRefinement(progress, 3, mengerSprite);
    else if (scene.id === 'sierpinski') drawGasket(progress);
    else if (scene.id === 'fern') drawFern(progress);
    else if (scene.id === 'pythagoras') drawTree(progress);
    else if (scene.id === 'vicsek' || scene.id === 'cantor') drawRefinement(progress,5,level=>squareSprite(scene.id,level));
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
