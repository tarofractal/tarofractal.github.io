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
  let paused = reducedMotion.matches || readPreference('motion', 'running') === 'paused';
  let selectedFilter = 'all';
  let copyState = '';
  let slideshow = null;

  const messages = {
    en: { copied: 'Email copied.', failed: 'Please copy: tarofractal@gmail.com', language: 'Switch to Japanese', night: 'Night', day: 'Day', pause: 'Pause slideshow', resume: 'Play slideshow', themeDark: 'Switch to night theme', themeLight: 'Switch to day theme' },
    ja: { copied: 'メールアドレスをコピーしました。', failed: 'こちらをコピーしてください：tarofractal@gmail.com', language: 'Switch to English', night: '夜', day: '昼', pause: 'スライドを止める', resume: 'スライドを再生', themeDark: '夜のテーマに切り替える', themeLight: '昼のテーマに切り替える' }
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
    motionButton?.setAttribute('aria-label', paused ? m.resume : m.pause);
    if (copyState && byId('copy-status')) byId('copy-status').textContent = m[copyState];
    byId('motion-toggle')?.classList.toggle('is-paused', paused);
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
    const title = document.querySelector('title[data-en][data-ja]');
    if (title) document.title = title.dataset[locale];
    document.querySelectorAll('[data-alt-en][data-alt-ja]').forEach((element) => { element.alt = element.dataset[locale === 'ja' ? 'altJa' : 'altEn']; });
    document.querySelectorAll('[data-aria-en][data-aria-ja]').forEach((element) => {
      element.setAttribute('aria-label', element.dataset[locale === 'ja' ? 'ariaJa' : 'ariaEn']);
    });
    document.querySelectorAll('[data-en][data-ja]').forEach((element) => {
      element.textContent = element.dataset[locale];
    });
    updateControls();
    filterWork(false);
    if (byId('filter-status')?.textContent) filterWork(true);
    if (photoDialog?.open) renderPhotograph();
    slideshow?.translate();
    savePreference('language', locale);
  }

  function setTheme(next) {
    theme = next;
    root.dataset.theme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#080e1c' : '#ffffff';
    updateControls();
    savePreference('theme', theme);
  }

  function setMotion(next, persist = true) {
    paused = next;
    root.dataset.motion = paused ? 'paused' : 'running';
    updateControls();
    if (persist) savePreference('motion', paused ? 'paused' : 'running');
    slideshow?.refresh();
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

  const photoLinks = Array.from(document.querySelectorAll('[data-photo]'));
  const photoDialog = byId('photo-viewer');
  let photoIndex = 0;
  let photoTrigger = null;

  const slideshowElement = byId('gallery');
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const slideButtons = Array.from(document.querySelectorAll('[data-slide-select]'));
  if (slideshowElement && slides.length) {
    const INTERVAL = 8000;
    let activeSlide = 0;
    let timer = 0;
    let visible = true;
    let hovered = false;
    let request = 0;
    const pendingImages = new Map();

    function prepareImage(index) {
      if (pendingImages.has(index)) return pendingImages.get(index);
      const image = slides[index].querySelector('img');
      if (image.dataset.fullSrc) {
        image.src = image.dataset.fullSrc;
        delete image.dataset.fullSrc;
      }
      const ready = typeof image.decode === 'function'
        ? image.decode().catch(() => {})
        : Promise.resolve();
      pendingImages.set(index, ready);
      return ready;
    }

    function translateSlide() {
      byId('slideshow-caption').textContent = slides[activeSlide].querySelector('[data-photo-title]').textContent;
    }

    function refreshSlideshow() {
      window.clearTimeout(timer);
      timer = 0;
      if (paused || hovered || !visible || document.hidden || photoDialog?.open) return;
      timer = window.setTimeout(() => showSlide((activeSlide + 1) % slides.length), INTERVAL);
    }

    async function showSlide(index, manual = false) {
      window.clearTimeout(timer);
      const currentRequest = ++request;
      if (manual) setMotion(true);
      await prepareImage(index);
      if (currentRequest !== request || (!manual && (paused || hovered || !visible || document.hidden || photoDialog?.open))) return;
      activeSlide = index;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        slide.tabIndex = active ? 0 : -1;
      });
      slideButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      translateSlide();
      if (manual) byId('slideshow-status').textContent = byId('slideshow-caption').textContent;
      prepareImage((index + 1) % slides.length);
      refreshSlideshow();
    }

    slideButtons.forEach((button, index) => {
      button.addEventListener('click', () => showSlide(index, true));
    });
    slideshowElement.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showSlide((activeSlide + (event.key === 'ArrowLeft' ? -1 : 1) + slides.length) % slides.length, true);
      }
    });
    slideshowElement.addEventListener('focusin', (event) => {
      if (!byId('motion-toggle').contains(event.target)) setMotion(true);
    });
    slideshowElement.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') { hovered = true; refreshSlideshow(); }
    });
    slideshowElement.addEventListener('pointerleave', () => { hovered = false; refreshSlideshow(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        refreshSlideshow();
      }, { threshold: 0.1 }).observe(slideshowElement);
    }
    document.addEventListener('visibilitychange', refreshSlideshow);
    slideshow = { refresh: refreshSlideshow, translate: translateSlide };
    prepareImage(0).then(() => prepareImage(1));
  }

  function renderPhotograph() {
    const link = photoLinks[photoIndex];
    const image = byId('viewer-image');
    if (!link || !image) return;
    const thumbnail = link.querySelector('img');
    const title = link.querySelector('[data-photo-title]').textContent;
    image.src = link.href;
    image.alt = thumbnail.alt;
    image.width = Number(thumbnail.getAttribute('width'));
    image.height = Number(thumbnail.getAttribute('height'));
    byId('viewer-title').textContent = title;
    byId('viewer-position').textContent = `${photoIndex + 1} / ${photoLinks.length}`;
    byId('viewer-announcement').textContent = locale === 'ja'
      ? `${photoLinks.length}枚中${photoIndex + 1}枚目：${title}`
      : `Photograph ${photoIndex + 1} of ${photoLinks.length}: ${title}`;
  }

  function movePhotograph(step) {
    photoIndex = (photoIndex + step + photoLinks.length) % photoLinks.length;
    renderPhotograph();
  }

  if (photoDialog && typeof photoDialog.showModal === 'function') {
    photoLinks.forEach((link, index) => {
      link.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        photoIndex = index;
        photoTrigger = link;
        renderPhotograph();
        photoDialog.showModal();
        root.classList.add('photo-viewer-open');
        slideshow?.refresh();
      });
    });
    byId('viewer-previous').addEventListener('click', () => movePhotograph(-1));
    byId('viewer-next').addEventListener('click', () => movePhotograph(1));
    photoDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        movePhotograph(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    photoDialog.addEventListener('click', (event) => {
      if ([photoDialog, byId('viewer-stage'), byId('viewer-image-area')].includes(event.target)) photoDialog.close();
    });
    photoDialog.addEventListener('close', () => {
      root.classList.remove('photo-viewer-open');
      photoTrigger?.focus({ preventScroll: true });
      slideshow?.refresh();
    });
    let swipeStart = null;
    const stage = byId('viewer-stage');
    stage.addEventListener('pointerdown', (event) => {
      swipeStart = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
    });
    stage.addEventListener('pointerup', (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) movePhotograph(dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', () => { swipeStart = null; });
  }

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

  const motionPreferenceChanged = (event) => {
    // A system request to reduce motion always pauses an existing animation.
    if (event.matches) setMotion(true, false);
  };
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', motionPreferenceChanged);
  else reducedMotion.addListener(motionPreferenceChanged);
})();
