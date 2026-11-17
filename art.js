// =====================================================================
//  ART — pixel art tự vẽ bằng code (ô đất, công trình, cây, thú, biểu tượng)
// =====================================================================
'use strict';
const ART = (() => {
  const T = CFG.TILE;

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rect(x, X, Y, w, h, c) { x.fillStyle = c; x.fillRect(X, Y, w, h); }
  function px(x, X, Y, c) { x.fillStyle = c; x.fillRect(X, Y, 1, 1); }
  function disc(x, cx, cy, r, c) {
    x.fillStyle = c;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++)
      if (i * i + j * j <= r * r + r * 0.8) x.fillRect(cx + i, cy + j, 1, 1);
  }
  function ell(x, cx, cy, rx, ry, c) {
    x.fillStyle = c;
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++)
      if ((i * i) / (rx * rx + 0.5) + (j * j) / (ry * ry + 0.5) <= 1) x.fillRect(cx + i, cy + j, 1, 1);
  }
  function speckle(x, X, Y, w, h, colors, n, r) {
    for (let k = 0; k < n; k++) px(x, X + ((r() * w) | 0), Y + ((r() * h) | 0), colors[(r() * colors.length) | 0]);
  }

  // ---------------- Ô ĐẤT ----------------
  const BASE = {
    grass: '#5ead3b', forest: '#3f8f35', dirt: '#d9aa5c', sand: '#e6d394', water: '#3a7cc4',
    cliff: '#8f949b', rock: '#b3a78e', meadow: '#86b444', farm: '#8a5a2e',
  };

  function grassTuft(x, X, Y, c1, c2) {
    px(x, X, Y, c1); px(x, X + 2, Y, c1); px(x, X + 1, Y + 1, c2); px(x, X, Y + 1, c2); px(x, X + 2, Y + 1, c2);
  }

  function drawTerrain(x, type, X, Y, r, nb) {
    // nb: hàm (dx,dy) -> loại ô láng giềng
    switch (type) {
      case 'grass': {
        rect(x, X, Y, T, T, BASE.grass);
        speckle(x, X, Y, T, T, ['#6cbd46', '#519a33', '#66b641'], 26, r);
        for (let k = 0; k < 3; k++) grassTuft(x, X + 2 + ((r() * 18) | 0), Y + 2 + ((r() * 18) | 0), '#80d153', '#4a8f2e');
        if (r() < 0.12) { const fx = X + 3 + ((r() * 17) | 0), fy = Y + 3 + ((r() * 17) | 0); px(x, fx, fy, r() < 0.5 ? '#fff6c8' : '#ffd84a'); px(x, fx + 1, fy, '#e8e0a0'); }
        if (r() < 0.07) { const sx = X + 4 + ((r() * 15) | 0), sy = Y + 4 + ((r() * 15) | 0); rect(x, sx, sy, 2, 1, '#a0a4a8'); px(x, sx, sy + 1, '#7c8086'); }
        break;
      }
      case 'forest': {
        rect(x, X, Y, T, T, BASE.forest);
        speckle(x, X, Y, T, T, ['#4a9c3d', '#357a2c', '#2f6f28'], 30, r);
        for (let k = 0; k < 2; k++) grassTuft(x, X + 2 + ((r() * 18) | 0), Y + 2 + ((r() * 18) | 0), '#58a848', '#2d6a27');
        if (r() < 0.2) { const lx = X + 3 + ((r() * 17) | 0), ly = Y + 3 + ((r() * 17) | 0); px(x, lx, ly, '#8a6a2a'); px(x, lx + 1, ly, '#6f5320'); }
        break;
      }
      case 'meadow': {
        rect(x, X, Y, T, T, BASE.meadow);
        speckle(x, X, Y, T, T, ['#94c04c', '#78a43a', '#a2c758'], 30, r);
        for (let k = 0; k < 5; k++) {
          const gx = X + 1 + ((r() * 21) | 0), gy = Y + 2 + ((r() * 18) | 0);
          rect(x, gx, gy, 1, 3, '#b2cf5e'); px(x, gx + 1, gy + 1, '#6c9632'); px(x, gx, gy - 1, '#d4d47a');
        }
        break;
      }
      case 'dirt': {
        rect(x, X, Y, T, T, BASE.dirt);
        speckle(x, X, Y, T, T, ['#c9964a', '#e6bd72', '#cf9f52'], 28, r);
        if (r() < 0.4) { const sx = X + 3 + ((r() * 17) | 0), sy = Y + 3 + ((r() * 17) | 0); px(x, sx, sy, '#a98552'); px(x, sx + 1, sy, '#b8945e'); }
        break;
      }
      case 'sand': {
        rect(x, X, Y, T, T, BASE.sand);
        speckle(x, X, Y, T, T, ['#d4bf7c', '#f0e0a8', '#dcc88a'], 24, r);
        break;
      }
      case 'water': {
        rect(x, X, Y, T, T, BASE.water);
        speckle(x, X, Y, T, T, ['#326db0', '#4286cc'], 20, r);
        break;
      }
      case 'rock': {
        rect(x, X, Y, T, T, BASE.rock);
        speckle(x, X, Y, T, T, ['#9e9178', '#c9bda3', '#a89c84'], 30, r);
        for (let k = 0; k < 2; k++) { const sx = X + 2 + ((r() * 18) | 0), sy = Y + 2 + ((r() * 18) | 0); rect(x, sx, sy, 3, 2, '#9a9ea4'); rect(x, sx, sy + 2, 3, 1, '#70747a'); px(x, sx, sy, '#c4c8cc'); }
        break;
      }
      case 'cliff': {
        rect(x, X, Y, T, T, '#8f949b');
        speckle(x, X, Y, T, T, ['#a3a8ae', '#7d8288', '#9aa0a6'], 40, r);
        // vết nứt
        for (let k = 0; k < 2; k++) { let cx = X + 3 + ((r() * 17) | 0), cy = Y + 2 + ((r() * 8) | 0); for (let s = 0; s < 6; s++) { px(x, cx, cy, '#5f6369'); cy++; if (r() < 0.4) cx += r() < 0.5 ? -1 : 1; } }
        const below = nb(0, 1);
        if (below !== 'cliff') {
          // mặt vách đứng phía nam
          rect(x, X, Y + 12, T, 12, '#757a81');
          for (let i = 0; i < T; i += 4) rect(x, X + i + ((r() * 2) | 0), Y + 13, 1, 10, '#62666c');
          rect(x, X, Y + 11, T, 1, '#b8bdc3');
          rect(x, X, Y + 22, T, 2, '#4f5359');
        }
        const above = nb(0, -1);
        if (above !== 'cliff' && above !== null) rect(x, X, Y, T, 1, '#c4c8cd');
        break;
      }
      case 'farm': {
        drawFarm(x, X, Y, 'wild', r);
        break;
      }
    }
  }

  // Viền tự nhiên: ô đất / cát được láng giềng cỏ "lấn" vào không đều
  function drawEdges(x, type, X, Y, r, nb) {
    if (!(type === 'dirt' || type === 'sand' || type === 'water' || type === 'rock' || type === 'meadow' || type === 'forest')) return;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of dirs) {
      const n = nb(dx, dy);
      if (n === null || n === type) continue;
      if (type === 'water') {
        if (n === 'sand' || n === 'grass') {
          const c = '#9cc8ee';
          for (let i = 0; i < T; i++) {
            const d = 1 + ((r() * 2) | 0);
            for (let k = 0; k < d; k++) {
              const px_ = dx === 0 ? X + i : (dx > 0 ? X + T - 1 - k : X + k);
              const py_ = dy === 0 ? Y + i : (dy > 0 ? Y + T - 1 - k : Y + k);
              px(x, px_, py_, k === 0 ? c : '#5d97d4');
            }
          }
        }
        continue;
      }
      let col = BASE[n];
      if (!col || n === 'water' || n === 'cliff' || n === 'farm') continue;
      if ((type === 'meadow' || type === 'forest') && n !== 'grass') continue;
      if ((type === 'sand' && n === 'dirt') || (type === 'dirt' && n === 'sand') || (type === 'rock' && n === 'dirt')) continue;
      // độ sâu lấn thay đổi mượt theo sin để mép uốn tự nhiên
      const ph = r() * 6.28, amp = 1 + r() * 2;
      for (let i = 0; i < T; i++) {
        const d = Math.max(0, Math.round(1.5 + Math.sin(i * 0.45 + ph) * amp + (r() - 0.5)));
        for (let k = 0; k < d; k++) {
          const px_ = dx === 0 ? X + i : (dx > 0 ? X + T - 1 - k : X + k);
          const py_ = dy === 0 ? Y + i : (dy > 0 ? Y + T - 1 - k : Y + k);
          px(x, px_, py_, k === d - 1 && r() < 0.5 ? shade(col, -14) : col);
        }
      }
    }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function drawFarm(x, X, Y, state, r, growth) {
    if (state === 'wild') {
      rect(x, X, Y, T, T, '#7fa83e');
      speckle(x, X, Y, T, T, ['#8a6a3a', '#93b84a', '#6d9132', '#a08050'], 50, r);
      for (let k = 0; k < 6; k++) {
        const gx = X + 1 + ((r() * 21) | 0), gy = Y + 3 + ((r() * 17) | 0);
        rect(x, gx, gy, 1, 4, '#b8b04a'); px(x, gx - 1, gy + 1, '#9a9a3a'); px(x, gx + 1, gy, '#d0c060');
      }
      if (r() < 0.6) { const sx = X + 3 + ((r() * 16) | 0), sy = Y + 3 + ((r() * 16) | 0); rect(x, sx, sy, 3, 2, '#9a9ea4'); rect(x, sx, sy + 2, 3, 1, '#6a6e74'); }
      return;
    }
    // đất đã dọn: luống cày
    rect(x, X, Y, T, T, '#8a5a2e');
    for (let j = 2; j < T; j += 4) { rect(x, X, Y + j, T, 1, '#6b4321'); rect(x, X, Y + j - 1, T, 1, '#a06c3a'); }
    speckle(x, X, Y, T, T, ['#7a4c25', '#9a6633'], 14, r);
    if (state === 'sown') {
      for (let j = 3; j < T; j += 4) for (let i = 2; i < T; i += 4) px(x, X + i, Y + j - 1, '#e2cc92');
    } else if (state === 'growing') {
      const h = growth >= 2 ? 3 : 2;
      for (let j = 3; j < T; j += 4) for (let i = 2; i < T; i += 4) {
        rect(x, X + i, Y + j - h, 1, h, '#5fb43f'); px(x, X + i - 1, Y + j - h + 1, '#7fd055'); if (h > 2) px(x, X + i + 1, Y + j - h, '#7fd055');
      }
    } else if (state === 'ready') {
      for (let j = 3; j < T; j += 4) for (let i = 1; i < T; i += 3) {
        rect(x, X + i, Y + j - 5, 1, 5, '#c9a233'); rect(x, X + i, Y + j - 6, 1, 2, '#f0d050'); px(x, X + i + 1, Y + j - 5, '#e9c84a');
      }
    }
  }

  // ---------------- SPRITE CÔNG TRÌNH / THIÊN NHIÊN ----------------
  const SPR = {};

  function makeTree(variant) {
    const [c, x] = mk(28, 42);
    const r = rng(100 + variant);
    // thân
    rect(x, 12, 26, 4, 14, '#6b4224'); rect(x, 15, 26, 1, 14, '#4e2f18'); rect(x, 12, 26, 1, 14, '#875632');
    px(x, 11, 39, '#6b4224'); px(x, 16, 39, '#4e2f18');
    if (variant % 2 === 0) {
      disc(x, 14, 15, 12, '#24561f');
      disc(x, 13, 14, 11, '#2f6f2a');
      disc(x, 12, 13, 8, '#3e8a34');
      disc(x, 10, 10, 4, '#56a544');
      speckle(x, 4, 4, 20, 20, ['#2a6424', '#4a9a3c'], 60, r);
      px(x, 9, 8, '#7cc95a'); px(x, 11, 7, '#7cc95a'); px(x, 8, 10, '#6cbc50');
    } else {
      // cây thông tán nhọn
      for (let k = 0; k < 4; k++) {
        const top = 2 + k * 7, w = 5 + k * 3;
        for (let j = 0; j < 9; j++) {
          const half = Math.round((j / 9) * w);
          rect(x, 14 - half, top + j, half * 2 + 1, 1, j < 2 ? '#3f8a3a' : '#2c6a35');
          px(x, 14 + half, top + j, '#1f4f27');
          if (half > 1) px(x, 14 - half, top + j, '#4f9a48');
        }
      }
    }
    return c;
  }

  function makeStump() {
    const [c, x] = mk(14, 10);
    ell(x, 7, 6, 5, 3, '#6b4224'); ell(x, 7, 5, 4, 2, '#c9a066'); px(x, 7, 5, '#8a6638'); rect(x, 2, 6, 10, 2, '#5a361c');
    return c;
  }

  function makeBush(berries) {
    const [c, x] = mk(22, 18);
    const r = rng(berries ? 7 : 8);
    disc(x, 7, 11, 5, '#2f6f2a'); disc(x, 15, 11, 5, '#2f6f2a'); disc(x, 11, 8, 6, '#2f6f2a');
    disc(x, 7, 10, 4, '#3f8a34'); disc(x, 15, 10, 4, '#3f8a34'); disc(x, 11, 7, 5, '#4a9a3c');
    disc(x, 9, 5, 2, '#62b04c');
    speckle(x, 3, 3, 16, 12, ['#2a6424', '#58a848'], 30, r);
    if (berries) {
      const pts = [[5, 9], [9, 6], [13, 8], [16, 11], [8, 12], [12, 11], [14, 5], [6, 13], [17, 8]];
      for (const [bx, by] of pts) { rect(x, bx, by, 2, 2, '#c8303a'); px(x, bx, by, '#ff8080'); px(x, bx + 1, by + 1, '#8a1a22'); }
    }
    return c;
  }

  function makeBoulder(v) {
    const [c, x] = mk(24, 20);
    ell(x, 12, 11, 10, 7, '#5f6369');
    ell(x, 12, 10, 9, 6, '#8d9198');
    ell(x, 10, 8, 6, 3, '#a7abb1');
    rect(x, 7, 6, 4, 1, '#c8ccd1');
    rect(x, 13, 9, 1, 4, '#62666c'); px(x, 14, 12, '#62666c'); px(x, 12, 13, '#62666c');
    if (v) { ell(x, 19, 15, 3, 2, '#7d8188'); px(x, 18, 14, '#b0b4ba'); }
    return c;
  }

  function makeFire(frame) {
    const [c, x] = mk(24, 24);
    // vòng đá
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const sx = Math.round(12 + Math.cos(a) * 8), sy = Math.round(15 + Math.sin(a) * 5);
      ell(x, sx, sy, 2, 1, '#7d8188'); px(x, sx - 1, sy - 1, '#b8bcc2');
    }
    ell(x, 12, 15, 5, 3, '#3a2a1a');
    // củi
    rect(x, 7, 15, 10, 2, '#6b4224'); rect(x, 9, 13, 2, 5, '#5a361c'); rect(x, 13, 13, 2, 5, '#7a4c28');
    // lửa
    const fl = [
      [[12, 6], [11, 8], [13, 9], [10, 11], [14, 11]],
      [[11, 5], [13, 7], [10, 9], [14, 10], [12, 9]],
      [[13, 6], [11, 7], [12, 9], [10, 10], [14, 9]],
    ][frame];
    ell(x, 12, 12, 4, 3, '#e05a1e');
    for (const [fx, fy] of fl) { rect(x, fx, fy, 2, 14 - fy, '#f08a24'); }
    ell(x, 12, 12, 2, 2, '#ffd23a');
    px(x, fl[0][0], fl[0][1] - 1, '#ffe680');
    rect(x, 11, 11, 2, 2, '#fff2b0');
    return c;
  }

  function makeHut() {
    const [c, x] = mk(48, 54);
    const r = rng(33);
    const apexX = 24, apexY = 3, baseY = 46, halfBase = 22;
    for (let y = apexY; y <= baseY; y++) {
      const t = (y - apexY) / (baseY - apexY);
      const half = Math.round(t * halfBase + 1);
      for (let i = -half; i <= half; i++) {
        const band = ((y - apexY) % 7);
        let col = band < 2 ? '#4f8a36' : '#3d6e2c';
        if (i > half * 0.45) col = band < 2 ? '#3d6e2c' : '#2c5221';
        if (i < -half * 0.55) col = band < 2 ? '#62a043' : '#4f8a36';
        if (r() < 0.12) col = shade(col, r() < 0.5 ? -18 : 18);
        px(x, apexX + i, y, col);
      }
      // mép rủ của từng lớp cỏ
      if ((y - apexY) % 7 === 6) for (let i = -half; i <= half; i += 2) px(x, apexX + i, y + 1, '#24461b');
    }
    // cọc chóp
    rect(x, 23, 0, 2, 5, '#6b4224'); px(x, 21, 1, '#6b4224'); px(x, 26, 1, '#6b4224');
    // cửa
    for (let y = 33; y <= 46; y++) {
      const half = y < 36 ? 3 + (y - 33) : 6;
      rect(x, apexX - half, y, half * 2, 1, '#2a1a0e');
    }
    rect(x, apexX - 7, 33, 1, 14, '#875632'); rect(x, apexX + 6, 33, 1, 14, '#5a361c');
    rect(x, apexX - 2, 40, 4, 6, '#3a2616');
    // chân lều
    rect(x, 2, 47, 44, 2, '#24461b');
    return c;
  }

  function makeStorage() {
    const [c, x] = mk(48, 50);
    // sàn gỗ
    rect(x, 3, 30, 42, 10, '#a0703c');
    for (let i = 3; i < 45; i += 6) rect(x, i, 30, 1, 10, '#7a5028');
    rect(x, 3, 30, 42, 1, '#c89a5c'); rect(x, 3, 39, 42, 2, '#5a3a1c');
    // cột
    for (const cx of [5, 41]) { rect(x, cx, 12, 3, 30, '#6b4224'); rect(x, cx, 12, 1, 30, '#875632'); }
    rect(x, 22, 14, 3, 18, '#6b4224');
    // mái cỏ nghiêng
    for (let y = 4; y < 18; y++) {
      const off = Math.round((18 - y) * 0.3);
      for (let i = 1 + off; i < 47 - off; i++) {
        const band = y % 5;
        let col = band < 2 ? '#4f8a36' : '#3d6e2c';
        if (i > 34) col = '#2c5221';
        px(x, i, y, col);
      }
    }
    for (let i = 1; i < 47; i += 2) px(x, i, 18, '#24461b');
    rect(x, 3, 19, 42, 1, '#1d3a16');
    // giỏ
    ell(x, 13, 28, 5, 3, '#c99a4e'); rect(x, 8, 25, 10, 3, '#c99a4e'); rect(x, 8, 25, 10, 1, '#e6c27a'); rect(x, 8, 27, 10, 1, '#9a7034');
    ell(x, 33, 28, 4, 3, '#b8884a'); rect(x, 29, 25, 8, 3, '#b8884a'); rect(x, 29, 25, 8, 1, '#d8b06a');
    return c;
  }

  function makeTotem() {
    const [c, x] = mk(14, 26);
    rect(x, 6, 6, 2, 20, '#6b4224'); rect(x, 6, 6, 1, 20, '#875632');
    // sọ thú + gạc
    ell(x, 7, 6, 3, 3, '#efe6d0'); px(x, 6, 6, '#3a2a1a'); px(x, 8, 6, '#3a2a1a');
    for (let k = 0; k < 4; k++) { px(x, 3 - (k > 1 ? 1 : 0), 4 - k, '#e0d4b8'); px(x, 11 + (k > 1 ? 1 : 0), 4 - k, '#e0d4b8'); }
    px(x, 2, 1, '#e0d4b8'); px(x, 12, 1, '#e0d4b8');
    rect(x, 4, 14, 6, 1, '#c8303a');
    return c;
  }

  function makeDeer(frame, flip) {
    const [c, x] = mk(14, 12);
    const b = '#8a5a30', d = '#6a4220', l = '#c79a6a';
    rect(x, 3, 4, 8, 4, b); rect(x, 3, 7, 8, 1, l); rect(x, 3, 4, 8, 1, '#a06c3c');
    rect(x, 10, 1, 2, 4, b); rect(x, 11, 0, 3, 2, b); px(x, 13, 1, '#1a1a1a'); px(x, 12, 0, d);
    px(x, 11, -0 + 0, '#e0d4b8');
    px(x, 2, 4, l);
    const legs = frame ? [[4, 8], [5, 8], [9, 8], [10, 8]] : [[3, 8], [6, 8], [8, 8], [11, 8]];
    for (const [lx, ly] of legs) rect(x, lx, ly, 1, 3, d);
    if (flip) {
      const [c2, x2] = mk(14, 12);
      x2.translate(14, 0); x2.scale(-1, 1); x2.drawImage(c, 0, 0);
      return c2;
    }
    return c;
  }

  function makeSheaf() {
    const [c, x] = mk(12, 12);
    rect(x, 4, 2, 4, 9, '#c9a233'); rect(x, 3, 1, 6, 3, '#f0d050'); rect(x, 3, 6, 6, 1, '#8a6a20'); px(x, 5, 1, '#fff0a0');
    return c;
  }

  function makeLogPile() { const [c, x] = mk(14, 8); for (let k = 0; k < 3; k++) { rect(x, 1, 5 - k * 2, 12, 2, k === 1 ? '#7a4c28' : '#6b4224'); ell(x, 12, 6 - k * 2, 1, 1, '#c9a066'); } rect(x, 4, 1, 8, 2, '#875632'); return c; }
  function makeStonePile() { const [c, x] = mk(12, 8); ell(x, 4, 5, 3, 2, '#8d9198'); ell(x, 8, 5, 3, 2, '#7d8188'); ell(x, 6, 3, 3, 2, '#a7abb1'); return c; }
  function makeFoodPile() { const [c, x] = mk(12, 8); ell(x, 6, 5, 5, 2, '#9a7034'); px(x, 3, 3, '#c8303a'); px(x, 5, 3, '#c8303a'); px(x, 7, 2, '#c8303a'); rect(x, 7, 3, 4, 2, '#b8553a'); px(x, 10, 2, '#efe6d0'); return c; }

  function makeSite() {
    const [c, x] = mk(48, 54);
    const apexX = 24, apexY = 4;
    const ends = [[3, 47], [12, 48], [24, 49], [36, 48], [45, 47]];
    for (const [ex, ey] of ends) {
      const n = 40;
      for (let k = 0; k <= n; k++) { const t = k / n; px(x, Math.round(apexX + (ex - apexX) * t), Math.round(apexY + (ey - apexY) * t), '#7a4c28'); }
    }
    rect(x, 23, 1, 2, 5, '#6b4224');
    return c;
  }

  function init() {
    SPR.tree = [makeTree(0), makeTree(1), makeTree(2)];
    SPR.stump = makeStump();
    SPR.bush = makeBush(true); SPR.bushEmpty = makeBush(false);
    SPR.boulder = [makeBoulder(0), makeBoulder(1)];
    SPR.fire = [makeFire(0), makeFire(1), makeFire(2)];
    SPR.hut = makeHut(); SPR.site = makeSite();
    SPR.storage = makeStorage(); SPR.totem = makeTotem();
    SPR.deer = [[makeDeer(0, false), makeDeer(1, false)], [makeDeer(0, true), makeDeer(1, true)]];
    SPR.sheaf = makeSheaf(); SPR.logs = makeLogPile(); SPR.stones = makeStonePile(); SPR.foodpile = makeFoodPile();
  }

  // ---------------- DÂN LÀNG (vẽ trực tiếp, 10×16 px) ----------------
  // pose: 'stand' | 'walk' | 'work' | 'sit' | 'sleep'
  function drawVillager(x, X, Y, v, t, pose, facing, alpha) {
    if (alpha !== undefined) x.globalAlpha = alpha;
    const skin = v.skin, tunic = v.tunic, hair = v.hair, band = v.band;
    const step = pose === 'walk' ? (Math.floor(t * 8) % 4) : 0;
    const bob = pose === 'walk' && (step === 1 || step === 3) ? -1 : 0;
    if (pose === 'sleep') {
      rect(x, X - 7, Y - 4, 14, 4, tunic); rect(x, X - 7, Y - 3, 14, 1, band);
      rect(x, X + 4, Y - 6, 5, 5, skin); rect(x, X + 4, Y - 6, 5, 2, hair);
      if (alpha !== undefined) x.globalAlpha = 1;
      return;
    }
    const sit = pose === 'sit' ? 3 : 0;
    const by = Y + bob + sit;
    // chân
    if (!sit) {
      const l1 = step === 1 ? -1 : 0, l2 = step === 3 ? -1 : 0;
      rect(x, X - 3, by - 4 + l1, 2, 4 - (l1 ? 0 : 0), skin); rect(x, X + 1, by - 4 + l2, 2, 4, skin);
      rect(x, X - 3, by - 1 + l1, 2, 1, '#5a3a1c'); rect(x, X + 1, by - 1 + l2, 2, 1, '#5a3a1c');
    } else {
      rect(x, X - 5, by - 3, 10, 2, skin); rect(x, X - 5, by - 2, 2, 1, '#5a3a1c'); rect(x, X + 3, by - 2, 2, 1, '#5a3a1c');
    }
    // áo da
    rect(x, X - 4, by - 10, 8, 6, tunic);
    rect(x, X - 4, by - 5, 8, 1, shade(tunic, -25));
    px(x, X - 4, by - 4, tunic); px(x, X + 1, by - 4, tunic); px(x, X + 3, by - 4, shade(tunic, -25));
    rect(x, X - 4, by - 8, 8, 1, band);
    // tay
    const swing = pose === 'work' ? (Math.floor(t * 6) % 2) : 0;
    if (pose === 'work') {
      const ax = facing > 0 ? X + 4 : X - 6;
      if (swing) { rect(x, ax, by - 13, 2, 4, skin); rect(x, ax - (facing > 0 ? -1 : 1), by - 15, 2, 3, '#6b4224'); rect(x, ax - (facing > 0 ? -2 : 2), by - 16, 3, 2, '#8d9198'); }
      else { rect(x, ax, by - 9, 2, 4, skin); rect(x, ax + (facing > 0 ? 2 : -2), by - 8, 2, 3, '#6b4224'); rect(x, ax + (facing > 0 ? 3 : -3), by - 6, 3, 2, '#8d9198'); }
      rect(x, facing > 0 ? X - 6 : X + 4, by - 9, 2, 4, skin);
    } else {
      const a = pose === 'walk' ? (step === 1 ? 1 : step === 3 ? -1 : 0) : 0;
      rect(x, X - 6, by - 9 + a, 2, 4, skin); rect(x, X + 4, by - 9 - a, 2, 4, skin);
    }
    // đầu
    rect(x, X - 3, by - 16, 6, 6, skin);
    rect(x, X - 3, by - 17, 6, 2, hair); rect(x, X - 4, by - 16, 1, 4, hair); rect(x, X + 3, by - 16, 1, 4, hair);
    if (facing === 0) { px(x, X - 2, by - 13, '#1a1010'); px(x, X + 1, by - 13, '#1a1010'); }
    else if (facing > 0) { px(x, X + 1, by - 13, '#1a1010'); rect(x, X - 3, by - 16, 2, 3, hair); }
    else { px(x, X - 2, by - 13, '#1a1010'); rect(x, X + 1, by - 16, 2, 3, hair); }
    if (alpha !== undefined) x.globalAlpha = 1;
  }

  function drawCarry(x, X, Y, carry) {
    const y = Y - 21;
    if (carry.wood) { rect(x, X - 5, y, 10, 3, '#6b4224'); rect(x, X - 5, y, 10, 1, '#875632'); ell(x, X + 5, y + 1, 1, 1, '#c9a066'); }
    else if (carry.stone) { ell(x, X, y + 1, 3, 2, '#8d9198'); px(x, X - 1, y, '#c0c4c8'); }
    else if (carry.meat) { rect(x, X - 4, y, 7, 3, '#b8453a'); rect(x, X - 4, y, 7, 1, '#d86a52'); rect(x, X + 3, y + 1, 2, 1, '#efe6d0'); }
    else if (carry.food || carry.seeds) { rect(x, X - 4, y + 1, 8, 3, '#c99a4e'); rect(x, X - 4, y + 1, 8, 1, '#e6c27a'); px(x, X - 2, y, '#c8303a'); px(x, X, y, '#c8303a'); px(x, X + 2, y, '#e2cc92'); }
  }

  // ---------------- BIỂU TƯỢNG GIAO DIỆN (10×10) ----------------
  const ICON_MAPS = {
    food: { p: { r: '#7a2416', R: '#c8553a', L: '#e07a5a', w: '#f4ead4' }, m: [
      '......ww..', '.....wwww.', '....rLww..', '..rLRRr...', '.rLRRRr...', '.rRRRRr...', '.rRRRr....', '..rrr.....', '.ww.......', 'ww........'] },
    wood: { p: { b: '#4e2f18', B: '#875632', o: '#6b4224', y: '#e2bd7a' }, m: [
      '..........', '..........', '.bbbbbbbo.', 'bBBBBBBoyo', 'bBBBBBBoyo', 'bbbbbbbbo.', '..bbbbbbo.', '.bBBBBBoyo', '.bbbbbbbo.', '..........'] },
    stone: { p: { d: '#5f6369', g: '#8d9198', l: '#c0c4c9' }, m: [
      '..........', '...dddd...', '..dgllgd..', '.dglllggd.', '.dgglgggd.', 'dggggggggd', 'dgggggggdd', '.ddggggdd.', '..dddddd..', '..........'] },
    seeds: { p: { d: '#8a6a30', s: '#e2c27a', l: '#fff0b8', g: '#5fb43f' }, m: [
      '....g.....', '...gg.....', '....g.....', '..dsd..ds.', '.dsls.dsld', '.dssd.dssd', '..dd...dd.', '...dsd....', '..dslsd...', '...ddd....'] },
    people: { p: { s: '#e0ae80', h: '#3a2416', t: '#9c5b2e', u: '#6e4a2a' }, m: [
      '.hh...hh..', 'hssh.hssh.', 'hssh.hssh.', '.ss...ss..', 'tttt.uuuu.', 'tttt.uuuu.', 'tttt.uuuu.', '.s.s..s.s.', '.s.s..s.s.', '..........'] },
    sun: { p: { y: '#ffd23a', o: '#f08a24', w: '#fff2b0' }, m: [
      '....y.....', '.y..y..y..', '..yyyyy...', '..ywwyo...', 'yyywyyoyyy', '..yyyyo...', '..yoooo...', '.y..y..y..', '....y.....', '..........'] },
    rain: { p: { c: '#c8d4e0', d: '#8a9aac', b: '#4f9ae0' }, m: [
      '...ccc....', '..ccccc...', '.ccccccc..', 'cccccccccc', 'dddddddddd', '..........', '.b..b..b..', 'b..b..b...', '..b..b..b.', '.b..b..b..'] },
    hut: { p: { g: '#3d6e2c', l: '#62a043', d: '#2a1a0e', b: '#6b4224' }, m: [
      '....bb....', '....gg....', '...lggg...', '...lggg...', '..llgggg..', '..lggggg..', '.llgdddg..', '.lggddggg.', 'llggddgggg', '..........'] },
    field: { p: { y: '#f0d050', o: '#c9a233', b: '#8a5a2e', d: '#6b4321' }, m: [
      '.y..y..y..', 'yoyyoyyoy.', '.o..o..o..', '.o..o..o..', 'bbbbbbbbbb', 'dddddddddd', 'bbbbbbbbbb', 'dddddddddd', 'bbbbbbbbbb', '..........'] },
    heart: { p: { r: '#d8323a', l: '#ff8a8a' }, m: [
      '..........', '.rr...rr..', 'rlrr.rrrr.', 'rlrrrrrrr.', 'rrrrrrrrr.', '.rrrrrrr..', '..rrrrr...', '...rrr....', '....r.....', '..........'] },
    bolt: { p: { y: '#ffd23a', o: '#e09a20' }, m: [
      '.....yy...', '....yyo...', '...yyo....', '..yyyyyy..', '.....yyo..', '....yyo...', '...yyo....', '..yo......', '.yo.......', '..........'] },
    smile: { p: { y: '#f2c94c', d: '#5a3a1c' }, m: [
      '..yyyyy...', '.yyyyyyy..', 'yyydyydyy.', 'yyyyyyyyy.', 'yyyyyyyyy.', 'ydyyyyydy.', 'yydddddyy.', '.yyyyyyy..', '..yyyyy...', '..........'] },
  };
  const ICONS = {};
  function initIcons() {
    for (const k in ICON_MAPS) {
      const { p, m } = ICON_MAPS[k];
      const [c, x] = mk(10, 10);
      m.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && p[ch]) px(x, i, j, p[ch]); } });
      ICONS[k] = c.toDataURL();
    }
  }
  function icon(k, cls) { return `<img class="ico ${cls || ''}" src="${ICONS[k]}" alt="">`; }

  function portrait(v, size) {
    const [c, x] = mk(14, 20);
    drawVillager(x, 7, 19, v, 0, 'stand', 0);
    return c.toDataURL();
  }

  return { T, mk, rng, rect, px, ell, disc, shade, drawTerrain, drawEdges, drawFarm, SPR, init, initIcons, icon, ICONS, drawVillager, drawCarry, portrait };
})();
