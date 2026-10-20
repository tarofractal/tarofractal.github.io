/* Small enhancements only. Content and navigation also work without JavaScript. */
"use strict";

// Motion is optional. The header control pauses both CSS and SVG animation.
const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionButton = document.querySelector(".motion-toggle");
const motionCallbacks = new Set();
let userPausedMotion = false;
try { userPausedMotion = localStorage.getItem("taro-motion") === "paused"; } catch { /* Optional storage. */ }
function motionAllowed() { return !motionMedia.matches && !userPausedMotion; }
function refreshMotion() {
  const enabled = motionAllowed();
  document.documentElement.dataset.motion = enabled ? "active" : "paused";
  if (motionButton) {
    motionButton.hidden = false;
    motionButton.disabled = motionMedia.matches;
    const label = motionMedia.matches ? "Animations reduced by system preference" : enabled ? "Pause animations" : "Resume animations";
    motionButton.setAttribute("aria-label", label);
    motionButton.setAttribute("title", label);
    motionButton.setAttribute("aria-pressed", String(!enabled));
    motionButton.textContent = enabled ? "Ⅱ" : "▷";
  }
  motionCallbacks.forEach(callback => callback());
}


if (motionButton) motionButton.addEventListener("click", () => {
  userPausedMotion = !userPausedMotion;
  try { localStorage.setItem("taro-motion", userPausedMotion ? "paused" : "active"); } catch { /* Optional storage. */ }
  refreshMotion();
});
motionMedia.addEventListener("change", refreshMotion);
refreshMotion();


// 1. Remember the reader's preferred color theme. File URLs may block storage.
const themeButton = document.querySelector(".theme-toggle");
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  if (themeButton) {
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    const label = themeButton.querySelector(".theme-label");
    if (label) label.textContent = dark ? "Light" : "Dark";
  }
  const color = document.querySelector('meta[name="theme-color"]');
  if (color) color.content = dark ? "#191b23" : "#f5f3ef";
}
let savedTheme = "dark";
try { savedTheme = localStorage.getItem("taro-notebook-theme") === "light" ? "light" : "dark"; } catch { /* Storage is optional. */ }
setTheme(savedTheme);
if (themeButton) {
  themeButton.hidden = false;
  themeButton.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("taro-notebook-theme", next); } catch { /* Private/file mode is supported. */ }
  });
}

// 2. Footer year and email-copy feedback. The mailto link is always available.
document.querySelectorAll("[data-year]").forEach(node => { node.textContent = String(new Date().getFullYear()); });
const copyButton = document.getElementById("copy-email");
const copyStatus = document.getElementById("copy-status");
if (copyButton && copyStatus && navigator.clipboard && window.isSecureContext) {
  copyButton.hidden = false;
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("tn7721@princeton.edu");
      copyStatus.textContent = "Email address copied.";
    } catch {
      copyStatus.textContent = "Please select the email address, or use the email link.";
    }
  });
}


