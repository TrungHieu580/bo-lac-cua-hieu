// =====================================================================
//  MAIN — vòng lặp game, điều khiển chuột/cảm ứng/bàn phím, lưu tự động
// =====================================================================
'use strict';
const GAME = (() => {
  let last = performance.now(), saveAcc = 0, running = false;

  function save() { if (running && window.S) SIM.save(); }

  function startCommon() {
    UI.resetForGame();
    RENDER.rebuildGround();
    RENDER.cam.zoom = RENDER.defaultZoom();
    RENDER.resize();
    const f = WORLD.fire();
    RENDER.centerOn((f.x + 1) * CFG.TILE, (f.y + 1) * CFG.TILE);
    running = true;
    UI.refresh();
  }
  function newGame() {
    SIM.newGame();
    startCommon();
    UI.state.paused = true;
    SIM.save();
    UI.showIntro();
  }
  function continueGame() {
    if (!SIM.load()) return false;
    startCommon();
    UI.state.paused = false;
    UI.toast(`Đã tải bản lưu — ngày ${S.day}, ${String(Math.floor(S.hour)).padStart(2, '0')}:${String(Math.floor((S.hour % 1) * 60)).padStart(2, '0')}`, 'ok');
    if (S.dayEndPending) { const j = S.journals[S.journals.length - 1]; if (j) setTimeout(() => UI.showDayEnd(j), 60); else SIM.startNewDay(); }
    return true;
  }

  function frame(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    if (running && !UI.state.paused && !UI.state.modal && !S.dayEndPending) {
      SIM.step(dt / CFG.SECONDS_PER_HOUR * S.speed);
      saveAcc += dt;
      if (saveAcc > 5) { saveAcc = 0; save(); }
    }
    if (window.S) RENDER.draw(dt);
    if (running) UI.update(dt);
    requestAnimationFrame(frame);
  }

  // ---------------- ĐIỀU KHIỂN ----------------
  function bindInput(cv) {
    const ptrs = new Map();
    let drag = false, pinch = null, downAt = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      const p = pos(e);
      ptrs.set(e.pointerId, { x: p[0], y: p[1] });
      if (ptrs.size === 1) { drag = false; downAt = { x: p[0], y: p[1], shift: e.shiftKey || e.ctrlKey || e.metaKey }; pinch = null; }
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        drag = true;
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') UI.hoverMap(p[0], p[1]); return; }
      const prev = ptrs.get(e.pointerId);
      ptrs.set(e.pointerId, { x: p[0], y: p[1] });
      if (ptrs.size === 1) {
        if (!drag && downAt && Math.hypot(p[0] - downAt.x, p[1] - downAt.y) > 8) drag = true;
        if (drag) RENDER.pan(p[0] - prev.x, p[1] - prev.y);
        if (e.pointerType === 'mouse') UI.hoverMap(p[0], p[1]);
      } else if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        RENDER.pan(cx - pinch.cx, cy - pinch.cy);
        pinch.cx = cx; pinch.cy = cy;
        const ratio = d / pinch.d;
        if (ratio > 1.25) { RENDER.setZoom(RENDER.cam.zoom + 1, cx * RENDER.dpr, cy * RENDER.dpr); pinch.d = d; }
        else if (ratio < 0.8) { RENDER.setZoom(RENDER.cam.zoom - 1, cx * RENDER.dpr, cy * RENDER.dpr); pinch.d = d; }
      }
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const p = pos(e);
      const wasSingle = ptrs.size === 1;
      ptrs.delete(e.pointerId);
      if (wasSingle && !drag && downAt && e.type === 'pointerup') UI.tapMap(p[0], p[1], downAt.shift);
      if (ptrs.size === 0) { drag = false; pinch = null; downAt = null; }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      RENDER.setZoom(RENDER.cam.zoom + (e.deltaY < 0 ? 1 : -1), p[0] * RENDER.dpr, p[1] * RENDER.dpr);
    }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());

    const keys = new Set();
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (UI.state.modal) { if (k === 'enter') { const b = document.querySelector('#modal .btn.go'); if (b) b.click(); } return; }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); e.preventDefault(); return; }
      if (k === ' ') { UI.togglePause(); e.preventDefault(); }
      else if (k === '1' || k === '2' || k === '3') UI.setSpeed(+k - 1);
      else if (k === 'escape') UI.escape();
      else if (k === 'b') UI.startBuildMode();
      else if (k === 'v') UI.openSheet('villagers');
      else if (k === 'j') UI.openSheet('journal');
      else if (k === '+' || k === '=') RENDER.setZoom(RENDER.cam.zoom + 1);
      else if (k === '-') RENDER.setZoom(RENDER.cam.zoom - 1);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    setInterval(() => {
      if (!keys.size) return;
      const s = 10;
      let dx = 0, dy = 0;
      if (keys.has('arrowleft') || keys.has('a')) dx += s;
      if (keys.has('arrowright') || keys.has('d')) dx -= s;
      if (keys.has('arrowup') || keys.has('w')) dy += s;
      if (keys.has('arrowdown') || keys.has('s')) dy -= s;
      RENDER.pan(dx, dy);
    }, 16);
  }

  function boot() {
    ART.init(); ART.initIcons();
    const cv = document.getElementById('cv');
    UI.bind();
    // Nền phía sau màn hình chính: bản lưu (nếu có) hoặc bản đồ mới
    if (!SIM.load()) SIM.newGame();
    RENDER.init(cv);
    RENDER.rebuildGround();
    const f = WORLD.fire();
    RENDER.centerOn((f.x + 1) * CFG.TILE, (f.y + 1) * CFG.TILE);
    bindInput(cv);
    window.addEventListener('resize', () => RENDER.resize());
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    UI.showMenu(false);
    requestAnimationFrame(frame);
  }

  return { boot, save, newGame, continueGame, get running() { return running; } };
})();
window.addEventListener('load', GAME.boot);
