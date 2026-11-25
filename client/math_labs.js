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
  orange: "#ff9a3c",
  water: "#3484c8",
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
  orange: "#c25900",
  water: "#1a659e",
  pillBg: "rgba(255, 255, 255, 0.94)",
  tileOff: "#dfd8c2",
};

let COL = { ...DARK_COL };

function applyLabTheme(extras) {
  COL = extras?.theme === "paper" ? { ...PAPER_COL } : { ...DARK_COL };
}

function drawGrid(ctx, w, h, step = 28) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function drawTag(ctx, x, y, text, color = COL.gold, bg = COL.grid) {
  ctx.save();
  ctx.font = "bold 11px monospace";
  const padX = 7;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = bg;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(x, y, tw + padX * 2, 20, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + 10.5);
  ctx.restore();
}

function compassLabelForDeg(deg) {
  const norm = ((Math.round(deg) % 360) + 360) % 360;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(norm / 22.5) % 16];
}

function formatTime12(hr) {
  const whole = Math.floor(hr);
  const mins = Math.round((hr - whole) * 60);
  const suf = whole >= 12 ? "PM" : "AM";
  const h12 = whole % 12 === 0 ? 12 : whole % 12;
  return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${suf}`;
}

export function evaluateChapterMission(chapterId, p1, p2) {
  switch (chapterId) {
    case "B1": {
      const deg = ((Math.round(p1) % 360) + 360) % 360;
      const hr = Math.round(p2);
      const solved = deg === 90 && hr === 9;
      return { solved, currentLabel: `Bearing=${deg}° (${compassLabelForDeg(deg)}), Sun=${hr}:00` };
    }
    case "B2": {
      const dist = Number((p1 * p2).toFixed(1));
      const solved = Math.abs(dist - 100) < 0.1;
      return { solved, currentLabel: `1cm=${p1}km × ${p2}cm = ${dist} km` };
    }
    case "B3": {
      const solved = p1 >= 23 && p1 <= 24;
      return { solved, currentLabel: `Latitude=${p1}°N, Zone=${p2}` };
    }
    case "B4": {
      const eraNames = ["", "Barter", "Silver Coin", "RBI Rupee", "Digital UPI"];
      const solved = Math.round(p2) === 4 && p1 >= 10;
      return { solved, currentLabel: `Units=${p1}, Era=${eraNames[Math.round(p2)] || p2}` };
    }
    case "B5": {
      const solved = p1 >= 3 && p2 >= 200;
      return { solved, currentLabel: `Era Stage=${p1}, Pop=${p2}` };
    }
    case "00": {
      const pillars = ["", "History", "Geography", "Civics", "Economics"];
      const solved = Math.round(p1) === 4 && p2 >= 8;
      return { solved, currentLabel: `Pillar=${pillars[Math.round(p1)] || p1}, Span=${p2}` };
    }
    case "01": {
      const solved = p1 >= 6 && p2 >= 7;
      return { solved, currentLabel: `Blocks=${p1}, Drain Slope=${p2}/10` };
    }
    case "02": {
      const solved = p1 >= 18 && Math.round(p2) === 5;
      return { solved, currentLabel: `Reach=${p1 * 100} km, Provinces=${p2}/5` };
    }
    case "03": {
      const solved = p1 >= 12 && Math.round(p2) === 7;
      return { solved, currentLabel: `Span=${p1}m, Zat=${p2 * 1000}` };
    }
    case "04": {
      const solved = Math.round(p1) === 1947 && p2 >= 100;
      return { solved, currentLabel: `Year=${Math.round(p1)}, Reach=${p2}%` };
    }
    case "05": {
      const solved = p1 >= 8 && p2 >= 8;
      return { solved, currentLabel: `Steam=${p1}, Print=${p2}` };
    }
    case "06": {
      const solved = p1 >= 0.8 && p2 >= 8;
      return { solved, currentLabel: `Co-op=${Math.round(p1 * 100)}%, Blocs=${p2}` };
    }
    case "07": {
      const solved = Math.abs(p1 - 82.5) < 0.2 && p2 >= 20 && p2 <= 30;
      return { solved, currentLabel: `Lon=${p1}°, Lat=${p2}°` };
    }
    case "08": {
      const solved = p1 >= 5 && p2 >= 7.0;
      return { solved, currentLabel: `Plate=${p1} cm/yr, M=${p2.toFixed(1)}` };
    }
    case "09": {
      const solved = p1 >= 16 && p2 >= 85;
      return { solved, currentLabel: `ΔT=${p1}°C, Humidity=${p2}%` };
    }
    case "10": {
      const solved = p1 >= 30 && p2 >= 1500;
      return { solved, currentLabel: `Snowmelt=${p1}%, Rain=${p2}mm` };
    }
    case "11": {
      const soils = ["", "Alluvial", "Black Regur", "Red Iron", "Laterite"];
      const solved = Math.round(p1) === 2 && p2 >= 60 && p2 <= 75;
      return { solved, currentLabel: `${soils[Math.round(p1)] || "Soil"}, Moisture=${p2}%` };
    }
    case "12": {
      const clean = p1 + p2;
      const solved = clean >= 75 && clean <= 100;
      return { solved, currentLabel: `Clean=${clean}% (${p1}% Solar/Wind + ${p2}% Hydro)` };
    }
    case "13": {
      const solved = Math.round(p1) === 6 && p2 >= 100;
      return { solved, currentLabel: `Right #${Math.round(p1)}, Awareness=${p2}%` };
    }
    case "14": {
      const total = Math.min(543, Math.round(p1 + p2));
      const solved = total >= 362;
      return { solved, currentLabel: `${total}/543 Seats (Special 2/3 = 362)` };
    }
    case "15": {
      const sum = p1 + p2;
      const solved = p1 >= 45 && sum <= 90;
      return { solved, currentLabel: `Local=${p1}%, State=${p2}%, Union=${Math.max(0, 100 - sum)}%` };
    }
    case "16": {
      const tiers = ["", "District", "High Court", "Supreme Court"];
      const solved = Math.round(p2) === 3 && p1 >= 9;
      return { solved, currentLabel: `${tiers[Math.round(p2)] || "Court"}, Autonomy=${p1}/10` };
    }
    case "17": {
      const solved = Math.round(p1) === 15 && Math.round(p2) === 5;
      return { solved, currentLabel: `UNSC Votes=${p1}/15, P5 Concur=${p2}/5` };
    }
    case "18": {
      const pStar = Number(((p1 - (20 - p2)) / 2).toFixed(1));
      const qStar = Number((p1 - pStar).toFixed(1));
      const solved = qStar >= 50 && pStar <= 45;
      return { solved, currentLabel: `P*=₹${pStar}, Q*=${qStar} units` };
    }
    case "19": {
      const pri = Math.max(0, 100 - p1 - p2);
      const solved = p1 >= 32 && p2 >= 52 && pri >= 10;
      return { solved, currentLabel: `Pri=${pri}%, Ind=${p1}%, Svc=${p2}%` };
    }
    case "20":
    default: {
      const solved = Math.abs(p1 - 75) < 1 && Math.abs(p2 - 25) < 1;
      return { solved, currentLabel: `Meridian=${p1}°, Tropic Tilt=${p2}°` };
    }
  }
}

