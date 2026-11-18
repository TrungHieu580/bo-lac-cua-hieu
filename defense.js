// =====================================================================
//  DEF — dụng cụ săn bắn (giáo đá), thú dữ tấn công làng, người canh gác
// =====================================================================
'use strict';
const DEF = (() => {
  const T = CFG.TILE, D = CFG.DEFENSE, BT = CFG.BEASTS, TL = CFG.TOOLS;
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const tc = (tx, ty) => [tx * T + T / 2, ty * T + T * 0.75];
  const tileOfP = (x, y) => [Math.floor(x / T), Math.floor((y - 1) / T)];
  const names = (vs) => vs.map(v => v.name).join(', ');
  const safeR = () => D.fireSafe + (window.TRB ? TRB.fireSafeBonus() : 0);
  const fireP = () => { const f = WORLD.fire(); return { x: (f.x + 0.5) * T, y: (f.y + 0.6) * T }; };
  const GUARD_START = { 'Hiếu': 2, 'Đá': 4, 'Gió': 3, 'Mây': 1, 'Nụ': 2, 'Sương': 1 };

  // ---------------- DỮ LIỆU ----------------
  function migrate(s) {
    if (s.res.spears === undefined) s.res.spears = 0;
    if (!s.beasts) s.beasts = [];
    if (!s.def) s.def = { plan: null, attacks: 0, kills: 0, fled: 0, nextId: 1, active: false };
    s.villagers.forEach(v => { if (v.skills.guard === undefined) v.skills.guard = GUARD_START[v.name] || clamp(v.skills.hunt - 1, 1, 5); });
  }
  const spearCap = () => TL.cap + 4 * WORLD.storage().level;
  const towers = () => S.objects.filter(o => o.type === 'watchtower');
  function guardsWanted() {
    let n = 0;
    for (const [p, k] of D.guardsAt) if (S.villagers.length >= p) n = k;
    return n;
  }
  const isGuard = (v) => v.job && v.job.type === 'guard';
  const healthy = (v) => !v.child && !v.resting && !v.pregnant && v.health >= CFG.HEALTH.sickAt + 5 && !v.inside;
  const isDefender = (v) => healthy(v) && (isGuard(v) || v._defend);
  const live = () => S.beasts.filter(b => b.state !== 'flee');
  function nearestBeast(v) {
    let best = null, bd = 1e9;
    for (const b of live()) { const d = dist(v, b); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  // ai được cầm giáo: người canh gác trước, rồi người ra giúp, giới hạn bởi số giáo trong kho
  function armedSet() {
    const n = S.res.spears || 0;
    const fighters = S.villagers.filter(v => isGuard(v) || v._defend).sort((a, b) => (isGuard(b) ? 1 : 0) - (isGuard(a) ? 1 : 0) || b.skills.guard - a.skills.guard);
    return new Set(fighters.slice(0, n).map(v => v.id));
  }
  let ARMED = new Set();

  // ---------------- QUA ĐÊM: lên lịch thú dữ ----------------
  function overnight() {
    if (!S.def) migrate(S);
    S.beasts = []; S.def.active = false;
    S.def.plan = null;
    if (S.day < D.startDay) return;
    const ch = Math.min(D.maxChance, D.chance + D.perDay * (S.day - D.startDay) + 0.008 * S.villagers.length);
    const force = S.def.attacks === 0 && S.day >= D.startDay + 1;
    if (!force && rand() >= ch) return;
    const kinds = Object.keys(BT).filter(k => S.day >= BT[k].minDay);
    let tot = kinds.reduce((s, k) => s + BT[k].weight, 0), r = rand() * tot, kind = kinds[0];
    for (const k of kinds) { r -= BT[k].weight; if (r <= 0) { kind = k; break; } }
    const count = kind === 'wolf' && S.day >= 8 && rand() < 0.5 ? 2 : 1;
    S.def.plan = { kind, count, hour: D.hourFrom + rand() * (D.hourTo - D.hourFrom) };
  }

  // ---------------- XUẤT HIỆN ----------------
  function edgeTiles() {
    const W = WORLD.W, H = WORLD.H, out = [];
    for (let x = 0; x < W; x++) { out.push([x, 0]); out.push([x, H - 1]); }
    for (let y = 1; y < H - 1; y++) { out.push([0, y]); out.push([W - 1, y]); }
    return out.filter(([x, y]) => WORLD.walkable(x, y) && WORLD.inMain(x, y));
  }
  function dirName(tx, ty) {
    const f = WORLD.fire(), dx = tx - f.x, dy = ty - f.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'phía đông' : 'phía tây') : (dy > 0 ? 'phía nam' : 'phía bắc');
  }
  function spawnTile() {
    const f = WORLD.fire();
    const cands = edgeTiles().filter(([x, y]) => Math.hypot(x - f.x, y - f.y) > 14);
    return cands.length ? pick(cands) : null;
  }
  function spawn(kind, count, tile, warned) {
    const K = BT[kind];
    const t = tile && WORLD.walkable(tile[0], tile[1]) ? tile : spawnTile();
    if (!t) return;
    const [tx, ty] = t;
    for (let i = 0; i < count; i++) {
      const [x, y] = tc(tx, ty);
      S.beasts.push({ id: S.def.nextId++, kind, x: x + i * 14, y: y + i * 6, hp: K.hp, max: K.hp, life: 0, state: 'come', path: null, pi: 0, repath: 0, atk: 0, steals: 0, face: 1, hit: 0, hold: 0, goal: null, warned: !!warned });
    }
    S.def.attacks++; S.def.active = true;
    const what = count > 1 ? `Một bầy ${count} con ${K.name.toLowerCase()}` : `Một con ${K.name.toLowerCase()}`;
    const tw = towers().length ? 'Chòi canh phát hiện: ' : '';
    SIM.event(`${tw}${what} xuất hiện ở ${dirName(tx, ty)}, đang tiến về làng!`);
    EV.emit('toast', `⚠ ${what} xuất hiện ở ${dirName(tx, ty)}!`);
  }

  // ---------------- DI CHUYỂN THÚ ----------------
  function pathTo(b, goals) {
    const [sx, sy] = tileOfP(b.x, b.y);
    const p = WORLD.findPath(sx, sy, goals);
    if (!p) { b.path = null; return false; }
    b.path = p.map(([x, y]) => tc(x, y)); b.pi = 0;
    return true;
  }
  function moveAlong(b, dt, speed) {
    if (!b.path) return;
    const fp = fireP(), bold = BT[b.kind].bold;
    let remain = speed * T * dt;
    while (remain > 0 && b.pi < b.path.length) {
      const [px, py] = b.path[b.pi];
      if (!bold && b.state !== 'flee' && Math.hypot(px - fp.x, py - fp.y) < safeR() * T) { b.path = null; return; } // sợ lửa
      const dx = px - b.x, dy = py - b.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 0.3) b.face = dx > 0 ? 1 : -1;
      if (d <= remain) { b.x = px; b.y = py; remain -= d; b.pi++; }
      else { b.x += dx / d * remain; b.y += dy / d * remain; remain = 0; }
    }
    if (b.pi >= b.path.length) b.path = null;
  }
  function startFlee(b, why) {
    if (b.state === 'flee') return;
    b.state = 'flee';
    const ed = edgeTiles().sort((p, q) => Math.hypot(p[0] * T - b.x, p[1] * T - b.y) - Math.hypot(q[0] * T - b.x, q[1] * T - b.y)).slice(0, 12);
    if (!pathTo(b, ed)) remove(b);
    if (why) { SIM.log(why, 'ev'); EV.emit('toast', why); }
    S.def.fled++;
  }
  function remove(b) { S.beasts = S.beasts.filter(x => x !== b); }
  const fightersOf = (b) => S.villagers.filter(v => v.task && v.task.kind === 'fight' && v.task.beast === b.id && dist(v, b) < 20);

  function chooseTarget(b) {
    const K = BT[b.kind];
    if (K.target === 'food') {
      const st = WORLD.storage();
      if (S.res.food > 0) return { storage: st, x: (st.x + 1) * T, y: (st.y + 1.5) * T, goals: WORLD.ringTiles(st) };
    }
    const fp = fireP();
    let best = null, bd = 22 * T;
    for (const v of S.villagers) {
      if (v.inside || (v.job && v.job.type === 'hunt')) continue;
      if (!K.bold && Math.hypot(v.x - fp.x, v.y - fp.y) < safeR() * T) continue;
      const d = dist(v, b);
      if (d < bd) { bd = d; best = v; }
    }
    if (!best && window.VIL) { const pt = VIL.penTarget(b); if (pt) return pt; }
    return best ? { v: best, x: best.x, y: best.y, goals: [SIM.tileOf(best)] } : null;
  }

  function hitVillager(v, b) {
    const K = BT[b.kind];
    const armed = ARMED.has(v.id) && v.task && v.task.kind === 'fight';
    const dmg = Math.round(K.dmg * (armed ? 0.7 : 1) * (1 - 0.06 * (v.skills.guard || 1)) * (0.8 + rand() * 0.4));
    v.health = clamp(v.health - dmg, 1, 100);
    EV.emit('float', { x: v.x, y: v.y - 24, text: `−${dmg}`, icon: 'heart' });
    if (!v._bitten || v._bitten < S.hour - 1) { v._bitten = S.hour; SIM.event(`${v.name} bị ${K.name.toLowerCase()} tấn công (−${dmg} sức khỏe).`); }
    if (v.health < CFG.HEALTH.sickAt) {
      v.task = null; v._defend = 0; v._flee = 0;
      v.resting = true; v.restKind = 'sick'; v.restReason = `Bị ${K.name.toLowerCase()} cắn trọng thương — cần nghỉ`;
      SIM.event(`${v.name} bị thương nặng, phải lui về nghỉ.`);
    }
  }

  function updateBeast(b, dt) {
    const K = BT[b.kind];
    b.life += dt; b.hit = Math.max(0, b.hit - dt);
    if (b.state !== 'flee') {
      if (SIM.phase() !== 'day' || S.hour > CFG.EVENING - 0.6) startFlee(b, `Trời tối, ${K.name.toLowerCase()} rút vào rừng.`);
      else if (b.hp < b.max * 0.25 && !b.rolled) { b.rolled = true; if (rand() < 0.35) startFlee(b, `${K.name} bị thương nặng, bỏ chạy vào rừng!`); }
      else if (b.life > D.giveUp) startFlee(b, `${K.name} không vồ được ai, bỏ đi vào rừng.`);
    }
    if (b.state === 'flee') { moveAlong(b, dt, K.speed * 1.15); if (!b.path) remove(b); return; }
    const fighters = fightersOf(b);
    if (fighters.length) {
      b.state = 'fight'; b.path = null;
      const tgt = fighters.reduce((a, c) => dist(a, b) < dist(c, b) ? a : c);
      b.face = tgt.x > b.x ? 1 : -1;
      b.atk += dt;
      if (b.atk >= D.atkEvery) { b.atk = 0; hitVillager(pick(fighters), b); }
      return;
    }
    b.state = 'come';
    const tgt = chooseTarget(b);
    if (!tgt) { // rình quanh làng
      b.hold -= dt;
      if (!b.path && b.hold <= 0) {
        const f = WORLD.fire(), cand = [];
        for (let k = 0; k < 10; k++) { const a = rand() * Math.PI * 2, r = 5 + rand() * 3; cand.push([Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r)]); }
        pathTo(b, cand.filter(([x, y]) => WORLD.walkable(x, y) && WORLD.inMain(x, y)));
        b.hold = 0.4;
      }
      moveAlong(b, dt, K.speed * 0.6);
      return;
    }
    const d = Math.hypot(tgt.x - b.x, tgt.y - b.y);
    if (tgt.v && d < 14) { // vồ người
      b.path = null; b.face = tgt.x > b.x ? 1 : -1;
      const side = b.x < tgt.x ? -1 : 1, k = Math.min(1, dt * 6);
      b.x += (tgt.x + side * 11 - b.x) * k; b.y += (tgt.y + 1 - b.y) * k;
      b.atk += dt;
      if (b.atk >= D.atkEvery) { b.atk = 0; hitVillager(tgt.v, b); }
      return;
    }
    if (tgt.pen && d < 1.8 * T) { // vồ dê trong chuồng
      b.path = null; b.atk += dt;
      if (b.atk >= D.atkEvery * 2) { b.atk = 0; VIL.penAttacked(tgt.pen, K.name); startFlee(b, `${K.name} tha mồi chạy vào rừng.`); }
      return;
    }
    if (tgt.storage && d < 1.7 * T) { // phá kho
      b.path = null; b.atk += dt;
      if (b.atk >= D.atkEvery * 2) {
        b.atk = 0;
        const n = Math.min(K.steal || 4, S.res.food);
        S.res.food -= n; b.steals++;
        if (n > 0) EV.emit('float', { x: (tgt.storage.x + 1) * T, y: tgt.storage.y * T, text: `−${n}`, icon: 'food' });
        if (b.steals === 1) { SIM.event(`${K.name} đang phá kho lương thực! Cần người canh gác đánh đuổi.`); EV.emit('toast', `⚠ ${K.name} đang ăn trộm thức ăn trong kho!`); }
        if (b.steals >= 3 || S.res.food <= 0) startFlee(b, `${K.name} đã ăn no và bỏ đi (mất ${b.steals * (K.steal || 4)} thức ăn).`);
      }
      return;
    }
    b.repath -= dt;
    const gk = tgt.goals[0] ? tgt.goals[0].join(',') : '';
    if (!b.path || b.repath <= 0 || b.goal !== gk) { pathTo(b, tgt.goals); b.repath = 0.25; b.goal = gk; }
    moveAlong(b, dt, K.speed);
  }

  function kill(b, killer) {
    const K = BT[b.kind], fs = fightersOf(b);
    if (!fs.includes(killer)) fs.push(killer);
    remove(b); S.def.kills++;
    if (!killer.carry) killer.carry = { food: K.meat, vis: 'meat' };
    else { S.res.food = Math.min(SIM.cap('food'), S.res.food + K.meat); }
    S.villagers.forEach(v => v.morale = clamp(v.morale + 5, 0, 100));
    SIM.event(`${names(fs)} đã hạ gục ${K.name.toLowerCase()}! Mang về ${K.meat} phần thịt, cả làng yên tâm hơn.`);
    EV.emit('toast', `Đã hạ gục ${K.name.toLowerCase()}! +${K.meat} thịt`);
    for (const v of fs) {
      if (v.skills.guard < 5 && rand() < D.skillUpChance) { v.skills.guard++; SIM.log(`Kỹ năng Bảo vệ của ${v.name} tăng lên ${v.skills.guard}.`, 'ev'); }
      if (ARMED.has(v.id) && S.res.spears > 0 && rand() < TL.breakFight) { S.res.spears--; SIM.log(`Giáo đá của ${v.name} bị gãy trong trận đánh.`); }
      for (const o of fs) if (o !== v) { v.bonds[o.id] = clamp((v.bonds[o.id] || 0) + 4, 0, 100); }
      v.task = null;
    }
  }

  // ---------------- PHẢN ỨNG CỦA DÂN LÀNG ----------------
  let reactAcc = 0;
  function react(dt) {
    reactAcc += dt;
    if (reactAcc < 0.08) return;
    reactAcc = 0;
    const bs = live();
    const fleeR = (towers().length ? D.towerFleeRadius : D.fleeRadius) * T;
    for (const b of bs) {
      const K = BT[b.kind];
      // người canh gác lao ra
      for (const v of S.villagers) if (isGuard(v) && healthy(v) && v._alert !== b.id && !(v.task && (v.task.kind === 'fight' || v.task.chase))) { v._alert = b.id; v.task = null; }
      // người giỏi Bảo vệ ra giúp nếu thiếu người
      const need = b.hp > 15 ? 2 : 1;
      const def = S.villagers.filter(v => isDefender(v) && (!v._defend || v._defend === b.id)).length;
      if (def < need) {
        const cand = S.villagers.filter(v => healthy(v) && !isGuard(v) && !v._defend && v.skills.guard >= D.militiaSkill && !(v.job && v.job.type === 'hunt') && dist(v, b) < 16 * T)
          .sort((a, c) => c.skills.guard - a.skills.guard).slice(0, need - def);
        for (const v of cand) { v._defend = b.id; v._flee = 0; v.task = null; SIM.log(`${v.name} (giỏi Bảo vệ) cầm vũ khí ra đánh ${K.name.toLowerCase()}.`); }
      }
    }
    // dân thường chạy về bếp lửa
    const fp = fireP();
    for (const v of S.villagers) {
      if (v.inside || isDefender(v) || (v.job && v.job.type === 'hunt')) continue;
      if (v._flee && S.hour < v._flee) continue;
      if (Math.hypot(v.x - fp.x, v.y - fp.y) < safeR() * T) continue;
      if (bs.some(b => dist(v, b) < fleeR * (b.warned ? 1.5 : 1))) { v._flee = S.hour + 1; v.task = null; }
    }
    // người đang đuổi theo: tính lại đường khi thú chạy xa
    for (const v of S.villagers) {
      const t = v.task;
      if (!t || !t.chase) continue;
      const b = S.beasts.find(x => x.id === t.chase);
      if (!b || b.state === 'flee' || Math.hypot(b.x - t.gx, b.y - t.gy) > 1.5 * T || dist(v, b) < 16) v.task = null;
    }
  }
  function calm() {
    S.def.active = false;
    for (const v of S.villagers) {
      v._defend = 0; v._flee = 0; v._alert = 0;
      if (v.task && (v.task.kind === 'fight' || v.task.kind === 'cower' || v.task.chase)) v.task = null;
    }
  }

  // ---------------- MÓC VÀO SIM ----------------
  function tick(dt) {
    if (!S.def) migrate(S);
    const p = S.def.plan;
    if (p && SIM.phase() === 'day' && S.hour >= p.hour) { S.def.plan = null; spawn(p.kind, p.count, p.tile, p.warned); }
    ARMED = armedSet();
    if (!S.beasts.length) { if (S.def.active) calm(); return; }
    for (const b of S.beasts.slice()) updateBeast(b, dt);
    for (const a of S.beasts) for (const c of S.beasts) { // thú không đứng chồng lên nhau
      if (a === c) continue;
      const d = dist(a, c);
      if (d < 12) { const ux = d ? (a.x - c.x) / d : 1, uy = d ? (a.y - c.y) / d : 0; a.x += ux * (12 - d) * 0.5; a.y += uy * (12 - d) * 0.5; }
    }
    react(dt);
    if (!live().length) for (const v of S.villagers) { v._defend = 0; if (v.task && v.task.chase) v.task = null; }
  }

  // gọi đầu SIM.plan: thú dữ được ưu tiên trước mọi việc
  function preplan(v) {
    if (!S.beasts || !S.beasts.length || v.inside) return false;
    if (isDefender(v)) {
      const b = (v._defend && S.beasts.find(x => x.id === v._defend && x.state !== 'flee')) || nearestBeast(v);
      if (b) {
        if (dist(v, b) < 16) { v.task = { kind: 'fight', beast: b.id }; return true; }
        const [tx, ty] = tileOfP(b.x, b.y), goals = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (WORLD.walkable(tx + dx, ty + dy)) goals.push([tx + dx, ty + dy]);
        if (SIM.goTo(v, goals.length ? goals : [[tx, ty]], null, [b.x + (v.x < b.x ? -11 : 11), b.y + 1])) { if (v.task) { v.task.chase = b.id; v.task.gx = b.x; v.task.gy = b.y; } return true; }
        v._defend = 0;
      }
    }
    if (v._flee && S.hour < v._flee) {
      const ring = WORLD.ringTiles(WORLD.fire()).filter(([x, y]) => WORLD.inMain(x, y));
      const seat = ring.length ? [ring[v.id % ring.length]] : ring;
      if (SIM.isAt(v, ring)) { v.task = { kind: 'cower', until: v._flee }; return true; }
      if (SIM.goTo(v, seat, { kind: 'cower', until: v._flee }) || SIM.goTo(v, ring, { kind: 'cower', until: v._flee })) return true;
    }
    return false;
  }

  // việc riêng: canh gác, chế giáo
  function planJob(v, j) {
    if (j.type === 'guard') {
      const tw = towers();
      let goals;
      if (tw.length) { const t = tw[(v.id) % tw.length]; goals = WORLD.ringTiles(t).filter(([x, y]) => WORLD.inMain(x, y)); }
      else {
        const f = WORLD.fire(); goals = [];
        for (let k = 0; k < 12; k++) { const a = rand() * Math.PI * 2, r = 5 + rand() * 4; const x = Math.round(f.x + Math.cos(a) * r), y = Math.round(f.y + Math.sin(a) * r); if (WORLD.walkable(x, y) && WORLD.inMain(x, y)) goals.push([x, y]); }
      }
      const next = { kind: 'watch', time: tw.length ? 2 + rand() : 0.8 + rand() * 0.6 };
      if (!goals.length || SIM.isAt(v, goals)) { v.task = next; return true; }
      if (!SIM.goTo(v, [pick(goals)], next)) v.task = next;
      return true;
    }
    if (j.type === 'craft') {
      if (S.res.spears >= Math.min(spearCap(), j.limit || 99)) { v.job = null; v.note = 'Đã đủ giáo đá'; return true; }
      const ws = S.objects.find(o => o.type === 'workshop') || WORLD.fire();
      const ring = WORLD.ringTiles(ws).filter(([x, y]) => WORLD.inMain(x, y));
      const work = { kind: 'craft', target: ws.id, done: 0, need: TL.spear.hours / (ws.type === 'workshop' ? TL.workshopSpeed : 1), paid: false };
      if (SIM.isAt(v, ring)) { v.task = work; return true; }
      if (!SIM.goTo(v, ring, work)) { v.job = null; v.note = 'Không có đường tới chỗ chế tác'; }
      return true;
    }
    return false;
  }

  function task(v, t, dt) {
    const E = CFG.ENERGY;
    switch (t.kind) {
      case 'fight': {
        const b = S.beasts.find(x => x.id === t.beast);
        if (!b || b.state === 'flee' || dist(v, b) > 20 || !healthy(v)) { v.task = null; return true; }
        v.facing = b.x > v.x ? 1 : -1;
        { // đứng cạnh con thú, không chồng lên nhau
          const side = v.x < b.x ? -1 : 1, k = Math.min(1, dt * 8);
          const others = S.villagers.filter(o => o !== v && o.task && o.task.kind === 'fight' && o.task.beast === b.id && (o.x < b.x ? -1 : 1) === side).length;
          v.x += (b.x + side * (11 + (others && v.id % 2 ? 6 : 0)) - v.x) * k; v.y += (b.y + 1 + (others ? (v.id % 2 ? -4 : 4) : 0) - v.y) * k;
        }
        let mult = ARMED.has(v.id) ? D.spearMult : 1;
        if (towers().some(o => Math.hypot((o.x + 1) * T - b.x, (o.y + 1) * T - b.y) < D.towerRange * T)) mult *= D.towerBonus;
        if (b.warned) mult *= CFG.ROLES.warnedBonus;
        b.hp -= (D.baseDmg + D.perSkill * (v.skills.guard || 1)) * mult * dt;
        b.hit = 0.12;
        v.energy = clamp(v.energy - E.workDrain * 1.2 * dt, 0, 100);
        if (b.hp <= 0) kill(b, v);
        return true;
      }
      case 'watch': case 'cower':
        v.energy = clamp(v.energy + E.idleRegen * dt, 0, 100);
        if (t.kind === 'watch') { t.time -= dt; if (t.time <= 0 || !isGuard(v)) v.task = null; }
        else if (S.hour >= t.until || !live().length) { v.task = null; v._flee = 0; }
        return true;
      case 'craft': {
        if (v.energy < E.tiredAt) { v.task = null; return true; }
        if (!t.paid) {
          const c = TL.spear;
          if (S.res.wood < c.wood || S.res.stone < c.stone) { v.job = null; v.task = null; v.note = 'Thiếu gỗ hoặc đá để chế giáo'; return true; }
          S.res.wood -= c.wood; S.res.stone -= c.stone; t.paid = true;
        }
        const o = WORLD.byId(t.target);
        if (o) { const cx = (o.x + o.w / 2) * T; if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1; }
        t.done += SIM.workSpeed(v, 'build') * dt;
        v.energy = clamp(v.energy - E.workDrain * 0.8 * dt, 0, 100);
        if (t.done >= t.need) {
          S.res.spears = Math.min(spearCap(), (S.res.spears || 0) + 1);
          EV.emit('float', { x: v.x, y: v.y - 24, text: '+1', icon: 'spear' });
          v.task = null;
        }
        return true;
      }
    }
    return false;
  }

  // ---------------- LỆNH GIAO VIỆC ----------------
  function handles(type) { return type === 'guard' || type === 'craft' || type === 'fight'; }
  function check(spec, vs) {
    if (!vs.length) return { ok: false, msg: 'Hãy chọn ít nhất một dân làng' };
    if (spec.type === 'craft') {
      if (S.res.spears >= spearCap()) return { ok: false, msg: `Kho đã đủ ${spearCap()} giáo đá` };
      if (S.res.wood < TL.spear.wood || S.res.stone < TL.spear.stone) return { ok: false, msg: `Cần ${TL.spear.wood} gỗ và ${TL.spear.stone} đá cho mỗi cây giáo` };
    }
    if (spec.type === 'fight' && !live().length) return { ok: false, msg: 'Không có thú dữ nào gần làng' };
    if (spec.type !== 'craft' && vs.some(v => v.pregnant > 0)) return { ok: false, msg: 'Người đang mang thai không nên đánh nhau với thú dữ' };
    return { ok: true };
  }
  function assign(spec, vs) {
    const c = check(spec, vs);
    if (!c.ok) return c;
    for (const v of vs) {
      if (spec.type === 'fight') { const b = nearestBeast(v); v._defend = b ? b.id : 0; v._flee = 0; v.resting = false; v.task = null; continue; }
      v.job = null; v.task = null; v.resting = false; v._defend = 0;
      v.job = spec.type === 'craft' ? { type: 'craft', limit: spec.limit || 0 } : { type: 'guard' };
    }
    if (spec.type === 'guard') SIM.log(`${names(vs)} nhận nhiệm vụ canh gác làng.`);
    return { ok: true };
  }

  // ---------------- TỰ ĐỘNG ----------------
  function autoGuards() {
    const want = guardsWanted();
    let have = S.villagers.filter(v => isGuard(v) && !v.child).length;
    if (have >= want) return;
    const cand = S.villagers.filter(v => !v.child && !v.pregnant && !v.resting && !isGuard(v) && !(window.TRB && TRB.isRole(v)) && !(v.job && !v.job.auto) && !(v.job && v.job.type === 'hunt') && !(v.task && v.task.kind === 'work'))
      .sort((a, b) => (b.skills.guard + (b.main === 'guard' ? 2 : 0)) - (a.skills.guard + (a.main === 'guard' ? 2 : 0)));
    for (const v of cand) {
      if (have >= want) break;
      if (v.skills.guard < 2 && cand.some(o => o.skills.guard >= 2 && !isGuard(o))) continue;
      v.job = { type: 'guard', auto: true, until: 99 }; v.task = null; have++;
      SIM.log(`${v.name} được làng cử làm người canh gác (Bảo vệ ${v.skills.guard}/5).`);
    }
  }
  function spearTarget() { return Math.min(spearCap(), 2 + guardsWanted() * 2 + 2); }
  function options(v, push) {
    const deficit = spearTarget() - (S.res.spears || 0);
    if (deficit <= 0 || S.res.wood < TL.spear.wood + 3 || S.res.stone < TL.spear.stone + 1) return;
    if (S.villagers.some(o => o.job && o.job.type === 'craft')) return;
    push(2 + deficit * 0.8, 'build', 'build', { type: 'craft', limit: spearTarget() });
  }

  // ---------------- SĂN BẮN DÙNG GIÁO ----------------
  function huntMod(est, vs) {
    const armed = Math.min(vs.length, S.res.spears || 0);
    est.spears = armed;
    if (!armed) return est;
    if (est.chance > 0) est.chance = clamp(est.chance + TL.huntChance * armed, 0.05, 0.95);
    est.max = Math.round(est.max * (1 + TL.huntMeat * armed));
    est.min = Math.round(est.min * (1 + TL.huntMeat * armed));
    est.injury = clamp(est.injury - TL.huntInjury * armed, 0.02, 0.6);
    return est;
  }
  function afterHunt(vs) {
    const armed = Math.min(vs.length, S.res.spears || 0);
    let broke = 0;
    for (let i = 0; i < armed; i++) if (rand() < TL.breakHunt) broke++;
    if (broke) { S.res.spears -= broke; SIM.log(`${broke} cây giáo đá bị gãy trong chuyến săn.`); }
  }

  // ---------------- GIAO DIỆN ----------------
  function jobText(v) {
    const t = v.task;
    if (t && t.kind === 'fight') { const b = S.beasts.find(x => x.id === t.beast); return `Đang chiến đấu với ${b ? BT[b.kind].name.toLowerCase() : 'thú dữ'}${ARMED.has(v.id) ? ' (cầm giáo)' : ' (tay không)'}`; }
    if (t && t.chase) { const b = S.beasts.find(x => x.id === t.chase); return `Lao tới đánh ${b ? BT[b.kind].name.toLowerCase() : 'thú dữ'}`; }
    if (v._flee && S.hour < v._flee) return t && t.kind === 'cower' ? 'Trốn bên bếp lửa (có thú dữ)' : 'Chạy về bếp lửa tránh thú dữ';
    if (SIM.phase() !== 'day') return null;
    const j = v.job;
    if (j && j.type === 'guard') {
      const armed = ARMED.has(v.id) ? ' · cầm giáo' : ' · chưa có giáo';
      if (t && t.kind === 'watch') return (towers().length ? 'Đứng gác ở chòi canh' : 'Canh gác quanh làng') + armed;
      return 'Đi tuần quanh làng' + armed;
    }
    if (j && j.type === 'craft') return 'Chế giáo đá' + (t && t.kind === 'walk' ? ' · đang đi' : '') + (j.auto || !S.auto ? '' : ' · giao tay');
    return null;
  }
  function taskProgress(v) { const t = v.task; return t && t.kind === 'craft' ? t.done / t.need : null; }
  function fireActions(out, n) {
    const bs = live();
    if (bs.length) {
      const b = bs[0], K = BT[b.kind];
      out.actions.unshift({ spec: { type: 'fight' }, label: `Đánh đuổi ${K.name.toLowerCase()}`, detail: `Người được chọn cầm vũ khí lao ra đánh · ${K.name} còn ${Math.max(0, Math.round(b.hp))}/${b.max} máu · có ${S.res.spears} giáo đá cho người cầm` });
    }
    out.actions.push({ spec: { type: 'guard' }, label: 'Canh gác làng', detail: `Đi tuần${towers().length ? ' và đứng chòi canh' : ' quanh làng'}, tự lao ra đánh thú dữ · nên chọn người giỏi Bảo vệ · người canh gác được cầm giáo trước` });
    out.actions.push(craftAction(n));
  }
  function craftAction(n) {
    const ws = S.objects.some(o => o.type === 'workshop');
    const h = TL.spear.hours / (ws ? TL.workshopSpeed : 1);
    return { spec: { type: 'craft' }, label: 'Chế giáo đá', detail: `Mỗi cây ${TL.spear.wood} gỗ + ${TL.spear.stone} đá, ≈ ${Math.round(h * 10) / 10} giờ${ws ? ' (nhanh hơn nhờ xưởng)' : ''} · đang có ${S.res.spears}/${spearCap()} · giáo giúp đi săn và đánh thú dữ tốt hơn` };
  }
  function panelHTML() { return `<div class="jsec"><h4>Phòng thủ làng</h4><div id="def-panel" class="sheet-sub"></div></div>`; }
  function updatePanel(p) {
    const el = p.querySelector('#def-panel');
    if (!el) return;
    const gs = S.villagers.filter(isGuard);
    const bs = live();
    const row = (ok, t) => `<div class="${ok ? '' : 'warn'}">${ok ? '✓' : '○'} ${t}</div>`;
    const html = `${bs.length ? `<div class="warn"><b>⚠ Đang có ${bs.map(b => `${BT[b.kind].name.toLowerCase()} (${Math.max(0, Math.round(b.hp))}/${b.max} máu)`).join(', ')} gần làng!</b></div>` : ''}
      ${row(gs.length >= guardsWanted(), `Người canh gác: ${gs.length ? gs.map(v => `${v.name} (Bảo vệ ${v.skills.guard})`).join(', ') : 'chưa có'} · cần ${guardsWanted()} theo dân số`)}
      ${row((S.res.spears || 0) >= Math.min(gs.length, 1), `Giáo đá: ${S.res.spears || 0}/${spearCap()} — người cầm giáo đánh mạnh hơn ${Math.round((D.spearMult - 1) * 100)}% và ít bị thương hơn; đi săn có giáo dễ thành công hơn`)}
      ${row(towers().length > 0, `Chòi canh: ${towers().length} — phát hiện thú từ xa, người gác đánh mạnh hơn ${Math.round((D.towerBonus - 1) * 100)}% gần chòi`)}
      <div>Thú dữ đã tới ${S.def.attacks} lần · hạ gục ${S.def.kills} · đuổi chạy ${S.def.fled}. Thú dữ chỉ xuất hiện ban ngày, sợ lửa — dân thường chạy về bếp lửa để tránh.</div>`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }

  // ---------------- HÌNH VẼ ----------------
  const SPR = {};
  function flip(c) { const [d, x] = ART.mk(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return d; }
  function buildSprites() {
    const { mk, rect, px, ell } = ART;
    const make = (w, h, fn) => [0, 1].map(f => { const [c, x] = mk(w, h); fn(x, f); return [flip(c), c]; }); // [frame][0=trái,1=phải]
    SPR.wolf = make(18, 12, (x, f) => {
      const B = '#80848c', Dk = '#5a5e66', L = '#b4b8be';
      const legs = f ? [4, 7, 10, 14] : [3, 6, 11, 13];
      legs.forEach((lx, i) => rect(x, lx, 8, 2, (i + f) % 2 ? 3 : 4, Dk));
      rect(x, 1, 3, 2, 1, B); rect(x, 0, 2, 2, 1, Dk);
      rect(x, 3, 4, 11, 5, B); rect(x, 4, 3, 9, 1, Dk); rect(x, 5, 8, 7, 1, L);
      rect(x, 13, 2, 4, 4, B); rect(x, 16, 4, 2, 2, B); px(x, 17, 4, '#1a1a1a');
      px(x, 14, 1, Dk); px(x, 16, 1, Dk); px(x, 15, 3, '#f2c94c'); rect(x, 13, 6, 3, 1, L);
    });
    SPR.bear = make(22, 15, (x, f) => {
      const B = '#6b4428', Dk = '#4a2e1a', L = '#8a5a36';
      const legs = f ? [4, 8, 12, 16] : [3, 7, 13, 17];
      legs.forEach((lx, i) => rect(x, lx, 11, 3, (i + f) % 2 ? 3 : 4, Dk));
      ell(x, 10, 8, 8, 4, B); rect(x, 6, 3, 7, 2, B); rect(x, 7, 3, 5, 1, L); rect(x, 3, 11, 15, 1, Dk);
      ell(x, 18, 7, 3, 3, B); rect(x, 16, 3, 2, 2, Dk); rect(x, 19, 3, 2, 2, Dk);
      rect(x, 20, 8, 2, 2, '#c8a070'); px(x, 21, 8, '#1a1a1a'); px(x, 19, 6, '#1a1a1a');
    });
    SPR.tiger = make(22, 12, (x, f) => {
      const B = '#e08a2a', St = '#2a1a10', L = '#f4e0c0';
      const legs = f ? [4, 7, 13, 17] : [3, 6, 14, 16];
      legs.forEach((lx, i) => { const h = (i + f) % 2 ? 3 : 4; rect(x, lx, 8, 2, h, B); rect(x, lx, 7 + h, 2, 1, L); });
      rect(x, 1, 3, 2, 1, B); px(x, 0, 2, St); px(x, 1, 3, St);
      rect(x, 3, 4, 15, 5, B); rect(x, 5, 8, 11, 1, L);
      for (const i of [5, 8, 11, 14]) rect(x, i, 4, 1, 3, St);
      rect(x, 17, 2, 5, 5, B); rect(x, 19, 5, 3, 2, L); px(x, 17, 1, B); px(x, 20, 1, B);
      px(x, 20, 3, '#9be067'); px(x, 21, 4, '#1a1a1a'); px(x, 18, 2, St);
    });
    { // biểu tượng giáo đá
      const [c, x] = mk(10, 10);
      for (let i = 0; i < 6; i++) px(x, 1 + i, 8 - i, '#8a5a2a');
      px(x, 6, 3, '#e0c080'); px(x, 7, 2, '#c0c4c8'); px(x, 8, 1, '#e8ecf0'); px(x, 7, 1, '#a0a4a8'); px(x, 8, 2, '#8d9198'); px(x, 6, 2, '#a0a4a8'); px(x, 7, 3, '#8d9198');
      ART.ICONS.spear = c.toDataURL();
    }
    { // chòi canh 48×64
      const [c, x] = mk(48, 64);
      for (const cx of [8, 37]) { rect(x, cx, 22, 3, 42, '#6b4224'); rect(x, cx, 22, 1, 42, '#875632'); }
      for (let y = 30; y < 60; y += 9) { for (let i = 0; i < 29; i++) px(x, 10 + i, y + Math.round(i * 0.25), '#5a3a1c'); }
      rect(x, 4, 18, 40, 5, '#875632'); rect(x, 4, 22, 40, 1, '#5a3a1c');
      for (let i = 5; i < 44; i += 4) rect(x, i, 12, 2, 7, '#6b4224');
      rect(x, 4, 12, 40, 1, '#875632');
      for (let y = 0; y < 11; y++) { const off = Math.round((11 - y) * 1.6); for (let i = off; i < 48 - off; i++) px(x, i, y + 1, (y % 3 === 0) ? '#a8843a' : (i > 34 ? '#7a5e24' : '#94742e')); }
      rect(x, 22, 0, 4, 2, '#c8303a'); rect(x, 23, 0, 1, 4, '#5a3a1c');
      SPR.watchtower = c;
    }
  }
  try { buildSprites(); } catch (e) { console.error(e); }

  function pushDraw(list, lx, L, Tp, time, shadow) {
    for (const b of S.beasts || []) {
      const X = L(b.x), Y = Tp(b.y);
      list.push([b.y, () => {
        const moving = b.path && b.state !== 'fight';
        const fr = moving ? Math.floor(time * (b.state === 'flee' ? 10 : 7)) % 2 : (b.state === 'fight' ? Math.floor(time * 5) % 2 : 0);
        const spr = SPR[b.kind][fr][b.face > 0 ? 1 : 0];
        shadow(lx, X, Y, Math.round(spr.width / 2) - 1, 2);
        const lunge = b.state === 'fight' && fr ? b.face * 2 : 0;
        lx.drawImage(spr, X - Math.round(spr.width / 2) + lunge, Y - spr.height + 1);
        if (b.hit > 0 && Math.floor(time * 20) % 2) { // tia va chạm
          lx.fillStyle = '#fff6c8';
          for (let k = 0; k < 3; k++) lx.fillRect(X - 6 + ((time * 97 + k * 31) % 12 | 0), Y - spr.height + ((time * 53 + k * 17) % 8 | 0), 1, 1);
        }
      }]);
    }
  }
  // vẽ cây giáo cho người canh gác / người ra đánh có giáo
  function drawGear(lx, X, Y, v, pose) {
    if (!ARMED.has(v.id) || pose === 'work' || pose === 'sit' || v.child) return;
    const sx = X + (v.facing < 0 ? -7 : 6);
    lx.fillStyle = '#7a4a24'; lx.fillRect(sx, Y - 22, 1, 20);
    lx.fillStyle = '#e0c080'; lx.fillRect(sx, Y - 21, 1, 1);
    lx.fillStyle = '#a7abb1'; lx.fillRect(sx - 1, Y - 24, 3, 2);
    lx.fillStyle = '#d8dce0'; lx.fillRect(sx, Y - 26, 1, 2);
  }
  function overlay(ctx, W, dpr, bar, time) {
    for (const b of S.beasts || []) {
      if (b.state === 'flee') continue;
      const [sx, sy] = W(b.x, b.y - 18);
      bar(sx, sy, 22 * dpr, Math.max(0, b.hp) / b.max, '#e04040');
      ctx.font = `bold ${Math.round(10 * dpr)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#2a0808'; ctx.fillStyle = '#ffb0a0';
      const t = BT[b.kind].name;
      ctx.strokeText(t, sx, sy - 9 * dpr); ctx.fillText(t, sx, sy - 9 * dpr);
    }
    // dấu "!" trên đầu người đang chạy trốn
    for (const v of S.villagers) {
      if (!(v._flee && S.hour < v._flee) || v.inside || (v.task && v.task.kind === 'cower')) continue;
      const [sx, sy] = W(v.x, v.y - 24);
      ctx.font = `bold ${Math.round(13 * dpr)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#2a0808'; ctx.fillStyle = '#ffd23a';
      const bb = Math.sin(time * 10 + v.id) * 1.5 * dpr;
      ctx.strokeText('!', sx, sy + bb); ctx.fillText('!', sx, sy + bb);
    }
  }
  const BDESC = 'Người canh gác đứng gác ở đây; phát hiện thú dữ từ xa để dân kịp chạy về bếp lửa, người gác đánh mạnh hơn khi ở gần chòi.';

  return {
    migrate, overnight, tick, preplan, planJob, task, handles, check, assign, autoGuards, options,
    huntMod, afterHunt, jobText, taskProgress, fireActions, craftAction, panelHTML, updatePanel,
    pushDraw, drawGear, overlay, spearCap, SPR, BDESC, guardsWanted, spawnTile, dirName,
  };
})();
window.DEF = DEF;