// Background only: a slowly rotating spherical grid, an inclined circular orbit,
// and a schematic softened-potential mesh. Nothing changes the content layout.
const cosmicBackground = document.getElementById("cosmic-background");
const cosmicSky = document.getElementById("cosmic-sky");
if (cosmicBackground && cosmicSky) {
  const planet = document.getElementById("sky-planet");
  const field = document.getElementById("sky-field");
  const stars = document.getElementById("sky-stars");
  const mathStudy = document.getElementById("sky-math");
  const mathPoint = document.getElementById("sky-math-point");
  const fieldLines = [...field.querySelectorAll(".potential-mesh path")];
  const fieldTrace = field.querySelector(".field-trace");
  const backOrbiter = document.getElementById("sky-orbiter-back");
  const frontOrbiter = document.getElementById("sky-orbiter-front");
  const latitudes = Array.from({ length: 5 }, (_, i) => document.getElementById("sky-latitude-" + i));
  const meridians = Array.from({ length: 12 }, (_, i) => document.getElementById("sky-meridian-" + i));
  const isHome = document.body.classList.contains("home-page");
  const tilt = .27;
  const orbitTilt = -28 * Math.PI / 180;
  let rotation = .4;
  let orbitalPhase = .8;
  let mathPhase = .6;
  let surfacePhase = .4;
  let mathX = 95, mathY = 430, mathScale = 1;
  let width = 1440, height = 1000;
  let planetX = 1170, planetY = 310, planetScale = 1.6;
  let fieldX = 160, fieldY = 740, fieldScale = 1.5;
  let targetX = 0, targetY = 0, parallaxX = 0, parallaxY = 0;
  let frame = null, previousTime = null, previousPaint = null;

  function surfacePoint(latitude, longitude) {
    const angle = longitude + rotation;
    const x = Math.cos(latitude) * Math.sin(angle);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.cos(angle);
    return {
      x: 100 * x,
      y: -100 * (y * Math.cos(tilt) - z * Math.sin(tilt)),
      z: y * Math.sin(tilt) + z * Math.cos(tilt)
    };
  }
  function surfacePath(sample) {
    let drawing = false;
    let path = "";
    for (let i = 0; i <= 64; i += 1) {
      const point = sample(i / 64);
      if (point.z < 0) { drawing = false; continue; }
      path += (drawing ? "L" : "M") + point.x.toFixed(3) + " " + point.y.toFixed(3);
      drawing = true;
    }
    return path;
  }
  // Animate the actual surface geometry, including its attached highlight.
  // A continuously turning plane and travelling waves keep the mesh visibly
  // moving without pointer input. All frequencies share a seamless 40π period.
  function fieldPoint(u, v) {
    const angle = Math.PI / 4 + surfacePhase * .25;
    const x = Math.SQRT2 * 70 * (u * Math.cos(angle) - v * Math.sin(angle));
    const planeY = Math.SQRT2 * 25 * (u * Math.sin(angle) + v * Math.cos(angle));
    const depth = (38 + 5 * Math.sin(surfacePhase * .5)) / Math.sqrt(u * u + v * v + .16);
    const wave = 12 * Math.sin(2.6 * u - surfacePhase * 1.8) * Math.cos(2.1 * v + surfacePhase * .9);
    return { x, y: planeY + depth + wave };
  }
  function fieldPath(fixed, swap) {
    let path = "";
    for (let i = 0; i <= 32; i += 1) {
      const moving = -1.25 + 2.5 * i / 32;
      const point = swap ? fieldPoint(fixed, moving) : fieldPoint(moving, fixed);
      path += (i ? "L" : "M") + point.x.toFixed(3) + " " + point.y.toFixed(3);
    }
    return path;
  }
  function drawFieldSurface() {
    fieldLines.forEach((node, i) => {
      node.setAttribute("d", fieldPath(-1.25 + (i % 11) * .25, i >= 11));
    });
    if (fieldTrace) fieldTrace.setAttribute("d", fieldPath(.25, false));
  }
  function drawSky() {
    drawFieldSurface();
    latitudes.forEach((node, i) => {
      const latitude = -Math.PI / 3 + i * Math.PI / 6;
      node.setAttribute("d", surfacePath(t => surfacePoint(latitude, t * 2 * Math.PI)));
    });
    meridians.forEach((node, i) => {
      const longitude = i * 2 * Math.PI / 12;
      node.setAttribute("d", surfacePath(t => surfacePoint(-Math.PI / 2 + t * Math.PI, longitude)));
    });
    const x = 168 * Math.cos(orbitalPhase);
    const y = 50 * Math.sin(orbitalPhase);
    const px = x * Math.cos(orbitTilt) - y * Math.sin(orbitTilt);
    const py = x * Math.sin(orbitTilt) + y * Math.cos(orbitTilt);
    const transform = "translate(" + px + " " + py + ")";
    backOrbiter.setAttribute("transform", transform);
    frontOrbiter.setAttribute("transform", transform);
    backOrbiter.setAttribute("opacity", Math.sin(orbitalPhase) < 0 ? "1" : "0");
    frontOrbiter.setAttribute("opacity", Math.sin(orbitalPhase) >= 0 ? "1" : "0");
    planet.setAttribute("transform", "translate(" + (planetX + parallaxX) + " " + (planetY + parallaxY) + ") scale(" + planetScale + ")");
    field.setAttribute("transform", "translate(" + (fieldX + parallaxX * .45) + " " + (fieldY + parallaxY * .45) + ") rotate(-12) scale(" + fieldScale + ")");
    stars.setAttribute("transform", "translate(" + (parallaxX * .16) + " " + (parallaxY * .16) + ")");
    mathStudy.setAttribute("transform", "translate(" + (mathX + parallaxX * .3) + " " + (mathY + parallaxY * .3) + ") scale(" + mathScale + ")");
    mathPoint.setAttribute("cx", String(64 * Math.cos(3 * mathPhase)));
    mathPoint.setAttribute("cy", String(47 * Math.sin(2 * mathPhase)));
  }
  function layoutSky() {
    width = Math.max(280, document.documentElement.clientWidth || window.innerWidth || 1440);
    height = Math.max(360, window.innerHeight || 1000);
    cosmicSky.setAttribute("viewBox", "0 0 " + width + " " + height);
    if (isHome) {
      planetX = width > 900 ? width * .81 : width + 74;
      planetScale = width > 900 ? Math.min(166, width * .125) / 100 : 1.5;
    } else {
      planetX = width > 1200 ? width - Math.max(120, (width - 700) / 4) : width + 90;
      planetScale = 1.4;
    }
    planetY = width > 900 ? Math.min(330, height * .37) : Math.min(230, height * .3);
    fieldX = width > 900 ? width * .13 : -48;
    fieldY = height * .76;
    fieldScale = width > 900 ? 1.5 : 1.15;
    mathX = width >= 1320 ? (width - 1060) / 4 : -42;
    mathY = Math.min(height * .46, 430);
    mathScale = width >= 1320 ? Math.min(1, ((width - 1060) / 2 - 24) / 160) : 1;
    drawSky();
  }
  function tickSky(time) {
    frame = null;
    if (!motionAllowed() || document.hidden) { previousTime = null; return; }
    const dt = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, .08);
    previousTime = time;
    rotation = (rotation + dt * .1) % (2 * Math.PI);
    orbitalPhase = (orbitalPhase + dt * .115) % (2 * Math.PI);
    mathPhase = (mathPhase + dt * .08) % (2 * Math.PI);
    surfacePhase = (surfacePhase + dt * .85) % (40 * Math.PI);
    const follow = 1 - Math.exp(-dt * 3);
    parallaxX += (targetX - parallaxX) * follow;
    parallaxY += (targetY - parallaxY) * follow;
    if (previousPaint === null || time - previousPaint >= 1000 / 30) {
      drawSky();
      previousPaint = time;
    }
    frame = requestAnimationFrame(tickSky);
  }
  function updateSkyMotion() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    previousPaint = null;
    const sleeping = !motionAllowed() || document.hidden;
    cosmicBackground.dataset.sleep = String(sleeping);
    if (!sleeping) frame = requestAnimationFrame(tickSky);
  }
  window.addEventListener("pointermove", event => {
    if (!motionAllowed() || document.hidden || event.pointerType === "touch") return;
    targetX = (Math.max(0, Math.min(1, event.clientX / width)) - .5) * 16;
    targetY = (Math.max(0, Math.min(1, event.clientY / height)) - .5) * 12;
  }, { passive: true });
  window.addEventListener("blur", () => { targetX = 0; targetY = 0; });
  window.addEventListener("resize", layoutSky);
  document.addEventListener("visibilitychange", updateSkyMotion);
  motionCallbacks.add(updateSkyMotion);
  layoutSky();
  cosmicBackground.dataset.ready = "true";
  updateSkyMotion();
}