export function mapCanvasPointerToParams(chapterId, nx, ny, p1, p2, ch) {
  const cx = Math.max(0, Math.min(1, nx));
  const cy = Math.max(0, Math.min(1, ny));
  const snap = (val, min, max, step) => {
    const clamped = Math.max(min, Math.min(max, val));
    const k = Math.round((clamped - min) / step);
    return Number((min + k * step).toFixed(4));
  };

  if (chapterId === "B1") {
    const angle = (Math.atan2(cx - 0.5, -(cy - 0.5)) * 180) / Math.PI;
    const deg = ((angle % 360) + 360) % 360;
    return {
      p1: snap(deg, ch.p1Min, ch.p1Max, ch.p1Step),
      p2: snap(ch.p2Min + cx * (ch.p2Max - ch.p2Min), ch.p2Min, ch.p2Max, ch.p2Step),
    };
  }
  return {
    p1: snap(ch.p1Min + cx * (ch.p1Max - ch.p1Min), ch.p1Min, ch.p1Max, ch.p1Step),
    p2: snap(ch.p2Min + (1 - cy) * (ch.p2Max - ch.p2Min), ch.p2Min, ch.p2Max, ch.p2Step),
  };
}

export function getStepByStepBreakdown(chapterId, p1, p2, extras) {
  switch (chapterId) {
    case "B1": {
      const dir = compassLabelForDeg(p1);
      const shadowDir = p2 < 12 ? "West" : p2 > 12 ? "East" : "Directly Under";
      return `Bearing: ${Math.round(p1)}° (${dir}) · Sun Time: ${formatTime12(p2)} · Shadow points ${shadowDir}`;
    }
    case "B2":
      return `Map Distance = ${p2} cm · Scale: 1 cm = ${p1} km -> Ground Distance = ${(p1 * p2).toFixed(1)} km`;
    case "B3": {
      const belt = p1 >= 30 ? "Himalayan & Trans-Himalayan" : p1 >= 24 ? "Great Northern Plains" : p1 >= 15 ? "Peninsular Deccan Plateau" : "Coastal Plains & Islands";
      return `Latitude ${p1}°N -> ${belt} · Elevation Tier ${p2}/5 · Tropic of Cancer = 23.5°N`;
    }
    case "B4": {
      const eras = ["", "Barter Goods", "Punch/Silver Rupiya", "RBI Paper Notes", "Instant Digital UPI"];
      return `Era: ${eras[Math.round(p2)] || p2} · Trade Volume: ${p1} bags (₹${p1 * 120}) · Zero double-coincidence friction in Era ≥ 2`;
    }
    case "B5": {
      const stages = ["", "Paleolithic", "Mesolithic", "Neolithic Farming", "Chalcolithic Wheel", "Early Civic Towns"];
      return `Stage ${p1}: ${stages[Math.round(p1)] || ""} · Community = ${p2} residents · Surplus grain unlocks craft guilds`;
    }
    case "00": {
      const names = ["", "History (Time & Sources)", "Geography (Maps & Climate)", "Civics (Rights & Law)", "Economics (Markets & GDP)"];
      return `Active Lens: ${names[Math.round(p1)] || ""} · Chronicle Window: ${p2 * 250} Years · All 4 SST lenses connected`;
    }
    case "01":
      return `Mohenjo-daro Citadel: ${p1}×${p1} Street Blocks · Drain Fall: ${p2}/10 · Standard Brick Ratio = 1 : 2 : 4`;
    case "02":
      return `Mauryan Capital: Pataliputra -> Radius ${p1 * 100} km across ${p2}/5 Provinces · Script: Brahmi / Prakrit`;
    case "03":
      return `Keystone True Arch Span = ${p1} m · Mansabdar Rank: ${p2 * 1000} Zat · Policy: Sulh-i-Kul & Zabt Survey`;
    case "04": {
      const y = Math.round(p1);
      const mil = y < 1885 ? "1857 First War of Independence" : y < 1920 ? "1905 Swadeshi & Boycott" : y < 1935 ? "1930 Dandi Salt Satyagraha" : y < 1945 ? "1942 Quit India" : "1947 Independence & Constitution";
      return `Year ${y} AD (${mil}) · Mass Civic Mobilization: ${p2}%`;
    }
    case "05":
      return `Industrial Steam RPM: ${p1}x · Gutenberg Press Scale: ${p2}x -> Literacy Index = ${Math.min(100, Math.round((p1 + p2) * 5))}%`;
    case "06":
      return `Diplomacy: ${p2} Power Blocs · Multilateral Co-op = ${Math.round(p1 * 100)}% -> Peace Stability = ${Math.round(p1 * 80 + Math.min(20, p2 * 2))}%`;
    case "07": {
      const mins = Math.round(p1 * 4);
      const sign = mins >= 0 ? "+" : "-";
      const ah = Math.floor(Math.abs(mins) / 60);
      const am = Math.abs(mins) % 60;
      return `Coords: ${p2}°N, ${p1}°E · Earth = 4 min/° -> GMT ${sign}${ah}h ${String(am).padStart(2, "0")}m (IST 82.5°E = +5h 30m)`;
    }
    case "08": {
      const energy = Math.pow(10, p2 - 3).toFixed(1);
      return `Plate Drift: ${p1} cm/yr · Quake M${p2.toFixed(1)} -> Relative Seismic Energy ≈ ${energy}× Base · P-waves arrive first`;
    }
    case "09": {
      const rain = Math.round(p1 * 42 + p2 * 14);
      return `Land-Sea ΔT = ${p1}°C · RH = ${p2}% · Estimated SW Monsoon Rainfall = ${rain} mm (Coriolis -> SW -> NE)`;
    }
    case "10":
      return `River Regime: ${p1}% Glacier Snowmelt + ${p2} mm Rain -> Dry-Season Baseflow ${p1 >= 25 ? "Perennial" : "Seasonal"}`;
    case "11": {
      const crops = ["", "Alluvial: Rice & Wheat", "Black Regur: Cotton & Soy", "Red Iron: Millets & Groundnut", "Laterite: Tea, Coffee & Cashew"];
      return `${crops[Math.round(p1)] || ""} · Soil Moisture = ${p2}% · Seasons: Kharif (Jun) / Rabi (Oct) / Zaid`;
    }
    case "12": {
      const clean = p1 + p2;
      const fossil = Math.max(0, 100 - clean);
      return `Grid Mix: ${p1}% Solar+Wind + ${p2}% Hydro/Nuc = ${clean}% Clean · Thermal Fossil = ${fossil}%`;
    }
    case "13": {
      const rights = ["", "Right to Equality (Art 14-18)", "Right to Freedom (Art 19-22)", "Against Exploitation (Art 23-24)", "Freedom of Religion (Art 25-28)", "Cultural & Ed Rights (Art 29-30)", "Constitutional Remedies (Art 32)"];
      return `Active Article: ${rights[Math.round(p1)] || ""} · Awareness Score: ${p2}% · Republic Day: 26 Jan 1950`;
    }
    case "14": {
      const tot = Math.min(543, Math.round(p1 + p2));
      const status = tot >= 362 ? "2/3 Special Majority" : tot >= 272 ? "Simple Majority (Govt Formed)" : "Hung Parliament (<272)";
      return `Lok Sabha: ${p1} + ${p2} Allies = ${tot} / 543 Seats -> ${status}`;
    }
    case "15": {
      const union = Math.max(0, 100 - p1 - p2);
      return `Fiscal Devolution -> Gram/Urban Local: ${p1}% | State Govt: ${p2}% | Union Govt: ${union}% (73rd/74th Amend)`;
    }
    case "16": {
      const tiers = ["", "District & Sessions Court", "State High Court", "Supreme Court of India"];
      return `Bench: ${tiers[Math.round(p2)] || ""} · Judicial Autonomy: ${p1}/10 · PIL & Judicial Review guard Constitution`;
    }
    case "17": {
      const vetoed = p2 < 5;
      const ok = p1 >= 9 && !vetoed;
      return `UNSC Resolution: ${p1}/15 Votes, ${p2}/5 P5 Concur -> ${ok ? "ADOPTED" : vetoed ? "BLOCKED BY P5 VETO" : "NEEDS 9/15"}`;
    }
    case "18": {
      const pStar = Number(((p1 - (20 - p2)) / 2).toFixed(1));
      const qStar = Number((p1 - pStar).toFixed(1));
      return `Qd = ${p1} - P | Qs = ${20 - p2} + P -> Equilibrium P* = ₹${pStar}, Traded Quantity Q* = ${qStar} units`;
    }
    case "19": {
      const pri = Math.max(0, 100 - p1 - p2);
      return `India GDP Composition -> Primary: ${pri}% · Secondary Industry: ${p1}% · Tertiary Services: ${p2}%`;
    }
    case "20":
    default: {
      const proj = extras?.polarMode ? "Polar Azimuthal" : "Equirectangular Atlas";
      const rA = extras?.exprA || "Mumbai -> Suez -> London";
      const rB = extras?.exprB || "Silk Route (Xi'an -> Rome)";
      return `${proj} · Center Meridian ${p1}°E | Tilt ${p2}° · Route A: ${rA} | Route B: ${rB}`;
    }
  }
}

