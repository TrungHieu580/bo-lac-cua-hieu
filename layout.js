// =====================================================================
//  LAY — di chuyển công trình & ruộng, tự sắp xếp làng theo khu
// =====================================================================
'use strict';
const LAY = (() => {
  const T = CFG.TILE;
  const CW = 4, CH = 3; // ô lưới xây dựng (giống expand.js)
  const MOVABLE = ['storage', 'hut', 'longhouse', 'rack', 'granary', 'healer', 'workshop', 'watchtower', 'sickhouse', 'kitchen', 'pen', 'temple', 'stonering', 'greathall', 'paintwall', 'well', 'scholar', 'school', 'barracks', 'smelter', 'site', 'plot'];
  const kindOf = (o) => o.type === 'site' ? (o.kind || 'hut') : o.type;
  function nameOf(o) {
    if (o.type === 'storage') return 'Kho chung';
    if (o.type === 'plot') return 'ruộng';
    if (o.type === 'site') return `công trường ${EXP.bname(o.kind || 'hut')}`;
    return EXP.bname(o.type);
  }
  const movable = (o) => !!o && MOVABLE.includes(o.type);
  const occupied = (o) => S.villagers.some(v => v.inside === o.id);
  const isPlot = (o) => o && o.type === 'plot';
  const plotRadius = () => Math.max(CFG.NEW_PLOT_RADIUS, EXP.buildRadius());

  // ---------------- KHU VỰC ----------------
  const GROUPS = {
    store: { name: 'Khu kho & chế biến', kinds: ['storage', 'rack', 'granary', 'kitchen', 'workshop', 'smelter'] },
    home: { name: 'Khu nhà ở', kinds: ['hut', 'longhouse', 'well'] },
    care: { name: 'Khu chữa bệnh', kinds: ['healer', 'sickhouse'] },
    sacred: { name: 'Khu tâm linh', kinds: ['temple', 'stonering', 'greathall', 'paintwall'] },
    animal: { name: 'Khu chăn nuôi', kinds: ['pen'] },
    learn: { name: 'Khu học tập', kinds: ['scholar', 'school'] },
    guard: { name: 'Chòi canh & doanh trại', kinds: ['watchtower', 'barracks'] },
  };
  const ORDER = ['store', 'home', 'sacred', 'learn', 'care', 'animal', 'guard'];
  const groupOf = (k) => ORDER.find(g => GROUPS[g].kinds.includes(k)) || 'home';
  // tâm của khu (để công trình mới tự xây gần các công trình cùng loại)
  function groupCentroid(k) {
    const g = groupOf(k);
    if (g === 'guard') return null;
    const ms = S.objects.filter(o => o.type !== 'plot' && movable(o) && groupOf(kindOf(o)) === g);
    if (!ms.length) return null;
    return [ms.reduce((s, o) => s + o.x + o.w / 2, 0) / ms.length, ms.reduce((s, o) => s + o.y + o.h / 2, 0) / ms.length];
  }

  // ---------------- KIỂM TRA CHỖ ĐẶT ----------------
  function validMove(id, x, y) {
    const o = WORLD.byId(id);
    if (!movable(o)) return { ok: false, msg: 'Không di chuyển được công trình này' };
    if (x === o.x && y === o.y) return { ok: false, msg: 'Đây là chỗ cũ' };
    const f = WORLD.fire();
    const own = (tx, ty) => tx >= o.x && ty >= o.y && tx < o.x + o.w && ty < o.y + o.h;
    const okTer = isPlot(o) ? ['grass', 'meadow', 'forest'] : ['grass', 'forest', 'dirt', 'rock', 'meadow'];
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const tx = x + i, ty = y + j, t = WORLD.ter(tx, ty);
      if (t === null) return { ok: false, msg: 'Ngoài bản đồ' };
      if (!okTer.includes(t) && !(t === 'farm' && isPlot(o) && own(tx, ty))) return { ok: false, msg: isPlot(o) ? 'Ruộng chỉ đặt được trên bãi cỏ, đồng cỏ hoặc nền rừng trống' : 'Không đặt được trên địa hình này' };
      const b = WORLD.objAt(tx, ty);
      if (b && b !== o) return { ok: false, msg: 'Chỗ này đã có vật cản' };
    }
    const R = isPlot(o) ? plotRadius() : EXP.buildRadius();
    if (Math.hypot(x + o.w / 2 - (f.x + 0.5), y + o.h / 2 - (f.y + 0.5)) > R) return { ok: false, msg: isPlot(o) ? 'Ruộng phải ở gần trại' : 'Công trình phải ở gần bếp lửa' };
    if (isPlot(o) && ![[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1], ...WORLD.ringTiles({ x, y, w: 2, h: 2 })].some(([a, c]) => WORLD.inMain(a, c))) return { ok: false, msg: 'Không có đường tới đây' };
    return { ok: true };
  }
  function setPlotTer(o, ter) { for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) WORLD.setTer(o.x + i, o.y + j, ter); }
  function afterMove() {
    WORLD.rebuild();
    SIM.unstickAll();
    if (typeof RENDER !== 'undefined' && RENDER.rebuildGround) RENDER.rebuildGround();
  }
  function clearTasksFor(ids) {
    for (const v of S.villagers) {
      const t = v.task;
      if (t && (t.kind === 'walk' || ids.has(t.target) || ids.has(t.house) || ids.has(t.hut))) v.task = null;
    }
  }
  function moveTo(o, x, y) {
    const ox = o.x, oy = o.y;
    if (isPlot(o)) setPlotTer(o, 'grass');
    o.x = x; o.y = y;
    if (isPlot(o)) setPlotTer(o, 'farm');
    WORLD.rebuild();
    if (o.type === 'storage' && !WORLD.ringTiles(o).some(([a, c]) => WORLD.inMain(a, c))) { o.x = ox; o.y = oy; afterMove(); return { ok: false, msg: 'Kho đặt ở đó sẽ không có đường tới' }; }
    clearTasksFor(new Set([o.id]));
    afterMove();
    SIM.log(`Đã chuyển ${nameOf(o)} tới chỗ mới.`);
    return { ok: true };
  }

  // ---------------- HÍT LƯỚI KHI DI CHUYỂN ----------------
  const mod = (a, n) => ((a % n) + n) % n;
  function plotGridAnchor(except) {
    const p = S.objects.filter(o => o.type === 'plot' && o !== except).sort((a, b) => a.id - b.id)[0];
    return p ? [p.x, p.y] : null;
  }
  function snapFor(o, wx, wy) {
    if (!isPlot(o)) return EXP.snapBuild(kindOf(o), wx, wy);
    const a = plotGridAnchor(o); if (!a) return null;
    const tx = Math.floor(wx / T - 0.5), ty = Math.floor(wy / T - 0.5);
    let best = null, bd = 1e9;
    const x0 = tx - mod(tx - a[0], 3), y0 = ty - mod(ty - a[1], 3);
    for (const dy of [-3, 0, 3]) for (const dx of [-3, 0, 3]) {
      const x = x0 + dx, y = y0 + dy;
      const d = Math.hypot(x + 1 - wx / T, y + 1 - wy / T);
      if (d < bd && validMove(o.id, x, y).ok) { bd = d; best = [x, y]; }
    }
    return bd < 3 ? best : null;
  }
  // các ô gợi ý (gạch đứt) khi đang di chuyển
  function guides(id) {
    const o = WORLD.byId(id); if (!o) return [];
    if (!isPlot(o)) return EXP.freeSlots(kindOf(o));
    const a = plotGridAnchor(o); if (!a) return [];
    const f = WORLD.fire(), R = plotRadius(), out = [];
    for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) {
      if (mod(x - a[0], 3) || mod(y - a[1], 3)) continue;
      if (validMove(id, x, y).ok) out.push([x, y]);
    }
    return out;
  }

  // ---------------- TỰ SẮP XẾP LÀNG ----------------
  const BT = () => [...MOVABLE.filter(t => t !== 'plot'), 'fire', 'quarry', 'fishspot', 'plot'];
  function overlaps(x, y, w, h, gap, skip) {
    const types = BT();
    return S.objects.some(o => o !== skip && types.includes(o.type) && o.x > -500 && x - gap < o.x + o.w && x + w + gap > o.x && y - gap < o.y + o.h && y + h + gap > o.y);
  }
  function bldFree(o, x, y) {
    const f = WORLD.fire(), d = Math.hypot(x + o.w / 2 - f.x - 0.5, y + o.h / 2 - f.y - 0.5);
    if (d < 3 || d > EXP.buildRadius()) return false;
    if (overlaps(x, y, o.w, o.h, 1, o)) return false;
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const t = WORLD.ter(x + i, y + j);
      if (!['grass', 'forest', 'dirt', 'rock'].includes(t) || WORLD.objAt(x + i, y + j, b => b !== o && b.x > -500)) return false;
    }
    return WORLD.ringTiles({ x, y, w: o.w, h: o.h }).some(([a, c]) => WORLD.inMain(a, c));
  }
  function bldSlots(o) {
    const f = WORLD.fire(), n = Math.ceil(EXP.buildRadius() / 3) + 1, out = [];
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      if (!i && !j) continue;
      const x = f.x - 1 + CW * i + Math.floor((CW - o.w) / 2), y = f.y - 1 + CH * j + CH - o.h;
      if (bldFree(o, x, y)) out.push([x, y]);
    }
    if (out.length) return out;
    const R = EXP.buildRadius(); // không còn ô lưới: đặt tự do
    for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) if (bldFree(o, x, y)) out.push([x, y]);
    return out;
  }
  function plotFree(x, y) {
    const f = WORLD.fire();
    const d = Math.hypot(x + 1 - f.x - 0.5, y + 1 - f.y - 0.5);
    if (d < 5.5 || d > plotRadius()) return false;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const t = WORLD.ter(x + i, y + j);
      if (!['grass', 'meadow', 'forest'].includes(t) || WORLD.objAt(x + i, y + j, o => o.x > -500)) return false;
    }
    if (overlaps(x, y, 2, 2, 1)) return false;
    return WORLD.ringTiles({ x, y, w: 2, h: 2 }).some(([a, c]) => WORLD.inMain(a, c));
  }
  // chọn một khối ruộng liền nhau (lưới 3 ô) đủ chỗ cho n ruộng
  function plotBlock(n) {
    const f = WORLD.fire(), R = plotRadius();
    let best = null, bs = 1e9;
    for (let ay = f.y - R; ay <= f.y + R; ay++) for (let ax = f.x - R; ax <= f.x + R; ax++) {
      if (!plotFree(ax, ay)) continue;
      const chosen = [[ax, ay]], key = new Set([ax + ',' + ay]);
      while (chosen.length < n) {
        const cx = chosen.reduce((s, p) => s + p[0], 0) / chosen.length, cy = chosen.reduce((s, p) => s + p[1], 0) / chosen.length;
        let nb = null, nd = 1e9;
        for (const [px, py] of chosen) for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
          const x = px + dx, y = py + dy, k = x + ',' + y;
          if (key.has(k) || !plotFree(x, y)) continue;
          const d = Math.abs(x - cx) + Math.abs(y - cy) * 1.25;
          if (d < nd) { nd = d; nb = [x, y]; }
        }
        if (!nb) break;
        chosen.push(nb); key.add(nb[0] + ',' + nb[1]);
      }
      const cx = chosen.reduce((s, p) => s + p[0] + 1, 0) / chosen.length, cy = chosen.reduce((s, p) => s + p[1] + 1, 0) / chosen.length;
      const spread = chosen.reduce((s, p) => s + Math.hypot(p[0] + 1 - cx, p[1] + 1 - cy), 0);
      const score = (n - chosen.length) * 1000 + spread + 0.6 * n * Math.hypot(cx - f.x - 0.5, cy - f.y - 0.5);
      if (score < bs) { bs = score; best = chosen; }
    }
    return best;
  }
  function arrange() {
    const objs = S.objects.filter(o => movable(o));
    if (!objs.length) return { ok: false, msg: 'Chưa có gì để sắp xếp' };
    const orig = objs.map(o => ({ o, x: o.x, y: o.y }));
    const plots = objs.filter(isPlot), blds = objs.filter(o => !isPlot(o));
    const lift = () => { // nhấc mọi thứ lên khỏi bản đồ (kho giữ chỗ cũ: vùng đi lại tính từ kho)
      for (const p of plots) if (p.x > -500) setPlotTer(p, 'grass');
      for (const { o, x, y } of orig) { if (o.type === 'storage') { o.x = x; o.y = y; } else { o.x = -1000; o.y = -1000; } }
      WORLD.rebuild();
    };
    const restore = () => {
      for (const p of plots) if (p.x > -500) setPlotTer(p, 'grass');
      for (const { o, x, y } of orig) { o.x = x; o.y = y; }
      for (const p of plots) setPlotTer(p, 'farm');
      afterMove();
    };
    for (const p of plots) setPlotTer(p, 'grass');
    lift();
    let res = null;
    for (const plotAfter of ['sacred', 'guard']) { // ruộng xếp sau nhà ở & khu tâm linh; nếu không đủ chỗ thì xếp sau cùng
      try { res = pass(blds, plots, plotAfter); } catch (e) { console.error(e); res = 'Không sắp xếp được: ' + e.message; }
      if (res === true) break;
      lift();
    }
    if (res !== true) { restore(); return { ok: false, msg: res }; }
    clearTasksFor(new Set(objs.map(o => o.id)));
    for (const v of S.villagers) if (v.task && v.task.kind === 'work') v.task = null;
    afterMove();
    S.layUndo = { day: S.day, n: S.objects.length, list: orig.map(({ o, x, y }) => ({ id: o.id, x, y })) };
    const moved = orig.filter(({ o, x, y }) => o.x !== x || o.y !== y).length;
    SIM.log(`Làng được sắp xếp lại theo khu: ${moved} công trình và ruộng đã đổi chỗ.`, 'ev');
    return { ok: true, msg: `Đã sắp xếp lại làng theo khu (${moved} chỗ thay đổi) — có thể hoàn tác` };
  }
  function pass(blds, plots, plotAfter) {
    const f = WORLD.fire(), R = EXP.buildRadius();
    const placed = {};
    const cen = (g) => { const ms = placed[g]; return ms && ms.length ? [ms.reduce((s, o) => s + o.x + o.w / 2, 0) / ms.length, ms.reduce((s, o) => s + o.y + o.h / 2, 0) / ms.length] : null; };
    for (const g of ORDER) {
      const ms = blds.filter(o => groupOf(kindOf(o)) === g).sort((a, b) => (b.type === 'storage') - (a.type === 'storage') || b.w * b.h - a.w * a.h || a.id - b.id);
      for (const o of ms) {
        const slots = bldSlots(o);
        if (!slots.length) return `Không đủ chỗ trống để xếp ${nameOf(o)}`;
        const c = cen(g), others = [...ORDER.filter(x => x !== g).map(cen), placed.plot ? cen('plot') : null].filter(Boolean);
        let best = null, bs = 1e9;
        for (const [x, y] of slots) {
          const mx = x + o.w / 2, my = y + o.h / 2, df = Math.hypot(mx - f.x - 0.5, my - f.y - 0.5);
          let sc;
          if (g === 'guard') { const ts = placed.guard || []; sc = Math.abs(df - 0.6 * R) - 0.5 * Math.min(12, ...ts.map(t => Math.hypot(mx - t.x - 1, my - t.y - 1)), 12); }
          else if (c) sc = Math.hypot(mx - c[0], (my - c[1]) * 1.1) + 0.15 * df;
          else if (g === 'store') sc = df;
          else sc = df - 0.8 * Math.min(10, ...others.map(p => Math.hypot(mx - p[0], my - p[1])), 10);
          if (sc < bs) { bs = sc; best = [x, y]; }
        }
        if (c && g !== 'guard' && bs > 5) { // ô lưới gần khu đã hết: thử chỗ tự do sát khu
          for (let y = Math.round(c[1]) - 8; y <= Math.round(c[1]) + 8; y++) for (let x = Math.round(c[0]) - 9; x <= Math.round(c[0]) + 9; x++) {
            const mx = x + o.w / 2, my = y + o.h / 2, sc = Math.hypot(mx - c[0], (my - c[1]) * 1.1) + 0.15 * Math.hypot(mx - f.x - 0.5, my - f.y - 0.5) + 1.5;
            if (sc < bs && bldFree(o, x, y)) { bs = sc; best = [x, y]; }
          }
        }
        o.x = best[0]; o.y = best[1];
        (placed[g] = placed[g] || []).push(o);
        if (o.type === 'storage') WORLD.rebuild();
      }
      if (g === plotAfter && plots.length) {
        WORLD.rebuild();
        const r = placePlots(plots); if (r !== true) return r;
        placed.plot = plots;
      }
    }
    WORLD.rebuild();
    const st = WORLD.storage();
    if (st && !WORLD.ringTiles(st).some(([a, c]) => WORLD.inMain(a, c))) return 'Kho chung sẽ bị chắn đường';
    return true;
  }
  function placePlots(plots) {
    const f = WORLD.fire();
    const spots = plotBlock(plots.length) || [];
    if (spots.length < plots.length) { // không đủ một khối: thêm các ô rời gần cánh đồng
      const key = new Set(spots.map(p => p.join(','))), R = plotRadius(), extra = [];
      for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) if (!key.has(x + ',' + y) && plotFree(x, y)) extra.push([x, y]);
      const cx = spots.length ? spots[0][0] : f.x, cy = spots.length ? spots[0][1] : f.y;
      extra.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
      for (const e of extra) { if (spots.length >= plots.length) break; if (spots.every(s => Math.abs(s[0] - e[0]) >= 3 || Math.abs(s[1] - e[1]) >= 3)) spots.push(e); }
    }
    if (spots.length < plots.length) return 'Không đủ đất trống để xếp hết ruộng';
    spots.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    plots.slice().sort((a, b) => a.id - b.id).forEach((p, i) => { p.x = spots[i][0]; p.y = spots[i][1]; setPlotTer(p, 'farm'); });
    WORLD.rebuild();
    return true;
  }
  function canUndo() { return !!(S.layUndo && S.layUndo.list.every(e => WORLD.byId(e.id))); }
  function undo() {
    if (!canUndo()) return { ok: false, msg: 'Không còn gì để hoàn tác' };
    const list = S.layUndo.list.map(e => ({ o: WORLD.byId(e.id), x: e.x, y: e.y }));
    const cur = list.map(({ o }) => ({ o, x: o.x, y: o.y }));
    for (const { o } of list) { if (isPlot(o)) setPlotTer(o, 'grass'); o.x = -1000; o.y = -1000; }
    WORLD.rebuild();
    const blocked = list.some(({ o, x, y }) => { for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (WORLD.objAt(x + i, y + j, b => b.x > -500)) return true; return false; });
    const back = blocked ? cur : list;
    for (const { o, x, y } of back) { o.x = x; o.y = y; if (isPlot(o)) setPlotTer(o, 'farm'); }
    clearTasksFor(new Set(list.map(({ o }) => o.id)));
    afterMove();
    if (blocked) return { ok: false, msg: 'Chỗ cũ đã có vật khác chiếm, không hoàn tác được' };
    S.layUndo = null;
    SIM.log('Đã trả làng về cách sắp xếp cũ.');
    return { ok: true, msg: 'Đã hoàn tác — làng trở về cách sắp xếp cũ' };
  }
  function panelRow() {
    const zs = ORDER.map(g => GROUPS[g].name.replace('Khu ', '').toLowerCase()).join(', ');
    return `<div class="act"><div class="act-main"><b>🧭 Tự sắp xếp làng</b><small>Gom các công trình cùng loại vào một khu: ${zs}; ruộng xếp liền nhau thành một cánh đồng. Miễn phí, chuyển ngay. Sau đó làng tự xây công trình mới cạnh khu cùng loại.</small></div>
      <button class="btn go" data-act="ex-arrange">Sắp xếp</button></div>
      ${canUndo() ? `<div class="act"><div class="act-main"><b>↩ Hoàn tác sắp xếp</b><small>Trả mọi công trình và ruộng về chỗ cũ trước lần sắp xếp gần nhất.</small></div><button class="btn" data-act="ex-unarrange">Hoàn tác</button></div>` : ''}`;
  }

  // ---------------- HÀNH ĐỘNG ----------------
  function handles(type) { return type === 'startMove' || type === 'moveBuilding'; }
  function check(spec) {
    const o = WORLD.byId(spec.id);
    if (!movable(o)) return { ok: false, msg: 'Không di chuyển được công trình này' };
    if (occupied(o)) return { ok: false, msg: 'Đang có người ở bên trong — đợi họ ra ngoài' };
    if (spec.type === 'moveBuilding') return validMove(spec.id, spec.x, spec.y);
    return { ok: true };
  }
  function assign(spec) {
    const c = check(spec); if (!c.ok) return c;
    const o = WORLD.byId(spec.id);
    if (spec.type === 'startMove') { setTimeout(() => UI.startMoveMode(o.id), 0); return { ok: true, quiet: true }; }
    const r = moveTo(o, spec.x, spec.y);
    if (r.ok) r.msg = `Đã chuyển ${nameOf(o)}`;
    return r;
  }
  function addMoveAction(p, out) {
    const o = p.kind === 'obj' ? WORLD.byId(p.id) : null;
    if (!movable(o)) return;
    out.actions.push({ spec: { type: 'startMove', id: o.id }, label: `Di chuyển ${nameOf(o)}`, detail: isPlot(o) ? 'Chọn chỗ mới trên bãi cỏ (giữ nguyên lúa đang trồng, hạt đã gieo). Ruộng tự hít vào lưới thẳng hàng với các ruộng khác.' : 'Chọn chỗ mới trên bản đồ (không tốn vật liệu, chuyển ngay). Dùng để sắp xếp lại kiến trúc làng.', btn: 'Di chuyển' });
  }
  function moveActions(p) {
    const o = WORLD.byId(p.id);
    return {
      title: `Chuyển ${o ? nameOf(o) : 'công trình'} tới đây?`,
      desc: isPlot(o) ? 'Ruộng được chuyển ngay, giữ nguyên trạng thái (đất đã dọn, lúa đang lớn, lúa chờ mang về). Chạm chỗ khác để chọn lại.' : 'Công trình được chuyển ngay, giữ nguyên mọi thứ bên trong (tiến độ xây, dê trong chuồng...). Chạm chỗ khác để chọn lại.',
      actions: [{ spec: { type: 'moveBuilding', id: p.id, x: p.x, y: p.y }, label: 'Chuyển tới đây', detail: `Ô (${p.x}, ${p.y}) · ${o ? o.w + '×' + o.h : ''} ô`, btn: 'Chuyển' }],
    };
  }
  function ghost(p) { const o = WORLD.byId(p.id); return o ? { x: p.x, y: p.y, ok: true, kind: kindOf(o), w: o.w, h: o.h } : null; }

  return { MOVABLE, GROUPS, movable, kindOf, nameOf, groupOf, groupCentroid, validMove, moveTo, snapFor, guides, arrange, undo, canUndo, panelRow, handles, check, assign, addMoveAction, moveActions, ghost };
})();
window.LAY = LAY;
