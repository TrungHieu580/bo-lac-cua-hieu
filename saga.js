// =====================================================================
//  SAGA — ý tưởng từ Quest for Fire, Alpha, Earth's Children, The Croods, Origins
//  • Giữ lửa: lửa cần củi, mưa bão / hết củi làm tắt lửa → phải nhóm lại hoặc xin lửa
//  • Bốn mùa, mùa đông giá rét: cần áo lông thú, củi, tích trữ thức ăn
//  • Săn voi ma mút theo nhóm 5–6 người
//  • Thám hiểm vùng đất mới (2–3 người đi vài ngày)
//  • Thuần hóa sói con thành chó, thuần ngựa hoang
//  • Cây phát minh qua 3 thời đại: Đồ đá cũ → Đồ đá mới → Đồ đồng
//  • Bộ lạc lân cận: trao đổi, tặng quà, kết minh hoặc bị đột kích
//  • Vách đá vẽ tranh: ký ức bộ lạc
// =====================================================================
'use strict';
const SAGA = (() => {
  const T = CFG.TILE, FI = CFG.FIRE, SE = CFG.SEASONS, MM = CFG.MAMMOTH, EX = CFG.EXPEDITION, PE = CFG.PETS, NB = CFG.NEIGHBOR, IV = CFG.INVENT;
  const rand = () => Math.random();
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cnt = (t) => S.objects.filter(o => o.type === t).length;
  const objOf = (t) => S.objects.find(o => o.type === t);
  const isJob = (v, t) => v.job && v.job.type === t;
  const names = (vs) => vs.map(v => v.name).join(', ');
  const lvl = () => (window.TRB ? TRB.level() : 1);
  const adults = () => S.villagers.filter(v => !v.child);
  const tc = (tx, ty) => [tx * T + T / 2, ty * T + T * 0.75];
  const G = () => S.saga;

  // ---------------- DỮ LIỆU ----------------
  function migrate(s) {
    if (!s.saga) s.saga = {
      fuel: 85, out: false, outs: 0, relit: 0, furs: 3,
      pups: [], dogs: [], horses: 0, nextPet: 1,
      exps: [], expCount: 0, nextExp: 1, lastExp: 0,
      mhunt: null, mammoths: 0,
      inv: {}, prog: {}, research: null, era: 1,
      nb: { met: false, rel: NB.start, trades: 0, gifts: 0, raids: 0, repelled: 0, ally: false, visit: null, raid: null, ignored: 0 },
      mem: [], seen: {}, winters: 0, lastLevel: 1, lastBirths: 0, lastPop: 0,
    };
    const g = s.saga;
    if (!g.nb) g.nb = { met: false, rel: NB.start, trades: 0, gifts: 0, raids: 0, repelled: 0, ally: false, visit: null, raid: null, ignored: 0 };
    if (!g.seen) g.seen = {};
    if (!g.mem) g.mem = [];
  }
  const awayIds = () => S.saga ? S.saga.exps.flatMap(e => (e.party || []).map(p => p.id)) : [];

  // ---------------- MÙA ----------------
  const seasonOf = (d) => Math.floor((d - 1) / SE.len) % 4;
  const season = () => seasonOf(S.day);
  const winter = () => season() === 3;
  const dayInSeason = () => ((S.day - 1) % SE.len) + 1;
  const SEASON_ICON = ['spring', 'sun', 'leaf', 'snow'];
  // gọi khi qua đêm (trước khi sang ngày mới): sáng mai có phải mùa đông không
  const frozenNight = () => seasonOf(S.day + 1) === 3;
  function growMult() { return frozenNight() ? (has('calendar') ? 0.75 : 0.35) : (has('calendar') ? 1.15 : 1); }

  // ---------------- PHÁT MINH ----------------
  const INV = [
    { id: 'trap',      era: 1, cost: 8,  name: 'Bẫy thú',             desc: 'Mỗi sáng bẫy quanh làng có thể bắt được thú nhỏ (+thức ăn, đôi khi có da).' },
    { id: 'firedrill', era: 1, cost: 8,  name: 'Que khoan lửa',       desc: 'Nhóm lại lửa chắc chắn thành công trong 1 giờ; lửa cháy tiết kiệm củi hơn 15%.' },
    { id: 'sewing',    era: 1, cost: 10,  name: 'Kim xương & áo da',   desc: 'Mỗi lần săn thành công thêm 1 áo lông; rét mùa đông giảm một nửa.' },
    { id: 'axe',       era: 1, cost: 10,  name: 'Rìu đá có cán',       desc: 'Đốn gỗ, nhặt đá và xây dựng nhanh hơn 12%.' },
    { id: 'pottery',   era: 2, cost: 16, name: 'Đồ gốm',              desc: 'Chum vại chứa thêm 30 thức ăn.' },
    { id: 'bow',       era: 2, cost: 18, name: 'Cung tên',            desc: 'Đi săn thành công thêm 12%; người canh gác đánh mạnh hơn 25%.' },
    { id: 'sickle',    era: 2, cost: 16, name: 'Liềm đá',             desc: 'Làm ruộng (dọn, gieo, gặt) nhanh hơn 20%.' },
    { id: 'shoes',     era: 2, cost: 14, name: 'Giày da',             desc: 'Đi lại nhanh hơn 10%; đoàn thám hiểm ít gặp nạn hơn.' },
    { id: 'bronze',    era: 3, cost: 30, name: 'Luyện đồng',          desc: 'Mọi việc nhanh hơn 8%; đánh thú dữ mạnh hơn 30%, giáo ít gãy.' },
    { id: 'wheel',     era: 3, cost: 28, name: 'Bánh xe',             desc: 'Xây dựng và chở vật liệu nhanh hơn 15%.' },
    { id: 'calendar',  era: 3, cost: 26, name: 'Lịch mùa vụ',         desc: 'Ruộng vẫn lớn khá tốt trong mùa đông và lớn nhanh hơn 15% các mùa khác.' },
  ];
  const ERA_NAME = ['', 'Thời đồ đá cũ', 'Thời đồ đá mới', 'Thời đồ đồng'];
  const ERA_NEED = { 2: { prev: 3, level: 2 }, 3: { prev: 3, level: 4 } };
  const has = (id) => !!(S.saga && S.saga.inv[id]);
  const invOf = (id) => INV.find(i => i.id === id);
  function calcEra() {
    let e = 1;
    for (const k of [2, 3]) { const n = ERA_NEED[k]; if (INV.filter(i => i.era === k - 1 && has(i.id)).length >= n.prev && lvl() >= n.level && e === k - 1) e = k; }
    return e;
  }
  const era = () => (S.saga ? S.saga.era : 1);
  const canResearch = (i) => !has(i.id) && i.era <= era();
  function ideasPerNight() {
    let n = 1 + Math.floor(adults().length / IV.perAdults);
    if (cnt('paintwall')) n++;
    if (cnt('workshop')) n++;
    if (window.TRB && S.roles && S.roles.prophet && SIM.vById(S.roles.prophet)) n++;
    if (era() >= 2) n++;
    return n;
  }
  function autoResearch() {
    const g = G();
    if (g.research && canResearch(invOf(g.research))) return;
    const av = INV.filter(canResearch).sort((a, b) => (a.cost - (g.prog[a.id] || 0)) - (b.cost - (g.prog[b.id] || 0)));
    g.research = av.length ? av[0].id : null;
  }
  function addIdeas(n) {
    const g = G();
    autoResearch();
    while (n > 0 && g.research) {
      const i = invOf(g.research), need = i.cost - (g.prog[i.id] || 0), use = Math.min(n, need);
      g.prog[i.id] = (g.prog[i.id] || 0) + use; n -= use;
      if (g.prog[i.id] >= i.cost) {
        g.inv[i.id] = S.day;
        SIM.event(`Phát minh mới: ${i.name}! ${i.desc}`);
        EV.emit('toast', `💡 Phát minh mới: ${i.name}`);
        if (!g.seen.firstInv) { g.seen.firstInv = 1; memory('invent', `Phát minh đầu tiên: ${i.name}`); }
        g.research = null; checkEra(); autoResearch();
      }
    }
  }
  function checkEra() {
    const g = G(), e = calcEra();
    if (e <= g.era) return;
    g.era = e;
    S.villagers.forEach(v => v.morale = clamp(v.morale + 8, 0, 100));
    SIM.event(`Bộ lạc bước sang ${ERA_NAME[e]}! Mở ra những phát minh mới.`);
    EV.emit('toast', `Bộ lạc bước sang ${ERA_NAME[e]}!`);
    memory('era', `Bước sang ${ERA_NAME[e]}`);
    g.research = null; autoResearch();
  }

  // ---------------- KÝ ỨC BỘ LẠC ----------------
  function memory(k, t) {
    const g = G();
    if (g.mem.length >= 45) return;
    g.mem.push({ d: S.day, k, t, p: 0 });
    SIM.log(`Ký ức bộ lạc: ${t}.`, 'ev');
  }
  function watch() {
    const g = G();
    const L = lvl();
    if (L > g.lastLevel) { for (let l = g.lastLevel + 1; l <= L; l++) memory('fire', `Lửa trại lên cấp ${l}`); g.lastLevel = L; }
    const b = S.pop ? S.pop.births : 0;
    if (b > g.lastBirths) { if (g.lastBirths === 0) memory('baby', 'Em bé đầu tiên chào đời'); else if (Math.floor(b / 5) > Math.floor(g.lastBirths / 5)) memory('baby', `Em bé thứ ${Math.floor(b / 5) * 5} chào đời`); g.lastBirths = b; }
    const pop = S.villagers.length;
    for (const m of [10, 20, 30, 40]) if (pop >= m && g.lastPop < m) memory('people', `Bộ lạc có ${m} người`);
    g.lastPop = Math.max(g.lastPop, pop);
    for (const k of ['temple', 'stonering', 'greathall']) if (cnt(k) && !g.seen['b_' + k]) { g.seen['b_' + k] = 1; memory('temple', `Hoàn thành ${CFG.BUILDINGS[k].name}`); }
    if (S.def && S.def.kills && !g.seen.kill) { g.seen.kill = 1; memory('spear', 'Hạ gục con thú dữ đầu tiên'); }
  }

  // ---------------- GIỮ LỬA ----------------
  const fireOut = () => !!(S.saga && S.saga.out);
  function burnMult() {
    let m = 1 + 0.08 * (lvl() - 1);
    if (S.weather === 'rain') m *= FI.rainMult;
    if (winter()) m *= FI.winterMult;
    if (has('firedrill')) m *= 0.85;
    return m;
  }
  function woodReserve() { return fireOut() ? FI.kindleWood : winter() ? FI.stokeWood * 3 : FI.stokeWood * 2; }
  function extinguish(why) {
    const g = G();
    if (g.out) return;
    g.out = true; g.fuel = 0; g.outs++;
    S.villagers.forEach(v => v.morale = clamp(v.morale - 4, 0, 100));
    SIM.event(`${why} — ngọn lửa của bộ lạc đã tắt! Thú dữ không còn sợ, không thể nấu ăn. Hãy nhóm lại lửa!`);
    EV.emit('toast', '🔥 Ngọn lửa đã tắt! Cần nhóm lại ngay');
  }
  function relight(byWho) {
    const g = G();
    g.out = false; g.fuel = Math.max(g.fuel, 40); g.relit++;
    S.villagers.forEach(v => v.morale = clamp(v.morale + 5, 0, 100));
    SIM.event(`${byWho} — ngọn lửa bùng cháy trở lại! Cả bộ lạc reo mừng.`);
    EV.emit('toast', '🔥 Lửa đã cháy trở lại!');
    if (!g.seen.relit) { g.seen.relit = 1; memory('fire', 'Nhóm lại ngọn lửa sau khi lửa tắt'); }
  }
  function stoke(amount) { const g = G(); g.fuel = clamp(g.fuel + amount, 0, 100); }

  // ---------------- THÚ NUÔI ----------------
  const DOG_NAMES = ['Mực', 'Vện', 'Vàng', 'Đốm', 'Lu', 'Ki', 'Bông', 'Nâu'];
  const dogCount = () => (S.saga ? S.saga.dogs.length : 0);
  const horses = () => (S.saga ? S.saga.horses : 0);
  function addPup(why) {
    const g = G();
    if (g.pups.length + g.dogs.length >= PE.maxDogs) return false;
    const used = new Set([...g.pups, ...g.dogs].map(d => d.name));
    const name = DOG_NAMES.find(n => !used.has(n)) || `Sói ${g.nextPet}`;
    g.pups.push({ id: g.nextPet++, name, born: S.day });
    SIM.event(`${why} Bộ lạc đặt tên nó là ${name} và nuôi nấng — vài ngày nữa nó sẽ thành chó săn.`);
    EV.emit('toast', `Nhặt được sói con ${name}!`);
    return true;
  }
  function beastKilled(b, fs) {
    if (!S.saga) return;
    const g = G(), K = CFG.BEASTS[b.kind];
    if (K.raid) {
      g.nb.repelled++; g.nb.rel = clamp(g.nb.rel + 3, 0, 100);
      if (!g.seen.repel) { g.seen.repel = 1; memory('spear', `Đánh lui cuộc đột kích của ${NB.name}`); }
      return;
    }
    const f = { wolf: 1, bear: 2, tiger: 2 }[b.kind] || 1;
    g.furs = Math.min(SE.furCap, g.furs + f);
    if (b.kind === 'wolf' && rand() < PE.pupChance) addPup(`Gần xác con sói, ${fs[0] ? fs[0].name : 'dân làng'} tìm thấy một con sói con đang run rẩy.`);
    if ((b.kind === 'bear' || b.kind === 'tiger') && !g.seen['k_' + b.kind]) { g.seen['k_' + b.kind] = 1; memory('spear', `Hạ gục ${K.name.toLowerCase()} đầu tiên`); }
  }

  // ---------------- HIỆU ỨNG LÊN HỆ THỐNG KHÁC ----------------
  function workMult(v, skill) {
    let m = 1;
    if (skill === 'build') { if (has('axe')) m *= 1.12; if (has('wheel')) m *= 1.15; }
    if (skill === 'farm' && has('sickle')) m *= 1.2;
    if (has('bronze')) m *= 1.08;
    return m;
  }
  function walkMult() { return has('shoes') ? 1.1 : 1; }
  function capBonus() { return has('pottery') ? 30 : 0; }
  function fightMult() { let m = 1 + 0.1 * Math.min(4, dogCount()); if (has('bow')) m *= 1.25; if (has('bronze')) m *= 1.3; return m; }
  function huntMod(est) {
    if (!S.saga || !(est.chance > 0)) return est;
    let add = Math.min(0.16, dogCount() * 0.04) + horses() * 0.04 + (has('bow') ? 0.12 : 0);
    est.chance = Math.min(0.95, est.chance + add);
    est.injury = Math.max(0.02, est.injury * (1 - 0.05 * Math.min(4, dogCount())));
    return est;
  }
  function afterHuntWin(vs) {
    const g = G(); if (!g) return;
    g.furs = Math.min(SE.furCap, g.furs + 1 + (has('sewing') ? 1 : 0));
  }

  // ---------------- CHỌN NGƯỜI RẢNH ----------------
  function free(v, allowAuto) {
    if (v.child || v.resting || v.pregnant > 0 || v.inside || v.carry || v.health < 35) return false;
    if (window.TRB && TRB.reserved(v)) return false;
    if (!v.job) return true;
    if (!allowAuto || !v.job.auto) return false;
    if (['guard', 'hunt', 'build', 'upgrade', 'upgradeFire', 'cook', 'mammoth', 'explore', 'tame', 'stoke', 'kindle', 'paint', 'craft'].includes(v.job.type)) return false;
    return !v.task || v.task.kind !== 'work';
  }
  function pickFree(skill, allowAuto, except) {
    const ex = except || [];
    const c = S.villagers.filter(v => !ex.includes(v) && free(v, allowAuto));
    c.sort((a, b) => (b.job ? 0 : 1) - (a.job ? 0 : 1) || (b.skills[skill] || 1) - (a.skills[skill] || 1));
    return c[0] || null;
  }
  function setJob(v, job) { v.job = Object.assign({ auto: true, until: 99 }, job); v.task = null; v.resting = false; }

  // ---------------- VỊ TRÍ ----------------
  function freeRect(x, y, w, h, ters) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const t = WORLD.ter(x + i, y + j);
      if (!t || !ters.includes(t) || !WORLD.walkable(x + i, y + j) || !WORLD.inMain(x + i, y + j)) return false;
      if (WORLD.objAt(x + i, y + j, o => o.type !== 'huntzone')) return false;
    }
    return true;
  }
  function spotInZone(w, h) {
    const zs = S.objects.filter(o => o.type === 'huntzone').sort((a, b) => b.w * b.h - a.w * a.h);
    for (const z of zs) for (let k = 0; k < 80; k++) {
      const x = z.x + Math.floor(rand() * Math.max(1, z.w - w + 1)), y = z.y + Math.floor(rand() * Math.max(1, z.h - h + 1));
      if (freeRect(x, y, w, h, ['meadow', 'grass', 'dirt', 'forest'])) return [x, y];
    }
    return null;
  }
  function spotNearFire(w, h, r0, r1) {
    const f = WORLD.fire();
    for (let r = r0; r <= r1; r++) for (let k = 0; k < 24; k++) {
      const a = rand() * Math.PI * 2, x = Math.round(f.x + Math.cos(a) * r), y = Math.round(f.y + Math.sin(a) * r * 0.8);
      if (freeRect(x, y, w, h, ['grass', 'dirt', 'forest', 'rock', 'meadow'])) return [x, y];
    }
    return null;
  }
  const ring = (o) => WORLD.ringTiles(o).filter(([x, y]) => WORLD.inMain(x, y));

  // ---------------- VOI MA MÚT ----------------
  const mammoth = () => objOf('mammoth');
  const allyHelp = () => (S.saga && S.saga.nb.ally ? 2 : 0);
  const needHunters = () => Math.max(3, MM.minHunters - allyHelp());
  function mEst(vs) {
    const n = vs.length;
    if (!n) return { chance: 0, injury: 0, meat: 0 };
    const sk = vs.reduce((s, v) => s + v.skills.hunt, 0) / n;
    const armed = Math.min(S.res.spears || 0, n);
    let chance = MM.base + MM.perHunter * (n + allyHelp()) + MM.spear * armed + 0.03 * (sk - 2) + Math.min(0.16, dogCount() * 0.04) + horses() * 0.05 + (has('bow') ? 0.1 : 0) - (S.weather === 'rain' ? 0.08 : 0);
    if (n < needHunters()) chance *= 0.4;
    chance = clamp(chance, 0.05, 0.95);
    const injury = clamp(MM.injury - 0.04 * armed - 0.02 * (sk - 2) - (has('bronze') ? 0.08 : 0), 0.08, 0.6);
    return { chance, injury, meat: Math.round(MM.meat * (window.EXP ? EXP.meatMult() : 1)) };
  }
  function mMembers() { const h = G().mhunt; return h ? h.members.map(SIM.vById).filter(v => v && isJob(v, 'mammoth')) : []; }
  function endMHunt(msg) {
    for (const v of mMembers()) { v.job = null; v.task = null; if (msg) v.note = msg; }
    G().mhunt = null;
  }
  function resolveMammoth() {
    const g = G(), vs = mMembers(), o = WORLD.byId(g.mhunt.target);
    const e = mEst(vs), win = rand() < e.chance;
    if (win) {
      let left = e.meat;
      vs.forEach((v, i) => { const s = i === vs.length - 1 ? left : Math.ceil(e.meat / vs.length); const a = Math.min(s, left); left -= a; v.carry = { food: a, vis: 'meat' }; v.morale = clamp(v.morale + 10, 0, 100); if (v.skills.hunt < 5 && rand() < 0.35) { v.skills.hunt++; SIM.log(`Kỹ năng Săn bắt của ${v.name} tăng lên ${v.skills.hunt}.`, 'ev'); } });
      g.furs = Math.min(SE.furCap, g.furs + MM.furs);
      g.mammoths++;
      S.villagers.forEach(v => v.morale = clamp(v.morale + 6, 0, 100));
      SIM.event(`Cuộc săn lớn! ${names(vs)} đã hạ gục voi ma mút: ${e.meat} phần thịt và ${MM.furs} tấm da lông. Cả bộ lạc mở tiệc!`);
      EV.emit('toast', `🦣 Hạ gục voi ma mút! +${e.meat} thịt, +${MM.furs} áo lông`);
      memory('mammoth', g.mammoths === 1 ? 'Cuộc săn voi ma mút đầu tiên' : `Hạ gục voi ma mút lần thứ ${g.mammoths}`);
    } else {
      SIM.event(`Voi ma mút nổi giận hất văng nhóm săn (${names(vs)}) rồi dẫn đàn bỏ chạy.`);
      EV.emit('toast', 'Săn voi ma mút thất bại — đàn voi đã chạy mất');
    }
    for (const v of vs) if (rand() < e.injury) {
      const dmg = MM.dmg[0] + Math.floor(rand() * (MM.dmg[1] - MM.dmg[0] + 1));
      v.health = clamp(v.health - dmg, 1, 100);
      SIM.event(`${v.name} bị voi ma mút húc trúng (−${dmg} sức khỏe).`);
    }
    if (o) WORLD.removeObj(o);
    WORLD.rebuild();
    endMHunt(win ? 'Săn được voi ma mút!' : 'Săn voi ma mút thất bại');
  }
  function tickMammoth(dt) {
    const g = G(), h = g.mhunt; if (!h) return;
    const vs = mMembers(), o = WORLD.byId(h.target);
    if (!o) { endMHunt('Đàn voi đã đi mất'); return; }
    if (vs.length < Math.min(needHunters(), h.members.length)) { SIM.log('Nhóm săn voi ma mút thiếu người nên rút về.'); EV.emit('toast', 'Nhóm săn voi ma mút thiếu người, rút về'); endMHunt('Rút về vì thiếu người'); return; }
    if (S.hour >= CFG.EVENING - 0.5) { SIM.log('Trời sắp tối, nhóm săn voi ma mút rút về trại.'); endMHunt('Trời tối, rút về'); return; }
    if (h.phase === 'go') {
      if (vs.every(v => v.task && v.task.kind === 'mwait')) { h.phase = 'fight'; vs.forEach(v => v.task = { kind: 'mfight', target: o.id }); SIM.log(`${names(vs)} bắt đầu vây voi ma mút, hò hét và phóng giáo!`); }
    } else {
      h.progress += dt;
      if (h.progress >= MM.hours) resolveMammoth();
    }
  }

  // ---------------- NGỰA HOANG ----------------
  const wildHorse = () => objOf('wildhorse');
  function resolveTame(o) {
    const g = G(), vs = S.villagers.filter(v => isJob(v, 'tame') && v.job.target === o.id);
    const sk = Math.max(1, ...vs.map(v => v.skills.hunt));
    if (rand() < PE.tameChance + 0.07 * sk) {
      g.horses++;
      SIM.event(`${names(vs)} đã thuần phục được con ngựa hoang! Bộ lạc có ${g.horses} con ngựa — đi săn, thám hiểm nhanh hơn.`);
      EV.emit('toast', `🐎 Thuần phục được ngựa hoang! (${g.horses} ngựa)`);
      if (g.horses === 1) memory('horse', 'Thuần phục con ngựa đầu tiên');
    } else {
      const v = pick(vs);
      if (v) { v.health = clamp(v.health - 8, 1, 100); }
      SIM.event(`Con ngựa hoang hất ngã ${v ? v.name : 'người thuần ngựa'} rồi phi nước đại vào đồng cỏ.`);
      EV.emit('toast', 'Ngựa hoang đã chạy thoát');
    }
    WORLD.removeObj(o); WORLD.rebuild();
    vs.forEach(v => { v.job = null; v.task = null; });
  }

  // ---------------- THÁM HIỂM ----------------
  function expMembers(e) { return e.members.map(SIM.vById).filter(v => v && isJob(v, 'explore') && v.job.exp === e.id); }
  function cancelExp(e, why) {
    for (const v of expMembers(e)) { v.job = null; v.task = null; v.note = why; }
    G().exps = G().exps.filter(x => x !== e);
    SIM.log(why);
  }
  function depart(e) {
    const vs = expMembers(e);
    e.party = vs.map(v => { const c = JSON.parse(JSON.stringify(v)); c.job = null; c.task = null; c.carry = null; c.inside = 0; delete c.bed; return c; });
    const ids = new Set(vs.map(v => v.id));
    S.villagers = S.villagers.filter(v => !ids.has(v.id));
    e.phase = 'away';
    e.back = S.day + Math.max(1, EX.days - (horses() ? 1 : 0));
    SIM.event(`Đoàn thám hiểm (${names(vs)}) đã lên đường vào vùng đất chưa ai biết. Họ sẽ trở về sau ${e.back - S.day} ngày.`);
    EV.emit('toast', `Đoàn thám hiểm lên đường (${vs.length} người)`);
  }
  function returnExp(e) {
    const g = G();
    const [tx, ty] = WORLD.nearestMain(e.tile[0], e.tile[1]);
    for (const p of e.party) { [p.x, p.y] = tc(tx, ty); p.task = null; p.job = null; p.inside = 0; S.villagers.push(p); }
    const vs = e.party.map(p => SIM.vById(p.id)).filter(Boolean);
    g.exps = g.exps.filter(x => x !== e);
    g.expCount++;
    const found = [];
    const risk = EX.risk - (has('shoes') ? 0.1 : 0) - (horses() ? 0.05 : 0);
    const roll = () => {
      const opts = [['res', 3], ['seeds', 2], ['furs', 2], ['idea', 2], ['people', EXP.hasRoom() ? 2 : 0],
        ['pup', g.pups.length + g.dogs.length < PE.maxDogs ? 1.5 : 0], ['tribe', g.nb.met ? 0 : 3], ['horse', lvl() >= PE.horseLevel && !wildHorse() && g.horses < PE.maxHorses ? 1.5 : 0], ['beast', 1]];
      let tot = opts.reduce((s, o) => s + o[1], 0), r = rand() * tot;
      for (const [k, w] of opts) { r -= w; if (r <= 0) return k; }
      return 'res';
    };
    const kinds = new Set([roll(), rand() < 0.6 ? roll() : null].filter(Boolean));
    for (const k of kinds) {
      if (k === 'res') { const s = 10 + Math.floor(rand() * 11), w = 6 + Math.floor(rand() * 8); S.res.stone = Math.min(SIM.cap('stone'), S.res.stone + s); S.res.wood = Math.min(SIM.cap('wood'), S.res.wood + w); found.push(`mỏ đá lửa quý (+${s} đá, +${w} gỗ)`); }
      if (k === 'seeds') { const n = 6 + Math.floor(rand() * 6); S.res.seeds = Math.min(CFG.SEED_CAP, S.res.seeds + n); found.push(`hạt giống lạ (+${n} hạt)`); }
      if (k === 'furs') { g.furs = Math.min(SE.furCap, g.furs + 4); found.push('xác thú lớn còn tốt (+4 áo lông)'); }
      if (k === 'idea') { addIdeas(4); found.push('hang đá cổ có hình vẽ lạ, học được cách làm mới (+4 ý tưởng)'); }
      if (k === 'people' && EXP.newcomer()) found.push('một người lang thang xin theo về');
      if (k === 'pup') { addPup('Đoàn thám hiểm ôm về một con sói con bị lạc mẹ.'); found.push('một con sói con'); }
      if (k === 'tribe') { g.nb.met = true; g.nb.rel = clamp(g.nb.rel + 5, 0, 100); found.push(`làng của ${NB.name} bên kia núi`); memory('hand', `Gặp ${NB.name}`); }
      if (k === 'horse') { spawnWildHorse(); found.push('một đàn ngựa hoang, một con đang theo về gần làng'); }
      if (k === 'beast') { g.furs = Math.min(SE.furCap, g.furs + 2); for (const v of vs) v.health = clamp(v.health - 10, 1, 100); found.push('một con hổ răng kiếm — cả đoàn chiến đấu thoát thân (+2 da, mọi người bị thương nhẹ)'); }
    }
    for (const v of vs) {
      if (rand() < risk) { const d = 12 + Math.floor(rand() * 16); v.health = clamp(v.health - d, 1, 100); SIM.log(`${v.name} bị thương trên đường thám hiểm (−${d} sức khỏe).`); }
      const sk = pick(['hunt', 'gather', 'build', 'farm', 'guard']);
      if (v.skills[sk] < 5 && rand() < 0.35) v.skills[sk]++;
      v.morale = clamp(v.morale + 6, 0, 100);
      v.note = 'Vừa thám hiểm trở về';
    }
    SIM.event(`Đoàn thám hiểm (${names(vs)}) đã trở về! Họ tìm thấy: ${found.join('; ')}.`);
    EV.emit('toast', `Đoàn thám hiểm trở về: ${found.join(', ')}`);
    if (g.expCount === 1) memory('feet', 'Chuyến thám hiểm đầu tiên');
  }
  function tickExp() {
    for (const e of G().exps.slice()) {
      if (e.phase !== 'go') continue;
      const vs = expMembers(e);
      if (vs.length < EX.min) { cancelExp(e, 'Đoàn thám hiểm thiếu người nên hủy chuyến đi.'); continue; }
      if (S.hour >= CFG.EVENING - 0.4) { cancelExp(e, 'Trời tối trước khi đoàn thám hiểm kịp lên đường — mai hãy đi.'); continue; }
      if (vs.every(v => v.task && v.task.kind === 'expwait')) depart(e);
    }
  }

  // ---------------- BỘ LẠC LÂN CẬN ----------------
  const visitors = () => objOf('visitors');
  const OFFERS = [
    { give: { food: 12 }, get: { stone: 10 } }, { give: { food: 10 }, get: { wood: 12 } }, { give: { wood: 10 }, get: { seeds: 6 } },
    { give: { stone: 8 }, get: { food: 14 } }, { give: { furs: 3 }, get: { food: 18 } }, { give: { food: 15 }, get: { spears: 2 } },
    { give: { wood: 8 }, get: { furs: 2 } }, { give: { stone: 10 }, get: { furs: 2 } }, { give: { food: 14 }, get: { seeds: 8 } },
  ];
  const RES_NAME = { food: 'thức ăn', wood: 'gỗ', stone: 'đá', seeds: 'hạt giống', spears: 'giáo đá', furs: 'áo lông' };
  const amountOf = (k) => k === 'furs' ? G().furs : (S.res[k] || 0);
  const capOf = (k) => k === 'furs' ? SE.furCap : k === 'spears' ? (window.DEF ? DEF.spearCap() : 10) : SIM.cap(k);
  function addRes(k, n) { if (k === 'furs') G().furs = clamp(G().furs + n, 0, SE.furCap); else S.res[k] = clamp((S.res[k] || 0) + n, 0, capOf(k)); }
  const fmtDeal = (d) => Object.entries(d).map(([k, n]) => `${n} ${RES_NAME[k]}`).join(', ');
  function canPay(d) { return Object.entries(d).every(([k, n]) => amountOf(k) >= n); }
  function makeOffer() {
    const score = (o) => {
      const [gk, gn] = Object.entries(o.give)[0], [rk, rn] = Object.entries(o.get)[0];
      const spare = amountOf(gk) - gn - (gk === 'food' ? S.villagers.length * 2 : gk === 'wood' ? woodReserve() + 6 : 4);
      const need = 1 - amountOf(rk) / Math.max(1, capOf(rk));
      return (spare >= 0 ? 1 : 0.2) + need + rand() * 0.5;
    };
    return JSON.parse(JSON.stringify(OFFERS.slice().sort((a, b) => score(b) - score(a))[0]));
  }
  function setRel(d) {
    const nb = G().nb;
    nb.rel = clamp(nb.rel + d, 0, 100);
    if (!nb.ally && nb.rel >= NB.allyAt) {
      nb.ally = true;
      S.villagers.forEach(v => v.morale = clamp(v.morale + 6, 0, 100));
      SIM.event(`${NB.name} kết minh với bộ lạc của Hiếu! Từ nay họ giúp săn voi ma mút, cho lửa khi cần và thỉnh thoảng gửi quà.`);
      EV.emit('toast', `🤝 Kết minh với ${NB.name}!`);
      memory('hand', `Kết minh với ${NB.name}`);
    } else if (nb.ally && nb.rel < 50) { nb.ally = false; SIM.event(`Tình thân với ${NB.name} đã phai nhạt, liên minh tan vỡ.`); }
  }
  const relName = (r) => r >= NB.allyAt ? 'Đồng minh' : r >= 55 ? 'Thân thiện' : r >= 35 ? 'Bình thường' : r >= NB.raidBelow ? 'Nghi ngại' : 'Thù địch';
  function spawnVisitors() {
    const g = G(), nb = g.nb;
    nb.visit = null;
    if (visitors()) return;
    const sp = spotNearFire(2, 1, 3, 7); if (!sp) return;
    const from = (window.DEF && DEF.spawnTile()) || [0, sp[1]];
    const first = !nb.met;
    nb.met = true;
    WORLD.addObj({ type: 'visitors', x: sp[0], y: sp[1], w: 2, h: 1, offer: makeOffer(), from, t0: S.hour, leave: CFG.EVENING - 0.6, dealt: 0 });
    if (first) { SIM.event(`Ba người lạ mặt vẽ đất đỏ trên mặt tiến về bếp lửa — họ là ${NB.name} sống bên kia núi. Họ mang hàng tới đổi.`); memory('hand', `Gặp ${NB.name}`); }
    else SIM.event(`Người của ${NB.name} tới thăm, mang hàng muốn trao đổi.`);
    EV.emit('toast', `${NB.name} tới thăm — chạm vào họ để trao đổi`);
  }
  function visitorsLeave(o, why) {
    WORLD.removeObj(o); WORLD.rebuild();
    if (why) SIM.log(why);
  }
  function doTrade(o) {
    const of = o.offer;
    if (!canPay(of.give)) return { ok: false, msg: `Không đủ ${fmtDeal(of.give)}` };
    for (const [k, n] of Object.entries(of.give)) addRes(k, -n);
    for (const [k, n] of Object.entries(of.get)) addRes(k, n);
    const g = G(); g.nb.trades++; o.dealt = 1; o.leave = Math.min(o.leave, S.hour + 0.6);
    setRel(NB.tradeRel);
    SIM.event(`Trao đổi với ${NB.name}: đưa ${fmtDeal(of.give)}, nhận ${fmtDeal(of.get)}.`);
    if (g.nb.trades === 1) memory('hand', `Lần trao đổi đầu tiên với ${NB.name}`);
    return { ok: true, msg: `Đã đổi ${fmtDeal(of.give)} lấy ${fmtDeal(of.get)}` };
  }
  function doGift(o) {
    if (S.res.food < NB.giftFood) return { ok: false, msg: `Cần ${NB.giftFood} thức ăn để làm quà` };
    S.res.food -= NB.giftFood; G().nb.gifts++; o.dealt = 1;
    setRel(NB.giftRel);
    SIM.event(`Bộ lạc tặng ${NB.giftFood} thức ăn cho ${NB.name}. Họ rất cảm kích.`);
    return { ok: true, msg: `Đã tặng quà — quan hệ: ${relName(G().nb.rel)}` };
  }
  function autoVisitors(o) {
    if (!S.auto || o.dealt || S.hour < o.t0 + 1.4) return;
    const of = o.offer, [gk, gn] = Object.entries(of.give)[0];
    const spare = amountOf(gk) - gn - (gk === 'food' ? S.villagers.length * 2 : gk === 'wood' ? woodReserve() + 4 : 2);
    const [rk] = Object.keys(of.get);
    if (spare >= 0 && amountOf(rk) < capOf(rk) * 0.8) { doTrade(o); return; }
    if (G().nb.rel < 70 && SIM.foodDays() >= 4 && S.res.food >= NB.giftFood + S.villagers.length * 2) { doGift(o); return; }
    o.dealt = 2; // đã cân nhắc, không đổi
  }
  function spawnRaid(n) {
    const g = G();
    g.nb.raid = null;
    const t = window.DEF && DEF.spawnTile(); if (!t) return;
    const K = CFG.BEASTS.raider, [x, y] = tc(t[0], t[1]);
    for (let i = 0; i < n; i++) S.beasts.push({ id: S.def.nextId++, kind: 'raider', x: x + i * 12, y: y + i * 5, hp: K.hp, max: K.hp, life: 0, state: 'come', path: null, pi: 0, repath: 0, atk: 0, steals: 0, face: 1, hit: 0, hold: 0, goal: null, warned: dogCount() > 0 });
    S.def.active = true; g.nb.raids++;
    SIM.event(`⚠ ${n} chiến binh ${NB.name} kéo tới ${DEF.dirName(t[0], t[1])} định cướp kho lương! Người canh gác hãy ra chặn!`);
    EV.emit('toast', `⚠ ${NB.name} đột kích làng!`);
  }

  // ---------------- QUA ĐÊM ----------------
  function spawnMammoth() {
    const sp = spotInZone(3, 2); if (!sp) return false;
    WORLD.addObj({ type: 'mammoth', x: sp[0], y: sp[1], w: 3, h: 2, leave: S.day + 1, calf: rand() < 0.6 ? 1 : 0 });
    SIM.event('Mặt đất rung chuyển — một đàn voi ma mút đang đi ngang qua đồng cỏ! Cần ít nhất ' + needHunters() + ' thợ săn mang giáo để vây săn.');
    EV.emit('toast', '🦣 Đàn voi ma mút xuất hiện ở đồng cỏ!');
    return true;
  }
  function spawnWildHorse() {
    if (wildHorse()) return false;
    const sp = spotInZone(2, 1); if (!sp) return false;
    WORLD.addObj({ type: 'wildhorse', x: sp[0], y: sp[1], w: 2, h: 1, leave: S.day + 1, tame: 0 });
    SIM.event('Một con ngựa hoang đang gặm cỏ ở đồng cỏ. Cử người khéo tay ra thuần phục nó!');
    return true;
  }
  function overnight() {
    if (!S.saga) migrate(S);
    const g = G();
    // lửa qua đêm
    if (!g.out) {
      g.fuel -= FI.night * burnMult();
      if (S.weather === 'rain' && rand() < FI.stormChance) { g.fuel -= FI.storm; SIM.log('Đêm qua mưa gió quật vào bếp lửa, dập bớt lửa.'); }
      if (g.fuel <= 0) extinguish(S.weather === 'rain' ? 'Mưa bão đêm qua' : 'Đêm qua lửa cháy hết củi');
    }
    if (g.out) {
      S.villagers.forEach(v => v.morale = clamp(v.morale - 5, 0, 100));
      SIM.log('Đêm không có lửa, mọi người lạnh và sợ hãi.');
    }
    // mùa
    const sea = season(), dIn = dayInSeason();
    if (dIn === 1) {
      const msg = ['Mùa xuân đã về, cây cối đâm chồi, bụi quả lại sai trĩu.', 'Mùa hạ nắng ấm — thời điểm tốt để mở mang.', 'Mùa thu tới: hãy tích trữ thức ăn, củi và da lông cho mùa đông!', 'Mùa đông băng giá đã đến! Bụi quả không ra trái, ruộng lớn chậm, lửa ngốn nhiều củi. Ai thiếu áo lông sẽ bị rét.'][sea];
      SIM.event(msg); EV.emit('toast', `${SE.names[sea]}: ${msg.split(' — ')[0].split('!')[0]}`);
      if (sea === 0 && S.day > 1) {
        g.winters++;
        if (g.winters === 1) memory('snow', 'Vượt qua mùa đông đầu tiên');
        g.furs = Math.floor(g.furs * 0.75); SIM.log('Qua mùa đông, nhiều áo lông đã sờn rách.');
      }
    }
    if (sea === 2 && dIn === SE.len) { SIM.event(`Gió bấc thổi — ngày mai mùa đông bắt đầu! Áo lông hiện có: ${g.furs}/${S.villagers.length} người.`); EV.emit('toast', '❄ Mai là mùa đông — chuẩn bị củi và áo lông!'); }
    if (winter()) {
      const vs = S.villagers.slice().sort((a, b) => (b.child ? 1 : 0) - (a.child ? 1 : 0) || a.health - b.health);
      const cold = Math.round(SE.cold * (has('sewing') ? 0.5 : 1) * (g.out ? 2 : 1));
      const bare = vs.slice(Math.min(g.furs, vs.length));
      for (const v of bare) { v.health = clamp(v.health - cold, 1, 100); v.morale = clamp(v.morale - 3, 0, 100); }
      if (g.out) vs.slice(0, Math.min(g.furs, vs.length)).forEach(v => v.health = clamp(v.health - 3, 1, 100));
      if (bare.length) SIM.event(`Đêm đông giá rét: ${bare.length} người thiếu áo lông bị nhiễm lạnh (−${cold} sức khỏe). Đi săn để có thêm da thú!`);
    }
    // phát minh
    checkEra();
    addIdeas(ideasPerNight());
    if (has('trap') && rand() < (winter() ? 0.35 : 0.55)) { const n = 3 + Math.floor(rand() * 3); S.res.food = Math.min(SIM.cap('food'), S.res.food + n); if (rand() < 0.3) g.furs = Math.min(SE.furCap, g.furs + 1); SIM.log(`Bẫy quanh làng bắt được thú nhỏ (+${n} thức ăn).`); }
    // thú nuôi
    for (const p of g.pups.slice()) if (S.day - p.born >= PE.growDays) {
      g.pups = g.pups.filter(x => x !== p); g.dogs.push({ id: p.id, name: p.name });
      SIM.event(`Sói con ${p.name} đã lớn thành chó săn trung thành! Nó sẽ sủa báo thú dữ, theo người canh gác và đi săn cùng thợ săn.`);
      EV.emit('toast', `🐕 ${p.name} đã thành chó săn!`);
      if (g.dogs.length === 1) memory('dog', `Thuần hóa con chó đầu tiên — ${p.name}`);
    }
    // voi ma mút, ngựa hoang
    for (const o of S.objects.filter(o => (o.type === 'mammoth' || o.type === 'wildhorse') && o.leave < S.day)) { WORLD.removeObj(o); SIM.log(o.type === 'mammoth' ? 'Đàn voi ma mút đã đi xa khỏi đồng cỏ.' : 'Con ngựa hoang đã bỏ đi.'); }
    if (g.mhunt) endMHunt();
    const vo = visitors(); if (vo) WORLD.removeObj(vo);
    WORLD.rebuild();
    if (!mammoth() && S.day >= MM.minDay && rand() < MM.chance * (sea >= 2 ? 1.4 : 0.6)) spawnMammoth();
    if (lvl() >= PE.horseLevel && g.horses < PE.maxHorses && !wildHorse() && rand() < PE.horseChance) spawnWildHorse();
    // thám hiểm trở về
    for (const e of g.exps.slice()) {
      if (e.phase === 'away' && S.day >= e.back) returnExp(e);
      else if (e.phase === 'go') cancelExp(e, 'Chuyến thám hiểm bị hoãn.');
    }
    // bộ lạc lân cận
    const nb = g.nb;
    nb.visit = null; nb.raid = null;
    if (S.day >= NB.meetDay) {
      if (!nb.met) { if (rand() < 0.5) nb.visit = { hour: 8.5 + rand() * 3 }; }
      else if (nb.rel < NB.raidBelow && S.day >= NB.meetDay + 2 && rand() < 0.3) nb.raid = { hour: 9 + rand() * 5, n: 2 + (S.villagers.length >= 18 ? 1 : 0) + (S.villagers.length >= 30 ? 1 : 0) };
      else if (rand() < NB.visitChance + (nb.ally ? 0.15 : 0)) nb.visit = { hour: 8.5 + rand() * 3.5 };
      if (nb.met && !nb.ally && rand() < 0.12) {
        const why = pick(['Thợ săn hai bộ lạc tranh nhau một con hươu ở đồng cỏ', `Người ${NB.name} bắt gặp dân làng hái quả trên đất của họ`, `Có kẻ lấy trộm giáo của ${NB.name} và họ đổ lỗi cho làng ta`]);
        setRel(-10); SIM.event(`${why} — quan hệ với ${NB.name} xấu đi (${relName(nb.rel)}).`);
      }
      if (nb.ally) {
        if (rand() < 0.2) { const k = pick(['food', 'stone', 'wood']), n = k === 'food' ? 12 : 8; addRes(k, n); SIM.log(`${NB.name} gửi quà tặng: ${n} ${RES_NAME[k]}.`, 'ev'); }
        if (rand() < 0.07 && EXP.hasRoom() && EXP.newcomer()) { SIM.log(`Một người của ${NB.name} về làm dâu rể bộ lạc của Hiếu.`, 'ev'); }
      }
    }
    // tranh hang
    g.paintToday = 0;
    watch();
  }

  // ---------------- MỖI NHỊP ----------------
  let dutyAcc = 0;
  function tick(dt) {
    if (!S.saga) return;
    const g = G();
    if (!g.out) { g.fuel -= FI.burn * burnMult() * dt; if (g.fuel <= 0) extinguish('Củi cháy hết'); }
    tickMammoth(dt);
    tickExp();
    const nb = g.nb;
    if (nb.visit && S.hour >= nb.visit.hour && S.hour < 15) spawnVisitors();
    if (nb.raid && S.hour >= nb.raid.hour && S.hour < 16) spawnRaid(nb.raid.n);
    const vo = visitors();
    if (vo) {
      autoVisitors(vo);
      if (S.hour >= vo.leave) { if (!vo.dealt) { nb.ignored++; setRel(-3); } visitorsLeave(vo, vo.dealt === 1 ? `${NB.name} vui vẻ ra về.` : `${NB.name} ra về${vo.dealt ? '' : ' vì không ai tiếp chuyện'}.`); }
    }
    // chó sủa báo động
    if (dogCount() && S.beasts) for (const b of S.beasts) if (!b._dog) { b._dog = 1; if (!b.warned) { b.warned = true; if (!g._barked || g._barked < S.hour - 1) { g._barked = S.hour; SIM.log(`Chó ${pick(g.dogs).name} sủa vang báo động — mọi người kịp chuẩn bị!`); } } }
    dutyAcc += dt;
    if (dutyAcc >= 0.25) { dutyAcc = 0; duties(); }
  }
  // việc thiết yếu (chạy cả khi tắt tự động): giữ lửa, vẽ tranh
  function duties() {
    if (SIM.phase() !== 'day' || S.hour >= CFG.EVENING - 0.4) return;
    const g = G();
    if (g.out) {
      if (S.res.wood >= FI.kindleWood && !S.villagers.some(v => isJob(v, 'kindle'))) { const v = pickFree('gather', true); if (v) setJob(v, { type: 'kindle' }); }
    } else if (S.res.wood >= FI.stokeWood && !S.villagers.some(v => isJob(v, 'stoke')) && (g.fuel < FI.stokeAt || (S.hour >= 15.5 && g.fuel < 88))) {
      const v = pickFree('gather', true); if (v) setJob(v, { type: 'stoke' });
    }
    const wall = objOf('paintwall');
    if (wall && S.hour >= 8 && S.hour < 16 && g.mem.some(m => !m.p) && (g.paintToday || 0) < 3 && !S.villagers.some(v => isJob(v, 'paint'))) { const v = pickFree('gather', true); if (v) setJob(v, { type: 'paint' }); }
  }
  // việc tự động (chỉ khi bật Tự động)
  function autoJobs() {
    if (!S.saga) migrate(S);
    const g = G();
    const healthy = (v) => free(v, true) && v.health >= 55 && v.energy >= 45 && !isJob(v, 'guard');
    // voi ma mút
    const mo = mammoth();
    if (mo && !g.mhunt && S.hour < 13 && S.weather === 'sun') {
      const need = needHunters();
      const c = S.villagers.filter(healthy).sort((a, b) => b.skills.hunt - a.skills.hunt);
      const n = Math.min(c.length, need + 1);
      if (n >= need && adults().length - n >= 3 && (S.res.spears || 0) >= Math.min(3, need - 1)) {
        const vs = c.slice(0, n); assignMammoth(mo, vs);
        SIM.log(`Làng cử ${names(vs)} đi săn voi ma mút.`, 'ev');
      }
    }
    // ngựa hoang
    const wh = wildHorse();
    if (wh && S.hour < 14 && !S.villagers.some(v => isJob(v, 'tame'))) {
      const v = S.villagers.filter(healthy).sort((a, b) => b.skills.hunt - a.skills.hunt)[0];
      if (v) setJob(v, { type: 'tame', target: wh.id });
    }
    // thám hiểm
    if (!g.exps.length && S.hour < 10 && !winter() && S.villagers.length >= EX.autoPop && S.day - g.lastExp >= EX.autoEvery && SIM.foodDays() >= 3) {
      const c = S.villagers.filter(v => healthy(v) && !(window.TRB && TRB.isRole(v)) && !(v.partner && SIM.vById(v.partner) && SIM.vById(v.partner).pregnant > 0));
      if (c.length >= EX.min + 4) {
        const vs = c.sort(() => rand() - 0.5).slice(0, rand() < 0.5 ? 2 : 3);
        startExp(vs); SIM.log(`Làng cử ${names(vs)} đi thám hiểm vùng đất mới.`, 'ev');
      }
    }
  }

  // ---------------- GIAO VIỆC ----------------
  function assignMammoth(o, vs) {
    G().mhunt = { target: o.id, members: vs.map(v => v.id), phase: 'go', progress: 0 };
    for (const v of vs) setJob(v, { type: 'mammoth', target: o.id });
  }
  function startExp(vs) {
    const g = G();
    const t = (window.DEF && DEF.spawnTile()) || WORLD.nearestMain(0, 0);
    const e = { id: g.nextExp++, members: vs.map(v => v.id), phase: 'go', tile: t, back: 0, party: [] };
    g.exps.push(e); g.lastExp = S.day;
    for (const v of vs) setJob(v, { type: 'explore', exp: e.id });
    return e;
  }
  const HANDLED = ['stoke', 'kindle', 'askFire', 'paint', 'mammoth', 'explore', 'tame', 'nbTrade', 'nbGift', 'nbChase', 'research'];
  function handles(type) { return HANDLED.includes(type); }
  function check(spec, vs) {
    const g = G();
    const t = spec.type;
    if (t === 'askFire') {
      if (!g.out) return { ok: false, msg: 'Lửa vẫn đang cháy' };
      if (!g.nb.met) return { ok: false, msg: 'Chưa gặp bộ lạc lân cận nào' };
      if (g.nb.rel < 40) return { ok: false, msg: `${NB.name} chưa đủ thân thiện (cần quan hệ từ Bình thường trở lên)` };
      if (S.res.food < 10) return { ok: false, msg: 'Cần 10 thức ăn làm quà xin lửa' };
      return { ok: true };
    }
    if (t === 'nbTrade' || t === 'nbGift' || t === 'nbChase') {
      const o = WORLD.byId(spec.target);
      if (!o) return { ok: false, msg: 'Khách đã ra về' };
      if (o.dealt === 1 && t !== 'nbChase') return { ok: false, msg: 'Đã tiếp khách hôm nay rồi' };
      if (t === 'nbTrade' && !canPay(o.offer.give)) return { ok: false, msg: `Không đủ ${fmtDeal(o.offer.give)}` };
      if (t === 'nbGift' && S.res.food < NB.giftFood) return { ok: false, msg: `Cần ${NB.giftFood} thức ăn` };
      return { ok: true };
    }
    if (t === 'research') return { ok: true };
    if (!vs.length) return { ok: false, msg: 'Hãy chọn người' };
    if (vs.some(v => v.child)) return { ok: false, msg: 'Trẻ con chưa thể làm việc' };
    if (t === 'stoke') { if (g.out) return { ok: false, msg: 'Lửa đã tắt — cần nhóm lại lửa' }; if (S.res.wood < FI.stokeWood) return { ok: false, msg: `Cần ít nhất ${FI.stokeWood} gỗ` }; }
    if (t === 'kindle') { if (!g.out) return { ok: false, msg: 'Lửa vẫn đang cháy' }; if (S.res.wood < FI.kindleWood) return { ok: false, msg: `Cần ${FI.kindleWood} gỗ để nhóm lửa` }; }
    if (t === 'paint') { if (!objOf('paintwall')) return { ok: false, msg: 'Chưa có Vách đá vẽ tranh' }; if (!g.mem.some(m => !m.p)) return { ok: false, msg: 'Chưa có ký ức mới để vẽ' }; }
    if (t === 'mammoth') {
      if (!WORLD.byId(spec.target)) return { ok: false, msg: 'Đàn voi đã đi mất' };
      if (g.mhunt) return { ok: false, msg: 'Đang có một cuộc săn voi ma mút' };
      if (vs.some(v => v.health < 45 || v.pregnant > 0)) return { ok: false, msg: 'Người yếu hoặc đang mang thai không thể đi săn voi' };
      if (vs.length < needHunters()) return { ok: false, msg: `Cần ít nhất ${needHunters()} thợ săn (đã chọn ${vs.length})` };
      if (SIM.phase() !== 'day' || S.hour > 15) return { ok: false, msg: 'Đã quá muộn để săn voi — hãy đợi sáng mai' };
    }
    if (t === 'explore') {
      if (g.exps.length) return { ok: false, msg: 'Đang có một đoàn thám hiểm' };
      if (vs.length < EX.min || vs.length > EX.max) return { ok: false, msg: `Đoàn thám hiểm cần ${EX.min}–${EX.max} người` };
      if (vs.some(v => window.TRB && TRB.isRole(v))) return { ok: false, msg: 'Tù trưởng, tiên tri, vu sư phải ở lại làng' };
      if (vs.some(v => v.health < 50 || v.pregnant > 0)) return { ok: false, msg: 'Người yếu hoặc mang thai không nên đi xa' };
      if (SIM.phase() !== 'day' || S.hour > 14) return { ok: false, msg: 'Đã muộn — đoàn thám hiểm nên khởi hành buổi sáng' };
    }
    if (t === 'tame') {
      if (!WORLD.byId(spec.target)) return { ok: false, msg: 'Ngựa hoang đã bỏ đi' };
      if (vs.length > 2) return { ok: false, msg: 'Chỉ 1–2 người, đông quá ngựa sợ chạy mất' };
    }
    return { ok: true };
  }
  function assign(spec, vs) {
    const c = check(spec, vs); if (!c.ok) return c;
    const g = G(), t = spec.type;
    if (t === 'askFire') { S.res.food -= 10; setRel(2); relight(`Người của ${NB.name} mang bó đuốc sang trao lửa`); return { ok: true, msg: 'Đã xin được lửa!' }; }
    if (t === 'nbTrade') return doTrade(WORLD.byId(spec.target));
    if (t === 'nbGift') return doGift(WORLD.byId(spec.target));
    if (t === 'nbChase') { setRel(-15); visitorsLeave(WORLD.byId(spec.target), `Bộ lạc đuổi ${NB.name} đi. Họ bỏ về, mặt hằm hằm.`); return { ok: true, msg: `Đã đuổi ${NB.name} đi — quan hệ: ${relName(g.nb.rel)}` }; }
    if (t === 'research') { g.research = spec.id; return { ok: true, msg: `Đang nghiên cứu: ${invOf(spec.id).name}` }; }
    if (t === 'mammoth') { assignMammoth(WORLD.byId(spec.target), vs); vs.forEach(v => v.job.auto = false); return { ok: true }; }
    if (t === 'explore') { startExp(vs); vs.forEach(v => v.job.auto = false); return { ok: true, msg: `Đoàn thám hiểm (${names(vs)}) chuẩn bị lên đường` }; }
    for (const v of vs) { setJob(v, { type: t, target: spec.target }); v.job.auto = false; }
    return { ok: true };
  }

  // ---------------- KẾ HOẠCH & VIỆC ----------------
  function planJob(v, j) {
    const g = G();
    const f = WORLD.fire();
    if (j.type === 'stoke' || j.type === 'kindle') {
      if (j.type === 'stoke' && g.out) { j.type = 'kindle'; }
      if (j.type === 'kindle' && !g.out) { v.job = null; v.note = 'Lửa đã cháy lại'; return true; }
      if (j.type === 'stoke' && g.fuel >= 95) { v.job = null; v.note = 'Lửa đã đủ củi'; return true; }
      if (S.res.wood < (j.type === 'stoke' ? FI.stokeWood : FI.kindleWood)) { v.job = null; v.note = 'Hết củi — cần đốn thêm gỗ'; return true; }
      const next = j.type === 'stoke' ? { kind: 'stoke', time: 0.3 } : { kind: 'kindle', need: has('firedrill') ? 1 : FI.kindleHours, done: 0 };
      const r = ring(f);
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới bếp lửa'; }
      return true;
    }
    if (j.type === 'paint') {
      const w = objOf('paintwall');
      if (!w || !g.mem.some(m => !m.p)) { v.job = null; v.note = 'Đã vẽ xong mọi ký ức'; return true; }
      const next = { kind: 'paint', target: w.id, time: 1.1 }, r = ring(w);
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới vách đá'; }
      return true;
    }
    if (j.type === 'mammoth') {
      const h = g.mhunt, o = h && WORLD.byId(h.target);
      if (!h || !o || !h.members.includes(v.id)) { v.job = null; return true; }
      if (h.phase === 'fight') { v.task = { kind: 'mfight', target: o.id }; return true; }
      const r = ring(o), next = { kind: 'mwait', target: o.id };
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới đàn voi'; }
      return true;
    }
    if (j.type === 'explore') {
      const e = g.exps.find(x => x.id === j.exp);
      if (!e || e.phase !== 'go') { v.job = null; return true; }
      const goals = [e.tile, ...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [e.tile[0] + dx, e.tile[1] + dy]).filter(([x, y]) => WORLD.walkable(x, y) && WORLD.inMain(x, y))];
      const next = { kind: 'expwait' };
      if (SIM.isAt(v, goals)) { v.task = next; return true; }
      if (!SIM.goTo(v, goals, next)) { cancelExp(e, 'Không tìm được đường ra khỏi vùng đất — hủy thám hiểm.'); }
      return true;
    }
    if (j.type === 'tame') {
      const o = WORLD.byId(j.target);
      if (!o) { v.job = null; v.note = 'Ngựa hoang đã bỏ đi'; return true; }
      const r = ring(o), next = { kind: 'tame', target: o.id };
      if (SIM.isAt(v, r)) { v.task = next; return true; }
      if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới chỗ ngựa'; }
      return true;
    }
    return false;
  }
  function face(v, o) { const cx = (o.x + o.w / 2) * T; if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1; }
  function task(v, t, dt) {
    const E = CFG.ENERGY, g = G();
    switch (t.kind) {
      case 'stoke': {
        face(v, WORLD.fire());
        t.time -= dt;
        if (t.time <= 0) {
          v.task = null;
          if (g.out || S.res.wood < FI.stokeWood) return true;
          S.res.wood -= FI.stokeWood; stoke(FI.stokeFuel);
          const f = WORLD.fire();
          EV.emit('float', { x: (f.x + 0.5) * T, y: f.y * T - 4, text: `−${FI.stokeWood}`, icon: 'wood' });
          if (g.fuel >= 90 || S.res.wood < FI.stokeWood) { v.job = null; v.note = 'Đã thêm củi cho lửa'; }
        }
        return true;
      }
      case 'kindle': {
        face(v, WORLD.fire());
        v.energy = clamp(v.energy - E.workDrain * 0.6 * dt, 0, 100);
        if (!g.out) { v.task = null; v.job = null; return true; }
        t.done += SIM.workSpeed(v, 'gather') * dt;
        if (t.done >= t.need) {
          v.task = null;
          if (S.res.wood < FI.kindleWood) { v.job = null; v.note = 'Thiếu củi để nhóm lửa'; return true; }
          S.res.wood -= FI.kindleWood;
          if (has('firedrill') || rand() < FI.kindleChance + 0.06 * (v.skills.gather || 1)) { relight(`${v.name} cọ xát que gỗ, thổi bùng tia lửa`); v.job = null; }
          else SIM.log(`${v.name} cọ que đá lửa mãi chưa bén, thử lại...`);
        }
        return true;
      }
      case 'paint': {
        const w = WORLD.byId(t.target); if (!w) { v.task = null; return true; }
        face(v, w); t.time -= dt;
        if (t.time <= 0) {
          v.task = null; v.job = null;
          const m = g.mem.find(x => !x.p);
          if (m) {
            m.p = S.day; g.paintToday = (g.paintToday || 0) + 1;
            addIdeas(1);
            S.villagers.forEach(o => o.morale = clamp(o.morale + 1, 0, 100));
            SIM.event(`${v.name} vẽ lên vách đá: "${m.t}" (ngày ${m.d}).`);
          }
        }
        return true;
      }
      case 'mwait': case 'expwait': {
        v.energy = clamp(v.energy + E.idleRegen * 0.5 * dt, 0, 100);
        if (t.kind === 'mwait') { const o = WORLD.byId(t.target); if (o) face(v, o); }
        return true;
      }
      case 'mfight': {
        const o = WORLD.byId(t.target); if (!o) { v.task = null; return true; }
        face(v, o); v.energy = clamp(v.energy - E.workDrain * 1.1 * dt, 0, 100);
        return true;
      }
      case 'tame': {
        const o = WORLD.byId(t.target); if (!o) { v.task = null; return true; }
        face(v, o); v.energy = clamp(v.energy - E.workDrain * 0.7 * dt, 0, 100);
        o.tame = (o.tame || 0) + SIM.workSpeed(v, 'hunt') * dt;
        if (o.tame >= PE.tameHours) resolveTame(o);
        return true;
      }
    }
    return false;
  }
  function jobText(v) {
    const t = v.task, k = t && t.kind;
    if (isJob(v, 'stoke')) return k === 'stoke' ? 'Thêm củi giữ lửa' : 'Mang củi tới bếp lửa';
    if (isJob(v, 'kindle')) return k === 'kindle' ? `Cọ que nhóm lại lửa ${Math.round(t.done / t.need * 100)}%` : 'Đi nhóm lại lửa';
    if (isJob(v, 'paint')) return k === 'paint' ? 'Vẽ tranh lên vách đá' : 'Đi tới vách đá vẽ tranh';
    if (isJob(v, 'mammoth')) return k === 'mfight' ? 'Vây săn voi ma mút!' : k === 'mwait' ? 'Chờ đồng đội vây voi ma mút' : 'Đi săn voi ma mút';
    if (isJob(v, 'explore')) return k === 'expwait' ? 'Chờ cả đoàn ở bìa rừng' : 'Lên đường thám hiểm';
    if (isJob(v, 'tame')) return k === 'tame' ? 'Thuần phục ngựa hoang' : 'Đi tới chỗ ngựa hoang';
    return null;
  }
  const WORK_POSE = ['stoke', 'kindle', 'paint', 'mfight', 'tame'];

  // ---------------- GIAO DIỆN: HÀNH ĐỘNG ----------------
  function fuelText() { const g = G(); return g.out ? '<b class="warn">Lửa đã tắt!</b>' : `củi ${Math.round(g.fuel)}%`; }
  function fireActions(out, n) {
    const g = G();
    out.desc += ` · Lửa: ${fuelText()} (cháy ${(FI.burn * burnMult()).toFixed(1)}%/giờ${winter() ? ', mùa đông ngốn củi' : ''}${S.weather === 'rain' ? ', mưa' : ''})`;
    if (g.out) {
      out.actions.unshift({ spec: { type: 'kindle' }, label: 'Nhóm lại lửa', detail: `Cọ que gỗ / đập đá lửa ${has('firedrill') ? '1 giờ, chắc chắn bén' : `${FI.kindleHours} giờ, có thể phải thử nhiều lần`} · tốn ${FI.kindleWood} gỗ mỗi lần` });
      if (g.nb.met) out.actions.unshift({ spec: { type: 'askFire' }, label: `Xin lửa ${NB.name}`, detail: `Tặng 10 thức ăn, họ mang đuốc sang ngay · cần quan hệ từ Bình thường (hiện ${relName(g.nb.rel)})`, btn: 'Xin lửa' });
    } else out.actions.push({ spec: { type: 'stoke' }, label: 'Thêm củi', detail: `Mỗi lần ${FI.stokeWood} gỗ → +${FI.stokeFuel}% củi · làng tự cử người khi lửa yếu và trước khi trời tối` });
    out.actions.push({ spec: { type: 'explore' }, label: 'Thám hiểm vùng đất mới', detail: `Chọn ${EX.min}–${EX.max} người khỏe · đi ${Math.max(1, EX.days - (horses() ? 1 : 0))} ngày · có thể mang về đá quý, hạt giống lạ, người mới, sói con, gặp bộ lạc khác… nhưng có rủi ro bị thương` });
  }
  function objActions(o) {
    const g = G();
    if (o.type === 'mammoth') {
      const h = g.mhunt;
      return { title: 'Đàn voi ma mút', desc: `Con mồi khổng lồ: ${MM.meat} thịt + ${MM.furs} áo lông nếu hạ được. Rất nguy hiểm — cần ít nhất ${needHunters()} thợ săn${allyHelp() ? ` (đồng minh ${NB.name} góp 2 người)` : ''}, nên mang giáo (có ${S.res.spears || 0}). Đàn voi rời đi sau ngày ${o.leave}.${h ? ` <b>Đang săn: ${h.phase === 'fight' ? `vây đánh ${Math.round(h.progress / MM.hours * 100)}%` : 'đang tập hợp'}</b>` : ''}`,
        actions: h ? [] : [{ spec: { type: 'mammoth', target: o.id }, label: 'Săn voi ma mút', detail: `Cần ${needHunters()}–8 người khỏe · vây săn ${MM.hours} giờ · thịt chia nhau mang về`, est: (vs) => { if (!vs.length) return `<div class="est">Chọn ít nhất ${needHunters()} người để xem tỷ lệ.</div>`; const e = mEst(vs); return `<div class="est">Với ${vs.length} người: thành công ~<b>${Math.round(e.chance * 100)}%</b> · mỗi người có <b>${Math.round(e.injury * 100)}%</b> nguy cơ bị thương${S.weather === 'rain' ? ' (mưa làm khó hơn)' : ''}</div>`; } }] };
    }
    if (o.type === 'wildhorse') return { title: 'Ngựa hoang', desc: `Thuần phục cần ${PE.tameHours} giờ công kiên nhẫn (đang ${Math.round((o.tame || 0) / PE.tameHours * 100)}%). Ngựa giúp đi săn tốt hơn, đoàn thám hiểm về sớm hơn. Bộ lạc có ${g.horses}/${PE.maxHorses} ngựa.`, actions: [{ spec: { type: 'tame', target: o.id }, label: 'Thuần ngựa', detail: '1–2 người, giỏi Săn bắt thì dễ thành công hơn' }] };
    if (o.type === 'visitors') {
      const of = o.offer, nb = g.nb;
      return { title: `${NB.name} — khách tới thăm`, desc: `Quan hệ: <b>${relName(nb.rel)}</b> (${Math.round(nb.rel)}/100) · đã trao đổi ${nb.trades} lần. ${nb.ally ? 'Đang là đồng minh.' : `Đạt ${NB.allyAt} thì kết minh; dưới ${NB.raidBelow} họ có thể kéo tới cướp.`}`,
        actions: [
          { spec: { type: 'nbTrade', target: o.id }, label: `Đổi ${fmtDeal(of.give)} lấy ${fmtDeal(of.get)}`, detail: `Có ${fmtDeal(Object.fromEntries(Object.keys(of.give).map(k => [k, amountOf(k)])))} · quan hệ +${NB.tradeRel}`, btn: 'Đổi' },
          { spec: { type: 'nbGift', target: o.id }, label: `Tặng ${NB.giftFood} thức ăn`, detail: `Quan hệ +${NB.giftRel}`, btn: 'Tặng' },
          { spec: { type: 'nbChase', target: o.id }, label: 'Đuổi đi', detail: 'Quan hệ −15 · dễ bị đột kích về sau', btn: 'Đuổi' },
        ] };
    }
    if (o.type === 'paintwall') {
      const ps = g.mem.filter(m => m.p).length;
      return { title: `Vách đá vẽ tranh — ${ps}/${g.mem.length} ký ức đã vẽ`, desc: `${DESC.paintwall}<div class="mem-list">${memHTML(12)}</div>`, actions: [{ spec: { type: 'paint' }, label: 'Vẽ tranh', detail: 'Vẽ ký ức chưa được vẽ lên vách (≈1 giờ mỗi bức) · +1 ý tưởng, cả làng vui hơn' }] };
    }
    return null;
  }
  const DESC = { paintwall: 'Ghi lại những sự kiện lớn của bộ lạc bằng tranh vẽ đất son. Mỗi bức vẽ thêm 1 ý tưởng phát minh, cả làng thêm tinh thần; có vách đá thì mỗi đêm thêm 1 ý tưởng.' };

  // ---------------- GIAO DIỆN: THANH TRÊN & BẢNG ----------------
  function topHTML() { return `<span class="saga-chip" id="t-season" title="Mùa (mỗi mùa ${SE.len} ngày)"><img class="ico" alt=""><b><span class="sn"></span> <span class="sd"></span></b></span>`; }
  function resHTML() {
    return `<span class="res" id="r-fire" title="Lửa trại — lượng củi đang cháy">${ART.icon('flame')}<b>0</b></span>
      <span class="res" id="r-fur" title="Áo lông thú — mỗi người cần một chiếc khi mùa đông">${ART.icon('fur')}<b>0</b></span>`;
  }
  function updateTop() {
    if (!S.saga) return;
    const g = G();
    const el = document.getElementById('t-season');
    if (el) { const s = season(), t = `${SE.names[s]} ${dayInSeason()}/${SE.len}`; if (el._t !== t) { el._t = t; el.querySelector('img').src = ART.ICONS[SEASON_ICON[s]]; el.querySelector('.sn').textContent = SE.names[s]; el.querySelector('.sd').textContent = `${dayInSeason()}/${SE.len}`; el.title = `${SE.names[s]} — ngày ${dayInSeason()}/${SE.len} của mùa`; el.classList.toggle('winter', s === 3); } }
    const rf = document.getElementById('r-fire');
    if (rf) { const t = g.out ? 'Tắt!' : `${Math.round(g.fuel)}%`; if (rf._t !== t) { rf._t = t; rf.querySelector('b').textContent = t; } rf.classList.toggle('alarm', g.out); rf.classList.toggle('low', !g.out && g.fuel < 30); }
    const fu = document.getElementById('r-fur');
    if (fu) { const t = `${g.furs}`; if (fu._t !== t) { fu._t = t; fu.querySelector('b').textContent = t; } fu.classList.toggle('low', season() >= 2 && g.furs < S.villagers.length); }
  }
  function memHTML(limit) {
    const g = G();
    const ms = g.mem.slice(-(limit || 99)).reverse();
    if (!ms.length) return '<div class="muted">Chưa có ký ức nào — những sự kiện lớn sẽ được ghi lại ở đây.</div>';
    return ms.map(m => `<div class="mem ${m.p ? '' : 'raw'}"><img src="${PIC_URL[m.k] || PIC_URL.people}" alt=""><span><b>Ngày ${m.d}</b> ${m.t}${m.p ? '' : ' <small>(chưa vẽ)</small>'}</span></div>`).join('');
  }
  function panelHTML() {
    return `<div class="jsec"><h4>Lửa, mùa & sinh tồn</h4><div id="saga-surv" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Phát minh & thời đại</h4><div id="saga-inv" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Bộ lạc lân cận</h4><div id="saga-nb" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Tranh hang — ký ức bộ lạc</h4><div id="saga-mem" class="sheet-sub"></div></div>`;
  }
  function setHTML(p, id, html) { const el = p.querySelector('#' + id); if (el && el._last !== html) { el.innerHTML = html; el._last = html; } }
  function updatePanel(p) {
    if (!S.saga) return;
    const g = G(), row = (ok, t) => `<div class="${ok ? '' : 'warn'}">${ok ? '✓' : '○'} ${t}</div>`;
    const s = season(), next = 4 - ((S.day - 1) % (SE.len * 4)) / SE.len;
    const toWinter = s === 3 ? 0 : (3 - s) * SE.len - (dayInSeason() - 1);
    const e = g.exps[0];
    setHTML(p, 'saga-surv', `${row(!g.out, `Lửa trại: ${g.out ? 'ĐÃ TẮT — cần nhóm lại hoặc xin lửa' : `${Math.round(g.fuel)}% củi`} · đã tắt ${g.outs} lần`)}
      ${row(true, `Mùa: <b>${SE.names[s]}</b> (ngày ${dayInSeason()}/${SE.len})${s === 3 ? ' — giá rét!' : ` · còn ${toWinter} ngày tới mùa đông`}`)}
      ${row(g.furs >= S.villagers.length || s < 2, `Áo lông thú: ${g.furs}/${S.villagers.length} người (săn thú, voi ma mút để có da)`)}
      ${row(true, `Voi ma mút: đã hạ ${g.mammoths} con${mammoth() ? ' · <b>đàn voi đang ở đồng cỏ!</b>' : ''}${g.mhunt ? ' · đang săn' : ''}`)}
      ${row(true, `Chó săn: ${g.dogs.map(d => d.name).join(', ') || 'chưa có'}${g.pups.length ? ` · sói con: ${g.pups.map(d => `${d.name} (lớn sau ${Math.max(0, PE.growDays - (S.day - d.born))} ngày)`).join(', ')}` : ''} · Ngựa: ${g.horses}/${PE.maxHorses}${lvl() < PE.horseLevel ? ` (mở ở bộ lạc cấp ${PE.horseLevel})` : ''}${wildHorse() ? ' · <b>có ngựa hoang ở đồng cỏ</b>' : ''}`)}
      ${row(true, `Thám hiểm: ${e ? (e.phase === 'away' ? `đoàn ${e.party.map(x => x.name).join(', ')} đang đi, về vào ngày ${e.back}` : 'đang tập hợp') : `đã đi ${g.expCount} chuyến${S.auto ? ` · làng tự cử đoàn mỗi ${EX.autoEvery} ngày khi đủ ${EX.autoPop} người` : ''}`}`)}`);
    const ideaRow = `Ý tưởng mỗi đêm: <b>${ideasPerNight()}</b> (dân số, xưởng, tiên tri, vách tranh) · Thời đại: <b>${ERA_NAME[era()]}</b>${era() < 3 ? ` — lên ${ERA_NAME[era() + 1]} khi có ${ERA_NEED[era() + 1].prev} phát minh ${ERA_NAME[era()].replace('Thời ', '')} và bộ lạc cấp ${ERA_NEED[era() + 1].level}` : ''}`;
    const invRows = [1, 2, 3].map(er => `<div class="inv-era ${er > era() ? 'locked' : ''}"><b>${ERA_NAME[er]}</b>${INV.filter(i => i.era === er).map(i => {
      const done = has(i.id), cur = g.research === i.id, pr = g.prog[i.id] || 0;
      const st = done ? '<span class="inv-done">✓ đã có</span>' : er > era() ? '<span class="muted">khóa</span>' : cur ? `<span class="inv-cur">đang nghiên cứu ${pr}/${i.cost}</span>` : `<button class="btn sm" data-saga="inv:${i.id}">Nghiên cứu ${pr}/${i.cost}</button>`;
      return `<div class="inv"><div><b>${i.name}</b><small>${i.desc}</small></div>${st}</div>`;
    }).join('')}</div>`).join('');
    setHTML(p, 'saga-inv', `<div>${ideaRow}</div>${invRows}`);
    const nb = g.nb;
    setHTML(p, 'saga-nb', nb.met ? `${row(nb.rel >= NB.raidBelow, `${NB.name}: <b>${relName(nb.rel)}</b> (${Math.round(nb.rel)}/100)${nb.ally ? ' — đồng minh: giúp săn voi, cho lửa, gửi quà' : ''}`)}
      <div>Đã trao đổi ${nb.trades} lần · tặng quà ${nb.gifts} lần · bị đột kích ${nb.raids} lần (đánh lui ${nb.repelled} kẻ).${visitors() ? ' <b>Khách đang ở làng — chạm vào họ để trao đổi.</b>' : ''}${S.auto ? ' Khi bật Tự động, làng tự trao đổi hoặc tặng quà nếu dư dả.' : ''}</div>` : `<div class="muted">Chưa gặp bộ lạc nào khác. Có thể họ sẽ tới thăm từ ngày ${NB.meetDay}, hoặc đoàn thám hiểm sẽ tìm thấy họ.</div>`);
    setHTML(p, 'saga-mem', `${cnt('paintwall') ? '' : `<div class="muted">Xây <b>Vách đá vẽ tranh</b> (dân số ${CFG.BUILDINGS.paintwall.unlock}) để vẽ ký ức lên đá.</div>`}<div class="mem-list">${memHTML(15)}</div>`);
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-saga]');
    if (!b || !window.S || !S.saga) return;
    ev.stopPropagation(); ev.preventDefault();
    const [k, id] = b.dataset.saga.split(':');
    if (k === 'inv' && invOf(id) && canResearch(invOf(id))) { G().research = id; UI.toast(`Đang nghiên cứu: ${invOf(id).name}`, 'ok'); const el = document.getElementById('saga-inv'); if (el) el._last = ''; if (window.GAME) GAME.save(); }
  }, true);

  // ---------------- HÌNH VẼ ----------------
  const SPR = {}, PIC = {}, PIC_URL = {};
  const PICS = {
    fire: ['.....X.....', '....XX.....', '...XXX.X...', '...XXXXX...', '..XXXXXXX..', '..XXX.XXX..', '...X...X...', '.XXXXXXXXX.', 'X.X.X.X.X.X'],
    mammoth: ['...XXXXX...', '..XXXXXXXX.', '.XXXXXXXXXX', 'XXXXXXXXX.X', 'XXXXXXXXX.X', '.XXXXXXXX.X', '.X.X..X.XX.', '.X.X..X.X..', '...........'],
    baby: ['...XXX.....', '...XXX.....', '....X...XX.', '..XXXXXXXX.', '....X...X..', '....X..X.X.', '...X.X.....', '..X...X....', '...........'],
    people: ['.XX..XX..XX', '.XX..XX..XX', '..X...X...X', 'XXXXXXXXXXX', '..X...X...X', '..X...X...X', '.X.X.X.X.X.', 'X..XX..XX..', '...........'],
    dog: ['.........X.', '........XX.', 'X......XXXX', '.XXXXXXXX..', '.XXXXXXX...', '.X.X..X.X..', '.X.X..X.X..', '...........', '...........'],
    horse: ['.........XX', '........XXX', '.......XX..', 'XXXXXXXXX..', '.XXXXXXXX..', '.XXXXXXXX..', '.X.X...X.X.', '.X.X...X.X.', '...........'],
    era: ['X....X....X', '.X...X...X.', '...XXXXX...', '..XXXXXXX..', 'XXXXXXXXXXX', '..XXXXXXX..', '...XXXXX...', '.X...X...X.', 'X....X....X'],
    snow: ['.....X.....', '..X..X..X..', '...X.X.X...', '....XXX....', 'XXXXXXXXXXX', '....XXX....', '...X.X.X...', '..X..X..X..', '.....X.....'],
    spear: ['.........XX', '........XXX', '.......XX..', '......X....', '.....X.....', '....X......', '...X.......', '..X........', '.X.........'],
    hand: ['..X.X.X....', '..X.X.X.X..', '..X.X.X.X..', 'X.XXXXXXX..', '.XXXXXXXX..', '..XXXXXXX..', '..XXXXXX...', '...XXXX....', '...XXXX....'],
    feet: ['.XX........', 'XXXX.......', 'XXXX...XX..', '.XX...XXXX.', '......XXXX.', '.XX....XX..', 'XXXX.......', 'XXXX.......', '.XX........'],
    invent: ['...XXX.....', '..XXXXX....', '.XXXXXX....', '..XXXXXX...', '.....XX....', '......X....', '.......X...', '........X..', '.........X.'],
    temple: ['.....X.....', '....XXX....', '...XXXXX...', '..XXXXXXX..', '.XXXXXXXXX.', '..X.X.X.X..', '..X.X.X.X..', '..X.X.X.X..', 'XXXXXXXXXXX'],
  };
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  function flip(c) { const [d, x] = ART.mk(c.width, c.height); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return d; }
  try {
    const { mk, rect, px, ell } = ART;
    for (const [k, rows] of Object.entries(PICS)) {
      const [c, x] = mk(11, 9);
      rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') px(x, i, j, '#b5482a'); }));
      PIC[k] = c;
      const [c2, x2] = mk(26, 22); rect(x2, 0, 0, 26, 22, '#8a8378'); rect(x2, 0, 0, 26, 1, '#a8a196'); rect(x2, 0, 21, 26, 1, '#6d665c');
      x2.imageSmoothingEnabled = false; x2.drawImage(c, 2, 2, 22, 18);
      PIC_URL[k] = c2.toDataURL();
    }
    { // biểu tượng: áo lông, mùa
      const [c, x] = mk(10, 10);
      rect(x, 2, 2, 6, 7, '#a0703a'); rect(x, 1, 3, 1, 4, '#a0703a'); rect(x, 8, 3, 1, 4, '#a0703a'); rect(x, 3, 1, 4, 1, '#e8dcc0');
      for (let i = 2; i < 8; i += 2) px(x, i, 8, '#e8dcc0'); px(x, 4, 4, '#6b4424'); px(x, 6, 6, '#6b4424'); px(x, 3, 6, '#6b4424');
      ART.ICONS.fur = c.toDataURL();
    }
    {
      const [c, x] = mk(10, 10);
      for (const [a, b] of [[5, 0], [5, 9], [0, 5], [9, 5]]) { for (let k = 0; k < 10; k++) { if (a === 5) px(x, 4 + (k % 2 ? 0 : 0), k, '#dff0ff'); else px(x, k, 4, '#dff0ff'); } }
      for (let k = 1; k < 9; k++) { px(x, k, k, '#bfe0ff'); px(x, 8 - k + 1, k, '#bfe0ff'); }
      ART.ICONS.snow = c.toDataURL();
    }
    {
      const [c, x] = mk(10, 10);
      rect(x, 4, 5, 1, 4, '#5a8a2a'); ell(x, 3, 4, 2, 1, '#7ac040'); ell(x, 6, 3, 2, 1, '#8ad050'); px(x, 2, 6, '#5a8a2a'); px(x, 3, 9, '#6b4224'); rect(x, 2, 9, 5, 1, '#6b4224');
      ART.ICONS.spring = c.toDataURL();
    }
    {
      const [c, x] = mk(10, 10);
      for (let k = 0; k < 8; k++) { const w = k < 4 ? k + 1 : 8 - k; rect(x, 5 - w, k + 1, w * 2, 1, k % 3 ? '#e08a2a' : '#c8602a'); }
      for (let k = 2; k < 9; k++) px(x, 5 - Math.round((k - 2) * 0.3), k, '#8a4a1a');
      ART.ICONS.leaf = c.toDataURL();
    }
    if (!ART.ICONS.sun) { const [c, x] = mk(10, 10); ell(x, 5, 5, 3, 3, '#f2c94c'); ART.ICONS.sun = c.toDataURL(); }
    // voi ma mút 56×42, 2 khung, 2 hướng
    SPR.mammoth = [0, 1].map(f => {
      const [c, x] = mk(56, 42);
      const B = '#6b4a2e', D = '#4e3420', L = '#8a6440';
      const legs = f ? [11, 19, 31, 39] : [12, 18, 32, 38];
      legs.forEach((lx, i) => { const h = (i + f) % 2 ? 11 : 12; rect(x, lx, 28, 6, h, D); rect(x, lx, 27 + h, 6, 1, '#3a2614'); });
      ell(x, 27, 22, 19, 12, B); ell(x, 21, 13, 12, 9, B); ell(x, 21, 11, 9, 5, L);
      for (let i = 9; i < 45; i += 2) rect(x, i, 30 + ((i * 7) % 3), 1, 4, D);
      ell(x, 43, 17, 9, 10, '#5e4028'); ell(x, 39, 16, 4, 6, D);
      rect(x, 48, 20, 5, 10, '#5e4028'); rect(x, 49, 30, 4, 5, '#5e4028'); rect(x, 50, 35, 4, 2, '#5e4028'); px(x, 53, 34, '#5e4028');
      for (const [a, b] of [[46, 25], [46, 26], [45, 27], [45, 28], [45, 29], [46, 30], [47, 31], [48, 31], [49, 30], [50, 29]]) { px(x, a, b, '#eee6d0'); px(x, a, b + 1, '#d8ccb0'); }
      px(x, 46, 14, '#1a1008'); px(x, 7, 18, D); rect(x, 6, 19, 2, 6, D);
      return [flip(c), c];
    });
    // sói con, chó 14×10
    SPR.dog = [0, 1].map(f => {
      const [c, x] = mk(14, 10);
      const B = '#b07c46', D = '#7a5230', L = '#e0c49a';
      const legs = f ? [3, 5, 9, 11] : [2, 6, 8, 12];
      legs.forEach((lx, i) => rect(x, lx, 6, 1, (i + f) % 2 ? 3 : 4, D));
      rect(x, 2, 3, 9, 4, B); rect(x, 3, 6, 7, 1, L); rect(x, 0, 1, 2, 1, B); rect(x, 1, 2, 2, 1, B);
      rect(x, 10, 1, 4, 4, B); px(x, 13, 3, '#1a1a1a'); px(x, 10, 0, D); px(x, 12, 0, D); px(x, 11, 2, '#2a1a10'); rect(x, 10, 5, 2, 1, '#c8303a');
      return [flip(c), c];
    });
    SPR.pup = [0, 1].map(f => {
      const [c, x] = mk(9, 7);
      const B = '#8a8e96', D = '#62666e';
      [1, 3, 5, 6].forEach((lx, i) => rect(x, lx, 4, 1, (i + f) % 2 ? 2 : 3, D));
      rect(x, 1, 2, 5, 3, B); rect(x, 5, 0, 3, 3, B); px(x, 8, 2, '#1a1a1a'); px(x, 5, 0, D); px(x, 7, 0, D); px(x, 0, 2, D);
      return [flip(c), c];
    });
    // ngựa 22×17 (thuần: nâu có tấm da; hoang: vàng sẫm)
    const horse = (B, D, M, blanket) => [0, 1].map(f => {
      const [c, x] = mk(22, 17);
      const legs = f ? [4, 7, 14, 17] : [3, 8, 13, 18];
      legs.forEach((lx, i) => { const h = (i + f) % 2 ? 6 : 7; rect(x, lx, 10, 2, h, D); rect(x, lx, 9 + h, 2, 1, '#2a1a10'); });
      rect(x, 3, 5, 16, 6, B); rect(x, 4, 10, 14, 1, D); rect(x, 1, 5, 2, 6, M); px(x, 0, 9, M);
      rect(x, 16, 1, 3, 6, B); rect(x, 17, 0, 5, 4, B); rect(x, 20, 2, 2, 2, '#e8d8b8'); px(x, 19, 1, '#1a1008'); rect(x, 15, 0, 2, 6, M); px(x, 17, 0, D);
      if (blanket) { rect(x, 7, 4, 7, 4, '#c8303a'); rect(x, 7, 7, 7, 1, '#f2c94c'); }
      return [flip(c), c];
    });
    SPR.horse = horse('#7a4a2a', '#5a3218', '#2a1810', true);
    SPR.wildhorse = horse('#c8a060', '#8a6a3a', '#4a3420', false);
    // người bộ lạc lân cận (vẽ bằng hình dân làng với áo đỏ, sơn mặt)
    const nbFolk = [
      { skin: '#c88b5c', tunic: '#8a2a1a', hair: '#1b1b1b', band: '#e8dcc0' },
      { skin: '#b97d50', tunic: '#7a3a1a', hair: '#2a1810', band: '#e05a3a' },
      { skin: '#d09060', tunic: '#9a3a22', hair: '#1b1b1b', band: '#f2c94c' },
    ];
    SPR.folk = nbFolk;
    SPR.raider = [0, 1].map(f => {
      const [c, x] = mk(20, 30);
      ART.drawVillager(x, 9, 28, nbFolk[1], f ? 0.125 : 0.375, 'walk', 1);
      rect(x, 7, 6, 4, 1, '#c8303a'); rect(x, 7, 8, 4, 1, '#c8303a');
      rect(x, 14, 8, 2, 12, '#6b4224'); rect(x, 13, 5, 4, 4, '#5a3a1c'); px(x, 13, 5, '#8d9198');
      return [flip(c), c];
    });
    if (window.DEF) DEF.SPR.raider = SPR.raider;
    { // vách đá vẽ tranh 72×54
      const [c, x] = mk(72, 54);
      ell(x, 36, 30, 35, 24, '#7a7368'); rect(x, 2, 30, 68, 24, '#7a7368');
      ell(x, 36, 28, 32, 20, '#8a8378'); rect(x, 4, 12, 64, 38, '#8a8378');
      rect(x, 4, 12, 64, 1, '#a8a196'); for (const [a, b, l] of [[10, 14, 8], [30, 20, 6], [55, 16, 9], [64, 30, 7], [6, 38, 6]]) for (let k = 0; k < l; k++) px(x, a + (k % 2), b + k, '#6d665c');
      rect(x, 0, 48, 72, 6, '#6d665c'); rect(x, 0, 48, 72, 1, '#8d8478');
      for (const [a, b] of [[8, 50], [24, 51], [46, 50], [62, 51]]) { ell(x, a, b, 3, 2, '#5a8a3a'); }
      rect(x, 60, 40, 3, 8, '#5a3a1c'); ell(x, 61, 39, 3, 2, '#b5482a'); // bát đất son
      SPR.paintwall = c;
    }
  } catch (e) { console.error(e); }

  function drawObj(o, X, Y, lx, time) {
    if (o.type === 'paintwall') return () => {
      const s = SPR.paintwall, ox = X + Math.round((o.w * T - s.width) / 2), oy = Y + o.h * T - s.height + 2;
      lx.drawImage(s, ox, oy);
      const ps = (S.saga ? S.saga.mem : []).filter(m => m.p).slice(-15);
      ps.forEach((m, i) => { const p = PIC[m.k] || PIC.people; lx.drawImage(p, ox + 7 + (i % 5) * 12, oy + 15 + Math.floor(i / 5) * 10); });
    };
    if (o.type === 'mammoth' || o.type === 'wildhorse' || o.type === 'visitors') return () => { };
    return null;
  }

  // vị trí chó (chỉ để hiển thị, không lưu)
  const DOGPOS = {};
  let lastT = 0;
  function pushDraw(list, lx, L, Tp, time, shadow) {
    if (!S.saga) return;
    const g = G(), dtr = Math.min(0.1, Math.max(0, time - lastT)); lastT = time;
    const f = WORLD.fire(), fx = (f.x + 0.5) * T, fy = (f.y + 0.8) * T;
    // voi ma mút
    const mo = mammoth();
    if (mo) {
      const fighting = g.mhunt && g.mhunt.phase === 'fight';
      const sway = Math.sin(time * (fighting ? 6 : 1.2)) * (fighting ? 2 : 1);
      const cx = (mo.x + mo.w / 2) * T + sway, foot = (mo.y + mo.h) * T - 2;
      const fr = Math.floor(time * (fighting ? 6 : 1.5)) % 2, dir = Math.sin(time * 0.15 + mo.id) > 0 ? 1 : 0;
      if (mo.calf) list.push([foot - 6, () => { const s = SPR.mammoth[fr][dir]; shadow(lx, L(cx + (dir ? -26 : 26)), Tp(foot - 6), 10, 2); lx.drawImage(s, L(cx + (dir ? -26 : 26)) - 16, Tp(foot - 6) - 24, 32, 24); }]);
      list.push([foot, () => { const s = SPR.mammoth[fr][dir]; shadow(lx, L(cx), Tp(foot), 20, 4); lx.drawImage(s, L(cx) - 28, Tp(foot) - 41); }]);
    }
    // ngựa hoang
    const wh = wildHorse();
    if (wh) {
      const taming = S.villagers.some(v => v.task && v.task.kind === 'tame');
      const cx = (wh.x + 1) * T + (taming ? Math.sin(time * 7) * 3 : 0), foot = (wh.y + 1) * T - 2;
      const fr = taming ? Math.floor(time * 6) % 2 : 0, dir = Math.sin(time * 0.2 + wh.id) > 0 ? 1 : 0;
      list.push([foot, () => { shadow(lx, L(cx), Tp(foot), 9, 2); lx.drawImage(SPR.wildhorse[fr][dir], L(cx) - 11, Tp(foot) - 16 - (taming && fr ? 2 : 0)); }]);
    }
    // ngựa đã thuần: trong chuồng thú hoặc buộc cạnh bếp lửa
    if (g.horses) {
      const pen = objOf('pen');
      for (let i = 0; i < g.horses; i++) {
        const ax = pen ? (pen.x + 0.9) * T + i * 22 : fx - 3 * T - i * 22, ay = pen ? (pen.y + pen.h - 0.3) * T : fy + 2 * T;
        const dir = (i + (pen ? 1 : 0)) % 2, bob = Math.floor(time * 0.7 + i * 1.3) % 3 === 0 ? 1 : 0;
        list.push([ay, () => { shadow(lx, L(ax), Tp(ay), 9, 2); lx.drawImage(SPR.horse[0][dir], L(ax) - 11, Tp(ay) - 16 + bob); }]);
        if (!pen) list.push([ay - 1, () => { R(lx, L(ax) + (dir ? -14 : 12), Tp(ay) - 14, 2, 14, '#6b4224'); }]);
      }
    }
    // khách bộ lạc lân cận
    const vo = visitors();
    if (vo) {
      const k = clamp((S.hour - vo.t0) / 1.2, 0, 1);
      const tx = (vo.x + 1) * T, ty = (vo.y + 0.8) * T, sx = vo.from[0] * T + T / 2, sy = vo.from[1] * T + T * 0.75;
      const px = sx + (tx - sx) * k, py = sy + (ty - sy) * k, walking = k < 1;
      SPR.folk.forEach((fv, i) => {
        const X = px + (i - 1) * 9, Y = py + (i === 1 ? 3 : 0);
        list.push([Y, () => {
          shadow(lx, L(X), Tp(Y), 5, 2);
          ART.drawVillager(lx, L(X), Tp(Y), fv, time + i * 0.3, walking ? 'walk' : 'stand', walking ? (tx > sx ? 1 : -1) : (fx > X ? 1 : -1));
          R(lx, L(X) - 2, Tp(Y) - 15, 4, 1, '#c8303a');
          if (i === 0 && !walking) { R(lx, L(X) + 5, Tp(Y) - 9, 6, 5, '#a0703a'); R(lx, L(X) + 5, Tp(Y) - 9, 6, 1, '#e8dcc0'); }
        }]);
      });
    }
    // chó & sói con
    const guards = S.villagers.filter(v => v.job && v.job.type === 'guard' && !v.inside);
    const beasts = (S.beasts || []).filter(b => b.state !== 'flee');
    const hunters = S.villagers.filter(v => v.task && (v.task.kind === 'mfight' || v.task.kind === 'hunting' || v.task.kind === 'huntwait'));
    const night = SIM.phase() !== 'day';
    const pets = [...g.dogs.map(d => [d, false]), ...g.pups.map(d => [d, true])];
    pets.forEach(([d, pup], i) => {
      let p = DOGPOS[d.id];
      if (!p) p = DOGPOS[d.id] = { x: fx + (i - 1) * 14, y: fy + 18, tx: fx, ty: fy + 18, wait: 0, face: 1, mv: false };
      let tx = p.tx, ty = p.ty, speed = pup ? 18 : 30;
      if (!pup && beasts.length) { const b = beasts[i % beasts.length]; tx = b.x + (i % 2 ? 14 : -14); ty = b.y + 2; speed = 70; }
      else if (!pup && !night && hunters.length && i % 2 === 0) { const h = hunters[i % hunters.length]; tx = h.x + 10; ty = h.y + 3; speed = 45; }
      else if (!pup && !night && guards.length) { const gd = guards[i % guards.length]; tx = gd.x - 9 * (i % 2 ? 1 : -1); ty = gd.y + 3; speed = 40; }
      else { p.wait -= dtr; if (p.wait <= 0) { const a = rand() * Math.PI * 2, r = night ? 20 : 30 + rand() * 30; p.tx = fx + Math.cos(a) * r; p.ty = fy + 10 + Math.sin(a) * r * 0.6; p.wait = 2 + rand() * 4; } tx = p.tx; ty = p.ty; }
      const dx = tx - p.x, dy = ty - p.y, dd = Math.hypot(dx, dy);
      p.mv = dd > 3;
      if (p.mv) { const s = Math.min(dd, speed * dtr * 2); p.x += dx / dd * s; p.y += dy / dd * s; if (Math.abs(dx) > 1) p.face = dx > 0 ? 1 : 0; }
      const sp = pup ? SPR.pup : SPR.dog, fr = p.mv ? Math.floor(time * 10) % 2 : 0;
      list.push([p.y, () => { shadow(lx, L(p.x), Tp(p.y), pup ? 3 : 5, 1); const im = sp[fr][p.face]; lx.drawImage(im, L(p.x) - Math.round(im.width / 2), Tp(p.y) - im.height + 1 - (night && !p.mv ? -2 : 0)); }]);
    });
  }
  // tro tàn khi lửa tắt
  function drawAsh(lx, X, Y, time) {
    R(lx, X + 4, Y + 14, 16, 4, '#5a5650'); R(lx, X + 6, Y + 12, 12, 3, '#6d6962'); R(lx, X + 8, Y + 11, 8, 2, '#3a3632');
    for (const [a, b] of [[6, 15], [11, 13], [16, 15]]) R(lx, X + a, Y + b, 3, 1, '#2a1a10');
    if (Math.floor(time * 2) % 3) R(lx, X + 12, Y + 14, 1, 1, '#c8401a');
    for (let k = 0; k < 3; k++) { const ph = (time * 0.4 + k * 0.33) % 1; lx.globalAlpha = 0.45 * (1 - ph); R(lx, X + 11 + Math.round(Math.sin(time + k) * 3), Y + 8 - Math.round(ph * 16), 2, 2, '#b0b0b0'); }
    lx.globalAlpha = 1;
  }
  // tuyết rơi & mặt đất phủ trắng khi mùa đông
  function fx(lx, vw, vh, time) {
    if (!S.saga || !winter()) return;
    lx.fillStyle = 'rgba(225,235,255,0.16)'; lx.fillRect(0, 0, vw, vh);
    const heavy = S.weather === 'rain';
    const n = Math.floor(vw * vh / (heavy ? 700 : 1800));
    lx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < n; i++) {
      const x = Math.floor((i * 53.7 + Math.sin(time * 0.8 + i) * 6 + time * 8) % vw);
      const y = Math.floor((i * 97.1 + time * (heavy ? 40 : 22) * (0.7 + (i % 5) * 0.1)) % vh);
      lx.fillRect(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2);
    }
  }
  function overlay(ctx, W, dpr, bar, time) {
    if (!S.saga) return;
    const lab = (wx, wy, t, col) => {
      const [sx, sy] = W(wx, wy);
      ctx.font = `bold ${Math.round(10 * dpr)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#1a1208'; ctx.fillStyle = col;
      ctx.strokeText(t, sx, sy); ctx.fillText(t, sx, sy);
    };
    const mo = mammoth();
    if (mo) { const h = G().mhunt; lab((mo.x + 1.5) * T, mo.y * T - 22, 'Voi ma mút', '#ffd8a0'); if (h && h.phase === 'fight') { const [sx, sy] = W((mo.x + 1.5) * T, mo.y * T - 14); bar(sx, sy, 30 * dpr, 1 - h.progress / MM.hours, '#e08040'); } }
    const wh = wildHorse(); if (wh) lab((wh.x + 1) * T, wh.y * T - 12, 'Ngựa hoang', '#f0e0b0');
    const vo = visitors(); if (vo && S.hour - vo.t0 >= 1.2) lab((vo.x + 1) * T, vo.y * T - 14, NB.name, '#ffb0a0');
    if (fireOut()) { const f = WORLD.fire(); lab((f.x + 0.5) * T, f.y * T - 10, 'Lửa đã tắt!', Math.floor(time * 2) % 2 ? '#ff8060' : '#ffd0a0'); }
  }

  return {
    migrate, awayIds, season, winter, frozenNight, growMult, fireOut, woodReserve, burnMult, has, era, workMult, walkMult, capBonus, fightMult,
    huntMod, afterHuntWin, beastKilled, overnight, tick, autoJobs, handles, check, assign, planJob, task, jobText, WORK_POSE,
    fireActions, objActions, topHTML, resHTML, updateTop, panelHTML, updatePanel, drawObj, pushDraw, drawAsh, fx, overlay, memory, addIdeas,
    SPR, DESC, INV, PIC_URL, spawnMammoth, spawnWildHorse, spawnVisitors, spawnRaid, addPup, memHTML,
  };
})();
window.SAGA = SAGA;
