// =====================================================================
//  WORLD — bản đồ, vật thể, lưới đi được, tìm đường
// =====================================================================
'use strict';
const WORLD = (() => {
  let W = CFG.MAP_W, H = CFG.MAP_H;
  const T = CFG.TILE;
  const TER = ['grass', 'forest', 'dirt', 'sand', 'water', 'cliff', 'rock', 'meadow', 'farm'];
  const TI = {}; TER.forEach((n, i) => TI[n] = i);
  // Lều và lều đang dựng không chặn đường: dân làng đi xuyên qua được
  const BLOCKING = { tree: 1, bush: 1, boulder: 1, fire: 1, storage: 1 }; // lều, nhà, giàn phơi, kho lương: đi xuyên qua được

  let block = new Uint8Array(W * H);
  let region = null;

  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const idx = (x, y) => y * W + x;

  function ter(x, y) { return inb(x, y) ? TER[S.terrain[idx(x, y)]] : null; }
  function setTer(x, y, n) { if (inb(x, y)) S.terrain[idx(x, y)] = TI[n]; }
  function passTer(n) { return n !== null && n !== 'water' && n !== 'cliff'; }
  let bridge = null; // ô có cầu đã xây xong: đi được dù là nước
  function walkable(x, y) { return inb(x, y) && (passTer(ter(x, y)) || (bridge && bridge[idx(x, y)] === 1)) && !block[idx(x, y)]; }

  function rebuild() {
    if (S.mapW && (S.mapW !== W || S.mapH !== H)) { W = S.mapW; H = S.mapH; }
    block = new Uint8Array(W * H);
    bridge = new Uint8Array(W * H);
    region = null;
    for (const o of S.objects) if (o.type === 'bridge' && o.done) for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (inb(o.x + i, o.y + j)) bridge[idx(o.x + i, o.y + j)] = 1;
    for (const o of S.objects) {
      if (!BLOCKING[o.type]) continue;
      for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) if (inb(o.x + i, o.y + j)) block[idx(o.x + i, o.y + j)] = 1;
    }
  }

  function objAt(tx, ty, filter) {
    for (let k = S.objects.length - 1; k >= 0; k--) {
      const o = S.objects[k];
      if (tx >= o.x && ty >= o.y && tx < o.x + o.w && ty < o.y + o.h && (!filter || filter(o))) return o;
    }
    return null;
  }
  function byId(id) { return S.objects.find(o => o.id === id) || null; }
  function addObj(o) { o.id = S.nextId++; S.objects.push(o); return o; }
  function removeObj(o) { const k = S.objects.indexOf(o); if (k >= 0) S.objects.splice(k, 1); rebuild(); }
  function fire() { return S.objects.find(o => o.type === 'fire'); }
  function storage() { return S.objects.find(o => o.type === 'storage'); }

  // ô đi được bao quanh một vật thể (8 hướng)
  function ringTiles(o) {
    const out = [];
    for (let y = o.y - 1; y <= o.y + o.h; y++) for (let x = o.x - 1; x <= o.x + o.w; x++) {
      if (x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h) continue;
      if (walkable(x, y)) out.push([x, y]);
    }
    return out;
  }
  function insideTiles(o) {
    const out = [];
    for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (walkable(x, y)) out.push([x, y]);
    return out;
  }

  // ---------------- TÌM ĐƯỜNG (A* 8 hướng, nhiều đích) ----------------
  function findPath(sx, sy, goals) {
    if (!goals.length) return null;
    const gset = new Set(goals.map(([x, y]) => idx(x, y)));
    const start = idx(sx, sy);
    if (gset.has(start)) return [];
    const N = W * H;
    const g = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const h = (i) => { const x = i % W, y = (i / W) | 0; let best = 1e9; for (const [gx, gy] of goals) { const dx = Math.abs(gx - x), dy = Math.abs(gy - y); const d = Math.max(dx, dy) + 0.414 * Math.min(dx, dy); if (d < best) best = d; } return best; };
    const heap = []; // [f, i]
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    g[start] = 0; push(h(start), start);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = -1, iter = 0;
    while (heap.length && iter++ < 6000) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (gset.has(cur)) { found = cur; break; }
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, c] of D) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny)) continue;
        if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
        const ni = idx(nx, ny);
        const ng = g[cur] + c;
        if (ng < g[ni]) { g[ni] = ng; prev[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    if (found < 0) return null;
    const path = [];
    for (let i = found; i !== start && i >= 0; i = prev[i]) path.push([i % W, (i / W) | 0]);
    return path.reverse();
  }

  function nearestWalkable(tx, ty) {
    for (let r = 0; r < 8; r++) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++)
      if (walkable(x, y)) return [x, y];
    return [tx, ty];
  }

  // Vùng chính: mọi ô đi được nối liền với kho. Ô bị lều/vật cản bao kín sẽ nằm ngoài vùng này.
  function mainRegion() {
    if (region) return region;
    region = new Uint8Array(W * H);
    const st = storage();
    if (!st) return region;
    const q = [];
    for (const [x, y] of ringTiles(st)) { const i = idx(x, y); if (!region[i]) { region[i] = 1; q.push(i); } }
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (q.length) {
      const c = q.pop(), cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of D) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny)) continue;
        if (dx && dy && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
        const ni = idx(nx, ny);
        if (!region[ni]) { region[ni] = 1; q.push(ni); }
      }
    }
    return region;
  }
  function inMain(x, y) { return inb(x, y) && mainRegion()[idx(x, y)] === 1; }
  function nearestMain(tx, ty) {
    for (let r = 0; r < 14; r++) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++)
      if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) === r && inMain(x, y)) return [x, y];
    return nearestWalkable(tx, ty);
  }

  // ---------------- TẠO BẢN ĐỒ ----------------
  function generate() {
    if (window.EXP) { S.mapW = W = CFG.MAP_W; S.mapH = H = CFG.MAP_H; return EXP.generate(); }
    S.mapW = W = 36; S.mapH = H = 28;
    const r = ART.rng(20261117);
    const terrain = new Array(W * H).fill(TI.grass);
    S.terrain = terrain;
    S.objects = [];
    S.nextId = 1;
    const set = (x, y, n) => { if (inb(x, y)) terrain[idx(x, y)] = TI[n]; };
    const get = (x, y) => inb(x, y) ? TER[terrain[idx(x, y)]] : null;

    // Sông chảy dọc phía đông
    const riverX = [];
    for (let y = 0; y < H; y++) {
      const cx = 31 + Math.round(Math.sin(y * 0.33) * 1.2 + Math.sin(y * 0.12 + 1) * 0.8);
      riverX[y] = cx;
      for (let x = cx - 1; x <= cx + 1; x++) set(x, y, 'water');
      set(cx - 2, y, 'sand'); set(cx + 2, y, 'sand');
      if (r() < 0.5) set(cx - 3, y, 'sand');
    }
    // Rừng phía tây
    const forestEdge = [];
    for (let y = 0; y < H; y++) {
      let e = 8 + Math.round(Math.sin(y * 0.5) * 1.4 + (r() - 0.5));
      if (y > 16) e -= Math.round((y - 16) * 1.6);
      forestEdge[y] = e;
      for (let x = 0; x < e; x++) set(x, y, 'forest');
    }
    // Vách đá phía bắc
    const cliffDepth = [];
    for (let x = 5; x <= 28; x++) {
      const d = 2 + Math.round(Math.sin(x * 0.6) * 0.8 + r() * 0.5);
      cliffDepth[x] = d;
      for (let y = 0; y < d; y++) set(x, y, 'cliff');
      set(x, d, 'rock');
      if (r() < 0.6) set(x, d + 1, 'rock');
    }
    // Đồng cỏ săn bắn phía tây nam
    for (let y = 20; y < H; y++) for (let x = 0; x < 12; x++) {
      const edge = 11 + Math.round(Math.sin(y * 0.9) * 0.8);
      if (x <= edge && !(y === 20 && r() < 0.4)) set(x, y, 'meadow');
    }
    // Sân trại quanh bếp lửa
    const FX = 17, FY = 12;
    for (let y = FY - 4; y <= FY + 4; y++) for (let x = FX - 4; x <= FX + 5; x++) {
      const d = Math.hypot(x - FX - 0.5, (y - FY) * 1.1);
      if (d < 2.6 + r() * 0.6) set(x, y, 'dirt');
    }
    // Đường đất
    const paths = [
      [[16, 12], [12, 12], [8, 13], [5, 13]],           // tới rừng
      [[18, 10], [18, 7], [17, 5], [16, 4]],            // tới vách đá
      [[19, 13], [21, 16], [23, 17], [27, 17]],         // tới ruộng
      [[16, 14], [13, 17], [10, 20], [8, 22]],          // tới đồng cỏ
      [[20, 12], [24, 12], [27, 13], [28, 13]],         // ra bờ sông
    ];
    for (const p of paths) {
      for (let k = 0; k < p.length - 1; k++) {
        const [x0, y0] = p[k], [x1, y1] = p[k + 1];
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        let px_ = x0, py_ = y0;
        for (let s = 0; s <= n; s++) {
          const x = Math.round(x0 + (x1 - x0) * s / n), y = Math.round(y0 + (y1 - y0) * s / n);
          if (x !== px_ && y !== py_) { const c3 = get(x, py_); if (c3 === 'grass' || c3 === 'forest' || c3 === 'meadow') set(x, py_, 'dirt'); }
          px_ = x; py_ = y;
          const cur = get(x, y);
          if (cur !== 'water' && cur !== 'cliff' && cur !== 'sand') set(x, y, 'dirt');
          if (r() < 0.25) { const ox = x + (r() < 0.5 ? 1 : 0), oy = y + (r() < 0.5 ? 1 : 0); const c2 = get(ox, oy); if (c2 === 'grass' || c2 === 'forest') set(ox, oy, 'dirt'); }
        }
      }
    }
    // Ruộng (đất hoang 2×2)
    const plotPos = [[19, 18], [22, 18], [25, 18], [19, 21], [22, 21], [25, 21]];
    for (const [px, py] of plotPos) {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) set(px + i, py + j, 'farm');
      addObj({ type: 'plot', x: px, y: py, w: 2, h: 2, state: 'wild', progress: 0, growth: 0, yieldLeft: 0, seeded: false });
    }

    // Công trình ban đầu
    addObj({ type: 'fire', x: FX, y: FY, w: 1, h: 1 });
    addObj({ type: 'storage', x: 19, y: 10, w: 2, h: 2, level: 0, upgrading: null });
    addObj({ type: 'huntzone', x: 1, y: 21, w: 9, h: 6, animals: CFG.HUNT.animalsStart });

    const occupied = (x, y) => S.objects.some(o => x >= o.x - (o.type === 'plot' ? 0 : 0) && y >= o.y && x < o.x + o.w && y < o.y + o.h);
    const nearCamp = (x, y) => Math.hypot(x - FX, y - FY) < 5.5;
    const canTree = (x, y) => { const t = get(x, y); return (t === 'grass' || t === 'forest') && !occupied(x, y) && !nearCamp(x, y); };

    // Đá tảng dọc vách
    const bxs = [10, 13, 16, 20, 23, 26];
    bxs.forEach((bx, k) => {
      const by = cliffDepth[bx];
      set(bx, by, 'rock'); set(bx, by + 1, get(bx, by + 1) === 'cliff' ? 'rock' : get(bx, by + 1));
      addObj({ type: 'boulder', x: bx, y: by, w: 1, h: 1, stock: CFG.GATHER.stone.stock, v: k % 2 });
    });
    // Bụi quả
    const bushPos = [[11, 9], [11, 15], [9, 17], [14, 19], [24, 8], [26, 10], [24, 14], [13, 7]];
    for (const [bx, by] of bushPos) {
      let placed = false;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) {
        const x = bx + dx, y = by + dy, t = get(x, y);
        if ((t === 'grass' || t === 'forest') && !occupied(x, y)) { addObj({ type: 'bush', x, y, w: 1, h: 1, stock: CFG.GATHER.berry.stock, seeds: CFG.GATHER.berry.seeds, regrow: 0 }); placed = true; break; }
      }
    }
    // Cây
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = get(x, y);
      let p = 0;
      if (t === 'forest') p = x < forestEdge[y] - 1 ? 0.6 : 0.45;
      else if (t === 'grass') {
        if (x > riverX[y] + 2) p = 0.5;                      // bờ đông
        else if (x >= forestEdge[y] && x <= forestEdge[y] + 1) p = 0.18;
        else if (x > 23 && x < 29 && y > 2 && y < 9) p = 0.22; // lùm cây đông bắc
        else if (y > 24 && x > 12 && x < 28) p = 0.16;
        else p = 0.025;
      }
      if (p && r() < p && canTree(x, y)) addObj({ type: 'tree', x, y, w: 1, h: 1, stock: CFG.GATHER.wood.stock, v: (r() * 3) | 0 });
    }
    rebuild();
    // Bỏ cây chặn lối ở các điểm quan trọng (đảm bảo luôn có đường)
    const f = fire();
    const start = ringTiles(f)[0];
    const important = S.objects.filter(o => o.type === 'bush' || o.type === 'boulder');
    for (const o of important) {
      if (!findPath(start[0], start[1], ringTiles(o))) {
        // mở lối: xoá cây lân cận
        S.objects = S.objects.filter(t => !(t.type === 'tree' && Math.abs(t.x - o.x) <= 2 && Math.abs(t.y - o.y) <= 2));
        rebuild();
      }
    }
  }

  return { get W() { return W; }, get H() { return H; }, T, TER, TI, ter, setTer, walkable, passTer, rebuild, objAt, byId, addObj, removeObj, fire, storage, ringTiles, insideTiles, findPath, nearestWalkable, mainRegion, inMain, nearestMain, generate, inb, idx, BLOCKING };
})();
