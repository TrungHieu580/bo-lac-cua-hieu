// =====================================================================
//  CIV — văn minh bộ lạc
//  • Cấp công trình (lều cỏ → nhà gỗ → nhà đá...), tự nâng cấp khi làng đông
//  • Định mức hạ tầng theo dân số: nhà ở, kho, nước, chữa bệnh, phòng thủ, tâm linh, đường lát đá
//  • Nhà hiền triết (nghiên cứu), nhánh phát minh mới
//  • Mỏ quặng đồng, Lò luyện, chế tác vật phẩm (giáo đồng, cung, giáp da, thuốc, công cụ, chum gốm)
//  • Ngành nghề, Trường dạy nghề, kỹ năng tới bậc 7
//  • Luật lệ & kỷ luật bộ lạc
//  • Doanh trại, chiến binh, hành quân chinh phạt
// =====================================================================
'use strict';
const CIV = (() => {
  const T = CFG.TILE, C = CFG.CIV, B = CFG.BUILDINGS;
  const rand = () => Math.random();
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cnt = (t) => S.objects.filter(o => o.type === t).length;
  const objs = (t) => S.objects.filter(o => o.type === t);
  const isJob = (v, t) => v.job && v.job.type === t;
  const lvl = () => (window.TRB ? TRB.level() : 1);
  const has = (id) => !!(window.SAGA && S.saga && SAGA.has(id));
  const adults = () => S.villagers.filter(v => !v.child);
  const names = (vs) => vs.map(v => v.name).join(', ');
  const SK = () => CFG.SKILL_NAMES;
  const G = () => S.civ;

  // ---------------- DỮ LIỆU ----------------
  function migrate(s) {
    if (!s.civ) s.civ = {
      items: { bspear: 0, bow: 0, armor: 0, medicine: 0, tools: 0, jar: 0 },
      laws: [], autoLawSlots: 0, disc: 40, ideaAcc: 0, paved: [],
      campaign: null, wins: 0, losses: 0, vassal: false, safeUntil: 0, lastCampaign: 0, made: 0, bronzeMade: 0,
    };
    if (s.res.ore === undefined) s.res.ore = 0;
    if (s.res.bronze === undefined) s.res.bronze = 0;
  }
  const awayIds = () => (S.civ && S.civ.campaign ? S.civ.campaign.party.map(p => p.id) : []);

  // ---------------- PHÁT MINH MỚI ----------------
  if (window.SAGA) {
    const add = (i) => { if (!SAGA.INV.find(x => x.id === i.id)) SAGA.INV.push(i); };
    add({ id: 'herbal',   era: 1, cost: 9,  name: 'Thảo dược',         desc: 'Chế thuốc thảo dược ở Xưởng chế tác; người bệnh được uống thuốc hồi phục nhanh.' });
    add({ id: 'masonry',  era: 2, cost: 16, name: 'Xây đá',            desc: 'Mở khóa công trình cấp 3: nhà đá, kho đá, doanh trại đá...' });
    add({ id: 'smelting', era: 2, cost: 18, name: 'Luyện quặng',       desc: 'Tìm thấy mỏ quặng đồng ở đồi đá; xây Lò luyện để nấu đồng thỏi.' });
    add({ id: 'drill',    era: 2, cost: 14, name: 'Đội hình chiến đấu', desc: 'Chiến binh luyện tập nhanh gấp rưỡi, đánh mạnh hơn 10%.' });
    add({ id: 'law',      era: 2, cost: 12, name: 'Luật truyền khẩu',  desc: 'Thêm một luật lệ được ban hành cùng lúc.' });
    add({ id: 'medicine', era: 3, cost: 22, name: 'Y thuật',           desc: 'Thuốc mạnh gấp đôi; Nhà chữa bệnh hồi phục nhanh hơn.' });
    add({ id: 'tactics',  era: 3, cost: 24, name: 'Binh pháp',         desc: 'Quân hành quân chinh phạt mạnh hơn 25%, ít thương vong hơn.' });
  }

  // ---------------- CẤP CÔNG TRÌNH ----------------
  const TIERED = ['hut', 'longhouse', 'granary', 'rack', 'kitchen', 'workshop', 'sickhouse', 'watchtower', 'healer', 'pen', 'barracks', 'school', 'scholar', 'well', 'smelter'];
  const TNAME = {
    hut: ['', 'Lều cỏ', 'Nhà gỗ', 'Nhà đá'], longhouse: ['', 'Nhà dài', 'Nhà dài gỗ', 'Nhà dài đá'], granary: ['', 'Kho lương', 'Kho lương gỗ', 'Kho lương đá'],
    watchtower: ['', 'Chòi canh', 'Tháp canh gỗ', 'Tháp canh đá'], barracks: ['', 'Doanh trại', 'Doanh trại gỗ', 'Thành lũy đá'],
  };
  const tier = (o) => o.tier || 1;
  const tierable = (o) => o && TIERED.includes(o.type);
  function tname(o, t) { t = t || tier(o); return (TNAME[o.type] && TNAME[o.type][t]) || `${B[o.type] ? B[o.type].name : o.type}${t > 1 ? ` (cấp ${t})` : ''}`; }
  function tcost(o, t) {
    const b = B[o.type];
    return t === 2 ? { wood: Math.ceil(b.wood * 0.9) + 6, stone: Math.ceil(b.stone * 0.6) + 4, hours: Math.ceil(b.hours * 0.6) }
      : { wood: Math.ceil(b.wood * 0.6) + 6, stone: Math.ceil(b.stone * 1.3) + 12, hours: Math.ceil(b.hours * 0.9) };
  }
  function tierLock(t) {
    if (t === 2) return S.villagers.length >= C.tier2.pop || lvl() >= C.tier2.level ? '' : `Cần ${C.tier2.pop} dân hoặc bộ lạc cấp ${C.tier2.level}`;
    if (!has(C.tier3.invent)) return 'Cần phát minh Xây đá';
    return S.villagers.length >= C.tier3.pop || lvl() >= C.tier3.level ? '' : `Cần ${C.tier3.pop} dân hoặc bộ lạc cấp ${C.tier3.level}`;
  }
  function bedsOf(h) {
    const t = tier(h);
    if (h.type === 'greathall') return B.greathall.beds;
    if (h.type === 'longhouse') return [0, 6, 8, 10][t];
    return [0, 3, 4, 5][t];
  }
  const sumBeds = () => S.objects.filter(o => o.type === 'hut' || o.type === 'longhouse' || o.type === 'greathall').reduce((s, o) => s + bedsOf(o), 0);
  function foodCap() {
    let n = 0;
    for (const o of S.objects) { if (o.type === 'granary') n += B.granary.foodCap * [0, 1, 1.5, 2][tier(o)]; if (o.type === 'rack') n += B.rack.foodCap * [0, 1, 1.5, 2][tier(o)]; }
    return Math.round(n) + Math.min(10, G() ? G().items.jar : 0) * 5;
  }
  const maxTier = (t) => objs(t).reduce((m, o) => Math.max(m, tier(o)), 0);
  const kitchenBonus = () => Math.max(0, maxTier('kitchen') - 1) * 0.05;
  const penCap = (p) => CFG.PEN.cap + 2 * (tier(p) - 1);
  const skillCap = () => cnt('school') ? 4 + maxTier('school') : 5;

  // ---------------- ĐỊNH MỨC HẠ TẦNG ----------------
  const wellCap = () => objs('well').reduce((s, o) => s + C.wellServes * tier(o), 0);
  function needs() {
    const pop = S.villagers.length, out = [];
    const r = (k, name, have, need, hint) => out.push({ k, name, have, need, ratio: need > 0 ? clamp(have / need, 0, 1.5) : 1, hint });
    r('home', 'Nhà ở', sumBeds(), pop, 'xây hoặc nâng cấp lều');
    r('store', 'Kho lương thực', SIM.cap('food'), pop * 6, 'kho lương, giàn phơi, chum gốm');
    if (pop >= 10) r('water', 'Nước sạch', wellCap(), pop, 'xây hoặc nâng cấp giếng');
    if (pop >= 8) r('care', 'Chữa bệnh', objs('sickhouse').reduce((s, o) => s + CFG.CARE.patients * tier(o), 0) + cnt('healer') * 3 * maxTier('healer'), Math.ceil(pop / 5), 'nhà chữa bệnh, lều thảo dược');
    const soldiers = S.villagers.filter(v => v.prof === 'soldier').length, guards = S.villagers.filter(v => v.job && v.job.type === 'guard').length;
    if (pop >= 10) r('defense', 'Phòng thủ', guards + soldiers * 1.5 + objs('watchtower').reduce((s, o) => s + 1.5 * tier(o), 0), Math.ceil(pop / 5), 'chòi canh, doanh trại, chiến binh');
    if (pop >= 14) r('spirit', 'Tâm linh', (cnt('temple') + cnt('stonering') + cnt('paintwall') + cnt('greathall')) * 12 + 6, pop, 'đền, vòng đá, vách tranh');
    if (pop >= 12) r('learn', 'Học tập', cnt('scholar') * 12 * maxTier('scholar') + cnt('school') * 15 * maxTier('school'), pop, 'nhà hiền triết, trường dạy nghề');
    if (pop >= 15) r('road', 'Đường lát đá', G().paved.length, pop * 2, 'lát đá đường đất quanh làng');
    return out;
  }
  function livingScore() { const n = needs(); return n.length ? n.reduce((s, x) => s + Math.min(1, x.ratio), 0) / n.length : 1; }

  // ---------------- ĐƯỜNG LÁT ĐÁ ----------------
  let pavedSet = null;
  const pkey = (x, y) => x + ',' + y;
  function paved() { if (!pavedSet) pavedSet = new Set(G().paved.map(([x, y]) => pkey(x, y))); return pavedSet; }
  function roadMult(v) {
    if (!S.civ || !G().paved.length) return 1;
    const x = Math.floor(v.x / T), y = Math.floor((v.y - 1) / T);
    return paved().has(pkey(x, y)) ? C.roadSpeed : 1;
  }
  function paveCandidates() {
    const f = WORLD.fire(), R = Math.min(EXP.buildRadius(), 18), out = [], ps = paved();
    for (let y = f.y - R; y <= f.y + R; y++) for (let x = f.x - R; x <= f.x + R; x++) {
      if (WORLD.ter(x, y) !== 'dirt' || ps.has(pkey(x, y)) || !WORLD.walkable(x, y) || !WORLD.inMain(x, y)) continue;
      out.push([x, y, Math.hypot(x - f.x, y - f.y)]);
    }
    return out.sort((a, b) => a[2] - b[2]);
  }
  function shift(dx, dy) { if (S.civ) { G().paved = G().paved.map(([x, y]) => [x + dx, y + dy]); pavedSet = null; } }

  // ---------------- VẬT PHẨM ----------------
  const ITEMS = {
    bspear:   { name: 'Giáo đồng',     cost: { bronze: 1, wood: 1 }, hours: 1.2, inv: 'bronze',  desc: 'Chiến binh, người gác cầm giáo đồng đánh mạnh hơn 35%.' },
    bow:      { name: 'Cung tên',      cost: { wood: 3 },            hours: 1.0, inv: 'bow',     desc: 'Chiến binh có cung đánh mạnh hơn 15% (bắn trước khi thú áp sát).' },
    armor:    { name: 'Giáp da',       cost: { furs: 3 },            hours: 1.4, inv: 'sewing',  desc: 'Người mặc giáp bị thương ít hơn 30%.' },
    medicine: { name: 'Thuốc thảo dược', cost: { food: 4 },          hours: 0.8, inv: 'herbal',  desc: 'Người yếu (sức khỏe dưới 55) uống thuốc mỗi đêm: +25 sức khỏe (+50 khi có Y thuật).' },
    tools:    { name: 'Công cụ đồng',  cost: { bronze: 1, stone: 1 }, hours: 1.0, inv: 'bronze', desc: 'Đủ công cụ (1 cho 3 người) thì mọi việc nhanh hơn tới 10%.' },
    jar:      { name: 'Chum gốm',      cost: { stone: 2, wood: 1 },  hours: 0.8, inv: 'pottery', desc: 'Mỗi chum chứa thêm 5 thức ăn (tối đa 10 chum).' },
  };
  const amountOf = (k) => k === 'furs' ? (S.saga ? S.saga.furs : 0) : (S.res[k] || 0);
  function payable(cost, reserve) { return Object.entries(cost).every(([k, n]) => amountOf(k) >= n + (reserve && k === 'food' ? S.villagers.length * 2 : reserve && (k === 'wood' || k === 'stone') ? 6 : 0)); }
  function pay(cost) { for (const [k, n] of Object.entries(cost)) { if (k === 'furs') S.saga.furs -= n; else S.res[k] -= n; } }
  function itemTarget(k) {
    const sol = S.villagers.filter(v => v.prof === 'soldier').length, gu = S.villagers.filter(v => v.job && v.job.type === 'guard').length;
    return { bspear: sol + gu, bow: Math.ceil(sol / 2), armor: sol, medicine: Math.ceil(S.villagers.length / 8), tools: Math.ceil(adults().length / 3), jar: 10 }[k];
  }
  function nextRecipe() {
    let best = null, br = 1;
    for (const [k, it] of Object.entries(ITEMS)) {
      if (!has(it.inv)) continue;
      const tg = itemTarget(k); if (!tg) continue;
      const r = G().items[k] / tg;
      if (r < br && payable(it.cost, true)) { br = r; best = k; }
    }
    return best;
  }
  // thứ tự cầm trang bị: chiến binh trước, rồi người gác
  function equipRank(v) {
    const list = S.villagers.filter(x => x.prof === 'soldier' || (x.job && x.job.type === 'guard')).sort((a, b) => (b.prof === 'soldier') - (a.prof === 'soldier') || a.id - b.id);
    return list.indexOf(v);
  }
  function fightMult(v) {
    if (!S.civ) return 1;
    let m = 1 + Math.max(0, G().disc - 40) / 250;
    const i = equipRank(v);
    if (i >= 0) { if (i < G().items.bspear) m *= 1.35; else if (i < G().items.bow) m *= 1.15; }
    if (v.prof === 'soldier' && has('drill')) m *= 1.1;
    const tw = maxTier('watchtower'); if (tw > 1) m *= 1 + 0.05 * (tw - 1);
    return m;
  }
  function armorMult(v) { if (!S.civ) return 1; const i = equipRank(v); return i >= 0 && i < G().items.armor ? 0.7 : 1; }

  // ---------------- NGÀNH NGHỀ ----------------
  const PROF = { scholar: 'Học giả', smith: 'Thợ rèn', teacher: 'Thầy dạy nghề', soldier: 'Chiến binh' };
  const PROF_JOB = { scholar: 'study', smith: 'smith', teacher: 'teach', soldier: 'drill' };
  const PROF_JOBS = Object.values(PROF_JOB);
  const reserved = (v) => !!(v.job && PROF_JOBS.includes(v.job.type));
  function title(v) {
    if (v.prof === 'soldier') { const i = equipRank(v); return S.civ && i >= 0 && i < G().items.bow && i >= G().items.bspear ? 'Cung thủ' : 'Chiến binh'; }
    if (v.prof && PROF[v.prof]) return PROF[v.prof];
    const top = Object.entries(v.skills).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 6) return `Bậc thầy ${SK()[top[0]].toLowerCase()}`;
    return null;
  }
  function wantProf() {
    const pop = S.villagers.length;
    const w = { scholar: 0, smith: 0, teacher: 0, soldier: 0 };
    if (cnt('scholar')) w.scholar = Math.min(3 * cnt('scholar'), Math.max(1, Math.floor(pop / 10)));
    if (cnt('smelter')) w.smith++;
    if (cnt('workshop') && Object.values(ITEMS).some(it => has(it.inv))) w.smith++;
    if (pop >= 30 && w.smith) w.smith++;
    if (cnt('school')) w.teacher = 1;
    const cap = objs('barracks').reduce((s, o) => s + C.barracksCap[tier(o)], 0);
    if (cap) w.soldier = Math.min(cap, Math.floor(pop / C.soldiersPer * (lawOn('conscription') ? 1.5 : 1)));
    return w;
  }
  const canStaff = (v) => !v.child && !v.pregnant && v.health >= 40 && !(window.TRB && TRB.isRole(v));
  function staff() {
    const w = wantProf();
    for (const [p, n] of Object.entries(w)) {
      let cur = S.villagers.filter(v => v.prof === p);
      for (const v of cur.slice(n)) { v.prof = null; if (isJob(v, PROF_JOB[p])) { v.job = null; v.task = null; } }
      cur = cur.slice(0, n);
      if (cur.length >= n) continue;
      const sk = { scholar: 'gather', smith: 'build', teacher: null, soldier: 'guard' }[p];
      const score = (v) => sk ? (v.skills[sk] || 1) + (p === 'soldier' ? (v.skills.hunt || 1) * 0.5 : 0) : Math.max(...Object.values(v.skills));
      const cand = S.villagers.filter(v => !v.prof && canStaff(v) && !(v.job && v.job.type === 'guard')).sort((a, b) => score(b) - score(a));
      for (const v of cand.slice(0, n - cur.length)) { v.prof = p; SIM.log(`${v.name} trở thành ${PROF[p].toLowerCase()} của bộ lạc.`, 'ev'); }
    }
  }
  // kinh nghiệm & kỹ năng vượt bậc 5
  function addXp(v, sk, h) {
    if (!sk || !v.skills[sk]) return;
    if (!v.xp) v.xp = {};
    v.xp[sk] = (v.xp[sk] || 0) + h * (lawOn('elders') ? 2 : 1);
    const lv = v.skills[sk], need = 8 * lv;
    if (v.xp[sk] >= need && lv < Math.min(C.skillMax, skillCap())) {
      v.xp[sk] -= need; v.skills[sk]++;
      SIM.log(`Kỹ năng ${SK()[sk]} của ${v.name} lên bậc ${v.skills[sk]}${v.skills[sk] >= 6 ? ' — bậc thầy' : ''}.`, 'ev');
    }
  }

  // ---------------- LUẬT LỆ & KỶ LUẬT ----------------
  const LAWS = {
    share:        { name: 'Chia đều thức ăn',       desc: 'Mỗi đêm tinh thần +2, nhưng mọi người làm chậm hơn 3%.', disc: 5 },
    elders:       { name: 'Kính lão & truyền nghề', desc: 'Học nghề, lên kỹ năng nhanh gấp đôi; tinh thần +1 mỗi đêm.', disc: 5 },
    labor:        { name: 'Lao động chung',         desc: 'Làm việc nhanh hơn 8%, tinh thần −2 mỗi đêm.', disc: 12 },
    ritual:       { name: 'Tế lễ định kỳ',          desc: 'Cứ 4 ngày một lễ: tốn 15 thức ăn, tinh thần +8, +2 ý tưởng.', disc: 6 },
    conscription: { name: 'Nghĩa vụ quân sự',       desc: 'Số chiến binh tăng 50%, luyện tập nhanh hơn 25%; tinh thần −1 mỗi đêm.', disc: 15 },
    curfew:       { name: 'Giờ giới nghiêm',        desc: 'Mọi người đi ngủ lúc 20:00: sáng dậy năng lượng +8, tinh thần −1.', disc: 15 },
  };
  const lawOn = (k) => !!(S.civ && G().laws.includes(k));
  const lawSlots = () => C.lawSlots[clamp(lvl() - 1, 0, C.lawSlots.length - 1)] + (has('law') ? 1 : 0);
  const bedtimeHour = () => lawOn('curfew') ? 20 : CFG.BEDTIME;
  function toggleLaw(k) {
    const g = G();
    if (g.laws.includes(k)) { g.laws = g.laws.filter(x => x !== k); SIM.log(`Tù trưởng bãi bỏ luật "${LAWS[k].name}".`, 'ev'); return { ok: true, msg: `Đã bãi bỏ luật ${LAWS[k].name}` }; }
    if (g.laws.length >= lawSlots()) return { ok: false, msg: `Chỉ ban hành được ${lawSlots()} luật cùng lúc — bãi bỏ một luật trước` };
    g.laws.push(k);
    SIM.event(`Tù trưởng ban hành luật mới: "${LAWS[k].name}". ${LAWS[k].desc}`);
    return { ok: true, msg: `Đã ban hành luật ${LAWS[k].name}` };
  }
  function autoLaws() {
    const g = G(), sl = lawSlots();
    if (!S.auto || g.autoLawSlots >= sl) return;
    g.autoLawSlots = sl;
    for (const k of ['share', 'elders', 'labor', 'ritual', 'conscription', 'curfew']) {
      if (g.laws.length >= sl) break;
      if (k === 'conscription' && !cnt('barracks')) continue;
      if (!g.laws.includes(k)) toggleLaw(k);
    }
  }
  function discTarget() {
    const g = G();
    let t = 30 + g.laws.reduce((s, k) => s + (LAWS[k] ? LAWS[k].disc : 0), 0);
    const chief = S.roles && S.roles.chief ? SIM.vById(S.roles.chief) : null;
    if (chief && chief.health >= 50) t += 10;
    t += Math.min(15, S.villagers.filter(v => v.prof === 'soldier').length * 2) + (cnt('barracks') ? 5 : 0);
    const a = adults(), mo = a.length ? a.reduce((s, v) => s + v.morale, 0) / a.length : 60;
    if (mo < 40) t -= 15;
    return clamp(t, 0, 100);
  }
  const discName = (d) => d >= 75 ? 'Nghiêm minh' : d >= 55 ? 'Nề nếp' : d >= 35 ? 'Bình thường' : d >= 20 ? 'Lỏng lẻo' : 'Hỗn loạn';

  // ---------------- HIỆU ỨNG CHUNG ----------------
  function workMult(v, skill) {
    if (!S.civ) return 1;
    let m = 1 + (G().disc - 50) / 600;
    if (lawOn('labor')) m *= 1.08;
    if (lawOn('share')) m *= 0.97;
    const tg = Math.max(1, Math.ceil(adults().length / 3));
    m *= 1 + 0.1 * Math.min(1, G().items.tools / tg);
    if (skill === 'build') { const w = maxTier('workshop'); if (w > 1) m *= 1 + 0.05 * (w - 1); }
    return m;
  }

  // ---------------- QUÂN ĐỘI & HÀNH QUÂN ----------------
  const soldiers = () => S.villagers.filter(v => v.prof === 'soldier');
  function strengthOf(vs) {
    let s = 0;
    for (const v of vs) s += (1 + (v.skills.guard || 1) * 0.4) * (v.health / 100) * fightMult(v) * (armorMult(v) < 1 ? 1.15 : 1);
    if (has('tactics')) s *= 1.25;
    if (S.saga) s += Math.min(4, S.saga.dogs.length) * 0.8 + S.saga.horses * 1.2;
    return Math.round(s * 10) / 10;
  }
  const NBN = () => (CFG.NEIGHBOR ? CFG.NEIGHBOR.name : 'bộ lạc lân cận');
  const TARGETS = {
    den:  { name: 'Diệt hang thú dữ',          diff: () => 14 + S.day * 0.6,  desc: 'Vào sâu trong rừng diệt ổ sói, gấu: được thịt và da, làng yên ổn 5 ngày không bị thú dữ tấn công.' },
    raid: { name: `Tấn công trại ${NBN()}`,    diff: () => 24 + S.day * 0.8, desc: 'Đánh bại bộ lạc lân cận: cướp lương thực, vật liệu; họ phải thần phục và nộp cống mỗi ngày.' },
    far:  { name: 'Chinh phục vùng đất xa',    diff: () => 28 + S.day * 0.9, desc: 'Hành quân tới vùng đất xa: mang về đá, quặng, hạt giống và người theo về.' },
  };
  function targetOk(k) {
    if (k === 'raid') { if (!S.saga || !S.saga.nb.met) return `Chưa gặp ${NBN()}`; if (G().vassal) return `${NBN()} đã thần phục`; }
    return '';
  }
  const ready = () => soldiers().filter(v => v.health >= 60 && !v.inside);
  function startCampaign(k) {
    const g = G(), vs = ready();
    if (g.campaign) return { ok: false, msg: 'Quân đội đang hành quân' };
    if (vs.length < 4) return { ok: false, msg: `Cần ít nhất 4 chiến binh khỏe mạnh (có ${vs.length})` };
    const why = targetOk(k); if (why) return { ok: false, msg: why };
    const str = strengthOf(vs);
    g.campaign = { target: k, str, diff: Math.round(TARGETS[k].diff() * 10) / 10, back: S.day + 1, party: vs.map(v => { const c = JSON.parse(JSON.stringify(v)); c.job = null; c.task = null; c.carry = null; c.inside = 0; delete c.bed; return c; }) };
    const ids = new Set(vs.map(v => v.id));
    S.villagers = S.villagers.filter(v => !ids.has(v.id));
    g.lastCampaign = S.day;
    SIM.event(`Quân đội (${names(vs)}) lên đường: ${TARGETS[k].name}! Sức mạnh ${str} so với ${g.campaign.diff}.`);
    EV.emit('toast', `⚔ Quân đội lên đường: ${TARGETS[k].name}`);
    return { ok: true, msg: `Quân đội đã lên đường (${vs.length} chiến binh)` };
  }
  function returnCampaign() {
    const g = G(), c = g.campaign; g.campaign = null;
    const f = WORLD.fire(), [tx, ty] = WORLD.nearestMain(f.x - 3, f.y + 2);
    for (const p of c.party) { p.x = tx * T + T / 2; p.y = ty * T + T * 0.75; p.task = null; p.job = null; S.villagers.push(p); }
    const vs = c.party.map(p => SIM.vById(p.id)).filter(Boolean);
    const chance = clamp(c.str / (c.str + c.diff) + 0.05, 0.1, 0.95), win = rand() < chance;
    const add = (k, n) => { if (k === 'furs') S.saga.furs = Math.min(CFG.SEASONS.furCap, S.saga.furs + n); else S.res[k] = Math.min(k === 'bronze' || k === 'ore' ? 999 : SIM.cap(k), (S.res[k] || 0) + n); };
    const loot = [];
    if (win) {
      g.wins++;
      if (c.target === 'den') { add('food', 30); add('furs', 8); g.safeUntil = S.day + 5; loot.push('30 thịt', '8 tấm da', 'làng yên ổn 5 ngày'); }
      if (c.target === 'raid') {
        add('food', 40); add('wood', 30); add('stone', 30); add('bronze', 3); loot.push('40 thức ăn', '30 gỗ', '30 đá', '3 đồng');
        g.vassal = true; if (S.saga) { S.saga.nb.rel = Math.max(S.saga.nb.rel, 30); S.saga.nb.ally = false; }
        loot.push(`${NBN()} thần phục, nộp cống mỗi ngày`);
        if (window.SAGA) SAGA.memory('spear', `Chinh phạt ${NBN()}`);
      }
      if (c.target === 'far') {
        add('stone', 40); add('ore', 10); S.res.seeds = Math.min(CFG.SEED_CAP, S.res.seeds + 10); loot.push('40 đá', '10 quặng', '10 hạt giống');
        if (S.villagers.length < EXP.popLimit() && EXP.beds() > S.villagers.length) { EXP.newcomer(); loot.push('một người theo về'); }
        if (window.SAGA) SAGA.memory('feet', 'Chinh phục vùng đất xa');
      }
      for (const v of vs) { v.morale = clamp(v.morale + 8, 0, 100); if (rand() < 0.4) addXp(v, 'guard', 8); }
      S.villagers.forEach(v => v.morale = clamp(v.morale + 4, 0, 100));
      SIM.event(`Quân đội thắng trận trở về (${TARGETS[c.target].name})! Chiến lợi phẩm: ${loot.join(', ')}.`);
      EV.emit('toast', `⚔ Thắng trận! ${loot.slice(0, 3).join(', ')}`);
      if (g.wins === 1 && window.SAGA) SAGA.memory('spear', 'Chiến thắng đầu tiên của quân đội');
    } else {
      g.losses++;
      if (c.target === 'raid' && S.saga) S.saga.nb.rel = Math.max(0, S.saga.nb.rel - 10);
      S.villagers.forEach(v => v.morale = clamp(v.morale - 3, 0, 100));
      SIM.event(`Quân đội thua trận, rút về làng (${TARGETS[c.target].name}). Nhiều người bị thương.`);
      EV.emit('toast', '⚔ Quân đội thua trận, rút về');
    }
    for (const v of vs) {
      const hurt = rand() < (win ? 0.35 : 0.75) * (has('tactics') ? 0.7 : 1);
      if (hurt) { const d = (win ? 10 : 20) + Math.floor(rand() * 15); v.health = clamp(v.health - d, 1, 100); }
    }
  }

  // ---------------- MỎ QUẶNG ----------------
  function spawnOre() {
    const f = WORLD.fire(), cand = [];
    for (let y = 0; y < WORLD.H; y++) for (let x = 0; x < WORLD.W; x++) {
      if (WORLD.ter(x, y) !== 'rock' || WORLD.objAt(x, y)) continue;
      const d = Math.hypot(x - f.x, y - f.y);
      if (d < 6 || d > 30) continue;
      if (!WORLD.ringTiles({ x, y, w: 1, h: 1 }).some(([a, c]) => WORLD.inMain(a, c))) continue;
      cand.push([x, y, d]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    let n = 0;
    for (const [x, y] of cand) {
      if (n >= 2) break;
      if (S.objects.some(o => o.type === 'oremine' && Math.hypot(o.x - x, o.y - y) < 4)) continue;
      WORLD.addObj({ type: 'oremine', x, y, w: 1, h: 1, stock: CFG.GATHER.ore.stock }); n++;
    }
    if (n) { WORLD.rebuild(); SIM.event('Những người đi lấy đá phát hiện mạch quặng đồng xanh lục ở đồi đá! Có thể đào quặng để luyện đồng.'); }
  }
  function options(v, push) {
    if (!S.civ || !cnt('smelter') || S.res.ore >= 24) return;
    const m = objs('oremine').filter(o => o.stock > 0 && S.villagers.filter(w => w.job && w.job.target === o.id).length < 2)
      .sort((a, b) => Math.hypot(a.x * T - v.x, a.y * T - v.y) - Math.hypot(b.x * T - v.x, b.y * T - v.y))[0];
    if (m) push(S.res.ore < 6 ? 4 : 2, 'build', 'build', { type: 'gather', target: m.id });
  }

  // ---------------- XÂY DỰNG TỰ ĐỘNG ----------------
  const unlockedB = (k) => S.villagers.length >= (B[k].unlock || 0) && (!B[k].invent || has(B[k].invent));
  function wantBuild() {
    const n = Object.fromEntries(needs().map(x => [x.k, x.ratio]));
    const site = (k) => S.objects.some(o => o.type === 'site' && o.kind === k);
    if (unlockedB('well') && n.water !== undefined && n.water < 1 && !site('well')) return 'well';
    if (unlockedB('scholar') && !cnt('scholar') && !site('scholar')) return 'scholar';
    if (unlockedB('smelter') && !cnt('smelter') && !site('smelter')) return 'smelter';
    if (unlockedB('school') && !cnt('school') && !site('school')) return 'school';
    if (unlockedB('barracks') && cnt('barracks') < (S.villagers.length >= 30 ? 2 : 1) && !site('barracks')) return 'barracks';
    if (unlockedB('scholar') && cnt('scholar') < 2 && S.villagers.length >= 28 && !site('scholar')) return 'scholar';
    return null;
  }
  function upgradeCandidate() {
    if (S.objects.some(o => o.civup)) return null;
    const n = Object.fromEntries(needs().map(x => [x.k, x.ratio]));
    const order = (o) => {
      let p = 5;
      if (o.type === 'hut' || o.type === 'longhouse') p = n.home < 1.05 ? 0 : 2;
      else if (o.type === 'granary' || o.type === 'rack') p = n.store < 1 ? 1 : 4;
      else if (o.type === 'well') p = n.water < 1 ? 1 : 6;
      else if (o.type === 'sickhouse' || o.type === 'healer') p = n.care < 1 ? 1 : 5;
      else if (o.type === 'barracks' || o.type === 'watchtower') p = n.defense < 1 ? 2 : 5;
      else if (o.type === 'school' || o.type === 'scholar') p = 3;
      return p * 10 + tier(o);
    };
    const c = S.objects.filter(o => tierable(o) && tier(o) < 3 && !tierLock(tier(o) + 1)).sort((a, b) => order(a) - order(b));
    const saving = /^Đang tích vật liệu/.test(S.planNote || ''); // làng đang dành dụm cho công trình khác: chỉ nâng cấp nhà ở khi thiếu chỗ ngủ
    for (const o of c.slice(0, 6)) {
      if (saving && !((o.type === 'hut' || o.type === 'longhouse') && n.home < 1.05)) continue;
      const cost = tcost(o, tier(o) + 1), res = window.SAGA ? SAGA.woodReserve() : 0;
      if (S.res.wood >= cost.wood + 25 + res && S.res.stone >= cost.stone + 15) return o;
    }
    return null;
  }
  function startUpgrade(o) {
    const t = tier(o) + 1, c = tcost(o, t);
    S.res.wood -= c.wood; S.res.stone -= c.stone;
    o.civup = { progress: 0, need: c.hours, to: t };
    SIM.log(`Bắt đầu nâng cấp ${tname(o)} lên ${tname(o, t)} (−${c.wood} gỗ, −${c.stone} đá).`, 'ev');
  }

  // ---------------- GIAO VIỆC ----------------
  function free(v) {
    if (v.child || v.resting || v.pregnant > 0 || v.inside || v.carry || v.health < 35) return false;
    if (window.TRB && TRB.reserved(v)) return false;
    if (!v.job) return true;
    return v.job.auto && v.job.type === 'gather' && (!v.task || v.task.kind !== 'work');
  }
  function setJob(v, job, auto) { v.job = Object.assign({ auto: auto !== false, until: 99 }, job); v.task = null; v.resting = false; }
  function profJob(v) {
    const p = v.prof, day = SIM.phase() === 'day' && S.hour < CFG.EVENING - 0.5;
    if (!p || !day || !canStaff(v) || v.resting || v.carry) return;
    if (v.job && (!v.job.auto || v.job.type === PROF_JOB[p] || ['hunt', 'build', 'upgrade', 'upgradeFire', 'mammoth', 'explore', 'bridge', 'civup', 'kindle', 'stoke'].includes(v.job.type))) return;
    if (v.task && v.task.kind === 'work') return;
    if (p === 'scholar' && cnt('scholar')) setJob(v, { type: 'study' });
    else if (p === 'teacher' && cnt('school')) setJob(v, { type: 'teach' });
    else if (p === 'soldier' && cnt('barracks')) setJob(v, { type: 'drill' });
    else if (p === 'smith') { if (smithWork()) setJob(v, { type: 'smith' }); }
  }
  function smithWork() {
    if (cnt('smelter') && S.res.ore >= 2 && S.res.wood >= 2 && S.res.bronze < 12) return 'smelt';
    if (cnt('workshop') && nextRecipe()) return 'forge';
    return null;
  }
  function autoJobs() {
    if (!S.civ) migrate(S);
    staff();
    for (const v of S.villagers) profJob(v);
    autoLaws();
    // nâng cấp công trình
    const up = S.objects.find(o => o.civup) || ((S.objects.find(o => o.type === 'site') || S.objects.some(o => o.type === 'storage' && o.upgrading)) ? null : (() => { const o = upgradeCandidate(); if (o) startUpgrade(o); return o; })());
    if (up) {
      const have = S.villagers.filter(v => isJob(v, 'civup')).length;
      for (const v of S.villagers.filter(free).sort((a, b) => (b.skills.build || 1) - (a.skills.build || 1)).slice(0, Math.max(0, 3 - have))) setJob(v, { type: 'civup', target: up.id });
    }
    // lát đường
    const n = needs().find(x => x.k === 'road');
    if (n && n.ratio < 1 && S.res.stone >= 25 && !S.villagers.some(v => isJob(v, 'pave'))) { const v = S.villagers.filter(free)[0]; if (v) setJob(v, { type: 'pave' }); }
    // hành quân tự động
    const g = G();
    if (S.auto && !g.campaign && S.hour < 10 && S.day - g.lastCampaign >= 6 && ready().length >= 5) {
      const str = strengthOf(ready());
      if (S.saga && S.saga.nb.met && !g.vassal && S.saga.nb.rel < 25 && str > TARGETS.raid.diff() * 1.3) startCampaign('raid');
      else if (str > TARGETS.den.diff() * 1.8 && S.def && S.def.attacks > 3 && S.day - g.lastCampaign >= 10) startCampaign('den');
    }
  }
  const HANDLED = ['civUpgrade', 'civup', 'study', 'teach', 'drill', 'smith', 'pave', 'campaign', 'law', 'setProf'];
  function handles(t) { return HANDLED.includes(t); }
  function check(spec, vs) {
    const t = spec.type;
    if (t === 'civUpgrade') {
      const o = WORLD.byId(spec.target); if (!tierable(o)) return { ok: false, msg: '?' };
      if (o.civup) return { ok: true };
      if (tier(o) >= 3) return { ok: false, msg: 'Đã ở cấp cao nhất' };
      const l = tierLock(tier(o) + 1); if (l) return { ok: false, msg: l };
      if (S.objects.some(x => x.civup && x !== o)) return { ok: false, msg: 'Đang nâng cấp một công trình khác' };
      const c = tcost(o, tier(o) + 1);
      if (S.res.wood < c.wood) return { ok: false, msg: `Cần thêm ${c.wood - S.res.wood} gỗ` };
      if (S.res.stone < c.stone) return { ok: false, msg: `Cần thêm ${c.stone - S.res.stone} đá` };
      return { ok: true };
    }
    if (t === 'campaign') { if (G().campaign) return { ok: false, msg: 'Quân đội đang hành quân' }; const r = ready().length; if (r < 4) return { ok: false, msg: `Cần ít nhất 4 chiến binh khỏe mạnh (có ${r})` }; const w = targetOk(spec.target); return w ? { ok: false, msg: w } : { ok: true }; }
    if (t === 'law' || t === 'setProf') return { ok: true };
    if (!vs.length) return { ok: false, msg: 'Hãy chọn người' };
    if (vs.some(v => v.child)) return { ok: false, msg: 'Trẻ con chưa thể làm việc' };
    if (t === 'smith' && !smithWork()) return { ok: false, msg: 'Thiếu nguyên liệu hoặc chưa có gì cần chế tác' };
    if (t === 'pave' && S.res.stone < 1) return { ok: false, msg: 'Cần đá để lát đường' };
    return { ok: true };
  }
  function assign(spec, vs) {
    const c = check(spec, vs); if (!c.ok) return c;
    const t = spec.type;
    if (t === 'civUpgrade') {
      const o = WORLD.byId(spec.target);
      if (!o.civup) startUpgrade(o);
      for (const v of vs.filter(v => !v.child)) setJob(v, { type: 'civup', target: o.id }, false);
      return { ok: true, msg: vs.length ? `Bắt đầu nâng cấp — ${names(vs)} bắt tay làm` : `Bắt đầu nâng cấp${S.auto ? ' — làng sẽ cử người làm' : ' — hãy chọn người để làm'}` };
    }
    if (t === 'campaign') return startCampaign(spec.target);
    if (t === 'law') return toggleLaw(spec.id);
    if (t === 'setProf') { for (const v of vs) { v.prof = spec.prof || null; v.job = null; v.task = null; } return { ok: true }; }
    for (const v of vs) { setJob(v, { type: t, target: spec.target }, false); if (t === 'study') v.prof = 'scholar'; if (t === 'teach') v.prof = 'teacher'; if (t === 'drill') v.prof = 'soldier'; if (t === 'smith') v.prof = 'smith'; }
    return { ok: true };
  }
  const ring = (o) => WORLD.ringTiles(o).filter(([x, y]) => WORLD.inMain(x, y));
  function goWork(v, o, next) {
    const r = ring(o);
    if (!r.length) { v.job = null; v.note = 'Không có đường tới'; return true; }
    if (SIM.isAt(v, r)) { v.task = next; return true; }
    if (!SIM.goTo(v, r, next)) { v.job = null; v.note = 'Không có đường tới'; }
    return true;
  }
  const nearestOf = (v, t) => objs(t).sort((a, b) => Math.hypot(a.x * T - v.x, a.y * T - v.y) - Math.hypot(b.x * T - v.x, b.y * T - v.y))[0];
  function planJob(v, j) {
    const t = j.type;
    if (t === 'civup') {
      const o = WORLD.byId(j.target);
      if (!o || !o.civup) { v.job = null; v.note = 'Nâng cấp đã xong'; return true; }
      return goWork(v, o, { kind: 'civwork', target: o.id });
    }
    if (t === 'study') { const o = nearestOf(v, 'scholar'); if (!o) { v.job = null; return true; } return goWork(v, o, { kind: 'study', target: o.id, time: 1.5 }); }
    if (t === 'teach') { const o = nearestOf(v, 'school'); if (!o) { v.job = null; return true; } return goWork(v, o, { kind: 'teach', target: o.id, time: 1.5 }); }
    if (t === 'drill') { const o = nearestOf(v, 'barracks'); if (!o) { v.job = null; return true; } return goWork(v, o, { kind: 'drill', target: o.id, time: 1.2 }); }
    if (t === 'smith') {
      const w = smithWork();
      if (!w) { v.job = null; v.note = 'Hết việc chế tác'; return true; }
      const o = nearestOf(v, w === 'smelt' ? 'smelter' : 'workshop');
      if (w === 'smelt') return goWork(v, o, { kind: 'smelt', target: o.id, need: C.smeltHours, done: 0 });
      const k = nextRecipe();
      return goWork(v, o, { kind: 'forge', target: o.id, item: k, need: ITEMS[k].hours, done: 0 });
    }
    if (t === 'pave') {
      const c = paveCandidates().find(([x, y]) => !S.villagers.some(w => w !== v && w.task && w.task.kind === 'pave' && w.task.x === x && w.task.y === y));
      if (!c || S.res.stone < C.paveStone) { v.job = null; v.note = 'Đã lát xong đường'; return true; }
      const next = { kind: 'pave', x: c[0], y: c[1], time: 0.3 };
      if (SIM.isAt(v, [[c[0], c[1]]])) { v.task = next; return true; }
      if (!SIM.goTo(v, [[c[0], c[1]]], next)) v.job = null;
      return true;
    }
    return false;
  }
  function face(v, o) { const cx = (o.x + o.w / 2) * T; if (Math.abs(cx - v.x) > 4) v.facing = cx > v.x ? 1 : -1; }
  function task(v, t, dt) {
    const E = CFG.ENERGY;
    const o = t.target ? WORLD.byId(t.target) : null;
    switch (t.kind) {
      case 'civwork': {
        if (!o || !o.civup) { v.task = null; return true; }
        face(v, o); v.energy = clamp(v.energy - E.workDrain * dt, 0, 100);
        o.civup.progress += SIM.workSpeed(v, 'build') * dt;
        addXp(v, 'build', dt * 0.3);
        if (o.civup.progress >= o.civup.need) {
          const to = o.civup.to; o.tier = to; o.civup = null;
          S.villagers.filter(w => isJob(w, 'civup') && w.job.target === o.id).forEach(w => { w.job = null; w.task = null; });
          S.today.built.push(tname(o));
          SIM.event(`${tname(o, to - 1)} đã được nâng cấp thành ${tname(o)}!`);
          EV.emit('toast', `🏗 Nâng cấp xong: ${tname(o)}`);
          if (to === 3 && window.SAGA && !S.saga.seen.tier3) { S.saga.seen.tier3 = 1; SAGA.memory('temple', `Xây ngôi nhà đá đầu tiên`); }
        }
        return true;
      }
      case 'study': case 'teach': case 'drill': {
        if (!o) { v.task = null; return true; }
        face(v, o); t.time -= dt;
        v.energy = clamp(v.energy - E.workDrain * (t.kind === 'drill' ? 1 : 0.4) * dt, 0, 100);
        if (t.kind === 'study') {
          const sk = Math.max(v.skills.gather || 1, v.skills.farm || 1);
          G().ideaAcc += C.studyIdeas * (0.6 + sk * 0.12) * (1 + 0.25 * (tier(o) - 1)) * dt;
          if (G().ideaAcc >= 1 && window.SAGA) { const n = Math.floor(G().ideaAcc); G().ideaAcc -= n; SAGA.addIdeas(n); }
          addXp(v, 'gather', dt * 0.2);
        } else if (t.kind === 'drill') {
          const m = C.drillXp * (has('drill') ? 1.5 : 1) * (lawOn('conscription') ? 1.25 : 1) * (1 + 0.2 * (tier(o) - 1));
          addXp(v, 'guard', m * dt); addXp(v, 'hunt', m * 0.3 * dt);
        } else { // thầy dạy nghề truyền nghề cho người trẻ đang làm cùng nghề
          const top = Object.entries(v.skills).sort((a, b) => b[1] - a[1])[0];
          for (const w of S.villagers) if (w !== v && !w.child && w.skills[top[0]] < top[1] && (S.day - (w.bornDay || 0)) >= 0 && w.task && w.task.kind === 'work' && w.task.skill === top[0]) addXp(w, top[0], 0.15 * dt);
        }
        if (t.time <= 0) v.task = null;
        return true;
      }
      case 'smelt': case 'forge': {
        if (!o) { v.task = null; return true; }
        face(v, o); v.energy = clamp(v.energy - E.workDrain * dt, 0, 100);
        t.done += SIM.workSpeed(v, 'build') * (1 + 0.1 * (tier(o) - 1)) * dt;
        addXp(v, 'build', dt * 0.3);
        if (t.done >= t.need) {
          v.task = null;
          if (t.kind === 'smelt') {
            if (S.res.ore >= 2 && S.res.wood >= 1) { S.res.ore -= 2; S.res.wood -= 1; S.res.bronze++; G().bronzeMade++; EV.emit('float', { x: (o.x + 1) * T, y: o.y * T, text: '+1 đồng', icon: 'bronze' }); if (G().bronzeMade === 1) { SIM.event('Lò luyện ra mẻ đồng thỏi đầu tiên! Thợ rèn có thể làm giáo đồng, công cụ đồng.'); if (window.SAGA) SAGA.memory('invent', 'Mẻ đồng thỏi đầu tiên'); } }
          } else {
            const it = ITEMS[t.item];
            if (it && payable(it.cost)) { pay(it.cost); G().items[t.item]++; G().made++; EV.emit('float', { x: (o.x + 1) * T, y: o.y * T, text: `+1 ${it.name.toLowerCase()}`, icon: 'spear' }); }
          }
        }
        return true;
      }
      case 'pave': {
        t.time -= dt; v.energy = clamp(v.energy - E.workDrain * dt, 0, 100);
        if (t.time <= 0) {
          v.task = null;
          if (S.res.stone >= C.paveStone && WORLD.ter(t.x, t.y) === 'dirt' && !paved().has(pkey(t.x, t.y))) { S.res.stone -= C.paveStone; G().paved.push([t.x, t.y]); pavedSet = null; }
          const n = needs().find(x => x.k === 'road'); if (!n || n.ratio >= 1.2) v.job = null;
        }
        return true;
      }
      case 'learn': { // trẻ con học ở trường
        if (!o) { v.task = null; return true; }
        face(v, o); t.time -= dt;
        const teacher = S.villagers.some(w => w.task && w.task.kind === 'teach');
        if (teacher) addXp(v, v.main, 0.25 * dt);
        if (t.time <= 0) v.task = null;
        return true;
      }
    }
    return false;
  }
  function planChild(v) {
    if (!S.civ || !cnt('school') || S.hour < 8 || S.hour > 16 || v.carry) return false;
    if (!S.villagers.some(w => isJob(w, 'teach'))) return false;
    const o = nearestOf(v, 'school');
    return goWork(v, o, { kind: 'learn', target: o.id, time: 1 });
  }
  function jobText(v) {
    const k = v.task && v.task.kind, j = v.job && v.job.type;
    if (j === 'civup') return k === 'civwork' ? 'Nâng cấp công trình' : 'Đi nâng cấp công trình';
    if (j === 'study') return k === 'study' ? 'Nghiên cứu ở Nhà hiền triết' : 'Đi tới Nhà hiền triết';
    if (j === 'teach') return k === 'teach' ? 'Dạy nghề ở trường' : 'Đi tới trường dạy nghề';
    if (j === 'drill') return k === 'drill' ? 'Luyện tập ở doanh trại' : 'Đi tới doanh trại';
    if (j === 'smith') return k === 'smelt' ? 'Luyện quặng ra đồng thỏi' : k === 'forge' ? `Chế tác ${ITEMS[v.task.item] ? ITEMS[v.task.item].name.toLowerCase() : ''}` : 'Đi tới lò/xưởng';
    if (j === 'pave') return k === 'pave' ? 'Lát đá đường làng' : 'Đi lát đường';
    if (v.child && k === 'learn') return 'Đang học ở trường';
    return null;
  }
  const WORK_POSE = ['civwork', 'drill', 'smelt', 'forge', 'pave'];

  // ---------------- MỖI NHỊP & QUA ĐÊM ----------------
  let acc = 0;
  function tick(dt) {
    if (!S.civ) return;
    acc += dt;
    // kinh nghiệm khi làm việc
    for (const v of S.villagers) if (v.task && v.task.kind === 'work' && v.task.skill) addXp(v, v.task.skill, dt * 0.12);
    // nhà chữa bệnh cấp cao hồi nhanh hơn
    for (const v of S.villagers) if (v.task && v.task.kind === 'treat' && v.inside) { const h = WORLD.byId(v.inside); if (h && tier(h) > 1) v.health = clamp(v.health + (4 * (tier(h) - 1) + (has('medicine') ? 3 : 0)) * dt, 0, 100); }
    if (acc >= 0.5) { acc = 0; if (S.auto === false) { staff(); for (const v of S.villagers) if (v.prof && !v.job) profJob(v); } }
  }
  function overnight() {
    if (!S.civ) migrate(S);
    const g = G();
    // hành quân trở về
    if (g.campaign && S.day >= g.campaign.back) returnCampaign();
    // kỷ luật
    const tgt = discTarget();
    g.disc = Math.round(g.disc + (tgt - g.disc) / 3);
    if (g.disc < 25 && rand() < 0.3) {
      const a = adults(); if (a.length >= 2) { const x = pick(a), y = pick(a.filter(z => z !== x)); x.morale = clamp(x.morale - 4, 0, 100); y.morale = clamp(y.morale - 4, 0, 100); SIM.log(`Kỷ luật lỏng lẻo: ${x.name} và ${y.name} cãi nhau to, cả hai đều bực bội.`); }
    }
    // luật lệ
    const all = S.villagers;
    if (lawOn('share')) all.forEach(v => v.morale = clamp(v.morale + 2, 0, 100));
    if (lawOn('elders')) all.forEach(v => v.morale = clamp(v.morale + 1, 0, 100));
    if (lawOn('labor')) all.forEach(v => v.morale = clamp(v.morale - 2, 0, 100));
    if (lawOn('conscription')) all.forEach(v => v.morale = clamp(v.morale - 1, 0, 100));
    if (lawOn('curfew')) all.forEach(v => { v.energy = clamp(v.energy + 8, 0, 100); v.morale = clamp(v.morale - 1, 0, 100); });
    if (lawOn('ritual') && S.day % 4 === 0 && S.res.food >= 15) { S.res.food -= 15; all.forEach(v => v.morale = clamp(v.morale + 8, 0, 100)); if (window.SAGA) SAGA.addIdeas(2); SIM.log('Lễ tế tổ tiên định kỳ: cả làng nhảy múa quanh lửa (−15 thức ăn, tinh thần +8).', 'ev'); }
    // hạ tầng & mức sống
    const ns = needs(), unmet = ns.filter(x => x.ratio < 0.8);
    if (!unmet.length && ns.length >= 4) all.forEach(v => v.morale = clamp(v.morale + 2, 0, 100));
    else all.forEach(v => v.morale = clamp(v.morale - Math.min(3, unmet.length), 0, 100));
    const water = ns.find(x => x.k === 'water');
    if (water && water.ratio < 0.8) { all.forEach(v => v.health = clamp(v.health - 2, 1, 100)); SIM.log('Làng thiếu nước sạch — nhiều người đau bụng. Cần thêm giếng nước.'); }
    if (unmet.length) SIM.log(`Hạ tầng chưa đáp ứng: ${unmet.map(x => x.name.toLowerCase()).join(', ')}.`);
    const hl = maxTier('healer'); if (hl > 1) all.forEach(v => v.health = clamp(v.health + 4 * (hl - 1), 0, 100));
    // thuốc
    for (const v of all.filter(v => v.health < 55).sort((a, b) => a.health - b.health)) { if (g.items.medicine <= 0) break; g.items.medicine--; v.health = clamp(v.health + (has('medicine') ? 50 : 25), 0, 100); SIM.log(`${v.name} được uống thuốc thảo dược, khỏe lại nhiều.`); }
    // cống nạp, an toàn
    if (g.vassal) { S.res.food = Math.min(SIM.cap('food'), S.res.food + 8); S.res.stone = Math.min(SIM.cap('stone'), S.res.stone + 4); if (S.saga) S.saga.nb.rel = Math.max(S.saga.nb.rel, 30); SIM.log(`${NBN()} nộp cống: 8 thức ăn, 4 đá.`); }
    if (S.day < g.safeUntil && S.def) S.def.plan = null;
    // mỏ quặng
    if (has('smelting') && !cnt('oremine')) spawnOre();
    for (const o of objs('oremine')) o.stock = Math.min(CFG.GATHER.ore.stock, o.stock + CFG.GATHER.ore.regen);
  }

  // ---------------- GIAO DIỆN ----------------
  const DESC = {
    well: `Nước sạch cho ${C.wellServes} người (cấp 2: ${C.wellServes * 2}, cấp 3: ${C.wellServes * 3}). Làng từ 10 người trở lên thiếu nước thì sinh bệnh.`,
    scholar: 'Học giả làm việc ở đây để nghĩ ra ý tưởng mới, giúp phát minh nhanh hơn (cấp càng cao càng nhanh).',
    school: 'Thầy dạy nghề giảng dạy: trẻ con tới học lên kỹ năng, người trẻ học nghề nhanh hơn. Kỹ năng tối đa 5 → 6 (cấp 2) → 7 (cấp 3).',
    barracks: `Nơi chiến binh luyện tập mỗi ngày. Chứa ${C.barracksCap[1]} chiến binh (cấp 2: ${C.barracksCap[2]}, cấp 3: ${C.barracksCap[3]}). Có thể hành quân chinh phạt.`,
    smelter: 'Thợ rèn nấu 2 quặng + 1 gỗ thành 1 đồng thỏi. Cần mỏ quặng đồng (phát minh Luyện quặng).',
  };
  function tierEffect(o, t) {
    return ({ hut: `${bedsOf({ type: 'hut', tier: t })} chỗ ngủ`, longhouse: `${bedsOf({ type: 'longhouse', tier: t })} chỗ ngủ`, granary: `+${Math.round(B.granary.foodCap * [0, 1, 1.5, 2][t])} sức chứa thức ăn`, rack: `+${Math.round(B.rack.foodCap * [0, 1, 1.5, 2][t])} sức chứa thức ăn`, kitchen: `bữa tối tiết kiệm thêm ${(t - 1) * 5}%`, workshop: `xây dựng nhanh thêm ${(t - 1) * 5}%, chế tác nhanh hơn`, sickhouse: `người bệnh hồi thêm ${(t - 1) * 4}/giờ`, watchtower: `người đánh thú mạnh thêm ${(t - 1) * 5}%`, healer: `mọi người hồi thêm ${(t - 1) * 4} sức khỏe mỗi đêm`, pen: `chứa ${CFG.PEN.cap + 2 * (t - 1)} con dê`, barracks: `chứa ${C.barracksCap[t]} chiến binh, luyện tập nhanh hơn`, school: `kỹ năng tối đa ${4 + t}`, scholar: `nghiên cứu nhanh thêm ${(t - 1) * 25}%`, well: `nước cho ${C.wellServes * t} người`, smelter: `luyện nhanh thêm ${(t - 1) * 10}%` }[o.type]) || '';
  }
  function addActions(p, out) {
    if (p.kind !== 'obj') return;
    const o = WORLD.byId(p.id);
    if (!o) return;
    if (tierable(o)) {
      const t = tier(o);
      if (o.civup) out.actions.unshift({ spec: { type: 'civUpgrade', target: o.id }, label: `Tiếp tục nâng cấp lên ${tname(o, o.civup.to)}`, detail: `Tiến độ ${Math.round(o.civup.progress / o.civup.need * 100)}% · ${tierEffect(o, o.civup.to)}` });
      else if (t < 3) { const c = tcost(o, t + 1), l = tierLock(t + 1); out.actions.unshift({ spec: { type: 'civUpgrade', target: o.id }, label: `Nâng cấp lên ${tname(o, t + 1)}`, detail: `${c.wood} gỗ, ${c.stone} đá · ${c.hours} giờ công · ${tierEffect(o, t + 1)}${l ? ` · ${l}` : ''}` }); }
      out.title = `${tname(o)}${t > 1 ? '' : ''} · cấp ${t}/3`;
    }
    if (o.type === 'workshop') {
      const st = Object.entries(ITEMS).filter(([, it]) => has(it.inv)).map(([k, it]) => `${it.name} ${G().items[k]}/${itemTarget(k)}`).join(' · ');
      out.desc += st ? `<br>Vật phẩm: ${st}` : '<br>Chưa có phát minh nào để chế tác vật phẩm (Thảo dược, Kim xương & áo da, Cung tên, Đồ gốm, Luyện đồng).';
      out.actions.push({ spec: { type: 'smith' }, label: 'Chế tác vật phẩm', detail: 'Người được chọn thành thợ rèn, tự chế thứ làng đang thiếu nhất' });
    }
  }
  function objActions(o) {
    const g = G();
    if (o.type === 'oremine') { const go = CFG.GATHER.ore; return { title: 'Mỏ quặng đồng', desc: `Còn ${o.stock} quặng · mỗi đêm hồi ${go.regen}. Kho: ${S.res.ore} quặng, ${S.res.bronze} đồng thỏi.`, actions: [{ spec: { type: 'gather', target: o.id }, label: 'Đào quặng', detail: `Mỗi chuyến ≈ ${go.hours} giờ: +${go.perTrip} quặng` }] }; }
    if (o.type === 'well') return { title: tname(o), desc: DESC.well, actions: [] };
    if (o.type === 'scholar') { const ss = S.villagers.filter(v => v.prof === 'scholar'); return { title: tname(o), desc: `${DESC.scholar} Học giả: ${ss.map(v => v.name).join(', ') || 'chưa có'}.`, actions: [{ spec: { type: 'study' }, label: 'Làm học giả', detail: 'Người được chọn ngồi nghiên cứu mỗi ngày' }] }; }
    if (o.type === 'school') { const th = S.villagers.filter(v => v.prof === 'teacher'); return { title: tname(o), desc: `${DESC.school} Thầy: ${th.map(v => v.name).join(', ') || 'chưa có'} · trẻ con đang học: ${S.villagers.filter(v => v.task && v.task.kind === 'learn').length}.`, actions: [{ spec: { type: 'teach' }, label: 'Làm thầy dạy nghề', detail: 'Người giỏi nhất nên làm thầy' }] }; }
    if (o.type === 'smelter') return { title: tname(o), desc: `${DESC.smelter} Kho: ${S.res.ore} quặng, ${S.res.bronze} đồng thỏi.`, actions: [{ spec: { type: 'smith' }, label: 'Luyện đồng', detail: 'Người được chọn thành thợ rèn' }] };
    if (o.type === 'barracks') {
      const sol = soldiers(), rd = ready(), str = strengthOf(rd);
      const cap = objs('barracks').reduce((s, x) => s + C.barracksCap[tier(x)], 0);
      const acts = [{ spec: { type: 'drill' }, label: 'Tuyển làm chiến binh', detail: 'Người được chọn vào quân đội, luyện tập mỗi ngày và ra trận khi làng bị tấn công' }];
      if (!g.campaign) for (const [k, tg] of Object.entries(TARGETS)) acts.push({ spec: { type: 'campaign', target: k }, label: `⚔ ${tg.name}`, detail: `${tg.desc} · Sức địch ~${Math.round(tg.diff())} · quân ta ${str} → thắng ~${Math.round(clamp(str / (str + tg.diff()) + 0.05, 0.1, 0.95) * 100)}% · đi 1 ngày`, btn: 'Hành quân' });
      return { title: tname(o), desc: `${DESC.barracks}<br>Quân đội: ${sol.length}/${cap} chiến binh (${rd.length} sẵn sàng) · sức mạnh ${str} · kỷ luật ${g.disc} · ${g.wins} thắng, ${g.losses} thua.${g.campaign ? ` <b>Đang hành quân: ${TARGETS[g.campaign.target].name}, về vào ngày ${g.campaign.back}.</b>` : ''}`, actions: acts };
    }
    return null;
  }
  function panelHTML() {
    return `<div class="jsec"><h4>Hạ tầng & mức sống</h4><div id="civ-infra" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Luật lệ & kỷ luật</h4><div id="civ-law" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Ngành nghề & quân đội</h4><div id="civ-prof" class="sheet-sub"></div></div>
      <div class="jsec"><h4>Luyện chế & vật phẩm</h4><div id="civ-craft" class="sheet-sub"></div></div>`;
  }
  function setHTML(p, id, html) { const el = p.querySelector('#' + id); if (el && el._last !== html) { el.innerHTML = html; el._last = html; } }
  function updatePanel(p) {
    if (!S.civ) return;
    const g = G();
    const bar = (r) => `<span class="civ-bar"><i style="width:${Math.round(Math.min(1, r) * 100)}%;background:${r >= 1 ? '#7bc043' : r >= 0.8 ? '#e0b030' : '#d9534f'}"></i></span>`;
    const ns = needs();
    setHTML(p, 'civ-infra', `<div>Mức sống: <b>${Math.round(livingScore() * 100)}%</b> — đủ hết thì mỗi đêm tinh thần +2, thiếu thì giảm.</div>` + ns.map(x => `<div class="civ-need">${bar(x.ratio)} <b>${x.name}</b> ${Math.round(x.have)}/${Math.round(x.need)}${x.ratio < 1 ? ` <small>— ${x.hint}</small>` : ''}</div>`).join('') +
      `<div>Công trình đã nâng cấp: ${S.objects.filter(o => tier(o) === 2).length} cấp 2, ${S.objects.filter(o => tier(o) === 3).length} cấp 3${S.objects.find(o => o.civup) ? ` · đang nâng cấp ${tname(S.objects.find(o => o.civup))}` : ''}. ${tierLock(2) ? `Cấp 2: ${tierLock(2)}.` : ''} ${tierLock(3) ? `Cấp 3: ${tierLock(3)}.` : ''}</div>`);
    const sl = lawSlots();
    setHTML(p, 'civ-law', `<div>Kỷ luật: <b>${g.disc}</b> (${discName(g.disc)}) → hướng tới ${discTarget()} · làm việc ${g.disc >= 50 ? '+' : ''}${Math.round((g.disc - 50) / 6)}%, quân đội mạnh hơn khi kỷ luật cao.</div><div>Đang ban hành ${g.laws.length}/${sl} luật${S.auto ? ' (khi bật Tự động, làng tự chọn luật cho ô trống mới)' : ''}:</div>` +
      Object.entries(LAWS).map(([k, l]) => `<div class="inv"><div><b>${l.name}</b><small>${l.desc} Kỷ luật +${l.disc}.</small></div><button class="btn sm ${lawOn(k) ? 'go' : ''}" data-civ="law:${k}">${lawOn(k) ? 'Đang áp dụng' : 'Ban hành'}</button></div>`).join(''));
    const w = wantProf(), cnts = (pp) => S.villagers.filter(v => v.prof === pp);
    const masters = S.villagers.filter(v => Object.values(v.skills).some(s => s >= 6));
    setHTML(p, 'civ-prof', Object.entries(PROF).map(([k, n]) => `<div>${n}: <b>${cnts(k).length}</b>/${w[k]} ${cnts(k).length ? `<small>(${cnts(k).map(v => v.name).join(', ')})</small>` : ''}</div>`).join('') +
      `<div>Kỹ năng tối đa hiện nay: ${Math.min(C.skillMax, skillCap())} · bậc thầy (kỹ năng ≥ 6): ${masters.map(v => v.name).join(', ') || 'chưa có'}</div>` +
      `<div>Quân đội: sức mạnh <b>${strengthOf(ready())}</b> · ${g.wins} thắng, ${g.losses} thua${g.vassal ? ` · ${NBN()} đang thần phục, nộp cống mỗi ngày` : ''}${g.campaign ? ` · <b>đang hành quân (${TARGETS[g.campaign.target].name})</b>` : ''}${g.safeUntil > S.day ? ` · làng yên ổn tới ngày ${g.safeUntil}` : ''}</div>`);
    setHTML(p, 'civ-craft', `<div>Kho: ${S.res.ore} quặng · ${S.res.bronze} đồng thỏi · ${cnt('oremine')} mỏ quặng${has('smelting') ? '' : ' (cần phát minh Luyện quặng)'}</div>` +
      Object.entries(ITEMS).map(([k, it]) => `<div class="${has(it.inv) ? '' : 'muted'}">${it.name}: <b>${g.items[k]}</b>${has(it.inv) ? `/${itemTarget(k)}` : ''} <small>— ${it.desc} Nguyên liệu: ${Object.entries(it.cost).map(([r, n]) => `${n} ${{ bronze: 'đồng', wood: 'gỗ', stone: 'đá', furs: 'da', food: 'thức ăn' }[r]}`).join(', ')}${has(it.inv) ? '' : ' (chưa phát minh)'}</small></div>`).join(''));
  }
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest && ev.target.closest('[data-civ]');
    if (!b || !window.S || !S.civ) return;
    ev.stopPropagation(); ev.preventDefault();
    const [k, id] = b.dataset.civ.split(':');
    if (k === 'law' && LAWS[id]) { const r = toggleLaw(id); UI.toast(r.msg, r.ok ? 'ok' : 'err'); const el = document.getElementById('civ-law'); if (el) el._last = ''; if (window.GAME) GAME.save(); }
  }, true);

  // ---------------- HÌNH VẼ ----------------
  const SPR = {};
  try {
    const { mk, rect, px, ell } = ART;
    const roof = (x, x0, x1, y0, h, c1, c2, c3) => { for (let y = 0; y < h; y++) { const off = Math.round((h - y) * ((x1 - x0) / 2) / (h + 2)); for (let i = x0 + off; i < x1 - off; i++) px(x, i, y0 + y, (y % 3 === 0) ? c1 : (i > (x0 + x1) / 2 + 4 ? c3 : c2)); } };
    { // Nhà gỗ 48×52
      const [c, x] = mk(48, 52);
      rect(x, 4, 26, 40, 24, '#8a5a30'); for (let y = 26; y < 50; y += 4) { rect(x, 4, y, 40, 1, '#6b4224'); rect(x, 4, y + 2, 40, 1, '#9a6a3a'); }
      for (const cx of [4, 42]) for (let y = 27; y < 50; y += 4) ell(x, cx + 1, y, 2, 1, '#a07040');
      rect(x, 20, 34, 9, 16, '#3a2414'); rect(x, 20, 34, 9, 1, '#c8a050'); rect(x, 8, 32, 7, 6, '#2a1a10'); rect(x, 33, 32, 7, 6, '#2a1a10'); rect(x, 8, 32, 7, 1, '#f2c94c'); rect(x, 33, 32, 7, 1, '#f2c94c');
      roof(x, 0, 48, 6, 22, '#6b4a2a', '#5a3a1e', '#4a2e16'); for (let i = 2; i < 46; i += 4) px(x, i, 27, '#3a2414');
      rect(x, 34, 2, 4, 10, '#7a7268'); rect(x, 34, 2, 4, 1, '#a49b8e');
      SPR.hut2 = c;
    }
    { // Nhà đá 48×52
      const [c, x] = mk(48, 52);
      rect(x, 3, 26, 42, 24, '#8d8478');
      for (let y = 26; y < 50; y += 5) for (let i = 3 + ((y / 5) % 2) * 4; i < 45; i += 8) { rect(x, i, y, 7, 4, '#a49b8e'); rect(x, i, y, 7, 1, '#bab2a4'); }
      rect(x, 19, 33, 10, 17, '#3a2414'); rect(x, 18, 31, 12, 3, '#6d665c'); rect(x, 7, 32, 7, 7, '#2a1a10'); rect(x, 34, 32, 7, 7, '#2a1a10'); rect(x, 7, 32, 7, 1, '#f2c94c'); rect(x, 34, 32, 7, 1, '#f2c94c');
      roof(x, 0, 48, 4, 24, '#c8a850', '#b09040', '#98782e');
      rect(x, 33, 0, 5, 12, '#6d665c'); rect(x, 33, 0, 5, 1, '#8d8478'); rect(x, 2, 49, 44, 2, '#6d665c');
      SPR.hut3 = c;
    }
    { // Giếng nước 48×44
      const [c, x] = mk(48, 44);
      ell(x, 24, 34, 15, 8, '#6d665c'); ell(x, 24, 33, 13, 6, '#8d8478'); ell(x, 24, 32, 9, 4, '#2a4a6a'); ell(x, 22, 31, 4, 1, '#6fa0d0');
      for (const cx of [9, 37]) { rect(x, cx, 8, 3, 26, '#6b4224'); rect(x, cx, 8, 1, 26, '#875632'); }
      rect(x, 6, 6, 36, 3, '#875632'); rect(x, 23, 9, 1, 14, '#c8b080'); rect(x, 20, 22, 7, 6, '#7a4a24'); rect(x, 20, 22, 7, 1, '#9a6234');
      for (let y = 0; y < 7; y++) rect(x, 4 + y * 2, y, 40 - y * 4, 1, y % 2 ? '#a08a36' : '#b8a04a');
      SPR.well = c;
    }
    { // Nhà hiền triết 72×56
      const [c, x] = mk(72, 56);
      rect(x, 4, 26, 64, 28, '#a07a50'); for (let y = 26; y < 54; y += 4) rect(x, 4, y, 64, 1, '#8a6440');
      rect(x, 30, 34, 12, 20, '#2a1a10'); rect(x, 29, 32, 14, 3, '#c8a050');
      for (const wx of [10, 52]) { rect(x, wx, 32, 10, 8, '#f2e0a0'); rect(x, wx + 4, 32, 2, 8, '#6b4224'); }
      roof(x, 0, 72, 4, 24, '#4f7030', '#3e5a26', '#2e4a1c');
      ell(x, 36, 14, 5, 5, '#f2c94c'); px(x, 36, 14, '#2a1a10'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; px(x, Math.round(36 + Math.cos(a) * 8), Math.round(14 + Math.sin(a) * 7), '#f2c94c'); }
      SPR.scholar = c;
    }
    { // Trường dạy nghề 72×56
      const [c, x] = mk(72, 56);
      rect(x, 4, 28, 64, 26, '#8a5a30'); for (let y = 28; y < 54; y += 4) rect(x, 4, y, 64, 1, '#6b4224');
      for (const cx of [4, 22, 48, 66]) rect(x, cx, 24, 3, 30, '#5a3a1c');
      rect(x, 12, 36, 48, 12, '#3a3a2a'); rect(x, 12, 36, 48, 1, '#6d665c');
      for (let i = 0; i < 5; i++) { rect(x, 16 + i * 9, 40, 4, 6, '#d9a273'); rect(x, 16 + i * 9, 38, 4, 2, '#2a1810'); }
      roof(x, 0, 72, 6, 22, '#b8a04a', '#a08a36', '#8a7428');
      rect(x, 34, 0, 2, 10, '#5a3a1c'); rect(x, 36, 0, 8, 5, '#4fb0e0');
      SPR.school = c;
    }
    { // Doanh trại 96×74
      const [c, x] = mk(96, 74);
      rect(x, 2, 30, 92, 42, '#6b4224'); for (let i = 2; i < 94; i += 5) { rect(x, i, 24, 4, 48, '#875632'); rect(x, i + 1, 22, 2, 3, '#a87a4a'); }
      rect(x, 36, 40, 24, 32, '#2a1a10'); rect(x, 34, 36, 28, 4, '#5a3a1c');
      for (const [sx, col] of [[12, '#c8303a'], [80, '#c8303a']]) { rect(x, sx, 2, 2, 26, '#4a2e18'); rect(x, sx + 2, 2, 10, 7, col); rect(x, sx + 2, 6, 10, 1, '#f2c94c'); }
      for (let i = 0; i < 4; i++) { const sx = 18 + i * 5; for (let k = 0; k < 14; k++) px(x, sx, 44 + k - 14, '#7a4a24'); px(x, sx, 29, '#c0c4c8'); px(x, sx, 28, '#e8ecf0'); }
      ell(x, 76, 56, 6, 6, '#c8a060'); ell(x, 76, 56, 4, 4, '#e05a3a'); ell(x, 76, 56, 2, 2, '#f2f2f2');
      SPR.barracks = c;
    }
    { // Lò luyện 48×56
      const [c, x] = mk(48, 56);
      rect(x, 6, 30, 36, 24, '#7a7268'); for (let y = 30; y < 54; y += 4) for (let i = 6 + ((y / 4) % 2) * 3; i < 42; i += 6) rect(x, i, y, 5, 3, '#8d8478');
      rect(x, 16, 40, 16, 12, '#2a1208'); rect(x, 18, 44, 12, 6, '#e05a1a'); rect(x, 20, 46, 8, 3, '#ffd23a');
      rect(x, 18, 4, 12, 28, '#6d665c'); rect(x, 18, 4, 12, 2, '#8d8478'); rect(x, 20, 0, 8, 5, '#4a4640');
      rect(x, 36, 46, 9, 6, '#b5762a'); rect(x, 37, 45, 7, 2, '#d89a40');
      SPR.smelter = c;
    }
    { // Mỏ quặng 24×24
      const [c, x] = mk(24, 24);
      ell(x, 12, 15, 10, 7, '#6d7178'); ell(x, 11, 13, 8, 6, '#8d9198'); ell(x, 10, 11, 4, 3, '#a7abb1');
      for (const [a, b] of [[7, 13], [13, 11], [15, 15], [9, 16], [12, 14]]) { px(x, a, b, '#4fb06a'); px(x, a + 1, b, '#c87a3a'); }
      SPR.oremine = c;
    }
    { // biểu tượng
      const [c1, x1] = mk(10, 10); ell(x1, 5, 6, 4, 3, '#7a7e86'); px(x1, 3, 5, '#4fb06a'); px(x1, 6, 6, '#c87a3a'); px(x1, 5, 4, '#4fb06a'); ART.ICONS.ore = c1.toDataURL();
      const [c2, x2] = mk(10, 10); rect(x2, 1, 4, 8, 4, '#b5762a'); rect(x2, 2, 3, 6, 1, '#d89a40'); rect(x2, 1, 7, 8, 1, '#8a5a1a'); ART.ICONS.bronze = c2.toDataURL();
    }
  } catch (e) { console.error(e); }
  function drawObj(o, X, Y, lx) {
    const s = SPR[o.type];
    if (o.type === 'oremine') return () => lx.drawImage(s, X, Y + T - 24);
    if (s && ['well', 'scholar', 'school', 'barracks', 'smelter'].includes(o.type)) return () => {
      lx.drawImage(s, X + Math.round((o.w * T - s.width) / 2), Y + o.h * T - s.height + 2);
      if (o.type === 'smelter' && S.villagers.some(v => v.task && v.task.kind === 'smelt' && v.task.target === o.id)) {
        const t = performance.now() / 1000;
        for (let k = 0; k < 4; k++) { const ph = (t * 0.6 + k * 0.25) % 1; lx.globalAlpha = 0.5 * (1 - ph); lx.fillStyle = '#9a9a9a'; lx.fillRect(X + 22 + Math.round(Math.sin(t + k) * 3), Y + o.h * T - s.height - Math.round(ph * 16), 3, 3); }
        lx.globalAlpha = 1;
      }
    };
    return null;
  }
  function hutSprite(o) { return tier(o) === 3 ? SPR.hut3 : tier(o) === 2 ? SPR.hut2 : null; }
  function R(lx, x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(x, y, w, h); }
  function pushDraw(list, lx, L, Tp, time) {
    if (!S.civ) return;
    // đường lát đá
    if (G().paved.length) list.push([-5000, () => {
      for (const [x, y] of G().paved) {
        const X = L(x * T), Y = Tp(y * T);
        if (X < -T || Y < -T || X > lx.canvas.width || Y > lx.canvas.height) continue;
        R(lx, X, Y, T, T, '#9a9284');
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const ox = ((x * 7 + y * 3 + j) % 2) * 3; R(lx, X + i * 8 + ox, Y + j * 8 + 1, 6, 6, '#b0a898'); R(lx, X + i * 8 + ox, Y + j * 8 + 1, 6, 1, '#c8c0b0'); }
      }
    }]);
    // dấu hiệu cấp công trình (trừ lều đã có hình riêng)
    for (const o of S.objects) {
      const t = tier(o);
      if ((t < 2 && !o.civup) || o.type === 'hut' || !tierable(o)) continue;
      const X = L(o.x * T), Y = Tp((o.y + o.h) * T), W = o.w * T;
      list.push([(o.y + o.h) * T + 1, () => {
        if (t === 3) { R(lx, X + 1, Y - 3, W - 2, 3, '#8d8478'); for (let i = X + 2; i < X + W - 2; i += 6) R(lx, i, Y - 3, 4, 1, '#bab2a4'); }
        else if (t === 2) { R(lx, X + 1, Y - 2, W - 2, 2, '#8a5a30'); }
        if (t >= 2) { const px0 = X + W - 4; R(lx, px0, Y - 26, 1, 24, '#4a2e18'); R(lx, px0 + 1, Y - 26, 6, 4, t === 3 ? '#c8303a' : '#4fb0e0'); if (t === 3) R(lx, px0 + 1, Y - 23, 6, 1, '#f2c94c'); }
        if (o.civup) { const w = Math.round((W - 4) * o.civup.progress / o.civup.need); R(lx, X + 2, Y + 1, W - 4, 3, '#2a1a10'); R(lx, X + 2, Y + 1, w, 3, '#f2c94c'); }
      }]);
    }
  }

  return {
    migrate, awayIds, TIERED, tier, tname, bedsOf, sumBeds, foodCap, kitchenBonus, penCap, skillCap, needs, livingScore, roadMult, shift,
    fightMult, armorMult, workMult, reserved, title, bedtimeHour, autoJobs, wantBuild, options, handles, check, assign, planJob, task, planChild,
    jobText, WORK_POSE, tick, overnight, addActions, objActions, panelHTML, updatePanel, drawObj, hutSprite, pushDraw, SPR, DESC, ITEMS, LAWS, TARGETS,
    strengthOf, startCampaign, toggleLaw, spawnOre,
  };
})();
window.CIV = CIV;
if (typeof SIM !== 'undefined' && SIM.GKEY) SIM.GKEY.oremine = 'ore';
