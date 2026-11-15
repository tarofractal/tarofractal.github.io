(() => {
  'use strict';

  const root = document.documentElement;
  const byId = (id) => document.getElementById(id);
  const readPreference = (key, fallback) => {
    try { return localStorage.getItem(`taro.${key}`) || fallback; }
    catch { return fallback; }
  };
  const savePreference = (key, value) => {
    try { localStorage.setItem(`taro.${key}`, value); }
    catch { /* Preferences remain available for this visit. */ }
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let locale = readPreference('language', 'en') === 'ja' ? 'ja' : 'en';
  let theme = readPreference('theme', 'light') === 'dark' ? 'dark' : 'light';
  let paused = readPreference('motion', reducedMotion.matches ? 'paused' : 'running') === 'paused';
  let selectedFilter = 'all';
  let copyState = '';
  let orbit = null;

  const messages = {
    en: { copied: 'Email copied.', failed: 'Please copy: tarofractal@gmail.com', language: 'Switch to Japanese', night: 'Night', day: 'Day', pause: 'Pause motion', resume: 'Resume motion', themeDark: 'Switch to night theme', themeLight: 'Switch to day theme' },
    ja: { copied: 'メールアドレスをコピーしました。', failed: 'こちらをコピーしてください：tarofractal@gmail.com', language: 'Switch to English', night: '夜', day: '昼', pause: '動きを止める', resume: '動きを再開', themeDark: '夜のテーマに切り替える', themeLight: '昼のテーマに切り替える' }
  };

  function updateControls() {
    const m = messages[locale];
    const languageLabel = byId('language-label');
    if (languageLabel) languageLabel.textContent = locale === 'en' ? '日本語' : 'EN';
    byId('language-toggle')?.setAttribute('aria-label', m.language);
    const themeLabel = byId('theme-label');
    if (themeLabel) themeLabel.textContent = theme === 'light' ? m.night : m.day;
    const themeButton = byId('theme-toggle');
    themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
    themeButton?.setAttribute('aria-label', theme === 'light' ? m.themeDark : m.themeLight);
    const motionLabel = byId('motion-label');
    if (motionLabel) motionLabel.textContent = paused ? m.resume : m.pause;
    const motionButton = byId('motion-toggle');
    motionButton?.setAttribute('aria-pressed', String(paused));
    motionButton?.setAttribute('aria-label', paused ? m.resume : m.pause);
    if (copyState && byId('copy-status')) byId('copy-status').textContent = m[copyState];
  }

  function filterWork(announce = true) {
    let count = 0;
    document.querySelectorAll('[data-category]').forEach((article) => {
      const visible = selectedFilter === 'all' || article.dataset.category === selectedFilter;
      article.hidden = !visible;
      if (visible) count += 1;
    });
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === selectedFilter));
    });
    if (announce && byId('filter-status')) {
      byId('filter-status').textContent = locale === 'ja' ? `${count}件を表示しています。` : `${count} ${count === 1 ? 'project' : 'projects'} shown.`;
    }
  }

  function setLanguage(next) {
    locale = next;
    root.lang = locale;
    document.querySelectorAll('[data-en][data-ja]').forEach((element) => {
      element.textContent = element.dataset[locale];
    });
    updateControls();
    filterWork(false);
    if (byId('filter-status')?.textContent) filterWork(true);
    savePreference('language', locale);
  }

  function setTheme(next) {
    theme = next;
    root.dataset.theme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#1c2420' : '#f5f3ed';
    updateControls();
    savePreference('theme', theme);
    orbit?.refresh();
  }

  function setMotion(next, persist = true) {
    paused = next;
    root.dataset.motion = paused ? 'paused' : 'running';
    updateControls();
    if (persist) savePreference('motion', paused ? 'paused' : 'running');
    orbit?.refresh();
  }

  byId('language-toggle')?.addEventListener('click', () => setLanguage(locale === 'en' ? 'ja' : 'en'));
  byId('theme-toggle')?.addEventListener('click', () => setTheme(theme === 'light' ? 'dark' : 'light'));
  byId('motion-toggle')?.addEventListener('click', () => setMotion(!paused));
  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedFilter = button.dataset.filter;
      filterWork();
    });
  });

  function legacyCopy() {
    const input = document.createElement('textarea');
    input.value = 'tarofractal@gmail.com';
    input.readOnly = true;
    input.setAttribute('aria-label', 'Email address');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;';
    const focusBeforeCopy = document.activeElement;
    document.body.append(input);
    input.select();
    let success = false;
    try { success = document.execCommand('copy'); }
    catch { success = false; }
    input.remove();
    focusBeforeCopy?.focus({ preventScroll: true });
    return success;
  }

  byId('copy-email')?.addEventListener('click', async () => {
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText('tarofractal@gmail.com'); copied = true; }
      catch { copied = legacyCopy(); }
    } else copied = legacyCopy();
    copyState = copied ? 'copied' : 'failed';
    const status = byId('copy-status');
    if (status) status.textContent = messages[locale][copyState];
  });

  document.querySelectorAll('[data-year]').forEach((element) => { element.textContent = String(new Date().getFullYear()); });
  setLanguage(locale);
  setTheme(theme);
  setMotion(paused, false);
  document.querySelectorAll('.js-control').forEach((element) => { element.hidden = false; });
  root.classList.add('js-ready');

  const canvas = byId('orbit-canvas');
  const context = canvas?.getContext('2d');
  if (canvas && context) {
    const scene = canvas.closest('.orbit-scene') || canvas.parentElement;
    let width = 1;
    let height = 1;
    let frame = 0;
    let lastTime = 0;
    let elapsed = 0;
    let visible = true;
    let colors = {};
    const TAU = Math.PI * 2;
    const stars = Array.from({ length: 54 }, (_, index) => ({
      x: ((index * 0.61803398875 + 0.13) % 1),
      y: ((index * index * 0.071 + 0.193) % 1),
      radius: index % 7 === 0 ? 1.15 : 0.65
    }));

    function readColors() {
      const style = getComputedStyle(root);
      colors = {
        ink: style.getPropertyValue('--ink').trim() || (theme === 'dark' ? '#eeeae0' : '#222925'),
        muted: style.getPropertyValue('--muted').trim() || (theme === 'dark' ? '#999f97' : '#6d7269'),
        accent: style.getPropertyValue('--accent').trim() || '#a04e32',
        line: style.getPropertyValue('--line').trim() || (theme === 'dark' ? '#3a413b' : '#d8d9ce')
      };
    }

    function point(latitude, longitude, rotation) {
      const lat = latitude * Math.PI / 180;
      const lon = longitude + rotation;
      const x = Math.cos(lat) * Math.cos(lon);
      const z0 = Math.cos(lat) * Math.sin(lon);
      const y0 = Math.sin(lat);
      const tilt = -0.29;
      const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
      const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
      const roll = -0.32;
      return { x: x * Math.cos(roll) - y * Math.sin(roll), y: x * Math.sin(roll) + y * Math.cos(roll), z };
    }

    function draw() {
      context.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.47;
      const radius = Math.min(width * 0.25, height * 0.255);
      const rotation = elapsed * 0.00007 + 0.45;
      context.fillStyle = colors.muted;
      for (const star of stars) {
        const x = width * (0.06 + star.x * 0.88);
        const y = height * (0.07 + star.y * 0.79);
        if (Math.hypot(x - cx, y - cy) < radius * 1.18) continue;
        context.globalAlpha = star.radius > 1 ? 0.48 : 0.28;
        context.beginPath();
        context.arc(x, y, star.radius, 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;
      context.lineWidth = 0.7;
      context.strokeStyle = colors.line;
      context.setLineDash([2, 6]);
      context.beginPath();
      context.moveTo(cx, cy - radius * 1.55);
      context.lineTo(cx, cy + radius * 1.55);
      context.moveTo(cx - radius * 1.8, cy);
      context.lineTo(cx + radius * 1.8, cy);
      context.stroke();
      context.setLineDash([]);

      const orbitPoint = (angle) => {
        const x = Math.cos(angle) * radius * 1.7;
        const y = Math.sin(angle) * radius * 0.57;
        return { x: cx + x * Math.cos(-0.35) - y * Math.sin(-0.35), y: cy + x * Math.sin(-0.35) + y * Math.cos(-0.35) };
      };
      function orbitArc(start, end, alpha) {
        context.globalAlpha = alpha;
        context.strokeStyle = colors.accent;
        context.lineWidth = 0.85;
        context.beginPath();
        for (let step = 0; step <= 90; step += 1) {
          const p = orbitPoint(start + (end - start) * step / 90);
          if (step === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        }
        context.stroke();
      }
      orbitArc(Math.PI, TAU, 0.35);

      // Front and back meridians are separate passes, preserving depth without a texture.
      function gridLine(samples, front) {
        context.strokeStyle = front ? colors.ink : colors.muted;
        context.globalAlpha = front ? 0.55 : 0.15;
        context.lineWidth = front ? 0.72 : 0.55;
        context.beginPath();
        let active = false;
        for (const p of samples) {
          const included = front ? p.z >= 0 : p.z < 0;
          if (included) {
            const x = cx + p.x * radius;
            const y = cy + p.y * radius;
            if (active) context.lineTo(x, y);
            else context.moveTo(x, y);
          }
          active = included;
        }
        context.stroke();
      }
      const lines = [];
      for (let latitude = -60; latitude <= 60; latitude += 20) {
        const samples = [];
        for (let step = 0; step <= 120; step += 1) samples.push(point(latitude, step / 120 * TAU, rotation));
        lines.push(samples);
      }
      for (let longitude = 0; longitude < 180; longitude += 15) {
        const samples = [];
        for (let step = 0; step <= 120; step += 1) {
          const angle = step / 120 * TAU;
          const x = Math.cos(angle) * Math.cos(longitude * Math.PI / 180);
          const y = Math.sin(angle);
          const z = Math.cos(angle) * Math.sin(longitude * Math.PI / 180);
          const lat = Math.asin(Math.max(-1, Math.min(1, y))) * 180 / Math.PI;
          samples.push(point(lat, Math.atan2(z, x), rotation));
        }
        lines.push(samples);
      }
      for (const front of [false, true]) for (const line of lines) gridLine(line, front);
      context.globalAlpha = 0.65;
      context.strokeStyle = colors.ink;
      context.lineWidth = 0.9;
      context.beginPath();
      context.arc(cx, cy, radius, 0, TAU);
      context.stroke();
      orbitArc(0, Math.PI, 0.8);

      const satellite = orbitPoint(1.22 + elapsed * 0.00018);
      context.globalAlpha = 0.11;
      context.fillStyle = colors.accent;
      context.beginPath();
      context.arc(satellite.x, satellite.y, 9, 0, TAU);
      context.fill();
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(satellite.x, satellite.y, 3, 0, TAU);
      context.fill();
      context.strokeStyle = colors.accent;
      context.globalAlpha = 0.65;
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(cx + radius * 0.87, cy - radius * 0.77);
      context.lineTo(cx + radius * 1.17, cy - radius * 1.04);
      context.lineTo(cx + radius * 1.56, cy - radius * 1.04);
      context.stroke();
      context.globalAlpha = 1;
    }

    function shouldAnimate() { return !paused && visible && !document.hidden; }
    function tick(time) {
      frame = 0;
      if (!shouldAnimate()) { lastTime = 0; return; }
      if (lastTime) elapsed += Math.min(time - lastTime, 70);
      lastTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function refresh() {
      readColors();
      draw();
      if (shouldAnimate() && !frame) frame = requestAnimationFrame(tick);
      if (!shouldAnimate() && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
      }
    }
    function resize() {
      const bounds = scene.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      refresh();
    }
    orbit = { refresh };
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(scene);
    else window.addEventListener('resize', resize, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        refresh();
      }, { rootMargin: '60px' }).observe(scene);
    }
    document.addEventListener('visibilitychange', refresh);
    resize();
    canvas.dataset.ready = "true";
  }
  const motionPreferenceChanged = (event) => {
    // A system request to reduce motion always pauses an existing animation.
    if (event.matches) setMotion(true, false);
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', motionPreferenceChanged);
  else reducedMotion.addListener(motionPreferenceChanged);
})();
