// =====================================================================
//  TRB — cấp bộ lạc (= cấp lửa trại), tù trưởng / tiên tri / vu sư, mỏ đá
// =====================================================================
'use strict';
const TRB = (() => {
  const T = CFG.TILE, TR = CFG.TRIBE, RO = CFG.ROLES, LV = TR.levels;
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ROLE_NAME = { chief: 'Tù trưởng', prophet: 'Tiên tri', shaman: 'Vu sư' };

  // ---------------- DỮ LIỆU ----------------
  const fire = () => WORLD.fire();
  const level = () => (fire() && fire().level) || 1;
  const info = (l) => LV[clamp((l || level()) - 1, 0, LV.length - 1)];
  const next = () => level() < LV.length ? LV[level()] : null;
  function migrate(s) {
    const f = s.objects.find(o => o.type === 'fire');
    if (f && !f.level) {
      const pop = s.villagers.length;
      let l = 1; while (l < LV.length && LV[l - 1].cap < pop + 1) l++;
      f.level = l; f.upgrading = null;
    }
    if (!s.roles) {
      const chief = s.villagers.find(v => v.name === RO.chiefName) || s.villagers.slice().sort((a, b) => a.id - b.id)[0];
      s.roles = { chief: chief ? chief.id : 0, prophet: 0, shaman: 0, ritualDay: 0 };
    }
  }
  const popCap = () => info().cap;
  const radiusBonus = () => (level() - 1) * TR.radiusPerLevel;
  const fireSafeBonus = () => (level() - 1) * TR.fireSafePerLevel;
  const lightMult = () => (window.SAGA && SAGA.fireOut()) ? 0.2 : 1 + 0.12 * (level() - 1);
  const roleOf = (v) => !S.roles ? null : v.id === S.roles.chief ? 'chief' : v.id === S.roles.prophet ? 'prophet' : v.id === S.roles.shaman ? 'shaman' : null;
  const reserved = (v) => { const r = roleOf(v); return r === 'prophet' || r === 'shaman'; };
  const isRole = (v) => !!roleOf(v);
  const holder = (r) => S.roles && S.roles[r] ? SIM.vById(S.roles[r]) : null;
  function title(v) { const r = roleOf(v); return r ? ROLE_NAME[r] : CFG.SKILL_NAMES[v.main]; }

  // ---------------- NÂNG CẤP LỬA TRẠI ----------------
  function fireCost() { const n = next(); return n ? { wood: n.wood, stone: n.stone, hours: n.hours } : { wood: 999, stone: 999, hours: 99 }; }
  function wantFire() {
    const n = next(), f = fire();
    if (!n || f.upgrading || S.villagers.length < n.pop || (window.SAGA && SAGA.fireOut())) return false;
    return level() === 1 || S.villagers.length >= popCap() - 4 || (S.res.wood >= n.wood + 10 && S.res.stone >= n.stone + 5);
  }
  function startFireUpgrade() {
    const n = next(), f = fire();
    if (!n || f.upgrading) return false;
    S.res.wood -= n.wood; S.res.stone -= n.stone;
    f.upgrading = { progress: 0, need: n.hours };
    SIM.log(`Bắt đầu nâng cấp lửa trại lên ${n.name} (−${n.wood} gỗ, −${n.stone} đá).`, 'ev');
    return true;
  }
  function fireUpgraded(o) {
    o.level = (o.level || 1) + 1; o.upgrading = null;
    if (window.LAND) setTimeout(() => LAND.onLevel(), 0);
    const L = info(o.level);
    S.villagers.forEach(v => v.morale = clamp(v.morale + 8, 0, 100));
    S.today.built.push(`Lửa trại cấp ${o.level}`);
    const unlocks = [];
    if (o.level === TR.prophetLevel) unlocks.push('Tiên tri');
    if (o.level === TR.quarryLevel) unlocks.push('Mỏ đá');
    if (o.level === TR.shamanLevel) unlocks.push('Vu sư');
    SIM.event(`Lửa trại bùng lên thành ${L.name}! Bộ lạc của tù trưởng ${holder('chief') ? holder('chief').name : ''} đạt cấp ${o.level}: dân số tối đa ${L.cap}${unlocks.length ? ', mở khóa ' + unlocks.join(', ') : ''}.`);
    EV.emit('toast', `Bộ lạc lên cấp ${o.level} — ${L.name}!`);
    ensureRoles(); ensureQuarries();
    RENDER && RENDER.rebuildGround && RENDER.rebuildGround();
  }

  // ---------------- VAI TRÒ ----------------
  function pickFor(role) {
    const sk = role === 'prophet' ? 'farm' : 'gather';
    const cand = S.villagers.filter(v => !v.child && !isRole(v) && !v.pregnant && !(v.job && v.job.type === 'guard'));
    if (!cand.length) return null;
    return cand.sort((a, b) => (b.skills[sk] - a.skills[sk]) || (a.skills.guard - b.skills.guard))[0];
  }
  function setRole(role, v, quiet) {
    const old = holder(role);
    if (old && old !== v) { old.job = null; old.task = null; }
    for (const r of ['prophet', 'shaman']) if (r !== role && S.roles[r] === v.id) S.roles[r] = 0;
    S.roles[role] = v.id;
    v.job = { type: role, auto: true, until: 99 }; v.task = null;
    if (!quiet) {
      const c = holder('chief');
      SIM.event(`${c ? `Tù trưởng ${c.name}` : 'Bộ lạc'} phong ${v.name} làm ${ROLE_NAME[role]}.`);
      EV.emit('toast', `${v.name} trở thành ${ROLE_NAME[role]} của bộ lạc`);
    }
  }
  function ensureRoles() {
    if (!S.roles) migrate(S);
    if (!holder('chief')) { const c = S.villagers.find(v => v.name === RO.chiefName) || S.villagers.filter(v => !v.child).sort((a, b) => a.id - b.id)[0]; if (c) S.roles.chief = c.id; }
    for (const [role, lv] of [['prophet', TR.prophetLevel], ['shaman', TR.shamanLevel]]) {
      if (level() >= lv && !holder(role)) { const v = pickFor(role); if (v) setRole(role, v); }
    }
  }
  function autoRoles() {
    for (const r of ['prophet', 'shaman']) {
      const v = holder(r);
      if (v && !v.child && !v.job && !v.resting) v.job = { type: r, auto: true, until: 99 };
    }
  }

  // ---------------- MỎ ĐÁ ----------------
  function ensureQuarries() {
    if (level() < TR.quarryLevel || S.objects.some(o => o.type === 'quarry')) return;
    const f = fire(), cand = [];
    for (let y = 0; y < WORLD.H; y++) for (let x = 0; x < WORLD.W; x++) {
      if (WORLD.ter(x, y) !== 'rock' || WORLD.objAt(x, y)) continue;
      if (!WORLD.ringTiles({ x, y, w: 1, h: 1 }).some(([a, c]) => WORLD.inMain(a, c))) continue;
      cand.push([x, y, Math.hypot(x - f.x, y - f.y)]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    const picked = [];
    for (const c of cand) {
      if (picked.length >= CFG.QUARRY.spots) break;
      if (picked.some(p => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) < 3)) continue;
      picked.push(c);
      WORLD.addObj({ type: 'quarry', x: c[0], y: c[1], w: 1, h: 1, stock: CFG.GATHER.quarry.stock });
    }
    WORLD.rebuild();
    if (picked.length) SIM.event(`Bộ lạc mở ${picked.length} mỏ đá ở vùng núi đá — mỗi chuyến khai thác được ${CFG.GATHER.quarry.perTrip} đá, mỏ hồi lại mỗi đêm.`);
  }

  // ---------------- QUA ĐÊM ----------------
  function overnight() {
    if (!S.roles) migrate(S);
    ensureRoles(); ensureQuarries();
    const g = CFG.GATHER.quarry;
    for (const o of S.objects) if (o.type === 'quarry') o.stock = Math.min(g.stock, (o.stock || 0) + g.regen);
    const L = level();
    if (L > 1) S.villagers.forEach(v => v.morale = clamp(v.morale + TR.moralePerLevel * (L - 1), 0, 100));
    const pr = holder('prophet');
    if (pr && !pr.child) {
      S.villagers.forEach(v => v.morale = clamp(v.morale + RO.prophetMorale, 0, 100));
      const p = S.def && S.def.plan;
      if (p && window.DEF) {
        const t = DEF.spawnTile();
        if (t) {
          p.tile = t; p.warned = true;
          const h = Math.floor(p.hour), name = CFG.BEASTS[p.kind].name.toLowerCase();
          SIM.event(`Tiên tri ${pr.name} báo mộng: khoảng ${h} giờ hôm nay ${p.count > 1 ? `một bầy ${p.count} con ${name}` : `một con ${name}`} sẽ tới từ ${DEF.dirName(t[0], t[1])}. Người canh gác đã sẵn sàng.`);
          EV.emit('toast', `Tiên tri ${pr.name}: khoảng ${h} giờ ${name} sẽ tới từ ${DEF.dirName(t[0], t[1])}!`);
        }
      } else if (rand() < 0.5) SIM.log(`Tiên tri ${pr.name} xem sao: ngày mai trời ${S.forecast === 'rain' ? 'mưa' : 'nắng'}. Lời tiên tri tốt lành làm cả làng phấn chấn.`, 'ev');
    }
    const sh = holder('shaman');
    if (sh && !sh.child) {
      for (const v of S.villagers) v.health = Math.min(100, v.health + 5);
      const growing = S.objects.some(o => o.type === 'plot' && (o.state === 'sown' || o.state === 'growing'));
      if (S.roles.ritualDay === S.day - 1 && S.forecast === 'sun' && S.weather === 'sun' && growing && rand() < RO.rainChance) {
        S.forecast = 'rain';
        SIM.event(`Vu sư ${sh.name} làm lễ cầu mưa bên lửa thiêng — trời báo ngày mai sẽ có mưa, lúa sẽ lớn nhanh.`);
      }
    }
  }

  // ---------------- VIỆC CỦA VAI TRÒ ----------------
  function patientFor(v) {
    let best = null, bd = 1e9;
    for (const p of S.villagers) {
      if (p === v || p.inside || p.health >= 75) continue;
      const d = dist(p, v) - (p.restKind === 'sick' ? 200 : 0);
      if (d < bd && !S.villagers.some(o => o !== v && o.task && o.task.kind === 'heal' && o.task.target === p.id)) { bd = d; best = p; }
    }
    return best;
  }
  // ---------------- NHÀ CHỮA BỆNH ----------------
  const CA = CFG.CARE;
  const houses = () => S.objects.filter(o => o.type === 'sickhouse');
  const patientsIn = (h) => S.villagers.filter(p => p.inside === h.id && p.task && p.task.kind === 'treat');
  const houseDoor = (h) => [[h.x + 1, h.y + h.h - 1]];
  function planTreat(v) {
    const hs = houses();
    if (!hs.length || v.carry || v.inside || (v.job && v.job.type === 'hunt')) return false;
    if (!((v.resting && v.restKind === 'sick') || v.health < CA.goAt)) return false;
    const h = hs.filter(x => patientsIn(x).length + S.villagers.filter(p => p.task && p.task.next && p.task.next.kind === 'enterTreat' && p.task.next.house === x.id).length < CA.patients)
      .sort((a, b) => Math.hypot(a.x * T - v.x, a.y * T - v.y) - Math.hypot(b.x * T - v.x, b.y * T - v.y))[0];
    if (!h) return false;
    if (!v.resting) { v.resting = true; v.restKind = 'sick'; }
    v.restReason = 'Đi tới Nhà chữa bệnh';
    const next = { kind: 'enterTreat', house: h.id };
    if (SIM.isAt(v, houseDoor(h))) { v.task = next; return true; }
    if (!SIM.goTo(v, houseDoor(h), next) && !SIM.goTo(v, WORLD.ringTiles(h), next)) v.task = next;
    return true;
  }
  function toFire(v, next) {
    const ring = WORLD.ringTiles(fire()).filter(([x, y]) => WORLD.inMain(x, y));
    if (!ring.length || SIM.isAt(v, ring)) { v.task = next; return; }
    if (!SIM.goTo(v, [ring[(v.id * 3) % ring.length]], next) && !SIM.goTo(v, ring, next)) v.task = next;
  }
  function planJob(v, j) {
    if (j.type === 'prophet') {
      if (S.roles.prophet !== v.id) { v.job = null; return true; }
      toFire(v, { kind: 'pray', time: 1.5 + rand() });
      return true;
    }
    if (j.type === 'shaman') {
      if (S.roles.shaman !== v.id) { v.job = null; return true; }
      const hp = houses().find(h => patientsIn(h).length);
      if (hp && !patientFor(v)) {
        const next = { kind: 'healHouse', house: hp.id, time: 1.2 };
        const ring = WORLD.ringTiles(hp).filter(([x, y]) => WORLD.inMain(x, y));
        if (SIM.isAt(v, ring)) { v.task = next; return true; }
        if (SIM.goTo(v, ring, next)) return true;
      }
      const p = patientFor(v);
      if (p) {
        const next = { kind: 'heal', target: p.id, done: 0 };
        if (dist(v, p) < 18) { v.task = next; return true; }
        if (SIM.goTo(v, [SIM.tileOf(p)], next, [p.x + (v.x < p.x ? -9 : 9), p.y])) return true;
      }
      toFire(v, { kind: 'ritual', time: 1 + rand() * 0.5 });
      return true;
    }
    return false;
  }
  function task(v, t, dt) {
    const E = CFG.ENERGY;
    switch (t.kind) {
      case 'pray': case 'ritual':
        v.energy = clamp(v.energy + E.idleRegen * dt * (t.kind === 'pray' ? 1 : 0.3), 0, 100);
        t.time -= dt;
        if (t.kind === 'ritual') { S.roles.ritualDay = S.day; if (patientFor(v) && t.time < 0.8) t.time = 0; }
        if (t.time <= 0) v.task = null;
        return true;
      case 'enterTreat': {
        const h = WORLD.byId(t.house);
        if (!h) { v.task = null; return true; }
        v.inside = h.id; v.task = { kind: 'treat', house: h.id };
        v.restReason = 'Đang nằm chữa ở Nhà chữa bệnh';
        return true;
      }
      case 'treat': {
        const h = WORLD.byId(t.house);
        if (!h) { v.inside = 0; v.task = null; return true; }
        v.health = Math.min(100, v.health + CA.healRate * dt);
        v.energy = clamp(v.energy + E.restRegen * dt, 0, 100);
        if (v.health >= Math.min(100, Math.max(CA.goAt + 25, CFG.HEALTH.sickAt + 30)) && v.energy >= E.resumeAt && SIM.phase() === 'day') {
          v.inside = 0; v.task = null; v.resting = false; v.restKind = ''; v.restReason = '';
          const tile = WORLD.nearestWalkable(h.x + 1, h.y + h.h);
          if (tile) { v.x = tile[0] * T + T / 2; v.y = tile[1] * T + T * 0.75; }
          SIM.log(`${v.name} đã khỏe lại và rời Nhà chữa bệnh.`);
        }
        return true;
      }
      case 'healHouse': {
        const h = WORLD.byId(t.house), ps = h ? patientsIn(h) : [];
        if (!ps.length) { v.task = null; return true; }
        for (const p of ps) p.health = Math.min(100, p.health + CA.shamanBonus * dt);
        t.time -= dt;
        if (t.time <= 0) v.task = null;
        return true;
      }
      case 'heal': {
        const p = SIM.vById(t.target);
        if (!p || p.inside || p.health >= 98 || dist(v, p) > 22) { v.task = null; return true; }
        v.facing = p.x > v.x ? 1 : -1;
        p.health = Math.min(100, p.health + RO.healRate * dt);
        t.done += dt;
        if (t.done >= RO.healHours) {
          if (p.restKind === 'sick' && p.health >= CFG.HEALTH.sickAt + 10) { p.resting = false; p.restKind = ''; p.restReason = ''; p.task = null; }
          SIM.log(`Vu sư ${v.name} đắp thuốc lá rừng, chữa thương cho ${p.name}.`);
          EV.emit('float', { x: p.x, y: p.y - 24, text: '+', icon: 'heart' });
          v.task = null;
        }
        return true;
      }
    }
    return false;
  }

  // ---------------- LỆNH ----------------
  function handles(type) { return type === 'upgradeFire' || type === 'appoint'; }
  function check(spec, vs) {
    if (spec.type === 'upgradeFire') {
      const n = next(), f = fire();
      if (!n) return { ok: false, msg: 'Lửa trại đã ở cấp cao nhất' };
      if (!f.upgrading) {
        if (S.villagers.length < n.pop) return { ok: false, msg: `Cần ít nhất ${n.pop} dân để lên ${n.name}` };
        if (S.res.wood < n.wood) return { ok: false, msg: `Cần thêm ${n.wood - S.res.wood} gỗ` };
        if (S.res.stone < n.stone) return { ok: false, msg: `Cần thêm ${n.stone - S.res.stone} đá` };
      }
      if (!vs.length && !S.auto) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
      return { ok: true };
    }
    if (spec.type === 'appoint') {
      const lv = spec.role === 'prophet' ? TR.prophetLevel : TR.shamanLevel;
      if (level() < lv) return { ok: false, msg: `Mở khóa khi bộ lạc đạt cấp ${lv}` };
      if (vs.length !== 1) return { ok: false, msg: 'Hãy chọn đúng một người' };
      if (vs[0].child) return { ok: false, msg: 'Trẻ con chưa thể nhận chức' };
      if (roleOf(vs[0]) === 'chief') return { ok: false, msg: 'Tù trưởng không kiêm chức khác' };
      return { ok: true };
    }
    return { ok: false, msg: '?' };
  }
  function assign(spec, vs) {
    const c = check(spec, vs);
    if (!c.ok) return c;
    if (spec.type === 'upgradeFire') {
      const f = fire();
      if (!f.upgrading) startFireUpgrade();
      for (const v of vs) { v.job = { type: 'upgrade', target: f.id }; v.task = null; v.resting = false; }
      return { ok: true };
    }
    setRole(spec.role, vs[0]);
    return { ok: true };
  }
  function options(v, push) {
    const f = fire();
    const workers = (id) => S.villagers.filter(x => x.job && x.job.target === id && x.job.type === 'upgrade').length;
    if (f.upgrading && workers(f.id) < 4) push(10, 'build', 'build', { type: 'upgradeFire' });
    if (S.res.stone < SIM.cap('stone') - 3) {
      const qs = S.objects.filter(o => o.type === 'quarry' && o.stock > 0 && S.villagers.filter(x => x.job && x.job.target === o.id).length < 3);
      if (qs.length) {
        const q = qs.reduce((a, b) => (Math.abs(a.x - v.x / T) + Math.abs(a.y - v.y / T)) < (Math.abs(b.x - v.x / T) + Math.abs(b.y - v.y / T)) ? a : b);
        push((S.res.stone < 15 ? 3.5 : 1.8) * EXP.gatherBias().stone, 'build', 'build', { type: 'gather', target: q.id });
      }
    }
  }
  function workMult(v) {
    const c = holder('chief');
    return c && !c.resting && c.health >= CFG.HEALTH.sickAt ? 1 + TR.chiefWork * level() : 1;
  }
  function huntMod(est) { if (holder('shaman') && est.chance > 0) est.chance = Math.min(0.95, est.chance + RO.shamanHunt); return est; }

  // ---------------- GIAO DIỆN ----------------
  function jobText(v) {
    const j = v.job, t = v.task;
    if (t && t.kind === 'treat') return 'Đang nằm chữa ở Nhà chữa bệnh';
    if (t && t.kind === 'healHouse') return 'Vu sư: chăm người bệnh ở Nhà chữa bệnh';
    if (SIM.phase() !== 'day') return null;
    if (j && j.type === 'upgrade' && fire() && j.target === fire().id) return 'Nâng cấp lửa trại' + (t && t.kind === 'walk' ? ' · đang đi' : '');
    if (j && j.type === 'prophet') return t && t.kind === 'pray' ? 'Tiên tri: chiêm bao bên lửa thiêng' : 'Tiên tri: đi về lửa thiêng';
    if (j && j.type === 'shaman') {
      if (t && t.kind === 'heal') { const p = SIM.vById(t.target); return `Vu sư: chữa thương cho ${p ? p.name : '...'}`; }
      if (t && t.kind === 'ritual') return 'Vu sư: làm lễ bên lửa thiêng';
      return 'Vu sư: đi thăm người bệnh';
    }
    return null;
  }
  function fireActions(out, n) {
    const L = level(), I = info(), nx = next(), f = fire();
    out.title = `${I.name} — bộ lạc cấp ${L}/${LV.length}`;
    out.desc = `Cấp lửa trại chính là cấp bộ lạc. Dân số tối đa ${I.cap} · bán kính xây dựng +${radiusBonus()} ô · thú dữ sợ lửa xa hơn · mỗi tối ${S.villagers.length} khẩu phần ăn ở đây.`;
    if (nx) {
      if (f.upgrading) out.actions.unshift({ spec: { type: 'upgradeFire' }, label: 'Tiếp tục nâng cấp lửa trại', detail: `Tiến độ ${Math.round(f.upgrading.progress / f.upgrading.need * 100)}% · lên ${nx.name}` });
      else {
        const unl = [L + 1 === TR.prophetLevel ? 'Tiên tri' : '', L + 1 === TR.quarryLevel ? 'Mỏ đá' : '', L + 1 === TR.shamanLevel ? 'Vu sư' : ''].filter(Boolean);
        out.actions.unshift({ spec: { type: 'upgradeFire' }, label: `Nâng lên ${nx.name} (cấp ${L + 1})`, detail: `Chi phí ${nx.wood} gỗ, ${nx.stone} đá · ${nx.hours} giờ công · cần ${nx.pop} dân (hiện ${S.villagers.length}) · dân số tối đa ${I.cap} → ${nx.cap}${unl.length ? ' · mở khóa ' + unl.join(', ') : ''}` });
      }
    }
    for (const [role, lv, what] of [['prophet', TR.prophetLevel, 'báo trước thú dữ, tăng tinh thần'], ['shaman', TR.shamanLevel, 'chữa thương, cầu mưa, ban phúc đi săn']]) {
      if (L < lv) continue;
      const h = holder(role);
      out.actions.push({ spec: { type: 'appoint', role }, label: `Phong ${ROLE_NAME[role]}`, detail: `Chọn 1 người · ${what} · hiện tại: ${h ? h.name : 'chưa có'}` });
    }
  }
  function objActions(o) {
    if (o.type !== 'quarry') return null;
    const g = CFG.GATHER.quarry;
    return { title: 'Mỏ đá', desc: o.stock > 0 ? `Còn khoảng ${o.stock} đá · mỗi đêm hồi ${g.regen}` : 'Mỏ tạm cạn, mai đá lộ ra thêm', actions: [{ spec: { type: 'gather', target: o.id }, label: 'Khai thác đá', detail: `Mỗi chuyến ≈ ${g.hours} giờ: +${g.perTrip} đá · tối đa 3 người mỗi mỏ · dùng kỹ năng Xây dựng` }] };
  }
  function topHTML() { return `<span class="tribe" id="t-tribe" title="Cấp bộ lạc = cấp lửa trại">${ART.icon('flame')}<b>Cấp 1</b><small></small></span>`; }
  function updateTop() {
    const el = document.getElementById('t-tribe'); if (!el) return;
    const t = `Cấp ${level()}`, s = info().name + (fire().upgrading ? ` · đang nâng ${Math.round(fire().upgrading.progress / fire().upgrading.need * 100)}%` : '');
    if (el._t !== t + s) { el._t = t + s; el.querySelector('b').textContent = t; el.querySelector('small').textContent = s; }
  }
  function panelHTML() { return `<div class="jsec"><h4>Bộ lạc</h4><div id="trb-panel" class="sheet-sub"></div></div>`; }
  function updatePanel(p) {
    const el = p.querySelector('#trb-panel'); if (!el) return;
    const L = level(), I = info(), nx = next(), f = fire();
    const row = (ok, t) => `<div class="${ok ? '' : 'warn'}">${ok ? '✓' : '○'} ${t}</div>`;
    const nm = (r) => { const h = holder(r); return h ? h.name : 'chưa có'; };
    const html = `<div><b>${I.name}</b> — bộ lạc cấp ${L}/${LV.length} · dân số ${S.villagers.length}/${I.cap}</div>
      ${row(true, `Tù trưởng: ${nm('chief')} — cả làng làm việc nhanh hơn ${Math.round(TR.chiefWork * L * 100)}% khi tù trưởng khỏe mạnh`)}
      ${row(L >= TR.prophetLevel && holder('prophet'), `Tiên tri: ${L >= TR.prophetLevel ? nm('prophet') : `mở khóa ở cấp ${TR.prophetLevel}`} — báo trước thú dữ (giờ, hướng), mỗi đêm tăng tinh thần`)}
      ${row(L >= TR.shamanLevel && holder('shaman'), `Vu sư: ${L >= TR.shamanLevel ? nm('shaman') : `mở khóa ở cấp ${TR.shamanLevel}`} — chữa thương, cầu mưa cho ruộng, ban phúc đi săn`)}
      ${row(L >= TR.quarryLevel, `Mỏ đá: ${S.objects.filter(o => o.type === 'quarry').length}${L >= TR.quarryLevel ? '' : ` — mở khóa ở cấp ${TR.quarryLevel}`}`)}
      ${nx ? row(false, f.upgrading ? `Đang nâng lên ${nx.name}: ${Math.round(f.upgrading.progress / f.upgrading.need * 100)}%` : `Cấp tiếp theo: ${nx.name} — ${nx.wood} gỗ, ${nx.stone} đá, cần ${nx.pop} dân · dân số tối đa ${nx.cap}`) : row(true, 'Đã đạt cấp cao nhất')}`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }

  // ---------------- HÌNH VẼ ----------------
  const SPR = {};
  try {
    const { mk, rect, px, ell } = ART;
    { const [c, x] = mk(10, 10); // biểu tượng ngọn lửa
      ell(x, 5, 6, 3, 3, '#e05a1a'); rect(x, 4, 2, 2, 3, '#e05a1a'); px(x, 5, 1, '#f2a03a'); ell(x, 5, 7, 2, 2, '#f2c94c'); px(x, 5, 5, '#fff0b0');
      rect(x, 1, 9, 8, 1, '#6b4224'); ART.ICONS.flame = c.toDataURL(); }
    for (const full of [1, 0]) { // mỏ đá
      const [c, x] = mk(24, 24);
      ell(x, 12, 15, 10, 6, '#4a4e54'); ell(x, 12, 15, 8, 4, '#2e3136'); ell(x, 12, 16, 5, 2, '#24272b');
      if (full) {
        rect(x, 1, 6, 6, 5, '#a7abb1'); rect(x, 1, 6, 6, 1, '#c8ccd0'); rect(x, 15, 5, 7, 5, '#9a9ea4'); rect(x, 15, 5, 7, 1, '#c0c4c8');
        rect(x, 7, 2, 5, 4, '#b4b8bc'); rect(x, 7, 2, 5, 1, '#d8dce0');
      }
      rect(x, 19, 13, 1, 8, '#7a4a24'); rect(x, 17, 12, 5, 1, '#8d9198'); px(x, 16, 13, '#8d9198');
      SPR[full ? 'quarry' : 'quarryEmpty'] = c;
    }
    { // Nhà chữa bệnh 72×52: nhà sàn mái lá, treo thảo dược, nồi thuốc
      const [c, x] = mk(72, 52);
      for (const cx of [6, 34, 63]) { rect(x, cx, 34, 3, 18, '#6b4224'); rect(x, cx, 34, 1, 18, '#875632'); }
      rect(x, 4, 32, 64, 4, '#8a5a30'); rect(x, 4, 32, 64, 1, '#a8743c');
      rect(x, 8, 22, 56, 10, '#c8a878'); for (let i = 8; i < 64; i += 4) rect(x, i, 22, 1, 10, '#a8885a');
      rect(x, 31, 24, 10, 8, '#3a2414');
      for (let y = 0; y < 22; y++) { const off = Math.round((22 - y) * 0.9); for (let i = off; i < 72 - off; i++) px(x, i, y + 1, (y % 3 === 0) ? '#b8a04a' : (i > 52 ? '#8a7428' : '#a08a36')); }
      rect(x, 33, 1, 6, 2, '#6b4224');
      for (const [hx, col] of [[12, '#4fa04a'], [16, '#9a6ad0'], [20, '#4fa04a'], [50, '#e0c040'], [54, '#4fa04a'], [58, '#c86a3a']]) { rect(x, hx, 23, 1, 2, '#5a3a1c'); rect(x, hx - 1, 25, 3, 4, col); }
      ell(x, 66, 47, 4, 3, '#4a3a2a'); ell(x, 66, 45, 3, 1, '#7ac06a'); px(x, 65, 42, '#d8e8d8'); px(x, 67, 40, '#e8f0e8');
      // biểu tượng lá thuốc trên mái
      ell(x, 36, 10, 4, 3, '#4fb04a'); rect(x, 36, 8, 1, 6, '#2e7a2a'); rect(x, 34, 10, 5, 1, '#2e7a2a');
      SPR.sickhouse = c;
    }
  } catch (e) { console.error(e); }
  function drawObj(o, X, Y, lx) {
    if (o.type === 'sickhouse') return () => lx.drawImage(SPR.sickhouse, X, Y + o.h * T - SPR.sickhouse.height + 2);
    if (o.type !== 'quarry') return null;
    return () => lx.drawImage(o.stock > 0 ? SPR.quarry : SPR.quarryEmpty, X, Y);
  }
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  function totem(lx, x, y, L) { // cột tổ, chân tại (x, y)
    R(lx, x, y - 30, 6, 30, '#7a4a24'); R(lx, x, y - 30, 1, 30, '#9a6234');
    for (let k = 0; k < 3; k++) { const ty = y - 28 + k * 9; R(lx, x + 1, ty + 2, 1, 1, '#f2c94c'); R(lx, x + 4, ty + 2, 1, 1, '#f2c94c'); R(lx, x + 1, ty + 5, 4, 1, k % 2 ? '#c8303a' : '#2a1a0e'); }
    R(lx, x - 3, y - 22, 12, 2, '#5a3a1c');
    if (L >= 4) { R(lx, x + 1, y - 35, 4, 4, '#ece6d6'); R(lx, x + 1, y - 33, 1, 1, '#2a1a0e'); R(lx, x + 4, y - 33, 1, 1, '#2a1a0e'); }
    if (L >= 5) { R(lx, x + 5, y - 30, 1, 8, '#5a3a1c'); R(lx, x + 6, y - 30, 6, 4, '#c8303a'); R(lx, x + 6, y - 27, 6, 1, '#f2c94c'); }
  }
  function drawFireBack(lx, X, Y, time) {
    const L = level();
    if (L < 2) return;
    const cx = X + 12, cy = Y + 16;
    if (L >= 3) { totem(lx, X - 14, Y + 14, L); totem(lx, X + 32, Y + 14, L); }
    const n = 8 + L * 2, rx = 13 + L, ry = 6 + Math.floor(L / 2);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, sx = Math.round(cx + Math.cos(a) * rx), sy = Math.round(cy + Math.sin(a) * ry);
      if (Math.sin(a) < -0.2) { R(lx, sx - 2, sy - 1, 4, 3, '#6d7178'); R(lx, sx - 1, sy - 1, 2, 1, '#a7abb1'); }
    }
  }
  function drawFireFront(lx, X, Y, time, spr) {
    const L = level();
    if (L < 2) return;
    const cx = X + 12, cy = Y + 16, n = 8 + L * 2, rx = 13 + L, ry = 6 + Math.floor(L / 2);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, sx = Math.round(cx + Math.cos(a) * rx), sy = Math.round(cy + Math.sin(a) * ry);
      if (Math.sin(a) >= -0.2) { R(lx, sx - 2, sy - 1, 4, 3, '#7d8188'); R(lx, sx - 1, sy - 1, 2, 1, '#b4b8bc'); }
    }
    if (L >= 3 && spr) { const s = 1 + (L - 2) * 0.25, w = Math.round(spr.width * s), h = Math.round(spr.height * s); lx.globalAlpha = 0.85; lx.drawImage(spr, X + 12 - Math.round(w / 2), Y + spr.height - 2 - h, w, h); lx.globalAlpha = 1; }
    if (L >= 4) for (let k = 0; k < 4 + L; k++) { // tàn lửa bay lên
      const ph = (time * 0.7 + k * 0.37) % 1, sx = Math.round(cx + Math.sin(k * 2.3 + time * 2) * 6), sy = Math.round(Y - 4 - ph * 26);
      lx.globalAlpha = 1 - ph; R(lx, sx, sy, 1, 1, ph < 0.5 ? '#ffd23a' : '#ff8a3a'); lx.globalAlpha = 1;
    }
  }
  // mũ lông tù trưởng, mũ trùm tiên tri, mặt nạ sừng vu sư
  function drawGear(lx, X, Y, v, pose) {
    const r = roleOf(v);
    if (!r || v.child) return;
    const by = Y + (pose === 'sit' ? 3 : 0);
    if (r === 'chief') {
      R(lx, X - 4, by - 17, 8, 1, '#c8303a'); R(lx, X - 4, by - 16, 1, 1, '#f2c94c'); R(lx, X + 3, by - 16, 1, 1, '#f2c94c');
      const fs = [[-4, 2, '#f2c94c'], [-2, 4, '#ffffff'], [0, 5, '#e05a3a'], [2, 4, '#ffffff'], [3, 2, '#f2c94c']];
      for (const [dx, h, c] of fs) { R(lx, X + dx, by - 17 - h, 1, h, c); R(lx, X + dx, by - 17 - h, 1, 1, '#2a1a0e'); }
      R(lx, X - 2, by - 9, 4, 1, '#f2c94c');
    } else if (r === 'prophet') {
      R(lx, X - 4, by - 18, 8, 3, '#e8e4d8'); R(lx, X - 4, by - 15, 1, 4, '#e8e4d8'); R(lx, X + 3, by - 15, 1, 4, '#e8e4d8');
      R(lx, X + 1, by - 23, 1, 5, '#6fb0e0'); R(lx, X + 1, by - 23, 1, 1, '#2a4a6a');
      for (const dx of [-3, -1, 1, 3]) R(lx, X + dx, by - 9, 1, 1, '#f0ead8');
    } else if (r === 'shaman') {
      R(lx, X - 5, by - 19, 1, 3, '#e8dcc0'); R(lx, X - 6, by - 21, 1, 2, '#e8dcc0'); R(lx, X + 4, by - 19, 1, 3, '#e8dcc0'); R(lx, X + 5, by - 21, 1, 2, '#e8dcc0');
      R(lx, X - 4, by - 18, 8, 1, '#5a3a1c');
      R(lx, X - 2, by - 14, 1, 2, '#c8303a'); R(lx, X + 1, by - 14, 1, 2, '#c8303a');
      R(lx, X - 3, by - 9, 6, 1, '#7a5a3a'); R(lx, X - 1, by - 8, 2, 2, '#ece6d6');
    }
  }

  // gắn mỏ đá vào hệ thống thu gom của SIM
  if (typeof SIM !== 'undefined' && SIM.GKEY) SIM.GKEY.quarry = 'quarry';

  return {
    migrate, level, info, popCap, radiusBonus, fireSafeBonus, lightMult, fireCost, wantFire, startFireUpgrade, fireUpgraded,
    ensureRoles, autoRoles, reserved, isRole, roleOf, title, overnight, planJob, task, handles, check, assign, options,
    workMult, huntMod, jobText, planTreat, patientsIn, fireActions, objActions, topHTML, updateTop, panelHTML, updatePanel, drawObj,
    drawFireBack, drawFireFront, drawGear, SPR,
  };
})();
window.TRB = TRB;
