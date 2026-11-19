// =====================================================================
//  LAND — mở rộng đất đai
//  • Bản đồ lớn dần theo cấp bộ lạc (48×36 → 80×60), vùng đất mới có rừng, đồng cỏ, đồi đá, bãi săn
//  • Khai hoang rừng: đốn cây + đào gốc thành bãi cỏ trống vĩnh viễn
//  • Bắc cầu gỗ qua sông
//  • Ranh giới đất làng hiện khi chọn chỗ xây; báo khi đất làng nới rộng
// =====================================================================
'use strict';
const LAND = (() => {
  const T = CFG.TILE;
  const SIZES = [[48, 36], [56, 42], [64, 48], [72, 54], [80, 60]];
  const BR = { wood: 4, stone: 1, hours: 1.5, maxLen: 7 }; // chi phí mỗi ô cầu
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lvl = () => (window.TRB ? TRB.level() : 1);
  const isJob = (v, t) => v.job && v.job.type === t;

  function migrate(s) {
    if (!s.clearAreas) s.clearAreas = [];
  }

  // ---------------- MỞ RỘNG BẢN ĐỒ ----------------
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function noise(x, y, s) {
    const g = 5, x0 = Math.floor(x / g), y0 = Math.floor(y / g), fx = x / g - x0, fy = y / g - y0;
    const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  function targetSize() { return SIZES[clamp(lvl() - 1, 0, SIZES.length - 1)]; }
  function expandTo(tW, tH) {
    const W = WORLD.W, H = WORLD.H;
    tW = Math.max(W, tW); tH = Math.max(H, tH);
    if (tW === W && tH === H) return false;
    const dx = Math.floor((tW - W) / 2), dy = Math.floor((tH - H) / 2);
    const TI = WORLD.TI, TER = WORLD.TER, old = S.terrain;
    S.landSeed = (S.landSeed || 0) + 1;
    const seed = S.landSeed * 101 + W;
    const nt = new Array(tW * tH), fresh = [];
    for (let y = 0; y < tH; y++) for (let x = 0; x < tW; x++) {
      const ox = x - dx, oy = y - dy;
      if (ox >= 0 && oy >= 0 && ox < W && oy < H) { nt[y * tW + x] = old[oy * W + ox]; continue; }
      fresh.push([x, y]);
      const cx = clamp(ox, 0, W - 1), cy = clamp(oy, 0, H - 1);
      let e = TER[old[cy * W + cx]];
      const dist = Math.max(Math.abs(cx - ox), Math.abs(cy - oy));
      let t;
      if (e === 'water' || e === 'sand') t = e; // sông chảy tiếp
      else if (e === 'cliff') t = dist <= 1 || noise(x, y, seed + 3) < 0.6 ? 'cliff' : 'rock';
      else {
        if (e === 'farm' || e === 'dirt') e = 'grass';
        const n = noise(x, y, seed), m = noise(x, y, seed + 11);
        if (e === 'forest') t = n < 0.7 ? 'forest' : (m < 0.5 ? 'meadow' : 'grass');
        else if (e === 'meadow') t = n < 0.68 ? 'meadow' : (m < 0.6 ? 'grass' : 'forest');
        else if (e === 'rock') t = n < 0.55 ? 'rock' : 'grass';
        else t = n < 0.52 ? 'grass' : n < 0.78 ? (m < 0.5 ? 'meadow' : 'forest') : (m < 0.55 ? 'forest' : 'rock');
      }
      nt[y * tW + x] = TI[t];
    }
    // dời mọi thứ theo độ lệch mới
    S.terrain = nt; S.mapW = tW; S.mapH = tH;
    for (const o of S.objects) { o.x += dx; o.y += dy; if (o.from) o.from = [o.from[0] + dx, o.from[1] + dy]; }
    const px = dx * T, py = dy * T;
    for (const v of S.villagers) {
      v.x += px; v.y += py;
      const t = v.task;
      if (t && t.pts) t.pts = t.pts.map(([a, b]) => [a + px, b + py]);
      if (t && t.next && t.next.pts) t.next = null;
    }
    for (const b of S.beasts || []) { b.x += px; b.y += py; b.path = null; b.goal = null; }
    if (S.def && S.def.plan && S.def.plan.tile) S.def.plan.tile = [S.def.plan.tile[0] + dx, S.def.plan.tile[1] + dy];
    if (S.saga) for (const e of S.saga.exps) if (e.tile) e.tile = [e.tile[0] + dx, e.tile[1] + dy];
    if (S.layUndo) S.layUndo.list.forEach(e => { e.x += dx; e.y += dy; });
    for (const a of S.clearAreas || []) { a.x += dx; a.y += dy; }
    if (window.CIV) CIV.shift(dx, dy);
    WORLD.rebuild();
    // trang trí vùng đất mới
    const G = CFG.GATHER;
    for (const [x, y] of fresh) {
      const t = WORLD.ter(x, y), r = rand();
      if (WORLD.objAt(x, y)) continue;
      if (t === 'forest' && r < 0.55) WORLD.addObj({ type: 'tree', x, y, w: 1, h: 1, stock: G.wood.stock, v: Math.floor(rand() * 3) });
      else if (t === 'grass' && r < 0.035) WORLD.addObj({ type: 'tree', x, y, w: 1, h: 1, stock: G.wood.stock, v: Math.floor(rand() * 3) });
      else if ((t === 'grass' && r < 0.06) || (t === 'meadow' && r < 0.025)) WORLD.addObj({ type: 'bush', x, y, w: 1, h: 1, stock: G.berry.stock, seeds: G.berry.seeds, regrow: 0 });
      else if (t === 'rock' && r < 0.12) WORLD.addObj({ type: 'boulder', x, y, w: 1, h: 1, stock: G.stone.stock, v: Math.floor(rand() * 2) });
    }
    // một bãi săn mới trên đồng cỏ vùng đất mới
    const freshSet = new Set(fresh.map(([x, y]) => x + ',' + y));
    const f0 = WORLD.fire(), ZW = 7, ZH = 5;
    for (let k = 0; k < 600; k++) {
      const [fx, fy] = fresh[Math.floor(rand() * fresh.length)];
      const x = fx - Math.floor(rand() * ZW), y = fy - Math.floor(rand() * ZH);
      if (Math.hypot(x + ZW / 2 - f0.x, y + ZH / 2 - f0.y) < 16) continue;
      let ok = true, nf = 0;
      for (let j = 0; j < ZH && ok; j++) for (let i = 0; i < ZW && ok; i++) {
        const t = WORLD.ter(x + i, y + j);
        if (!(t === 'grass' || t === 'meadow' || t === 'forest') || WORLD.objAt(x + i, y + j)) ok = false;
        if (freshSet.has((x + i) + ',' + (y + j))) nf++;
      }
      if (!ok || nf < ZW * ZH * 0.4 || S.objects.some(o => o.type === 'huntzone' && x < o.x + o.w + 2 && x + ZW + 2 > o.x && y < o.y + o.h + 2 && y + ZH + 2 > o.y)) continue;
      for (let j = 0; j < ZH; j++) for (let i = 0; i < ZW; i++) WORLD.setTer(x + i, y + j, 'meadow');
      WORLD.addObj({ type: 'huntzone', x, y, w: ZW, h: ZH, animals: 3 });
      break;
    }
    WORLD.rebuild();
    SIM.unstickAll();
    if (typeof RENDER !== 'undefined') {
      if (RENDER.cam) { RENDER.cam.x += px; RENDER.cam.y += py; }
      RENDER.rebuildGround();
    }
    if (typeof UI !== 'undefined' && UI.state) { UI.state.ghost = null; UI.state.moveTile = null; }
    SIM.event(`Đất đai mở rộng! Thợ săn và người hái lượm đã đi xa hơn, bộ lạc giờ biết tới vùng đất ${tW}×${tH} ô với rừng, đồng cỏ, đồi đá và bãi săn mới.`);
    EV.emit('toast', `🗺 Bản đồ mở rộng: ${tW}×${tH} ô`);
    if (window.SAGA && S.saga) SAGA.memory('feet', `Khám phá vùng đất mới ${tW}×${tH} ô`);
    return true;
  }
  function onLevel() { const [w, h] = targetSize(); return expandTo(w, h); }

  // ---------------- KHAI HOANG RỪNG ----------------
  const CLEARABLE = ['tree', 'stump', 'sapling'];
  function inArea(o, a) { return o.x >= a.x - a.r && o.x <= a.x + a.r && o.y >= a.y - a.r && o.y <= a.y + a.r; }
  const marked = () => S.objects.filter(o => o.clear && CLEARABLE.includes(o.type));
  function countIn(x, y) { return S.objects.filter(o => CLEARABLE.includes(o.type) && !o.clear && Math.abs(o.x - x) <= 2 && Math.abs(o.y - y) <= 2).length; }
  function markArea(x, y) {
    if (!S.clearAreas) S.clearAreas = [];
    let n = 0;
    for (const o of S.objects) if (CLEARABLE.includes(o.type) && !o.clear && Math.abs(o.x - x) <= 2 && Math.abs(o.y - y) <= 2) { o.clear = 1; n++; }
    if (n) S.clearAreas.push({ x, y, r: 2 });
    return n;
  }
  function finishAreas() {
    let changed = false;
    for (const a of (S.clearAreas || []).slice()) {
      if (S.objects.some(o => o.clear && CLEARABLE.includes(o.type) && inArea(o, a))) continue;
      for (let y = a.y - a.r; y <= a.y + a.r; y++) for (let x = a.x - a.r; x <= a.x + a.r; x++) if (WORLD.ter(x, y) === 'forest' && !WORLD.objAt(x, y)) WORLD.setTer(x, y, 'grass');
      S.clearAreas = S.clearAreas.filter(b => b !== a);
      changed = true;
      SIM.log('Đã khai hoang xong một khu rừng — thêm đất trống để xây dựng và mở ruộng.', 'ev');
    }
    if (changed && typeof RENDER !== 'undefined') RENDER.rebuildGround();
  }
  function autoMark() {
    if (marked().length || S.autoClearDay === S.day) return;
    const f = WORLD.fire(), R = EXP.buildRadius() + 2;
    const trees = S.objects.filter(o => o.type === 'tree' && Math.hypot(o.x - f.x, o.y - f.y) <= R && WORLD.ringTiles(o).some(([a, c]) => WORLD.inMain(a, c)));
    if (!trees.length) return;
    trees.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
    const t = trees[0];
    const n = markArea(t.x, t.y);
    S.autoClearDay = S.day;
    if (n) SIM.log(`Làng hết chỗ trống — bắt đầu khai hoang khu rừng ${window.DEF ? DEF.dirName(t.x, t.y) : ''} (${n} cây).`, 'ev');
  }

  // ---------------- CẦU QUA SÔNG ----------------
  const bridges = () => S.objects.filter(o => o.type === 'bridge');
  function span(tx, ty, dx, dy) {
    let a = 0, b = 0;
    while (WORLD.ter(tx - dx * (a + 1), ty - dy * (a + 1)) === 'water' && a < 12) a++;
    while (WORLD.ter(tx + dx * (b + 1), ty + dy * (b + 1)) === 'water' && b < 12) b++;
    const len = a + b + 1, sx = tx - dx * a, sy = ty - dy * a;
    const e1 = [sx - dx, sy - dy], e2 = [tx + dx * (b + 1), ty + dy * (b + 1)];
    const land = ([x, y]) => WORLD.passTer(WORLD.ter(x, y)) && WORLD.ter(x, y) !== 'water';
    if (len > BR.maxLen || !land(e1) || !land(e2)) return null;
    const p = { x: sx, y: sy, w: dx ? len : 1, h: dy ? len : 1, len };
    for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) if (WORLD.objAt(p.x + i, p.y + j, o => o.type !== 'fishspot')) return null;
    if (![e1, e2].some(([x, y]) => WORLD.walkable(x, y) && WORLD.inMain(x, y))) return null;
    return p;
  }
  function bridgePlan(tx, ty) {
    if (WORLD.ter(tx, ty) !== 'water') return null;
    const a = span(tx, ty, 1, 0), b = span(tx, ty, 0, 1);
    if (a && b) return a.len <= b.len ? a : b;
    return a || b;
  }
  const bridgeCost = (len) => ({ wood: BR.wood * len, stone: BR.stone * len, hours: BR.hours * len });
  function bridgeActions(p) {
    const c = bridgeCost(p.len);
    return {
      title: `Bắc cầu qua sông (${p.len} ô)`,
      desc: `Cầu gỗ ${p.w > 1 ? 'nằm ngang' : 'nằm dọc'} dài ${p.len} ô. Chi phí ${c.wood} gỗ, ${c.stone} đá (trừ ngay) · ${c.hours} giờ công. Xây xong thì dân làng và thú đều đi qua được, sang bờ bên kia khai thác và xây dựng.`,
      actions: [{ spec: { type: 'buildBridge', x: p.x, y: p.y, w: p.w, h: p.h }, label: 'Bắc cầu ở đây', detail: 'Người được chọn bắt tay làm ngay (khi bật Tự động, làng tự cử người tới xây).', btn: 'Bắc cầu' }],
    };
  }

  // ---------------- HÀNH ĐỘNG ----------------
  const HANDLED = ['clearLand', 'landclear', 'buildBridge', 'bridgeWork'];
  function handles(t) { return HANDLED.includes(t); }
  function check(spec, vs) {
    if (spec.type === 'clearLand') return countIn(spec.x, spec.y) ? { ok: true } : { ok: false, msg: 'Không còn cây nào cần khai hoang ở đây' };
    if (spec.type === 'landclear') { if (!vs.length) return { ok: false, msg: 'Hãy chọn người' }; return marked().length ? { ok: true } : { ok: false, msg: 'Chưa có khu rừng nào được đánh dấu khai hoang' }; }
    if (spec.type === 'buildBridge') {
      const len = Math.max(spec.w, spec.h), c = bridgeCost(len);
      if (S.res.wood < c.wood) return { ok: false, msg: `Cần thêm ${c.wood - S.res.wood} gỗ` };
      if (S.res.stone < c.stone) return { ok: false, msg: `Cần thêm ${c.stone - S.res.stone} đá` };
      for (let j = 0; j < spec.h; j++) for (let i = 0; i < spec.w; i++) if (WORLD.ter(spec.x + i, spec.y + j) !== 'water' || WORLD.objAt(spec.x + i, spec.y + j, o => o.type !== 'fishspot')) return { ok: false, msg: 'Chỗ này không bắc cầu được' };
      return { ok: true };
    }
    if (spec.type === 'bridgeWork') { const o = WORLD.byId(spec.target); if (!o || o.done) return { ok: false, msg: 'Cầu đã xây xong' }; if (!vs.length) return { ok: false, msg: 'Hãy chọn người' }; return { ok: true }; }
    return { ok: true };
  }
  function setJob(v, job, auto) { v.job = Object.assign({ auto: !!auto, until: 99 }, job); v.task = null; v.resting = false; }
  function assign(spec, vs) {
    const c = check(spec, vs); if (!c.ok) return c;
    if (spec.type === 'clearLand') {
      const n = markArea(spec.x, spec.y);
      for (const v of vs.filter(v => !v.child)) setJob(v, { type: 'landclear' });
      return { ok: true, msg: `Đã đánh dấu ${n} cây/gốc để khai hoang${vs.length ? ` — ${vs.map(v => v.name).join(', ')} bắt tay làm` : S.auto ? ' — làng sẽ cử người làm' : ' — hãy chọn người để giao việc'}` };
    }
    if (spec.type === 'landclear') { for (const v of vs) setJob(v, { type: 'landclear' }); return { ok: true }; }
    if (spec.type === 'buildBridge') {
      const len = Math.max(spec.w, spec.h), cst = bridgeCost(len);
      S.res.wood -= cst.wood; S.res.stone -= cst.stone;
      const o = WORLD.addObj({ type: 'bridge', x: spec.x, y: spec.y, w: spec.w, h: spec.h, progress: 0, need: cst.hours, done: false });
      WORLD.rebuild();
      for (const v of vs.filter(v => !v.child)) setJob(v, { type: 'bridge', target: o.id });
      SIM.log(`Bắt đầu bắc cầu qua sông dài ${len} ô (−${cst.wood} gỗ, −${cst.stone} đá).`, 'ev');
      return { ok: true, msg: `Bắt đầu bắc cầu (${len} ô)` };
    }
    if (spec.type === 'bridgeWork') { for (const v of vs) setJob(v, { type: 'bridge', target: spec.target }); return { ok: true }; }
    return { ok: false, msg: '?' };
  }
  const ring = (o) => WORLD.ringTiles(o).filter(([x, y]) => WORLD.inMain(x, y));
  function nearestMarked(v) {
    let best = null, bd = 1e9;
    for (const o of marked()) {
      if (S.villagers.some(w => w !== v && w.task && w.task.kind === 'dig' && w.task.target === o.id)) continue;
      const d = Math.hypot(o.x * T - v.x, o.y * T - v.y);
      if (d < bd && ring(o).length) { bd = d; best = o; }
    }
    return best;
  }
  function planJob(v, j) {
    if (j.type === 'landclear') {
      const o = nearestMarked(v);
      if (!o) { v.job = null; v.note = 'Đã khai hoang xong'; finishAreas(); return true; }
      const need = o.type === 'tree' ? 1.6 : o.type === 'stump' ? 0.7 : 0.4;
      const next = { kind: 'dig', target: o.id, need, done: 0 }, r = ring(o);
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { o.clear = 0; v.task = null; }
      return true;
    }
    if (j.type === 'bridge') {
      const o = WORLD.byId(j.target);
      if (!o || o.done) { v.job = null; v.note = 'Cầu đã xây xong'; return true; }
      const r = ring(o), next = { kind: 'bridgework', target: o.id };
      if (!r.length) { v.job = null; v.note = 'Không tới được đầu cầu'; return true; }
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không tới được đầu cầu'; }
      return true;
    }
    return false;
  }
  function face(v, o) { const cx = (o.x + o.w / 2) * T; if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1; }
  function task(v, t, dt) {
    const E = CFG.ENERGY;
    if (t.kind === 'dig') {
      const o = WORLD.byId(t.target);
      if (!o || !CLEARABLE.includes(o.type)) { v.task = null; return true; }
      face(v, o);
      v.energy = clamp(v.energy - E.workDrain * dt, 0, 100);
      t.done += SIM.workSpeed(v, 'build') * dt;
      if (t.done >= t.need) {
        v.task = null;
        if (o.type === 'tree') { const n = Math.min(o.stock || 0, CFG.GATHER.wood.perTrip + 1); if (n > 0) v.carry = { wood: n, vis: 'wood' }; }
        WORLD.removeObj(o);
        if (WORLD.ter(o.x, o.y) === 'forest') WORLD.setTer(o.x, o.y, 'grass');
        WORLD.rebuild();
        finishAreas();
      }
      return true;
    }
    if (t.kind === 'bridgework') {
      const o = WORLD.byId(t.target);
      if (!o || o.done) { v.task = null; return true; }
      face(v, o);
      v.energy = clamp(v.energy - E.workDrain * dt, 0, 100);
      o.progress += SIM.workSpeed(v, 'build') * dt;
      if (o.progress >= o.need) {
        o.done = true; o.progress = o.need;
        WORLD.rebuild(); SIM.unstickAll();
        S.villagers.filter(w => isJob(w, 'bridge') && w.job.target === o.id).forEach(w => { w.job = null; w.task = null; });
        S.today.built.push('Cầu qua sông');
        S.villagers.forEach(w => w.morale = clamp(w.morale + 4, 0, 100));
        SIM.event(`Cây cầu gỗ qua sông đã hoàn thành! Dân làng có thể sang bờ bên kia.`);
        EV.emit('toast', '🌉 Cầu qua sông đã xây xong!');
        if (window.SAGA && S.saga && !S.saga.seen.bridge) { S.saga.seen.bridge = 1; SAGA.memory('temple', 'Bắc cây cầu đầu tiên qua sông'); }
      }
      return true;
    }
    return false;
  }
  function jobText(v) {
    const k = v.task && v.task.kind;
    if (isJob(v, 'landclear')) return k === 'dig' ? 'Khai hoang: đốn cây, đào gốc' : 'Đi khai hoang rừng';
    if (isJob(v, 'bridge')) return k === 'bridgework' ? 'Bắc cầu qua sông' : 'Đi tới chỗ bắc cầu';
    return null;
  }
  const WORK_POSE = ['dig', 'bridgework'];

  // ---------------- TỰ ĐỘNG ----------------
  function free(v) {
    if (v.child || v.resting || v.pregnant > 0 || v.inside || v.carry || v.health < 35) return false;
    if (window.TRB && TRB.reserved(v)) return false;
    if (!v.job) return true;
    return v.job.auto && ['gather'].includes(v.job.type) && (!v.task || v.task.kind !== 'work');
  }
  function autoJobs() {
    if (S.needSpace === S.day) autoMark();
    const pick = (n, type, job) => {
      const have = S.villagers.filter(v => isJob(v, type)).length;
      for (const v of S.villagers.filter(free).sort((a, b) => (b.skills.build || 1) - (a.skills.build || 1)).slice(0, Math.max(0, n - have))) setJob(v, job, true);
    };
    const m = marked().length;
    if (m) pick(Math.min(3, m), 'landclear', { type: 'landclear' });
    const b = bridges().find(o => !o.done);
    if (b) pick(3, 'bridge', { type: 'bridge', target: b.id });
  }
  let checked = false, acc = 0;
  function tick(dt) {
    if (!checked) { checked = true; if (!S.clearAreas) migrate(S); onLevel(); S.landR = S.landR || EXP.buildRadius(); }
    acc += dt;
    if (acc > 1) { acc = 0; finishAreas(); }
  }
  function overnight() {
    if (!S.clearAreas) migrate(S);
    const r = EXP.buildRadius();
    if (S.landR && r > S.landR) { SIM.log(`Đất làng nới rộng: được xây dựng trong bán kính ${r} ô quanh lửa trại.`, 'ev'); EV.emit('toast', `Đất làng nới rộng: bán kính ${r} ô`); }
    S.landR = r;
  }

  // ---------------- GIAO DIỆN ----------------
  function addActions(p, out) {
    let tx, ty;
    if (p.kind === 'tile') { tx = p.tx; ty = p.ty; }
    else if (p.kind === 'obj') { const o = WORLD.byId(p.id); if (!o || !CLEARABLE.includes(o.type)) return; tx = o.x; ty = o.y; }
    else return;
    const n = countIn(tx, ty);
    if (!n) return;
    out.actions.push({ spec: { type: 'clearLand', x: tx, y: ty }, label: 'Khai hoang khu rừng này', detail: `${n} cây/gốc trong vùng 5×5 ô sẽ bị đốn và đào gốc, thành bãi cỏ trống vĩnh viễn (không mọc lại) · được thêm gỗ · ${S.auto ? 'làng tự cử người làm, hoặc ' : ''}chọn người để giao ngay`, btn: 'Khai hoang' });
  }
  function objActions(o) {
    if (o.type !== 'bridge') return null;
    if (o.done) return { title: 'Cầu gỗ qua sông', desc: `Cầu dài ${Math.max(o.w, o.h)} ô — dân làng và thú đều đi qua được.`, actions: [] };
    return { title: 'Cầu đang xây', desc: `Tiến độ ${Math.round(o.progress / o.need * 100)}% · còn ${Math.round((o.need - o.progress) * 10) / 10} giờ công. Vật liệu đã trả.`, actions: [{ spec: { type: 'bridgeWork', target: o.id }, label: 'Tiếp tục bắc cầu', detail: 'Người được chọn tới đầu cầu làm tiếp' }] };
  }
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  function drawDeck(lx, X, Y, horiz, n, total) {
    for (let i = 0; i < total; i++) {
      const x = X + (horiz ? i * T : 0), y = Y + (horiz ? 0 : i * T);
      if (i < n) {
        if (horiz) { R(lx, x, y + 4, T, T - 8, '#8a5a30'); for (let k = 0; k < T; k += 4) R(lx, x + k, y + 4, 1, T - 8, '#6b4224'); R(lx, x, y + 3, T, 2, '#5a3a1c'); R(lx, x, y + T - 5, T, 2, '#5a3a1c'); }
        else { R(lx, x + 4, y, T - 8, T, '#8a5a30'); for (let k = 0; k < T; k += 4) R(lx, x + 4, y + k, T - 8, 1, '#6b4224'); R(lx, x + 3, y, 2, T, '#5a3a1c'); R(lx, x + T - 5, y, 2, T, '#5a3a1c'); }
      }
      if (horiz) { R(lx, x + 1, y + 2, 2, 4, '#4a2e18'); R(lx, x + 1, y + T - 6, 2, 4, '#4a2e18'); }
      else { R(lx, x + 2, y + 1, 4, 2, '#4a2e18'); R(lx, x + T - 6, y + 1, 4, 2, '#4a2e18'); }
    }
  }
  function pushDraw(list, lx, L, Tp) {
    for (const o of bridges()) {
      const horiz = o.w > 1, total = Math.max(o.w, o.h), n = o.done ? total : Math.floor(o.progress / o.need * total);
      list.push([o.y * T - 2000, () => drawDeck(lx, L(o.x * T), Tp(o.y * T), horiz, n, total)]);
    }
  }
  function drawGhost(lx, x, y, w, h) { drawDeck(lx, x, y, w > 1, Math.max(w, h), Math.max(w, h)); }
  // ranh giới đất làng khi đang chọn chỗ xây / di chuyển
  function drawBounds(lx, ox, oy, vw, vh, plot) {
    const f = WORLD.fire(), cx = (f.x + 0.5) * T - ox, cy = (f.y + 0.5) * T - oy;
    const r = (plot ? Math.max(CFG.NEW_PLOT_RADIUS, EXP.buildRadius()) : EXP.buildRadius()) * T;
    lx.save();
    lx.beginPath(); lx.rect(0, 0, vw, vh); lx.arc(cx, cy, r, 0, Math.PI * 2, true);
    lx.fillStyle = 'rgba(10,10,30,0.22)'; lx.fill();
    lx.beginPath(); lx.arc(cx, cy, r, 0, Math.PI * 2);
    lx.setLineDash([6, 4]); lx.lineWidth = 2; lx.strokeStyle = 'rgba(255,225,120,0.85)'; lx.stroke();
    lx.restore();
  }

  return {
    migrate, expandTo, onLevel, targetSize, SIZES, markArea, bridgePlan, bridgeActions, handles, check, assign, planJob, task, jobText, WORK_POSE,
    autoJobs, tick, overnight, addActions, objActions, pushDraw, drawGhost, drawBounds, marked,
  };
})();
window.LAND = LAND;
