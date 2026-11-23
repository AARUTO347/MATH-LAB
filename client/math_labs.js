const DARK_COL = {
  bg: "#171537",
  grid: "#29265f",
  axis: "#6c659b",
  cyan: "#87e8f4",
  pink: "#ff4d78",
  gold: "#ffe089",
  mint: "#5ef28c",
  cream: "#fff8d6",
  violet: "#9d85f5",
  pillBg: "rgba(31, 122, 63, 0.9)",
  tileOff: "#29265f",
};

const PAPER_COL = {
  bg: "#f7f3e4",
  grid: "#ddd4bc",
  axis: "#7f789b",
  cyan: "#0b6b82",
  pink: "#cc1e4f",
  gold: "#9b5e00",
  mint: "#117a3b",
  cream: "#1c1a3a",
  violet: "#5844a8",
  pillBg: "rgba(255, 255, 255, 0.94)",
  tileOff: "#dfd8c2",
};

let COL = { ...DARK_COL };

function applyLabTheme(extras) {
  const isPaper = extras?.theme === "paper";
  COL = isPaper ? { ...PAPER_COL } : { ...DARK_COL };
}

// ---------------- Safe Recursive-Descent Math Expression Parser ----------------
const MATH_FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  abs: Math.abs,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

const MATH_CONSTS = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

function tokenizeExpr(raw) {
  const src = String(raw || "").trim().toLowerCase();
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let numStr = "";
      let dotSeen = false;
      while (i < src.length && ((src[i] >= "0" && src[i] <= "9") || (src[i] === "." && !dotSeen))) {
        if (src[i] === ".") dotSeen = true;
        numStr += src[i++];
      }
      const val = Number.parseFloat(numStr);
      if (Number.isFinite(val)) tokens.push({ type: "num", val });
      continue;
    }
    if (/[a-z_]/.test(ch)) {
      let id = "";
      while (i < src.length && /[a-z0-9_]/.test(src[i])) {
        id += src[i++];
      }
      tokens.push({ type: "id", val: id });
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      tokens.push({ type: "op", val: ch });
      i++;
      continue;
    }
    i++;
  }
  return tokens;
}

const exprCompileCache = new Map();

