// =====================================================================
//  LAY — di chuyển công trình để người chơi tự sắp xếp kiến trúc làng
// =====================================================================
'use strict';
const LAY = (() => {
  const T = CFG.TILE;
  const MOVABLE = ['storage', 'hut', 'longhouse', 'rack', 'granary', 'healer', 'workshop', 'watchtower', 'sickhouse', 'kitchen', 'pen', 'temple', 'stonering', 'greathall', 'site'];
  const kindOf = (o) => o.type === 'site' ? (o.kind || 'hut') : o.type;
  function nameOf(o) {
    if (o.type === 'storage') return 'Kho chung';
    if (o.type === 'site') return `công trường ${EXP.bname(o.kind || 'hut')}`;
    return EXP.bname(o.type);
  }
  const movable = (o) => !!o && MOVABLE.includes(o.type);
  const occupied = (o) => S.villagers.some(v => v.inside === o.id);

  function validMove(id, x, y) {
    const o = WORLD.byId(id);
    if (!movable(o)) return { ok: false, msg: 'Không di chuyển được công trình này' };
    if (x === o.x && y === o.y) return { ok: false, msg: 'Đây là chỗ cũ' };
    const f = WORLD.fire();
    for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) {
      const tx = x + i, ty = y + j, t = WORLD.ter(tx, ty);
      if (t === null) return { ok: false, msg: 'Ngoài bản đồ' };
      if (!['grass', 'forest', 'dirt', 'rock', 'meadow'].includes(t)) return { ok: false, msg: 'Không đặt được trên địa hình này' };
      const b = WORLD.objAt(tx, ty);
      if (b && b !== o) return { ok: false, msg: 'Chỗ này đã có vật cản' };
    }
    if (Math.hypot(x + o.w / 2 - (f.x + 0.5), y + o.h / 2 - (f.y + 0.5)) > EXP.buildRadius()) return { ok: false, msg: 'Công trình phải ở gần bếp lửa' };
    return { ok: true };
  }
  function moveTo(o, x, y) {
    const ox = o.x, oy = o.y;
    o.x = x; o.y = y;
    WORLD.rebuild();
    if (o.type === 'storage' && !WORLD.ringTiles(o).some(([a, c]) => WORLD.inMain(a, c))) { o.x = ox; o.y = oy; WORLD.rebuild(); return { ok: false, msg: 'Kho đặt ở đó sẽ không có đường tới' }; }
    for (const v of S.villagers) { // ai đang đi hoặc làm việc ở công trình này thì tính lại đường
      const t = v.task;
      if (t && (t.kind === 'walk' || t.target === o.id || t.house === o.id || t.hut === o.id)) v.task = null;
    }
    SIM.unstickAll();
    if (typeof RENDER !== 'undefined' && RENDER.rebuildGround) RENDER.rebuildGround();
    SIM.log(`Đã chuyển ${nameOf(o)} tới chỗ mới.`);
    return { ok: true };
  }

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

  // thêm nút "Di chuyển" vào bảng của mọi công trình di chuyển được
  function addMoveAction(p, out) {
    const o = p.kind === 'obj' ? WORLD.byId(p.id) : null;
    if (!movable(o)) return;
    out.actions.push({ spec: { type: 'startMove', id: o.id }, label: `Di chuyển ${nameOf(o)}`, detail: 'Chọn chỗ mới trên bản đồ (không tốn vật liệu, chuyển ngay). Dùng để sắp xếp lại kiến trúc làng.', btn: 'Di chuyển' });
  }
  function moveActions(p) {
    const o = WORLD.byId(p.id);
    return {
      title: `Chuyển ${o ? nameOf(o) : 'công trình'} tới đây?`,
      desc: 'Công trình được chuyển ngay, giữ nguyên mọi thứ bên trong (tiến độ xây, dê trong chuồng...). Chạm chỗ khác để chọn lại.',
      actions: [{ spec: { type: 'moveBuilding', id: p.id, x: p.x, y: p.y }, label: 'Chuyển tới đây', detail: `Ô (${p.x}, ${p.y}) · ${o ? o.w + '×' + o.h : ''} ô`, btn: 'Chuyển' }],
    };
  }
  function ghost(p) { const o = WORLD.byId(p.id); return o ? { x: p.x, y: p.y, ok: true, kind: kindOf(o), w: o.w, h: o.h } : null; }

  return { MOVABLE, movable, kindOf, nameOf, validMove, moveTo, handles, check, assign, addMoveAction, moveActions, ghost };
})();
window.LAY = LAY;
