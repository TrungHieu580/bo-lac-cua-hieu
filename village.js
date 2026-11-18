// =====================================================================
//  VIL — Nhà bếp, Chuồng thú (chăn nuôi), công trình đồ sộ
// =====================================================================
'use strict';
const VIL = (() => {
  const T = CFG.TILE, KC = CFG.KITCHEN, PN = CFG.PEN, GR = CFG.GRAND, B = CFG.BUILDINGS;
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cnt = (t) => S.objects.filter(o => o.type === t).length;
  const pens = () => S.objects.filter(o => o.type === 'pen');
  const kitchen = () => S.objects.find(o => o.type === 'kitchen');
  const isJob = (v, t) => v.job && v.job.type === t;

  function migrate(s) {
    if (!s.vil) s.vil = { cookToday: 0, herdToday: 0, mealsCooked: 0, animalsTotal: 0, born: 0 };
    for (const o of s.objects) if (o.type === 'pen' && o.animals === undefined) o.animals = 0;
  }
  function ensure() {
    if (!S.vil) migrate(S);
    for (const o of pens()) if (o.animals === undefined || o.fresh === undefined) {
      o.animals = o.animals || PN.start; o.fresh = 1;
      S.vil.animalsTotal += PN.start;
      SIM.event(`Thợ săn bắt sống ${PN.start} con dê rừng đưa về Chuồng thú mới. Từ nay bộ lạc có thể chăn nuôi!`);
    }
  }
  const animals = () => pens().reduce((s, o) => s + (o.animals || 0), 0);

  // ---------------- VIỆC: NẤU ĂN, CHĂN THẢ ----------------
  function ring(o) { return WORLD.ringTiles(o).filter(([x, y]) => WORLD.inMain(x, y)); }
  function planJob(v, j) {
    if (j.type === 'cook') {
      const k = kitchen();
      if (!k || S.vil.cookToday >= KC.maxHours) { v.job = null; v.note = 'Bữa tối đã nấu xong'; return true; }
      const next = { kind: 'cook', target: k.id, time: 1 };
      const r = ring(k);
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới bếp'; }
      return true;
    }
    if (j.type === 'herd') {
      const p = WORLD.byId(j.target) || pens()[0];
      if (!p || !(p.animals > 0)) { v.job = null; v.note = 'Chuồng không còn con nào'; return true; }
      if (S.vil.herdToday >= PN.herdHours * pens().length + 0.5) { v.job = null; v.note = 'Đã chăn thả xong hôm nay'; return true; }
      const inside = [];
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) if (WORLD.walkable(x, y)) inside.push([x, y]);
      const next = { kind: 'herd', target: p.id, time: 0.6 + rand() * 0.4 };
      const goal = inside.length ? [inside[Math.floor(rand() * inside.length)]] : ring(p);
      if (!SIM.goTo(v, goal, next)) v.task = next;
      return true;
    }
    return false;
  }
  function task(v, t, dt) {
    const E = CFG.ENERGY;
    if (t.kind === 'cook' || t.kind === 'herd') {
      const o = WORLD.byId(t.target);
      if (!o) { v.task = null; return true; }
      const cx = (o.x + o.w / 2) * T; if (t.kind === 'cook' && Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1;
      if (t.kind === 'cook') S.vil.cookToday += dt; else S.vil.herdToday += dt;
      v.energy = clamp(v.energy - E.workDrain * 0.5 * dt, 0, 100);
      t.time -= dt;
      if (t.time <= 0) v.task = null;
      return true;
    }
    return false;
  }
  function handles(type) { return type === 'cook' || type === 'herd'; }
  function check(spec, vs) {
    if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
    if (spec.type === 'cook' && !kitchen()) return { ok: false, msg: 'Chưa có Nhà bếp' };
    if (spec.type === 'herd') { const p = WORLD.byId(spec.target); if (!p || !(p.animals > 0)) return { ok: false, msg: 'Chuồng chưa có con nào' }; }
    return { ok: true };
  }
  function assign(spec, vs) {
    const c = check(spec, vs); if (!c.ok) return c;
    for (const v of vs) { v.job = spec.type === 'cook' ? { type: 'cook' } : { type: 'herd', target: spec.target }; v.task = null; v.resting = false; }
    return { ok: true };
  }
  // tự cử 1 người nấu ăn (buổi chiều) và người chăn thả (buổi sáng)
  function autoJobs() {
    if (!S.vil) migrate(S);
    ensure();
    const free = (v) => !v.child && !v.job && !v.resting && !v.pregnant && !(window.TRB && TRB.isRole(v));
    const pick = (sk) => S.villagers.filter(free).sort((a, b) => (b.skills[sk] || 1) - (a.skills[sk] || 1))[0];
    if (kitchen() && S.hour >= 12.5 && S.vil.cookToday < KC.needHours && !S.villagers.some(v => isJob(v, 'cook'))) {
      const v = pick('gather'); if (v) { v.job = { type: 'cook', auto: true, until: 99 }; v.task = null; }
    }
    const ps = pens().filter(p => p.animals > 0);
    if (ps.length && S.hour < 12 && S.vil.herdToday < PN.herdHours * ps.length && S.villagers.filter(v => isJob(v, 'herd')).length < Math.min(2, ps.length)) {
      const v = pick('hunt'); if (v) { const p = ps[S.villagers.filter(x => isJob(x, 'herd')).length % ps.length]; v.job = { type: 'herd', target: p.id, auto: true, until: 99 }; v.task = null; }
    }
  }

  // ---------------- BỮA TỐI NẤU CHÍN ----------------
  function afterMeal() {
    if (!S.vil || !kitchen() || S.vil.cookToday < KC.needHours || !S.today.eaten) return;
    const save = Math.floor(S.today.eaten * KC.save);
    S.res.food = Math.min(SIM.cap('food'), S.res.food + save);
    S.today.eaten -= save;
    S.villagers.forEach(v => { if (v.fedToday) { v.health = clamp(v.health + KC.health, 0, 100); v.morale = clamp(v.morale + KC.morale, 0, 100); } });
    S.vil.mealsCooked++;
    SIM.log(`Nhà bếp nấu chín bữa tối: cả làng ăn ngon, no lâu hơn (tiết kiệm ${save} thức ăn, sức khỏe và tinh thần tăng).`);
  }

  // ---------------- CHĂN NUÔI ----------------
  function huntCapture() {
    const p = pens().find(o => o.animals < PN.cap);
    if (!p || rand() >= PN.capture) return;
    p.animals++; S.vil.animalsTotal++;
    SIM.event('Nhóm săn bắt sống được một con dê rừng, đưa về Chuồng thú.');
  }
  function penTarget(b) {
    const ps = pens().filter(p => p.animals > 0);
    if (!ps.length) return null;
    const p = ps.reduce((a, c) => Math.hypot((a.x + 1.5) * T - b.x, (a.y + 1.5) * T - b.y) < Math.hypot((c.x + 1.5) * T - b.x, (c.y + 1.5) * T - b.y) ? a : c);
    return { pen: p, x: (p.x + 1.5) * T, y: (p.y + 1.5) * T, goals: WORLD.ringTiles(p) };
  }
  function penAttacked(p, name) {
    if (!(p.animals > 0)) return false;
    p.animals--;
    SIM.event(`${name} vồ mất một con dê trong Chuồng thú! Cần người canh gác bảo vệ chuồng.`);
    EV.emit('toast', `⚠ ${name} vồ mất một con dê trong chuồng!`);
    return true;
  }

  // ---------------- QUA ĐÊM ----------------
  function overnight() {
    if (!S.vil) migrate(S);
    ensure();
    const herded = S.vil.herdToday >= PN.herdHours * Math.max(1, pens().filter(p => p.animals > 0).length) * 0.8;
    let milk = 0;
    for (const p of pens()) {
      if (!(p.animals > 0)) continue;
      if (herded) {
        milk += Math.floor(p.animals / PN.milkPer);
        if (p.animals >= 2 && p.animals < PN.cap && rand() < PN.breed) { p.animals++; S.vil.born++; S.vil.animalsTotal++; SIM.log('Một chú dê con vừa ra đời trong Chuồng thú.', 'ev'); }
        if (p.animals >= PN.cap && S.res.food < SIM.cap('food') - PN.meat) { p.animals--; S.res.food = Math.min(SIM.cap('food'), S.res.food + PN.meat); SIM.log(`Chuồng đã đầy, làng mổ một con dê béo (+${PN.meat} thịt).`); }
      } else if (rand() < PN.escape) { p.animals--; SIM.log('Không ai chăn thả, một con dê sổng chuồng chạy vào rừng.'); }
    }
    if (milk) { S.res.food = Math.min(SIM.cap('food'), S.res.food + milk); SIM.log(`Đàn dê cho ${milk} phần sữa.`); }
    // công trình đồ sộ
    if (cnt('temple')) {
      S.villagers.forEach(v => v.morale = clamp(v.morale + GR.templeMorale, 0, 100));
      if (window.EXP && S.villagers.length < EXP.popLimit() && EXP.beds() > S.villagers.length && rand() < GR.templeNewcomer) { EXP.newcomer(); SIM.log('Tiếng thơm của Đền tổ tiên thu hút người từ xa tìm đến.', 'ev'); }
    }
    if (cnt('stonering')) {
      S.villagers.forEach(v => v.morale = clamp(v.morale + GR.ringMorale, 0, 100));
      for (const o of S.objects) if (o.type === 'plot' && (o.state === 'sown' || o.state === 'growing') && rand() < GR.ringGrow) {
        o.growth += 1; o.state = o.growth >= CFG.FARM.growDays ? 'ready' : 'growing'; EV.emit('plot', o);
      }
    }
    S.vil.cookToday = 0; S.vil.herdToday = 0;
  }
  function workMult() { return cnt('greathall') ? 1 + GR.hallWork : 1; }

  // ---------------- GIAO DIỆN ----------------
  function jobText(v) {
    const t = v.task;
    if (isJob(v, 'cook')) return t && t.kind === 'cook' ? 'Nấu ăn ở Nhà bếp' : 'Đi tới Nhà bếp';
    if (isJob(v, 'herd')) return t && t.kind === 'herd' ? 'Chăn thả đàn dê' : 'Đi tới Chuồng thú';
    return null;
  }
  const DESC = {
    kitchen: `Một người nấu ăn mỗi chiều; nấu đủ ${KC.needHours} giờ thì bữa tối tiết kiệm ${Math.round(KC.save * 100)}% thức ăn, mỗi người +${KC.health} sức khỏe, +${KC.morale} tinh thần.`,
    pen: `Bắt đầu với ${PN.start} con dê, chứa tối đa ${PN.cap}. Có người chăn thả mỗi sáng thì dê cho sữa, sinh con; chuồng đầy thì mổ lấy thịt. Đi săn có thể bắt sống thêm dê.`,
    temple: `Công trình đồ sộ (bộ lạc cấp ${B.temple.tribe}). Mỗi đêm tinh thần +${GR.templeMorale}, tiếng thơm thu hút người mới tới.`,
    stonering: `Công trình đồ sộ (bộ lạc cấp ${B.stonering.tribe}). Mỗi đêm tinh thần +${GR.ringMorale}, ruộng đang trồng có ${Math.round(GR.ringGrow * 100)}% lớn thêm một bậc.`,
    greathall: `Công trình đồ sộ (bộ lạc cấp ${B.greathall.tribe}). Chỗ ngủ cho ${B.greathall.beds} người, cả làng làm việc nhanh hơn ${Math.round(GR.hallWork * 100)}%.`,
  };
  function objActions(o) {
    if (o.type === 'kitchen') return { title: 'Nhà bếp', desc: `${DESC.kitchen} Hôm nay đã nấu ${Math.round(S.vil.cookToday * 10) / 10}/${KC.needHours} giờ.`, actions: [{ spec: { type: 'cook' }, label: 'Nấu ăn', detail: `Người được chọn nấu ăn ở bếp tới khi đủ ${KC.maxHours} giờ trong ngày` }] };
    if (o.type === 'pen') return { title: `Chuồng thú — ${o.animals || 0}/${PN.cap} con dê`, desc: `${DESC.pen} Hôm nay đã chăn thả ${Math.round(S.vil.herdToday * 10) / 10} giờ.`, actions: [{ spec: { type: 'herd', target: o.id }, label: 'Chăn thả', detail: 'Dắt dê đi ăn, dọn chuồng — cần ít nhất 1 giờ mỗi ngày' }] };
    if (B[o.type] && B[o.type].grand) return { title: B[o.type].name, desc: DESC[o.type], actions: [] };
    return null;
  }
  function panelHTML() { return `<div class="jsec"><h4>Bếp, chăn nuôi & công trình đồ sộ</h4><div id="vil-panel" class="sheet-sub"></div></div>`; }
  function updatePanel(p) {
    const el = p.querySelector('#vil-panel'); if (!el) return;
    const row = (ok, t) => `<div class="${ok ? '' : 'warn'}">${ok ? '✓' : '○'} ${t}</div>`;
    const L = window.TRB ? TRB.level() : 1;
    const g = (k) => { const b = B[k], site = S.objects.find(o => o.type === 'site' && o.kind === k); return row(cnt(k) > 0, `${b.name}: ${cnt(k) ? 'đã xây' : site ? `đang xây ${Math.round(site.progress / site.need * 100)}%` : L < b.tribe ? `mở khóa ở bộ lạc cấp ${b.tribe}` : `${b.wood} gỗ, ${b.stone} đá, ${b.hours} giờ công`}`); };
    const html = `${row(!!kitchen(), `Nhà bếp: ${kitchen() ? `hôm nay nấu ${Math.round(S.vil.cookToday * 10) / 10}/${KC.needHours} giờ · đã nấu ${S.vil.mealsCooked} bữa` : 'chưa có'}`)}
      ${row(pens().length > 0, `Chuồng thú: ${pens().length} chuồng · ${animals()} con dê · hôm nay chăn thả ${Math.round(S.vil.herdToday * 10) / 10} giờ · đã sinh ${S.vil.born} dê con`)}
      ${g('temple')}${g('stonering')}${g('greathall')}`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }

  // ---------------- HÌNH VẼ ----------------
  const SPR = {};
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  try {
    const { mk, rect, px, ell } = ART;
    const roof = (x, x0, x1, y0, h, c1, c2, c3) => { for (let y = 0; y < h; y++) { const off = Math.round((h - y) * ((x1 - x0) / 2) / (h + 4)); for (let i = x0 + off; i < x1 - off; i++) px(x, i, y0 + y, (y % 3 === 0) ? c1 : (i > (x0 + x1) / 2 + (x1 - x0) / 4 ? c3 : c2)); } };
    { // Nhà bếp 48×54
      const [c, x] = mk(48, 54);
      rect(x, 3, 40, 42, 14, '#8d8478'); for (let i = 3; i < 45; i += 6) rect(x, i, 40, 1, 14, '#6d665c'); rect(x, 3, 40, 42, 1, '#b0a898');
      ell(x, 34, 38, 10, 9, '#a0522d'); ell(x, 34, 36, 8, 6, '#b8653a'); rect(x, 30, 40, 8, 6, '#2a1208'); rect(x, 31, 42, 6, 3, '#e08a3a'); px(x, 33, 43, '#ffd23a');
      rect(x, 31, 18, 6, 16, '#8d5a3a'); rect(x, 31, 18, 6, 1, '#b07a52'); rect(x, 30, 16, 8, 3, '#6d4a32');
      roof(x, 0, 30, 14, 20, '#b8a04a', '#a08a36', '#8a7428');
      for (const cx of [3, 25]) rect(x, cx, 32, 2, 12, '#6b4224');
      rect(x, 10, 34, 12, 1, '#5a3a1c'); rect(x, 15, 34, 1, 4, '#3a2a1a'); ell(x, 15, 40, 4, 3, '#3a3a40'); ell(x, 15, 39, 3, 1, '#c8a060');
      SPR.kitchen = c;
    }
    { // Dê 9×7, 2 khung hình
      SPR.goat = [0, 1].map(f => {
        const [c, x] = mk(10, 8);
        rect(x, 1, 2, 6, 3, '#e8e2d4'); rect(x, 1, 4, 6, 1, '#c8c0b0'); rect(x, 6, 0, 3, 3, '#e8e2d4'); px(x, 8, 1, '#2a1a10'); px(x, 6, 0, '#8a7a5a'); px(x, 7, 0, '#8a7a5a');
        px(x, 0, 2, '#c8c0b0');
        const legs = f ? [1, 3, 5, 6] : [2, 3, 5, 7];
        legs.forEach((l, i) => rect(x, l, 5, 1, (i + f) % 2 ? 2 : 3, '#8a7a6a'));
        const fl = mk(10, 8); fl[1].translate(10, 0); fl[1].scale(-1, 1); fl[1].drawImage(c, 0, 0);
        return [fl[0], c];
      });
    }
    { // Chuồng thú (xem trước) 72×80
      const [c, x] = mk(72, 80);
      x.fillStyle = 'rgba(120,90,50,0.45)'; x.fillRect(2, 12, 68, 66);
      for (const yy of [10, 76]) { rect(x, 0, yy, 72, 1, '#875632'); rect(x, 0, yy + 4, 72, 1, '#6b4224'); for (let i = 0; i <= 72; i += 12) rect(x, Math.min(i, 70), yy - 4, 2, 9, '#6b4224'); }
      rect(x, 0, 6, 2, 74, '#6b4224'); rect(x, 70, 6, 2, 74, '#6b4224');
      SPR.pen = c;
    }
    { // Đền tổ tiên 96×86
      const [c, x] = mk(96, 86);
      rect(x, 2, 70, 92, 16, '#8d8478'); rect(x, 2, 70, 92, 2, '#b0a898'); rect(x, 8, 62, 80, 9, '#9a9184'); rect(x, 8, 62, 80, 2, '#bab2a4');
      rect(x, 40, 62, 16, 24, '#a49b8e'); for (let i = 0; i < 6; i++) rect(x, 40, 64 + i * 4, 16, 1, '#7a7268');
      for (const cx of [14, 28, 64, 78]) { rect(x, cx, 34, 4, 28, '#7a4a24'); rect(x, cx, 34, 1, 28, '#9a6234'); rect(x, cx, 44, 4, 2, '#c8303a'); }
      rect(x, 32, 38, 32, 24, '#5a3a20'); rect(x, 42, 44, 12, 18, '#2a160a'); rect(x, 46, 38, 4, 4, '#f2c94c');
      for (let y = 0; y < 30; y++) { const off = Math.round((30 - y) * 1.35); for (let i = off - 4; i < 100 - off; i++) if (i >= 0 && i < 96) px(x, i, y + 6, (y % 4 === 0) ? '#6b5a2a' : (i > 60 ? '#3e5a26' : '#4f7030')); }
      for (let i = 0; i < 96; i += 2) px(x, i, 36, '#2e4a1c');
      rect(x, 38, 2, 20, 4, '#7a4a24'); px(x, 36, 0, '#7a4a24'); px(x, 37, 1, '#7a4a24'); px(x, 59, 0, '#7a4a24'); px(x, 58, 1, '#7a4a24');
      ell(x, 48, 20, 5, 4, '#ece6d6'); px(x, 46, 19, '#2a1a0e'); px(x, 50, 19, '#2a1a0e');
      for (const bx of [4, 86]) { rect(x, bx, 56, 6, 8, '#6d665c'); ell(x, bx + 3, 54, 3, 2, '#e05a1a'); px(x, bx + 3, 51, '#ffd23a'); }
      SPR.temple = c;
    }
    { // Đại sảnh 120×84
      const [c, x] = mk(120, 84);
      rect(x, 4, 46, 112, 34, '#7a5232'); for (let y = 46; y < 80; y += 4) rect(x, 4, y, 112, 1, '#5e3e24');
      rect(x, 4, 78, 112, 6, '#8d8478');
      rect(x, 50, 54, 20, 26, '#2a160a'); rect(x, 48, 52, 24, 3, '#c8a050');
      for (const wx of [18, 34, 80, 96]) { rect(x, wx, 58, 6, 6, '#2a160a'); rect(x, wx, 58, 6, 1, '#f2c94c'); }
      for (let y = 0; y < 44; y++) { const off = Math.round((44 - y) * 1.25); for (let i = off; i < 120 - off; i++) px(x, i, y + 4, (y % 4 === 0) ? '#b8a04a' : (i > 80 ? '#8a7428' : '#a08a36')); }
      for (let i = 0; i < 120; i += 2) px(x, i, 47, '#6a5418');
      for (const [hx, d] of [[52, -1], [66, 1]]) for (let k = 0; k < 6; k++) px(x, hx + d * k, 4 - Math.floor(k / 2), '#7a4a24');
      for (const fx of [2, 112]) { rect(x, fx, 30, 2, 50, '#5a3a1c'); rect(x, fx + 2, 30, 8, 10, '#c8303a'); rect(x, fx + 2, 36, 8, 2, '#f2c94c'); }
      SPR.greathall = c;
    }
    { // Vòng đá thiêng — ảnh đầy đủ 96×100 (dùng khi đang xây / xem trước)
      const [c, x] = mk(96, 100);
      ell(x, 48, 62, 40, 26, '#7a8a5a'); ell(x, 48, 62, 12, 7, '#8d8478'); rect(x, 40, 54, 16, 8, '#a49b8e'); rect(x, 40, 54, 16, 1, '#c8c0b0');
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, sx = Math.round(48 + Math.cos(a) * 38), sy = Math.round(62 + Math.sin(a) * 24); rect(x, sx - 3, sy - 22, 7, 22, '#8d9198'); rect(x, sx - 3, sy - 22, 2, 22, '#b4b8bc'); }
      SPR.stonering = c;
    }
  } catch (e) { console.error(e); }

  // pen, vòng đá: vẽ tách lớp để dân làng đi bên trong không bị che
  function pushDraw(list, lx, L, Tp, time, shadow) {
    for (const o of S.objects) {
      if (o.type === 'pen') {
        const X = L(o.x * T), Y = Tp(o.y * T), W = o.w * T, H = o.h * T;
        list.push([o.y * T, () => { // nền chuồng + rào sau
          lx.fillStyle = 'rgba(120,90,50,0.35)'; lx.fillRect(X + 2, Y + 4, W - 4, H - 6);
          for (let i = 0; i < 10; i++) R(lx, X + 6 + ((i * 17) % (W - 12)), Y + 8 + ((i * 29) % (H - 14)), 2, 1, '#c8b060');
          R(lx, X + W - 22, Y + 8, 16, 6, '#6b4224'); R(lx, X + W - 21, Y + 9, 14, 2, '#5a8ab0');
          R(lx, X + 6, Y + 6, 12, 8, '#d8c060'); R(lx, X + 7, Y + 5, 10, 2, '#e8d070');
          fence(lx, X, Y + 2, W, true);
          R(lx, X, Y - 6, 2, H + 6, '#6b4224'); R(lx, X + W - 2, Y - 6, 2, H + 6, '#6b4224');
          for (const yy of [Y + 2, Y + H / 2]) { R(lx, X, yy, 1, 1, '#875632'); R(lx, X + W - 2, yy, 1, 1, '#875632'); }
        }]);
        const n = o.animals || 0;
        for (let i = 0; i < n; i++) {
          const ph = time * 0.35 + i * 2.17 + o.id;
          const ax = (o.x + 0.5) * T + ((i * 37) % (W - 30)) + Math.sin(ph) * 6, ay = (o.y + 0.9) * T + ((i * 23) % (H - 34)) + Math.cos(ph * 0.8) * 4;
          const face = Math.cos(ph) > 0 ? 1 : 0, fr = Math.floor(time * 3 + i) % 2;
          list.push([ay, () => { shadow(lx, L(ax), Tp(ay), 4, 1); lx.drawImage(SPR.goat[fr][face], L(ax) - 5, Tp(ay) - 7); }]);
        }
        list.push([(o.y + o.h) * T, () => fence(lx, X, Y + H - 4, W, false)]);
      }
      if (o.type === 'stonering') {
        const cx = L((o.x + o.w / 2) * T), cy = Tp((o.y + o.h / 2) * T + 6);
        list.push([o.y * T, () => {
          lx.fillStyle = 'rgba(110,130,80,0.45)'; lx.beginPath(); lx.ellipse(cx, cy, 40, 26, 0, 0, Math.PI * 2); lx.fill();
          R(lx, cx - 8, cy - 8, 16, 8, '#a49b8e'); R(lx, cx - 8, cy - 8, 16, 1, '#c8c0b0'); R(lx, cx - 6, cy - 2, 12, 3, '#8d8478');
          if (Math.floor(time * 2) % 2) R(lx, cx - 1, cy - 12, 2, 3, '#ffd23a');
        }]);
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * Math.PI * 2, sx = Math.round(cx + Math.cos(a) * 38), sy = Math.round(cy + Math.sin(a) * 24);
          list.push([(o.y + o.h / 2) * T + 6 + Math.sin(a) * 24, () => {
            shadow(lx, sx, sy, 5, 2); R(lx, sx - 3, sy - 22, 7, 22, '#8d9198'); R(lx, sx - 3, sy - 22, 2, 22, '#b4b8bc'); R(lx, sx + 3, sy - 22, 1, 22, '#6d7178');
            if (k % 2 === 0) { R(lx, sx - 5, sy - 25, 11, 3, '#9a9ea4'); R(lx, sx - 5, sy - 25, 11, 1, '#c0c4c8'); }
          }]);
        }
      }
    }
  }
  function fence(lx, X, Y, W, back) {
    R(lx, X, Y, W, 1, '#875632'); R(lx, X, Y + 4, W, 1, '#6b4224');
    for (let i = 0; i <= W; i += 12) { R(lx, X + Math.min(i, W - 2), Y - 4, 2, 9, '#6b4224'); R(lx, X + Math.min(i, W - 2), Y - 4, 1, 9, '#875632'); }
  }
  function drawObj(o, X, Y, lx, time) {
    if (o.type === 'kitchen') return () => {
      lx.drawImage(SPR.kitchen, X, Y + o.h * T - SPR.kitchen.height + 2);
      if (S.villagers.some(v => v.task && v.task.kind === 'cook')) { // khói bếp
        const t = performance.now() / 1000;
        for (let k = 0; k < 5; k++) { const ph = (t * 0.5 + k * 0.2) % 1; lx.globalAlpha = 0.5 * (1 - ph); lx.fillStyle = '#d8d8d8'; lx.fillRect(X + 33 + Math.round(Math.sin(t * 2 + k) * 3 + ph * 4), Y + o.h * T - SPR.kitchen.height + 14 - Math.round(ph * 18), 3, 3); }
        lx.globalAlpha = 1;
      }
    };
    if (o.type === 'temple' || o.type === 'greathall') { const s = SPR[o.type]; return () => lx.drawImage(s, X + Math.round((o.w * T - s.width) / 2), Y + o.h * T - s.height + 2); }
    if (o.type === 'pen' || o.type === 'stonering') return () => { };
    return null;
  }

  return {
    migrate, ensure, planJob, task, handles, check, assign, autoJobs, afterMeal, huntCapture, penTarget, penAttacked,
    overnight, workMult, jobText, objActions, panelHTML, updatePanel, pushDraw, drawObj, SPR, DESC, animals,
  };
})();
window.VIL = VIL;
