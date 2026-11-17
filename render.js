// =====================================================================
//  RENDER — camera, vẽ bản đồ pixel (bội số nguyên), ánh sáng, thời tiết
// =====================================================================
'use strict';
const RENDER = (() => {
  const T = CFG.TILE;
  let MW = CFG.MAP_W, MH = CFG.MAP_H;
  let cv, ctx, lo, lx, dk, dkx, gc, gx;
  const cam = { x: 0, y: 0, zoom: 2 };
  let dpr = 1, time = 0;
  const floats = [];
  const deer = [];
  const iconImgs = {};

  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    [lo, lx] = ART.mk(10, 10);
    [dk, dkx] = ART.mk(10, 10);
    [gc, gx] = ART.mk(MW * T, MH * T);
    for (const k in ART.ICONS) { const im = new Image(); im.src = ART.ICONS[k]; iconImgs[k] = im; }
    EV.on('float', f => floats.push({ ...f, t: 0 }));
    EV.on('plot', o => drawPlot(o));
    resize();
    cam.zoom = defaultZoom(); sizeLo(); clampCam();
  }

  function defaultZoom() { const target = Math.min(window.innerWidth, window.innerHeight) < 600 ? 34 : 44; return Math.max(1, Math.round(target * dpr / T)); }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    if (!cam.zoom || cam.zoom < 1) cam.zoom = defaultZoom();
    sizeLo();
    clampCam();
  }
  function sizeLo() {
    const w = Math.ceil(cv.width / cam.zoom) + 2, h = Math.ceil(cv.height / cam.zoom) + 2;
    if (lo.width !== w || lo.height !== h) { lo.width = w; lo.height = h; dk.width = w; dk.height = h; lx.imageSmoothingEnabled = false; }
  }
  function viewW() { return cv.width / cam.zoom; }
  function viewH() { return cv.height / cam.zoom; }
  function clampCam() {
    const mw = MW * T, mh = MH * T, vw = viewW(), vh = viewH();
    const m = T * 1.5;
    cam.x = vw >= mw + 2 * m ? (mw - vw) / 2 : Math.max(-m, Math.min(mw - vw + m, cam.x));
    cam.y = vh >= mh + 2 * m ? (mh - vh) / 2 : Math.max(-m, Math.min(mh - vh + m, cam.y));
  }
  function centerOn(wx, wy) { cam.x = wx - viewW() / 2; cam.y = wy - viewH() / 2; clampCam(); }
  function setZoom(z, sx, sy) {
    const minZ = Math.max(1, Math.round(16 * dpr / T)), maxZ = Math.max(minZ + 1, Math.round(110 * dpr / T));
    z = Math.max(minZ, Math.min(maxZ, z));
    if (z === cam.zoom) return;
    if (sx === undefined) { sx = cv.width / 2; sy = cv.height / 2; }
    const wx = cam.x + sx / cam.zoom, wy = cam.y + sy / cam.zoom;
    cam.zoom = z;
    sizeLo();
    cam.x = wx - sx / z; cam.y = wy - sy / z;
    clampCam();
  }
  function pan(dxCss, dyCss) { cam.x -= dxCss * dpr / cam.zoom; cam.y -= dyCss * dpr / cam.zoom; clampCam(); }
  function screenToWorld(cssX, cssY) { return [cam.x + cssX * dpr / cam.zoom, cam.y + cssY * dpr / cam.zoom]; }
  function worldToCss(wx, wy) { return [(wx - cam.x) * cam.zoom / dpr, (wy - cam.y) * cam.zoom / dpr]; }

  // ---------------- NỀN ----------------
  function tileRng(tx, ty) { return ART.rng(tx * 7919 + ty * 104729 + 17); }
  function rebuildGround() {
    MW = WORLD.W; MH = WORLD.H;
    if (gc.width !== MW * T || gc.height !== MH * T) { gc.width = MW * T; gc.height = MH * T; gx.imageSmoothingEnabled = false; }
    gx.clearRect(0, 0, gc.width, gc.height);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const t = WORLD.ter(tx, ty);
      const r = tileRng(tx, ty);
      const nb = (dx, dy) => WORLD.ter(tx + dx, ty + dy);
      ART.drawTerrain(gx, t, tx * T, ty * T, r, nb);
    }
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      const t = WORLD.ter(tx, ty);
      const r = ART.rng(tx * 31337 + ty * 7 + 3);
      ART.drawEdges(gx, t, tx * T, ty * T, r, (dx, dy) => WORLD.ter(tx + dx, ty + dy));
    }
    for (const o of S.objects) if (o.type === 'plot') drawPlot(o);
    deer.length = 0;
  }
  function drawPlot(o) {
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const tx = o.x + i, ty = o.y + j;
      ART.drawFarm(gx, tx * T, ty * T, o.state, tileRng(tx, ty), o.growth);
    }
    // viền ruộng
    gx.fillStyle = 'rgba(60,35,15,0.55)';
    gx.fillRect(o.x * T, o.y * T, o.w * T, 1); gx.fillRect(o.x * T, (o.y + o.h) * T - 1, o.w * T, 1);
    gx.fillRect(o.x * T, o.y * T, 1, o.h * T); gx.fillRect((o.x + o.w) * T - 1, o.y * T, 1, o.h * T);
  }

  // ---------------- VẼ KHUNG HÌNH ----------------
  function ring(x, cx, cy, rx, ry, c) {
    x.fillStyle = c;
    for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; x.fillRect(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1); }
  }
  function shadow(x, cx, cy, rx, ry) { x.fillStyle = 'rgba(0,0,0,0.22)'; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); }

  function poseOf(v) {
    const t = v.task;
    if (!t) return 'stand';
    if (t.kind === 'walk') return 'walk';
    if (t.kind === 'work' || t.kind === 'hunting') return 'work';
    if (t.kind === 'sit' || t.kind === 'rest') return 'sit';
    return 'stand';
  }

  function updateDeer(dt) {
    const zone = S.objects.find(o => o.type === 'huntzone');
    if (!zone) return;
    while (deer.length < zone.animals) deer.push({ x: (zone.x + 1 + Math.random() * (zone.w - 2)) * T, y: (zone.y + 1 + Math.random() * (zone.h - 2)) * T, tx: 0, ty: 0, wait: Math.random() * 3, flip: 0 });
    while (deer.length > zone.animals) deer.pop();
    const hunting = S.hunts.some(h => h.phase === 'hunting');
    for (const d of deer) {
      if (d.wait > 0) { d.wait -= dt; if (d.wait <= 0) { d.tx = (zone.x + 0.5 + Math.random() * (zone.w - 1)) * T; d.ty = (zone.y + 0.8 + Math.random() * (zone.h - 1.3)) * T; } continue; }
      const dx = d.tx - d.x, dy = d.ty - d.y, dd = Math.hypot(dx, dy);
      const sp = (hunting ? 40 : 12) * dt;
      if (dd < sp) { d.wait = hunting ? 0.2 : 1 + Math.random() * 3; }
      else { d.x += dx / dd * sp; d.y += dy / dd * sp; d.flip = dx < 0 ? 1 : 0; }
    }
  }

  function draw(dtReal) {
    time += dtReal;
    sizeLo();
    updateDeer(dtReal);
    const z = cam.zoom, vw = lo.width, vh = lo.height;
    const ox = Math.floor(cam.x), oy = Math.floor(cam.y);
    const ui = UI.state;
    lx.fillStyle = '#2a5a20'; lx.fillRect(0, 0, vw, vh);
    lx.drawImage(gc, -ox, -oy);

    // nước lấp lánh
    const tx0 = Math.max(0, Math.floor(ox / T)), ty0 = Math.max(0, Math.floor(oy / T));
    const tx1 = Math.min(MW - 1, Math.floor((ox + vw) / T)), ty1 = Math.min(MH - 1, Math.floor((oy + vh) / T));
    lx.fillStyle = '#8cc0ee';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (WORLD.ter(tx, ty) !== 'water') continue;
      for (let k = 0; k < 2; k++) {
        const ph = (time * 5 + tx * 7 + ty * 13 + k * 11) % T;
        const yy = ty * T + ((ty * 5 + k * 12 + Math.floor(time * 3 + tx)) % T);
        lx.fillRect(tx * T + Math.floor(ph) - ox, yy - oy, 3, 1);
      }
    }

    const L = (wx) => Math.round(wx) - ox, Tp = (wy) => Math.round(wy) - oy;

    // mục tiêu đang chọn
    const sel = ui.target ? WORLD.byId(ui.target) : null;
    if (sel && sel.type !== 'huntzone') {
      lx.strokeStyle = 'rgba(255,225,74,0.9)'; lx.lineWidth = 1;
      lx.strokeRect(sel.x * T - ox + 0.5, sel.y * T - oy + 0.5, sel.w * T - 1, sel.h * T - 1);
    } else if (sel && sel.type === 'huntzone') {
      lx.strokeStyle = 'rgba(255,225,74,0.6)'; lx.setLineDash([3, 2]);
      lx.strokeRect(sel.x * T - ox + 0.5, sel.y * T - oy + 0.5, sel.w * T - 1, sel.h * T - 1); lx.setLineDash([]);
    }
    if (ui.moveTile) { lx.strokeStyle = 'rgba(255,255,255,0.8)'; lx.strokeRect(ui.moveTile[0] * T - ox + 0.5, ui.moveTile[1] * T - oy + 0.5, T - 1, T - 1); }

    // lúa đã gặt chờ mang về
    for (const o of S.objects) if (o.type === 'plot' && o.yieldLeft > 0) {
      const n = Math.min(4, Math.ceil(o.yieldLeft / 3));
      for (let k = 0; k < n; k++) lx.drawImage(ART.SPR.sheaf, o.x * T + 6 + (k % 2) * 20 - ox, o.y * T + 8 + Math.floor(k / 2) * 20 - oy);
    }

    // bóng
    for (const o of S.objects) {
      const cx = (o.x + o.w / 2) * T - ox, cy = (o.y + o.h) * T - oy - 3;
      if (cx < -60 || cy < -60 || cx > vw + 60 || cy > vh + 80) continue;
      if (o.type === 'tree') shadow(lx, cx + 2, cy, 9, 3);
      else if (o.type === 'hut' || o.type === 'site' || o.type === 'rack' || o.type === 'granary' || o.type === 'healer' || o.type === 'workshop') shadow(lx, cx + 2, cy - 2, o.w * 11 + 1, 5);
      else if (o.type === 'longhouse') shadow(lx, cx + 2, cy - 2, 34, 5);
      else if (o.type === 'storage') shadow(lx, cx + 2, cy - 2, 22, 4);
      else if (o.type === 'bush' || o.type === 'boulder') shadow(lx, cx + 1, cy, 9, 3);
    }

    // các vật thể vẽ theo thứ tự toạ độ chân
    const list = [];
    for (const o of S.objects) {
      const foot = (o.y + o.h) * T;
      const X = o.x * T - ox, Y = o.y * T - oy;
      if (X < -60 || Y < -80 || X > vw + 60 || Y > vh + 60) { if (o.type !== 'huntzone') continue; }
      switch (o.type) {
        case 'tree': list.push([foot, () => lx.drawImage(ART.SPR.tree[o.v % 3], X + T / 2 - 14, Y + T - 40)]); break;
        case 'stump': list.push([foot - 8, () => lx.drawImage(ART.SPR.stump, X + 5, Y + 10)]); break;
        case 'bush': list.push([foot, () => lx.drawImage(o.stock > 0 ? ART.SPR.bush : ART.SPR.bushEmpty, X + 1, Y + T - 18)]); break;
        case 'boulder': list.push([foot, () => lx.drawImage(ART.SPR.boulder[o.v % 2], X, Y + T - 20)]); break;
        case 'fire': list.push([foot, () => lx.drawImage(ART.SPR.fire[Math.floor(time * 8) % 3], X, Y - 2)]); break;
        case 'hut': list.push([foot, () => lx.drawImage(ART.SPR.hut, X, Y + 2 * T - 52)]); break;
        case 'site': list.push([foot, () => {
          const p = Math.min(1, o.progress / o.need);
          const spr = EXP.spriteFor(o.kind || 'hut');
          const sy0 = Y + o.h * T - spr.height + 2;
          if (spr === ART.SPR.hut) lx.drawImage(ART.SPR.site, X, sy0);
          else { lx.globalAlpha = 0.3; lx.drawImage(spr, X, sy0); lx.globalAlpha = 1; }
          const h = Math.round(spr.height * p);
          if (h > 0) lx.drawImage(spr, 0, spr.height - h, spr.width, h, X, sy0 + spr.height - h, spr.width, h);
          lx.drawImage(ART.SPR.logs, X - 6, Y + o.h * T - 10);
        }]); break;
        case 'storage': list.push([foot, () => {
          lx.drawImage(ART.SPR.storage, X, Y + 2 * T - 48);
          if (o.level > 0) { lx.fillStyle = '#c8303a'; lx.fillRect(X + 22, Y + 2 * T - 52, 3, 6); lx.fillStyle = '#f2c94c'; lx.fillRect(X + 25, Y + 2 * T - 52, 5, 3); }
          if (S.res.wood > 0) lx.drawImage(ART.SPR.logs, X - 8, Y + 2 * T - 10);
          if (S.res.stone > 0) lx.drawImage(ART.SPR.stones, X + 44, Y + 2 * T - 9);
          if (S.res.food > 0) lx.drawImage(ART.SPR.foodpile, X + 18, Y + 2 * T - 22);
          if (o.upgrading) { lx.fillStyle = '#6b4224'; lx.fillRect(X + 1, Y + 2 * T - 54, 1, 30); lx.fillRect(X + 46, Y + 2 * T - 54, 1, 30); lx.fillRect(X + 1, Y + 2 * T - 54, 46, 1); }
        }]); break;
        case 'huntzone': list.push([(o.y + 2) * T, () => lx.drawImage(ART.SPR.totem, (o.x + o.w - 1) * T - ox + 4, (o.y + 1) * T - oy - 2)]); break;
        default: { const d = EXP.drawObj(o, X, Y, lx); if (d) list.push([foot, d]); }
      }
    }
    for (const d of deer) {
      const f = Math.floor(time * 6) % 2;
      list.push([d.y, () => { shadow(lx, L(d.x), Tp(d.y), 5, 2); lx.drawImage(ART.SPR.deer[d.flip][d.wait > 0 ? 0 : f], L(d.x) - 7, Tp(d.y) - 11); }]);
    }
    for (const v of S.villagers) {
      list.push([v.y, () => drawVillagerAt(v, false)]);
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, f] of list) f();

    // bóng mờ của dân được chọn (để thấy được khi khuất sau cây/lều)
    for (const v of S.villagers) if (ui.selected.has(v.id)) drawVillagerAt(v, true);

    // bóng ma khi đặt lều
    if (ui.ghost) {
      const { x, y, ok } = ui.ghost;
      const gw = ui.ghost.w || 2, gh = ui.ghost.h || 2;
      const spr = EXP.spriteFor(ui.ghost.kind || 'hut');
      lx.globalAlpha = 0.55; lx.drawImage(spr, x * T - ox, y * T + gh * T - spr.height + 2 - oy); lx.globalAlpha = 1;
      lx.fillStyle = ok ? 'rgba(80,220,80,0.35)' : 'rgba(230,50,50,0.4)';
      lx.fillRect(x * T - ox, y * T - oy, gw * T, gh * T);
    }

    lighting(vw, vh, ox, oy);
    if (S.weather === 'rain') rain(vw, vh);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(lo, 0, 0, vw, vh, -(cam.x - ox) * z, -(cam.y - oy) * z, vw * z, vh * z);
    overlay(dtReal);

    function drawVillagerAt(v, ghost) {
      const X = L(v.x), Y = Tp(v.y);
      if (X < -20 || Y < -30 || X > vw + 20 || Y > vh + 30) return;
      const pose = poseOf(v);
      if (!ghost) {
        shadow(lx, X, Y, 5, 2);
        if (ui.selected.has(v.id)) { ring(lx, X, Y, 7, 3, '#ffe14a'); ring(lx, X, Y + 1, 7, 3, '#b8860b'); }
      }
      (v.child ? EXP.drawChild : ART.drawVillager)(lx, X, Y, v, time + v.id * 0.37, pose, pose === 'sit' ? 0 : v.facing, ghost ? 0.4 : undefined);
      if (v.carry && !ghost) {
        if (v.carry.vis === 'fish') EXP.drawFishCarry(lx, X, Y);
        else {
          const vis = v.carry.vis === 'meat' ? { meat: 1 } : v.carry.vis === 'wood' ? { wood: 1 } : v.carry.vis === 'stone' ? { stone: 1 } : { food: 1 };
          ART.drawCarry(lx, X, Y, vis);
        }
      }
    }
  }

  function lighting(vw, vh, ox, oy) {
    const h = S.hour;
    let a = 0, tint = null;
    if (h < 7) a = 0.3 * (7 - h);
    if (h >= 16.5 && h < 18.5) tint = `rgba(255,140,40,${0.12 * (h - 16.5) / 2})`;
    if (h >= 18) a = Math.min(0.6, (h - 18) / 2.2 * 0.6);
    if (tint) { lx.fillStyle = tint; lx.fillRect(0, 0, vw, vh); }
    if (S.weather === 'rain') { lx.fillStyle = 'rgba(40,60,90,0.18)'; lx.fillRect(0, 0, vw, vh); }
    if (a <= 0.01) return;
    dkx.globalCompositeOperation = 'source-over';
    dkx.clearRect(0, 0, vw, vh);
    dkx.fillStyle = `rgba(14,18,48,${a})`;
    dkx.fillRect(0, 0, vw, vh);
    dkx.globalCompositeOperation = 'destination-out';
    const f = WORLD.fire();
    const fx = (f.x + 0.5) * T - ox, fy = (f.y + 0.5) * T - oy;
    const flick = 1 + Math.sin(time * 9) * 0.03 + Math.sin(time * 23) * 0.02;
    let g = dkx.createRadialGradient(fx, fy, 4, fx, fy, 86 * flick);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    dkx.fillStyle = g; dkx.fillRect(0, 0, vw, vh);
    for (const o of S.objects) if (o.type === 'hut' || o.type === 'longhouse') {
      const hx = (o.x + o.w / 2) * T - ox, hy = (o.y + 1.8) * T - oy;
      g = dkx.createRadialGradient(hx, hy, 2, hx, hy, 22);
      g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      dkx.fillStyle = g; dkx.fillRect(hx - 24, hy - 24, 48, 48);
    }
    lx.drawImage(dk, 0, 0);
    lx.globalCompositeOperation = 'lighter';
    g = lx.createRadialGradient(fx, fy, 2, fx, fy, 50 * flick);
    g.addColorStop(0, `rgba(255,150,50,${0.35 * a / 0.6})`); g.addColorStop(1, 'rgba(255,120,30,0)');
    lx.fillStyle = g; lx.fillRect(fx - 60, fy - 60, 120, 120);
    lx.globalCompositeOperation = 'source-over';
  }

  function rain(vw, vh) {
    lx.fillStyle = 'rgba(190,215,245,0.65)';
    const n = Math.floor(vw * vh / 900);
    for (let i = 0; i < n; i++) {
      const x = Math.floor((i * 37.7 + time * 30 + (i % 7) * 13) % vw);
      const y = Math.floor((i * 91.3 + time * 190 * (0.8 + (i % 5) * 0.08)) % vh);
      lx.fillRect(x, y, 1, 3); lx.fillRect(x - 1, y + 3, 1, 1);
    }
  }

  // ---------------- LỚP THÔNG TIN (độ phân giải màn hình) ----------------
  function bar(x, y, w, p, color) {
    const h = Math.max(4, Math.round(4 * dpr));
    ctx.fillStyle = 'rgba(30,18,8,0.85)'; ctx.fillRect(x - w / 2 - 1 * dpr, y - 1 * dpr, w + 2 * dpr, h + 2 * dpr);
    ctx.fillStyle = '#5a3a1c'; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = color || '#8fd14f'; ctx.fillRect(x - w / 2, y, Math.round(w * Math.max(0, Math.min(1, p))), h);
  }
  function label(text, x, y, bg) {
    ctx.font = `bold ${Math.round(11 * dpr)}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 8 * dpr, h = 15 * dpr;
    ctx.fillStyle = bg || 'rgba(40,24,10,0.85)';
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    ctx.fillStyle = '#fbe8c8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2 + 0.5 * dpr);
    return w;
  }
  function jobIcon(v) {
    if (v.resting) return 'bolt';
    const j = v.job; if (!j) return null;
    if (j.type === 'gather') { const o = WORLD.byId(j.target); return o ? ({ bush: 'food', tree: 'wood', boulder: 'stone' }[o.type]) : null; }
    return { clear: 'field', sow: 'seeds', harvest: 'field', build: 'hut', upgrade: 'hut', hunt: 'food', move: null }[j.type] || null;
  }
  function overlay(dt) {
    const z = cam.zoom;
    const W = (wx, wy) => [(wx - cam.x) * z, (wy - cam.y) * z];
    const ui = UI.state;
    const bw = Math.max(26 * dpr, T * z * 0.9);
    // tiến độ chung trên mục tiêu
    const done = new Set();
    for (const v of S.villagers) {
      const t = v.task;
      if (!t) continue;
      const p = SIM.taskProgress(v);
      if (p === null) continue;
      if (t.kind === 'work' && (t.mode === 'gather' || t.mode === 'pickup')) {
        const [sx, sy] = W(v.x, v.y - 26);
        bar(sx, sy, 20 * dpr, p, '#f2c94c');
      } else {
        const key = t.kind + t.target;
        if (done.has(key)) continue; done.add(key);
        const o = WORLD.byId(t.target); if (!o) continue;
        const [sx, sy] = o.type === 'huntzone' ? W((o.x + o.w - 0.5) * T, (o.y + 0.2) * T) : W((o.x + o.w / 2) * T, o.y * T - (o.type === 'site' || o.type === 'storage' ? 30 : 4));
        bar(sx, sy, bw, p, t.kind === 'hunting' ? '#e05a3a' : '#8fd14f');
      }
    }
    // công trình đang chờ người làm
    for (const o of S.objects) {
      if (o.type === 'site' && !done.has('work' + o.id)) { const [sx, sy] = W((o.x + 1) * T, o.y * T - 30); bar(sx, sy, bw, o.progress / o.need, '#c9a066'); }
    }
    // nhãn tên + biểu tượng việc cho người được chọn, Zzz cho người nghỉ
    for (const v of S.villagers) {
      const [sx, sy] = W(v.x, v.y - 20);
      if (ui.selected.has(v.id)) {
        const w = label(v.name, sx, sy - 6 * dpr);
        const ic = jobIcon(v);
        if (ic && iconImgs[ic]) { const s = 16 * dpr; ctx.imageSmoothingEnabled = false; ctx.drawImage(iconImgs[ic], Math.round(sx + w / 2 + 2 * dpr), Math.round(sy - 6 * dpr - 15.5 * dpr), s, s); }
      }
      if (v.resting && v.task && v.task.kind === 'rest') {
        ctx.font = `bold ${Math.round(10 * dpr)}px system-ui`; ctx.fillStyle = '#e8f0ff'; ctx.textAlign = 'left';
        const b = Math.sin(time * 2 + v.id) * 3 * dpr;
        ctx.fillText('z', sx + 6 * dpr, sy + b); ctx.fillText('Z', sx + 10 * dpr, sy - 7 * dpr + b);
      }
    }
    // số bay lên
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.t += dt;
      if (f.t > 1.8) { floats.splice(i, 1); continue; }
      const [sx, sy] = W(f.x, f.y - f.t * 16);
      ctx.globalAlpha = f.t > 1.1 ? Math.max(0, 1 - (f.t - 1.1) / 0.7) : 1;
      ctx.font = `bold ${Math.round(14 * dpr)}px system-ui, sans-serif`;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#2a1608'; ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.text.startsWith('−') ? '#ffb0a0' : '#fff2a8'; ctx.fillText(f.text, sx, sy);
      if (f.icon && iconImgs[f.icon]) ctx.drawImage(iconImgs[f.icon], Math.round(sx + 2 * dpr), Math.round(sy - 8 * dpr), 16 * dpr, 16 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------- CHỌN ĐỐI TƯỢNG ----------------
  function pickVillager(wx, wy, tol) {
    let best = null;
    for (const v of S.villagers) {
      if (Math.abs(wx - v.x) <= 6 + tol && wy >= v.y - 18 - tol && wy <= v.y + 3 + tol) {
        if (!best || Math.abs(wx - v.x) + Math.abs(wy - v.y + 8) < Math.abs(wx - best.x) + Math.abs(wy - best.y + 8)) best = v;
      }
    }
    return best;
  }
  function pickObject(wx, wy) {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const cands = S.objects.filter(o => o.type !== 'huntzone' && o.type !== 'stump' && o.type !== 'sapling').sort((a, b) => (b.y + b.h) - (a.y + a.h));
    for (const o of cands) {
      const x0 = o.x * T, x1 = (o.x + o.w) * T, y1 = (o.y + o.h) * T;
      let y0 = o.y * T;
      if (o.type === 'tree') { if (wx >= x0 + 3 && wx <= x1 - 3 && wy >= y0 - 16 && wy <= y1) return o; continue; }
      if (o.type === 'hut' || o.type === 'site' || o.type === 'storage' || o.type === 'longhouse' || o.type === 'granary' || o.type === 'rack') y0 -= 8;
      if (wx >= x0 && wx < x1 && wy >= y0 && wy < y1) return o;
    }
    const z = S.objects.find(o => o.type === 'huntzone' && tx >= o.x && ty >= o.y && tx < o.x + o.w && ty < o.y + o.h);
    return z || null;
  }

  return { init, resize, draw, cam, centerOn, setZoom, pan, screenToWorld, worldToCss, rebuildGround, pickVillager, pickObject, defaultZoom, get dpr() { return dpr; } };
})();
