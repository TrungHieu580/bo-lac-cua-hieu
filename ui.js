// =====================================================================
//  UI — thanh trên/dưới, bảng dân làng, xây dựng, nhật ký, bảng hành động
// =====================================================================
'use strict';
const UI = (() => {
  const T = CFG.TILE;
  const state = { selected: new Set(), target: null, ghost: null, moveTile: null, buildMode: false, paused: true, sheet: null, popup: null, modal: false };
  const $ = (s) => document.querySelector(s);
  const ic = (k, c) => ART.icon(k, c);
  const fmtH = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10; return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const hrs = (h) => (h < 1 ? `${Math.round(h * 60)} phút` : `${(Math.round(h * 10) / 10).toString().replace('.', ',')} giờ`);
  const portraits = {};
  const pv = (v) => portraits[v.id] || (portraits[v.id] = ART.portrait(v));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------------- THÔNG BÁO ----------------
  function toast(msg, kind) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200);
  }

  // ---------------- THANH TRÊN ----------------
  function buildTop() {
    $('#top').innerHTML = `
      <div class="tb-time"><b id="t-day">Ngày 1</b><span id="t-clock">06:00</span><span id="t-weather"></span><span class="fc" title="Dự báo ngày mai">Mai <span id="t-fc"></span></span>${window.TRB ? TRB.topHTML() : ''}</div>
      <div class="tb-res">
        <span class="res" title="Dân số">${ic('people')}<b id="r-pop">6</b></span>
        <span class="res" title="Thức ăn (số ngày còn đủ)">${ic('food')}<b id="r-food">0</b><small id="r-days"></small></span>
        <span class="res" title="Gỗ">${ic('wood')}<b id="r-wood">0</b></span>
        <span class="res" title="Đá">${ic('stone')}<b id="r-stone">0</b></span>
        <span class="res" title="Hạt giống">${ic('seeds')}<b id="r-seeds">0</b></span>
        <span class="res" title="Giáo đá — dụng cụ săn bắn và đánh thú dữ">${ic('spear')}<b id="r-spear">0</b></span>
      </div>`;
  }
  function updateTop() {
    $('#t-day').textContent = `Ngày ${S.day}`;
    $('#t-clock').textContent = fmtH(S.hour);
    $('#t-weather').innerHTML = ic(S.weather === 'rain' ? 'rain' : 'sun') + `<span class="wl">${S.weather === 'rain' ? 'Mưa' : 'Nắng'}</span>`;
    $('#t-fc').innerHTML = ic(S.forecast === 'rain' ? 'rain' : 'sun');
    $('#r-pop').textContent = EXP.popText();
    $('#r-pop').parentNode.title = 'Dân số / chỗ ngủ';
    $('#r-food').textContent = S.res.food;
    const d = SIM.foodDays();
    const de = $('#r-days');
    de.textContent = `(${(Math.floor(d * 10) / 10).toString().replace('.', ',')} ngày)`;
    de.className = d < 1 ? 'warn' : '';
    $('#r-wood').textContent = S.res.wood;
    $('#r-stone').textContent = S.res.stone;
    $('#r-seeds').textContent = S.res.seeds;
    if (window.TRB) TRB.updateTop();
    const rs = $('#r-spear'); if (rs) { rs.textContent = S.res.spears || 0; rs.parentNode.classList.toggle('alarm', !!(S.beasts && S.beasts.some(b => b.state !== 'flee'))); }
    const pb = $('#b-pause');
    pb.innerHTML = state.paused ? `<span class="bi">▶</span><span>Tiếp tục</span>` : `<span class="bi">❚❚</span><span>Tạm dừng</span>`;
    $('#b-speed').innerHTML = `<span class="bi">»</span><span>x${S.speed}</span>`;
  }

  // ---------------- MỤC TIÊU ----------------
  function updateGoals() {
    const g = SIM.evalGoals();
    const el = $('#goals');
    const row = (ok, txt) => `<li class="${ok ? 'ok' : ''}"><span class="ck">${ok ? '✓' : '○'}</span>${txt}</li>`;
    const head = S.goalReached ? `Mục tiêu đã đạt (ngày ${S.goalDay}) — chơi tiếp tự do` : `Mục tiêu · trước hết ngày ${CFG.GOAL.day}`;
    const html = `<div class="g-head">${head}<span class="g-tog">${el.classList.contains('min') ? '▸' : '▾'}</span></div><ul>
      ${row(g.huts >= g.hutsNeed, `Dựng lều: ${g.huts}/${g.hutsNeed}`)}
      ${row(g.fields >= g.fieldsNeed, `Thu hoạch ruộng: ${g.fields}/${g.fieldsNeed}`)}
      ${row(g.food >= g.foodNeed, `Dự trữ 2 ngày ăn: ${g.food}/${g.foodNeed}`)}
      ${row(g.healthy >= g.healthyNeed, `Thành viên khỏe: ${g.healthy}/${g.healthyNeed}`)}
    </ul>`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }

  // ---------------- THANH CHỌN ----------------
  function updateSelbar() {
    const el = $('#selbar');
    const vs = S.villagers.filter(v => state.selected.has(v.id));
    if (!vs.length || state.sheet || state.popup) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    let html;
    if (vs.length === 1) {
      const v = vs[0];
      const p = SIM.taskProgress(v);
      html = `<img class="pt" src="${pv(v)}"><div class="sb-main"><div><b class="name-link" data-id="${v.id}">${v.name}</b> <small>${window.TRB ? TRB.title(v) : CFG.SKILL_NAMES[v.main]}</small></div>
        <div class="sb-job">${esc(SIM.jobText(v))}${p !== null ? ` · ${Math.round(p * 100)}%` : ''}</div>
        <div class="sb-bars">${ic('bolt')}${mini(v.energy, '#f2c94c')}${ic('heart')}${mini(v.health, '#e0505a')}${ic('smile')}${mini(v.morale, '#7cc0f0')}</div></div>`;
    } else {
      html = `<div class="sb-main"><div><b>${vs.length} người được chọn</b></div><div class="sb-job">${vs.map(v => `<span class="name-link" data-id="${v.id}">${v.name}</span>`).join(', ')}</div><div class="sb-hint">Chạm vào mục tiêu trên bản đồ để giao việc nhóm</div></div>`;
    }
    html += `<button class="btn sm" id="sb-clear">Bỏ chọn</button>`;
    if (el._last !== html) { el.innerHTML = html; el._last = html; }
  }
  function mini(val, col) { return `<span class="mbar"><i style="width:${Math.round(val)}%;background:${col}"></i></span>`; }

  function focusVillager(id) {
    const v = S.villagers.find(x => x.id === id);
    if (!v) return;
    const sheetOpen = state.sheet || state.popup;
    const mobile = window.innerWidth < 900;
    const shift = sheetOpen && mobile ? document.querySelector('#view').clientHeight * 0.22 * RENDER.dpr / RENDER.cam.zoom : 0;
    RENDER.centerOn(v.x, v.y + shift);
  }

  // ---------------- BẢNG (SHEET) ----------------
  function openSheet(kind) {
    closePopup();
    if (state.sheet === kind) { closeSheet(); return; }
    state.sheet = kind;
    state.buildMode = false; state.ghost = null; $('#buildhint').classList.add('hidden');
    renderSheet(true);
    $('#panel').classList.remove('hidden');
    document.querySelectorAll('#bottom .nb').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
  }
  function closeSheet() {
    state.sheet = null;
    $('#panel').classList.add('hidden');
    document.querySelectorAll('#bottom .nb').forEach(b => b.classList.remove('on'));
  }
  function renderSheet(full) {
    const p = $('#panel');
    if (state.sheet === 'villagers') {
      if (full || !p.querySelector('.vlist')) p.innerHTML = villagerPanelHTML();
      updateVillagerPanel();
    } else if (state.sheet === 'build') {
      p.innerHTML = EXP.buildPanelHTML();
    } else if (state.sheet === 'journal') {
      if (full) p.innerHTML = journalHTML();
    } else if (state.sheet === 'auto') {
      if (full || !p.querySelector('#ex-plan')) p.innerHTML = EXP.autoPanelHTML();
      EXP.updateAutoPanel(p);
    }
  }

  function villagerPanelHTML() {
    const rows = S.villagers.map(v => `
      <div class="vrow" data-id="${v.id}">
        <label class="vchk"><input type="checkbox" data-id="${v.id}"><span></span></label>
        <img class="pt" src="${pv(v)}">
        <div class="vinfo">
          <div class="vname"><b class="name-link" data-id="${v.id}" title="Di chuyển camera tới ${v.name}">${v.name}</b> <span class="skill">${window.TRB ? TRB.title(v) : CFG.SKILL_NAMES[v.main]}</span> <span class="bond"></span></div>
          <div class="vjob"></div>
          <div class="vreason"></div>
          <div class="vbars"><span title="Năng lượng">${ic('bolt')}<span class="mbar e"><i></i></span><em class="ev"></em></span><span title="Sức khỏe">${ic('heart')}<span class="mbar h"><i></i></span><em class="hv"></em></span><span title="Tinh thần">${ic('smile')}<span class="mbar m"><i></i></span><em class="mv"></em></span></div>
        </div>
      </div>`).join('');
    return `<div class="sheet-head"><h3>${ic('people')} Dân làng</h3><button class="x" data-close>✕</button></div>
      <div class="sheet-sub">Đánh dấu nhiều người để giao việc nhóm, rồi chạm vào mục tiêu trên bản đồ. Bấm tên để tới chỗ nhân vật.</div>
      <div class="vlist">${rows}</div>
      <div class="sheet-foot">
        <button class="btn sm" data-act="all">Chọn tất cả</button>
        <button class="btn sm" data-act="none">Bỏ chọn</button>
        <button class="btn sm" data-act="rest">Cho nghỉ</button>
        <button class="btn sm" data-act="cancel">Hủy việc</button>
        <button class="btn sm go" data-close>Xong · chọn mục tiêu</button>
      </div>`;
  }
  function updateVillagerPanel() {
    const p = $('#panel');
    if (p.querySelectorAll('.vrow').length !== S.villagers.length) p.innerHTML = villagerPanelHTML();
    for (const v of S.villagers) {
      const row = p.querySelector(`.vrow[data-id="${v.id}"]`);
      if (!row) continue;
      row.classList.toggle('sel', state.selected.has(v.id));
      row.querySelector('input').checked = state.selected.has(v.id);
      const co = SIM.coworkers(v);
      const prog = SIM.taskProgress(v);
      row.querySelector('.vjob').textContent = SIM.jobText(v) + (prog !== null ? ` · ${Math.round(prog * 100)}%` : '') + (co.length ? ` · cùng: ${co.map(c => c.name).join(', ')}` : '');
      const reason = v.resting ? `Lý do nghỉ: ${v.restReason}` : (v.note ? v.note : '');
      const re = row.querySelector('.vreason');
      re.textContent = reason; re.className = 'vreason' + (v.resting ? ' warn' : '');
      const close = S.villagers.filter(o => o !== v && (v.bonds[o.id] || 0) >= CFG.BOND.closeAt).map(o => o.name);
      row.querySelector('.bond').textContent = EXP.familyText(v, close);
      row.querySelector('.mbar.e i').style.cssText = `width:${v.energy}%;background:${v.energy < 25 ? '#e0703a' : '#f2c94c'}`;
      row.querySelector('.mbar.h i').style.cssText = `width:${v.health}%;background:#e0505a`;
      row.querySelector('.mbar.m i').style.cssText = `width:${v.morale}%;background:#7cc0f0`;
      row.querySelector('.ev').textContent = Math.round(v.energy);
      row.querySelector('.hv').textContent = Math.round(v.health);
      row.querySelector('.mv').textContent = Math.round(v.morale);
    }
  }

  function buildPanelHTML() {
    const h = CFG.HUT, u = CFG.STORAGE_UPGRADE, st = WORLD.storage();
    const hutMsg = S.res.wood < h.wood ? `Cần thêm ${h.wood - S.res.wood} gỗ để dựng lều` : S.res.stone < h.stone ? `Cần thêm ${h.stone - S.res.stone} đá để dựng lều` : '';
    const upMsg = st.level >= 1 ? 'Kho đã ở cấp cao nhất' : st.upgrading ? 'Đang nâng cấp — chọn kho để giao thêm người' : S.res.wood < u.wood ? `Cần thêm ${u.wood - S.res.wood} gỗ` : S.res.stone < u.stone ? `Cần thêm ${u.stone - S.res.stone} đá` : '';
    return `<div class="sheet-head"><h3>${ic('hut')} Xây dựng</h3><button class="x" data-close>✕</button></div>
      <div class="sheet-sub">Vật liệu được trừ một lần khi xác nhận công trình. Lều đã có: <b>${SIM.hutCount()}</b>.</div>
      <div class="act">
        <div class="act-main"><b>${ic('hut')} Lều cỏ</b><small>Chi phí: ${h.wood} gỗ, ${h.stone} đá · ${h.hours} giờ công · chỗ ngủ cho ${h.sleepers} người, giúp hồi phục tốt hơn. Đặt gần bếp lửa.</small>${hutMsg ? `<div class="act-msg err">${hutMsg}</div>` : ''}</div>
        <button class="btn go" data-act="place" ${hutMsg ? 'disabled' : ''}>Chọn vị trí</button>
      </div>
      <div class="act">
        <div class="act-main"><b>Nâng cấp kho</b><small>Chi phí: ${u.wood} gỗ, ${u.stone} đá · ${u.hours} giờ công · sức chứa ${CFG.STORAGE_CAP[0]} → ${CFG.STORAGE_CAP[1]} mỗi loại. Hiện tại: ${SIM.cap('food')}.</small>${upMsg ? `<div class="act-msg ${st.upgrading ? '' : 'err'}">${upMsg}</div>` : ''}</div>
        <button class="btn go" data-act="upgrade" ${st.level >= 1 ? 'disabled' : ''}>Chọn kho</button>
      </div>`;
  }

  function journalHTML() {
    const days = S.journals.slice().reverse().map(j => `<div class="jday"><h4>Ngày ${j.day}</h4>${journalBody(j, true)}</div>`).join('');
    const today = S.log.filter(l => l.d === S.day).slice().reverse().map(l => `<li><span class="jt">${fmtH(l.h)}</span>${esc(l.t)}</li>`).join('');
    return `<div class="sheet-head"><h3>Nhật ký bộ lạc</h3><button class="x" data-close>✕</button></div>
      <div class="jsec"><h4>Hôm nay — ngày ${S.day}</h4><ul class="jlog">${today || '<li>Chưa có sự kiện.</li>'}</ul></div>
      ${days ? `<div class="jsec"><h4>Các ngày trước</h4>${days}</div>` : ''}`;
  }
  function journalBody(j, compact) {
    const items = [];
    items.push(`${ic('food')} Thu được <b>${j.foodIn}</b> thức ăn · ăn ${j.eaten} khẩu phần · còn <b>${j.food}</b>`);
    if (j.woodIn || j.stoneIn || j.seedsIn) items.push(`${ic('wood')} +${j.woodIn} gỗ · ${ic('stone')} +${j.stoneIn} đá · ${ic('seeds')} +${j.seedsIn} hạt giống`);
    items.push(j.missing.length ? `<span class="warn">Thiếu khẩu phần: ${j.missing.join(', ')}</span>` : 'Mọi người đều được ăn no.');
    if (j.built.length) items.push(`${ic('hut')} Hoàn thành: ${j.built.join(', ')}`);
    if (j.harvests) items.push(`${ic('field')} Thu hoạch ${j.harvests} ruộng`);
    j.hunts.forEach(h => items.push(esc(h)));
    if (!compact) j.events.forEach(e => items.push(esc(e)));
    else if (j.events.length) items.push(`<span class="muted">${j.events.map(esc).join(' ')}</span>`);
    return `<ul class="jlist">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  }

  // ---------------- BẢNG HÀNH ĐỘNG ----------------
  function selectedVs() { return S.villagers.filter(v => state.selected.has(v.id)); }

  function actionsFor(p) {
    const out = { title: '', desc: '', actions: [] };
    const n = Math.max(1, state.selected.size);
    if (p.kind === 'place') return EXP.placeActions(p, n);
    if (p.kind === 'hut') {
      out.title = 'Dựng lều tại đây';
      out.desc = `Chi phí: ${CFG.HUT.wood} gỗ, ${CFG.HUT.stone} đá (trừ ngay khi xác nhận) · ${CFG.HUT.hours} giờ công.`;
      out.actions.push({ spec: { type: 'buildHut', x: p.x, y: p.y }, label: 'Xây lều', detail: `≈ ${hrs(CFG.HUT.hours / n)} với ${n} người · khuyên dùng người giỏi Xây dựng` });
      return out;
    }
    if (p.kind === 'tile') {
      const t = WORLD.ter(p.tx, p.ty);
      const tn = { grass: 'Bãi cỏ', forest: 'Nền rừng', dirt: 'Đường đất', sand: 'Bờ cát', rock: 'Nền đá', meadow: 'Đồng cỏ', farm: 'Ruộng' }[t] || 'Mặt đất';
      out.title = tn;
      out.desc = `Ô (${p.tx}, ${p.ty})`;
      if (p.hut && SIM.validHutSpot(p.hut[0], p.hut[1]).ok) out.actions.push({ spec: { type: 'buildHut', x: p.hut[0], y: p.hut[1] }, label: 'Xây lều', detail: `Chi phí ${CFG.HUT.wood} gỗ, ${CFG.HUT.stone} đá · ${CFG.HUT.hours} giờ công (≈ ${hrs(CFG.HUT.hours / n)} với ${n} người)` });
      EXP.tileActions(p, out, n);
      out.actions.push({ spec: { type: 'move', x: p.tx, y: p.ty }, label: 'Đi tới đây', detail: 'Di chuyển tới ô này rồi chờ lệnh.' });
      return out;
    }
    const o = WORLD.byId(p.id);
    if (!o) return out;
    const ex = EXP.objActions(o, n);
    if (ex) return ex;
    const G = CFG.GATHER;
    switch (o.type) {
      case 'bush': {
        const g = G.berry;
        out.title = 'Bụi quả';
        out.desc = o.stock > 0 ? `Còn ${o.stock} phần quả · ${o.seeds} hạt giống` : `Đã hết quả — mọc lại sau ${o.regrow} ngày`;
        out.actions.push({ spec: { type: 'gather', target: o.id }, label: 'Hái quả', detail: `Mỗi chuyến ≈ ${hrs(g.hours)}: +${g.perTrip} thức ăn${o.seeds > 0 ? ' +1 hạt giống' : ''} · 1 người trở lên · không tốn chi phí` });
        break;
      }
      case 'tree': {
        const g = G.wood;
        out.title = 'Cây'; out.desc = `Còn ${o.stock} gỗ`;
        out.actions.push({ spec: { type: 'gather', target: o.id }, label: 'Đốn gỗ', detail: `Mỗi chuyến ≈ ${hrs(g.hours)}: +${g.perTrip} gỗ · 1 người trở lên · dùng kỹ năng Xây dựng` });
        break;
      }
      case 'boulder': {
        const g = G.stone;
        out.title = 'Tảng đá'; out.desc = `Còn ${o.stock} đá`;
        out.actions.push({ spec: { type: 'gather', target: o.id }, label: 'Nhặt đá', detail: `Mỗi chuyến ≈ ${hrs(g.hours)}: +${g.perTrip} đá · 1 người trở lên · dùng kỹ năng Xây dựng` });
        break;
      }
      case 'plot': {
        const F = CFG.FARM;
        const states = { wild: 'Đất hoang', cleared: o.seeded ? 'Đã dọn · đã có hạt chờ gieo' : 'Đã dọn', sown: 'Đã gieo', growing: 'Đang lớn', ready: 'Sẵn sàng thu hoạch' };
        out.title = 'Ruộng 2×2';
        out.desc = `Trạng thái: ${states[o.state]}` + ((o.state === 'sown' || o.state === 'growing') ? ` · sinh trưởng ${String(Math.round(o.growth * 10) / 10).replace('.', ',')}/${F.growDays} (mưa giúp lớn nhanh)` : '') + (o.progress > 0 ? ` · tiến độ ${Math.round(o.progress / (o.state === 'wild' ? F.clearHours : o.state === 'ready' ? F.harvestHours : F.sowHours) * 100)}%` : '');
        if (o.yieldLeft > 0) out.actions.push({ spec: { type: 'harvest', target: o.id }, label: 'Mang lương thực về', detail: `Còn ${o.yieldLeft} phần ở ruộng · mỗi người mang ${F.carry}/chuyến` });
        if (o.state === 'wild') out.actions.push({ spec: { type: 'clear', target: o.id }, label: 'Dọn đất', detail: `${F.clearHours} giờ công (≈ ${hrs(F.clearHours / n)} với ${n} người) · không tốn chi phí` });
        if (o.state === 'cleared' && o.yieldLeft <= 0) out.actions.push({ spec: { type: 'sow', target: o.id }, label: 'Gieo hạt', detail: `${o.seeded ? 'Hạt đã trả trước' : `Chi phí: ${F.seedCost} hạt giống (có ${S.res.seeds})`} · ${F.sowHours} giờ công · chín sau ~${F.growDays} đêm` });
        if (o.state === 'ready') out.actions.push({ spec: { type: 'harvest', target: o.id }, label: 'Thu hoạch', detail: `${F.harvestHours} giờ công (≈ ${hrs(F.harvestHours / n)} với ${n} người) · thu ${F.yield} thức ăn` });
        break;
      }
      case 'site': {
        out.title = 'Lều đang dựng';
        out.desc = `Tiến độ ${Math.round(o.progress / o.need * 100)}% · còn ${hrs(Math.max(0, o.need - o.progress))} công. Vật liệu đã trả.`;
        out.actions.push({ spec: { type: 'build', target: o.id }, label: 'Tiếp tục dựng', detail: `≈ ${hrs((o.need - o.progress) / n)} với ${n} người` });
        break;
      }
      case 'rack': case 'granary': case 'longhouse': {
        out.title = EXP.bname(o.type); out.desc = EXP.bdesc(o.type);
        break;
      }
      case 'hut': {
        out.title = 'Lều cỏ'; out.desc = `Chỗ ngủ cho ${CFG.HUT.sleepers} người. Ngủ trong lều hồi ${CFG.ENERGY.sleepHut} năng lượng (ngoài trời ${CFG.ENERGY.sleepOutside}).`;
        break;
      }
      case 'storage': {
        const u = CFG.STORAGE_UPGRADE;
        out.title = o.level ? 'Kho chung (đã nâng cấp)' : 'Kho chung';
        out.desc = `Sức chứa ${SIM.cap('food')} mỗi loại · Thức ăn ${S.res.food}, gỗ ${S.res.wood}, đá ${S.res.stone}, hạt ${S.res.seeds}.`;
        if (o.level < 1) out.actions.push({ spec: { type: 'upgrade' }, label: o.upgrading ? 'Tiếp tục nâng cấp' : 'Nâng cấp kho', detail: o.upgrading ? `Tiến độ ${Math.round(o.upgrading.progress / o.upgrading.need * 100)}%` : `Chi phí: ${u.wood} gỗ, ${u.stone} đá · ${u.hours} giờ công · sức chứa → ${CFG.STORAGE_CAP[1]}` });
        break;
      }
      case 'fire': {
        out.title = 'Bếp lửa trung tâm';
        out.desc = `Mỗi tối ${fmtH(CFG.MEAL)} cả bộ lạc ăn ở đây (${S.villagers.length} khẩu phần/tối).`;
        out.actions.push({ spec: { type: 'rest' }, label: 'Nghỉ bên lửa', detail: `Hồi ${CFG.ENERGY.restRegen} năng lượng/giờ, nghỉ tới khi gần đầy.` });
        if (window.DEF) DEF.fireActions(out, n);
        if (window.TRB) TRB.fireActions(out, n);
        break;
      }
      case 'huntzone': {
        out.title = 'Bãi săn — đồng cỏ';
        out.desc = `Thú còn trong khu vực: ${o.animals}/${CFG.HUNT.animalsMax} (hồi ${CFG.HUNT.animalsRegen}/ngày).`;
        out.actions.push({ spec: { type: 'hunt', target: o.id }, label: 'Cử nhóm săn', detail: `Ít nhất ${CFG.HUNT.minMembers} người · săn ${hrs(CFG.HUNT.hours)} tại bãi + đường đi · thịt chỉ vào kho khi mang về${S.res.spears ? ` · mang theo giáo đá (có ${S.res.spears}): dễ thành công, nhiều thịt, ít bị thương hơn` : ' · chưa có giáo đá — chế giáo ở bếp lửa để săn tốt hơn'}`, hunt: true });
        break;
      }
    }
    return out;
  }

  function openPopup(p) {
    closeSheet();
    state.popup = p;
    state.target = p.kind === 'obj' ? p.id : null;
    state.ghost = EXP.ghostFor(p);
    state.moveTile = p.kind === 'tile' ? [p.tx, p.ty] : null;
    renderPopup();
    $('#popup').classList.remove('hidden');
  }
  function closePopup() {
    state.popup = null; state.target = null; state.moveTile = null;
    if (!state.buildMode) state.ghost = null;
    $('#popup').classList.add('hidden');
  }
  function renderPopup() {
    const p = state.popup; if (!p) return;
    const info = actionsFor(p);
    const vs = selectedVs();
    const chips = S.villagers.map(v => `<button class="chip ${state.selected.has(v.id) ? 'on' : ''}" data-id="${v.id}"><img src="${pv(v)}"><span>${v.name}</span><small>${window.TRB ? TRB.title(v) : CFG.SKILL_NAMES[v.main]}</small></button>`).join('');
    const acts = info.actions.map((a, i) => {
      const c = SIM.check(a.spec, vs);
      let extra = '';
      if (a.hunt) {
        const e = SIM.huntEstimate(vs, WORLD.byId(a.spec.target));
        extra = vs.length ? `<div class="est">Với ${vs.length} người: thành công ~<b>${Math.round(e.chance * 100)}%</b> · sản lượng dự kiến <b>${e.min}–${e.max}</b> thịt · rủi ro: <b class="risk-${e.risk}">${e.risk}</b>${S.weather === 'rain' ? ' (mưa làm giảm cơ hội)' : ''}</div>` : `<div class="est">Chọn người để xem tỷ lệ thành công, sản lượng và rủi ro.</div>`;
      }
      return `<div class="act"><div class="act-main"><b>${a.label}</b><small>${a.detail}</small>${extra}${c.ok ? '' : `<div class="act-msg err">${esc(c.msg)}</div>`}</div>
        <button class="btn go" data-i="${i}" ${c.ok ? '' : 'disabled'}>${state.selected.size ? 'Giao việc' : 'Chọn người'}</button></div>`;
    }).join('');
    $('#popup').innerHTML = `<div class="sheet-head"><h3>${esc(info.title)}</h3><button class="x" data-close>✕</button></div>
      <div class="sheet-sub">${info.desc}</div>
      ${info.actions.length ? `<div class="chips-label">Giao cho (${vs.length} người):</div><div class="chips">${chips}</div>` : ''}
      <div class="acts">${acts || '<div class="muted">Không có hành động nào ở đây.</div>'}</div>`;
    $('#popup')._info = info;
  }

  function doAction(i) {
    const info = $('#popup')._info;
    const a = info && info.actions[i];
    if (!a) return;
    const vs = selectedVs();
    const r = SIM.assign(a.spec, vs);
    if (!r.ok) { toast(r.msg, 'err'); renderPopup(); return; }
    let msg = vs.length ? `Đã giao "${a.label}" cho ${vs.map(v => v.name).join(', ')}` : `Đã thực hiện: ${a.label}`;
    if (r.later) msg += ' — sẽ bắt đầu từ sáng mai';
    toast(msg, 'ok');
    if (a.spec.type === 'buildHut' || a.spec.type === 'buildAt') { state.buildMode = false; $('#buildhint').classList.add('hidden'); }
    state.ghost = null;
    closePopup();
    GAME.save();
  }

  // ---------------- XỬ LÝ CHẠM / NHẤP TRÊN BẢN ĐỒ ----------------
  function hutSpotAt(wx, wy) { return [Math.round(wx / T - 1), Math.round(wy / T - 1)]; }

  function tapMap(cssX, cssY, additive) {
    const [wx, wy] = RENDER.screenToWorld(cssX, cssY);
    if (state.buildMode) {
      const b = CFG.BUILDINGS[state.buildKind] || CFG.BUILDINGS.hut;
      const sn = EXP.snapBuild(state.buildKind || 'hut', wx, wy);
      const x = sn ? sn[0] : Math.round(wx / T - b.w / 2), y = sn ? sn[1] : Math.round(wy / T - b.h / 2);
      const v = SIM.validHutSpot(x, y, b.w, b.h);
      if (!v.ok) { state.ghost = { x, y, ok: false, kind: state.buildKind, w: b.w, h: b.h }; toast(v.msg, 'err'); return; }
      openPopup({ kind: 'place', b: state.buildKind || 'hut', x, y });
      return;
    }
    const tol = Math.max(2, 8 * RENDER.dpr / RENDER.cam.zoom);
    const v = RENDER.pickVillager(wx, wy, tol);
    if (v) {
      if (additive) { state.selected.has(v.id) ? state.selected.delete(v.id) : state.selected.add(v.id); }
      else { state.selected = new Set([v.id]); }
      if (state.popup) renderPopup();
      refresh();
      return;
    }
    const o = RENDER.pickObject(wx, wy);
    if (o) { openPopup({ kind: 'obj', id: o.id }); return; }
    if (state.popup) { closePopup(); return; }
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (!WORLD.inb(tx, ty)) return;
    const hut = EXP.snapBuild('hut', wx, wy) || hutSpotAt(wx, wy);
    const hutOk = SIM.validHutSpot(hut[0], hut[1]).ok;
    if (state.selected.size || hutOk || EXP.plotSpotAt(wx, wy)) {
      if (!WORLD.walkable(tx, ty) && !hutOk) { toast('Không thể đi tới đây', 'err'); return; }
      openPopup({ kind: 'tile', tx, ty, hut: hutOk ? hut : null });
    }
  }
  function hoverMap(cssX, cssY) {
    if (!state.buildMode || state.popup) return;
    const [wx, wy] = RENDER.screenToWorld(cssX, cssY);
    const b = CFG.BUILDINGS[state.buildKind] || CFG.BUILDINGS.hut;
    const sn = EXP.snapBuild(state.buildKind || 'hut', wx, wy);
    const x = sn ? sn[0] : Math.round(wx / T - b.w / 2), y = sn ? sn[1] : Math.round(wy / T - b.h / 2);
    state.ghost = { x, y, ok: SIM.validHutSpot(x, y, b.w, b.h).ok, kind: state.buildKind, w: b.w, h: b.h };
  }

  function startBuildMode(kind) {
    kind = typeof kind === 'string' && CFG.BUILDINGS[kind] ? kind : 'hut';
    closeSheet(); closePopup();
    const h = CFG.BUILDINGS[kind];
    if (S.res.wood < h.wood) { toast(`Cần thêm ${h.wood - S.res.wood} gỗ để xây ${h.name}`, 'err'); return; }
    if (S.res.stone < h.stone) { toast(`Cần thêm ${h.stone - S.res.stone} đá để xây ${h.name}`, 'err'); return; }
    state.buildKind = kind;
    state.buildMode = true;
    $('#buildhint').classList.remove('hidden');
    const f = WORLD.fire();
    RENDER.centerOn((f.x + 0.5) * T, (f.y + 0.5) * T);
  }
  function cancelBuildMode() { state.buildMode = false; state.ghost = null; $('#buildhint').classList.add('hidden'); closePopup(); }

  // ---------------- MODAL ----------------
  function modal(html, onBind) {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox">${html}</div>`;
    m.classList.remove('hidden');
    state.modal = true;
    if (onBind) onBind(m);
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; state.modal = false; }

  function showDayEnd(j) {
    const g = j.goals;
    const row = (ok, t) => `<li class="${ok ? 'ok' : ''}"><span class="ck">${ok ? '✓' : '○'}</span>${t}</li>`;
    let banner = '';
    if (j.newlyReached) banner = `<div class="banner win">Bộ lạc đã hoàn thành mục tiêu vào ngày ${j.day}! Bạn có thể tiếp tục phát triển ngôi làng.</div>`;
    else if (j.failed) banner = `<div class="banner lose">Hết ngày ${CFG.GOAL.day} nhưng chưa đạt đủ mục tiêu. Bạn vẫn có thể chơi tiếp để hoàn thành.</div>`;
    modal(`<h2>Nhật ký cuối ngày ${j.day}</h2>${banner}
      ${journalBody(j, false)}
      <div class="fcast">Dự báo ngày mai: ${ic(j.forecast === 'rain' ? 'rain' : 'sun')} <b>${j.forecast === 'rain' ? 'Mưa — làm việc ngoài trời chậm hơn, ruộng lớn nhanh hơn' : 'Nắng — thuận lợi để đi săn và xây dựng'}</b></div>
      <h4>Mục tiêu</h4><ul class="goal-list">
        ${row(g.huts >= g.hutsNeed, `Dựng lều: ${g.huts}/${g.hutsNeed}`)}
        ${row(g.fields >= g.fieldsNeed, `Thu hoạch ruộng: ${g.fields}/${g.fieldsNeed}`)}
        ${row(g.food >= g.foodNeed, `Dự trữ 2 ngày ăn: ${g.food}/${g.foodNeed}`)}
        ${row(g.healthy >= g.healthyNeed, `Thành viên khỏe: ${g.healthy}/${g.healthyNeed}`)}
      </ul>
      <div class="mbtns"><button class="btn big go" id="m-next">Bắt đầu ngày ${j.day + 1}</button></div>`, (m) => {
      m.querySelector('#m-next').onclick = () => {
        closeModal();
        SIM.startNewDay();
        GAME.save();
        state.paused = false;
        toast(`Sáng ngày ${S.day} — ${S.weather === 'rain' ? 'trời mưa' : 'trời nắng'}. Hãy phân công việc!`);
        refresh();
      };
    });
  }

  function helpHTML() {
    return `<h2>Cách chơi</h2>
      <ol class="help">
        <li><b>Chọn dân làng:</b> chạm/bấm vào nhân vật. Mở bảng <b>Dân làng</b> để chọn nhiều người (giao việc nhóm). Máy tính: giữ Shift để chọn thêm.</li>
        <li><b>Chọn mục tiêu:</b> bụi quả → <b>Hái quả</b>; cây → <b>Đốn gỗ</b>; tảng đá → <b>Nhặt đá</b>; đồng cỏ có hươu → <b>Cử nhóm săn</b>; ruộng đất hoang → <b>Dọn đất</b> → <b>Gieo hạt</b> → <b>Thu hoạch</b>; ô trống gần trại → <b>Xây lều</b>.</li>
        <li>Nhân vật tự tìm đường, làm việc và mang đồ về kho. Tài nguyên chỉ được cộng khi mang về tới kho.</li>
        <li>18:00 mọi người về bếp lửa, 19:00 mỗi người ăn 1 khẩu phần, 20:30 ai về lều nấy ngủ (Zzz trên lều). Vợ chồng ngủ chung một lều riêng (trái tim trên lều) mới có thể có con.</li>
        <li><b>Bộ lạc:</b> chạm vào lửa trại để nâng cấp — cấp lửa trại là cấp bộ lạc (5 cấp), tăng dân số tối đa, bán kính xây dựng, mở khóa Mỏ đá, Tiên tri (cấp 2), Vu sư (cấp 3). Hiếu là Tù trưởng (đội mũ lông): tù trưởng khỏe thì cả làng làm nhanh hơn.</li>
        <li><b>Xây dựng:</b> khi chọn vị trí, các ô gạch đứt là chỗ trống theo lưới — lều tự hít vào ô gần nhất để các dãy lều thẳng hàng; ruộng mới cũng mở thẳng hàng với ruộng cũ.</li>
        <li><b>Thú dữ</b> (sói, gấu, hổ) có thể tới ban ngày. Chạm vào bếp lửa → <b>Canh gác làng</b> để cử người giỏi Bảo vệ, và <b>Chế giáo đá</b> (2 gỗ + 1 đá) — người cầm giáo đánh mạnh hơn, đi săn cũng tốt hơn. Dân thường tự chạy về bếp lửa vì thú sợ lửa (trừ gấu — gấu nhắm vào kho thức ăn).</li>
        <li><b>Camera:</b> kéo để di chuyển, cuộn chuột / chụm hai ngón để phóng to. Phím: WASD/mũi tên, Space tạm dừng, 1-2-3 tốc độ, B xây dựng, V dân làng, J nhật ký, Esc đóng.</li>
      </ol>
      <h4>Mục tiêu đến hết ngày ${CFG.GOAL.day}</h4>
      <p>Dựng ${CFG.GOAL.huts} lều, thu hoạch ít nhất ${CFG.GOAL.fields} ruộng, dự trữ đủ ${CFG.GOAL.foodDays} ngày ăn và giữ ít nhất ${CFG.GOAL.healthy} thành viên khỏe mạnh.</p>
      <p class="muted">Mẹo: hái quả sớm để có hạt giống; cử cặp thân thiết (Đá & Gió) đi săn; xem dự báo để tránh săn ngày mưa.</p>`;
  }

  function showMenu(fromGame) {
    const has = SIM.hasSave();
    modal(`<div class="title-art"><h1>Bộ Lạc Của Hiếu</h1><p>Sinh tồn và phát triển bộ lạc thời tiền sử bên dòng sông</p></div>
      <div class="mbtns col">
        ${fromGame ? `<button class="btn big go" id="m-resume">Quay lại trò chơi</button>` : ''}
        <button class="btn big ${fromGame ? '' : 'go'}" id="m-new">Chơi mới</button>
        <button class="btn big" id="m-cont" ${has ? '' : 'disabled'}>Tiếp tục${has ? '' : ' (chưa có bản lưu)'}</button>
        ${fromGame ? `<button class="btn big" id="m-save">Lưu ngay</button>` : ''}
        <button class="btn big" id="m-help">Hướng dẫn</button>
      </div>`, (m) => {
      if (fromGame) m.querySelector('#m-resume').onclick = () => { closeModal(); };
      if (fromGame) m.querySelector('#m-save').onclick = () => { GAME.save(); toast('Đã lưu trò chơi', 'ok'); closeModal(); };
      m.querySelector('#m-new').onclick = () => {
        if (SIM.hasSave()) {
          modal(`<h2>Chơi mới?</h2><p>Bản lưu hiện tại sẽ bị thay thế.</p><div class="mbtns"><button class="btn big" id="m-no">Hủy</button><button class="btn big go" id="m-yes">Bắt đầu lại</button></div>`, (m2) => {
            m2.querySelector('#m-no').onclick = () => showMenu(fromGame);
            m2.querySelector('#m-yes').onclick = () => { closeModal(); GAME.newGame(); };
          });
        } else { closeModal(); GAME.newGame(); }
      };
      m.querySelector('#m-cont').onclick = () => { if (GAME.continueGame()) closeModal(); else toast('Không tải được bản lưu', 'err'); };
      m.querySelector('#m-help').onclick = () => modal(helpHTML() + `<div class="mbtns"><button class="btn big go" id="m-back">Quay lại</button></div>`, (m2) => { m2.querySelector('#m-back').onclick = () => showMenu(fromGame); });
    });
  }

  function showIntro() {
    modal(`<h2>Sáng ngày 1</h2>
      <p>Sáu thành viên vừa dựng trại bên sông với một bếp lửa, một kho chung, ${CFG.START.food} khẩu phần và ${CFG.START.wood} gỗ.</p>
      <ul class="jlist">
        ${S.villagers.map(v => `<li><img class="pt sm" src="${pv(v)}"> <b>${v.name}</b> — giỏi ${CFG.SKILL_NAMES[v.main]}</li>`).join('')}
      </ul>
      <p><b>Làng tự vận hành:</b> mỗi người tự chọn việc hợp nghề, tự dựng lều, mở ruộng. Khi đủ chỗ ngủ, thức ăn và tinh thần, sẽ có người mới tới và em bé chào đời. Bạn vẫn có thể giao việc tay, đổi ưu tiên hoặc tắt trong nút <b>Tự động</b>.</p>
      <div class="mbtns"><button class="btn big" id="m-h">Hướng dẫn</button><button class="btn big go" id="m-go">Vào trại</button></div>`, (m) => {
      m.querySelector('#m-go').onclick = () => { closeModal(); state.paused = false; toast('Chạm vào một dân làng để chọn, rồi chạm vào mục tiêu để giao việc.'); };
      m.querySelector('#m-h').onclick = () => modal(helpHTML() + `<div class="mbtns"><button class="btn big go" id="m-back">Vào trại</button></div>`, (m2) => { m2.querySelector('#m-back').onclick = () => { closeModal(); state.paused = false; }; });
    });
  }

  // ---------------- GẮN SỰ KIỆN ----------------
  function bind() {
    buildTop();
    if (window.innerWidth < 700) $('#goals').classList.add('min');
    $('#bottom').innerHTML = `
      <button class="nb" data-k="villagers">${ic('people', 'bi')}<span>Dân làng</span></button>
      <button class="nb" data-k="build">${ic('hut', 'bi')}<span>Xây dựng</span></button>
      <button class="nb" data-k="journal"><span class="bi">📜</span><span>Nhật ký</span></button>
      <button class="nb" data-k="auto"><span class="bi">⚙</span><span>Tự động</span></button>
      <button class="nb" id="b-pause"></button>
      <button class="nb" id="b-speed"></button>
      <button class="nb" id="b-menu"><span class="bi">☰</span><span>Menu</span></button>`;
    $('#bottom').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) openSheet(b.dataset.k);
      else if (b.id === 'b-pause') togglePause();
      else if (b.id === 'b-speed') cycleSpeed();
      else if (b.id === 'b-menu') showMenu(true);
    });
    $('#goals').addEventListener('click', () => { $('#goals').classList.toggle('min'); $('#goals')._last = ''; updateGoals(); });
    $('#selbar').addEventListener('click', (e) => {
      if (e.target.closest('#sb-clear')) { state.selected.clear(); refresh(); return; }
      const n = e.target.closest('.name-link'); if (n) focusVillager(+n.dataset.id);
    });
    $('#panel').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { closeSheet(); return; }
      const nl = e.target.closest('.name-link'); if (nl) { focusVillager(+nl.dataset.id); return; }
      const act = e.target.closest('[data-act]');
      if (act) {
        const a = act.dataset.act;
        if (a === 'all') S.villagers.forEach(v => state.selected.add(v.id));
        else if (a === 'none') state.selected.clear();
        else if (a === 'rest' || a === 'cancel') {
          const r = SIM.assign({ type: a }, selectedVs());
          toast(r.ok ? (a === 'rest' ? 'Đã cho nghỉ ngơi' : 'Đã hủy việc') : r.msg, r.ok ? 'ok' : 'err');
        }
        else if (a === 'place') startBuildMode();
        else if (a.startsWith('place-')) startBuildMode(a.slice(6));
        else if (a.startsWith('ex-')) { EXP.onPanelAct(a); renderSheet(true); return; }
        else if (a === 'upgrade') { const st = WORLD.storage(); RENDER.centerOn((st.x + 1) * T, (st.y + 1) * T); openPopup({ kind: 'obj', id: st.id }); }
        if (state.sheet === 'villagers') updateVillagerPanel();
        return;
      }
      const row = e.target.closest('.vrow');
      if (row) {
        const id = +row.dataset.id;
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        updateVillagerPanel();
        e.preventDefault();
      }
    });
    $('#popup').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { closePopup(); return; }
      const chip = e.target.closest('.chip');
      if (chip) { const id = +chip.dataset.id; state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); renderPopup(); return; }
      const go = e.target.closest('.btn.go');
      if (go && !go.disabled) doAction(+go.dataset.i);
    });
    $('#bh-cancel').addEventListener('click', cancelBuildMode);
    EV.on('toast', (m) => toast(m));
    EV.on('dayEnd', (j) => { if (EXP.autoSkip(j)) return; setTimeout(() => showDayEnd(j), 50); });
    EV.on('plot', () => { if (state.popup) renderPopup(); });
  }

  function togglePause() { state.paused = !state.paused; updateTop(); }
  function cycleSpeed() { const sp = CFG.SPEEDS; S.speed = sp[(sp.indexOf(S.speed) + 1) % sp.length]; state.paused = false; updateTop(); }
  function setSpeed(i) { S.speed = CFG.SPEEDS[i] || 1; state.paused = false; updateTop(); }

  function refresh() { updateTop(); updateGoals(); updateSelbar(); if (state.sheet === 'villagers') updateVillagerPanel(); if (state.sheet === 'auto') EXP.updateAutoPanel($('#panel')); }
  let acc = 0, accJ = 0;
  function update(dt) {
    acc += dt; accJ += dt;
    if (acc > 0.25) { acc = 0; refresh(); }
    if (accJ > 2 && state.sheet === 'journal') { accJ = 0; const p = $('#panel'); const sc = p.scrollTop; p.innerHTML = journalHTML(); p.scrollTop = sc; }
  }

  function escape() {
    if (state.modal) return;
    if (state.buildMode) cancelBuildMode();
    else if (state.popup) closePopup();
    else if (state.sheet) closeSheet();
    else { state.selected.clear(); refresh(); }
  }

  function resetForGame() {
    for (const k in portraits) delete portraits[k];
    state.selected.clear(); closePopup(); closeSheet(); cancelBuildMode();
  }

  return { state, bind, update, refresh, toast, tapMap, hoverMap, showMenu, showIntro, showDayEnd, openSheet, togglePause, setSpeed, cycleSpeed, escape, startBuildMode, resetForGame, openPopup, closeModal };
})();