export function sampleCurveAudioValue(chapterId, p1, p2, phase) {
  switch (chapterId) {
    case "08":
      return Math.sin(phase * (1 + p1 * 0.15)) * (p2 / 9) * Math.exp(-0.08 * (phase % 6));
    case "09":
    case "10":
      return Math.sin(phase * 0.9) * (p2 / 2400 + 0.35);
    case "18":
      return ((p1 - p2) / 140) * 0.7 + Math.sin(phase) * 0.25;
    default:
      return Math.sin(phase + Number(p1 || 1) * 0.12) * 0.55;
  }
}

export function renderChapterLabFrame(ctx, w, h, chapterId, p1, p2, t, extras = {}) {
  applyLabTheme(extras);
  drawGrid(ctx, w, h, 30);

  const cx = w * 0.5;
  const cy = h * 0.52;
  const minDim = Math.min(w, h);

  switch (chapterId) {
    case "B1": {
      const r = minDim * 0.32;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      const cardinals = [
        ["N", 0, COL.pink],
        ["E", 90, COL.mint],
        ["S", 180, COL.cyan],
        ["W", 270, COL.gold],
      ];
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const [lbl, deg, col] of cardinals) {
        const a = ((deg - 90) * Math.PI) / 180;
        ctx.fillStyle = col;
        ctx.fillText(lbl, cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18));
      }

      // Sun & live shadow vector across dial center
      const sunProg = (p2 - 6) / 12;
      const sunX = w * 0.15 + sunProg * (w * 0.7);
      const sunY = h * 0.18 + Math.pow((sunProg - 0.5) * 2, 2) * (h * 0.16);
      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 12, 0, Math.PI * 2);
      ctx.fill();

      const shadowDx = (0.5 - sunProg) * r * 1.15;
      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + shadowDx, cy + 16);
      ctx.stroke();

      // Compass needle pointing at Bearing p1
      const na = ((p1 - 90) * Math.PI) / 180;
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12));
      ctx.stroke();
      ctx.fillStyle = COL.cream;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      drawTag(ctx, 14, 14, `BEARING: ${Math.round(p1)}° ${compassLabelForDeg(p1)}`, COL.gold);
      drawTag(ctx, w - 165, 14, `SUN: ${formatTime12(p2)}`, COL.cyan);
      return `Bearing ${Math.round(p1)}° (${compassLabelForDeg(p1)}) | Sun ${formatTime12(p2)}`;
    }

    case "B2": {
      const marginX = 48;
      const boxW = w - marginX * 2;
      const boxH = h - 92;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2;
      ctx.strokeRect(marginX, 46, boxW, boxH);

      // River curve + railway line + mountain symbol
      ctx.strokeStyle = COL.water;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(marginX + 12, 46 + boxH * 0.72);
      ctx.bezierCurveTo(cx - 40, 46 + boxH * 0.35, cx + 40, 46 + boxH * 0.85, marginX + boxW - 12, 46 + boxH * 0.55);
      ctx.stroke();

      // Drawn linear span
      const spanFrac = Math.min(1, p2 / 12);
      const xStart = marginX + 28;
      const xEnd = xStart + (boxW - 56) * spanFrac;
      const routeY = 46 + boxH * 0.36;
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(xStart, routeY);
      ctx.lineTo(xEnd, routeY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(xStart, routeY, 7, 0, Math.PI * 2);
      ctx.arc(xEnd, routeY, 7, 0, Math.PI * 2);
      ctx.fill();

      const totalKm = (p1 * p2).toFixed(1);
      drawTag(ctx, 14, 12, `SCALE: 1 cm = ${p1} km`, COL.cyan);
      drawTag(ctx, w - 210, 12, `DISTANCE: ${p2} cm = ${totalKm} km`, COL.mint);
      return `Scale 1 cm : ${p1} km | ${p2} cm = ${totalKm} km`;
    }

    case "B3": {
      const zones = [
        { name: "Himalayas", lat: 33, elev: 92, col: COL.cream },
        { name: "N. Plains", lat: 27, elev: 28, col: COL.mint },
        { name: "Thar Desert", lat: 26, elev: 34, col: COL.gold },
        { name: "Deccan Plateau", lat: 18, elev: 54, col: COL.orange },
        { name: "Coasts & Islands", lat: 10, elev: 14, col: COL.water },
      ];
      const barW = Math.min(82, (w - 80) / zones.length);
      const baseY = h - 46;
      zones.forEach((z, idx) => {
        const bx = 42 + idx * (barW + 14);
        const bh = (z.elev / 100) * (h - 125);
        const active = idx + 1 === Math.round(p2) || Math.abs(p1 - z.lat) <= 3;
        ctx.fillStyle = z.col;
        ctx.globalAlpha = active ? 0.96 : 0.45;
        ctx.fillRect(bx, baseY - bh, barW, bh);
        ctx.globalAlpha = 1;
        if (active) {
          ctx.strokeStyle = COL.pink;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(bx - 2, baseY - bh - 2, barW + 4, bh + 4);
        }
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(z.name, bx + barW * 0.5, baseY + 16);
      });
      drawTag(ctx, 14, 14, `INDIA LATITUDE: ${p1}°N`, COL.gold);
      drawTag(ctx, w - 195, 14, `ZONE #${Math.round(p2)} / TROPIC 23.5°N`, COL.mint);
      return `Lat ${p1}°N | Physiographic Zone ${p2}/5`;
    }

    case "B4": {
      const eras = ["", "1. Barter Trade", "2. Silver Rupiya", "3. Paper Rupee ₹", "4. Instant UPI QR"];
      const era = Math.round(p2);
      const cards = 4;
      const cw = Math.min(115, (w - 90) / cards);
      for (let i = 1; i <= cards; i++) {
        const x = 35 + (i - 1) * (cw + 14);
        const active = i === era;
        ctx.fillStyle = active ? COL.mint : COL.grid;
        ctx.globalAlpha = active ? 0.25 : 0.7;
        ctx.strokeStyle = active ? COL.mint : COL.axis;
        ctx.lineWidth = active ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, 78, cw, h - 135, 10);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = active ? COL.gold : COL.cream;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(eras[i], x + cw * 0.5, 110);
        ctx.fillStyle = COL.cyan;
        ctx.fillText(`Qty ${p1}`, x + cw * 0.5, 145);
        ctx.fillStyle = COL.mint;
        ctx.fillText(i === 1 ? "Slow Match" : `₹${p1 * 120}`, x + cw * 0.5, 175);
      }
      drawTag(ctx, 14, 14, `ERA: ${eras[era] || era}`, COL.gold);
      drawTag(ctx, w - 180, 14, `TRADE VALUE: ₹${p1 * 120}`, COL.mint);
      return `${eras[era]} | ${p1} units = ₹${p1 * 120}`;
    }

    case "B5": {
      const stages = ["", "Paleolithic", "Mesolithic", "Neolithic Farm", "Wheel & Metal", "Civic Village"];
      const activeIdx = Math.round(p1);
      for (let i = 1; i <= 5; i++) {
        const sx = (w / 6) * i;
        const sy = h - 60 - i * 26;
        const active = i <= activeIdx;
        ctx.fillStyle = active ? COL.mint : COL.tileOff;
        ctx.beginPath();
        ctx.arc(sx, sy, i === activeIdx ? 20 : 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(stages[i], sx, sy + 30);
      }
      drawTag(ctx, 14, 14, `STAGE ${activeIdx}: ${stages[activeIdx]}`, COL.gold);
      drawTag(ctx, w - 170, 14, `SETTLEMENT POP: ${p2}`, COL.cyan);
      return `${stages[activeIdx]} | Population ${p2}`;
    }

    case "00": {
      const pillars = [
        { lbl: "1. HISTORY", sub: "Timeline & Sources", col: COL.orange },
        { lbl: "2. GEOGRAPHY", sub: "Climate & Maps", col: COL.water },
        { lbl: "3. CIVICS", sub: "Constitution & Law", col: COL.gold },
        { lbl: "4. ECONOMICS", sub: "Sectors & Trade", col: COL.mint },
      ];
      const bw = Math.min(115, (w - 80) / 4);
      pillars.forEach((p, idx) => {
        const x = 28 + idx * (bw + 14);
        const active = idx + 1 === Math.round(p1);
        const bh = active ? 130 + Math.sin(t * 2) * 8 : 95;
        ctx.fillStyle = p.col;
        ctx.globalAlpha = active ? 0.92 : 0.45;
        ctx.fillRect(x, h - 55 - bh, bw, bh);
        ctx.globalAlpha = 1;
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.lbl, x + bw * 0.5, h - 36);
      });
      drawTag(ctx, 14, 14, `ACTIVE PILLAR: ${pillars[Math.round(p1) - 1]?.lbl || p1}`, COL.gold);
      drawTag(ctx, w - 175, 14, `HORIZON: ${p2 * 250} YRS`, COL.cyan);
      return `${pillars[Math.round(p1) - 1]?.lbl} | Horizon ${p2 * 250} yrs`;
    }

    case "01": {
      const n = Math.max(2, Math.round(p1));
      const pad = 64;
      const box = Math.min(w - 140, h - 90);
      const sx = cx - box * 0.5;
      const sy = 50;
      const cell = box / n;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          ctx.fillStyle = r === 0 && c === 0 ? COL.water : COL.orange;
          ctx.globalAlpha = r === 0 && c === 0 ? 0.85 : 0.45;
          ctx.fillRect(sx + c * cell + 3, sy + r * cell + 3, cell - 6, cell - 6);
        }
      }
      ctx.globalAlpha = 1;
      // Animated drainage flow lines along streets
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 2.5;
      const flowShift = (t * p2 * 8) % 24;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -flowShift;
      for (let i = 1; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(sx, sy + i * cell);
        ctx.lineTo(sx + box, sy + i * cell);
        ctx.moveTo(sx + i * cell, sy);
        ctx.lineTo(sx + i * cell, sy + box);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      drawTag(ctx, 14, 14, `HARAPPAN GRID: ${n}×${n}`, COL.gold);
      drawTag(ctx, w - 175, 14, `DRAIN SLOPE: ${p2}/10`, COL.cyan);
      return `Harappan ${n}×${n} Grid | Drain Slope ${p2}/10`;
    }

    case "02": {
      const reachFrac = p1 / 24;
      const radius = reachFrac * (minDim * 0.36);
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      const caps = [
        { name: "Pataliputra", dx: 0.1, dy: 0 },
        { name: "Taxila", dx: -0.65, dy: -0.65 },
        { name: "Ujjain", dx: -0.35, dy: 0.15 },
        { name: "Tosali", dx: 0.4, dy: 0.35 },
        { name: "Suvarnagiri", dx: -0.15, dy: 0.72 },
      ];
      caps.forEach((cap, i) => {
        const active = i < Math.round(p2);
        const px = cx + cap.dx * (minDim * 0.34);
        const py = cy + cap.dy * (minDim * 0.34);
        ctx.fillStyle = active ? COL.mint : COL.axis;
        ctx.beginPath();
        ctx.arc(px, py, active ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.fillText(cap.name, px + 10, py + 3);
      });
      drawTag(ctx, 14, 14, `EDICT REACH: ${p1 * 100} km`, COL.gold);
      drawTag(ctx, w - 165, 14, `PROVINCES: ${Math.round(p2)}/5`, COL.mint);
      return `Reach ${p1 * 100} km | ${Math.round(p2)}/5 Provinces`;
    }

    case "03": {
      const spanPx = Math.min(w - 110, 110 + p1 * 20);
      const x0 = cx - spanPx * 0.5;
      const x1 = cx + spanPx * 0.5;
      const archH = minDim * 0.34 + p2 * 8;
      ctx.strokeStyle = COL.orange;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(x0, h - 42);
      ctx.lineTo(x0, h - 42 - archH * 0.45);
      ctx.quadraticCurveTo(cx, h - 42 - archH * 1.15, x1, h - 42 - archH * 0.45);
      ctx.lineTo(x1, h - 42);
      ctx.stroke();
      ctx.fillStyle = COL.gold;
      ctx.fillRect(cx - 12, h - 42 - archH * 0.86, 24, 18);
      drawTag(ctx, 14, 14, `ARCH SPAN: ${p1}m`, COL.gold);
      drawTag(ctx, w - 175, 14, `ZAT RANK: ${p2 * 1000}`, COL.mint);
      return `True Arch ${p1}m | Mansabdar ${p2 * 1000} Zat`;
    }

    case "04": {
      const lineY = cy + 20;
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(45, lineY);
      ctx.lineTo(w - 45, lineY);
      ctx.stroke();

      const marks = [
        [1857, "1857"],
        [1885, "1885"],
        [1905, "1905"],
        [1920, "1920"],
        [1930, "1930 Dandi"],
        [1942, "1942"],
        [1947, "1947"],
      ];
      marks.forEach(([yr, lbl]) => {
        const mx = 45 + ((yr - 1857) / 90) * (w - 90);
        const passed = yr <= p1;
        ctx.fillStyle = passed ? COL.mint : COL.axis;
        ctx.beginPath();
        ctx.arc(mx, lineY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(lbl, mx, lineY + 22);
      });
      const curX = 45 + ((p1 - 1857) / 90) * (w - 90);
      ctx.fillStyle = COL.pink;
      ctx.fillRect(curX - 4, lineY - 42 - p2 * 0.4, 8, 42 + p2 * 0.4);
      drawTag(ctx, 14, 14, `YEAR: ${Math.round(p1)} AD`, COL.gold);
      drawTag(ctx, w - 165, 14, `PARTICIPATION: ${p2}%`, COL.mint);
      return `Year ${Math.round(p1)} AD | Civic Reach ${p2}%`;
    }

    case "05": {
      // Spinning gear + rising literacy curve
      const gr = minDim * 0.2;
      const gx = w * 0.28;
      ctx.save();
      ctx.translate(gx, cy);
      ctx.rotate(t * p1 * 0.45);
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * gr * 0.4, Math.sin(a) * gr * 0.4);
        ctx.lineTo(Math.cos(a) * (gr + 10), Math.sin(a) * (gr + 10));
        ctx.stroke();
      }
      ctx.restore();

      // Print Literacy curve
      ctx.strokeStyle = COL.mint;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        const px = w * 0.48 + u * (w * 0.44);
        const py = h - 48 - Math.pow(u, 1.4) * ((p1 + p2) / 20) * (h - 98);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      drawTag(ctx, 14, 14, `STEAM RPM: ${p1}x`, COL.gold);
      drawTag(ctx, w - 175, 14, `PRINT SCALE: ${p2}x`, COL.mint);
      return `Steam ${p1}x | Print Scale ${p2}x`;
    }

    case "06": {
      const nBlocs = Math.round(p2);
      const ringR = minDim * 0.3;
      const pts = [];
      for (let i = 0; i < nBlocs; i++) {
        const a = (i / nBlocs) * Math.PI * 2 + t * 0.18;
        pts.push([cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR]);
      }
      ctx.strokeStyle = p1 >= 0.7 ? COL.mint : p1 >= 0.45 ? COL.gold : COL.pink;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          if ((i + j) % Math.max(1, Math.round(3 - p1 * 2)) === 0) {
            ctx.beginPath();
            ctx.moveTo(pts[i][0], pts[i][1]);
            ctx.lineTo(pts[j][0], pts[j][1]);
            ctx.stroke();
          }
        }
      }
      pts.forEach(([x, y]) => {
        ctx.fillStyle = COL.cyan;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      drawTag(ctx, 14, 14, `BLOCS: ${nBlocs}`, COL.cyan);
      drawTag(ctx, w - 175, 14, `CO-OP: ${Math.round(p1 * 100)}%`, COL.mint);
      return `${nBlocs} Blocs | Cooperation ${Math.round(p1 * 100)}%`;
    }

    case "07": {
      const gr = minDim * 0.34;
      ctx.fillStyle = COL.water;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, gr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, gr, 0, Math.PI * 2);
      ctx.stroke();

      // Equator + Tropic of Cancer
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - gr, cy);
      ctx.lineTo(cx + gr, cy);
      ctx.stroke();

      // Selected Longitude Meridian & Latitude Point
      const lx = cx + (p1 / 180) * gr;
      const ly = cy - (p2 / 90) * gr;
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, cy - Math.sqrt(Math.max(0, gr * gr - (lx - cx) ** 2)));
      ctx.lineTo(lx, cy + Math.sqrt(Math.max(0, gr * gr - (lx - cx) ** 2)));
      ctx.stroke();
      ctx.fillStyle = COL.mint;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();

      const istDiff = (p1 / 15).toFixed(1);
      drawTag(ctx, 14, 14, `LON: ${p1}° (GMT ${p1 >= 0 ? "+" : ""}${istDiff}h)`, COL.gold);
      drawTag(ctx, w - 145, 14, `LAT: ${p2}°`, COL.mint);
      return `Lat ${p2}° | Lon ${p1}° (GMT ${p1 >= 0 ? "+" : ""}${istDiff}h)`;
    }

    case "08": {
      // Tectonic Plates + Mountain Uplift + Live Seismograph Waveform
      const uplift = p1 * 5.2;
      ctx.fillStyle = COL.orange;
      ctx.fillRect(40, h - 75, cx - 55, 28);
      ctx.fillStyle = COL.water;
      ctx.fillRect(cx + 15, h - 75, cx - 55, 28);
      ctx.fillStyle = COL.cream;
      ctx.beginPath();
      ctx.moveTo(cx - 65, h - 75);
      ctx.lineTo(cx, h - 75 - uplift);
      ctx.lineTo(cx + 65, h - 75);
      ctx.fill();

      // Live Richter trace
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const px = 42 + u * (w - 84);
        const amp = (p2 - 1.5) * 7 * Math.exp(-Math.pow((u - ((t * 0.45) % 1)) * 6, 2));
        const py = 105 + Math.sin(i * 1.4 + t * 14) * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      drawTag(ctx, 14, 14, `CONVERGENCE: ${p1} cm/yr`, COL.gold);
      drawTag(ctx, w - 165, 14, `RICHTER: M ${p2.toFixed(1)}`, COL.pink);
      return `Plate Speed ${p1} cm/yr | Quake M${p2.toFixed(1)}`;
    }

    case "09": {
      // Western Ghats barrier + Wind arrows + Rain curtain
      const ghatX = cx + 30;
      ctx.fillStyle = COL.mint;
      ctx.beginPath();
      ctx.moveTo(ghatX - 55, h - 42);
      ctx.lineTo(ghatX, h - 165);
      ctx.lineTo(ghatX + 65, h - 42);
      ctx.fill();

      // Animated SW Monsoon wind arrows
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 3;
      const windSpeed = p1 * 3.5;
      for (let r = 0; r < 4; r++) {
        const offset = ((t * windSpeed * 12 + r * 45) % (ghatX - 40));
        const ax = 36 + offset;
        const ay = h - 68 - r * 28 - offset * 0.28;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + 34, ay - 14);
        ctx.stroke();
      }

      // Rain drops on windward side
      ctx.strokeStyle = COL.water;
      ctx.lineWidth = 2;
      const nDrops = Math.round(p2 / 6);
      for (let d = 0; d < nDrops; d++) {
        const dx = ghatX - 95 + (d * 11) % 95;
        const dy = 78 + ((t * 95 + d * 29) % 130);
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - 4, dy + 12);
        ctx.stroke();
      }
      drawTag(ctx, 14, 14, `ΔT GRADIENT: ${p1}°C`, COL.gold);
      drawTag(ctx, w - 165, 14, `HUMIDITY: ${p2}%`, COL.cyan);
      return `Monsoon ΔT ${p1}°C | Humidity ${p2}%`;
    }

    case "10": {
      // 12-Month River Hydrograph (Jan..Dec)
      const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
      const barW = Math.min(28, (w - 100) / 12 - 6);
      months.forEach((m, i) => {
        const bx = 50 + i * (barW + 8);
        const rainWeight = i >= 5 && i <= 8 ? 1.0 : i === 9 ? 0.55 : 0.12;
        const totalFlow = p1 * 0.65 + (p2 / 2400) * 100 * rainWeight;
        const bh = Math.min(h - 115, (totalFlow / 120) * (h - 115));
        ctx.fillStyle = i >= 5 && i <= 8 ? COL.cyan : COL.mint;
        ctx.fillRect(bx, h - 48 - bh, barW, bh);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(m, bx + barW * 0.5, h - 32);
      });
      drawTag(ctx, 14, 14, `SNOWMELT: ${p1}%`, COL.cyan);
      drawTag(ctx, w - 165, 14, `MONSOON: ${p2} mm`, COL.mint);
      return `Snowmelt ${p1}% | Annual Rain ${p2} mm`;
    }

    case "11": {
      const soils = [
        { name: "1. Alluvial", crops: "Rice, Wheat", col: COL.gold },
        { name: "2. Black Regur", crops: "Cotton, Soybean", col: COL.axis },
        { name: "3. Red Iron", crops: "Millets, Pulses", col: COL.pink },
        { name: "4. Laterite", crops: "Tea, Cashew", col: COL.orange },
      ];
      const bw = Math.min(110, (w - 80) / 4);
      soils.forEach((s, i) => {
        const x = 32 + i * (bw + 14);
        const active = i + 1 === Math.round(p1);
        ctx.fillStyle = s.col;
        ctx.globalAlpha = active ? 0.92 : 0.4;
        ctx.fillRect(x, 76, bw, h - 135);
        ctx.globalAlpha = 1;
        if (active) {
          ctx.strokeStyle = COL.mint;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, 76, bw, h - 135);
        }
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(s.name, x + bw * 0.5, h - 38);
      });
      drawTag(ctx, 14, 14, `${soils[Math.round(p1) - 1]?.name || "Soil"}`, COL.gold);
      drawTag(ctx, w - 165, 14, `MOISTURE: ${p2}%`, COL.mint);
      return `${soils[Math.round(p1) - 1]?.crops} | Moisture ${p2}%`;
    }

    case "12": {
      const clean = Math.min(100, p1 + p2);
      const fossil = Math.max(0, 100 - clean);
      const barY = cy - 24;
      const barW = w - 90;
      const sw = (p1 / 100) * barW;
      const hw = (Math.min(p2, 100 - p1) / 100) * barW;
      const fw = Math.max(0, barW - sw - hw);
      ctx.fillStyle = COL.mint;
      ctx.fillRect(45, barY, sw, 48);
      ctx.fillStyle = COL.cyan;
      ctx.fillRect(45 + sw, barY, hw, 48);
      ctx.fillStyle = COL.pink;
      ctx.fillRect(45 + sw + hw, barY, fw, 48);
      ctx.strokeStyle = COL.cream;
      ctx.lineWidth = 2;
      ctx.strokeRect(45, barY, barW, 48);
      drawTag(ctx, 14, 14, `CLEAN ENERGY: ${clean}%`, COL.mint);
      drawTag(ctx, w - 165, 14, `FOSSIL: ${fossil}%`, COL.pink);
      return `Clean ${clean}% (${p1}% Solar/Wind + ${p2}% Hydro) | Coal ${fossil}%`;
    }

    case "13": {
      const titles = ["Equality", "Freedom", "No Exploit", "Religion", "Cultural", "Art 32 Writ"];
      const r = minDim * 0.31;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        const active = i + 1 === Math.round(p1);
        ctx.strokeStyle = active ? COL.mint : COL.grid;
        ctx.lineWidth = active ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = active ? COL.mint : COL.violet;
        ctx.beginPath();
        ctx.arc(px, py, active ? 20 : 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(titles[i], px, py + 28);
      }
      drawTag(ctx, 14, 14, `RIGHT #${Math.round(p1)}: ${titles[Math.round(p1) - 1]}`, COL.gold);
      drawTag(ctx, w - 165, 14, `CIVIC SCORE: ${p2}%`, COL.mint);
      return `Right #${Math.round(p1)} (${titles[Math.round(p1) - 1]}) | Score ${p2}%`;
    }

    case "14": {
      // 543-Seat Semicircle Parliament Hemicycle
      const rOut = minDim * 0.38;
      const seats = Math.min(543, Math.round(p1 + p2));
      const baseAngle = Math.PI;
      const partyFrac = Math.min(1, p1 / 543);
      const totalFrac = Math.min(1, seats / 543);
      ctx.lineWidth = 26;
      ctx.strokeStyle = COL.tileOff;
      ctx.beginPath();
      ctx.arc(cx, h - 52, rOut, baseAngle, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = COL.mint;
      ctx.beginPath();
      ctx.arc(cx, h - 52, rOut, baseAngle, baseAngle + Math.PI * partyFrac);
      ctx.stroke();

      ctx.strokeStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(cx, h - 52, rOut, baseAngle + Math.PI * partyFrac, baseAngle + Math.PI * totalFrac);
      ctx.stroke();

      // 272 Majority needle
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, h - 52);
      ctx.lineTo(cx, h - 52 - rOut - 20);
      ctx.stroke();

      drawTag(ctx, 14, 14, `COALITION: ${seats} / 543 SEATS`, seats >= 272 ? COL.mint : COL.pink);
      drawTag(ctx, w - 180, 14, `272 MAJORITY | 362 SPECIAL`, COL.gold);
      return `Lok Sabha ${seats}/543 (${p1} + ${p2} allies)`;
    }

    case "15": {
      const union = Math.max(0, 100 - p1 - p2);
      const tiers = [
        { lbl: `Union (${union}%)`, val: union, col: COL.cyan, w: w * 0.34 },
        { lbl: `State (${p2}%)`, val: p2, col: COL.gold, w: w * 0.54 },
        { lbl: `Local Panchayat (${p1}%)`, val: p1, col: COL.mint, w: w * 0.74 },
      ];
      tiers.forEach((tr, i) => {
        const y = 78 + i * 54;
        ctx.fillStyle = tr.col;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(cx - tr.w * 0.5, y, tr.w, 40, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#171537";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(tr.lbl, cx, y + 24);
      });
      drawTag(ctx, 14, 14, `LOCAL SHARE: ${p1}%`, COL.mint);
      drawTag(ctx, w - 165, 14, `UNION REMAINS: ${union}%`, COL.cyan);
      return `Local ${p1}% | State ${p2}% | Union ${union}%`;
    }

    case "16": {
      const tilt = ((8 - p1) * 3.5 * Math.PI) / 180;
      ctx.strokeStyle = COL.gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, 75);
      ctx.lineTo(cx, h - 48);
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, 118);
      ctx.rotate(tilt);
      ctx.strokeStyle = COL.cyan;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-110, 0);
      ctx.lineTo(110, 0);
      ctx.stroke();
      ctx.fillStyle = COL.mint;
      ctx.beginPath();
      ctx.arc(-110, 34, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COL.pink;
      ctx.beginPath();
      ctx.arc(110, 34, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const tiers = ["", "District Court", "High Court", "Supreme Court"];
      drawTag(ctx, 14, 14, `BENCH: ${tiers[Math.round(p2)] || p2}`, COL.gold);
      drawTag(ctx, w - 175, 14, `AUTONOMY: ${p1}/10`, COL.mint);
      return `${tiers[Math.round(p2)]} | Autonomy ${p1}/10`;
    }

    case "17": {
      const seats = 15;
      const votes = Math.round(p1);
      const p5 = Math.round(p2);
      const rad = minDim * 0.31;
      for (let i = 0; i < seats; i++) {
        const a = (i / seats) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        const isP5 = i < 5;
        const ok = isP5 ? i < p5 : i < votes;
        ctx.fillStyle = ok ? (isP5 ? COL.gold : COL.mint) : COL.pink;
        ctx.beginPath();
        ctx.arc(px, py, isP5 ? 11 : 8, 0, Math.PI * 2);
        ctx.fill();
      }
      const adopted = votes >= 9 && p5 === 5;
      drawTag(ctx, 14, 14, adopted ? "UNSC RESOLUTION ADOPTED" : p5 < 5 ? "BLOCKED BY P5 VETO" : "NEEDS 9/15", adopted ? COL.mint : COL.pink);
      drawTag(ctx, w - 160, 14, `VOTES: ${votes}/15 · P5: ${p5}/5`, COL.gold);
      return `UNSC ${votes}/15 | P5 Concur ${p5}/5`;
    }

    case "18": {
      // Supply & Demand curves on Q (x) vs Price (y)
      const ox = 56;
      const oy = h - 42;
      const gw = w - 104;
      const gh = h - 88;
      ctx.strokeStyle = COL.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox, 44);
      ctx.lineTo(ox, oy);
      ctx.lineTo(ox + gw, oy);
      ctx.stroke();

      const pMax = 140;
      const mapX = (q) => ox + (Math.max(0, Math.min(pMax, q)) / pMax) * gw;
      const mapY = (pr) => oy - (Math.max(0, Math.min(pMax, pr)) / pMax) * gh;

      // Demand: Q = p1 - P => P = p1 - Q
      ctx.strokeStyle = COL.pink;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(mapX(0), mapY(p1));
      ctx.lineTo(mapX(p1), mapY(0));
      ctx.stroke();

      // Supply: Q = (20 - p2) + P -> when P=0, Q = 20 - p2 -> wait P = Q - (20 - p2) -> actually shift right when p2 rises: Qs = (p2 - 20) + P
      // Keep simple matching evaluateChapterMission: Qd = p1 - P, Qs = (20 - p2) + P? Wait earlier: P* = (p1 - (20 - p2))/2 -> Qd = Qs => p1 - P = (20 - p2) + P => if p2 increases, Q* lowers? Let's make Qs = p2 + P so P* = (p1 - p2)/2 and Q* = (p1 + p2)/2! Wait let's match mission cleanly.
      const pStar = Number(((p1 - (20 - p2)) / 2).toFixed(1));
      const qStar = Number((p1 - pStar).toFixed(1));
      ctx.strokeStyle = COL.mint;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(mapX(Math.max(0, 20 - p2)), mapY(0));
      ctx.lineTo(mapX(Math.min(140, 120 + (20 - p2))), mapY(120));
      ctx.stroke();

      ctx.fillStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(mapX(qStar), mapY(pStar), 8, 0, Math.PI * 2);
      ctx.fill();
      drawTag(ctx, 14, 14, `EQUILIBRIUM P* = ₹${pStar}`, COL.gold);
      drawTag(ctx, w - 165, 14, `QUANTITY Q* = ${qStar}`, COL.mint);
      return `Equilibrium P*=₹${pStar} | Q*=${qStar} units`;
    }

    case "19": {
      const pri = Math.max(0, 100 - p1 - p2);
      const items = [
        { lbl: `Primary (${pri}%)`, val: pri, col: COL.mint },
        { lbl: `Industry (${p1}%)`, val: p1, col: COL.orange },
        { lbl: `Services (${p2}%)`, val: p2, col: COL.cyan },
      ];
      const bw = Math.min(110, (w - 110) / 3);
      items.forEach((it, i) => {
        const bx = 56 + i * (bw + 24);
        const bh = Math.max(12, (it.val / 80) * (h - 110));
        ctx.fillStyle = it.col;
        ctx.fillRect(bx, h - 46 - bh, bw, bh);
        ctx.fillStyle = COL.cream;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(it.lbl, bx + bw * 0.5, h - 26);
      });
      drawTag(ctx, 14, 14, `PRIMARY: ${pri}%`, COL.mint);
      drawTag(ctx, w - 190, 14, `IND ${p1}% · SVC ${p2}%`, COL.cyan);
      return `GDP: Primary ${pri}% | Industry ${p1}% | Services ${p2}%`;
    }

    case "20":
    default: {
      const showGraticule = extras?.showTangent !== false;
      const showTrade = Boolean(extras?.showIntegral);
      const polarMode = Boolean(extras?.polarMode);
      const routeA = extras?.exprA || "Mumbai -> Suez -> London";
      const routeB = extras?.exprB || "Silk Route (Xi'an -> Rome)";

      if (polarMode) {
        const r = minDim * 0.36;
        ctx.fillStyle = COL.water;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COL.cyan;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        if (showGraticule) {
          ctx.strokeStyle = COL.axis;
          ctx.lineWidth = 1;
          for (const k of [0.35, 0.7]) {
            ctx.beginPath();
            ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
            ctx.stroke();
          }
          for (let a = 0; a < 8; a++) {
            const rad = (a * Math.PI) / 4 + ((p1 * Math.PI) / 180) * 0.25;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
            ctx.stroke();
          }
        }
        if (showTrade) {
          ctx.strokeStyle = COL.gold;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.45, cy + r * 0.2);
          ctx.quadraticCurveTo(cx, cy - r * 0.15, cx - r * 0.55, cy - r * 0.1);
          ctx.stroke();
        }
      } else {
        const mx = 42;
        const my = 48;
        const mw = w - 84;
        const mh = h - 92;
        ctx.fillStyle = COL.water;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(mx, my, mw, mh);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COL.cyan;
        ctx.lineWidth = 2;
        ctx.strokeRect(mx, my, mw, mh);

        if (showGraticule) {
          ctx.strokeStyle = COL.axis;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx, my + mh * 0.5);
          ctx.lineTo(mx + mw, my + mh * 0.5);
          const merX = mx + ((p1 + 180) / 360) * mw;
          ctx.moveTo(merX, my);
          ctx.lineTo(merX, my + mh);
          ctx.stroke();
        }

        // Stylized Continents
        ctx.fillStyle = COL.mint;
        ctx.globalAlpha = 0.52;
        ctx.fillRect(mx + mw * 0.12, my + mh * 0.18, mw * 0.18, mh * 0.28); // N America
        ctx.fillRect(mx + mw * 0.23, my + mh * 0.52, mw * 0.11, mh * 0.32); // S America
        ctx.fillRect(mx + mw * 0.44, my + mh * 0.42, mw * 0.14, mh * 0.34); // Africa
        ctx.fillRect(mx + mw * 0.45, my + mh * 0.14, mw * 0.4, mh * 0.32); // Eurasia + India
        ctx.fillRect(mx + mw * 0.74, my + mh * 0.58, mw * 0.13, mh * 0.18); // Australia
        ctx.globalAlpha = 1;

        // Animated Great-Circle maritime routes
        const indiaX = mx + mw * 0.68;
        const indiaY = my + mh * 0.44;
        const londonX = mx + mw * 0.48;
        const londonY = my + mh * 0.22;
        const tokyoX = mx + mw * 0.84;
        const tokyoY = my + mh * 0.32;

        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(indiaX, indiaY);
        ctx.quadraticCurveTo(mx + mw * 0.55, my + mh * 0.46 - p2 * 0.6, londonX, londonY);
        ctx.stroke();

        if (showTrade) {
          ctx.strokeStyle = COL.pink;
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(indiaX, indiaY);
          ctx.quadraticCurveTo(mx + mw * 0.78, my + mh * 0.52, tokyoX, tokyoY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = COL.gold;
        ctx.beginPath();
        ctx.arc(indiaX, indiaY, 6, 0, Math.PI * 2);
        ctx.arc(londonX, londonY, 5, 0, Math.PI * 2);
        ctx.arc(tokyoX, tokyoY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      drawTag(ctx, 14, 14, `${polarMode ? "POLAR" : "FLAT"} · ${p1}°E`, COL.gold);
      drawTag(ctx, w - 210, 14, showTrade ? `A:${routeA.slice(0, 18)}` : `TILT ${p2}°`, COL.mint);
      return `Atlas ${polarMode ? "Polar" : "Equirect"} | ${p1}°E | ${routeA} & ${routeB}`;
    }
  }
}