export function compileMathExpr(rawExpr) {
  const key = String(rawExpr || "").trim();
  if (exprCompileCache.has(key)) return exprCompileCache.get(key);
  const tokens = tokenizeExpr(key);
  if (!tokens.length) {
    const zeroFn = () => Number.NaN;
    exprCompileCache.set(key, zeroFn);
    return zeroFn;
  }

  let pos = 0;
  const peek = () => tokens[pos] || null;
  const next = () => tokens[pos++] || null;

  function parsePrimary() {
    const tok = peek();
    if (!tok) return () => Number.NaN;
    if (tok.type === "num") {
      next();
      const v = tok.val;
      return () => v;
    }
    if (tok.type === "op" && tok.val === "(") {
      next();
      const inner = parseAddSub();
      if (peek()?.type === "op" && peek().val === ")") next();
      return inner;
    }
    if (tok.type === "id") {
      next();
      const name = tok.val;
      if (peek()?.type === "op" && peek().val === "(" && MATH_FUNCS[name]) {
        next();
        const args = [];
        if (!(peek()?.type === "op" && peek().val === ")")) {
          args.push(parseAddSub());
          while (peek()?.type === "op" && peek().val === ",") {
            next();
            args.push(parseAddSub());
          }
        }
        if (peek()?.type === "op" && peek().val === ")") next();
        const fn = MATH_FUNCS[name];
        return (vars) => fn(...args.map((a) => a(vars)));
      }
      if (Object.prototype.hasOwnProperty.call(MATH_CONSTS, name)) {
        const c = MATH_CONSTS[name];
        return () => c;
      }
      return (vars) => {
        if (name === "x" || name === "theta" || name === "r") return vars.x;
        if (name === "t") return vars.t;
        if (name === "p1" || name === "k" || name === "a") return vars.p1;
        if (name === "p2" || name === "b") return vars.p2;
        return Number.NaN;
      };
    }
    next();
    return () => Number.NaN;
  }

  function parseUnary() {
    const tok = peek();
    if (tok?.type === "op" && (tok.val === "+" || tok.val === "-")) {
      next();
      const right = parseUnary();
      return tok.val === "-" ? (vars) => -right(vars) : right;
    }
    return parsePrimary();
  }

  function parsePow() {
    let left = parseUnary();
    while (peek()?.type === "op" && peek().val === "^") {
      next();
      const right = parseUnary();
      const lFn = left;
      left = (vars) => Math.pow(lFn(vars), right(vars));
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePow();
    while (
      peek() &&
      ((peek().type === "op" && (peek().val === "*" || peek().val === "/")) ||
        peek().type === "id" ||
        (peek().type === "op" && peek().val === "("))
    ) {
      let op = "*";
      if (peek().type === "op" && (peek().val === "*" || peek().val === "/")) {
        op = next().val;
      }
      const right = parsePow();
      const lFn = left;
      left =
        op === "*"
          ? (vars) => lFn(vars) * right(vars)
          : (vars) => lFn(vars) / right(vars);
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek()?.type === "op" && (peek().val === "+" || peek().val === "-")) {
      const op = next().val;
      const right = parseMulDiv();
      const lFn = left;
      left =
        op === "+"
          ? (vars) => lFn(vars) + right(vars)
          : (vars) => lFn(vars) - right(vars);
    }
    return left;
  }

  const ast = parseAddSub();
  if (exprCompileCache.size > 80) exprCompileCache.clear();
  exprCompileCache.set(key, ast);
  return ast;
}

export function evalMathExpr(rawExpr, x = 0, t = 0, p1 = 1, p2 = 0) {
  try {
    const fn = compileMathExpr(rawExpr);
    const val = fn({ x, t, p1, p2 });
    return Number.isFinite(val) ? val : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function drawGrid(ctx, w, h, step = 20, offsetX = 0, offsetY = 0) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  const cx = w * 0.5 + offsetX;
  const cy = h * 0.5 + offsetY;
  ctx.beginPath();
  for (let x = ((cx % step) + step) % step; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = ((cy % step) + step) % step; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  ctx.strokeStyle = COL.axis;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
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
    ctx.fillStyle = COL.pillBg;
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
  applyLabTheme(extras);
  const cx = w * 0.5;
  const cy = h * 0.5;
  const zoom = Math.max(0.45, Math.min(2.8, Number(extras?.zoom) || 1));
  const sc = Math.min(w, h) * 0.28 * zoom;
  let readout = "";

  switch (chapterId) {
    case "B1": {
      drawGrid(ctx, w, h, 24);
      const a = Math.round(p1);
      const b = Math.round(p2);
      const sum = a + b;
      const numY = extras?.expMode ? h * 0.42 : h * 0.5;
      const toX = (n) => 28 + ((n + 12) / 56) * (w - 56);
      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(24, numY);
      ctx.lineTo(w - 24, numY);
      ctx.stroke();

      for (let tick = -10; tick <= 40; tick += 5) {
        const tx = toX(tick);
        ctx.strokeStyle = tick === 0 ? COL.gold : COL.axis;
        ctx.lineWidth = tick === 0 ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, numY - 6);
        ctx.lineTo(tx, numY + 6);
        ctx.stroke();
        ctx.fillStyle = tick === 0 ? COL.gold : COL.cream;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(tick), tx, numY + 18);
      }

      const x0 = toX(0);
      const xA = toX(a);
      const xS = toX(sum);
      const drawHop = (fx, tx, arcH, col, lbl) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(fx, numY);
        ctx.quadraticCurveTo((fx + tx) * 0.5, numY - arcH, tx, numY);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(tx, numY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(lbl, (fx + tx) * 0.5, numY - arcH * 0.62);
      };
      drawHop(x0, xA, Math.min(72, 22 + Math.abs(a) * 2), COL.cyan, `${a >= 0 ? "+" : ""}${a}`);
      drawHop(xA, xS, Math.min(76, 26 + Math.abs(b) * 2.2), b >= 0 ? COL.mint : COL.pink, `${b >= 0 ? "+" : ""}${b}`);

      // Place value blocks for |sum|
      const absSum = Math.abs(sum);
      const tens = Math.floor(absSum / 10);
      const ones = absSum % 10;
      const baseY = h - 38;
      ctx.fillStyle = COL.cream;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Result = ${sum} (${tens} tens, ${ones} ones)`, 18, baseY - 6);
      for (let i = 0; i < Math.min(8, tens); i++) {
        ctx.fillStyle = COL.gold;
        ctx.fillRect(18 + i * 24, baseY, 18, 12);
      }
      for (let i = 0; i < ones; i++) {
        ctx.fillStyle = COL.mint;
        ctx.fillRect(220 + i * 14, baseY + 2, 9, 9);
      }

      if (extras?.expMode) {
        const stops = Math.max(0, Math.round(extras?.expBusStops || 0));
        const pulse = Math.abs(Math.sin(t * 2.4));
        const busX = xS + Math.sin(t * 2) * 3;
        ctx.fillStyle = "#ff4d78";
        ctx.fillRect(busX - 16, numY - 26 - pulse * 3, 32, 16);
        ctx.fillStyle = "#ffe089";
        ctx.fillRect(busX - 11, numY - 23 - pulse * 3, 22, 6);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`BUS STOP #${sum} · HOPS: ${stops} · ₹${absSum * 10} FARE`, w - 16, 24);
        readout = `EXPMT Bus Stop #${sum} · ${a} + (${b}) = ${sum} · ₹10 Notes=${absSum}`;
      } else {
        readout = `Number Line: ${a} + (${b}) = ${sum} · Tens=${tens}, Ones=${ones}`;
      }
      break;
    }

    case "B2": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const b = Math.max(2, Math.round(p2));
      const a = Math.max(1, Math.round(p1));
      const filled = Math.min(a, b);
      const pct = (a / b) * 100;
      const dec = (a / b).toFixed(3);
      const px = w * 0.28;
      const py = cy;
      const r = Math.min(w, h) * 0.31;

      for (let i = 0; i < b; i++) {
        const a0 = -Math.PI * 0.5 + (i * Math.PI * 2) / b;
        const a1 = -Math.PI * 0.5 + ((i + 1) * Math.PI * 2) / b;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, r, a0, a1);
        ctx.closePath();
        ctx.fillStyle = i < filled ? "#ff8c3a" : COL.tileOff;
        ctx.fill();
        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (a > b) {
        ctx.fillStyle = COL.pink;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`+${a - b} extra slice!`, px, py + r + 16);
      }

      // Percentage progress bar on right
      const barX = w * 0.55;
      const barW = w * 0.38;
      const barY = cy - 18;
      ctx.fillStyle = COL.grid;
      ctx.fillRect(barX, barY, barW, 28);
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, 28);
      ctx.fillStyle = pct >= 100 ? COL.gold : COL.mint;
      ctx.fillRect(barX + 2, barY + 2, Math.min(barW - 4, (barW - 4) * (pct / 100)), 24);

      if (extras?.expMode) {
        ctx.fillStyle = "rgba(255, 224, 137, 0.22)";
        ctx.fillRect(barX, barY + 42, barW, 22);
        ctx.fillStyle = COL.gold;
        ctx.fillRect(barX, barY + 42, barW * 0.75, 22);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`Target Bakery Box: 3/4 = 75%`, barX, barY + 80);
      }

      ctx.fillStyle = COL.cream;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${a} / ${b} = ${dec} = ${pct.toFixed(1)}%`, barX, barY - 14);
      readout = `${extras?.expMode ? "EXPMT Bakery " : ""}Fraction ${a}/${b} = ${dec} = ${pct.toFixed(1)}%`;
      break;
    }

    case "B3": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const hr = p1;
      const disc = p2;
      const mrp = Math.round(hr * 100);
      const saved = Math.round(mrp * (disc / 100));
      const net = mrp - saved;

      const clkX = w * 0.26;
      const clkY = cy;
      const clkR = Math.min(w, h) * 0.3;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(clkX, clkY, clkR, 0, Math.PI * 2);
      ctx.stroke();

      for (let hTick = 1; hTick <= 12; hTick++) {
        const ang = (hTick / 12) * Math.PI * 2 - Math.PI * 0.5;
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(hTick), clkX + Math.cos(ang) * (clkR - 14), clkY + Math.sin(ang) * (clkR - 14));
      }
      const hAng = ((hr % 12) / 12) * Math.PI * 2 - Math.PI * 0.5;
      const mAng = ((hr % 1) * Math.PI * 2) - Math.PI * 0.5;
      drawArrow(ctx, clkX, clkY, clkX + Math.cos(hAng) * clkR * 0.55, clkY + Math.sin(hAng) * clkR * 0.55, COL.gold, 3);
      drawArrow(ctx, clkX, clkY, clkX + Math.cos(mAng) * clkR * 0.78, clkY + Math.sin(mAng) * clkR * 0.78, COL.pink, 2);

      // Shopping receipt card
      const rx = w * 0.52;
      const ry = 28;
      const rw = w * 0.42;
      const rh = h - 56;
      ctx.fillStyle = COL.grid;
      ctx.strokeStyle = COL.mint;
      ctx.lineWidth = 2;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = COL.cream;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`MRP PRICE : ₹${mrp}`, rx + 14, ry + 32);
      ctx.fillStyle = COL.pink;
      ctx.fillText(`DISC ${Math.round(disc)}% : -₹${saved}`, rx + 14, ry + 58);
      ctx.fillStyle = COL.mint;
      ctx.fillText(`NET BILL  : ₹${net}`, rx + 14, ry + 86);

      if (extras?.expMode) {
        const items = Math.max(1, Math.round(extras?.expCartItems || 1));
        const sub = net * items;
        const gst = Math.round(sub * 0.05);
        const total = sub + gst;
        ctx.fillStyle = COL.gold;
        ctx.font = "bold 11px monospace";
        ctx.fillText(`CART QTY  : ${items} item(s)`, rx + 14, ry + 114);
        ctx.fillText(`5% GST    : +₹${gst}`, rx + 14, ry + 138);
        ctx.fillStyle = COL.cyan;
        ctx.fillText(`GRAND TOT : ₹${total}`, rx + 14, ry + 164);
        readout = `EXPMT Supermarket: ${items}×₹${net} + 5% GST = ₹${total} · Change from ₹2000 = ₹${Math.max(0, 2000 - total)}`;
      } else {
        const hh = Math.floor(hr);
        const mm = Math.round((hr % 1) * 60);
        readout = `Time ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} · MRP ₹${mrp} - ${Math.round(disc)}% = ₹${net}`;
      }
      break;
    }

    case "B4": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const a = Math.round(p1);
      const xVal = p2;
      const lhs = a * xVal + 2;
      const rhs = 10;
      const diff = lhs - rhs;
      const tilt = Math.max(-0.32, Math.min(0.32, diff * 0.032));
      const balanced = Math.abs(diff) < 0.05;

      // Fulcrum
      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 16);
      ctx.lineTo(cx - 24, cy + 78);
      ctx.lineTo(cx + 24, cy + 78);
      ctx.closePath();
      ctx.fill();

      const arm = Math.min(w * 0.34, 175);
      const lx = cx - Math.cos(tilt) * arm;
      const ly = cy + 14 - Math.sin(tilt) * arm;
      const rx = cx + Math.cos(tilt) * arm;
      const ry = cy + 14 + Math.sin(tilt) * arm;

      ctx.strokeStyle = balanced ? COL.mint : COL.cyan;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Pans
      ctx.fillStyle = balanced ? "#1f7a3f" : COL.grid;
      ctx.strokeStyle = balanced ? COL.mint : COL.pink;
      ctx.lineWidth = 2;
      ctx.fillRect(lx - 46, ly - 38, 92, 34);
      ctx.strokeRect(lx - 46, ly - 38, 92, 34);
      ctx.fillRect(rx - 40, ry - 38, 80, 34);
      ctx.strokeRect(rx - 40, ry - 38, 80, 34);

      if (extras?.expMode) {
        for (let i = 0; i < Math.min(6, a); i++) {
          ctx.fillStyle = COL.gold;
          ctx.fillRect(lx - 40 + i * 13, ly - 54, 10, 12);
        }
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = COL.cyan;
          ctx.fillRect(rx - 32 + i * 13, ry - 54, 10, 12);
        }
      }

      ctx.fillStyle = COL.cream;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${a}x+2=${lhs.toFixed(1)}`, lx, ly - 21);
      ctx.fillText(`RHS = 10`, rx, ry - 21);
      readout = `Equation ${a}x + 2 = 10 · With x=${xVal.toFixed(1)} -> LHS=${lhs.toFixed(1)} (${balanced ? "BALANCED!" : diff > 0 ? "LEFT HEAVY" : "RIGHT HEAVY"})`;
      break;
    }

    case "B5": {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, w, h);
      const L = Math.max(2, Math.round(p1));
      const W = Math.max(2, Math.round(p2));
      const area = L * W;
      const perim = 2 * (L + W);
      const tilePx = Math.min(Math.floor((w * 0.56) / L), Math.floor((h - 56) / W), 36);
      const gx = w * 0.08;
      const gy = cy - (W * tilePx) * 0.5;

      for (let r = 0; r < W; r++) {
        for (let c = 0; c < L; c++) {
          const isEdge = r === 0 || c === 0 || r === W - 1 || c === L - 1;
          ctx.fillStyle = isEdge ? "rgba(94, 242, 140, 0.38)" : "rgba(135, 232, 244, 0.28)";
          ctx.strokeStyle = COL.cyan;
          ctx.lineWidth = 1.5;
          ctx.fillRect(gx + c * tilePx, gy + r * tilePx, tilePx - 2, tilePx - 2);
          ctx.strokeRect(gx + c * tilePx, gy + r * tilePx, tilePx - 2, tilePx - 2);
        }
      }
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(gx - 2, gy - 2, L * tilePx + 2, W * tilePx + 2);

      const infoX = gx + L * tilePx + 24;
      ctx.fillStyle = COL.cream;
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Length L = ${L} m`, infoX, cy - 28);
      ctx.fillText(`Width  W = ${W} m`, infoX, cy - 6);
      ctx.fillStyle = COL.mint;
      ctx.fillText(`Area = ${L}×${W} = ${area} tiles`, infoX, cy + 20);
      ctx.fillStyle = COL.gold;
      ctx.fillText(`Perim = 2(${L}+${W}) = ${perim} m`, infoX, cy + 44);

      if (extras?.expMode) {
        const tileCost = area * 50;
        const fenceCost = perim * 25;
        ctx.fillStyle = COL.pink;
        ctx.fillText(`Floor ₹${tileCost} + Fence ₹${fenceCost}`, infoX, cy + 72);
        readout = `EXPMT Floor Tiler: ${area} tiles (₹${tileCost}) · Fence ${perim}m (₹${fenceCost})`;
      } else {
        readout = `Grid ${L} × ${W} · Area = ${area} sq units · Perimeter = ${perim} m`;
      }
      break;
    }

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
      const trials = extras?.expMode ? extras?.expTrials : null;
      const empTotal = trials?.totalRuns || 0;

      probs.forEach((pk, k) => {
        const bh = (pk / maxP) * (h - 46);
        const x = pad + k * (bw + 3);
        ctx.fillStyle = k === activeK ? COL.gold : COL.cyan;
        ctx.fillRect(x, h - 22 - bh, bw, bh);
        if (extras?.expMode && empTotal > 0 && Array.isArray(trials.counts)) {
          const empP = (trials.counts[k] || 0) / empTotal;
          const eh = Math.min(h - 42, (empP / maxP) * (h - 46));
          ctx.fillStyle = "rgba(255, 77, 120, 0.72)";
          ctx.fillRect(x + 2, h - 22 - eh, Math.max(3, bw - 4), eh);
        }
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
      if (extras?.expMode) {
        readout = `EXPMT Live Dice/Coins: ${empTotal} rolls vs Binomial B(${n}, ${p.toFixed(2)}) · μ=${mean}`;
      } else {
        readout = `Binomial B(${n}, ${p.toFixed(2)}) · Mean μ=${mean} · σ=${sd}`;
      }
      break;
    }

    case "07": {
      drawGrid(ctx, w, h, 24);
      const freq = p1;
      const amp = p2;
      if (extras?.expMode) {
        const deg = Math.max(15, Math.min(78, 15 + freq * 13));
        const rad = (deg * Math.PI) / 180;
        const heightM = 12 * amp;
        const shadowM = heightM / Math.tan(rad);
        const baseY = h * 0.8;
        const towerX = w * 0.25;
        const towerH = Math.min(h * 0.54, heightM * 12);
        const shadowPx = Math.min(w * 0.62, shadowM * 12);
        ctx.strokeStyle = COL.axis;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, baseY);
        ctx.lineTo(w - 30, baseY);
        ctx.stroke();
        ctx.fillStyle = COL.cyan;
        ctx.fillRect(towerX - 10, baseY - towerH, 20, towerH);
        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(towerX, baseY);
        ctx.lineTo(towerX + shadowPx, baseY);
        ctx.stroke();
        ctx.strokeStyle = COL.pink;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(towerX - 24, baseY - towerH - 20);
        ctx.lineTo(towerX + shadowPx, baseY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = COL.gold;
        ctx.beginPath();
        ctx.arc(towerX - 28, baseY - towerH - 26, 12, 0, Math.PI * 2);
        ctx.fill();
        readout = `EXPMT Sun Clinometer: θ=${deg.toFixed(1)}° · Height=${heightM.toFixed(1)}m · Shadow=${shadowM.toFixed(1)}m (tanθ=${Math.tan(rad).toFixed(2)})`;
        break;
      }
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
      if (extras?.expMode) {
        ctx.fillStyle = COL.violet;
        ctx.fillRect(0, B[1], B[0] - 8, h - B[1]);
        ctx.fillRect(C[0] + 8, C[1], w - C[0], h - C[1]);
        ctx.strokeStyle = COL.cyan;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(B[0] - 24, B[1]);
        ctx.lineTo(C[0] + 24, C[1]);
        ctx.stroke();
      }
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
      if (extras?.expMode) {
        const loadY = 12 + Math.abs(Math.sin(t * 2.5)) * 18;
        drawArrow(ctx, A[0], A[1] - 30, A[0], A[1] - 4, COL.pink, 3);
        ctx.fillStyle = COL.pink;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`LOAD ${Math.round(loadY * 10)}N`, A[0], A[1] - 38);
      }
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
      readout = `${extras?.expMode ? "EXPMT Bridge Truss · " : ""}Sides (${sideA.toFixed(2)}, ${sideB.toFixed(2)}, ${sideC.toFixed(2)}) · Area=${area.toFixed(2)} · r=${inR.toFixed(2)}, R=${circR.toFixed(2)}`;
      break;
    }

    case "10": {
      drawGrid(ctx, w, h, 24);
      const m = p1;
      const c = p2;
      if (extras?.expMode) {
        const slopeM = Math.max(0.15, Math.min(1.6, Math.abs(m) + 0.25));
        const xLeft = 48;
        const yLeft = Math.max(40, cy - slopeM * 70 + c * 15);
        const xRight = w - 48;
        const yRight = h * 0.78;
        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(xLeft, yLeft);
        ctx.lineTo(xRight, yRight);
        ctx.stroke();
        const frac = (t * (0.35 + slopeM * 0.45)) % 1;
        const cxCar = xLeft + (xRight - xLeft) * frac;
        const cyCar = yLeft + (yRight - yLeft) * frac;
        ctx.fillStyle = COL.pink;
        ctx.fillRect(cxCar - 12, cyCar - 14, 24, 12);
        ctx.fillStyle = COL.cyan;
        ctx.beginPath();
        ctx.arc(cxCar - 7, cyCar, 4, 0, Math.PI * 2);
        ctx.arc(cxCar + 7, cyCar, 4, 0, Math.PI * 2);
        ctx.fill();
        const accel = (9.8 * Math.sin(Math.atan(slopeM))).toFixed(2);
        readout = `EXPMT Galileo Ramp: slope m=${slopeM.toFixed(2)} · Accel a=${accel} m/s²`;
        break;
      }
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
      if (extras?.expMode) {
        const focalPx = Math.max(24, p2 * sc * 0.45);
        const fx = cx - w * 0.22 + focalPx;
        const vertexX = cx - w * 0.22;
        ctx.strokeStyle = COL.cyan;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let dy = -h * 0.36; dy <= h * 0.36; dy += 6) {
          const mx = vertexX + (dy * dy) / (4 * focalPx);
          if (dy === -h * 0.36) ctx.moveTo(mx, cy + dy);
          else ctx.lineTo(mx, cy + dy);
        }
        ctx.stroke();
        [-65, -35, 35, 65].forEach((dy) => {
          const hitX = vertexX + (dy * dy) / (4 * focalPx);
          ctx.strokeStyle = COL.gold;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(w - 14, cy + dy);
          ctx.lineTo(hitX, cy + dy);
          ctx.lineTo(fx, cy);
          ctx.stroke();
        });
        ctx.fillStyle = COL.pink;
        ctx.beginPath();
        ctx.arc(fx, cy, 6 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
        ctx.fill();
        readout = `EXPMT Solar Mirror Focus f=${(focalPx / 40).toFixed(2)}m · Parallel rays converge at Focus F!`;
        break;
      }
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
      if (extras?.expMode) {
        const pivX = w * 0.28;
        const pivY = 26;
        const lenPx = Math.min(h * 0.62, 110);
        const theta = Math.sin(t * 2.2) * (0.45 + Math.abs(p1) * 0.25);
        const bx = pivX + Math.sin(theta) * lenPx;
        const by = pivY + Math.cos(theta) * lenPx;
        ctx.strokeStyle = COL.axis;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pivX, pivY);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.fillStyle = COL.gold;
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.fill();
        const vel = Math.cos(t * 2.2) * 35;
        drawArrow(ctx, bx, by, bx + vel, by - Math.sin(theta) * vel * 0.4, COL.pink, 2.5);
        readout = `EXPMT Pendulum Speedometer: θ=${(theta * 57.3).toFixed(1)}° · Tangential Velocity v=${vel.toFixed(1)} cm/s`;
        break;
      }
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
      if (extras?.expMode) {
        const flightT = (t * 0.7) % 1;
        const rocketY = h * 0.78 - flightT * (h * 0.58) * Math.min(1, b / 2.5);
        const rx = w * 0.9;
        ctx.fillStyle = COL.pink;
        ctx.fillRect(rx - 6, rocketY - 18, 12, 20);
        ctx.fillStyle = COL.gold;
        ctx.beginPath();
        ctx.moveTo(rx - 6, rocketY + 2);
        ctx.lineTo(rx + 6, rocketY + 2);
        ctx.lineTo(rx, rocketY + 14 + Math.random() * 6);
        ctx.fill();
        readout = `EXPMT Rocket Altitude = ∫v(t)dt = ${trueArea.toFixed(2)} km (b=${b.toFixed(2)}s)`;
      } else {
        readout = `∫₀^${b.toFixed(2)} f(x)dx · Riemann(${N})=${riemann.toFixed(3)} · Exact=${trueArea.toFixed(3)} · Err=${err.toFixed(4)}`;
      }
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
      if (extras?.expMode) {
        drawArrow(ctx, cx, cy, cx + ax + bx, cy - by, COL.gold, 3);
        ctx.fillStyle = COL.mint;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`RIVER CROSSING: V_net = V_current + V_boat`, 18, 22);
      } else {
        ctx.strokeStyle = COL.gold;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx + bx, cy - by);
        ctx.lineTo(cx + proj * s, cy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const dot = (bLen * Math.cos(rad)).toFixed(2);
      const crossZ = (bLen * Math.sin(rad)).toFixed(2);
      readout = `${extras?.expMode ? "EXPMT Boat Resultant · " : ""}a·b = ${dot} · |a×b| = ${crossZ} · θ = ${Math.round(p1)}°`;
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
        ctx.fillStyle = btn.on ? "#1f7a3f" : COL.tileOff;
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

    case "20": {
      if (extras?.expMode) {
        drawGrid(ctx, w, h, 24);
        const wheelX = w * 0.24;
        const wheelR = Math.min(w, h) * 0.25;
        const omega = Math.max(0.5, Math.abs(p1) + 0.6);
        const ang = t * omega * 1.4;
        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(wheelX, cy, wheelR, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 8; k++) {
          const a = ang + (k * Math.PI * 2) / 8;
          ctx.strokeStyle = COL.axis;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(wheelX, cy);
          ctx.lineTo(wheelX + Math.cos(a) * wheelR, cy - Math.sin(a) * wheelR);
          ctx.stroke();
        }
        const cabX = wheelX + Math.cos(ang) * wheelR;
        const cabY = cy - Math.sin(ang) * wheelR;
        ctx.fillStyle = COL.pink;
        ctx.beginPath();
        ctx.arc(cabX, cabY, 7, 0, Math.PI * 2);
        ctx.fill();
        const waveX0 = wheelX + wheelR + 18;
        ctx.strokeStyle = COL.cyan;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = waveX0; x < w - 12; x += 3) {
          const wy = cy - Math.sin(ang - (x - waveX0) * 0.045 * omega) * wheelR;
          if (x === waveX0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();
        ctx.strokeStyle = COL.pink;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cabX, cabY);
        ctx.lineTo(waveX0, cabY);
        ctx.stroke();
        ctx.setLineDash([]);
        readout = `EXPMT Ferris Wheel Harmonics: y = R·sin(${omega.toFixed(2)}t) · Height=${(Math.sin(ang) * 15 + 18).toFixed(1)}m`;
        break;
      }
      const unitPx = Math.max(18, Math.min(95, sc * 0.56));
      const panPxX = Number(extras?.panX) || 0;
      const panPxY = Number(extras?.panY) || 0;
      const ox = cx + panPxX;
      const oy = cy + panPxY;
      drawGrid(ctx, w, h, unitPx, panPxX, panPxY);

      const exprA = String(extras?.exprA || "p1 * sin(x) + p2 * 0.4").trim() || "p1 * sin(x) + p2 * 0.4";
      const exprB = String(extras?.exprB || "").trim();
      const polarMode = Boolean(extras?.polarMode);
      const showTangent = extras?.showTangent !== false;
      const showIntegral = Boolean(extras?.showIntegral);
      const traceX = Number.isFinite(Number(extras?.traceX)) ? Number(extras.traceX) : Math.sin(t * 0.6) * 1.4;

      // Numeric tick labels
      ctx.fillStyle = COL.axis;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let gx = -8; gx <= 8; gx++) {
        if (gx === 0) continue;
        const px = ox + gx * unitPx;
        if (px > 12 && px < w - 12) ctx.fillText(String(gx), px, Math.min(h - 14, Math.max(4, oy + 4)));
      }

      if (polarMode) {
        // Concentric polar rings
        ctx.strokeStyle = COL.grid;
        ctx.lineWidth = 1.2;
        for (let rr = 1; rr <= 4; rr++) {
          ctx.beginPath();
          ctx.arc(ox, oy, rr * unitPx, 0, Math.PI * 2);
          ctx.stroke();
        }
        const plotPolar = (raw, strokeColor, lw) => {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lw;
          ctx.beginPath();
          let started = false;
          for (let th = 0; th <= Math.PI * 2 + 0.04; th += 0.025) {
            const rv = evalMathExpr(raw, th, t, p1, p2);
            if (!Number.isFinite(rv) || Math.abs(rv) > 12) {
              started = false;
              continue;
            }
            const px = ox + rv * Math.cos(th) * unitPx;
            const py = oy - rv * Math.sin(th) * unitPx;
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        };
        if (exprB) plotPolar(exprB, COL.pink, 2.0);
        plotPolar(exprA, COL.cyan, 2.7);

        const th0 = ((traceX % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const r0 = evalMathExpr(exprA, th0, t, p1, p2);
        if (Number.isFinite(r0)) {
          const px = ox + r0 * Math.cos(th0) * unitPx;
          const py = oy - r0 * Math.sin(th0) * unitPx;
          drawArrow(ctx, ox, oy, px, py, COL.gold, 2);
          ctx.fillStyle = COL.gold;
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        readout = `POLAR r(θ)=${exprA} · θ=${th0.toFixed(2)} rad · r=${Number.isFinite(r0) ? r0.toFixed(2) : "undef"}`;
      } else {
        const toPx = (x, y) => [ox + x * unitPx, oy - y * unitPx];
        const minX = -ox / unitPx - 0.2;
        const maxX = (w - ox) / unitPx + 0.2;

        // Definite integral shading over [0, 2]
        let integralVal = 0;
        const intA = 0;
        const intB = 2;
        const steps = 40;
        const dxInt = (intB - intA) / steps;
        for (let i = 0; i < steps; i++) {
          const xm = intA + (i + 0.5) * dxInt;
          const ym = evalMathExpr(exprA, xm, t, p1, p2);
          if (Number.isFinite(ym)) integralVal += ym * dxInt;
        }
        if (showIntegral) {
          ctx.fillStyle = "rgba(94, 242, 140, 0.26)";
          ctx.beginPath();
          const [sx0, sy0] = toPx(intA, 0);
          ctx.moveTo(sx0, sy0);
          for (let x = intA; x <= intB + 0.001; x += 0.04) {
            const yv = evalMathExpr(exprA, x, t, p1, p2);
            const [px, py] = toPx(x, Number.isFinite(yv) ? Math.max(-10, Math.min(10, yv)) : 0);
            ctx.lineTo(px, py);
          }
          const [sx1] = toPx(intB, 0);
          ctx.lineTo(sx1, sy0);
          ctx.closePath();
          ctx.fill();
        }

        const plotCartesian = (raw, strokeColor, lw) => {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lw;
          ctx.beginPath();
          let started = false;
          let prevYv = 0;
          const dx = Math.max(0.015, (maxX - minX) / 220);
          for (let x = minX; x <= maxX; x += dx) {
            const yv = evalMathExpr(raw, x, t, p1, p2);
            if (!Number.isFinite(yv) || Math.abs(yv) > 14 || (started && Math.abs(yv - prevYv) > 6)) {
              started = false;
              prevYv = yv;
              continue;
            }
            const [px, py] = toPx(x, yv);
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
            prevYv = yv;
          }
          ctx.stroke();
        };

        if (exprB) plotCartesian(exprB, COL.pink, 2.0);
        plotCartesian(exprA, COL.cyan, 2.7);

        // Crosshair trace, tangent & normal lines at traceX
        const y0 = evalMathExpr(exprA, traceX, t, p1, p2);
        const hEps = 0.002;
        const yPlus = evalMathExpr(exprA, traceX + hEps, t, p1, p2);
        const yMinus = evalMathExpr(exprA, traceX - hEps, t, p1, p2);
        const slope = Number.isFinite(yPlus) && Number.isFinite(yMinus) ? (yPlus - yMinus) / (2 * hEps) : Number.NaN;

        if (Number.isFinite(y0)) {
          const [tx, ty] = toPx(traceX, y0);
          ctx.strokeStyle = COL.axis;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(tx, 0);
          ctx.lineTo(tx, h);
          ctx.moveTo(0, ty);
          ctx.lineTo(w, ty);
          ctx.stroke();
          ctx.setLineDash([]);

          if (showTangent && Number.isFinite(slope)) {
            const [t1x, t1y] = toPx(traceX - 1.5, y0 - slope * 1.5);
            const [t2x, t2y] = toPx(traceX + 1.5, y0 + slope * 1.5);
            ctx.strokeStyle = COL.gold;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(t1x, t1y);
            ctx.lineTo(t2x, t2y);
            ctx.stroke();

            if (Math.abs(slope) > 0.04) {
              const normSlope = -1 / slope;
              const [n1x, n1y] = toPx(traceX - 0.85, y0 - normSlope * 0.85);
              const [n2x, n2y] = toPx(traceX + 0.85, y0 + normSlope * 0.85);
              ctx.strokeStyle = COL.violet;
              ctx.setLineDash([5, 4]);
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(n1x, n1y);
              ctx.lineTo(n2x, n2y);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          ctx.fillStyle = COL.gold;
          ctx.beginPath();
          ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }
        const fStr = Number.isFinite(y0) ? y0.toFixed(2) : "undef";
        const dfStr = Number.isFinite(slope) ? slope.toFixed(2) : "--";
        const intStr = showIntegral ? ` · ∫₀²=${integralVal.toFixed(2)}` : "";
        readout = `f(x)=${exprA} · (${traceX.toFixed(2)}, ${fStr}) · f'=${dfStr}${intStr}`;
      }
      break;
    }
  }

  drawStatusOverlay(ctx, w, extras);
  return readout;
}

