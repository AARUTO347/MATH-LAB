const COL = {
  bg: "#171537",
  grid: "#29265f",
  axis: "#6c659b",
  cyan: "#87e8f4",
  pink: "#ff4d78",
  gold: "#ffe089",
  mint: "#5ef28c",
  cream: "#fff8d6",
  violet: "#9d85f5",
};

function drawGrid(ctx, w, h, step = 20) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = (w * 0.5) % step; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = (h * 0.5) % step; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.strokeStyle = COL.axis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.5, h);
  ctx.stroke();
}

function fact(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  return Math.round(fact(n) / (fact(r) * fact(n - r)));
}

function drawArrow(ctx, x0, y0, x1, y1, color, lw = 2.4) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 8 * Math.cos(ang - 0.45), y1 - 8 * Math.sin(ang - 0.45));
  ctx.lineTo(x1 - 8 * Math.cos(ang + 0.45), y1 - 8 * Math.sin(ang + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawStatusOverlay(ctx, w, extras) {
  if (!extras) return;
  if (extras.missionSolved) {
    ctx.save();
    ctx.fillStyle = "rgba(31, 122, 63, 0.9)";
    ctx.strokeStyle = COL.mint;
    ctx.lineWidth = 1.5;
    ctx.fillRect(w - 116, 8, 108, 22);
    ctx.strokeRect(w - 116, 8, 108, 22);
    ctx.fillStyle = COL.cream;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MISSION SOLVED", w - 62, 19);
    ctx.restore();
  }
}

export function renderChapterLabFrame(ctx, w, h, chapterId, p1, p2, t, extras = {}) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const sc = Math.min(w, h) * 0.28;
  let readout = "";

  switch (chapterId) {
    case "00": {
      drawGrid(ctx, w, h, 24);
      const sh = p1;
      const sy = p2;
      const pulse = 1 + Math.sin(t * 2.2) * 0.05;
      const corners = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ].map(([x, y]) => {
        const tx = (x + sh * y) * pulse;
        const ty = y * sy * pulse;
        return [cx + tx * sc * 0.72, cy - ty * sc * 0.72];
      });
      ctx.fillStyle = "rgba(135, 232, 244, 0.2)";
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawArrow(ctx, cx, cy, corners[1][0], corners[1][1], COL.pink, 2.5);
      drawArrow(ctx, cx, cy, corners[3][0], corners[3][1], COL.gold, 2.5);
      const det = sy.toFixed(2);
      readout = `Matrix [[1, ${sh.toFixed(2)}], [0, ${sy.toFixed(2)}]] · det = ${det}`;
      break;
    }

    case "01": {
      drawGrid(ctx, w, h, 24);
      const n = Math.max(3, Math.round(p1));
      const baseRad = ((p2 + t * 18) * Math.PI) / 180;
      const R = sc * 1.1;
      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const a = baseRad + (k * Math.PI * 2) / n;
        const px = cx + Math.cos(a) * R;
        const py = cy - Math.sin(a) * R;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      for (let k = 0; k < n; k++) {
        const a = baseRad + (k * Math.PI * 2) / n;
        const px = cx + Math.cos(a) * R;
        const py = cy - Math.sin(a) * R;
        ctx.fillStyle = k === 0 ? COL.pink : COL.gold;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      readout = `z^${n} = 1 · θ₀ = ${Math.round(p2)}° · ${n} roots on |z|=1`;
      break;
    }

    case "02": {
      drawGrid(ctx, w, h, 24);
      const a1 = (p1 * Math.PI) / 180;
      const a2 = (p2 * Math.PI) / 180;
      const len = sc * 0.95;
      const ax = Math.cos(a1) * len;
      const ay = Math.sin(a1) * len;
      const bx = Math.cos(a2) * len;
      const by = Math.sin(a2) * len;
      ctx.fillStyle = "rgba(255, 224, 137, 0.22)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ax, cy - ay);
      ctx.lineTo(cx + ax + bx, cy - ay - by);
      ctx.lineTo(cx + bx, cy - by);
      ctx.closePath();
      ctx.fill();
      drawArrow(ctx, cx, cy, cx + ax, cy - ay, COL.pink, 2.5);
      drawArrow(ctx, cx, cy, cx + bx, cy - by, COL.cyan, 2.5);
      const det = Math.sin(a2 - a1);
      readout = `det([v₁, v₂]) = sin(${Math.round(p2 - p1)}°) = ${det.toFixed(3)} ${Math.abs(det) < 0.08 ? "(SINGULAR!)" : "(INVERTIBLE)"}`;
      break;
    }

    case "03": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const n = Math.max(3, Math.min(8, Math.round(p1)));
      const r = Math.max(1, Math.min(n, Math.round(p2)));
      const rad = Math.min(w, h) * 0.28;
      ctx.strokeStyle = COL.grid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        const a = t * 0.45 + (i * Math.PI * 2) / n - Math.PI * 0.5;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        const chosen = i < r;
        ctx.fillStyle = chosen ? COL.pink : COL.violet;
        ctx.beginPath();
        ctx.arc(x, y, chosen ? 11 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x, y);
      }
      const perm = Math.round(fact(n) / fact(n - r));
      const comb = nCr(n, r);
      const circ = Math.round(fact(n - 1));
      readout = `${n}P${r} = ${perm} · ${n}C${r} = ${comb} · Circular (${n}-1)! = ${circ}`;
      break;
    }

    case "04": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const rows = Math.max(3, Math.min(9, Math.round(p1)));
      const modK = Math.max(2, Math.round(p2));
      const rowH = (h - 24) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= r; c++) {
          const val = nCr(r, c);
          const x = cx + (c - r * 0.5) * Math.min(28, (w - 30) / rows);
          const y = 18 + r * rowH;
          const hit = val % modK !== 0;
          ctx.fillStyle = hit ? COL.pink : COL.grid;
          ctx.fillRect(x - 10, y - 8, 20, 15);
          ctx.fillStyle = hit ? COL.cream : COL.cyan;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(val), x, y);
        }
      }
      readout = `Pascal Row ${rows - 1} · Row Sum = 2^${rows - 1} = ${2 ** (rows - 1)} · Mod ${modK}`;
      break;
    }

    case "05": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const r = p1;
      const n = Math.max(4, Math.round(p2));
      const padX = 24;
      const barW = Math.max(6, (w - padX * 2) / n - 4);
      let sum = 0;
      const vals = [];
      let maxAbs = 1;
      for (let i = 0; i < n; i++) {
        const term = Math.pow(r, i);
        sum += term;
        vals.push(term);
        if (Math.abs(term) > maxAbs) maxAbs = Math.abs(term);
      }
      const zeroY = h * 0.62;
      ctx.strokeStyle = COL.axis;
      ctx.beginPath();
      ctx.moveTo(padX, zeroY);
      ctx.lineTo(w - padX, zeroY);
      ctx.stroke();
      vals.forEach((v, i) => {
        const bh = (v / maxAbs) * (h * 0.42);
        const x = padX + i * (barW + 4);
        ctx.fillStyle = v >= 0 ? COL.mint : COL.pink;
        ctx.fillRect(x, v >= 0 ? zeroY - bh : zeroY, barW, Math.abs(bh));
      });
      const sInf = Math.abs(r) < 1 ? (1 / (1 - r)).toFixed(3) : "∞ (Diverges)";
      readout = `GP r=${r.toFixed(2)}, N=${n} · Sₙ=${sum.toFixed(3)} · S∞=${sInf}`;
      break;
    }

    case "06": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const p = p1;
      const n = Math.max(4, Math.round(p2));
      const probs = [];
      let maxP = 0.05;
      for (let k = 0; k <= n; k++) {
        const pk = nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
        probs.push(pk);
        if (pk > maxP) maxP = pk;
      }
      const pad = 20;
      const bw = Math.max(5, (w - pad * 2) / (n + 1) - 3);
      const activeK = Math.floor((t * 3) % (n + 1));
      probs.forEach((pk, k) => {
        const bh = (pk / maxP) * (h - 46);
        const x = pad + k * (bw + 3);
        ctx.fillStyle = k === activeK ? COL.gold : COL.cyan;
        ctx.fillRect(x, h - 22 - bh, bw, bh);
      });
      const muX = pad + n * p * (bw + 3) + bw * 0.5;
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(muX, 14);
      ctx.lineTo(muX, h - 16);
      ctx.stroke();
      ctx.setLineDash([]);
      const mean = (n * p).toFixed(2);
      const sd = Math.sqrt(n * p * (1 - p)).toFixed(2);
      readout = `Binomial B(${n}, ${p.toFixed(2)}) · Mean μ=${mean} · σ=${sd}`;
      break;
    }

    case "07": {
      drawGrid(ctx, w, h, 24);
      const freq = p1;
      const amp = p2;
      const r = Math.min(w, h) * 0.24;
      const ux = w * 0.24;
      const ang = t * freq * 1.4;
      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ux, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      const px = ux + Math.cos(ang) * r * amp;
      const py = cy - Math.sin(ang) * r * amp;
      drawArrow(ctx, ux, cy, px, py, COL.gold, 2.2);
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const waveStart = ux + r + 16;
      for (let x = waveStart; x < w - 12; x += 3) {
        const wy = cy - Math.sin(ang - (x - waveStart) * 0.045 * freq) * r * amp;
        if (x === waveStart) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
      ctx.strokeStyle = COL.pink;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(waveStart, py);
      ctx.stroke();
      ctx.setLineDash([]);
      readout = `y = ${amp.toFixed(2)}·sin(${freq.toFixed(2)}t) · sin=${Math.sin(ang).toFixed(2)}, cos=${Math.cos(ang).toFixed(2)}`;
      break;
    }

    case "08": {
      drawGrid(ctx, w, h, 24);
      const l1 = 1.05;
      const l2 = 0.95;
      let tx = p1;
      let ty = p2;
      const maxR = l1 + l2 - 0.05;
      const dist = Math.hypot(tx, ty);
      if (dist > maxR) {
        tx = (tx / dist) * maxR;
        ty = (ty / dist) * maxR;
      }
      const d = Math.max(0.2, Math.hypot(tx, ty));
      const cosQ2 = Math.max(-1, Math.min(1, (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2)));
      const q2 = Math.acos(cosQ2);
      const q1 = Math.atan2(ty, tx) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * cosQ2);
      const s = Math.min(w, h) * 0.3;
      const ox = cx - w * 0.14;
      const oy = cy + h * 0.14;
      const jx = ox + Math.cos(q1) * l1 * s;
      const jy = oy - Math.sin(q1) * l1 * s;
      const ex = jx + Math.cos(q1 + q2) * l2 * s;
      const ey = jy - Math.sin(q1 + q2) * l2 * s;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(jx, jy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
      readout = `IK Joint θ₁=${((q1 * 180) / Math.PI).toFixed(1)}° · θ₂=arccos(${cosQ2.toFixed(2)})=${((q2 * 180) / Math.PI).toFixed(1)}°`;
      break;
    }

    case "09": {
      drawGrid(ctx, w, h, 24);
      const bx0 = -0.8;
      const bx1 = 0.8;
      const by = -0.45;
      const ax = p1;
      const ay = by + p2;
      const pt = (ux, uy) => [cx + ux * sc * 1.15, cy - uy * sc * 1.15];
      const A = pt(ax, ay);
      const B = pt(bx0, by);
      const C = pt(bx1, by);
      ctx.fillStyle = "rgba(255, 224, 137, 0.15)";
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.lineTo(C[0], C[1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(A[0], A[1], 5, 0, Math.PI * 2);
      ctx.fill();
      const sideA = Math.hypot(bx1 - bx0, 0);
      const sideB = Math.hypot(ax - bx1, p2);
      const sideC = Math.hypot(ax - bx0, p2);
      const s = 0.5 * (sideA + sideB + sideC);
      const area = Math.sqrt(Math.max(0, s * (s - sideA) * (s - sideB) * (s - sideC)));
      const inR = area / Math.max(0.01, s);
      const circR = (sideA * sideB * sideC) / Math.max(0.01, 4 * area);
      readout = `Sides (${sideA.toFixed(2)}, ${sideB.toFixed(2)}, ${sideC.toFixed(2)}) · Area Δ=${area.toFixed(2)} · r=${inR.toFixed(2)}, R=${circR.toFixed(2)}`;
      break;
    }

    case "10": {
      drawGrid(ctx, w, h, 24);
      const m = p1;
      const c = p2;
      const x1 = -2.4;
      const x2 = 2.4;
      const y1 = m * x1 + c;
      const y2 = m * x2 + c;
      const toPx = (x, y) => [cx + x * sc * 0.65, cy - y * sc * 0.65];
      const P1 = toPx(x1, y1);
      const P2 = toPx(x2, y2);
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(P1[0], P1[1]);
      ctx.lineTo(P2[0], P2[1]);
      ctx.stroke();
      const samples = [
        [-1.1, 0.9, 1],
        [-0.7, 1.2, 1],
        [-1.4, 0.2, 1],
        [1.1, -0.8, -1],
        [0.8, -1.1, -1],
        [1.3, -0.1, -1],
      ];
      let correct = 0;
      samples.forEach(([sx, sy, cls]) => {
        const pred = sy >= m * sx + c ? 1 : -1;
        if (pred === cls) correct++;
        const [px, py] = toPx(sx, sy);
        ctx.fillStyle = cls > 0 ? COL.cyan : COL.pink;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      const dist0 = Math.abs(c) / Math.hypot(m, 1);
      readout = `y = ${m.toFixed(1)}x + ${c.toFixed(1)} · Origin Dist d=${dist0.toFixed(2)} · Classifier ${correct}/6`;
      break;
    }

    case "11": {
      drawGrid(ctx, w, h, 24);
      const r1 = p1 * sc * 0.72;
      const r2 = sc * 0.56;
      const d = p2 * sc * 0.72;
      const c1x = cx - d * 0.45;
      const c2x = cx + d * 0.55;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(c1x, cy, r1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(c2x, cy, r2, 0, Math.PI * 2);
      ctx.stroke();
      const radX = (c1x + c2x) * 0.5 + (r1 * r1 - r2 * r2) / Math.max(1, 2 * d);
      ctx.strokeStyle = COL.gold;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(radX, 14);
      ctx.lineTo(radX, h - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      const sumR = p1 + 0.78;
      const status = Math.abs(p2 - sumR) < 0.08 ? "Tangent" : p2 < sumR ? "Intersecting" : "Disjoint";
      readout = `R₁=${p1.toFixed(2)}, d=${p2.toFixed(2)} · Radical Axis Active · ${status}`;
      break;
    }

    case "12": {
      drawGrid(ctx, w, h, 24);
      const e = p1;
      const semiP = p2;
      ctx.strokeStyle = COL.mint;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      let started = false;
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.03) {
        const denom = 1 + e * Math.cos(a);
        if (Math.abs(denom) < 0.12) {
          started = false;
          continue;
        }
        const rr = (e * semiP) / denom;
        if (Math.abs(rr) > 4.2) {
          started = false;
          continue;
        }
        const px = cx + rr * Math.cos(a) * sc * 0.65;
        const py = cy - rr * Math.sin(a) * sc * 0.65;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      const kind = e < 0.05 ? "Circle" : e < 0.98 ? "Ellipse" : e <= 1.02 ? "Parabola" : "Hyperbola";
      readout = `Conic: ${kind} · Eccentricity e=${e.toFixed(2)} · latus p=${semiP.toFixed(2)}`;
      break;
    }

    case "13": {
      drawGrid(ctx, w, h, 24);
      const f = (x) => 0.28 * x * x * x - 0.85 * x;
      const df = (x) => 0.84 * x * x - 0.85;
      const toPx = (x, y) => [cx + x * sc * 0.62, cy - y * sc * 0.62];
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      for (let x = -2.5; x <= 2.5; x += 0.06) {
        const [px, py] = toPx(x, f(x));
        if (x === -2.5) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      const x0 = p1;
      const dx = p2;
      const slope = df(x0);
      const [px0, py0] = toPx(x0, f(x0));
      const [tx1, ty1] = toPx(x0 - 1.2, f(x0) - slope * 1.2);
      const [tx2, ty2] = toPx(x0 + 1.2, f(x0) + slope * 1.2);
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.stroke();
      const [sx2, sy2] = toPx(x0 + dx, f(x0 + dx));
      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(px0, py0, 5, 0, Math.PI * 2);
      ctx.arc(sx2, sy2, 4, 0, Math.PI * 2);
      ctx.fill();
      readout = `f(${x0.toFixed(2)})=${f(x0).toFixed(2)} · f'(x)=${slope.toFixed(3)} · Δx=${dx.toFixed(2)}`;
      break;
    }

    case "14": {
      drawGrid(ctx, w, h, 24);
      const N = Math.max(4, Math.round(p1));
      const b = p2;
      const fn = (x) => Math.sin(x) * 0.9 + 0.55;
      const step = b / N;
      const toPx = (x, y) => [w * 0.14 + (x / 3.2) * (w * 0.72), h * 0.78 - y * (h * 0.42)];
      let riemann = 0;
      for (let i = 0; i < N; i++) {
        const xm = (i + 0.5) * step;
        const val = fn(xm);
        riemann += val * step;
        const [rx0, ry0] = toPx(i * step, val);
        const [rx1, base] = toPx((i + 1) * step, 0);
        ctx.fillStyle = "rgba(94, 242, 140, 0.28)";
        ctx.strokeStyle = COL.mint;
        ctx.lineWidth = 1;
        ctx.fillRect(rx0, ry0, Math.max(2, rx1 - rx0 - 1), base - ry0);
        ctx.strokeRect(rx0, ry0, Math.max(2, rx1 - rx0 - 1), base - ry0);
      }
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = 0; x <= 3.15; x += 0.05) {
        const [px, py] = toPx(x, fn(x));
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      const trueArea = 0.9 * (1 - Math.cos(b)) + 0.55 * b;
      const err = Math.abs(riemann - trueArea);
      readout = `∫₀^${b.toFixed(2)} f(x)dx · Riemann(${N})=${riemann.toFixed(3)} · Exact=${trueArea.toFixed(3)} · Err=${err.toFixed(4)}`;
      break;
    }

    case "15": {
      drawGrid(ctx, w, h, 24);
      const rad = (p1 * Math.PI) / 180;
      const bLen = p2;
      const s = sc * 0.95;
      const ax = s;
      const bx = Math.cos(rad) * bLen * s;
      const by = Math.sin(rad) * bLen * s;
      const proj = Math.cos(rad) * bLen;
      drawArrow(ctx, cx, cy, cx + ax, cy, COL.cyan, 2.5);
      drawArrow(ctx, cx, cy, cx + bx, cy - by, COL.pink, 2.5);
      ctx.strokeStyle = COL.gold;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx + bx, cy - by);
      ctx.lineTo(cx + proj * s, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      const dot = (bLen * Math.cos(rad)).toFixed(2);
      const crossZ = (bLen * Math.sin(rad)).toFixed(2);
      readout = `a·b = ${dot} · |a×b| = ${crossZ} · θ = ${Math.round(p1)}°`;
      break;
    }

    case "16": {
      drawGrid(ctx, w, h, 24);
      const tilt = (p1 * Math.PI) / 180;
      const yaw = t * p2 * 0.9;
      const verts = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ];
      const proj = verts.map(([vx, vy, vz]) => {
        const x1 = vx * Math.cos(yaw) - vz * Math.sin(yaw);
        const z1 = vx * Math.sin(yaw) + vz * Math.cos(yaw);
        const y2 = vy * Math.cos(tilt) - z1 * Math.sin(tilt);
        const z2 = vy * Math.sin(tilt) + z1 * Math.cos(tilt);
        const f = 3.2 / (3.8 - z2 * 0.45);
        return [cx + x1 * sc * 0.58 * f, cy - y2 * sc * 0.58 * f];
      });
      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ];
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      edges.forEach(([i, j]) => {
        ctx.moveTo(proj[i][0], proj[i][1]);
        ctx.lineTo(proj[j][0], proj[j][1]);
      });
      ctx.stroke();
      drawArrow(ctx, proj[0][0], proj[0][1], proj[6][0], proj[6][1], COL.pink, 2);
      readout = `3D Cube Diagonal & Skew Projection · Tilt ${Math.round(p1)}° · ω=${p2.toFixed(1)}`;
      break;
    }

    case "17": {
      drawGrid(ctx, w, h, 24);
      const sigma = p1;
      const zLim = p2;
      const pdf = (x) => Math.exp(-0.5 * (x / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
      const maxPdf = pdf(0);
      const toPx = (x, y) => [cx + (x / 3.2) * (w * 0.44), h * 0.8 - (y / maxPdf) * (h * 0.56)];
      ctx.fillStyle = "rgba(255, 77, 120, 0.25)";
      ctx.beginPath();
      const [sx0, sb] = toPx(-zLim * sigma, 0);
      ctx.moveTo(sx0, sb);
      for (let x = -zLim * sigma; x <= zLim * sigma; x += 0.05) {
        const [px, py] = toPx(x, pdf(x));
        ctx.lineTo(px, py);
      }
      const [sx1] = toPx(zLim * sigma, 0);
      ctx.lineTo(sx1, sb);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let x = -3.0; x <= 3.0; x += 0.05) {
        const [px, py] = toPx(x, pdf(x));
        if (x === -3.0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      readout = `Normal N(0, ${sigma.toFixed(2)}²) · Band ±${zLim.toFixed(1)}σ · Variance σ²=${(sigma * sigma).toFixed(2)}`;
      break;
    }

    case "18": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const P = Math.round(p1) === 1;
      const Q = Math.round(p2) === 1;
      const resAnd = P && Q;
      const resOr = P || Q;
      const resImp = !P || Q;
      const drawWire = (x0, y0, x1, y1, on) => {
        ctx.strokeStyle = on ? COL.mint : COL.axis;
        ctx.lineWidth = on ? 3 : 1.8;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      };
      drawWire(68, h * 0.32, cx - 28, h * 0.32, P);
      drawWire(68, h * 0.68, cx - 28, h * 0.68, Q);

      // Clickable toggle buttons for P and Q
      [
        { label: `P = ${P ? 1 : 0}`, on: P, y: h * 0.32 },
        { label: `Q = ${Q ? 1 : 0}`, on: Q, y: h * 0.68 },
      ].forEach((btn) => {
        ctx.fillStyle = btn.on ? "#1f7a3f" : "#29265f";
        ctx.strokeStyle = btn.on ? COL.mint : COL.gold;
        ctx.lineWidth = 2;
        ctx.fillRect(14, btn.y - 16, 54, 32);
        ctx.strokeRect(14, btn.y - 16, 54, 32);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(btn.label, 41, btn.y);
      });

      ctx.fillStyle = COL.grid;
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 28, h * 0.22, 62, h * 0.56);
      ctx.strokeRect(cx - 28, h * 0.22, 62, h * 0.56);
      ctx.fillStyle = COL.gold;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GATE", cx + 3, h * 0.5);

      drawWire(cx + 34, h * 0.3, w - 24, h * 0.3, resAnd);
      drawWire(cx + 34, h * 0.5, w - 24, h * 0.5, resOr);
      drawWire(cx + 34, h * 0.7, w - 24, h * 0.7, resImp);
      ctx.fillStyle = COL.cream;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("Click P or Q", 14, 16);
      ctx.textAlign = "right";
      ctx.fillText(`AND:${resAnd ? 1 : 0}`, w - 16, h * 0.25);
      ctx.fillText(`OR:${resOr ? 1 : 0}`, w - 16, h * 0.45);
      ctx.fillText(`P→Q:${resImp ? 1 : 0}`, w - 16, h * 0.65);
      readout = `P=${P ? "T" : "F"}, Q=${Q ? "T" : "F"} · P∧Q=${resAnd ? "T" : "F"} · P∨Q=${resOr ? "T" : "F"} · P→Q=${resImp ? "T" : "F"}`;
      break;
    }

    case "19":
    default: {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const op = Math.max(0, Math.min(3, Math.round(p1)));
      const ov = p2;
      const r = Math.min(w, h) * 0.26;
      const vcy = cy - 12;
      const ax = cx - r * (1.05 - ov * 0.55);
      const bx = cx + r * (1.05 - ov * 0.55);
      ctx.save();
      if (op === 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(135, 232, 244, 0.42)";
        ctx.beginPath();
        ctx.arc(ax, vcy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 77, 120, 0.42)";
        ctx.beginPath();
        ctx.arc(bx, vcy, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (op === 1) {
        ctx.beginPath();
        ctx.arc(ax, vcy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "rgba(255, 224, 137, 0.65)";
        ctx.beginPath();
        ctx.arc(bx, vcy, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (op === 2) {
        ctx.fillStyle = "rgba(135, 232, 244, 0.55)";
        ctx.beginPath();
        ctx.arc(ax, vcy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.bg;
        ctx.beginPath();
        ctx.arc(bx, vcy, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ax, vcy, r, 0, Math.PI * 2);
        ctx.moveTo(bx + r, vcy);
        ctx.arc(bx, vcy, r, 0, Math.PI * 2);
        ctx.clip("evenodd");
        ctx.fillStyle = "rgba(94, 242, 140, 0.52)";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, vcy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(bx, vcy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 4 clickable operation pills along bottom
      const shortOps = ["A ∪ B", "A ∩ B", "A \\ B", "A △ B"];
      const btnW = Math.min(82, (w - 40) / 4 - 6);
      const startX = cx - (4 * btnW + 3 * 6) * 0.5;
      const by = h - 28;
      shortOps.forEach((lbl, idx) => {
        const x = startX + idx * (btnW + 6);
        const active = op === idx;
        ctx.fillStyle = active ? COL.pink : COL.grid;
        ctx.strokeStyle = active ? COL.cream : COL.axis;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, by, btnW, 20);
        ctx.strokeRect(x, by, btnW, 20);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lbl, x + btnW * 0.5, by + 10);
      });

      const opNames = ["A ∪ B (FULL JOIN)", "A ∩ B (INNER JOIN)", "A \\ B (LEFT ONLY)", "A △ B (XOR)"];
      readout = `Set Operation: ${opNames[op]} · Overlap=${ov.toFixed(2)}`;
      break;
    }
  }

  drawStatusOverlay(ctx, w, extras);
  return readout;
}

export function evaluateChapterMission(chapterId, p1, p2) {
  switch (chapterId) {
    case "00":
      return {
        solved: Math.abs(p2 - 1.5) <= 0.06 && p1 >= 0.6,
        currentLabel: `det = ${p2.toFixed(2)} (target 1.50) · Shear X = ${p1.toFixed(2)} (≥ 0.60)`,
      };
    case "01": {
      const n = Math.round(p1);
      const deg = ((p2 % 360) + 360) % 360;
      const diff45 = Math.min(Math.abs(deg - 45), 360 - Math.abs(deg - 45));
      return {
        solved: n === 8 && diff45 <= 5,
        currentLabel: `n = ${n} (target 8) · Phase θ₀ = ${Math.round(deg)}° (target 45°)`,
      };
    }
    case "02": {
      const det = Math.abs(Math.sin(((p2 - p1) * Math.PI) / 180));
      return {
        solved: det < 0.08,
        currentLabel: `|det| = ${det.toFixed(3)} (target < 0.080)`,
      };
    }
    case "03": {
      const n = Math.max(3, Math.min(8, Math.round(p1)));
      const r = Math.max(1, Math.min(n, Math.round(p2)));
      const comb = nCr(n, r);
      return {
        solved: comb === 20,
        currentLabel: `${n}C${r} = ${comb} (target 20)`,
      };
    }
    case "04":
      return {
        solved: Math.round(p1) >= 8 && Math.round(p2) === 2,
        currentLabel: `Rows N = ${Math.round(p1)} (≥ 8) · Mod = ${Math.round(p2)} (target 2)`,
      };
    case "05": {
      const n = Math.round(p2);
      const sInf = Math.abs(p1) < 1 ? (1 / (1 - p1)).toFixed(2) : "∞";
      return {
        solved: Math.abs(p1 - 0.6) < 0.03 && n >= 10,
        currentLabel: `r = ${p1.toFixed(2)} (S∞ = ${sInf}, target 2.50) · N = ${n} (≥ 10)`,
      };
    }
    case "06": {
      const mu = p1 * Math.round(p2);
      return {
        solved: Math.abs(mu - 6.0) < 0.15,
        currentLabel: `Mean μ = n×p = ${mu.toFixed(2)} (target 6.00)`,
      };
    }
    case "07":
      return {
        solved: Math.abs(p1 - 3.0) < 0.06 && p2 >= 0.98,
        currentLabel: `ω = ${p1.toFixed(2)} (target 3.00) · Amp = ${p2.toFixed(2)} (≥ 0.98)`,
      };
    case "08": {
      const l1 = 1.05;
      const l2 = 0.95;
      const maxR = l1 + l2 - 0.05;
      let tx = p1;
      let ty = p2;
      const dist = Math.hypot(tx, ty);
      if (dist > maxR) {
        tx = (tx / dist) * maxR;
        ty = (ty / dist) * maxR;
      }
      const d = Math.max(0.2, Math.hypot(tx, ty));
      const cosQ2 = Math.max(-1, Math.min(1, (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2)));
      const deg2 = (Math.acos(cosQ2) * 180) / Math.PI;
      return {
        solved: deg2 >= 85 && deg2 <= 95,
        currentLabel: `Elbow θ₂ = ${deg2.toFixed(1)}° (target 85°–95°)`,
      };
    }
    case "09": {
      const sideB = Math.hypot(p1 - 0.8, p2);
      const sideC = Math.hypot(p1 + 0.8, p2);
      return {
        solved: Math.abs(sideB - 1.6) <= 0.05 && Math.abs(sideC - 1.6) <= 0.05,
        currentLabel: `Sides (1.60, ${sideB.toFixed(2)}, ${sideC.toFixed(2)}) (target 1.60 each)`,
      };
    }
    case "10": {
      const samples = [
        [-1.1, 0.9, 1],
        [-0.7, 1.2, 1],
        [-1.4, 0.2, 1],
        [1.1, -0.8, -1],
        [0.8, -1.1, -1],
        [1.3, -0.1, -1],
      ];
      let correct = 0;
      samples.forEach(([sx, sy, cls]) => {
        if ((sy >= p1 * sx + p2 ? 1 : -1) === cls) correct++;
      });
      return {
        solved: correct === 6,
        currentLabel: `Classifier Accuracy: ${correct}/6 (target 6/6)`,
      };
    }
    case "11": {
      const sumR = p1 + 0.78;
      const diff = Math.abs(p2 - sumR);
      return {
        solved: diff < 0.08,
        currentLabel: `d = ${p2.toFixed(2)} vs R₁+R₂ = ${sumR.toFixed(2)} (gap ${diff.toFixed(2)})`,
      };
    }
    case "12":
      return {
        solved: Math.abs(p1 - 1.0) < 0.03,
        currentLabel: `Eccentricity e = ${p1.toFixed(2)} (target 1.00)`,
      };
    case "13": {
      const slope = 0.84 * p1 * p1 - 0.85;
      return {
        solved: Math.abs(slope) < 0.05 && p2 <= 0.1,
        currentLabel: `|f'(x)| = ${Math.abs(slope).toFixed(3)} (<0.05) · Δx = ${p2.toFixed(2)} (≤0.10)`,
      };
    }
    case "14": {
      const N = Math.max(4, Math.round(p1));
      const b = p2;
      const step = b / N;
      let riemann = 0;
      for (let i = 0; i < N; i++) {
        const xm = (i + 0.5) * step;
        riemann += (Math.sin(xm) * 0.9 + 0.55) * step;
      }
      const exact = 0.9 * (1 - Math.cos(b)) + 0.55 * b;
      const err = Math.abs(riemann - exact);
      return {
        solved: err <= 0.002 && b >= 2.5,
        currentLabel: `Err = ${err.toFixed(4)} (≤ 0.002) · Upper Bound b = ${b.toFixed(2)} (≥ 2.50)`,
      };
    }
    case "15": {
      const cross = p2 * Math.sin((p1 * Math.PI) / 180);
      return {
        solved: cross >= 1.4,
        currentLabel: `|a×b| = ${cross.toFixed(2)} (target ≥ 1.40)`,
      };
    }
    case "16":
      return {
        solved: Math.abs(p1 - 35) <= 5 && p2 >= 0.8,
        currentLabel: `Tilt = ${Math.round(p1)}° (30°–40°) · Spin = ${p2.toFixed(1)} (≥ 0.8)`,
      };
    case "17":
      return {
        solved: p1 <= 0.7 && Math.abs(p2 - 2.0) <= 0.11,
        currentLabel: `σ = ${p1.toFixed(2)} (≤ 0.70) · Z = ${p2.toFixed(1)} (target 2.0)`,
      };
    case "18":
      return {
        solved: Math.round(p1) === 0 && Math.round(p2) === 1,
        currentLabel: `P = ${Math.round(p1)}, Q = ${Math.round(p2)} (target P=0, Q=1)`,
      };
    case "19":
    default:
      return {
        solved: Math.round(p1) === 3 && p2 >= 0.85,
        currentLabel: `Set Op = ${Math.round(p1)} (target 3: A△B) · Overlap = ${p2.toFixed(2)} (≥ 0.85)`,
      };
  }
}

function quantize(val, min, max, step) {
  const clamped = Math.max(min, Math.min(max, val));
  const steps = Math.round((clamped - min) / step);
  const q = Math.max(min, Math.min(max, min + steps * step));
  return Number(q.toFixed(4));
}

export function mapCanvasPointerToParams(chapterId, normX, normY, curP1, curP2, ch, isClick = false) {
  const nx = Math.max(0, Math.min(1, normX));
  const ny = Math.max(0, Math.min(1, normY));
  const lerp = (min, max, f) => min + (max - min) * f;

  switch (chapterId) {
    case "01": {
      const ang = Math.atan2(0.5 - ny, nx - 0.5);
      const deg = ((ang * 180) / Math.PI + 360) % 360;
      const radDist = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 2.2);
      return {
        p1: isClick ? quantize(lerp(ch.p1Min, ch.p1Max, radDist), ch.p1Min, ch.p1Max, ch.p1Step) : curP1,
        p2: quantize(deg, ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "08": {
      const tx = (nx - 0.36) * 2.8;
      const ty = (0.64 - ny) * 2.6;
      return {
        p1: quantize(tx, ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(ty, ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "09": {
      const ax = (nx - 0.5) * 2.2;
      const ay = (0.68 - ny) * 2.1;
      return {
        p1: quantize(ax, ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(ay, ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "13": {
      const x0 = (nx - 0.5) * 4.4;
      return {
        p1: quantize(x0, ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "14": {
      const b = ((nx - 0.14) / 0.72) * 3.2;
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, 1 - ny), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(b, ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "15": {
      const dx = nx - 0.5;
      const dy = 0.5 - ny;
      const deg = (Math.atan2(Math.max(0.01, dy), dx) * 180) / Math.PI;
      const len = Math.hypot(dx, dy) * 3.1;
      return {
        p1: quantize(deg, ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(len, ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "18": {
      if (!isClick) return { p1: curP1, p2: curP2 };
      if (ny < 0.5) {
        return { p1: Math.round(curP1) === 1 ? 0 : 1, p2: curP2 };
      }
      return { p1: curP1, p2: Math.round(curP2) === 1 ? 0 : 1 };
    }
    case "19": {
      if (isClick && ny > 0.76) {
        const opIdx = Math.max(0, Math.min(3, Math.floor(((nx - 0.2) / 0.6) * 4)));
        return { p1: opIdx, p2: curP2 };
      }
      const pull = 1 - Math.min(1, Math.abs(nx - 0.5) * 2.1);
      return {
        p1: curP1,
        p2: quantize(lerp(ch.p2Min, ch.p2Max, pull), ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    default:
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
  }
}
