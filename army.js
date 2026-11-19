// =====================================================================
//  ARMY — quân đội lớn: cấp bậc, Bộ lạc Sói Xám, tường thành & cổng làng,
//  chinh phạt lớn (thung lũng, Sói Xám, đồng bằng) mở thêm giới hạn dân số
// =====================================================================
'use strict';
const ARMY = (() => {
  const T = CFG.TILE, A = CFG.ARMY, W = A.wall, F = A.foe, B = CFG.BUILDINGS;
  const rand = () => Math.random();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const lvl = () => (window.TRB ? TRB.level() : 1);
  const has = (id) => !!(window.SAGA && S.saga && SAGA.has(id));
  const G = () => S.army;
  const names = (vs) => vs.map(v => v.name).join(', ');
  const soldiers = () => S.villagers.filter(v => v.prof === 'soldier');

  function migrate(s) {
    if (!s.army) s.army = {};
    const g = s.army;
    if (!g.wall) g.wall = { lvl: 0, hp: 0, up: null, r: 10 };
    if (!g.foe) g.foe = { met: false, next: 0, raids: 0, repelled: 0, lost: 0, subdued: false, active: null, plan: null };
    if (!g.conq) g.conq = { valley: 0, wolves: 0, plains: 0 };
    if (g.generals === undefined) g.generals = 0;
  }

  // ---------------- QUÂN SỐ & CẤP BẬC ----------------
  const per = () => A.per[clamp(lvl() - 1, 0, A.per.length - 1)];
  const barracksWant = () => clamp(1 + Math.floor(S.villagers.length / A.barracksPer), 1, A.barracksMax);
  function rank(v) {
    if (v.prof !== 'soldier') return -1;
    if (v.general) return 3;
    const R = A.ranks, g = v.skills.guard || 1, b = v.battles || 0;
    if (g >= R[2].guard && b >= R[2].battles) return 2;
    if (g >= R[1].guard) return 1;
    return 0;
  }
  const rankName = (v) => { const r = rank(v); return r >= 0 ? A.ranks[r].name : 'Chiến binh'; };
  const rankMult = (v) => { const r = rank(v); return r >= 0 ? A.ranks[r].mult : 1; };
  function generalBonus(vs) { const n = Math.min(3, vs.filter(v => v.general).length); return 1 + n * A.generalBonus; }
  function battle(vs) { for (const v of vs) v.battles = (v.battles || 0) + 1; }
  function promote() {
    const sol = soldiers(), R = A.ranks[3];
    const away = S.civ && S.civ.campaign ? S.civ.campaign.party.filter(p => p.prof === 'soldier') : [];
    const want = Math.max(0, Math.floor((sol.length + away.length) / A.generalPer) - away.filter(p => p.general).length);
    sol.forEach(v => { if (v.general && (want === 0 || (v.skills.guard || 1) < R.guard - 1)) v.general = false; });
    let cur = sol.filter(v => v.general);
    if (cur.length > want) { cur.sort((a, b) => (a.battles || 0) - (b.battles || 0)).slice(0, cur.length - want).forEach(v => v.general = false); cur = sol.filter(v => v.general); }
    const cand = sol.filter(v => !v.general && (v.skills.guard || 1) >= R.guard && (v.battles || 0) >= R.battles).sort((a, b) => (b.battles || 0) - (a.battles || 0) || (b.skills.guard - a.skills.guard));
    for (const v of cand.slice(0, Math.max(0, want - cur.length))) {
      v.general = true;
      SIM.event(`${v.name} được phong làm Tướng quân sau ${v.battles} trận đánh! Quân đội đi cùng tướng mạnh hơn.`);
      EV.emit('toast', `🎖 ${v.name} được phong Tướng quân`);
    }
    // chiến binh lâu năm lên kỹ năng nhờ luyện tập (tới bậc 7 nếu trường dạy nghề đủ cấp)
  }

  // ---------------- TƯỜNG THÀNH ----------------
  const BT = () => window.EXP ? ['storage', 'hut', 'site', 'rack', 'granary', 'longhouse', 'healer', 'workshop', 'watchtower', 'sickhouse', 'kitchen', 'pen', 'temple', 'stonering', 'greathall', 'paintwall', 'well', 'scholar', 'school', 'barracks', 'smelter', 'clanhouse', 'gate'] : [];
  function computeR() {
    const f = WORLD.fire(); if (!f) return 10;
    let r = 8;
    for (const t of BT()) for (const o of WORLD.objsOf(t)) {
      for (const [cx, cy] of [[o.x, o.y], [o.x + o.w, o.y], [o.x, o.y + o.h], [o.x + o.w, o.y + o.h]]) r = Math.max(r, Math.hypot(cx - f.x - 0.5, cy - f.y - 0.5));
    }
    // tường phải nằm gọn trong bản đồ, chừa chỗ cho kẻ địch xuất hiện bên ngoài
    const edge = Math.min(f.x, f.y, WORLD.W - 1 - f.x, WORLD.H - 1 - f.y) - 7;
    return clamp(Math.ceil(r + 2), 8, Math.max(8, Math.min(46, edge)));
  }
  const wallR = () => (G() && G().wall.r) || 10;
  const wallMax = (l) => { const L = W.levels[l === undefined ? G().wall.lvl : l]; return L && L.hp ? Math.round(L.hp * (1 + (window.EXP ? EXP.popNow() : S.villagers.length) / 120)) : 0; };
  function wallLock(l) {
    const L = W.levels[l]; if (!L) return 'Đã là tường cao nhất';
    if (!WORLD.countOf('gate')) return 'Cần xây Cổng làng trước';
    if (lvl() < L.tribe) return `Cần bộ lạc cấp ${L.tribe}`;
    if (L.invent && !has(L.invent)) return 'Cần phát minh Xây đá';
    return '';
  }
  function startWall() {
    const w = G().wall, l = w.lvl + 1, L = W.levels[l];
    if (w.up || !L || wallLock(l)) return false;
    if (S.res.wood < L.wood || S.res.stone < L.stone) return false;
    S.res.wood -= L.wood; S.res.stone -= L.stone;
    w.up = { progress: 0, need: L.hours, to: l };
    SIM.log(`Làng bắt đầu dựng ${L.name.toLowerCase()} bao quanh (−${L.wood} gỗ, −${L.stone} đá).`, 'ev');
    return true;
  }
  // thú dữ & quân địch tới chân tường thì phải phá tường mới vào được
  function wallHold(b, dt) {
    const g = G(); if (!g) return false;
    const w = g.wall;
    if (!w.lvl || w.hp <= 0 || b.state === 'flee') return false;
    const f = WORLD.fire(), d = Math.hypot(b.x - (f.x + 0.5) * T, b.y - (f.y + 0.5) * T) / T, R = wallR();
    if (b.ow === undefined) b.ow = d > R + 0.3;
    if (!b.ow || d > R + 1.3) return false;
    const K = CFG.BEASTS[b.kind], L = W.levels[w.lvl];
    b.path = null; b.atWall = true;
    b.atk += dt;
    if (b.atk >= CFG.DEFENSE.atkEvery) {
      b.atk = 0;
      const dmg = Math.round(K.dmg * (K.raid ? 1.2 : 0.6));
      w.hp = Math.max(0, w.hp - dmg);
      if (rand() < 0.3) EV.emit('float', { x: b.x, y: b.y - 20, text: `−${dmg}`, icon: 'stone' });
      if (!w.hitMsg || w.hitMsg < S.hour - 2) { w.hitMsg = S.hour; SIM.log(`${K.name} đang phá ${L.name.toLowerCase()}! (độ bền ${w.hp}/${wallMax()})`, 'ev'); }
      if (w.hp <= 0) {
        SIM.event(`⚠ ${L.name} bị phá thủng! Kẻ địch tràn vào làng!`);
        EV.emit('toast', `⚠ ${L.name} bị phá thủng!`);
        S.beasts.forEach(x => x.ow = false);
      }
    }
    // cọc nhọn, tên bắn từ trên tường làm địch bị thương dần
    b.hp = Math.max(1, b.hp - L.spike * dt * (WORLD.countOf('watchtower') ? 1.5 : 1));
    if (b.hp <= b.max * 0.2) { b.state = 'flee'; b.path = null; SIM.log(`${K.name} trúng nhiều cọc nhọn và tên, bỏ chạy khỏi chân tường.`); }
    return true;
  }

  // ---------------- BỘ LẠC SÓI XÁM ----------------
  function foeSize() { return clamp(Math.round(F.base + S.day * F.perDay + S.villagers.length * F.perPop), 3, F.max); }
  // quân địch kéo tới từ bên ngoài tường thành
  function foeTile() {
    const f = WORLD.fire(), R = (G().wall.lvl ? wallR() : 14) + 4;
    for (let k = 0; k < 300; k++) {
      const a = rand() * Math.PI * 2, r = R + rand() * 8;
      const x = Math.round(f.x + Math.cos(a) * r), y = Math.round(f.y + Math.sin(a) * r);
      if (WORLD.inb(x, y) && WORLD.walkable(x, y) && WORLD.inMain(x, y)) return [x, y];
    }
    return window.DEF ? DEF.spawnTile() : null;
  }
  function planFoe() {
    const fo = G().foe;
    if (fo.subdued || fo.plan || fo.active) return;
    if (!fo.met) {
      if (S.day < F.startDay || S.villagers.length < F.startPop) return;
      fo.met = true; fo.next = S.day + 2;
      SIM.event(`Thám tử báo tin: ${F.name} hung hãn đã dựng trại ở phía xa. Chúng nổi tiếng cướp phá, giết chóc — làng cần quân đội và tường thành!`);
      EV.emit('toast', `⚠ Xuất hiện ${F.name} hung hãn!`);
      if (window.SAGA) SAGA.memory('spear', `${F.name} xuất hiện`);
      return;
    }
    if (S.day < fo.next) return;
    if (G().safeUntil && S.day < G().safeUntil) return;
    if (S.civ && S.day < S.civ.safeUntil) return;
    const t = foeTile(); if (!t) return;
    fo.plan = { hour: 8.5 + rand() * 3.5, count: foeSize(), tile: t };
    const warn = WORLD.countOf('watchtower') || (S.roles && S.roles.prophet);
    if (warn) SIM.log(`Lính canh thấy khói lửa trại của ${F.name} — sáng mai có thể bị tấn công (khoảng ${fo.plan.count} chiến binh).`, 'ev');
  }
  function spawnFoe() {
    const fo = G().foe, p = fo.plan; fo.plan = null;
    const K = CFG.BEASTS.wolfwar, [tx, ty] = p.tile;
    const ids = [];
    for (let i = 0; i < p.count; i++) {
      const id = S.def.nextId++;
      const x = tx * T + T / 2 + (i % 6) * 12 - 30, y = ty * T + T * 0.75 + Math.floor(i / 6) * 10;
      S.beasts.push({ id, kind: 'wolfwar', x, y, hp: K.hp, max: K.hp, life: 0, state: 'come', path: null, pi: 0, repath: rand() * 0.3, atk: 0, steals: 0, face: 1, hit: 0, hold: 0, goal: null, warned: true, ow: Math.hypot(x / T - WORLD.fire().x - 0.5, y / T - WORLD.fire().y - 0.5) > wallR() + 0.5 });
      ids.push(id);
    }
    S.def.active = true; fo.raids++;
    fo.active = { ids, seen: {}, n: p.count };
    fo.next = S.day + F.every[0] + Math.floor(rand() * (F.every[1] - F.every[0] + 1));
    SIM.event(`⚔ ${p.count} chiến binh ${F.name} tấn công từ ${DEF.dirName(tx, ty)}! Quân đội và người canh gác ra nghênh chiến!`);
    EV.emit('toast', `⚔ ${F.name} tấn công (${p.count} quân)!`);
  }
  function watchFoe() {
    const fo = G().foe, a = fo.active; if (!a) return;
    const alive = new Set();
    for (const b of S.beasts) if (b.kind === 'wolfwar') { alive.add(b.id); a.seen[b.id] = b.state; }
    if (alive.size) return;
    const killed = a.ids.filter(id => a.seen[id] && a.seen[id] !== 'flee').length;
    fo.active = null;
    const win = killed >= a.n * 0.4 || G().wall.hp > 0;
    const fighters = S.villagers.filter(v => v.prof === 'soldier' || (v.job && v.job.type === 'guard'));
    battle(fighters.filter(v => v.prof === 'soldier'));
    if (win) {
      fo.repelled++;
      S.villagers.forEach(v => v.morale = clamp(v.morale + 5, 0, 100));
      SIM.event(`Đã đẩy lui ${F.name}! Hạ gục ${killed}/${a.n} quân địch.`);
      EV.emit('toast', `🛡 Đẩy lui ${F.name}!`);
    } else {
      fo.lost++;
      S.villagers.forEach(v => v.morale = clamp(v.morale - 4, 0, 100));
      SIM.event(`${F.name} cướp phá xong rồi rút đi. Làng cần thêm chiến binh và tường thành vững hơn.`);
    }
  }

  // ---------------- CHINH PHẠT LỚN ----------------
  const TG = {
    valley: {
      name: 'Chiếm thung lũng sông', days: 2, min: 12, diff: () => 70 + S.day * 1.0,
      desc: `Đánh chiếm thung lũng màu mỡ ven sông: được lương thực, hạt giống, gỗ và đất định cư (+${A.conquest.valley} dân tối đa).`,
      ok: () => G().conq.valley ? 'Đã chiếm thung lũng' : '',
      hidden: () => lvl() < 5,
      onWin: (vs, loot, add) => { G().conq.valley = 1; add('food', 80); add('wood', 60); S.res.seeds = Math.min(CFG.SEED_CAP, S.res.seeds + 15); loot.push('80 thức ăn', '60 gỗ', '15 hạt giống', `thung lũng mới (+${A.conquest.valley} dân tối đa)`); if (window.SAGA) SAGA.memory('feet', 'Chiếm thung lũng sông'); },
    },
    wolves: {
      name: `Đánh tan ${F.name}`, days: 2, min: 20, diff: () => 120 + S.day * 1.4,
      desc: `Tấn công thẳng vào trại ${F.name}: chúng thần phục, thôi cướp phá và nộp cống mỗi ngày; dân của chúng nhập vào bộ lạc (+${A.conquest.wolves} dân tối đa).`,
      ok: () => !G().foe.met ? `Chưa biết trại ${F.name} ở đâu` : G().foe.subdued ? `${F.name} đã thần phục` : '',
      hidden: () => !G().foe.met,
      onWin: (vs, loot, add) => {
        const fo = G().foe; fo.subdued = true; fo.plan = null; G().conq.wolves = 1;
        add('food', 60); add('stone', 60); add('ore', 20); add('bronze', 6);
        loot.push('60 thức ăn', '60 đá', '20 quặng', '6 đồng', `${F.name} thần phục (+${A.conquest.wolves} dân tối đa, nộp cống mỗi ngày)`);
        let n = 0; for (let i = 0; i < 3; i++) if (EXP.newcomer()) n++;
        if (n) loot.push(`${n} người Sói Xám theo về`);
        if (window.SAGA) SAGA.memory('spear', `Đánh tan ${F.name}`);
      },
      onLose: () => { G().foe.next = Math.min(G().foe.next, S.day + 1); },
    },
    plains: {
      name: 'Chinh phục đồng bằng phía nam', days: 3, min: 30, diff: () => 190 + S.day * 1.8,
      desc: `Cuộc viễn chinh lớn nhất: chinh phục cả vùng đồng bằng — đá, quặng, đồng, nhiều người theo về (+${A.conquest.plains} dân tối đa).`,
      ok: () => G().conq.plains ? 'Đã chinh phục đồng bằng' : !G().conq.valley ? 'Cần chiếm thung lũng sông trước' : '',
      hidden: () => lvl() < 6,
      onWin: (vs, loot, add) => {
        G().conq.plains = 1; add('stone', 100); add('ore', 30); add('bronze', 10); add('food', 100);
        loot.push('100 đá', '30 quặng', '10 đồng', '100 thức ăn', `đồng bằng phía nam (+${A.conquest.plains} dân tối đa)`);
        let n = 0; for (let i = 0; i < 4; i++) if (EXP.newcomer()) n++;
        if (n) loot.push(`${n} người theo về`);
        if (window.SAGA) SAGA.memory('feet', 'Chinh phục đồng bằng phía nam');
      },
    },
  };
  if (window.CIV && CIV.TARGETS) Object.assign(CIV.TARGETS, TG);
  const popBonus = () => { const g = G(); if (!g) return 0; const C = A.conquest; return (g.conq.valley ? C.valley : 0) + (g.conq.wolves ? C.wolves : 0) + (g.conq.plains ? C.plains : 0); };
  function autoCampaign() {
    if (!S.auto || !S.civ || S.civ.campaign || S.hour > 10 || !window.CIV) return;
    const rd = CIV.ready(); if (rd.length < 12) return;
    if (S.day - (S.civ.lastCampaign || 0) < 4) return;
    const str = CIV.strengthOf(rd);
    for (const k of ['wolves', 'valley', 'plains']) {
      const t = TG[k];
      if (t.hidden() || t.ok() || rd.length < t.min) continue;
      if (str >= t.diff() * 1.6) { CIV.startCampaign(k); return; }
    }
  }

  // ---------------- VIỆC LÀM: DỰNG TƯỜNG ----------------
  const isJob = (v, t) => v.job && v.job.type === t;
  function free(v) {
    if (v.child || v.resting || v.pregnant > 0 || v.inside || v.carry || v.health < 35 || v.prof) return false;
    if (window.TRB && TRB.reserved(v)) return false;
    if (!v.job) return true;
    return v.job.auto && v.job.type === 'gather' && (!v.task || v.task.kind !== 'work');
  }
  function autoJobs() {
    if (!S.army) migrate(S);
    const w = G().wall, gate = WORLD.objsOf('gate')[0];
    if (!gate) return;
    if (!w.up && S.auto && !S.objects.some(o => o.type === 'site')) {
      const L = W.levels[w.lvl + 1], fo = G().foe;
      const urgent = fo.met && !fo.subdued;
      if (L && !wallLock(w.lvl + 1) && S.res.wood >= L.wood + (urgent ? 5 : 30) && S.res.stone >= L.stone + (urgent ? 5 : 20)) startWall();
    }
    if (w.up) {
      const have = S.villagers.filter(v => isJob(v, 'wallwork')).length;
      for (const v of S.villagers.filter(free).sort((a, b) => (b.skills.build || 1) - (a.skills.build || 1)).slice(0, Math.max(0, 5 - have))) { v.job = { type: 'wallwork', target: gate.id, auto: true, until: 99 }; v.task = null; }
    }
    autoCampaign();
  }
  function wantBuild() {
    if (lvl() >= B.gate.tribe && !WORLD.countOf('gate') && !S.objects.some(o => o.type === 'site' && o.kind === 'gate') && (S.villagers.length >= 26 || (G().foe.met && !G().foe.subdued))) return 'gate';
    return null;
  }
  const HANDLED = ['wallUp', 'wallwork'];
  const handles = (t) => HANDLED.includes(t);
  function check(spec, vs) {
    if (spec.type === 'wallUp') {
      const w = G().wall; if (w.up) return { ok: true };
      const l = w.lvl + 1, L = W.levels[l], lk = wallLock(l); if (lk) return { ok: false, msg: lk };
      if (S.res.wood < L.wood) return { ok: false, msg: `Cần thêm ${L.wood - S.res.wood} gỗ` };
      if (S.res.stone < L.stone) return { ok: false, msg: `Cần thêm ${L.stone - S.res.stone} đá` };
      return { ok: true };
    }
    if (!vs.length) return { ok: false, msg: 'Hãy chọn người' };
    if (!G().wall.up) return { ok: false, msg: 'Chưa có việc dựng tường' };
    return { ok: true };
  }
  function assign(spec, vs) {
    const c = check(spec, vs); if (!c.ok) return c;
    const gate = WORLD.objsOf('gate')[0];
    if (spec.type === 'wallUp') {
      if (!G().wall.up) startWall();
      for (const v of vs.filter(v => !v.child)) { v.job = { type: 'wallwork', target: gate.id, auto: false, until: 99 }; v.task = null; v.resting = false; }
      return { ok: true, msg: vs.length ? `${names(vs)} bắt tay dựng tường` : `Bắt đầu dựng tường${S.auto ? ' — làng sẽ cử người làm' : ' — hãy chọn người để làm'}` };
    }
    for (const v of vs) { v.job = { type: 'wallwork', target: gate.id, auto: false, until: 99 }; v.task = null; }
    return { ok: true };
  }
  function planJob(v, j) {
    if (j.type !== 'wallwork') return false;
    const gate = WORLD.byId(j.target);
    if (!gate || !G().wall.up) { v.job = null; v.note = 'Tường đã dựng xong'; return true; }
    const r = WORLD.ringTiles(gate).filter(([x, y]) => WORLD.inMain(x, y));
    const next = { kind: 'wallbuild', target: gate.id };
    if (!r.length) { v.job = null; return true; }
    if (SIM.isAt(v, r)) { v.task = next; return true; }
    if (!SIM.goTo(v, r, next)) v.job = null;
    return true;
  }
  function task(v, t, dt) {
    if (t.kind !== 'wallbuild') return false;
    const w = G().wall, o = WORLD.byId(t.target);
    if (!w.up || !o) { v.task = null; return true; }
    const cx = (o.x + o.w / 2) * T; if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1;
    v.energy = clamp(v.energy - CFG.ENERGY.workDrain * dt, 0, 100);
    w.up.progress += SIM.workSpeed(v, 'build') * dt;
    if (w.up.progress >= w.up.need) {
      const to = w.up.to; w.lvl = to; w.up = null; w.r = computeR(); w.hp = wallMax();
      S.villagers.filter(x => isJob(x, 'wallwork')).forEach(x => { x.job = null; x.task = null; });
      const L = W.levels[to];
      S.today.built.push(L.name);
      S.villagers.forEach(x => x.morale = clamp(x.morale + 6, 0, 100));
      SIM.event(`${L.name} bao quanh làng đã dựng xong (độ bền ${w.hp})! Kẻ địch phải phá tường mới vào được.`);
      EV.emit('toast', `🧱 Dựng xong ${L.name}!`);
      if (window.SAGA) SAGA.memory('temple', `Dựng ${L.name.toLowerCase()}`);
    }
    return true;
  }
  function jobText(v) {
    if (v.job && v.job.type === 'wallwork') return v.task && v.task.kind === 'wallbuild' ? 'Dựng tường thành' : 'Đi dựng tường thành';
    return null;
  }
  const WORK_POSE = ['wallbuild'];

  // ---------------- MÓC VÀO SIM ----------------
  let rAcc = 0;
  function tick(dt) {
    if (!S.army) migrate(S);
    const fo = G().foe;
    if (fo.plan && SIM.phase() === 'day' && S.hour >= fo.plan.hour && S.hour < CFG.EVENING - 2) spawnFoe();
    watchFoe();
    rAcc += dt;
    if (rAcc > 2) { rAcc = 0; const w = G().wall, r = computeR(); if (r !== w.r) w.r = r; }
  }
  function overnight() {
    if (!S.army) migrate(S);
    const g = G(), w = g.wall, fo = g.foe;
    // sửa tường
    if (w.lvl && w.hp < wallMax()) {
      const add = Math.round(wallMax() * W.repair), cost = Math.ceil(add / 12);
      const useStone = w.lvl >= 2, have = useStone ? S.res.stone : S.res.wood;
      const k = Math.min(1, have / Math.max(1, cost));
      if (k > 0) { w.hp = Math.min(wallMax(), w.hp + Math.round(add * k)); if (useStone) S.res.stone -= Math.ceil(cost * k); else S.res.wood -= Math.ceil(cost * k); }
    }
    if (w.lvl) w.hp = Math.min(w.hp, wallMax());
    // cống nạp của Sói Xám
    if (fo.subdued) { const tb = F.tribute; S.res.food = Math.min(SIM.cap('food'), S.res.food + tb.food); S.res.stone = Math.min(SIM.cap('stone'), S.res.stone + tb.stone); S.res.ore = (S.res.ore || 0) + tb.ore; SIM.log(`${F.name} nộp cống: ${tb.food} thức ăn, ${tb.stone} đá, ${tb.ore} quặng.`); }
    planFoe();
    promote();
  }

  // ---------------- GIAO DIỆN ----------------
  const DESC = {
    gate: 'Cổng chính của làng. Có cổng mới dựng được tường bao quanh: Hàng rào gỗ (bộ lạc cấp 4), Tường đất đá (cấp 6, cần Xây đá), Thành đá (cấp 7). Kẻ địch phải phá tường mới vào được, chân tường có cọc nhọn làm chúng bị thương.',
  };
  function objActions(o) {
    if (o.type !== 'gate') return null;
    const w = G().wall, cur = W.levels[w.lvl], nx = W.levels[w.lvl + 1];
    const acts = [];
    if (w.up) acts.push({ spec: { type: 'wallUp' }, label: `Tiếp tục dựng ${W.levels[w.up.to].name}`, detail: `Tiến độ ${Math.round(w.up.progress / w.up.need * 100)}%` });
    else if (nx) { const lk = wallLock(w.lvl + 1); acts.push({ spec: { type: 'wallUp' }, label: `Dựng ${nx.name}`, detail: `${nx.wood} gỗ, ${nx.stone} đá · ${nx.hours} giờ công · độ bền ${wallMax(w.lvl + 1)}${lk ? ` · ${lk}` : ''}` }); }
    return { title: 'Cổng làng', desc: `${DESC.gate}<br>Hiện tại: <b>${cur.name}</b>${w.lvl ? ` · độ bền ${w.hp}/${wallMax()} · bán kính ${w.r} ô` : ''}.`, actions: acts };
  }
  function panelHTML() { return `<div class="jsec"><h4>Quân đội & chiến tranh</h4><div id="army-panel" class="sheet-sub"></div></div>`; }
  function setHTML(p, id, html) { const el = p.querySelector('#' + id); if (el && el._last !== html) { el.innerHTML = html; el._last = html; } }
  function updatePanel(p) {
    if (!S.army) return;
    const g = G(), sol = soldiers(), w = g.wall, fo = g.foe, cnt = [0, 0, 0, 0];
    sol.forEach(v => cnt[rank(v)]++);
    const away = S.civ && S.civ.campaign ? S.civ.campaign.party.length : 0;
    const str = window.CIV ? CIV.strengthOf(CIV.ready()) : 0;
    const want = Math.min(Math.floor(S.villagers.length / per()), Math.floor(S.villagers.length * A.maxShare));
    const conq = Object.entries(TG).map(([k, t]) => `${t.name}: ${(k === 'wolves' ? g.conq.wolves : g.conq[k]) ? '<b>đã thắng</b>' : `cần ${t.min} chiến binh, sức địch ~${Math.round(t.diff())}`}`).join(' · ');
    setHTML(p, 'army-panel',
      `<div>Quân số: <b>${sol.length}</b>${away ? ` (+${away} đang hành quân)` : ''} · mục tiêu ~${want} (1 chiến binh / ${per()} dân, ${WORLD.countOf('barracks')}/${barracksWant()} doanh trại) · sức mạnh ${str}.</div>` +
      `<div>Cấp bậc: ${A.ranks.map((r, i) => `${r.name} ${cnt[i]}`).join(' · ')}. Tướng quân đi cùng: cả đoàn mạnh thêm ${Math.round(A.generalBonus * 100)}% mỗi tướng.</div>` +
      `<div>Tường thành: <b>${W.levels[w.lvl].name}</b>${w.lvl ? ` · độ bền ${w.hp}/${wallMax()}` : ''}${w.up ? ` · đang dựng ${W.levels[w.up.to].name} ${Math.round(w.up.progress / w.up.need * 100)}%` : ''}${!WORLD.countOf('gate') ? ` — cần Cổng làng (bộ lạc cấp ${B.gate.tribe})` : ''}.</div>` +
      `<div>${F.name}: ${!fo.met ? 'chưa xuất hiện' : fo.subdued ? '<b>đã thần phục</b>, nộp cống mỗi ngày' : `<b>thù địch</b> · ${fo.raids} lần tấn công (đẩy lui ${fo.repelled}) · đợt tới khoảng ${foeSize()} quân, từ ngày ${fo.next}`}.</div>` +
      `<div>Chinh phạt lớn (giới hạn dân số +${popBonus()}): ${conq}.</div>`);
  }

  // ---------------- HÌNH VẼ ----------------
  const SPR = {};
  try {
    const { mk, rect, px } = ART;
    { // Cổng làng 72×70: hai tháp gỗ, cổng vòm, cờ
      const [c, x] = mk(72, 70);
      for (const tx of [2, 54]) { rect(x, tx, 14, 16, 54, '#7a4a24'); for (let y = 16; y < 68; y += 5) rect(x, tx, y, 16, 1, '#5a3a1c'); rect(x, tx - 2, 10, 20, 5, '#5a3a1c'); for (let i = 0; i < 4; i++) rect(x, tx - 2 + i * 6, 6, 3, 4, '#5a3a1c'); }
      rect(x, 18, 22, 36, 6, '#6b4224'); rect(x, 18, 22, 36, 1, '#a87a4a');
      rect(x, 22, 28, 28, 40, '#3a2414'); for (let i = 24; i < 50; i += 6) rect(x, i, 30, 2, 38, '#5a3a1c');
      rect(x, 9, 0, 2, 12, '#4a2e18'); rect(x, 11, 0, 9, 6, '#c8303a'); rect(x, 61, 0, 2, 12, '#4a2e18'); rect(x, 63, 0, 9, 6, '#c8303a');
      px(x, 14, 2, '#f2c94c'); px(x, 66, 2, '#f2c94c');
      SPR.gate = c;
    }
    { // chiến binh Sói Xám: áo xám, mũ da sói, rìu đá
      const flip = (c) => { const [d, x] = mk(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return d; };
      const folk = { skin: '#b07a50', tunic: '#5a5e66', hair: '#1b1b1b', band: '#3a3e44' };
      SPR.wolfwar = [0, 1].map(fr => {
        const [c, x] = mk(20, 30);
        ART.drawVillager(x, 9, 28, folk, fr ? 0.125 : 0.375, 'walk', 1);
        rect(x, 5, 3, 9, 4, '#8a8e96'); rect(x, 5, 2, 2, 2, '#8a8e96'); rect(x, 12, 2, 2, 2, '#8a8e96'); px(x, 7, 5, '#f2f2f2'); px(x, 11, 5, '#f2f2f2');
        rect(x, 14, 7, 2, 13, '#6b4224'); rect(x, 12, 5, 5, 4, '#7a7e86'); px(x, 16, 5, '#c0c4c8');
        rect(x, 6, 12, 1, 6, '#c8303a');
        return [flip(c), c];
      });
      if (window.DEF && DEF.SPR) DEF.SPR.wolfwar = SPR.wolfwar;
    }
  } catch (e) { console.error(e); }
  function drawObj(o, X, Y, lx) {
    if (o.type !== 'gate' || !SPR.gate) return null;
    const s = SPR.gate;
    return () => lx.drawImage(s, X + Math.round((o.w * T - s.width) / 2), Y + o.h * T - s.height + 2);
  }
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  function pushDraw(list, lx, L, Tp) {
    const g = G(); if (!g || !g.wall.lvl) return;
    const w = g.wall, f = WORLD.fire(); if (!f) return;
    const r = w.r, cx = (f.x + 0.5) * T, cy = (f.y + 0.5) * T, n = Math.round(2 * Math.PI * r / (w.lvl === 1 ? 0.25 : 0.33));
    const vw = lx.canvas.width, vh = lx.canvas.height, broken = 1 - w.hp / Math.max(1, wallMax());
    const gate = WORLD.objsOf('gate')[0];
    const gA = gate ? Math.atan2((gate.y + gate.h / 2) * T - cy, (gate.x + gate.w / 2) * T - cx) : null;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      if (gA !== null && Math.abs(Math.atan2(Math.sin(a - gA), Math.cos(a - gA))) < 0.05) continue; // lối cổng
      const wx = cx + Math.cos(a) * r * T, wy = cy + Math.sin(a) * r * T;
      const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
      if (!WORLD.inb(tx, ty) || WORLD.ter(tx, ty) === 'water') continue;
      const X = L(wx), Y = Tp(wy);
      if (X < -20 || Y < -40 || X > vw + 20 || Y > vh + 20) continue;
      if (w.hp <= 0 || (broken > 0.15 && ((k * 7919) % 100) / 100 < broken * 0.8)) { list.push([wy - 2, () => { R(lx, X - 3, Y - 2, 6, 2, '#5a3a1c'); }]); continue; }
      const lv = w.lvl;
      list.push([wy, () => {
        if (lv === 1) { const h = 12 + (k % 2) * 3; R(lx, X - 3, Y - h, 5, h, '#7a4a24'); R(lx, X - 3, Y - h, 1, h, '#a87a4a'); R(lx, X - 2, Y - h - 2, 3, 2, '#c8a060'); if (k % 4 === 0) R(lx, X - 4, Y - 8, 9, 2, '#5a3a1c'); }
        else if (lv === 2) { R(lx, X - 5, Y - 13, 10, 13, '#8a7a62'); R(lx, X - 5, Y - 13, 10, 2, '#a89a80'); R(lx, X - 5, Y - 7, 10, 1, '#6d6250'); if (k % 3 === 0) R(lx, X - 5, Y - 13, 1, 13, '#6d6250'); }
        else { R(lx, X - 5, Y - 18, 10, 18, '#8d8478'); R(lx, X - 5, Y - 18, 10, 2, '#b4b0a8'); R(lx, X - 5, Y - 10, 10, 1, '#6d665c'); if (k % 4 < 2) R(lx, X - 4, Y - 22, 8, 4, '#8d8478'); if (k % 4 === 0) R(lx, X - 4, Y - 22, 8, 1, '#b4b0a8'); }
      }]);
    }
  }

  return {
    migrate, per, barracksWant, rank, rankName, rankMult, generalBonus, battle, popBonus, wallHold, wallR, wallMax, startWall,
    autoJobs, wantBuild, handles, check, assign, planJob, task, jobText, WORK_POSE, tick, overnight,
    DESC, objActions, panelHTML, updatePanel, SPR, drawObj, pushDraw, TARGETS: TG, foeSize, foeTile,
  };
})();
window.ARMY = ARMY;