export function evaluateChapterMission(chapterId, p1, p2) {
  switch (chapterId) {
    case "B1": {
      const a = Math.round(p1);
      const b = Math.round(p2);
      const sum = a + b;
      return {
        solved: sum === 20 && b >= 5,
        currentLabel: `${a} + (${b}) = ${sum} (target 20 with Jump B ≥ 5)`,
      };
    }
    case "B2": {
      const b = Math.max(2, Math.round(p2));
      const a = Math.max(1, Math.round(p1));
      const pct = (a / b) * 100;
      return {
        solved: Math.abs(pct - 75) <= 0.5,
        currentLabel: `${a}/${b} = ${pct.toFixed(1)}% (target 75%)`,
      };
    }
    case "B3": {
      const mrp = Math.round(p1 * 100);
      const net = Math.round(mrp * (1 - p2 / 100));
      return {
        solved: net === 600,
        currentLabel: `Net Bill = ₹${net} (target ₹600)`,
      };
    }
    case "B4": {
      const a = Math.round(p1);
      const lhs = a * p2 + 2;
      return {
        solved: Math.abs(lhs - 10) < 0.05,
        currentLabel: `${a}(${p2.toFixed(1)}) + 2 = ${lhs.toFixed(1)} (target 10.0)`,
      };
    }
    case "B5": {
      const L = Math.round(p1);
      const W = Math.round(p2);
      const area = L * W;
      const perim = 2 * (L + W);
      return {
        solved: area === 24 && perim === 20,
        currentLabel: `Area = ${area} (target 24) · Perim = ${perim} (target 20)`,
      };
    }
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
      return {
        solved: Math.round(p1) === 3 && p2 >= 0.85,
        currentLabel: `Set Op = ${Math.round(p1)} (target 3: A△B) · Overlap = ${p2.toFixed(2)} (≥ 0.85)`,
      };
    case "20":
    default:
      return {
        solved: p1 >= 1.0 && Math.abs(p2) <= 0.16,
        currentLabel: `Scale k = ${p1.toFixed(1)} (≥ 1.0) · Shift b = ${p2.toFixed(1)} (within ±0.15)`,
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
    case "B1":
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
    case "B2": {
      const b = Math.max(2, Math.round(curP2));
      const a = Math.max(1, Math.min(ch.p1Max, Math.round(nx * b)));
      return {
        p1: isClick ? a : quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
    }
    case "B3":
    case "B4":
    case "B5":
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
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
    case "20":
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
    default:
      return {
        p1: quantize(lerp(ch.p1Min, ch.p1Max, nx), ch.p1Min, ch.p1Max, ch.p1Step),
        p2: quantize(lerp(ch.p2Min, ch.p2Max, 1 - ny), ch.p2Min, ch.p2Max, ch.p2Step),
      };
  }
}

export function getStepByStepBreakdown(chapterId, p1, p2, extras = {}) {
  switch (chapterId) {
    case "B1": {
      const a = Math.round(p1);
      const b = Math.round(p2);
      const s = a + b;
      return `Step 1: Start at ${a} on number line · Step 2: Jump ${b >= 0 ? "+" : ""}${b} -> ${s} (${Math.floor(Math.abs(s) / 10)} tens, ${Math.abs(s) % 10} ones)`;
    }
    case "B2": {
      const a = Math.round(p1);
      const b = Math.max(2, Math.round(p2));
      return `Step 1: Fraction ${a}/${b} = ${(a / b).toFixed(3)} · Step 2: Percent = (${a} ÷ ${b}) × 100 = ${((a / b) * 100).toFixed(1)}%`;
    }
    case "B3": {
      const mrp = Math.round(p1 * 100);
      const saved = Math.round(mrp * (p2 / 100));
      return `Step 1: MRP = ₹${mrp}, Discount = ${Math.round(p2)}% (₹${saved}) · Step 2: Net Payable = ₹${mrp - saved}`;
    }
    case "B4": {
      const a = Math.round(p1);
      const sol = (8 / Math.max(1, a)).toFixed(2);
      return `Step 1: ${a}x + 2 = 10 -> subtract 2 -> ${a}x = 8 · Step 2: Exact x = 8/${a} = ${sol} (your x=${p2.toFixed(1)})`;
    }
    case "B5": {
      const L = Math.round(p1);
      const W = Math.round(p2);
      return `Step 1: Area = L × W = ${L} × ${W} = ${L * W} · Step 2: Perimeter = 2(${L} + ${W}) = ${2 * (L + W)} m`;
    }
    case "00":
      return `Step 1: Apply M=[[1,${p1.toFixed(2)}],[0,${p2.toFixed(2)}]] · Step 2: Area det(M) = 1×${p2.toFixed(2)} = ${p2.toFixed(2)}`;
    case "01": {
      const n = Math.max(3, Math.round(p1));
      return `Step 1: z^${n}=1 ⇒ θₖ = (${Math.round(p2)}° + 360°k)/${n} · Step 2: Modulus |z|=1, sum of roots = 0`;
    }
    case "02": {
      const det = Math.sin(((p2 - p1) * Math.PI) / 180);
      return `Step 1: Angle gap Δθ = ${Math.round(p2 - p1)}° · Step 2: det = sin(Δθ) = ${det.toFixed(3)} ${Math.abs(det) < 0.08 ? "⇒ Non-invertible" : "⇒ Invertible"}`;
    }
    case "03": {
      const n = Math.max(3, Math.min(8, Math.round(p1)));
      const r = Math.max(1, Math.min(n, Math.round(p2)));
      return `Step 1: ${n}C${r} = ${n}!/[${r}!(${n}-${r})!] = ${nCr(n, r)} · Step 2: ${n}P${r} = ${r}!×${nCr(n, r)} = ${Math.round(fact(n) / fact(n - r))}`;
    }
    case "05":
      return `Step 1: Sₙ = (1 - rⁿ)/(1 - r) for r=${p1.toFixed(2)} · Step 2: ${Math.abs(p1) < 1 ? `S∞ = 1/(1 - ${p1.toFixed(2)}) = ${(1 / (1 - p1)).toFixed(3)}` : "|r| ≥ 1 diverges"}`;
    case "06": {
      const n = Math.max(4, Math.round(p2));
      return `Step 1: μ = n·p = ${n}×${p1.toFixed(2)} = ${(n * p1).toFixed(2)} · Step 2: σ = √(np(1-p)) = ${Math.sqrt(n * p1 * (1 - p1)).toFixed(2)}`;
    }
    case "07":
      return `Step 1: y(t) = ${p2.toFixed(2)}·sin(${p1.toFixed(2)}t) · Step 2: Period T = 2π/${p1.toFixed(2)} = ${((Math.PI * 2) / p1).toFixed(2)}s`;
    case "10":
      return `Step 1: Line y = ${p1.toFixed(1)}x + ${p2.toFixed(1)} · Step 2: Dist to origin = |${p2.toFixed(1)}|/√(${p1.toFixed(1)}²+1) = ${(Math.abs(p2) / Math.hypot(p1, 1)).toFixed(2)}`;
    case "12":
      return `Step 1: r(θ) = e·p/(1 + e·cosθ) · Step 2: e=${p1.toFixed(2)} classifies ${p1 < 0.05 ? "Circle" : p1 < 0.98 ? "Ellipse" : p1 <= 1.02 ? "Parabola" : "Hyperbola"}`;
    case "13": {
      const val = 0.28 * p1 ** 3 - 0.85 * p1;
      const sl = 0.84 * p1 * p1 - 0.85;
      return `Step 1: f(${p1.toFixed(2)}) = 0.28x³ - 0.85x = ${val.toFixed(2)} · Step 2: f'(x) = 0.84x² - 0.85 = ${sl.toFixed(3)}`;
    }
    case "14": {
      const N = Math.max(4, Math.round(p1));
      const exact = 0.9 * (1 - Math.cos(p2)) + 0.55 * p2;
      return `Step 1: Slice Δx = ${p2.toFixed(2)}/${N} = ${(p2 / N).toFixed(3)} · Step 2: Exact ∫₀^${p2.toFixed(2)} f(x)dx = ${exact.toFixed(3)}`;
    }
    case "20": {
      const exprA = String(extras?.exprA || "p1 * sin(x) + p2 * 0.4");
      const x0 = Number.isFinite(Number(extras?.traceX)) ? Number(extras.traceX) : 0;
      const y0 = evalMathExpr(exprA, x0, 0, p1, p2);
      const yp = evalMathExpr(exprA, x0 + 0.002, 0, p1, p2);
      const ym = evalMathExpr(exprA, x0 - 0.002, 0, p1, p2);
      const slope = Number.isFinite(yp) && Number.isFinite(ym) ? (yp - ym) / 0.004 : Number.NaN;
      return `Step 1: Eval ${exprA} at x=${x0.toFixed(2)} ⇒ ${Number.isFinite(y0) ? y0.toFixed(2) : "--"} · Step 2: Numeric Tangent f'(x)=${Number.isFinite(slope) ? slope.toFixed(2) : "--"}`;
    }
    default:
      return `Step 1: Tune P1=${p1.toFixed(2)}, P2=${p2.toFixed(2)} · Step 2: Inspect live vector & curve solver in canvas above.`;
  }
}

export function sampleCurveAudioValue(chapterId, p1, p2, phase, extras = {}) {
  const x = (phase % (Math.PI * 2)) - Math.PI;
  if (chapterId === "B1") return Math.sin(x * 1.5 + (p1 + p2) * 0.15) * 0.55;
  if (chapterId === "B2") return Math.sin(x * (p1 / Math.max(1, p2)) * 2.5) * 0.6;
  if (chapterId === "B3") return Math.cos(x * (p1 * 0.25)) * 0.5;
  if (chapterId === "B4") return Math.tanh((p1 * p2 - 8) * 0.2) * 0.7;
  if (chapterId === "B5") return Math.sin(x * (p1 * 0.2 + p2 * 0.2)) * 0.6;
  if (chapterId === "20") {
    const v = evalMathExpr(String(extras?.exprA || "p1 * sin(x) + p2 * 0.4"), x, phase * 0.25, p1, p2);
    return Number.isFinite(v) ? Math.tanh(v * 0.45) : 0;
  }
  if (chapterId === "07") return Math.max(-1, Math.min(1, p2 * Math.sin(x * p1)));
  if (chapterId === "13") return Math.tanh(0.28 * x ** 3 - 0.85 * x + p1 * 0.2);
  if (chapterId === "14") return Math.tanh(Math.sin(Math.abs(x)) * 0.9 + (p2 - 1.5) * 0.25);
  return Math.sin(x * (1 + Math.abs(p1) * 0.5) + p2 * 0.6) * 0.65;
}

