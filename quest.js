// =====================================================================
//  QST — nhiệm vụ của bộ lạc và phần thưởng
// =====================================================================
'use strict';
const QST = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const cnt = (t) => S.objects.filter(o => o.type === t).length;
  const lvl = () => (window.TRB ? TRB.level() : 1);
  // tổng tài nguyên đã mang về kho từ đầu game
  function total(res) {
    let n = 0;
    for (const j of S.journals) n += j[res + 'In'] || 0;
    if (!S.dayEndPending && S.today) n += S.today[res + 'In'] || 0;
    return n;
  }
  const best = (sk, list) => (list || S.villagers.filter(v => !v.child)).filter(v => (v.skills[sk] || 1) < 5).sort((a, b) => b.skills[sk] - a.skills[sk])[0];
  const guards = () => S.villagers.filter(v => v.job && v.job.type === 'guard');

  // r: phần thưởng — wood, stone, food, seeds, spears, morale (cả làng), health (cả làng),
  //    skill: [kỹ năng, 'best' | 'guards'], buff: [hệ số, số ngày], newcomer, bless (ruộng lớn nhanh)
  const Q = [
    { id: 'huts3',     t: 'Dựng 3 lều',                    cur: () => cnt('hut'),               need: 3,   r: { wood: 10, stone: 6 } },
    { id: 'harvest2',  t: 'Thu hoạch ruộng 2 lần',         cur: () => S.stats.fields,           need: 2,   r: { seeds: 6, food: 15 } },
    { id: 'wood60',    t: 'Đốn tổng cộng 60 gỗ',           cur: () => total('wood'),            need: 60,  r: { stone: 15 } },
    { id: 'stone40',   t: 'Khai thác tổng cộng 40 đá',     cur: () => total('stone'),           need: 40,  r: { wood: 20 } },
    { id: 'sickhouse', t: 'Xây Nhà chữa bệnh',             cur: () => cnt('sickhouse'),         need: 1,   r: { health: 15, wood: 6, stone: 4 } },
    { id: 'tribe2',    t: 'Đưa bộ lạc lên cấp 2',          cur: () => lvl(),                    need: 2,   r: { wood: 20, stone: 12, morale: 5 } },
    { id: 'kill1',     t: 'Hạ gục con thú dữ đầu tiên',     cur: () => (S.def ? S.def.kills : 0), need: 1,   r: { spears: 3, morale: 5 } },
    { id: 'spear4',    t: 'Có sẵn 4 giáo đá',              cur: () => S.res.spears || 0,        need: 4,   r: { skill: ['guard', 'best'] } },
    { id: 'pop10',     t: 'Bộ lạc có 10 người',            cur: () => S.villagers.length,       need: 10,  r: { newcomer: 1 } },
    { id: 'baby1',     t: 'Em bé đầu tiên chào đời',       cur: () => (S.pop ? S.pop.births : 0), need: 1,  r: { food: 20, health: 10 } },
    { id: 'food150',   t: 'Dự trữ 150 thức ăn',            cur: () => S.res.food,               need: 150, r: { seeds: 8, bless: 1 } },
    { id: 'tribe3',    t: 'Đưa bộ lạc lên cấp 3',          cur: () => lvl(),                    need: 3,   r: { wood: 30, stone: 20 } },
    { id: 'wood250',   t: 'Đốn tổng cộng 250 gỗ',          cur: () => total('wood'),            need: 250, r: { stone: 40 } },
    { id: 'stone200',  t: 'Khai thác tổng cộng 200 đá',    cur: () => total('stone'),           need: 200, r: { wood: 50 } },
    { id: 'kill5',     t: 'Hạ gục 5 thú dữ',               cur: () => (S.def ? S.def.kills : 0), need: 5,   r: { skill: ['guard', 'guards'], spears: 3 } },
    { id: 'harvest10', t: 'Thu hoạch ruộng 10 lần',        cur: () => S.stats.fields,           need: 10,  r: { skill: ['farm', 'best'], seeds: 10 } },
    { id: 'pop20',     t: 'Bộ lạc có 20 người',            cur: () => S.villagers.length,       need: 20,  r: { buff: [1.1, 3], morale: 5 } },
    { id: 'tribe4',    t: 'Đưa bộ lạc lên cấp 4',          cur: () => lvl(),                    need: 4,   r: { wood: 50, stone: 40 } },
    { id: 'day30',     t: 'Bộ lạc tồn tại 30 ngày',        cur: () => S.day,                    need: 30,  r: { food: 100, morale: 10 } },
    { id: 'pop30',     t: 'Bộ lạc có 30 người',            cur: () => S.villagers.length,       need: 30,  r: { wood: 80, stone: 80 } },
    { id: 'kitchen',   t: 'Xây Nhà bếp',                   cur: () => cnt('kitchen'),           need: 1,   r: { food: 25, morale: 5 } },
    { id: 'goats6',    t: 'Nuôi đàn dê 6 con',             cur: () => (window.VIL ? VIL.animals() : 0), need: 6, r: { food: 30, seeds: 6 } },
    { id: 'temple',    t: 'Hoàn thành Đền tổ tiên',        cur: () => cnt('temple'),            need: 1,   r: { buff: [1.1, 3], morale: 10 } },
    { id: 'stonering', t: 'Dựng Vòng đá thiêng',           cur: () => cnt('stonering'),         need: 1,   r: { seeds: 15, bless: 1, health: 15 } },
    { id: 'greathall', t: 'Hoàn thành Đại sảnh tù trưởng',  cur: () => cnt('greathall'),         need: 1,   r: { buff: [1.2, 5], morale: 20 } },
    { id: 'tribe5',    t: 'Đưa bộ lạc lên cấp 5',          cur: () => lvl(),                    need: 5,   r: { buff: [1.15, 5], morale: 20, health: 20 } },
  ];
  const SKN = () => CFG.SKILL_NAMES;
  function rewardText(r) {
    const p = [];
    if (r.wood) p.push(`+${r.wood} gỗ`);
    if (r.stone) p.push(`+${r.stone} đá`);
    if (r.food) p.push(`+${r.food} thức ăn`);
    if (r.seeds) p.push(`+${r.seeds} hạt giống`);
    if (r.spears) p.push(`+${r.spears} giáo đá`);
    if (r.morale) p.push(`tinh thần +${r.morale} cả làng`);
    if (r.health) p.push(`sức khỏe +${r.health} cả làng`);
    if (r.skill) p.push(r.skill[1] === 'guards' ? `+1 ${SKN()[r.skill[0]]} cho mọi người canh gác` : `+1 ${SKN()[r.skill[0]]} cho người giỏi nhất`);
    if (r.buff) p.push(`Phúc lành tổ tiên: làm việc nhanh hơn ${Math.round((r.buff[0] - 1) * 100)}% trong ${r.buff[1]} ngày`);
    if (r.newcomer) p.push('một người lang thang xin gia nhập');
    if (r.bless) p.push('ruộng đang trồng lớn thêm một bậc');
    return p.join(', ');
  }

  // ---------------- DỮ LIỆU ----------------
  function migrate(s) { if (!s.quests) s.quests = { done: {}, claimed: {}, doneDay: {}, buff: null }; }
  const isDone = (q) => !!S.quests.done[q.id];
  const isClaimed = (q) => !!S.quests.claimed[q.id];
  function check() {
    if (!S.quests) migrate(S);
    for (const q of Q) {
      if (isDone(q)) continue;
      if (q.cur() >= q.need) {
        S.quests.done[q.id] = true; S.quests.doneDay[q.id] = S.day;
        SIM.log(`Hoàn thành nhiệm vụ: ${q.t}! Phần thưởng: ${rewardText(q.r)}.`, 'ev');
        EV.emit('toast', `★ Hoàn thành nhiệm vụ: ${q.t} — bấm Nhận ở ô Mục tiêu`);
      }
    }
  }
  function add(res, n) { S.res[res] = Math.min(SIM.cap(res), (S.res[res] || 0) + n); }
  function claim(id, auto) {
    const q = Q.find(x => x.id === id);
    if (!q || !isDone(q) || isClaimed(q)) return false;
    const r = q.r;
    for (const k of ['wood', 'stone', 'food', 'seeds']) if (r[k]) add(k, r[k]);
    if (r.spears) S.res.spears = Math.min(window.DEF ? DEF.spearCap() : 99, (S.res.spears || 0) + r.spears);
    if (r.morale) S.villagers.forEach(v => v.morale = clamp(v.morale + r.morale, 0, 100));
    if (r.health) S.villagers.forEach(v => v.health = clamp(v.health + r.health, 0, 100));
    let extra = '';
    if (r.skill) {
      const [sk, who] = r.skill;
      const list = who === 'guards' ? guards().filter(v => (v.skills[sk] || 1) < 5) : [best(sk)].filter(Boolean);
      list.forEach(v => v.skills[sk] = Math.min(5, (v.skills[sk] || 1) + 1));
      extra = list.length ? ` (${list.map(v => `${v.name}: ${SKN()[sk]} ${v.skills[sk]}`).join(', ')})` : '';
    }
    if (r.buff) S.quests.buff = { mult: r.buff[0], until: S.day + r.buff[1] };
    if (r.newcomer) {
      if (window.EXP && S.villagers.length < EXP.popLimit()) EXP.newcomer();
      else { add('food', 30); extra = ' (bộ lạc đã đông, thay bằng 30 thức ăn)'; }
    }
    if (r.bless) for (const o of S.objects) if (o.type === 'plot' && (o.state === 'sown' || o.state === 'growing')) { o.growth += 1; if (o.growth >= CFG.FARM.growDays) o.state = 'ready'; EV.emit('plot', o); }
    S.quests.claimed[q.id] = true;
    SIM.event(`${auto ? 'Tự nhận' : 'Nhận'} thưởng nhiệm vụ "${q.t}": ${rewardText(r)}${extra}.`);
    EV.emit('toast', `Nhận thưởng: ${rewardText(r)}`);
    return true;
  }
  function workMult() { const b = S.quests && S.quests.buff; return b && S.day < b.until ? b.mult : 1; }

  let acc = 0;
  function tick(dt) { acc += dt; if (acc < 0.25) return; acc = 0; check(); }
  function overnight() {
    if (!S.quests) migrate(S);
    check();
    // phần thưởng để quá 2 ngày thì tự nhận để không bỏ phí
    for (const q of Q) if (isDone(q) && !isClaimed(q) && S.day - (S.quests.doneDay[q.id] || S.day) >= 2) claim(q.id, true);
    const b = S.quests.buff;
    if (b && S.day >= b.until) { S.quests.buff = null; SIM.log('Phúc lành tổ tiên đã hết.'); }
  }

  // ---------------- GIAO DIỆN ----------------
  function active() {
    const ready = Q.filter(q => isDone(q) && !isClaimed(q));
    const todo = Q.filter(q => !isDone(q));
    return ready.concat(todo).slice(0, 3);
  }
  function rowHTML(q) {
    const cur = Math.min(q.cur(), q.need), done = isDone(q);
    const pct = Math.round(cur / q.need * 100);
    return `<li class="q ${done ? 'ok' : ''}"><div class="q-t"><span class="ck">${done ? '★' : '○'}</span>${q.t}${done ? '' : ` <small>${cur}/${q.need}</small>`}</div>
      ${done ? `<button class="btn sm go q-claim" data-claim="${q.id}">Nhận: ${rewardText(q.r)}</button>` : `<div class="q-bar"><i style="width:${pct}%"></i></div><div class="q-r">Thưởng: ${rewardText(q.r)}</div>`}</li>`;
  }
  function goalsHTML() {
    if (!S.quests) migrate(S);
    const n = Q.filter(isClaimed).length, ready = Q.filter(q => isDone(q) && !isClaimed(q)).length;
    const b = S.quests.buff && S.day < S.quests.buff.until ? `<li class="ok">✦ Phúc lành tổ tiên: +${Math.round((S.quests.buff.mult - 1) * 100)}% tốc độ làm việc đến hết ngày ${S.quests.buff.until - 1}</li>` : '';
    const list = active();
    return `<div class="g-head q-head">Nhiệm vụ ${n}/${Q.length}${ready ? ` · <span class="q-new">${ready} chờ nhận thưởng</span>` : ''}</div><ul>${b}${list.length ? list.map(rowHTML).join('') : '<li class="ok">Đã hoàn thành mọi nhiệm vụ!</li>'}</ul>`;
  }
  function panelHTML() { return `<div class="jsec"><h4>Nhiệm vụ & phần thưởng</h4><div id="qst-panel" class="sheet-sub"></div></div>`; }
  function updatePanel(p) {
    const el = p.querySelector('#qst-panel'); if (!el) return;
    const html = Q.map(q => {
      const st = isClaimed(q) ? '✓' : isDone(q) ? '★' : '○';
      const cls = isClaimed(q) ? '' : isDone(q) ? 'q-ready' : 'warn';
      return `<div class="${cls}">${st} ${q.t} <small>(${Math.min(q.cur(), q.need)}/${q.need})</small> — ${rewardText(q.r)}${isDone(q) && !isClaimed(q) ? ` <button class="btn sm go" data-claim="${q.id}">Nhận</button>` : ''}</div>`;
    }).join('');
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }

  return { migrate, check, claim, tick, overnight, workMult, goalsHTML, panelHTML, updatePanel, Q, rewardText };
})();
window.QST = QST;
