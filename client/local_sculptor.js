// Local procedural voxel builder for static hosts (Netlify / GitHub Pages) when /api/build is unavailable.
// Produces grounded VoxelBlueprint ops & animated parts compatible with client/voxel/vox.js.

function sanitizeTitle(rawPrompt, imageUsed) {
  const cleaned = String(rawPrompt || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return imageUsed ? "Custom Photo Landmark" : "Custom SST Landmark";
  }
  const words = cleaned.split(" ").slice(0, 5).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function estimateScaleClass(prompt) {
  const s = String(prompt || "").toLowerCase();
  if (/(volcano|mountain|himalaya|fort|castle|palace|taj|parliament|pyramid|colossal|giant|mega)/.test(s)) {
    return "large";
  }
  if (/(tiny|mini|coin|compass|lamp|Sign|postbox|bench)/.test(s)) {
    return "small";
  }
  return "medium";
}

function buildBlueprintForPrompt(prompt, title) {
  const s = String(prompt || "").toLowerCase();
  const scaleClass = estimateScaleClass(s);
  const ops = [];
  const parts = [];
  let category = "building";
  let footprintX = 14;
  let footprintZ = 14;
  let heightY = 16;

  if (/(fort|castle|palace|citadel|lal qila|red fort)/.test(s)) {
    ops.push(
      { op: "plinth", sizeX: 18, heightY: 2, sizeZ: 18, base: "brickDark", top: "sand", corner: "terracotta" },
      { op: "hollowBox", x0: -8, y0: 2, z0: -8, x1: 8, y1: 10, z1: 8, wall: 2, color: "crimson", trim: "sand" },
      { op: "clear", x0: -2, y0: 2, z0: 6, x1: 2, y1: 7, z1: 9 },
      { op: "arch", cx: 0, y0: 2, cz: 7, halfSpan: 3, height: 6, depth: 2, axis: "z", color: "terracotta" },
      { op: "cylinder", cx: -7, cz: -7, y0: 2, y1: 14, radius: 2, color: "crimson", mirrorX: true },
      { op: "cylinder", cx: -7, cz: 7, y0: 2, y1: 14, radius: 2, color: "crimson", mirrorX: true },
      { op: "dome", cx: -7, yBase: 14, cz: -7, radius: 2.3, color: "marble", mirrorX: true },
      { op: "dome", cx: -7, yBase: 14, cz: 7, radius: 2.3, color: "marble", mirrorX: true },
      { op: "dome", cx: 0, yBase: 10, cz: 0, radius: 4, color: "cream" },
      { op: "box", x0: 0, y0: 14, z0: 0, x1: 1, y1: 17, z1: 1, color: "gold", emit: 0.9 },
    );
    footprintX = 18;
    footprintZ = 18;
    heightY = 18;
  } else if (/(taj|stupa|dome|temple|shrine|mosque|sanchi|memorial)/.test(s)) {
    ops.push(
      { op: "plinth", sizeX: 16, heightY: 2, sizeZ: 16, base: "limestone", top: "marble", corner: "gold" },
      { op: "box", x0: -5, y0: 2, z0: -5, x1: 5, y1: 9, z1: 5, color: "marble" },
      { op: "arch", cx: 0, y0: 2, cz: 4, halfSpan: 2, height: 6, depth: 2, axis: "z", color: "marbleShade" },
      { op: "dome", cx: 0, yBase: 9, cz: 0, radius: 4.2, color: "white" },
      { op: "cylinder", cx: -6, cz: -6, y0: 2, y1: 12, radius: 1.2, color: "marble", mirrorX: true },
      { op: "cylinder", cx: -6, cz: 6, y0: 2, y1: 12, radius: 1.2, color: "marble", mirrorX: true },
      { op: "sphere", cx: 0, cy: 14, cz: 0, rx: 1, ry: 1.5, rz: 1, color: "gold", emit: 1.0 },
    );
    footprintX = 16;
    footprintZ = 16;
    heightY = 16;
  } else if (/(parliament|sansad|court|capitol|council|museum|library|school)/.test(s)) {
    ops.push(
      { op: "plinth", sizeX: 16, heightY: 2, sizeZ: 16, base: "concreteDark", top: "limestone", corner: "brass" },
      { op: "cylinder", cx: 0, cz: 0, y0: 2, y1: 9, radius: 6.5, color: "sand" },
      { op: "cylinder", cx: 0, cz: 0, y0: 4, y1: 7, radius: 6.8, color: "glass", emit: 0.45 },
      { op: "pillars", x0: -6, y0: 2, z0: -6, x1: 6, y1: 9, z1: 6, color: "cream" },
      { op: "dome", cx: 0, yBase: 9, cz: 0, radius: 5, color: "terracotta" },
      { op: "box", x0: 0, y0: 14, z0: 0, x1: 1, y1: 17, z1: 1, color: "gold", emit: 0.9 },
    );
    footprintX = 16;
    footprintZ = 16;
    heightY = 17;
  } else if (/(globe|earth|atlas|world|planet|sphere|map)/.test(s)) {
    category = "prop";
    ops.push(
      { op: "plinth", sizeX: 12, heightY: 2, sizeZ: 12, base: "slate", top: "marble", corner: "gold" },
      { op: "cylinder", cx: 0, cz: 0, y0: 2, y1: 5, radius: 2.2, color: "brass" },
      { op: "ring", cx: 0, cz: 0, y0: 11, y1: 12, outerR: 6, innerR: 5, color: "gold", emit: 0.5 },
    );
    parts.push({
      name: "spinning-globe",
      kind: "spinY",
      speed: 0.75,
      pivot: [0, 10, 0],
      ops: [
        { op: "sphere", cx: 0, cy: 0, cz: 0, rx: 4.5, ry: 4.5, rz: 4.5, color: "water" },
        { op: "box", x0: -3, y0: 0, z0: 3, x1: 1, y1: 3, z1: 5, color: "grass" },
        { op: "box", x0: 2, y0: -2, z0: -4, x1: 4, y1: 2, z1: 1, color: "leaf" },
        { op: "box", x0: -2, y0: 4, z0: -2, x1: 2, y1: 5, z1: 2, color: "snow" },
      ],
    });
    footprintX = 12;
    footprintZ = 12;
    heightY = 15;
  } else if (/(pyramid|ziggurat|harappa|indus|egypt)/.test(s)) {
    ops.push(
      { op: "plinth", sizeX: 16, heightY: 1, sizeZ: 16, base: "sand", top: "sand", corner: "terracotta" },
      { op: "roofPyramid", x0: -7, yBase: 1, z0: -7, x1: 7, z1: 7, color: "sand", trim: "terracotta" },
      { op: "box", x0: -1, y0: 9, z0: -1, x1: 1, y1: 11, z1: 1, color: "gold", emit: 1.1 },
    );
    footprintX = 16;
    footprintZ = 16;
    heightY = 12;
  } else if (/(volcano|mountain|himalaya|everest|peak|hill|tectonic)/.test(s)) {
    const isVolcano = /(volcano|lava|magma)/.test(s);
    category = "nature";
    ops.push(
      { op: "plinth", sizeX: 16, heightY: 1, sizeZ: 16, base: "basalt", top: "stone", corner: "grass2" },
      { op: "cone", cx: 0, y0: 1, y1: 14, cz: 0, rBottom: 7.5, rTop: 2.4, color: isVolcano ? "basalt" : "granite" },
      {
        op: "cylinder",
        cx: 0,
        cz: 0,
        y0: 12,
        y1: 15,
        radius: 2.1,
        color: isVolcano ? "lava" : "snow",
        emit: isVolcano ? 1.5 : 0.2,
      },
    );
    footprintX = 16;
    footprintZ = 16;
    heightY = 15;
  } else if (/(house|home|cottage|hut|village|granary|shop)/.test(s)) {
    ops.push(
      { op: "plinth", sizeX: 14, heightY: 1, sizeZ: 14, base: "stone", top: "path", corner: "woodDark" },
      { op: "box", x0: -5, y0: 1, z0: -5, x1: 5, y1: 7, z1: 5, color: "plaster" },
      { op: "box", x0: -1, y0: 1, z0: 4, x1: 1, y1: 5, z1: 6, color: "woodDark" },
      { op: "box", x0: -4, y0: 3, z0: 5, x1: -2, y1: 5, z1: 5, color: "warmGlow", emit: 1.0, mirrorX: true },
      { op: "roofGable", x0: -6, yBase: 7, z0: -6, x1: 6, z1: 6, rise: 5, axis: "x", color: "terracotta", trim: "woodLight" },
      { op: "box", x0: 2, y0: 9, z0: -3, x1: 4, y1: 14, z1: -1, color: "brick" },
    );
    footprintX = 14;
    footprintZ = 14;
    heightY = 14;
  } else if (/(rocket|satellite|insat|isro|windmill|turbine|solar|radar|tower)/.test(s)) {
    category = "prop";
    ops.push(
      { op: "plinth", sizeX: 12, heightY: 2, sizeZ: 12, base: "slate", top: "concrete", corner: "hazard" },
      { op: "cone", cx: 0, y0: 2, y1: 15, cz: 0, rBottom: 2.8, rTop: 0.9, color: "white" },
      { op: "box", x0: -3, y0: 2, z0: -1, x1: -1, y1: 6, z1: 1, color: "red", mirrorX: true },
    );
    parts.push({
      name: "beacon-spin",
      kind: "spinY",
      speed: 2.0,
      pivot: [0, 16, 0],
      ops: [
        { op: "box", x0: -3, y0: 0, z0: 0, x1: 3, y1: 1, z1: 1, color: "screenCyan", emit: 1.2 },
        { op: "sphere", cx: 0, cy: 1.5, cz: 0, rx: 1, ry: 1, rz: 1, color: "gold", emit: 1.3 },
      ],
    });
    footprintX = 12;
    footprintZ = 12;
    heightY = 18;
  } else if (/(ship|boat|car|bus|train|bridge|arch)/.test(s)) {
    category = "prop";
    ops.push(
      { op: "plinth", sizeX: 16, heightY: 1, sizeZ: 10, base: "water", top: "stone", corner: "brass" },
      { op: "arch", cx: 0, y0: 1, cz: -3, halfSpan: 5, height: 7, depth: 6, axis: "z", color: "brick" },
      { op: "box", x0: -7, y0: 7, z0: -3, x1: 7, y1: 8, z1: 3, color: "sand" },
      { op: "box", x0: -6, y0: 8, z0: -3, x1: 6, y1: 9, z1: -2, color: "steel", emit: 0.3 },
      { op: "box", x0: -6, y0: 8, z0: 2, x1: 6, y1: 9, z1: 3, color: "steel", emit: 0.3 },
    );
    footprintX = 16;
    footprintZ = 10;
    heightY = 10;
  } else {
    // Default ornate SST-LAB Cultural Pavilion with spinning golden star
    ops.push(
      { op: "plinth", sizeX: 14, heightY: 2, sizeZ: 14, base: "slate", top: "limestone", corner: "gold" },
      { op: "pillars", x0: -5, y0: 2, z0: -5, x1: 5, y1: 8, z1: 5, color: "cream" },
      { op: "box", x0: -5, y0: 8, z0: -5, x1: 5, y1: 10, z1: 5, color: "teal" },
      { op: "roofPyramid", x0: -5, yBase: 10, z0: -5, x1: 5, z1: 5, color: "terracotta", trim: "gold" },
    );
    parts.push({
      name: "crest-beacon",
      kind: "spinY",
      speed: 1.4,
      pivot: [0, 15, 0],
      ops: [
        { op: "box", x0: -2, y0: 0, z0: -2, x1: 2, y1: 3, z1: 2, color: "screenCyan", emit: 1.3 },
        { op: "box", x0: -1, y0: 3, z0: -1, x1: 1, y1: 5, z1: 1, color: "gold", emit: 1.2 },
      ],
    });
    footprintX = 14;
    footprintZ = 14;
    heightY = 19;
  }

  return {
    scaleClass,
    blueprint: {
      name: title,
      description: `Procedural 3D build for "${title}"`,
      category,
      scaleClass,
      ops,
      parts,
      stats: {
        footprintX,
        footprintZ,
        heightY,
      },
    },
  };
}

export function buildLocalProceduralCreation({ prompt, x, z, imageUsed = false }) {
  const title = sanitizeTitle(prompt, imageUsed);
  const { scaleClass, blueprint } = buildBlueprintForPrompt(prompt, title);
  const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const safeX = Number.isFinite(Number(x)) ? Number(Number(x).toFixed(2)) : 16;
  const safeZ = Number.isFinite(Number(z)) ? Number(Number(z).toFixed(2)) : 12;

  return {
    id,
    name: title,
    description: `${blueprint.description} (Saved on this device)`,
    creatorPrompt: String(prompt || title),
    category: blueprint.category,
    scaleClass,
    x: safeX,
    z: safeZ,
    yaw: 0,
    blueprint,
    behavior: {
      type: "landmark",
      facingYaw: 0,
      activity: `Inspecting ${title}`,
      statusLine: `${title} · Built in local SST-LAB mode`,
    },
    liveFeed: null,
    integratedLevel: 1,
    createdAt: Date.now(),
    isSeed: false,
    isLocalOffline: true,
  };
}
