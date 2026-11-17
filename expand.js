// =====================================================================
//  EXPAND — làng tự vận hành, dân số tăng, mở mang đất đai
//  • Bộ lập kế hoạch: ai rảnh tự chọn việc hợp nghề theo nhu cầu và ưu tiên của làng
//  • Dân số: người lang thang xin gia nhập, cặp thân thiết sinh con (trẻ lớn sau vài ngày)
//  • Mở mang: ruộng mới, công trình mới mở khóa theo dân số, cây con mọc lại, đá lộ ra
//  • Bản đồ 48×36 có bãi cạn qua sông, bãi săn thứ hai bên bờ đông
// =====================================================================
'use strict';
const EXP = (() => {
  const T = CFG.TILE;
  const B = CFG.BUILDINGS;
  const rand = () => Math.random();
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SK = CFG.SKILL_NAMES;
  const BUILD_TYPES = ['fire', 'storage', 'hut', 'site', 'rack', 'granary', 'longhouse', 'healer', 'workshop', 'watchtower'];
  const DESC = {
    hut: `Chỗ ngủ cho ${CFG.HUT.sleepers} người, hồi phục tốt hơn.`,
    rack: `+${B.rack.foodCap} sức chứa thức ăn, thịt săn được +${Math.round(B.rack.meatBonus * 100)}%.`,
    granary: `+${B.granary.foodCap} sức chứa thức ăn.`,
    longhouse: `Chỗ ngủ cho ${B.longhouse.beds} người.`,
    healer: `Mỗi đêm mọi người hồi thêm ${CFG.HEALER.heal} sức khỏe, vết thương mau lành.`,
    workshop: `Công cụ tốt hơn: xây dựng, đốn gỗ, nhặt đá nhanh hơn ${Math.round((CFG.WORKSHOP.buildBonus - 1) * 100)}%; chế giáo đá nhanh hơn.`,
    watchtower: `Người canh gác đứng gác ở đây; phát hiện thú dữ từ xa để dân kịp chạy về bếp lửa, người gác đánh mạnh hơn ${Math.round((CFG.DEFENSE.towerBonus - 1) * 100)}% khi ở gần chòi.`,
  };

  // ---------------- TIỆN ÍCH ----------------
  const count = (t) => S.objects.filter(o => o.type === t).length;
  const adults = () => S.villagers.filter(v => !v.child);
  function coupleCount() { return S.villagers.filter(v => !v.child && v.partner && v.sex === 'f' && SIM.vById(v.partner)).length; }
  function beds() { return count('hut') * CFG.HUT.sleepers + count('longhouse') * B.longhouse.beds; }
  function foodCapBonus() { return count('rack') * B.rack.foodCap + count('granary') * B.granary.foodCap; }
  function meatMult() { return 1 + Math.min(2, count('rack')) * B.rack.meatBonus; }
  function buildRadius() { return CFG.BUILD_RADIUS + Math.max(0, Math.floor((S.villagers.length - 6) / 2)); }
  function bname(k) { return (B[k] && B[k].name) || 'Công trình'; }
  function bdesc(k) { return DESC[k] || ''; }
  function unlocked(k) { return S.villagers.length >= (B[k].unlock || 0); }
  function popText() { return `${S.villagers.length}/${beds()}`; }
  function avgMorale() { const a = adults(); return a.length ? a.reduce((s, v) => s + v.morale, 0) / a.length : 0; }

  function migrate(s) {
    if (s.auto === undefined) s.auto = CFG.AUTO.defaultOn;
    if (!s.priority) s.priority = 'balanced';
    if (s.autoSkipV !== 2) { s.autoSkipNight = true; s.autoSkipV = 2; } // mặc định tự sang ngày mới
    if (!s.mapW) { s.mapW = s.terrain.length === 36 * 28 ? 36 : CFG.MAP_W; s.mapH = s.terrain.length / s.mapW; }
    if (!s.pop) s.pop = { lastBirth: 0, arrivals: 0, births: 0, initBoulders: s.objects.filter(o => o.type === 'boulder').length };
    s.villagers.forEach(v => {
      if (v.child === undefined) v.child = false;
      if (!v.sex) v.sex = CFG.SEXES[v.name] || (Math.random() < 0.5 ? 'm' : 'f');
      if (v.partner === undefined) v.partner = 0;
      if (v.pregnant === undefined) v.pregnant = 0;
    });
    if (s.pop.lastFestival === undefined) s.pop.lastFestival = 0;
    if (!s.pop.unlocked) s.pop.unlocked = {};
    if (s.planNote === undefined) s.planNote = '';
    if (window.DEF) DEF.migrate(s);
  }

  // ---------------- SPRITE MỚI ----------------
  let SP = null;
  function sprites() {
    if (SP) return SP;
    const { mk, rect, px, ell, disc, shade } = ART;
    SP = {};
    { // cây con
      const [c, x] = mk(14, 16);
      rect(x, 6, 8, 2, 7, '#6b4224'); disc(x, 7, 6, 4, '#3e8a34'); disc(x, 6, 5, 2, '#5aa845'); px(x, 5, 4, '#7cc95a');
      SP.sapling = c;
    }
    { // giàn phơi thịt
      const [c, x] = mk(48, 42);
      for (const cx of [4, 22, 41]) { rect(x, cx, 10, 3, 30, '#6b4224'); rect(x, cx, 10, 1, 30, '#875632'); }
      rect(x, 2, 12, 44, 2, '#7a4c28'); rect(x, 2, 22, 44, 2, '#7a4c28');
      for (let i = 0; i < 9; i++) { const sx = 6 + i * 4 + (i > 3 ? 3 : 0); rect(x, sx, 14, 2, 6 + (i % 3), '#b8453a'); px(x, sx, 14, '#d86a52'); }
      for (let i = 0; i < 7; i++) { const sx = 7 + i * 5; rect(x, sx, 24, 2, 5 + (i % 2) * 2, '#a03a30'); px(x, sx + 1, 24, '#d86a52'); }
      for (let i = 0; i < 48; i += 2) px(x, i, 9, '#3d6e2c');
      rect(x, 0, 6, 48, 3, '#3d6e2c'); rect(x, 0, 6, 48, 1, '#4f8a36');
      ell(x, 24, 38, 6, 2, '#3a2a1a'); rect(x, 22, 35, 4, 2, '#e05a1e');
      SP.rack = c;
    }
    { // kho lương: giỏ tròn trên cột
      const [c, x] = mk(48, 58);
      for (const cx of [10, 22, 34]) { rect(x, cx, 36, 3, 18, '#6b4224'); rect(x, cx, 36, 1, 18, '#875632'); }
      rect(x, 6, 34, 36, 3, '#7a4c28');
      ell(x, 24, 26, 16, 10, '#b8884a');
      for (let j = 18; j < 36; j += 3) for (let i = 9; i < 40; i += 4) px(x, i + ((j / 3) % 2) * 2, j, '#8a6034');
      ell(x, 21, 22, 6, 3, '#d8b06a');
      for (let y = 2; y < 20; y++) { const half = Math.round((y - 2) * 1.05) + 1; for (let i = -half; i <= half; i++) px(x, 24 + i, y, (y % 5 < 2) ? '#4f8a36' : (i > half * 0.4 ? '#2c5221' : '#3d6e2c')); }
      for (let i = -19; i <= 19; i += 2) px(x, 24 + i, 20, '#24461b');
      rect(x, 22, 26, 5, 6, '#3a2616');
      SP.granary = c;
    }
    { // nhà dài 3×2
      const [c, x] = mk(72, 54);
      rect(x, 4, 30, 64, 18, '#8a6034');
      for (let i = 4; i < 68; i += 4) rect(x, i, 30, 1, 18, '#6b4224');
      rect(x, 4, 46, 64, 2, '#4a2d15');
      for (let y = 2; y < 32; y++) {
        const inset = Math.round((32 - y) * 0.45);
        for (let i = inset; i < 72 - inset; i++) {
          let col = (y % 6 < 2) ? '#4f8a36' : '#3d6e2c';
          if (i > 72 - inset - 10) col = '#2c5221';
          if (i < inset + 8) col = (y % 6 < 2) ? '#62a043' : '#4f8a36';
          px(x, i, y, col);
        }
        if (y % 6 === 5) for (let i = inset; i < 72 - inset; i += 2) px(x, i, y + 1, '#24461b');
      }
      rect(x, 32, 34, 9, 14, '#2a1a0e'); rect(x, 31, 34, 1, 14, '#875632'); rect(x, 41, 34, 1, 14, '#5a361c');
      rect(x, 14, 36, 5, 4, '#2a1a0e'); rect(x, 54, 36, 5, 4, '#2a1a0e');
      rect(x, 2, 47, 68, 2, '#24461b');
      SP.longhouse = c;
    }
    { // lều thảo dược
      const [c, x] = mk(48, 52);
      ell(x, 24, 42, 19, 7, '#8a6034'); rect(x, 6, 34, 36, 9, '#8a6034');
      for (let i = 6; i < 42; i += 4) rect(x, i, 34, 1, 10, '#6b4224');
      ell(x, 24, 26, 21, 15, '#5f7a2e'); ell(x, 22, 22, 15, 10, '#76963a'); ell(x, 19, 18, 7, 4, '#93b04a');
      for (let k = 0; k < 40; k++) px(x, 6 + (k * 7) % 36, 14 + (k * 5) % 20, '#4a6324');
      rect(x, 21, 37, 7, 10, '#2a1a0e');
      rect(x, 35, 31, 11, 1, '#6b4224');
      for (const [hx, col] of [[36, '#4fa04a'], [39, '#9a6ad0'], [42, '#4fa04a'], [44, '#e0c040']]) rect(x, hx, 32, 2, 5, col);
      rect(x, 23, 9, 3, 3, '#5a4a3a'); px(x, 24, 7, '#c8c8c8'); px(x, 25, 5, '#d8d8d8'); px(x, 23, 3, '#e8e8e8');
      SP.healer = c;
    }
    { // xưởng chế tác
      const [c, x] = mk(48, 48);
      for (const cx of [4, 41]) { rect(x, cx, 14, 3, 30, '#6b4224'); rect(x, cx, 14, 1, 30, '#875632'); }
      for (let y = 6; y < 16; y++) { const off = Math.round((16 - y) * 0.4); for (let i = off; i < 48 - off; i++) px(x, i, y, (y % 4 < 2) ? '#4f8a36' : (i > 36 ? '#2c5221' : '#3d6e2c')); }
      for (let i = 0; i < 48; i += 2) px(x, i, 16, '#24461b');
      ell(x, 18, 39, 7, 4, '#7d8188'); ell(x, 17, 37, 6, 3, '#a7abb1');
      rect(x, 25, 29, 2, 11, '#6b4224'); rect(x, 23, 27, 6, 3, '#8d9198'); px(x, 23, 27, '#c0c4c8');
      ell(x, 34, 38, 4, 4, '#b8653a'); rect(x, 32, 32, 4, 2, '#a0522d'); ell(x, 33, 37, 2, 2, '#d88a5a');
      rect(x, 7, 41, 10, 2, '#6b4224'); rect(x, 8, 39, 8, 2, '#875632');
      SP.workshop = c;
    }
    return SP;
  }
  function spriteFor(k) { if (k === 'hut' || !k) return ART.SPR.hut; if (k === 'watchtower' && window.DEF) return DEF.SPR.watchtower; return sprites()[k] || ART.SPR.hut; }

  function drawObj(o, X, Y, lx) {
    const sp = sprites();
    if (o.type === 'sapling') return () => lx.drawImage(sp.sapling, X + 5, Y + T - 16);
    if (o.type === 'fishspot') return () => drawFishspot(o, X, Y, lx);
    if (o.type === 'watchtower' && window.DEF) { const s = DEF.SPR.watchtower; return () => lx.drawImage(s, X, Y + o.h * T - s.height + 2); }
    if (sp[o.type] && (o.type === 'rack' || o.type === 'granary' || o.type === 'longhouse' || o.type === 'healer' || o.type === 'workshop')) {
      const s = sp[o.type];
      return () => lx.drawImage(s, X, Y + o.h * T - s.height + 2);
    }
    return null;
  }

  function drawFishspot(o, X, Y, lx) {
    const t = performance.now() / 1000 + o.id * 0.7;
    const cx = X + 12, cy = Y + 13, r = (t * 6) % 9;
    lx.strokeStyle = `rgba(220,240,255,${Math.max(0, 0.6 - r / 15)})`; lx.lineWidth = 1;
    lx.beginPath(); lx.ellipse(cx + 0.5, cy + 0.5, r + 1, (r + 1) / 2, 0, 0, Math.PI * 2); lx.stroke();
    if (o.stock > 0) {
      const ph = t % 3;
      if (ph < 0.5) { const jy = Math.round(Math.sin(ph / 0.5 * Math.PI) * 5); ART.rect(lx, cx - 2, cy - 2 - jy, 4, 2, '#c8d8e8'); ART.px(lx, cx + 2, cy - 3 - jy, '#a0b0c0'); }
      ART.rect(lx, X + 3, Y + 5, 1, 8, '#6b4224'); ART.px(lx, X + 3, Y + 4, '#e05a3a');
    }
  }
  function drawFishCarry(lx, X, Y) {
    const y = Y - 21;
    ART.rect(lx, X - 4, y + 1, 7, 3, '#a8b8c8'); ART.rect(lx, X - 4, y + 1, 7, 1, '#d0e0f0');
    ART.px(lx, X + 3, y, '#8898a8'); ART.px(lx, X + 3, y + 4, '#8898a8'); ART.px(lx, X - 3, y + 2, '#1a1a1a');
  }

  // Trẻ con: sprite nhỏ ~10 px
  function drawChild(x, X, Y, v, t, pose, facing, alpha) {
    const { rect, px } = ART;
    if (alpha !== undefined) x.globalAlpha = alpha;
    const step = pose === 'walk' ? Math.floor(t * 8) % 2 : 0;
    const by = Y + (pose === 'sit' ? 2 : 0);
    rect(x, X - 2, by - 3 + (step ? -1 : 0), 1, 3, v.skin); rect(x, X + 1, by - 3 + (step ? 0 : -1), 1, 3, v.skin);
    rect(x, X - 3, by - 7, 6, 4, v.tunic); rect(x, X - 3, by - 5, 6, 1, v.band);
    rect(x, X - 4, by - 7, 1, 3, v.skin); rect(x, X + 3, by - 7, 1, 3, v.skin);
    rect(x, X - 2, by - 12, 5, 5, v.skin); rect(x, X - 2, by - 13, 5, 2, v.hair);
    if (facing >= 0) px(x, X + 1, by - 10, '#1a1010');
    if (facing <= 0) px(x, X - 1, by - 10, '#1a1010');
    if (alpha !== undefined) x.globalAlpha = 1;
  }

  // ---------------- BẢN ĐỒ LỚN 48×36 ----------------
  function generate() {
    const W = CFG.MAP_W, H = CFG.MAP_H, TI = WORLD.TI, TER = WORLD.TER;
    const r = ART.rng(20261118);
    const terrain = new Array(W * H).fill(TI.grass);
    S.terrain = terrain; S.objects = []; S.nextId = 1; S.mapW = W; S.mapH = H;
    const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const id = (x, y) => y * W + x;
    const set = (x, y, n) => { if (inb(x, y)) terrain[id(x, y)] = TI[n]; };
    const get = (x, y) => inb(x, y) ? TER[terrain[id(x, y)]] : null;
    const add = (o) => WORLD.addObj(o);

    // Sông phía đông, uốn về tây ở phía nam; bãi cạn qua sông ở y = 20–21
    const riverX = [];
    for (let y = 0; y < H; y++) {
      const cx = 41 + Math.round(Math.sin(y * 0.3) * 1.3 + Math.sin(y * 0.11 + 2) * 0.9) - (y > 24 ? Math.round((y - 24) * 0.45) : 0);
      riverX[y] = cx;
      for (let x = cx - 1; x <= cx + 1; x++) set(x, y, 'water');
      set(cx - 2, y, 'sand'); set(cx + 2, y, 'sand');
      if (r() < 0.5) set(cx - 3, y, 'sand');
      if (y === 20 || y === 21) for (let x = cx - 1; x <= cx + 1; x++) set(x, y, 'sand');
    }
    // Rừng phía tây
    const forestEdge = [];
    for (let y = 0; y < H; y++) {
      let e = 10 + Math.round(Math.sin(y * 0.45) * 1.6 + (r() - 0.5));
      if (y > 24) e -= Math.round((y - 24) * 1.5);
      forestEdge[y] = e;
      for (let x = 0; x < e; x++) set(x, y, 'forest');
    }
    // Lùm rừng đông bắc
    for (let y = 5; y <= 10; y++) for (let x = 28; x <= 35; x++) if (Math.hypot(x - 31.5, (y - 7.5) * 1.3) < 4 + r() * 0.8 && get(x, y) === 'grass') set(x, y, 'forest');
    // Vách đá phía bắc
    const cliffDepth = [];
    for (let x = 6; x <= 36; x++) {
      const d = 2 + Math.round(Math.sin(x * 0.55) * 0.8 + r() * 0.5);
      cliffDepth[x] = d;
      for (let y = 0; y < d; y++) set(x, y, 'cliff');
      set(x, d, 'rock');
      if (r() < 0.6) set(x, d + 1, 'rock');
    }
    // Đồng cỏ tây nam
    for (let y = 27; y < H; y++) for (let x = 0; x < 16; x++) {
      const edge = 14 + Math.round(Math.sin(y * 0.9) * 0.8);
      if (x <= edge && !(y === 27 && r() < 0.4)) set(x, y, 'meadow');
    }
    // Mỏm đá giữa phía nam
    for (let y = 28; y <= 34; y++) for (let x = 15; x <= 20; x++) if (Math.hypot(x - 17.5, y - 31) < 2.4 + r() * 0.4) set(x, y, 'rock');
    // Bờ đông: bãi đá nhỏ
    for (const [bx, by] of [[45, 11], [46, 14]]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (get(bx + dx, by + dy) === 'grass') set(bx + dx, by + dy, 'rock');
    // Sân trại
    const FX = 22, FY = 16;
    for (let y = FY - 4; y <= FY + 4; y++) for (let x = FX - 4; x <= FX + 5; x++) {
      if (Math.hypot(x - FX - 0.5, (y - FY) * 1.1) < 2.8 + r() * 0.6) set(x, y, 'dirt');
    }
    // Đường đất
    const paint = (pts) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
        let px_ = x0, py_ = y0;
        for (let s = 0; s <= n; s++) {
          const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n);
          if (x !== px_ && y !== py_) { const c3 = get(x, py_); if (c3 === 'grass' || c3 === 'forest' || c3 === 'meadow') set(x, py_, 'dirt'); }
          px_ = x; py_ = y;
          const cur = get(x, y);
          if (cur !== 'water' && cur !== 'cliff' && cur !== 'sand') set(x, y, 'dirt');
          if (r() < 0.2) { const ox = x + (r() < 0.5 ? 1 : 0), oy = y + (r() < 0.5 ? 1 : 0); const c2 = get(ox, oy); if (c2 === 'grass' || c2 === 'forest') set(ox, oy, 'dirt'); }
        }
      }
    };
    paint([[21, 16], [16, 16], [11, 17], [6, 17]]);
    paint([[23, 13], [23, 10], [22, 6], [21, 4]]);
    paint([[24, 18], [26, 21], [29, 22], [34, 22]]);
    paint([[21, 18], [18, 22], [14, 26], [11, 29]]);
    paint([[19, 19], [17, 25], [17, 28]]);
    paint([[25, 16], [30, 16], [34, 18], [riverX[20] - 3, 20]]);
    // Bãi săn thứ hai bên bờ đông
    let zx = 0;
    for (let y = 27; y <= 33; y++) zx = Math.max(zx, riverX[y] + 3);
    const zw = W - zx;
    paint([[riverX[20] + 3, 21], [riverX[20] + 4, 24], [zx + 1, 27]]);
    paint([[riverX[20] + 3, 20], [44, 17], [45, 13]]);
    // Ruộng
    for (const [px, py] of [[25, 23], [28, 23], [31, 23], [25, 26], [28, 26], [31, 26]]) {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) set(px + i, py + j, 'farm');
      add({ type: 'plot', x: px, y: py, w: 2, h: 2, state: 'wild', progress: 0, growth: 0, yieldLeft: 0, seeded: false });
    }
    add({ type: 'fire', x: FX, y: FY, w: 1, h: 1 });
    add({ type: 'storage', x: 24, y: 13, w: 2, h: 2, level: 0, upgrading: null });
    add({ type: 'huntzone', x: 1, y: 28, w: 12, h: 7, animals: CFG.HUNT.animalsStart });
    if (zw >= 4) {
      for (let y = 27; y <= 33; y++) for (let x = zx; x < W; x++) if (get(x, y) === 'grass') set(x, y, 'meadow');
      add({ type: 'huntzone', x: zx, y: 27, w: zw, h: 7, animals: 3 });
    }
    const occupied = (x, y) => S.objects.some(o => x >= o.x && y >= o.y && x < o.x + o.w && y < o.y + o.h);
    const nearCamp = (x, y) => Math.hypot(x - FX, y - FY) < 6.5;
    // Đá tảng
    const boulders = [];
    for (const bx of [9, 12, 15, 18, 21, 26, 29, 32, 35]) { const by = cliffDepth[bx]; set(bx, by, 'rock'); boulders.push([bx, by]); }
    boulders.push([16, 30], [19, 31], [17, 33], [45, 11], [46, 14]);
    boulders.forEach(([bx, by], k) => {
      if (get(bx, by) === 'rock' && !occupied(bx, by)) add({ type: 'boulder', x: bx, y: by, w: 1, h: 1, stock: CFG.GATHER.stone.stock, v: k % 2 });
    });
    // Bụi quả
    const bushPos = [[14, 11], [13, 19], [11, 23], [16, 24], [30, 12], [34, 13], [29, 19], [17, 8], [36, 27], [21, 28], [45, 18], [44, 24], [26, 9], [9, 25]];
    for (const [bx, by] of bushPos) {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1]]) {
        const x = bx + dx, y = by + dy, t = get(x, y);
        if ((t === 'grass' || t === 'forest') && !occupied(x, y)) { add({ type: 'bush', x, y, w: 1, h: 1, stock: CFG.GATHER.berry.stock, seeds: CFG.GATHER.berry.seeds, regrow: 0 }); break; }
      }
    }
    // Cây
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = get(x, y);
      let p = 0;
      if (t === 'forest') p = x < forestEdge[y] - 1 ? 0.6 : 0.45;
      else if (t === 'grass') {
        if (x > riverX[y] + 2) p = 0.4;
        else if (x >= forestEdge[y] && x <= forestEdge[y] + 1) p = 0.18;
        else if (y > 32 && x > 20 && x < 34) p = 0.15;
        else p = 0.02;
      }
      if (p && r() < p && (t === 'grass' || t === 'forest') && !occupied(x, y) && !nearCamp(x, y)) add({ type: 'tree', x, y, w: 1, h: 1, stock: CFG.GATHER.wood.stock, v: (r() * 3) | 0 });
    }
    WORLD.rebuild();
    // Đảm bảo có đường tới bụi quả, đá và bãi săn
    const f = WORLD.fire();
    const start = WORLD.ringTiles(f)[0];
    const important = S.objects.filter(o => o.type === 'bush' || o.type === 'boulder' || o.type === 'huntzone');
    for (const o of important) {
      const goals = o.type === 'huntzone' ? WORLD.insideTiles(o) : WORLD.ringTiles(o);
      if (!WORLD.findPath(start[0], start[1], goals)) {
        S.objects = S.objects.filter(t => !(t.type === 'tree' && t.x >= o.x - 2 && t.x <= o.x + o.w + 1 && t.y >= o.y - 2 && t.y <= o.y + o.h + 1));
        WORLD.rebuild();
      }
    }
  }

  // ---------------- XÂY DỰNG & RUỘNG ----------------
  function overlapsBuilding(x, y, w, h, gap) {
    return S.objects.some(o => BUILD_TYPES.includes(o.type) && x - gap < o.x + o.w && x + w + gap > o.x && y - gap < o.y + o.h && y + h + gap > o.y);
  }
  function findSpot(k) {
    const b = B[k], f = WORLD.fire(), R = buildRadius();
    let best = null, bd = 1e9;
    for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) {
      const d = Math.hypot(x + b.w / 2 - f.x - 0.5, y + b.h / 2 - f.y - 0.5);
      if (d < 3 || d > R || d >= bd) continue;
      if (overlapsBuilding(x, y, b.w, b.h, 1)) continue;
      if (!SIM.validHutSpot(x, y, b.w, b.h).ok) continue;
      if (!WORLD.ringTiles({ x, y, w: b.w, h: b.h }).some(([a, c]) => WORLD.inMain(a, c))) continue;
      best = [x, y]; bd = d;
    }
    return best;
  }
  function startSite(k, x, y) {
    const b = B[k];
    S.res.wood -= b.wood; S.res.stone -= b.stone;
    const site = WORLD.addObj({ type: 'site', kind: k, x, y, w: b.w, h: b.h, progress: 0, need: b.hours });
    WORLD.rebuild();
    SIM.unstickAll();
    SIM.log(`Bắt đầu xây ${b.name} (−${b.wood} gỗ, −${b.stone} đá).`);
    return site;
  }

  function validPlot(x, y) {
    const f = WORLD.fire();
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const t = WORLD.ter(x + i, y + j);
      if (!['grass', 'meadow', 'forest'].includes(t)) return { ok: false, msg: 'Chỉ mở ruộng trên bãi cỏ hoặc nền rừng trống' };
      if (WORLD.objAt(x + i, y + j)) return { ok: false, msg: 'Ô này đã có vật cản' };
    }
    if (Math.hypot(x + 1 - f.x - 0.5, y + 1 - f.y - 0.5) > CFG.NEW_PLOT_RADIUS) return { ok: false, msg: 'Ruộng phải ở gần trại' };
    if (![[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].some(([a, c]) => WORLD.inMain(a, c))) return { ok: false, msg: 'Không có đường tới đây' };
    return { ok: true };
  }
  function plotSpotNear(tx, ty) {
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) if (validPlot(tx + dx, ty + dy).ok) return [tx + dx, ty + dy];
    return null;
  }
  function plotSpotAt(wx, wy) { return plotSpotNear(Math.floor(wx / T), Math.floor(wy / T)); }
  function findPlotSpot() {
    const plots = S.objects.filter(o => o.type === 'plot');
    const f = WORLD.fire();
    const cx = plots.length ? plots.reduce((s, p) => s + p.x + 1, 0) / plots.length : f.x + 4;
    const cy = plots.length ? plots.reduce((s, p) => s + p.y + 1, 0) / plots.length : f.y + 5;
    let best = null, bd = 1e9;
    const R = CFG.NEW_PLOT_RADIUS;
    for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) {
      const d = Math.hypot(x + 1 - cx, y + 1 - cy);
      if (d >= bd) continue;
      if (overlapsBuilding(x, y, 2, 2, 1)) continue;
      if (!validPlot(x, y).ok) continue;
      best = [x, y]; bd = d;
    }
    return best;
  }
  function createPlot(x, y) {
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) WORLD.setTer(x + i, y + j, 'farm');
    const o = WORLD.addObj({ type: 'plot', x, y, w: 2, h: 2, state: 'wild', progress: 0, growth: 0, yieldLeft: 0, seeded: false });
    WORLD.rebuild();
    EV.emit('plot', o);
    SIM.log('Làng mở thêm một ruộng mới.');
    return o;
  }

  // ---------------- HÀNH ĐỘNG CỦA NGƯỜI CHƠI ----------------
  function handles(type) { return type === 'buildAt' || type === 'newPlot'; }
  function check(spec, vs) {
    if (spec.type === 'buildAt') {
      const b = B[spec.kind];
      if (!b) return { ok: false, msg: '?' };
      if (!unlocked(spec.kind)) return { ok: false, msg: `Mở khóa khi dân số đạt ${b.unlock}` };
      if (b.max && count(spec.kind) + S.objects.filter(o => o.type === 'site' && o.kind === spec.kind).length >= b.max) return { ok: false, msg: `Đã đủ ${b.max} ${b.name}` };
      const v = SIM.validHutSpot(spec.x, spec.y, b.w, b.h);
      if (!v.ok) return v;
      if (S.res.wood < b.wood) return { ok: false, msg: `Cần thêm ${b.wood - S.res.wood} gỗ để xây ${b.name}` };
      if (S.res.stone < b.stone) return { ok: false, msg: `Cần thêm ${b.stone - S.res.stone} đá để xây ${b.name}` };
      if (!vs.length && !S.auto) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
      return { ok: true };
    }
    if (spec.type === 'newPlot') return validPlot(spec.x, spec.y);
    return { ok: false, msg: '?' };
  }
  function assign(spec, vs) {
    if (spec.type === 'buildAt') {
      const site = startSite(spec.kind, spec.x, spec.y);
      if (vs.length) SIM.assign({ type: 'build', target: site.id }, vs);
      return { ok: true };
    }
    if (spec.type === 'newPlot') {
      const p = createPlot(spec.x, spec.y);
      if (vs.length) SIM.assign({ type: 'clear', target: p.id }, vs);
      return { ok: true };
    }
    return { ok: false, msg: '?' };
  }
  function ghostFor(p) {
    if (p.kind === 'hut') return { x: p.x, y: p.y, ok: true, kind: 'hut', w: 2, h: 2 };
    if (p.kind === 'place') return { x: p.x, y: p.y, ok: true, kind: p.b, w: B[p.b].w, h: B[p.b].h };
    return null;
  }
  function placeActions(p, n) {
    const b = B[p.b];
    return {
      title: `Xây ${b.name} tại đây`,
      desc: `Chi phí: ${b.wood} gỗ, ${b.stone} đá (trừ ngay khi xác nhận) · ${b.hours} giờ công. ${bdesc(p.b)}`,
      actions: [{ spec: { type: 'buildAt', kind: p.b, x: p.x, y: p.y }, label: `Xây ${b.name}`, detail: S.auto ? 'Không chọn ai thì làng tự cử thợ xây.' : `≈ ${Math.round(b.hours / n * 10) / 10} giờ với ${n} người` }],
    };
  }
  function tileActions(p, out) {
    const sp = plotSpotNear(p.tx, p.ty);
    if (sp) out.actions.push({ spec: { type: 'newPlot', x: sp[0], y: sp[1] }, label: 'Mở ruộng mới', detail: `Biến 2×2 ô cỏ thành đất hoang · không tốn vật liệu · sau đó cần dọn đất (${CFG.FARM.clearHours} giờ công)` });
  }

  // ---------------- BỘ LẬP KẾ HOẠCH ----------------
  let acc = 0, want = null;
  const bad = new Map();
  const nowKey = () => S.day * 100 + S.hour;
  const isBad = (id) => (bad.get(id) || 0) > nowKey();
  const workers = (id, type) => S.villagers.filter(v => v.job && v.job.target === id && (!type || v.job.type === type)).length;
  const dist = (v, o) => { const [tx, ty] = SIM.tileOf(v); return Math.abs(tx - o.x) + Math.abs(ty - o.y); };
  const nearest = (v, list) => { let b = null, bd = 1e9; for (const o of list) { const d = dist(v, o); if (d < bd) { bd = d; b = o; } } return b; };

  function upgradeCost() { const st = WORLD.storage(); return (CFG.STORAGE_UPGRADES && CFG.STORAGE_UPGRADES[st.level]) || CFG.STORAGE_UPGRADE; }
  function storageFull() {
    const st = WORLD.storage();
    if (st.level >= CFG.STORAGE_CAP.length - 1) return false;
    return ['wood', 'stone', 'food'].some(r => S.res[r] >= SIM.cap(r) * 0.9);
  }
  function costOf(w) { return w === 'upgrade' ? upgradeCost() : B[w]; }

  function manage() {
    const pop = S.villagers.length;
    const site = S.objects.find(o => o.type === 'site');
    const st = WORLD.storage();
    want = null;
    S.planNote = '';
    if (!st.upgrading && storageFull()) want = 'upgrade'; // ưu tiên số 1: kho gần đầy thì nâng cấp
    else if (!site && !st.upgrading) {
      const shortBeds = Math.min(pop + 2, CFG.POP.max) - beds();
      if (shortBeds > 0) want = unlocked('longhouse') && count('longhouse') < Math.floor(pop / 8) ? 'longhouse' : 'hut';
      else if (coupleCount() > count('hut')) { want = 'hut'; S.planNote = 'Vợ chồng cần lều riêng để ngủ chung'; }
      else if (st.level === 0 && pop >= 8) want = 'upgrade';
      else if (unlocked('rack') && count('rack') < (pop >= 14 ? 2 : 1)) want = 'rack';
      else if (unlocked('watchtower') && count('watchtower') < (pop >= 20 ? 2 : 1) && S.def && S.def.attacks > 0) want = 'watchtower';
      else if (unlocked('granary') && count('granary') < (pop >= 18 ? 2 : 1)) want = 'granary';
      else if (unlocked('healer') && count('healer') < 1) want = 'healer';
      else if (unlocked('workshop') && count('workshop') < 1) want = 'workshop';
    }
    if (want) {
      const c = costOf(want);
      const name = want === 'upgrade' ? 'nâng cấp kho' : bname(want);
      if (S.res.wood >= c.wood && S.res.stone >= c.stone) {
        if (want === 'upgrade') {
          S.res.wood -= c.wood; S.res.stone -= c.stone;
          st.upgrading = { progress: 0, need: c.hours };
          SIM.log(`Làng bắt đầu nâng cấp kho (−${c.wood} gỗ, −${c.stone} đá).`);
          want = null;
        } else {
          const spot = findSpot(want);
          if (spot) { startSite(want, spot[0], spot[1]); want = null; }
          else S.planNote = `Không còn chỗ trống gần trại để xây ${name}.`;
        }
      } else {
        S.planNote = `Đang tích vật liệu để ${want === 'upgrade' ? '' : 'xây '}${name}: gỗ ${S.res.wood}/${c.wood}, đá ${S.res.stone}/${c.stone}.`;
      }
    }
    // Mở thêm ruộng khi làng đông người hơn
    const plots = S.objects.filter(o => o.type === 'plot');
    const target = Math.ceil(adults().length / 2) + 1;
    if (plots.length < target && !plots.some(p => p.state === 'wild')) {
      const sp = findPlotSpot();
      if (sp) createPlot(sp[0], sp[1]);
    }
  }

  function context() {
    const fd = SIM.foodDays(), cap = SIM.cap('food');
    const foodW = S.res.food >= cap - 2 ? 0 : fd < 1.5 ? 10 : fd < 3 ? 6 : fd < 5 ? 3 : 1.5;
    const plots = S.objects.filter(o => o.type === 'plot');
    const needSeeds = plots.filter(p => p.state === 'wild' || (p.state === 'cleared' && !p.seeded && p.yieldLeft <= 0)).length;
    const seedW = needSeeds && S.res.seeds < CFG.FARM.seedCost * 2 ? (S.res.food >= cap - 2 ? 2 : 5) : 0;
    const c = want ? costOf(want) : null;
    const lackW = c ? Math.max(0, c.wood - S.res.wood) : 0, lackS = c ? Math.max(0, c.stone - S.res.stone) : 0;
    const woodW = S.res.wood >= SIM.cap('wood') - 2 ? 0 : lackW > 0 ? 5 : S.res.wood < 12 ? 2 : 0.8;
    const stoneW = S.res.stone >= SIM.cap('stone') - 2 ? 0 : lackS > 0 ? 5 : S.res.stone < 8 ? 2 : 0.6;
    const zone = S.objects.filter(o => o.type === 'huntzone' && o.animals >= 2).sort((a, b) => b.animals - a.animals)[0];
    const canHunt = !!zone && S.weather === 'sun' && S.hour < 12.5 && !S.hunts.length && foodW >= 1.5;
    const waiting = plots.filter(p => p.state === 'cleared' && !p.seeded && p.yieldLeft <= 0).length;
    const clearW = waiting >= 2 && S.res.seeds < CFG.FARM.seedCost ? 1 : 4;
    return { foodW, seedW, woodW, stoneW, zone, canHunt, clearW, plots };
  }

  function options(v, ctx, idle) {
    const M = ({ balanced: {}, food: { food: 2 }, build: { build: 2 }, expand: { farm: 1.7, build: 1.4 } })[S.priority] || {};
    const sf = (sk) => (0.5 + (v.skills[sk] || 1) / 5) * (v.main === sk ? 1.6 : 1);
    const out = [];
    const push = (base, group, sk, spec, vs) => { if (base > 0) out.push({ score: base * (M[group] || 1) * sf(sk), spec, vs: vs || [v] }); };
    for (const p of ctx.plots) {
      if (isBad(p.id)) continue;
      const w = workers(p.id);
      if ((p.state === 'ready' || p.yieldLeft > 0) && w < 3) push(12, 'food', 'farm', { type: 'harvest', target: p.id });
      else if (p.state === 'cleared' && p.yieldLeft <= 0 && (p.seeded || S.res.seeds >= CFG.FARM.seedCost) && w < 2) push(9, 'food', 'farm', { type: 'sow', target: p.id });
      else if (p.state === 'wild' && w < 3) push(ctx.clearW, 'farm', 'farm', { type: 'clear', target: p.id });
    }
    const site = S.objects.find(o => o.type === 'site' && !isBad(o.id));
    if (site && workers(site.id) < 4) push(8, 'build', 'build', { type: 'build', target: site.id });
    const st = WORLD.storage();
    if (st.upgrading && workers(st.id, 'upgrade') < 4) push(10, 'build', 'build', { type: 'upgrade' });
    const bush = nearest(v, S.objects.filter(o => o.type === 'bush' && o.stock > 0 && !isBad(o.id) && workers(o.id) < 2));
    if (bush) push(Math.max(ctx.foodW, ctx.seedW), 'food', 'gather', { type: 'gather', target: bush.id });
    const fish = nearest(v, S.objects.filter(o => o.type === 'fishspot' && o.stock > 0 && !isBad(o.id) && workers(o.id) < 2));
    if (fish) push(ctx.foodW * 1.1, 'food', 'gather', { type: 'gather', target: fish.id });
    if (ctx.canHunt && !v.pregnant) {
      const partner = idle.filter(x => x !== v && !x.job && !x.resting && !x.pregnant && x.skills.hunt >= 2).sort((a, b) => b.skills.hunt - a.skills.hunt)[0];
      if (partner) push(ctx.foodW * 1.3 + 1, 'food', 'hunt', { type: 'hunt', target: ctx.zone.id }, [v, partner]);
    }
    const tree = nearest(v, S.objects.filter(o => o.type === 'tree' && !isBad(o.id) && workers(o.id) < 2));
    if (tree) push(ctx.woodW, 'build', 'build', { type: 'gather', target: tree.id });
    const rock = nearest(v, S.objects.filter(o => o.type === 'boulder' && !isBad(o.id) && workers(o.id) < 2));
    if (rock) push(ctx.stoneW, 'build', 'build', { type: 'gather', target: rock.id });
    if (window.DEF) DEF.options(v, push);
    return out;
  }

  function tryAssign(o) {
    const r = SIM.assign(o.spec, o.vs);
    if (r.ok) {
      o.vs.forEach(x => { if (x.job) { x.job.auto = true; x.job.until = o.spec.type === 'gather' ? S.hour + 3 : 99; } });
      return true;
    }
    if (o.spec.target) bad.set(o.spec.target, nowKey() + 2);
    return false;
  }

  function assignIdle() {
    for (const v of S.villagers) {
      if (v.job && v.job.auto && S.hour > (v.job.until || 99) && (!v.task || v.task.kind !== 'work') && !v.carry) { v.job = null; v.task = null; }
    }
    if (window.DEF) DEF.autoGuards();
    const idle = S.villagers.filter(v => !v.child && !v.job && !v.resting);
    if (!idle.length) return;
    const ctx = context();
    for (const v of idle) {
      if (v.job) continue;
      const opts = options(v, ctx, idle).sort((a, b) => b.score - a.score);
      for (const o of opts.slice(0, 5)) if (tryAssign(o)) break;
    }
  }

  function tick(dt) {
    acc += dt;
    if (acc < CFG.AUTO.interval) return;
    acc = 0;
    if (!S.auto || SIM.phase() !== 'day') return;
    manage();
    assignIdle();
  }

  // ---------------- DÂN SỐ & TÁI SINH (qua đêm) ----------------
  const TUNICS = ['#9c5b2e', '#6e4a2a', '#7d6a3c', '#a8743c', '#8c5a3a', '#5f6e3a', '#7a3e2a', '#6a5a3a', '#8a6a4a'];
  const BANDS = ['#f2c94c', '#e05a3a', '#4fb0e0', '#e86fb0', '#9be067', '#f0f0f0', '#b07cf0', '#40d0c0', '#ff9a3c'];
  const HAIRS = ['#2a1810', '#1b1b1b', '#5a3a1e', '#3a2416', '#7a4a24', '#a0522d', '#d8c8b0'];
  const SKINS = ['#d9a273', '#c88b5c', '#e0ae80', '#e6b48a', '#d8a070', '#dcaa7c', '#b97d50'];

  function newName() {
    const used = new Set(S.villagers.map(v => v.name));
    const free = CFG.NAMES.filter(n => !used.has(n));
    if (free.length) return pick(free);
    let k = 2; const base = pick(CFG.NAMES);
    while (used.has(`${base} ${k}`)) k++;
    return `${base} ${k}`;
  }
  function addVillager(v, tile) {
    v.id = Math.max(0, ...S.villagers.map(x => x.id)) + 1;
    [v.x, v.y] = [tile[0] * T + T / 2, tile[1] * T + T * 0.75];
    Object.assign(v, { facing: 0, bonds: {}, job: null, carry: null, resting: false, restKind: '', restReason: '', note: '', fedToday: true, task: null });
    for (const o of S.villagers) { const b = v._bonds && v._bonds[o.id] !== undefined ? v._bonds[o.id] : 30 + Math.floor(rand() * 15); v.bonds[o.id] = b; o.bonds[v.id] = b; }
    delete v._bonds;
    S.villagers.push(v);
    return v;
  }
  function newcomer() {
    const counts = { hunt: 0, gather: 0, build: 0, farm: 0, guard: 0 };
    adults().forEach(a => counts[a.main]++);
    const main = Object.keys(counts).sort((a, b) => counts[a] - counts[b] + (rand() - 0.5))[0];
    const skills = { hunt: 1 + Math.floor(rand() * 3), gather: 1 + Math.floor(rand() * 3), build: 1 + Math.floor(rand() * 3), farm: 1 + Math.floor(rand() * 3), guard: 1 + Math.floor(rand() * 3) };
    skills[main] = 4 + (rand() < 0.4 ? 1 : 0);
    const f = WORLD.fire();
    const tile = WORLD.nearestMain(Math.max(0, f.x - 12), f.y + 1);
    const v = addVillager({ name: newName(), main, skills, hair: pick(HAIRS), tunic: pick(TUNICS), band: pick(BANDS), skin: pick(SKINS), energy: 80, health: 90, morale: 65, child: false, sex: rand() < 0.5 ? 'm' : 'f', partner: 0, pregnant: 0 }, tile);
    S.pop.arrivals++;
    SIM.event(`${v.name} (giỏi ${SK[main]}) từ một bộ lạc xa tìm đến xin gia nhập.`);
    EV.emit('toast', `Người mới: ${v.name} gia nhập bộ lạc!`);
  }
  function birth(a, b) {
    const main = rand() < 0.5 ? a.main : b.main;
    const skills = {};
    for (const k of ['hunt', 'gather', 'build', 'farm', 'guard']) skills[k] = clamp(Math.round(((a.skills[k] || 1) + (b.skills[k] || 1)) / 2 + (rand() - 0.5) * 2), 1, 5);
    skills[main] = Math.max(skills[main], 4);
    const f = WORLD.fire();
    const tile = WORLD.nearestMain(f.x, f.y + 1);
    const _bonds = { [a.id]: 85, [b.id]: 85 };
    const v = addVillager({ name: newName(), main, skills, hair: rand() < 0.5 ? a.hair : b.hair, tunic: pick(TUNICS), band: pick(BANDS), skin: rand() < 0.5 ? a.skin : b.skin, energy: 100, health: 100, morale: 80, child: true, growDay: S.day + CFG.POP.childDays, sex: rand() < 0.5 ? 'm' : 'f', parents: [a.id, b.id], partner: 0, pregnant: 0, _bonds }, tile);
    S.pop.lastBirth = S.day; S.pop.births++; a.lastBirth = S.day;
    SIM.event(`${a.name} và ${b.name} chào đón bé ${v.name}!`);
    EV.emit('toast', `Bé ${v.name} chào đời!`);
  }
  function regionSize() { const r = WORLD.mainRegion(); let n = 0; for (let i = 0; i < r.length; i++) n += r[i]; return n; }
  function regrow() {
    const R = CFG.REGROW, f = WORLD.fire();
    for (const o of S.objects.slice()) {
      if (o.type === 'fishspot') { o.stock = Math.min(CFG.GATHER.fish.stock, o.stock + CFG.GATHER.fish.regen); continue; }
      if (o.type === 'stump') {
        o.age = (o.age || 0) + 1;
        if (o.age >= 2 && Math.hypot(o.x - f.x, o.y - f.y) > 5 && rand() < R.saplingChance) { o.type = 'sapling'; o.days = 0; }
      } else if (o.type === 'sapling') {
        o.days = (o.days || 0) + 1;
        const occupied = S.villagers.some(v => { const [tx, ty] = SIM.tileOf(v); return tx === o.x && ty === o.y; });
        if (o.days >= R.saplingDays && !occupied) { o.type = 'tree'; o.stock = CFG.GATHER.wood.stock; o.v = Math.floor(rand() * 3); }
      }
    }
    WORLD.rebuild();
    if (count('boulder') < (S.pop.initBoulders || 6) + R.boulderMaxExtra && rand() < R.boulderChance) {
      const cand = [];
      for (let y = 0; y < WORLD.H; y++) for (let x = 0; x < WORLD.W; x++) if (WORLD.ter(x, y) === 'rock' && !WORLD.objAt(x, y)) cand.push([x, y]);
      for (let k = 0; k < 6 && cand.length; k++) {
        const [x, y] = cand.splice(Math.floor(rand() * cand.length), 1)[0];
        const before = regionSize();
        const o = WORLD.addObj({ type: 'boulder', x, y, w: 1, h: 1, stock: CFG.GATHER.stone.stock, v: Math.floor(rand() * 2) });
        WORLD.rebuild();
        if (regionSize() < before - 1 || !WORLD.ringTiles(o).some(([a, c]) => WORLD.inMain(a, c))) { WORLD.removeObj(o); continue; }
        SIM.log('Đất lở ở chân vách để lộ ra một tảng đá mới.');
        break;
      }
    }
  }
  function overnight() {
    for (const v of S.villagers) if (v.child && S.day >= v.growDay) { v.child = false; SIM.event(`${v.name} đã lớn và bắt đầu phụ giúp bộ lạc.`); }
    const P = CFG.POP;
    const ok = () => S.villagers.length < P.max && beds() - S.villagers.length >= 1 && SIM.foodDays() >= P.minFoodDays && avgMorale() >= P.minMorale;
    family(ok);
    if (ok() && rand() < P.newcomerChance) newcomer();
    unlocks();
    festival();
    if (count('healer')) for (const v of S.villagers) v.health = Math.min(100, v.health + CFG.HEALER.heal);
    regrow();
  }

  // ---------------- GIA ĐÌNH: nên duyên, mang thai, sinh con ----------------
  function family(ok) {
    const F = CFG.FAMILY, P = CFG.POP;
    const single = adults().filter(v => !v.partner);
    for (const a of single) {
      if (a.partner || a.sex !== 'm') continue;
      const cands = single.filter(b => !b.partner && b.sex === 'f' && (a.bonds[b.id] || 0) >= F.coupleBond).sort((x, y) => (a.bonds[y.id] || 0) - (a.bonds[x.id] || 0));
      if (!cands.length) continue;
      const b = cands[0];
      a.partner = b.id; b.partner = a.id;
      a.bonds[b.id] = b.bonds[a.id] = Math.max(a.bonds[b.id] || 0, 80);
      S.villagers.forEach(v => v.morale = Math.min(100, v.morale + 3));
      SIM.event(`${a.name} và ${b.name} nên duyên vợ chồng. Cả bộ lạc mừng cho họ!`);
      EV.emit('toast', `${a.name} và ${b.name} nên duyên vợ chồng!`);
    }
    for (const m of S.villagers) {
      if (!(m.pregnant > 0)) continue;
      m.pregnant--;
      if (m.pregnant <= 0) { m.pregnant = 0; birth(m, SIM.vById(m.partner) || m); }
    }
    if (!ok()) return;
    for (const f of adults()) {
      if (f.sex !== 'f' || !f.partner || f.pregnant > 0 || f.health < 60) continue;
      if (!(S.nightCouples || []).some(c => c[1] === f.id)) continue; // phải cùng vào lều riêng đêm qua
      if (S.day - (f.lastBirth || -99) < F.birthGapDays) continue;
      const coming = S.villagers.filter(v => v.pregnant > 0).length;
      if (S.villagers.length + coming >= Math.min(P.max, beds())) break;
      if (rand() < F.pregnancyChance) {
        f.pregnant = F.pregnancyDays;
        const dad = SIM.vById(f.partner);
        SIM.event(`Đêm qua ${f.name}${dad ? ` và ${dad.name}` : ''} ngủ chung lều — ${f.name} đã mang thai, còn ${F.pregnancyDays} ngày nữa em bé chào đời.`);
        EV.emit('toast', `${f.name} đang mang thai!`);
      }
    }
  }

  // ---------------- MỞ KHÓA THEO DÂN SỐ ----------------
  function createFishspots() {
    const f = WORLD.fire(), cand = [];
    for (let y = 0; y < WORLD.H; y++) for (let x = 0; x < WORLD.W; x++) {
      if (WORLD.ter(x, y) !== 'water' || WORLD.objAt(x, y)) continue;
      let bank = false;
      for (let dy = -1; dy <= 1 && !bank; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && WORLD.inMain(x + dx, y + dy)) { bank = true; break; }
      if (bank) cand.push([x, y, Math.hypot(x - f.x, y - f.y)]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    const picked = [];
    for (const c of cand) {
      if (picked.length >= CFG.FISH.spots) break;
      if (picked.some(p => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) < 4)) continue;
      picked.push(c);
      WORLD.addObj({ type: 'fishspot', x: c[0], y: c[1], w: 1, h: 1, stock: CFG.GATHER.fish.stock });
    }
    return picked.length;
  }
  const UNLOCKS = () => [
    [B.rack.unlock, B.rack.name], [CFG.FISH.unlock, 'Câu cá bên sông'], [B.granary.unlock, B.granary.name],
    [B.longhouse.unlock, B.longhouse.name], [CFG.FESTIVAL.unlock, `Lễ hội lửa trại (mỗi ${CFG.FESTIVAL.everyDays} ngày)`],
    [B.healer.unlock, B.healer.name], [B.workshop.unlock, B.workshop.name], [B.watchtower.unlock, B.watchtower.name],
  ].sort((a, b) => a[0] - b[0]);
  function unlocks() {
    const pop = S.villagers.length;
    if (pop >= CFG.FISH.unlock && !S.objects.some(o => o.type === 'fishspot')) {
      const n = createFishspots();
      if (n) { SIM.event(`Bộ lạc đã đủ đông để học nghề câu cá! ${n} bến cá xuất hiện dọc bờ sông.`); EV.emit('toast', 'Mở khóa: Câu cá bên sông!'); }
    }
    for (const [need, name] of UNLOCKS()) {
      if (pop >= need && !S.pop.unlocked[name]) {
        S.pop.unlocked[name] = true;
        if (S.day > 1 && name !== 'Câu cá bên sông') { SIM.log(`Mở khóa: ${name}.`, 'ev'); EV.emit('toast', `Mở khóa: ${name}`); }
      }
    }
  }
  function festival() {
    const F = CFG.FESTIVAL;
    if (S.villagers.length < F.unlock || S.day - (S.pop.lastFestival || 0) < F.everyDays || SIM.foodDays() < 4) return;
    S.pop.lastFestival = S.day;
    const cost = S.villagers.length;
    S.res.food = Math.max(0, S.res.food - cost);
    S.villagers.forEach(v => v.morale = Math.min(100, v.morale + F.morale));
    const ad = adults(), ms = ad.filter(v => v.sex === 'm'), fs = ad.filter(v => v.sex === 'f');
    for (let k = 0; k < ad.length; k++) {
      const a = pick(ad), b = ms.length && fs.length && k % 2 ? (a.sex === 'm' ? pick(fs) : pick(ms)) : pick(ad);
      if (a !== b) a.bonds[b.id] = b.bonds[a.id] = Math.min(100, (a.bonds[b.id] || 0) + F.bond);
    }
    SIM.event(`Lễ hội lửa trại mừng làng lớn mạnh! Cả bộ lạc ca hát nhảy múa (−${cost} thức ăn, tinh thần tăng mạnh).`);
    EV.emit('toast', 'Đêm qua có lễ hội lửa trại — cả làng phấn khởi!');
  }

  // ---------------- TIỆN ÍCH CHO SIM / UI ----------------
  function workMult(v, skill) {
    let m = 1;
    if (v.pregnant > 0) m *= CFG.FAMILY.pregnantWork;
    if (skill === 'build' && count('workshop')) m *= CFG.WORKSHOP.buildBonus;
    return m;
  }
  function chatPair(a, b) {
    if (rand() < 0.5) {
      const ad = adults().filter(v => !v.partner), ms = ad.filter(v => v.sex === 'm'), fs = ad.filter(v => v.sex === 'f');
      if (ms.length && fs.length) return [pick(ms), pick(fs)];
    }
    return [a, b];
  }
  function familyText(v, close) {
    const parts = [v.sex === 'f' ? '♀' : '♂'];
    const mate = v.partner ? SIM.vById(v.partner) : null;
    if (mate) parts.push(`bạn đời: ${mate.name}`);
    if (v.pregnant > 0) parts.push(`mang thai · còn ${v.pregnant} ngày`);
    if (v.parents) { const ps = v.parents.map(id => SIM.vById(id)).filter(Boolean).map(x => x.name); if (ps.length) parts.push(`con của ${[...new Set(ps)].join(' & ')}`); }
    const others = close.filter(n => !mate || n !== mate.name);
    if (others.length) parts.push(`♥ ${others.slice(0, 3).join(', ')}${others.length > 3 ? ` +${others.length - 3}` : ''}`);
    return parts.join(' · ');
  }
  function objActions(o) {
    if (o.type === 'fishspot') {
      const g = CFG.GATHER.fish;
      return { title: 'Bến cá', desc: o.stock > 0 ? `Còn khoảng ${o.stock} con cá · mỗi đêm hồi ${g.regen}` : 'Cá tạm hết, mai quay lại', actions: [{ spec: { type: 'gather', target: o.id }, label: 'Câu cá', detail: `Mỗi chuyến ≈ ${g.hours} giờ: +${g.perTrip} thức ăn · dùng kỹ năng Hái lượm` }] };
    }
    if (o.type === 'healer') return { title: bname(o.type), desc: bdesc(o.type), actions: [] };
    if (o.type === 'workshop') return { title: bname(o.type), desc: bdesc(o.type), actions: window.DEF ? [DEF.craftAction()] : [] };
    if (o.type === 'watchtower') return { title: bname(o.type), desc: bdesc(o.type), actions: [{ spec: { type: 'guard' }, label: 'Canh gác ở chòi', detail: 'Người được chọn thành người canh gác, đứng gác ở chòi và tự lao ra đánh thú dữ.' }] };
    if (o.type === 'storage') {
      const maxL = CFG.STORAGE_CAP.length - 1, u = upgradeCost();
      const out = { title: `Kho chung (cấp ${o.level + 1}/${maxL + 1})`, desc: `Sức chứa ${SIM.cap('wood')} gỗ/đá, ${SIM.cap('food')} thức ăn · đang có: thức ăn ${S.res.food}, gỗ ${S.res.wood}, đá ${S.res.stone}, hạt ${S.res.seeds}. Làng tự nâng cấp khi kho gần đầy.`, actions: [] };
      if (o.level < maxL) out.actions.push({ spec: { type: 'upgrade' }, label: o.upgrading ? 'Tiếp tục nâng cấp' : `Nâng cấp lên cấp ${o.level + 2}`, detail: o.upgrading ? `Tiến độ ${Math.round(o.upgrading.progress / o.upgrading.need * 100)}%` : `Chi phí: ${u.wood} gỗ, ${u.stone} đá · ${u.hours} giờ công · sức chứa → ${CFG.STORAGE_CAP[o.level + 1]}` });
      return out;
    }
    return null;
  }

  function autoSkip(j) {
    if (!S.autoSkipNight) return false;
    setTimeout(() => {
      if (!S.dayEndPending) return;
      SIM.startNewDay(); GAME.save();
      if (j.newlyReached) UI.toast(`Bộ lạc đã hoàn thành mục tiêu vào ngày ${j.day}! Làng tiếp tục phát triển.`, 'ok');
      else if (j.failed) UI.toast(`Hết ngày ${j.day} nhưng chưa đạt đủ mục tiêu — làng vẫn tiếp tục.`, 'err');
      UI.toast(`Hết ngày ${j.day}: +${j.foodIn} thức ăn${j.missing.length ? ` · thiếu ăn: ${j.missing.join(', ')}` : ''}${j.built.length ? ` · xong: ${j.built.join(', ')}` : ''}. Sáng ngày ${S.day} — ${S.weather === 'rain' ? 'trời mưa' : 'trời nắng'}.`);
    }, 30);
    return true;
  }

  // ---------------- GIAO DIỆN ----------------
  const ic = (k) => ART.icon(k);
  function buildPanelHTML() {
    const st = WORLD.storage(), u = upgradeCost(), maxL = CFG.STORAGE_CAP.length - 1;
    const rows = Object.keys(B).map(k => {
      const b = B[k];
      let msg = '';
      if (!unlocked(k)) msg = `Mở khóa khi dân số đạt ${b.unlock} (hiện ${S.villagers.length})`;
      else if (b.max && count(k) >= b.max) msg = `Đã đủ ${b.max}`;
      else if (S.res.wood < b.wood) msg = `Cần thêm ${b.wood - S.res.wood} gỗ`;
      else if (S.res.stone < b.stone) msg = `Cần thêm ${b.stone - S.res.stone} đá`;
      return `<div class="act"><div class="act-main"><b>${k === 'hut' ? ic('hut') : ''} ${b.name} <small style="display:inline;opacity:.7">(có ${count(k)})</small></b><small>Chi phí: ${b.wood} gỗ, ${b.stone} đá · ${b.hours} giờ công · ${b.w}×${b.h} ô. ${bdesc(k)}</small>${msg ? `<div class="act-msg err">${msg}</div>` : ''}</div>
        <button class="btn go" data-act="place-${k}" ${msg ? 'disabled' : ''}>Chọn vị trí</button></div>`;
    }).join('');
    const upMsg = st.level >= maxL ? 'Kho đã ở cấp cao nhất' : st.upgrading ? 'Đang nâng cấp' : S.res.wood < u.wood ? `Cần thêm ${u.wood - S.res.wood} gỗ` : S.res.stone < u.stone ? `Cần thêm ${u.stone - S.res.stone} đá` : '';
    return `<div class="sheet-head"><h3>${ic('hut')} Xây dựng & mở mang</h3><button class="x" data-close>✕</button></div>
      <div class="sheet-sub">Vật liệu trừ một lần khi xác nhận. Chỗ ngủ: <b>${beds()}</b> cho <b>${S.villagers.length}</b> người. ${S.auto ? 'Khi bật Tự động, làng cũng tự quyết định xây.' : ''}</div>
      ${rows}
      <div class="act"><div class="act-main"><b>Nâng cấp kho (cấp ${st.level + 1}/${maxL + 1})</b><small>${st.level >= maxL ? 'Đã đạt cấp tối đa.' : `Chi phí: ${u.wood} gỗ, ${u.stone} đá · ${u.hours} giờ công · sức chứa ${CFG.STORAGE_CAP[st.level]} → ${CFG.STORAGE_CAP[st.level + 1]} mỗi loại.`} Thức ăn hiện chứa tối đa ${SIM.cap('food')}. Làng tự nâng cấp khi kho gần đầy.</small>${upMsg ? `<div class="act-msg ${st.upgrading ? '' : 'err'}">${upMsg}</div>` : ''}</div>
        <button class="btn go" data-act="upgrade" ${st.level >= maxL ? 'disabled' : ''}>Chọn kho</button></div>
      <div class="act"><div class="act-main"><b>${ic('field')} Mở ruộng mới</b><small>Không tốn vật liệu. Chạm vào bãi cỏ trống gần trại để chọn chỗ, hoặc để làng tự chọn. Hiện có ${count('plot')} ruộng.</small></div>
        <button class="btn go" data-act="ex-plot">Tự chọn chỗ</button></div>`;
  }

  const PRIOS = [['balanced', 'Cân bằng'], ['food', 'Thức ăn'], ['build', 'Xây dựng'], ['expand', 'Mở rộng']];
  function autoPanelHTML() {
    return `<div class="sheet-head"><h3>⚙ Tự động & phát triển</h3><button class="x" data-close>✕</button></div>
      <div class="act"><div class="act-main"><b>Dân làng tự làm việc</b><small>Ai rảnh tự chọn việc hợp nghề theo nhu cầu của làng, tự xây lều, mở ruộng. Việc bạn giao tay luôn được ưu tiên.</small></div>
        <button class="btn ${S.auto ? 'go' : ''}" data-act="ex-auto">${S.auto ? 'Đang bật' : 'Đang tắt'}</button></div>
      <div class="chips-label">Ưu tiên của làng:</div>
      <div class="chips">${PRIOS.map(([k, n]) => `<button class="chip ${S.priority === k ? 'on' : ''}" data-act="ex-prio-${k}"><span>${n}</span></button>`).join('')}</div>
      <div class="act"><div class="act-main"><b>Tự sang ngày mới</b><small>Hết ngày tự sang sáng hôm sau, chỉ hiện tóm tắt ngắn. Tắt đi nếu muốn đọc nhật ký cuối ngày mỗi tối (vẫn xem lại được trong nút Nhật ký).</small></div>
        <button class="btn ${S.autoSkipNight ? 'go' : ''}" data-act="ex-skip">${S.autoSkipNight ? 'Đang bật' : 'Đang tắt'}</button></div>
      <div class="jsec"><h4>Kế hoạch của làng</h4><div id="ex-plan" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Dân số & gia đình</h4><div id="ex-pop" class="sheet-sub"></div></div>
      ${window.DEF ? DEF.panelHTML() : ''}
      <div class="jsec"><h4>Mở khóa theo dân số</h4><div id="ex-unlock" class="sheet-sub"></div></div>`;
  }
  function updateAutoPanel(p) {
    const plan = p.querySelector('#ex-plan'), popEl = p.querySelector('#ex-pop');
    if (!plan || !popEl) return;
    const tally = {};
    for (const v of S.villagers) {
      if (v.child) continue;
      const t = v.resting ? 'nghỉ' : v.job ? SIM.jobText(v).split(' ·')[0].split(' (')[0].toLowerCase() : 'rảnh';
      tally[t] = (tally[t] || 0) + 1;
    }
    const busy = Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(', ');
    const htmlPlan = `${S.auto ? '' : '<b>Tự động đang tắt.</b> '}${S.planNote ? esc(S.planNote) + '<br>' : ''}Đang làm: ${busy || '—'}<br>Ruộng: ${count('plot')} · Cây con đang mọc: ${count('sapling')} · Đá tảng: ${count('boulder')}`;
    if (plan._last !== htmlPlan) { plan.innerHTML = htmlPlan; plan._last = htmlPlan; }
    const P = CFG.POP, pop = S.villagers.length, free = beds() - pop, fd = SIM.foodDays(), mo = avgMorale();
    const kids = S.villagers.filter(v => v.child).length;
    const row = (ok, t) => `<div class="${ok ? '' : 'warn'}">${ok ? '✓' : '○'} ${t}</div>`;
    const couples = S.villagers.filter(v => v.partner && v.sex === 'f').map(f => { const m = SIM.vById(f.partner); return `${m ? m.name : '?'} & ${f.name}${f.pregnant > 0 ? ` (mang thai, còn ${f.pregnant} ngày)` : ''}`; });
    const ms = adults().filter(v => v.sex === 'm').length, fs = adults().filter(v => v.sex === 'f').length;
    const htmlPop = `Dân số <b>${pop}</b> (nam ${ms}, nữ ${fs}, trẻ con ${kids}) · ${S.pop.arrivals} người mới tới, ${S.pop.births} em bé đã chào đời.<br>Mỗi đêm có thể có người mới tới, hoặc vợ chồng có tin vui, khi:
      ${row(free >= 1, `Còn chỗ ngủ trống: ${Math.max(0, free)} (cần ≥ 1)`)}
      ${row(fd >= P.minFoodDays, `Thức ăn đủ ${Math.floor(fd * 10) / 10} ngày (cần ≥ ${P.minFoodDays})`)}
      ${row(mo >= P.minMorale, `Tinh thần trung bình ${Math.round(mo)} (cần ≥ ${P.minMorale})`)}
      ${row(couples.length > 0, `Vợ chồng: ${couples.length ? couples.join(', ') : `chưa có (nam và nữ gắn kết từ ${CFG.FAMILY.coupleBond} sẽ nên duyên)`}`)}
      ${row(!couples.length || count('hut') >= couples.length, `Lều riêng cho vợ chồng: ${count('hut')}/${couples.length} — vợ chồng phải cùng vào một lều riêng ban đêm mới có thể có con`)}`;
    if (popEl._last !== htmlPop) { popEl.innerHTML = htmlPop; popEl._last = htmlPop; }
    if (window.DEF) DEF.updatePanel(p);
    const un = p.querySelector('#ex-unlock');
    if (un) {
      const htmlUn = UNLOCKS().map(([need, name]) => row(pop >= need, `${need} người: ${name}`)).join('');
      if (un._last !== htmlUn) { un.innerHTML = htmlUn; un._last = htmlUn; }
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function onPanelAct(a) {
    if (a === 'ex-auto') { S.auto = !S.auto; UI.toast(S.auto ? 'Dân làng sẽ tự làm việc' : 'Đã tắt tự động — hãy tự giao việc', 'ok'); }
    else if (a === 'ex-skip') S.autoSkipNight = !S.autoSkipNight;
    else if (a.startsWith('ex-prio-')) { S.priority = a.slice(8); UI.toast(`Ưu tiên: ${PRIOS.find(p => p[0] === S.priority)[1]}`, 'ok'); }
    else if (a === 'ex-plot') {
      const sp = findPlotSpot();
      if (sp) { createPlot(sp[0], sp[1]); RENDER.centerOn((sp[0] + 1) * T, (sp[1] + 1) * T); UI.toast('Đã mở ruộng mới', 'ok'); }
      else UI.toast('Không còn bãi cỏ trống gần trại', 'err');
    }
    GAME.save();
  }

  return {
    migrate, generate, spriteFor, drawObj, drawChild, foodCapBonus, meatMult, buildRadius, bname, bdesc, beds, popText,
    handles, check, assign, ghostFor, placeActions, tileActions, plotSpotAt, buildPanelHTML, autoPanelHTML, updateAutoPanel, onPanelAct,
    tick, overnight, autoSkip, findSpot, findPlotSpot, createPlot,
    upgradeCost, workMult, chatPair, familyText, objActions, drawFishCarry,
  };
})();
window.EXP = EXP;
