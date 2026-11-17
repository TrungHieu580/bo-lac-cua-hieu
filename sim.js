// =====================================================================
//  SIM — mô phỏng: thời gian, dân làng, công việc, săn, canh tác, xây dựng
// =====================================================================
'use strict';
const EV = (() => {
  const h = {};
  return {
    on(n, f) { (h[n] = h[n] || []).push(f); },
    emit(n, d) { (h[n] || []).forEach(f => f(d)); },
  };
})();

const SIM = (() => {
  const T = CFG.TILE;
  const G = CFG.GATHER;
  const GKEY = { bush: 'berry', tree: 'wood', boulder: 'stone', fishspot: 'fish' };
  const RES_NAME = { food: 'thức ăn', wood: 'gỗ', stone: 'đá', seeds: 'hạt giống' };
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const names = (vs) => vs.map(v => v.name).join(', ');

  // ---------------- KHỞI TẠO ----------------
  function freshToday() { return { foodIn: 0, woodIn: 0, stoneIn: 0, seedsIn: 0, eaten: 0, missing: [], built: [], harvests: 0, hunts: [], events: [] }; }

  function newGame() {
    window.S = {
      version: 1, day: 1, hour: CFG.DAY_START, speed: 1,
      weather: 'sun', forecast: rand() < CFG.WEATHER.rainChance ? 'rain' : 'sun',
      res: { ...CFG.START }, villagers: [], hunts: [], log: [], journals: [],
      today: freshToday(), stats: { fields: 0, hutsBuilt: 0 },
      goalReached: false, goalDay: 0, dayEndPending: false, nextHuntId: 1, terrain: [], objects: [], nextId: 1,
    };
    WORLD.generate();
    const ring = WORLD.ringTiles(WORLD.fire());
    CFG.MEMBERS.forEach((m, i) => {
      const [tx, ty] = ring[i % ring.length];
      S.villagers.push({
        id: i + 1, name: m.name, main: m.main, skills: { ...m.skills },
        hair: m.hair, tunic: m.tunic, band: m.band, skin: m.skin,
        x: tx * T + T / 2, y: ty * T + T * 0.75, facing: 0,
        energy: 100, health: 100, morale: 70, bonds: {},
        job: null, carry: null, resting: false, restKind: '', restReason: '', note: '', fedToday: true, task: null,
      });
    });
    // quan hệ ban đầu
    for (const a of S.villagers) for (const b of S.villagers) if (a !== b && a.bonds[b.id] === undefined) {
      const val = 25 + Math.floor(rand() * 20);
      a.bonds[b.id] = val; b.bonds[a.id] = val;
    }
    for (const [n1, n2, val] of CFG.START_BONDS) {
      const a = S.villagers.find(v => v.name === n1), b = S.villagers.find(v => v.name === n2);
      if (a && b) { a.bonds[b.id] = val; b.bonds[a.id] = val; }
    }
    if (window.EXP) EXP.migrate(S);
    log('Bộ lạc của Hiếu dựng trại bên sông. Ngày 1 bắt đầu.');
  }

  function log(text, kind) {
    S.log.push({ d: S.day, h: S.hour, t: text, k: kind || '' });
    if (S.log.length > 400) S.log.splice(0, S.log.length - 400);
    EV.emit('log', text);
  }
  function event(text) { S.today.events.push(text); log(text, 'ev'); }

  // ---------------- TIỆN ÍCH ----------------
  const vById = (id) => S.villagers.find(v => v.id === id);
  const tileOf = (v) => [Math.floor(v.x / T), Math.floor((v.y - 1) / T)];
  const tileCenter = (tx, ty) => [tx * T + T / 2, ty * T + T * 0.75];
  const isAt = (v, tiles) => { const [tx, ty] = tileOf(v); return tiles.some(([x, y]) => x === tx && y === ty); };
  const phase = () => (S.hour >= CFG.EVENING ? 'evening' : 'day');
  const cap = (res) => res === 'seeds' ? CFG.SEED_CAP : CFG.STORAGE_CAP[WORLD.storage().level] + (res === 'food' && window.EXP ? EXP.foodCapBonus() : 0);
  const pop = () => S.villagers.length;
  function foodDays() { return pop() ? S.res.food / pop() : 0; }

  function hutCount() { return S.objects.filter(o => o.type === 'hut').length; }

  function evalGoals() {
    const g = CFG.GOAL;
    const healthy = S.villagers.filter(v => v.health >= CFG.HEALTH.healthyAt).length;
    const r = {
      huts: hutCount(), hutsNeed: g.huts,
      fields: S.stats.fields, fieldsNeed: g.fields,
      food: S.res.food, foodNeed: g.foodDays * pop(),
      healthy, healthyNeed: g.healthy,
    };
    r.ok = r.huts >= r.hutsNeed && r.fields >= r.fieldsNeed && r.food >= r.foodNeed && r.healthy >= r.healthyNeed;
    return r;
  }

  // ---------------- DI CHUYỂN ----------------
  function goTo(v, goals, next, dest) {
    let [sx, sy] = tileOf(v);
    if (!WORLD.walkable(sx, sy) || !WORLD.inMain(sx, sy)) {
      // bị kẹt (ví dụ trong khoảng trống bị lều bao kín): bước ra ô gần nhất của vùng chính
      const [nx, ny] = WORLD.nearestMain(sx, sy);
      if (nx !== sx || ny !== sy) { [v.x, v.y] = tileCenter(nx, ny); sx = nx; sy = ny; }
    }
    const path = WORLD.findPath(sx, sy, goals);
    if (!path) return false;
    const jit = ((v.id * 5) % 7) - 3;
    const pts = path.map(([x, y]) => { const [cx, cy] = tileCenter(x, y); return [cx + jit, cy + (jit >> 1)]; });
    if (dest) pts.push(dest);
    if (!pts.length) { v.task = next || null; return true; }
    v.task = { kind: 'walk', pts, i: 0, next: next || null };
    return true;
  }

  function stepWalk(v, t, dt) {
    let remain = CFG.WALK_TILES_PER_HOUR * T * dt;
    while (remain > 0 && t.i < t.pts.length) {
      const [px, py] = t.pts[t.i];
      const dx = px - v.x, dy = py - v.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.3) v.facing = dx > 0 ? 1 : -1; else if (Math.abs(dy) > 0.3) v.facing = 0;
      if (d <= remain) { v.x = px; v.y = py; remain -= d; t.i++; }
      else { v.x += dx / d * remain; v.y += dy / d * remain; remain = 0; }
    }
    if (t.i >= t.pts.length) v.task = t.next;
  }

  // ---------------- TỐC ĐỘ LÀM VIỆC ----------------
  function workSpeed(v, skill) {
    let f = 0.6 + 0.15 * (v.skills[skill] || 1);
    if (S.weather === 'rain') f *= CFG.WEATHER.rainWorkFactor;
    if (v.energy < 30) f *= 0.75;
    if (v.health < 40) f *= 0.8;
    if (v.morale < 30) f *= 0.85;
    if (v._partner) f *= CFG.BOND.closeSpeed;
    if (window.EXP) f *= EXP.workMult(v, skill);
    return f;
  }

  // ---------------- GIAO VIỆC ----------------
  function leaveHunt(v, reason) {
    if (!v.job || v.job.type !== 'hunt') return;
    const h = S.hunts.find(x => x.id === v.job.hunt);
    if (h) h.members = h.members.filter(id => id !== v.id);
    v.job = null;
    if (reason) v.note = reason;
  }

  function clearJob(v) {
    leaveHunt(v);
    v.job = null;
    if (v.task && v.task.kind !== 'deposit') v.task = null;
    if (v.restKind === 'order') { v.resting = false; v.restKind = ''; v.restReason = ''; }
    v.note = '';
  }

  // Kiểm tra trước khi giao — trả về {ok, msg, info}
  function check(spec, vs) {
    vs = vs || [];
    if (!['rest', 'cancel'].includes(spec.type) && vs.some(v => v.child)) return { ok: false, msg: 'Trẻ con chưa thể làm việc' };
    if (window.EXP && EXP.handles(spec.type)) return EXP.check(spec, vs);
    const o = spec.target ? WORLD.byId(spec.target) : null;
    const reachable = (goals) => vs.filter(v => { let [sx, sy] = tileOf(v); if (!WORLD.walkable(sx, sy) || !WORLD.inMain(sx, sy)) [sx, sy] = WORLD.nearestMain(sx, sy); return !!WORLD.findPath(sx, sy, goals); });
    const needPeople = (n) => vs.length < n ? (n - vs.length === 1 ? `Cần thêm một thành viên` : `Cần thêm ${n - vs.length} thành viên`) : null;
    switch (spec.type) {
      case 'gather': {
        if (!o) return { ok: false, msg: 'Mục tiêu không còn' };
        if (o.stock <= 0) return { ok: false, msg: o.type === 'bush' ? `Bụi quả đã hết, mọc lại sau ${o.regrow} ngày` : 'Điểm này đã cạn' };
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
        if (!reachable(WORLD.ringTiles(o)).length) return { ok: false, msg: 'Không có đường tới mục tiêu' };
        return { ok: true };
      }
      case 'clear': case 'sow': case 'harvest': {
        if (!o) return { ok: false, msg: 'Mục tiêu không còn' };
        if (spec.type === 'sow' && !o.seeded && S.res.seeds < CFG.FARM.seedCost) return { ok: false, msg: `Cần thêm ${CFG.FARM.seedCost - S.res.seeds} hạt giống để gieo (hái quả để có hạt)` };
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
        if (!reachable(WORLD.insideTiles(o)).length) return { ok: false, msg: 'Không có đường tới mục tiêu' };
        return { ok: true };
      }
      case 'buildHut': {
        const v = validHutSpot(spec.x, spec.y);
        if (!v.ok) return v;
        const c = CFG.HUT;
        if (S.res.wood < c.wood) return { ok: false, msg: `Cần thêm ${c.wood - S.res.wood} gỗ để dựng lều` };
        if (S.res.stone < c.stone) return { ok: false, msg: `Cần thêm ${c.stone - S.res.stone} đá để dựng lều` };
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng để dựng lều' };
        return { ok: true };
      }
      case 'build': {
        if (!o) return { ok: false, msg: 'Công trình không còn' };
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
        if (!reachable(WORLD.ringTiles(o)).length) return { ok: false, msg: 'Không có đường tới mục tiêu' };
        return { ok: true };
      }
      case 'upgrade': {
        const st = WORLD.storage();
        if (st.level >= CFG.STORAGE_CAP.length - 1) return { ok: false, msg: 'Kho đã ở cấp cao nhất' };
        if (!st.upgrading) {
          const c = window.EXP ? EXP.upgradeCost() : CFG.STORAGE_UPGRADE;
          if (S.res.wood < c.wood) return { ok: false, msg: `Cần thêm ${c.wood - S.res.wood} gỗ để nâng cấp kho` };
          if (S.res.stone < c.stone) return { ok: false, msg: `Cần thêm ${c.stone - S.res.stone} đá để nâng cấp kho` };
        }
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
        return { ok: true };
      }
      case 'hunt': {
        if (!o) return { ok: false, msg: 'Không có bãi săn' };
        const info = huntEstimate(vs, o);
        if (o.animals <= 0) return { ok: false, msg: 'Bãi săn đã hết thú, chờ vài ngày', info };
        const np = needPeople(CFG.HUNT.minMembers);
        if (np) return { ok: false, msg: `${np} để đi săn`, info };
        if (phase() === 'day' && S.hour > CFG.EVENING - CFG.HUNT.hours - 0.5) return { ok: false, msg: 'Đã quá muộn để đi săn hôm nay', info };
        const tiles = WORLD.insideTiles(o);
        if (reachable(tiles).length < vs.length) return { ok: false, msg: 'Không có đường tới mục tiêu', info };
        return { ok: true, info };
      }
      case 'move': {
        if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
        if (!WORLD.walkable(spec.x, spec.y)) return { ok: false, msg: 'Không thể đi tới ô này' };
        if (!reachable([[spec.x, spec.y]]).length) return { ok: false, msg: 'Không có đường tới mục tiêu' };
        return { ok: true };
      }
      case 'rest': case 'cancel':
        return vs.length ? { ok: true } : { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
    }
    return { ok: false, msg: '?' };
  }

  function assign(spec, vs) {
    const c = check(spec, vs);
    if (!c.ok) return c;
    if (window.EXP && EXP.handles(spec.type)) return EXP.assign(spec, vs, c);
    if (phase() === 'evening' && !['rest', 'cancel'].includes(spec.type)) {
      // Buổi tối: ghi nhận việc cho sáng mai
      c.later = true;
    }
    switch (spec.type) {
      case 'buildHut': {
        S.res.wood -= CFG.HUT.wood; S.res.stone -= CFG.HUT.stone; // trừ vật liệu một lần
        const site = WORLD.addObj({ type: 'site', kind: 'hut', x: spec.x, y: spec.y, w: 2, h: 2, progress: 0, need: CFG.HUT.hours });
        WORLD.rebuild();
        unstickAll();
        log(`Bắt đầu dựng lều mới (−${CFG.HUT.wood} gỗ, −${CFG.HUT.stone} đá).`);
        for (const v of vs) { clearJob(v); v.job = { type: 'build', target: site.id }; }
        c.siteId = site.id;
        break;
      }
      case 'upgrade': {
        const st = WORLD.storage();
        if (!st.upgrading) {
          const cu = window.EXP ? EXP.upgradeCost() : CFG.STORAGE_UPGRADE;
          S.res.wood -= cu.wood; S.res.stone -= cu.stone;
          st.upgrading = { progress: 0, need: cu.hours };
          log(`Bắt đầu nâng cấp kho (−${cu.wood} gỗ, −${cu.stone} đá).`);
        }
        for (const v of vs) { clearJob(v); v.job = { type: 'upgrade', target: st.id }; }
        break;
      }
      case 'sow': {
        const o = WORLD.byId(spec.target);
        if (!o.seeded) { S.res.seeds -= CFG.FARM.seedCost; o.seeded = true; }
        for (const v of vs) { clearJob(v); v.job = { type: 'sow', target: o.id }; }
        break;
      }
      case 'hunt': {
        for (const v of vs) clearJob(v);
        const h = { id: S.nextHuntId++, zone: spec.target, members: vs.map(v => v.id), phase: 'go', progress: 0 };
        S.hunts.push(h);
        for (const v of vs) v.job = { type: 'hunt', hunt: h.id, target: spec.target };
        log(`${names(vs)} lên đường đi săn.`);
        break;
      }
      case 'rest': {
        for (const v of vs) { clearJob(v); v.resting = true; v.restKind = 'order'; v.restReason = 'Được cho nghỉ ngơi'; }
        break;
      }
      case 'cancel': {
        for (const v of vs) clearJob(v);
        break;
      }
      case 'move': {
        for (const v of vs) { clearJob(v); v.job = { type: 'move', x: spec.x, y: spec.y }; }
        break;
      }
      default: {
        for (const v of vs) { clearJob(v); v.job = { type: spec.type, target: spec.target }; }
      }
    }
    return c;
  }

  function validHutSpot(x, y, w, h) {
    w = w || 2; h = h || 2;
    const f = WORLD.fire();
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const tx = x + i, ty = y + j, t = WORLD.ter(tx, ty);
      if (t === null) return { ok: false, msg: 'Ngoài bản đồ' };
      if (!['grass', 'forest', 'dirt', 'rock'].includes(t)) return { ok: false, msg: 'Không thể dựng lều trên địa hình này' };
      if (WORLD.objAt(tx, ty)) return { ok: false, msg: 'Ô này đã có vật cản' };
    }
    if (Math.hypot(x + w / 2 - (f.x + 0.5), y + h / 2 - (f.y + 0.5)) > (window.EXP ? EXP.buildRadius() : CFG.BUILD_RADIUS)) return { ok: false, msg: 'Công trình phải ở gần bếp lửa' };
    return { ok: true };
  }

  function unstickAll() {
    for (const v of S.villagers) {
      const [tx, ty] = tileOf(v);
      if (!WORLD.walkable(tx, ty) || !WORLD.inMain(tx, ty)) { const [nx, ny] = WORLD.nearestMain(tx, ty); [v.x, v.y] = tileCenter(nx, ny); v.task = null; }
    }
  }

  // ---------------- SĂN BẮT ----------------
  function hasClosePair(vs) {
    for (const a of vs) for (const b of vs) if (a !== b && (a.bonds[b.id] || 0) >= CFG.BOND.closeAt) return true;
    return false;
  }
  function huntEstimate(vs, zone) {
    const H = CFG.HUNT, n = vs.length;
    if (!n) return { chance: 0, min: 0, max: 0, injury: 0, risk: '—', n: 0 };
    const sk = vs.reduce((s, v) => s + v.skills.hunt, 0) / n;
    const en = vs.reduce((s, v) => s + v.energy, 0) / n;
    let chance = H.baseChance + H.perSkill * sk + H.perExtra * Math.max(0, n - 2) + (en - 60) / 300 - (S.weather === 'rain' ? H.rainPenalty : 0) + (hasClosePair(vs) ? H.closePairBonus : 0);
    chance = clamp(chance, 0.05, 0.95);
    if (!zone || zone.animals <= 0) chance = 0;
    let max = H.meatBase + H.meatPerMember * n + Math.round(H.meatPerSkill * sk);
    max = Math.max(2, Math.round(max * Math.min(1, (zone ? zone.animals : 0) / 3)));
    const min = Math.max(1, Math.round(max * 0.6));
    const injury = clamp(H.injuryBase - H.injuryPerSkill * sk + (S.weather === 'rain' ? H.injuryRain : 0) - (n - 2) * 0.03, 0.02, 0.6);
    const score = injury + (1 - chance) * 0.5;
    const risk = score < 0.3 ? 'Thấp' : score < 0.45 ? 'Vừa' : 'Cao';
    return { chance, min, max, injury, risk, n };
  }

  function huntMembers(h) { return h.members.map(vById).filter(v => v && v.job && v.job.type === 'hunt' && v.job.hunt === h.id); }

  function cancelHunt(h, reason) {
    for (const v of huntMembers(h)) { v.job = null; v.task = null; v.note = reason; }
    S.hunts = S.hunts.filter(x => x !== h);
    log(reason);
    EV.emit('toast', reason);
  }

  function resolveHunt(h, fraction) {
    const vs = huntMembers(h);
    const zone = WORLD.byId(h.zone);
    const est = huntEstimate(vs, zone);
    const chance = est.chance * (fraction < 1 ? 0.6 : 1);
    const success = rand() < chance;
    const close = hasClosePair(vs);
    if (success) {
      const meat = Math.round((est.min + Math.floor(rand() * (est.max - est.min + 1))) * (window.EXP ? EXP.meatMult() : 1));
      zone.animals = Math.max(0, zone.animals - 1);
      let left = meat;
      vs.forEach((v, i) => {
        const share = i === vs.length - 1 ? left : Math.ceil(meat / vs.length);
        const s = Math.min(share, left); left -= s;
        if (s > 0) v.carry = { food: s, vis: 'meat' };
        v.morale = clamp(v.morale + CFG.MORALE.huntWin, 0, 100);
        v.note = 'Đi săn thành công';
      });
      const msg = `Nhóm săn (${names(vs)}) hạ được thú, mang về ${meat} phần thịt.`;
      S.today.hunts.push(msg); log(msg, 'ev'); EV.emit('toast', `Đi săn thành công: +${meat} thịt (đang mang về)`);
    } else {
      vs.forEach(v => { v.morale = clamp(v.morale + (close ? CFG.MORALE.huntFail / 2 : CFG.MORALE.huntFail), 0, 100); v.note = 'Đi săn về tay không'; });
      const msg = `Nhóm săn (${names(vs)}) trở về tay không.` + (close ? ' Nhờ thân thiết, họ vẫn giữ tinh thần.' : '');
      S.today.hunts.push(msg); log(msg, 'ev'); EV.emit('toast', 'Nhóm săn trở về tay không');
    }
    for (const v of vs) {
      if (rand() < est.injury) {
        const [a, b] = CFG.HUNT.injuryDamage;
        const dmg = a + Math.floor(rand() * (b - a + 1));
        v.health = clamp(v.health - dmg, 1, 100);
        event(`${v.name} bị thương khi đi săn (−${dmg} sức khỏe).`);
      }
      v.job = null; v.task = null;
    }
    bondGroup(vs, 3);
    S.hunts = S.hunts.filter(x => x !== h);
  }

  function updateHunts(dt) {
    for (const h of S.hunts.slice()) {
      const vs = huntMembers(h);
      if (vs.length < CFG.HUNT.minMembers) { cancelHunt(h, 'Nhóm săn thiếu người nên quay về trại'); continue; }
      if (h.phase === 'go') {
        if (vs.every(v => v.task && v.task.kind === 'huntwait')) {
          h.phase = 'hunting';
          vs.forEach(v => v.task = { kind: 'hunting', target: h.zone });
          log(`${names(vs)} bắt đầu vây thú ở đồng cỏ.`);
        }
      } else if (h.phase === 'hunting') {
        h.progress += dt;
        if (h.progress >= CFG.HUNT.hours) resolveHunt(h, 1);
      }
    }
  }

  // ---------------- QUAN HỆ ----------------
  function bondPair(a, b, amt) {
    const before = a.bonds[b.id] || 0;
    const after = clamp(before + amt, 0, 100);
    a.bonds[b.id] = after; b.bonds[a.id] = after;
    if (before < CFG.BOND.closeAt && after >= CFG.BOND.closeAt) event(`${a.name} và ${b.name} trở nên thân thiết.`);
  }
  function bondGroup(vs, amt) { for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) bondPair(vs[i], vs[j], amt); }

  function computeGroups(dt) {
    const groups = {};
    for (const v of S.villagers) {
      v._partner = false;
      const t = v.task;
      if (t && (t.kind === 'work' || t.kind === 'hunting')) {
        const key = t.kind + ':' + t.target;
        (groups[key] = groups[key] || []).push(v);
      }
    }
    for (const k in groups) {
      const g = groups[k];
      if (g.length < 2) continue;
      bondGroup(g, CFG.BOND.perHourTogether * dt);
      for (const a of g) for (const b of g) if (a !== b && (a.bonds[b.id] || 0) >= CFG.BOND.closeAt) a._partner = true;
    }
    return groups;
  }

  function coworkers(v) {
    if (!v.job) return [];
    return S.villagers.filter(o => o !== v && o.job && o.job.type === v.job.type && (o.job.target === v.job.target) && (v.job.type !== 'hunt' || o.job.hunt === v.job.hunt));
  }

  // ---------------- LẬP KẾ HOẠCH HÀNH ĐỘNG ----------------
  function jobDone(v, msg) { v.job = null; v.task = null; if (msg) v.note = msg; }
  function jobFail(v, msg) { v.job = null; v.task = null; v.note = msg; EV.emit('toast', `${v.name}: ${msg}`); }

  function seatFor(v) {
    const all = WORLD.ringTiles(WORLD.fire());
    const ring = all.filter(([x, y]) => WORLD.inMain(x, y));
    return ring.length ? ring[(v.id - 1) % ring.length] : (all[0] || null);
  }
  function goFire(v, kind) {
    const seat = seatFor(v);
    const next = { kind };
    if (!seat) { v.task = next; return; }
    if (isAt(v, [seat])) { v.task = next; return; }
    if (!goTo(v, [seat], next) && !goTo(v, WORLD.ringTiles(WORLD.fire()), next)) v.task = next;
  }
  function goDeposit(v) {
    const ring = WORLD.ringTiles(WORLD.storage());
    if (isAt(v, ring)) { v.task = { kind: 'deposit' }; return; }
    if (!goTo(v, ring, { kind: 'deposit' })) { v.task = { kind: 'idle', time: 0.5 }; v.note = 'Không có đường tới kho'; }
  }
  // ---------------- NGỦ TRONG LỀU ----------------
  const bedtime = () => S.hour >= CFG.BEDTIME;
  function bedsOf(h) { return h.type === 'longhouse' ? CFG.BUILDINGS.longhouse.beds : CFG.HUT.sleepers; }
  function doorTiles(h) {
    const y = h.y + h.h - 1;
    return h.w >= 3 ? [[h.x + 1, y]] : [[h.x, y], [h.x + 1, y]];
  }
  // Chia chỗ ngủ: mỗi cặp vợ chồng một lều riêng, con nhỏ ngủ cùng cha mẹ, người còn lại vào lều chung / nhà dài
  function assignBeds() {
    const huts = S.objects.filter(o => o.type === 'hut' || o.type === 'longhouse');
    const free = new Map(huts.map(h => [h.id, bedsOf(h)]));
    const occ = new Map(huts.map(h => [h.id, 0]));
    const put = (v, h) => { v.bed = h.id; free.set(h.id, free.get(h.id) - 1); occ.set(h.id, occ.get(h.id) + 1); };
    S.villagers.forEach(v => { v.bed = 0; });
    const coupleHut = new Set();
    for (const f of S.villagers.filter(v => !v.child && v.partner && v.sex === 'f')) {
      const m = vById(f.partner);
      if (!m || m.bed || f.bed) continue;
      const h = huts.find(h => h.type === 'hut' && occ.get(h.id) === 0 && free.get(h.id) >= 2);
      if (!h) continue;
      put(m, h); put(f, h); coupleHut.add(h.id);
    }
    for (const c of S.villagers.filter(v => v.child && !v.bed && v.parents)) {
      for (const pid of c.parents) { const p = vById(pid); if (p && p.bed && free.get(p.bed) > 0) { put(c, WORLD.byId(p.bed)); break; } }
    }
    const order = huts.slice().sort((a, b) => (coupleHut.has(a.id) ? 1 : 0) - (coupleHut.has(b.id) ? 1 : 0));
    for (const v of S.villagers.filter(v => !v.bed).sort((a, b) => a.energy - b.energy)) {
      const h = order.find(h => free.get(h.id) > 0);
      if (h) put(v, h);
    }
  }
  function goBed(v) {
    if (v.bed === undefined) assignBeds();
    const h = v.bed ? WORLD.byId(v.bed) : null;
    if (!h) return goFire(v, 'sleepout');
    const doors = doorTiles(h), next = { kind: 'enter', hut: h.id };
    if (isAt(v, doors)) { v.task = next; return; }
    if (!goTo(v, doors, next)) v.task = next; // không tìm được đường thì vẫn cho vào lều
  }
  // Những cặp vợ chồng đã thật sự cùng vào một lều riêng (không có người lớn nào khác) trong đêm
  function nightCouples() {
    const out = [];
    for (const f of S.villagers) {
      if (f.child || f.sex !== 'f' || !f.partner || !f.inside) continue;
      const m = vById(f.partner);
      if (!m || m.inside !== f.inside) continue;
      const h = WORLD.byId(f.inside);
      if (!h || h.type !== 'hut') continue;
      if (S.villagers.some(o => o !== f && o !== m && !o.child && o.inside === f.inside)) continue;
      out.push([m.id, f.id]);
    }
    return out;
  }
  const asleep = (v) => v.task && (v.task.kind === 'sleep' || v.task.kind === 'sleepout');

  function idle(v) {
    const f = WORLD.fire();
    for (let k = 0; k < 6; k++) {
      const tx = f.x + Math.round((rand() - 0.5) * 6), ty = f.y + Math.round((rand() - 0.5) * 5);
      if (WORLD.walkable(tx, ty) && goTo(v, [[tx, ty]], { kind: 'idle', time: 0.6 + rand() })) return;
    }
    v.task = { kind: 'idle', time: 1 };
  }

  function plan(v) {
    if (v.child && phase() !== 'evening') { if (v.carry) return goDeposit(v); return idle(v); }
    if (phase() === 'evening') {
      if (v.carry) return goDeposit(v);
      if (bedtime()) return goBed(v);
      return goFire(v, 'sit');
    }
    if (v.health < CFG.HEALTH.sickAt && v.restKind !== 'sick') {
      leaveHunt(v);
      v.resting = true; v.restKind = 'sick'; v.restReason = 'Ốm yếu — cần nghỉ hồi sức';
      event(`${v.name} ốm yếu nên phải nghỉ.`);
    }
    if (!v.resting && v.energy < CFG.ENERGY.tiredAt) {
      leaveHunt(v, 'Bỏ đi săn vì quá mệt');
      v.resting = true; v.restKind = 'tired'; v.restReason = 'Quá mệt — bỏ việc để nghỉ bên lửa';
      event(`${v.name} quá mệt nên bỏ việc để nghỉ.`);
    }
    if (v.resting) { if (v.carry) return goDeposit(v); return goFire(v, 'rest'); }
    if (v.carry) return goDeposit(v);
    const j = v.job;
    if (!j) return idle(v);
    const o = j.target ? WORLD.byId(j.target) : null;
    switch (j.type) {
      case 'gather': {
        if (!o || o.stock <= 0) return jobDone(v, o && o.type === 'bush' ? 'Bụi quả đã hết quả' : 'Điểm tài nguyên đã cạn');
        const g = G[GKEY[o.type]];
        const ring = WORLD.ringTiles(o);
        const work = { kind: 'work', mode: 'gather', target: o.id, need: g.hours, done: 0, skill: g.skill };
        if (isAt(v, ring)) { v.task = work; return; }
        if (!goTo(v, ring, work)) return jobFail(v, 'Không có đường tới mục tiêu');
        return;
      }
      case 'clear': case 'sow': case 'harvest': {
        if (!o) return jobDone(v);
        let mode = j.type, need = 0;
        if (j.type === 'clear') { if (o.state !== 'wild') return jobDone(v, 'Ruộng đã dọn xong'); need = CFG.FARM.clearHours; }
        if (j.type === 'sow') { if (o.state !== 'cleared' || !o.seeded) return jobDone(v, 'Ruộng đã gieo xong'); need = CFG.FARM.sowHours; }
        if (j.type === 'harvest') {
          if (o.state === 'ready') need = CFG.FARM.harvestHours;
          else if (o.yieldLeft > 0) { mode = 'pickup'; need = 0.15; }
          else return jobDone(v, 'Đã mang hết lương thực về kho');
        }
        const tiles = WORLD.insideTiles(o);
        if (!tiles.length) return jobFail(v, 'Không có đường tới mục tiêu');
        const pref = tiles[v.id % tiles.length];
        const work = { kind: 'work', mode, target: o.id, need, done: 0, skill: 'farm' };
        if (isAt(v, tiles)) { v.task = work; return; }
        if (!goTo(v, [pref], work) && !goTo(v, tiles, work)) return jobFail(v, 'Không có đường tới mục tiêu');
        return;
      }
      case 'build': case 'upgrade': {
        if (j.type === 'build' && (!o || o.type !== 'site')) return jobDone(v, 'Công trình đã hoàn thành');
        if (j.type === 'upgrade' && (!o || !o.upgrading)) return jobDone(v, 'Kho đã nâng cấp xong');
        const ring = WORLD.ringTiles(o);
        const work = { kind: 'work', mode: j.type, target: o.id, need: 0, done: 0, skill: 'build' };
        if (isAt(v, ring)) { v.task = work; return; }
        if (!goTo(v, ring, work)) return jobFail(v, 'Không có đường tới mục tiêu');
        return;
      }
      case 'hunt': {
        const h = S.hunts.find(x => x.id === j.hunt);
        if (!h || !o) return jobDone(v);
        if (h.phase === 'hunting') { v.task = { kind: 'hunting', target: o.id }; return; }
        const tiles = WORLD.insideTiles(o);
        if (isAt(v, tiles)) { v.task = { kind: 'huntwait', target: o.id }; return; }
        const k = h.members.indexOf(v.id);
        const spot = [o.x + 5 + (k % 3), o.y + 1 + Math.floor(k / 3)];
        if (!goTo(v, [spot], { kind: 'huntwait', target: o.id }) && !goTo(v, tiles, { kind: 'huntwait', target: o.id })) return jobFail(v, 'Không có đường tới mục tiêu');
        return;
      }
      case 'move': {
        if (isAt(v, [[j.x, j.y]])) { v.job = null; v.note = 'Đã tới nơi'; v.task = { kind: 'idle', time: 99 }; return; }
        if (!goTo(v, [[j.x, j.y]], null)) return jobFail(v, 'Không có đường tới mục tiêu');
        return;
      }
    }
    v.job = null;
  }

  // ---------------- HOÀN THÀNH CÔNG VIỆC ----------------
  function deplete(o) {
    if (o.type === 'tree') {
      WORLD.removeObj(o);
      WORLD.addObj({ type: 'stump', x: o.x, y: o.y, w: 1, h: 1 });
      log('Một cây đã bị đốn hết gỗ.');
    } else if (o.type === 'boulder') {
      WORLD.removeObj(o);
      log('Một tảng đá đã được khai thác hết.');
    } else if (o.type === 'bush') {
      o.regrow = G.berry.regrowDays;
    }
  }

  function finishWork(v, t, o) {
    switch (t.mode) {
      case 'gather': {
        const g = G[GKEY[o.type]];
        const amt = Math.min(g.perTrip, o.stock);
        if (amt <= 0) return jobDone(v, 'Điểm tài nguyên đã cạn');
        o.stock -= amt;
        const carry = { [g.res]: amt, vis: g.res === 'food' ? 'berry' : g.res };
        if (o.type === 'bush' && o.seeds > 0) { carry.seeds = 1; o.seeds--; }
        v.carry = carry;
        v.task = null;
        if (o.stock <= 0) deplete(o);
        return;
      }
      case 'pickup': {
        const amt = Math.min(CFG.FARM.carry, o.yieldLeft);
        o.yieldLeft -= amt;
        if (amt > 0) v.carry = { food: amt, vis: 'grain' };
        v.task = null;
        return;
      }
    }
  }

  function completeShared(o, mode) {
    if (mode === 'clear') {
      o.state = 'cleared'; o.progress = 0;
      log('Một ruộng đã được dọn sạch, sẵn sàng gieo hạt.');
      EV.emit('plot', o); EV.emit('toast', 'Đã dọn xong ruộng — có thể gieo hạt');
    } else if (mode === 'sow') {
      o.state = 'sown'; o.growth = 0; o.seeded = false; o.progress = 0;
      log('Ruộng đã được gieo hạt. Cây cần vài ngày để lớn, mưa giúp lớn nhanh hơn.');
      EV.emit('plot', o); EV.emit('toast', 'Đã gieo hạt');
    } else if (mode === 'harvest') {
      o.state = 'cleared'; o.progress = 0; o.yieldLeft = CFG.FARM.yield; o.seeded = false;
      S.stats.fields++; S.today.harvests++;
      event(`Thu hoạch xong một ruộng: ${CFG.FARM.yield} phần lương thực đang được mang về kho.`);
      EV.emit('plot', o); EV.emit('toast', 'Thu hoạch xong ruộng!');
    } else if (mode === 'build') {
      WORLD.removeObj(o);
      const kind = o.kind || 'hut';
      const name = window.EXP ? EXP.bname(kind) : 'Lều';
      WORLD.addObj({ type: kind, x: o.x, y: o.y, w: o.w, h: o.h });
      WORLD.rebuild();
      if (kind === 'hut') S.stats.hutsBuilt++;
      S.villagers.forEach(v => v.morale = clamp(v.morale + CFG.MORALE.built, 0, 100));
      S.today.built.push(name);
      event(kind === 'hut' ? 'Một chiếc lều mới đã dựng xong! Thành viên ngủ trong lều sẽ hồi phục tốt hơn.' : `${name} đã xây xong!`);
      EV.emit('toast', `${name} đã hoàn thành!`);
      unstickAll();
    } else if (mode === 'upgrade') {
      o.level++; o.upgrading = null;
      S.today.built.push('Nâng cấp kho');
      event(`Kho đã được nâng cấp, sức chứa ${CFG.STORAGE_CAP[o.level]} mỗi loại.`);
      EV.emit('toast', 'Kho đã được nâng cấp!');
    }
    // ai đang làm việc này thì xong việc
    for (const v of S.villagers) if (v.task && v.task.kind === 'work' && v.task.target === o.id && v.task.mode === mode) v.task = null;
  }

  function doWork(v, t, dt) {
    const o = WORLD.byId(t.target);
    if (!o) { v.task = null; return; }
    const cx = (o.x + o.w / 2) * T;
    if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1;
    const f = workSpeed(v, t.skill);
    const amt = f * dt;
    switch (t.mode) {
      case 'gather': case 'pickup':
        t.done += amt;
        if (t.done >= t.need) finishWork(v, t, o);
        return;
      case 'clear':
        if (o.state !== 'wild') { v.task = null; return; }
        o.progress += amt; if (o.progress >= CFG.FARM.clearHours) completeShared(o, 'clear'); return;
      case 'sow':
        if (o.state !== 'cleared' || !o.seeded) { v.task = null; return; }
        o.progress += amt; if (o.progress >= CFG.FARM.sowHours) completeShared(o, 'sow'); return;
      case 'harvest':
        if (o.state !== 'ready') { v.task = null; return; }
        o.progress += amt; if (o.progress >= CFG.FARM.harvestHours) completeShared(o, 'harvest'); return;
      case 'build':
        if (o.type !== 'site') { v.task = null; return; }
        o.progress += amt; if (o.progress >= o.need) completeShared(o, 'build'); return;
      case 'upgrade':
        if (!o.upgrading) { v.task = null; return; }
        o.upgrading.progress += amt; if (o.upgrading.progress >= o.upgrading.need) completeShared(o, 'upgrade'); return;
    }
  }

  function deposit(v) {
    const st = WORLD.storage();
    const c = v.carry;
    v.carry = null;
    if (!c) return;
    let offset = 0;
    for (const res of ['food', 'wood', 'stone', 'seeds']) {
      const amt = c[res];
      if (!amt) continue;
      const room = Math.max(0, cap(res) - S.res[res]);
      const add = Math.min(room, amt);
      S.res[res] += add;
      S.today[res + 'In'] += add;
      if (add > 0) EV.emit('float', { x: (st.x + 1) * T, y: st.y * T - offset, text: `+${add}`, icon: res });
      offset += 9;
      if (add < amt && (deposit._d !== S.day || S.hour - deposit._h > 3)) { deposit._d = S.day; deposit._h = S.hour; EV.emit('toast', `Kho đầy — mất ${amt - add} ${RES_NAME[res]}. Hãy nâng cấp kho hoặc xây kho lương.`); }
    }
  }

  // ---------------- CẬP NHẬT ----------------
  function updateVillager(v, dt) {
    if (!v.task) plan(v);
    const t = v.task;
    const E = CFG.ENERGY;
    if (!t) { v.energy = clamp(v.energy + E.idleRegen * dt, 0, 100); return; }
    if ((t.kind === 'work' || t.kind === 'hunting') && (v.energy < E.tiredAt || v.health < CFG.HEALTH.sickAt) && !v.resting) { v.task = null; return; }
    switch (t.kind) {
      case 'walk': stepWalk(v, t, dt); v.energy = clamp(v.energy - E.walkDrain * dt, 0, 100); break;
      case 'work': doWork(v, t, dt); v.energy = clamp(v.energy - E.workDrain * dt, 0, 100); break;
      case 'hunting': v.energy = clamp(v.energy - E.workDrain * dt, 0, 100); break;
      case 'deposit': deposit(v); v.task = null; break;
      case 'rest': {
        v.energy = clamp(v.energy + E.restRegen * dt, 0, 100);
        if (v.restKind === 'sick') v.health = clamp(v.health + 2 * dt, 0, 100);
        if (phase() === 'evening') { v.task = null; break; }
        const done = v.restKind === 'sick' ? (v.health >= CFG.HEALTH.sickAt + 10 && v.energy >= E.resumeAt)
          : v.restKind === 'order' ? v.energy >= 98 : v.energy >= E.resumeAt;
        if (done) {
          if (v.resting) log(`${v.name} đã nghỉ đủ và quay lại làm việc.`);
          v.resting = false; v.restKind = ''; v.restReason = ''; v.task = null;
        }
        break;
      }
      case 'sit': case 'huntwait':
        v.energy = clamp(v.energy + E.idleRegen * dt, 0, 100);
        if (t.kind === 'sit' && phase() === 'day') v.task = null;
        break;
      case 'enter':
        v.inside = t.hut; v.task = { kind: 'sleep' };
        break;
      case 'sleep': case 'sleepout':
        v.energy = clamp(v.energy + E.idleRegen * dt, 0, 100);
        break;
      case 'idle':
        v.energy = clamp(v.energy + E.idleRegen * dt, 0, 100);
        t.time -= dt;
        if (t.time <= 0 || v.job) v.task = null;
        break;
      default: v.task = null;
    }
  }

  function onEvening() {
    for (const h of S.hunts.slice()) {
      if (h.phase === 'hunting' && h.progress >= CFG.HUNT.hours * 0.5) resolveHunt(h, h.progress / CFG.HUNT.hours);
      else cancelHunt(h, 'Trời tối, nhóm săn quay về trại');
    }
    for (const v of S.villagers) if (v.task && v.task.kind !== 'deposit') v.task = null;
    log('Chiều tối — cả bộ lạc quây quần về bên bếp lửa.');
    EV.emit('toast', 'Chiều tối — mọi người về bên bếp lửa');
  }

  function onBedtime() {
    assignBeds();
    for (const v of S.villagers) if (v.task && v.task.kind !== 'deposit') v.task = null;
    const out = S.villagers.filter(v => !v.bed).length;
    log(out ? `Đêm xuống — mọi người về lều ngủ; ${out} người không còn chỗ phải ngủ ngoài trời bên lửa.` : 'Đêm xuống — mọi người về lều của mình để ngủ.');
  }

  function onMeal() {
    const order = S.villagers.slice().sort((a, b) => a.health - b.health);
    for (const v of order) {
      if (S.res.food >= 1) {
        S.res.food -= 1; S.today.eaten++; v.fedToday = true;
        v.health = clamp(v.health + CFG.HEALTH.fed, 0, 100);
        v.morale = clamp(v.morale + CFG.MORALE.fed, 0, 100);
      } else {
        v.fedToday = false; S.today.missing.push(v.name);
        v.health = clamp(v.health + CFG.HEALTH.hungry, 1, 100);
        v.morale = clamp(v.morale + CFG.MORALE.hungry, 0, 100);
      }
    }
    const f = WORLD.fire();
    EV.emit('float', { x: (f.x + 0.5) * T, y: f.y * T - 6, text: `−${S.today.eaten}`, icon: 'food' });
    if (S.today.missing.length) { event(`Bữa tối thiếu thức ăn: ${S.today.missing.join(', ')} không có khẩu phần.`); EV.emit('toast', `Thiếu ăn! ${S.today.missing.join(', ')} nhịn đói`); }
    else log(`Bữa tối: cả bộ lạc ăn ${S.today.eaten} khẩu phần.`);
  }

  const STORIES = [
    '{a} kể cho {b} nghe về đàn hươu bên đồng cỏ.',
    '{a} dạy {b} cách nhóm lửa bằng đá lửa.',
    '{a} và {b} cùng vá lại tấm da thú.',
    '{a} và {b} hát bài ca của bộ lạc bên đống lửa.',
    '{a} chỉ cho {b} chỗ có nhiều quả chín ven rừng.',
    '{a} kể chuyện con cá lớn dưới sông khiến {b} bật cười.',
    '{a} và {b} cùng vẽ hình con thú lên phiến đá.',
  ];
  function onChat() {
    const vs = S.villagers;
    let a = vs[Math.floor(rand() * vs.length)];
    let b = vs[Math.floor(rand() * vs.length)];
    if (window.EXP) { const pr = EXP.chatPair(a, b); a = pr[0]; b = pr[1]; }
    if (a === b) b = vs[(vs.indexOf(a) + 1) % vs.length];
    bondPair(a, b, CFG.BOND.chat);
    vs.forEach(v => v.morale = clamp(v.morale + CFG.MORALE.fire, 0, 100));
    const s = STORIES[Math.floor(rand() * STORIES.length)].replace('{a}', a.name).replace('{b}', b.name);
    event(s);
  }

  function endDay() {
    const goals = evalGoals();
    const j = {
      day: S.day, ...JSON.parse(JSON.stringify(S.today)), weather: S.weather, forecast: S.forecast,
      food: S.res.food, goals, newlyReached: false, failed: false,
    };
    if (goals.ok && !S.goalReached) { S.goalReached = true; S.goalDay = S.day; j.newlyReached = true; log(`Bộ lạc đã hoàn thành mục tiêu vào ngày ${S.day}!`, 'ev'); }
    if (S.day === CFG.GOAL.day && !S.goalReached) j.failed = true;
    S.journals.push(j);
    S.dayEndPending = true;
    EV.emit('dayEnd', j);
  }

  function startNewDay() {
    if (!S.dayEndPending) return;
    S.dayEndPending = false;
    // Ngủ: ai có chỗ trong lều / nhà dài thì hồi sức tốt, ai không có phải ngủ ngoài trời
    if (S.villagers.some(v => v.bed === undefined)) assignBeds();
    S.nightCouples = nightCouples();
    const E = CFG.ENERGY;
    S.villagers.forEach(v => {
      const hut = v.bed ? WORLD.byId(v.bed) : null;
      const inHut = !!hut;
      if (inHut) v.energy = clamp(v.energy + E.sleepHut, 0, 100);
      else if (S.weather === 'rain') { v.energy = clamp(v.energy + E.sleepRain, 0, 100); v.morale = clamp(v.morale + CFG.MORALE.rainNight, 0, 100); }
      else v.energy = clamp(v.energy + E.sleepOutside, 0, 100);
      if (v.fedToday) v.health = clamp(v.health + CFG.HEALTH.night, 0, 100);
      v._hut = hut ? hut.id : null;
      delete v.bed; v.inside = 0;
      if (v.restKind !== 'sick') { v.resting = false; v.restKind = ''; v.restReason = ''; }
      v.task = null;
    });
    // Thiên nhiên qua đêm
    for (const o of S.objects) {
      if (o.type === 'bush') {
        if (o.stock <= 0 && o.regrow > 0) { o.regrow--; if (o.regrow <= 0) { o.stock = G.berry.stock; o.seeds = Math.max(o.seeds, 1); } }
        else if (o.stock > 0 && o.stock < G.berry.stock) o.stock++;
      } else if (o.type === 'plot' && (o.state === 'sown' || o.state === 'growing')) {
        o.growth += S.weather === 'rain' ? CFG.FARM.rainGrowth : CFG.FARM.sunGrowth;
        o.state = o.growth >= CFG.FARM.growDays ? 'ready' : 'growing';
        if (o.state === 'ready') log('Một ruộng đã chín vàng, sẵn sàng thu hoạch!', 'ev');
        EV.emit('plot', o);
      } else if (o.type === 'huntzone') {
        o.animals = Math.min(CFG.HUNT.animalsMax, o.animals + CFG.HUNT.animalsRegen);
      }
    }
    // Ngày mới
    S.day++;
    S.hour = CFG.DAY_START;
    S.weather = S.forecast;
    S.forecast = rand() < CFG.WEATHER.rainChance ? 'rain' : 'sun';
    S.today = freshToday();
    // vị trí buổi sáng
    for (const v of S.villagers) {
      const hut = v._hut ? WORLD.byId(v._hut) : null;
      let tile = hut ? WORLD.nearestWalkable(hut.x + 1, hut.y + 2) : seatFor(v);
      if (tile) [v.x, v.y] = tileCenter(tile[0], tile[1]);
      delete v._hut;
    }
    if (window.EXP) EXP.overnight();
    unstickAll();
    log(`Ngày ${S.day} bắt đầu. Thời tiết: ${S.weather === 'rain' ? 'mưa' : 'nắng'}.`);
    EV.emit('newDay');
  }

  function tick(dt) {
    if (S.dayEndPending) return;
    const prev = S.hour;
    S.hour += dt;
    if (prev < CFG.EVENING && S.hour >= CFG.EVENING) onEvening();
    if (prev < CFG.MEAL && S.hour >= CFG.MEAL) onMeal();
    if (prev < CFG.CHAT && S.hour >= CFG.CHAT) onChat();
    if (prev < CFG.BEDTIME && S.hour >= CFG.BEDTIME) onBedtime();
    computeGroups(dt);
    for (const v of S.villagers) updateVillager(v, dt);
    updateHunts(dt);
    if (window.EXP) EXP.tick(dt);
    if (S.hour >= CFG.DAY_END && (S.hour >= CFG.NIGHT_MAX || S.villagers.every(asleep))) endDay();
  }

  function step(hours) {
    while (hours > 0 && !S.dayEndPending) {
      const d = Math.min(hours, 0.02);
      tick(d);
      hours -= d;
    }
  }

  // ---------------- LƯU / TẢI ----------------
  const KEY = 'bolac_cua_hieu_save_v1';
  function save() {
    try {
      const data = JSON.stringify(S, (k, v) => (k === 'task' || k === '_partner' || k === '_hut') ? undefined : v);
      localStorage.setItem(KEY, data);
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || d.version !== 1 || !Array.isArray(d.objects)) return false;
      window.S = d;
      if (window.EXP) EXP.migrate(S);
      S.villagers.forEach(v => { v.task = null; });
      WORLD.rebuild();
      unstickAll();
      return true;
    } catch (e) { return false; }
  }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) { } }

  // mô tả việc đang làm (cho giao diện)
  function jobText(v) {
    const t0 = v.task;
    if (t0 && t0.kind === 'sleep' && v.partner) { const m = vById(v.partner); if (m && m.inside === v.inside && WORLD.byId(v.inside)?.type === 'hut') return `Vợ chồng chung lều riêng với ${m.name}`; }
    if (t0 && t0.kind === 'sleep') { const h = WORLD.byId(v.inside); return h && h.type === 'longhouse' ? 'Đang ngủ trong nhà dài' : 'Đang ngủ trong lều'; }
    if (t0 && t0.kind === 'sleepout') return 'Ngủ ngoài trời bên lửa (thiếu chỗ ngủ)';
    if (bedtime() && v.bed && !v.carry) return 'Đang về lều ngủ';
    if (v.child) return `Trẻ con · lớn sau ${Math.max(0, v.growDay - S.day)} ngày`;
    if (v.resting) return v.restReason || 'Đang nghỉ';
    const t = v.task;
    if (phase() === 'evening') return t && t.kind === 'sit' ? 'Quây quần bên lửa' : v.carry ? 'Mang đồ về kho' : 'Về bên bếp lửa';
    if (!v.job) return v.carry ? 'Mang đồ về kho' : 'Rảnh rỗi';
    const o = v.job.target ? WORLD.byId(v.job.target) : null;
    const where = o ? ({ tree: 'cây', bush: 'bụi quả', boulder: 'tảng đá', plot: 'ruộng', site: 'lều', storage: 'kho', huntzone: 'đồng cỏ', fishspot: 'bến cá' }[o.type] || '') : '';
    let s = {
      gather: o ? G[GKEY[o.type]]?.label || 'Thu gom' : 'Thu gom', clear: 'Dọn đất', sow: 'Gieo hạt', harvest: 'Thu hoạch',
      build: 'Xây dựng', upgrade: 'Nâng cấp kho', hunt: 'Đi săn', move: 'Di chuyển',
    }[v.job.type] || v.job.type;
    if (v.carry) s += ' · đang mang đồ về';
    else if (t && t.kind === 'walk') s += ' · đang đi';
    else if (t && t.kind === 'huntwait') s += ' · chờ đồng đội';
    return s + (where && v.job.type !== 'build' ? ` (${where})` : '') + (v.job.auto || !S.auto ? '' : ' · giao tay');
  }

  function taskProgress(v) {
    const t = v.task;
    if (!t) return null;
    if (t.kind === 'work') {
      const o = WORLD.byId(t.target);
      if (!o) return null;
      if (t.mode === 'gather' || t.mode === 'pickup') return t.done / t.need;
      if (t.mode === 'clear') return o.progress / CFG.FARM.clearHours;
      if (t.mode === 'sow') return o.progress / CFG.FARM.sowHours;
      if (t.mode === 'harvest') return o.progress / CFG.FARM.harvestHours;
      if (t.mode === 'build') return o.progress / o.need;
      if (t.mode === 'upgrade') return o.upgrading ? o.upgrading.progress / o.upgrading.need : 1;
    }
    if (t.kind === 'hunting') { const h = S.hunts.find(x => x.id === v.job?.hunt); return h ? h.progress / CFG.HUNT.hours : null; }
    return null;
  }

  return {
    newGame, tick, step, save, load, hasSave, clearSave, assign, check, huntEstimate, validHutSpot,
    evalGoals, foodDays, hutCount, jobText, taskProgress, coworkers, startNewDay, phase, cap, tileOf, vById, log, event, unstickAll, GKEY,
    bedtime, assignBeds, doorTiles,
  };
})();
