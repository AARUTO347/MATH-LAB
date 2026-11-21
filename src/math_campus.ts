import { clampPointToIsland, computeIntelligentBuildingYaw } from "./town_planner";
import type { InteractionKind, ScaleClass, VoxelBlueprint, VoxelOp, VoxelPart, WorldCreation, WorldPath } from "./types";
import { distPointToPolyline2D } from "./voxel_audit";
import { getCreationFootprintRadius, normalizeAndGroundBlueprint } from "./voxel_dsl";

export interface MathMonumentSpec {
  chapterNum: string;
  id: string;
  name: string;
  description: string;
  statusLine: string;
  preferredX: number;
  preferredZ: number;
  scaleClass: ScaleClass;
  accentColor: string;
  secondaryColor: string;
  interactionKind?: InteractionKind;
  motif:
    | "cube_grid"
    | "argand_spire"
    | "matrix_gate"
    | "combo_stair"
    | "pascal_pyramid"
    | "series_spiral"
    | "prob_spinner"
    | "trig_rotor"
    | "inv_mirror"
    | "triangle_prism"
    | "line_bridge"
    | "circle_radar"
    | "conic_dish"
    | "diff_curve"
    | "int_riemann"
    | "vector_tripod"
    | "poly_spire"
    | "bell_arch"
    | "logic_gate"
    | "venn_rings"
    | "dev_hq"
    | "flat_stage"
    | "marble_tower"
    | "tesla_spire"
    | "gravity_cube"
    | "parabolic_hoop"
    | "turbo_roadster"
    | "express_train"
    | "train_station";
  behavior?: WorldCreation["behavior"];
}

export const MATH_CHAPTER_MONUMENTS: readonly MathMonumentSpec[] = [
  {
    chapterNum: "00",
    id: "math-ch-00",
    name: "Ch.00 Algebra Overview Pavilion",
    description:
      "Interactive linear algebra hub showcasing 3D transform matrices, neural nets, gradient descent, and vector embeddings.",
    statusLine: "Inspect Ch.00 Algebra & AI Overview Lab",
    preferredX: 28,
    preferredZ: -26,
    scaleClass: "medium",
    accentColor: "cyan",
    secondaryColor: "gold",
    motif: "cube_grid",
  },
  {
    chapterNum: "01",
    id: "math-ch-01",
    name: "Ch.01 Complex Plane Spire",
    description:
      "Argand plane monument & roots-of-unity rotor modeling AC impedance, signal processing, and quantum amplitudes.",
    statusLine: "Inspect Ch.01 Complex Numbers & Quadratics",
    preferredX: 46,
    preferredZ: -24,
    scaleClass: "medium",
    accentColor: "purple",
    secondaryColor: "amber",
    motif: "argand_spire",
  },
  {
    chapterNum: "02",
    id: "math-ch-02",
    name: "Ch.02 Matrices & Determinants Gate",
    description:
      "3D shear & determinant monument demonstrating Cramer's rule, Eigen-transforms, and graphics pipelines.",
    statusLine: "Inspect Ch.02 Matrices & Determinants Lab",
    preferredX: 58,
    preferredZ: -8,
    scaleClass: "medium",
    accentColor: "teal",
    secondaryColor: "yellow",
    motif: "matrix_gate",
  },
  {
    chapterNum: "03",
    id: "math-ch-03",
    name: "Ch.03 Permutations Tower",
    description:
      "Combinatorial staircase and rotating cipher wheel for circular permutations, routing, and cryptography.",
    statusLine: "Inspect Ch.03 Permutations & Combinations",
    preferredX: 58,
    preferredZ: 14,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "sky",
    motif: "combo_stair",
  },
  {
    chapterNum: "04",
    id: "math-ch-04",
    name: "Ch.04 Binomial & Pascal Pyramid",
    description:
      "Stepped Pascal's triangle monument visualizing binomial coefficients, induction steps, and risk modeling.",
    statusLine: "Inspect Ch.04 Induction & Binomial Lab",
    preferredX: 48,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "indigo",
    motif: "pascal_pyramid",
  },
  {
    chapterNum: "05",
    id: "math-ch-05",
    name: "Ch.05 Sequences & Series Helix",
    description:
      "Rising AP/GP/HP progression spiral visualizing convergent series sums and compound growth.",
    statusLine: "Inspect Ch.05 Sequences & Series Lab",
    preferredX: 30,
    preferredZ: 48,
    scaleClass: "medium",
    accentColor: "lime",
    secondaryColor: "magenta",
    motif: "series_spiral",
  },
  {
    chapterNum: "06",
    id: "math-ch-06",
    name: "Ch.06 Probability Spinner Arcade",
    description:
      "Giant dice & Bayes probability wheel modeling Binomial distributions, medical tests, and Monte Carlo runs.",
    statusLine: "Inspect Ch.06 Probability & Bayes Lab",
    preferredX: 10,
    preferredZ: 54,
    scaleClass: "medium",
    accentColor: "red",
    secondaryColor: "cream",
    motif: "prob_spinner",
  },
  {
    chapterNum: "07",
    id: "math-ch-07",
    name: "Ch.07 Trig Unit Circle Rotor",
    description:
      "Spinning unit circle phasor and cosine/sine wave arch for acoustics, Fourier analysis, and positional encoding.",
    statusLine: "Inspect Ch.07 Trigonometry Lab",
    preferredX: -12,
    preferredZ: 54,
    scaleClass: "medium",
    accentColor: "sky",
    secondaryColor: "amber",
    motif: "trig_rotor",
  },
  {
    chapterNum: "08",
    id: "math-ch-08",
    name: "Ch.08 Inverse Trig Observatory",
    description:
      "Principal-branch arcsin/arccos mirror pavilion calibrated for inverse kinematics and robot joint angles.",
    statusLine: "Inspect Ch.08 Inverse Trig Functions Lab",
    preferredX: -32,
    preferredZ: 48,
    scaleClass: "medium",
    accentColor: "indigo",
    secondaryColor: "cyan",
    motif: "inv_mirror",
  },
  {
    chapterNum: "09",
    id: "math-ch-09",
    name: "Ch.09 Triangle Properties Sundial",
    description:
      "Law of Sines & Cosines triangular prism monument with circumcircle beacon for land surveying & triangulation.",
    statusLine: "Inspect Ch.09 Properties of Triangles Lab",
    preferredX: -48,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "yellow",
    secondaryColor: "teal",
    motif: "triangle_prism",
  },
  {
    chapterNum: "10",
    id: "math-ch-10",
    name: "Ch.10 Straight Lines Vector Span",
    description:
      "Crossed slope-intercept beams and normal perpendicular bridge modeling linear classifiers and ray marching.",
    statusLine: "Inspect Ch.10 Straight Lines Lab",
    preferredX: -58,
    preferredZ: 14,
    scaleClass: "medium",
    accentColor: "blue",
    secondaryColor: "orange",
    motif: "line_bridge",
  },
  {
    chapterNum: "11",
    id: "math-ch-11",
    name: "Ch.11 Circles & Radar Dish",
    description:
      "Spinning Hough-transform radar tower illustrating tangents, normals, geofencing radii, and radical axes.",
    statusLine: "Inspect Ch.11 Circles & Geofencing Lab",
    preferredX: -58,
    preferredZ: -8,
    scaleClass: "medium",
    accentColor: "screenGreen",
    secondaryColor: "slate",
    motif: "circle_radar",
  },
  {
    chapterNum: "12",
    id: "math-ch-12",
    name: "Ch.12 Conic Sections Dish",
    description:
      "Parabolic reflector, elliptical orbital ring, and hyperbolic LORAN beacon for trajectory optimization.",
    statusLine: "Inspect Ch.12 Conic Sections Lab",
    preferredX: -48,
    preferredZ: -28,
    scaleClass: "medium",
    accentColor: "amber",
    secondaryColor: "blueDark",
    motif: "conic_dish",
  },
  {
    chapterNum: "13",
    id: "math-ch-13",
    name: "Ch.13 Differential Calculus Arch",
    description:
      "Curved gradient arch with sliding tangent pointer demonstrating limits, Sobel edge gradients, and backpropagation.",
    statusLine: "Inspect Ch.13 Differential Calculus Lab",
    preferredX: -32,
    preferredZ: -44,
    scaleClass: "medium",
    accentColor: "magenta",
    secondaryColor: "cyan",
    motif: "diff_curve",
  },
  {
    chapterNum: "14",
    id: "math-ch-14",
    name: "Ch.14 Integral Calculus Terraces",
    description:
      "Stepped Riemann sum area accumulator and ODE flow pillar for flood modeling, fluid dynamics, and diffusion models.",
    statusLine: "Inspect Ch.14 Integral Calculus Lab",
    preferredX: -12,
    preferredZ: -52,
    scaleClass: "medium",
    accentColor: "water",
    secondaryColor: "gold",
    motif: "int_riemann",
  },
  {
    chapterNum: "15",
    id: "math-ch-15",
    name: "Ch.15 Vector Algebra Triad",
    description:
      "Orthogonal i-j-k basis tripod with orbiting cross-product normal modeling 3D game physics and attention dot products.",
    statusLine: "Inspect Ch.15 Vector Algebra Lab",
    preferredX: 12,
    preferredZ: -52,
    scaleClass: "medium",
    accentColor: "red",
    secondaryColor: "lime",
    motif: "vector_tripod",
  },
  {
    chapterNum: "16",
    id: "math-ch-16",
    name: "Ch.16 3D Geometry Spire",
    description:
      "Skew-lines shortest-distance crystal obelisk used for LiDAR point-cloud collision checks and robotics.",
    statusLine: "Inspect Ch.16 3D Geometry Lab",
    preferredX: 32,
    preferredZ: -44,
    scaleClass: "medium",
    accentColor: "screenCyan",
    secondaryColor: "indigo",
    motif: "poly_spire",
  },
  {
    chapterNum: "17",
    id: "math-ch-17",
    name: "Ch.17 Statistics Bell Curve",
    description:
      "Gaussian normal distribution arch with oscillating Z-score beacon for manufacturing QC and ML feature scaling.",
    statusLine: "Inspect Ch.17 Statistics & Z-Score Lab",
    preferredX: 68,
    preferredZ: -30,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "teal",
    motif: "bell_arch",
  },
  {
    chapterNum: "18",
    id: "math-ch-18",
    name: "Ch.18 Mathematical Reasoning Gate",
    description:
      "Glowing AND/OR/NOT digital logic arch with oscillating truth-state core for symbolic reasoning & hardware circuits.",
    statusLine: "Inspect Ch.18 Logic & Reasoning Lab",
    preferredX: 70,
    preferredZ: 28,
    scaleClass: "medium",
    accentColor: "screenGreen",
    secondaryColor: "purple",
    motif: "logic_gate",
  },
  {
    chapterNum: "19",
    id: "math-ch-19",
    name: "Ch.19 Sets & Venn Observatory",
    description:
      "Interlocking rotating Venn rings modeling SQL relational joins, database indexing, and classification boundaries.",
    statusLine: "Inspect Ch.19 Sets, Relations & Functions",
    preferredX: -70,
    preferredZ: 28,
    scaleClass: "medium",
    accentColor: "pink",
    secondaryColor: "cyan",
    motif: "venn_rings",
  },
];

export const MATH_INTERACTIVE_ATTRACTIONS: readonly MathMonumentSpec[] = [
  {
    chapterNum: "HQ",
    id: "math-dev-hq",
    name: "AARUTO + DIPU-_- Dev Arcade HQ",
    description:
      "Creator landmark MADE BY \"AARUTO\" + \"DIPU-_-\"! Click or press E to launch sky-high voxel math fireworks.",
    statusLine: "Launch AARUTO + DIPU-_- Fireworks Salvo",
    preferredX: 16,
    preferredZ: -20,
    scaleClass: "medium",
    accentColor: "pink",
    secondaryColor: "cyan",
    interactionKind: "fireworks_mortar",
    motif: "dev_hq",
  },
  {
    chapterNum: "FX",
    id: "math-toy-piano",
    name: "Harmonic Sine Floor Piano",
    description:
      "Ch.07 Trigonometry music mat curated by AARUTO + DIPU-_-. Walk across or click keys to play C4-C5 harmonic frequencies.",
    statusLine: "Walk or Click Keys to Play Sine Piano",
    preferredX: -14,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "sky",
    secondaryColor: "gold",
    interactionKind: "floor_piano",
    motif: "flat_stage",
  },
  {
    chapterNum: "FX",
    id: "math-toy-sequencer",
    name: "Fourier Beat Matrix Sequencer",
    description:
      "Interactive 8x4 rhythm & harmonic series synth matrix built by AARUTO + DIPU-_-. Toggle pads to compose live chiptune beats.",
    statusLine: "Toggle Pads on Fourier Step Sequencer",
    preferredX: 22,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "lime",
    secondaryColor: "magenta",
    interactionKind: "step_sequencer",
    motif: "flat_stage",
  },
  {
    chapterNum: "FX",
    id: "math-toy-lights",
    name: "Boolean Lights-Out Logic Matrix",
    description:
      "Ch.18 Mathematical Reasoning puzzle shrine. Ignite all 9 glowing logic cubes using XOR neighborhood toggles.",
    statusLine: "Solve Boolean 3x3 Lights-Out Matrix",
    preferredX: 40,
    preferredZ: 18,
    scaleClass: "medium",
    accentColor: "screenGreen",
    secondaryColor: "cyan",
    interactionKind: "lights_out",
    motif: "flat_stage",
  },
  {
    chapterNum: "FX",
    id: "math-toy-simon",
    name: "Permutation Simon Memory Synth",
    description:
      "Ch.03 Permutations 4-pad synth challenge designed by AARUTO + DIPU-_-. Repeat escalating musical sequences.",
    statusLine: "Play Permutation Simon Memory Synth",
    preferredX: 38,
    preferredZ: -12,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "gold",
    interactionKind: "simon_synth",
    motif: "flat_stage",
  },
  {
    chapterNum: "FX",
    id: "math-toy-marble",
    name: "Fibonacci Helical Marble Cascade",
    description:
      "Kinetic calculus helix tower where musical glowing voxel marbles spiral down along a golden-ratio path.",
    statusLine: "Drop Marbles Down Fibonacci Helix",
    preferredX: -24,
    preferredZ: -32,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "cyan",
    interactionKind: "marble_run",
    motif: "marble_tower",
  },
  {
    chapterNum: "FX",
    id: "math-toy-tesla",
    name: "Complex Impedance Tesla Coil",
    description:
      "Ch.01 AC Phasor & Nikola Tesla coil tower. Trigger 500,000V glowing harmonic lightning arcs across MATH_LAND.",
    statusLine: "Trigger Complex Impedance Tesla Arc",
    preferredX: 46,
    preferredZ: -38,
    scaleClass: "medium",
    accentColor: "cyan",
    secondaryColor: "purple",
    interactionKind: "tesla_coil",
    motif: "tesla_spire",
  },
  {
    chapterNum: "FX",
    id: "math-toy-gravity",
    name: "Vector Eigen Gravity Inverter",
    description:
      "Ch.15 Vector transformation monument. Click to invert gravity and flip this glowing voxel cube 180 degrees.",
    statusLine: "Flip Vector Gravity Inverter Cube",
    preferredX: -38,
    preferredZ: 12,
    scaleClass: "medium",
    accentColor: "purple",
    secondaryColor: "mint",
    interactionKind: "gravity_inverter",
    motif: "gravity_cube",
  },
  {
    chapterNum: "FX",
    id: "math-toy-hoop",
    name: "Parabolic Conic Trick-Shot Hoop",
    description:
      "Ch.12 Projectile parabola court created by AARUTO + DIPU-_-. Shoot 2pt and 3pt quadratic trajectories from the court pads.",
    statusLine: "Shoot Parabolic Trick-Shots on Court",
    preferredX: -36,
    preferredZ: -14,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "white",
    interactionKind: "basketball_hoop",
    motif: "parabolic_hoop",
  },
  {
    chapterNum: "CAR",
    id: "math-turbo-roadster",
    name: "Pixel Turbo Roadster Car",
    description:
      "Drivable crimson & gold voxel sports roadster built for MATH_LAND by AARUTO + DIPU-_-. Press E or click DRIVE CAR to steer with WASD, Shift Turbo & H Horn!",
    statusLine: "Ready to Drive · Press E or Click CAR",
    preferredX: 11.5,
    preferredZ: -10.5,
    scaleClass: "medium",
    accentColor: "red",
    secondaryColor: "gold",
    motif: "turbo_roadster",
    behavior: {
      type: "landmark",
      facingYaw: 0.35,
      activity: "Parked · Ready to Drive!",
      statusLine: "Press E or click CAR to drive around MATH_LAND!",
    },
  },
  {
    chapterNum: "TRN",
    id: "math-express-train",
    name: "MATH_LAND Express Train",
    description:
      "Steam locomotive & emerald coach gliding along MATH_LAND's scenic circular railway tracks. Hop aboard [E] or click RIDE TRAIN!",
    statusLine: "Scenic Rail Express · Press E to Board",
    preferredX: 0,
    preferredZ: -64,
    scaleClass: "large",
    accentColor: "crimson",
    secondaryColor: "gold",
    motif: "express_train",
    behavior: {
      type: "vehicle_route",
      loopMode: "loop",
      speed: 5.4,
      waypoints: [
        [0, -64],
        [46, -54],
        [62, -16],
        [62, 22],
        [42, 56],
        [0, 64],
        [-44, 54],
        [-62, 18],
        [-62, -18],
        [-44, -54],
      ],
      stops: [
        { id: "stop-ml-central", name: "Central Train Station", x: 0, z: -64, dwellSec: 2.2 },
        { id: "stop-ml-east", name: "Arcade East Junction", x: 62, z: -16, dwellSec: 1.8 },
        { id: "stop-ml-south", name: "South Harbor Station", x: 0, z: 64, dwellSec: 1.8 },
      ],
      statusLine: "Steam Express touring the MATH_LAND scenic railway!",
    },
  },
  {
    chapterNum: "STN",
    id: "math-train-station",
    name: "Central Express Train Station",
    description:
      "Covered brick-and-brass railway station built by AARUTO + DIPU-_- along the MATH_LAND Express loop.",
    statusLine: "Central Train Station · Catch the Express!",
    preferredX: 0,
    preferredZ: -74,
    scaleClass: "medium",
    accentColor: "brick",
    secondaryColor: "gold",
    motif: "train_station",
  },
];

function buildMotifBlueprint(spec: MathMonumentSpec): VoxelBlueprint {
  const ops: VoxelOp[] = [
    // Crisp chamfered stone plinth base
    { op: "box", x0: -5, y0: 0, z0: -5, x1: 5, y1: 1, z1: 5, color: "slate" },
    { op: "box", x0: -4, y0: 1, z0: -4, x1: 4, y1: 2, z1: 4, color: "marble" },
    { op: "box", x0: -1, y0: 2, z0: 4, x1: 1, y1: 2, z1: 5, color: spec.accentColor, emit: 1.0 },
  ];
  const parts: VoxelPart[] = [];
  const c1 = spec.accentColor;
  const c2 = spec.secondaryColor;

  switch (spec.motif) {
    case "cube_grid":
      ops.push(
        { op: "box", x0: -3, y0: 2, z0: -3, x1: -2, y1: 9, z1: -2, color: "iron", mirrorX: true },
        { op: "box", x0: -3, y0: 2, z0: 2, x1: -2, y1: 9, z1: 3, color: "iron", mirrorX: true },
        { op: "box", x0: -3, y0: 9, z0: -3, x1: 3, y1: 10, z1: 3, color: c1, emit: 0.7 },
      );
      parts.push({
        name: "matrix-core",
        kind: "spinY",
        speed: 0.9,
        pivot: [0, 5.5, 0],
        ops: [
          { op: "box", x0: -1, y0: -2, z0: -1, x1: 1, y1: 1, z1: 1, color: c2, emit: 1.3 },
          { op: "box", x0: -2, y0: 0, z0: 0, x1: 2, y1: 0, z1: 0, color: c1 },
        ],
      });
      break;
    case "argand_spire":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 12, radius: 1.2, color: "slateLight" },
        { op: "box", x0: -4, y0: 3, z0: 0, x1: 4, y1: 3, z1: 0, color: c1 },
        { op: "box", x0: 0, y0: 3, z0: -4, x1: 0, y1: 3, z1: 4, color: c1 },
      );
      parts.push({
        name: "roots-phasor",
        kind: "spinY",
        speed: 1.2,
        pivot: [0, 12.5, 0],
        ops: [
          { op: "box", x0: -4, y0: 0, z0: 0, x1: 4, y1: 1, z1: 0, color: c2, emit: 1.2 },
          { op: "box", x0: 0, y0: 0, z0: -4, x1: 0, y1: 1, z1: 4, color: c1, emit: 1.2 },
        ],
      });
      break;
    case "matrix_gate":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: -3, y1: 11, z1: 1, color: c1, mirrorX: true },
        { op: "box", x0: -4, y0: 11, z0: -1, x1: 4, y1: 12, z1: 1, color: c1 },
      );
      parts.push({
        name: "det-grid",
        kind: "swingY",
        speed: 1.1,
        amp: 0.4,
        pivot: [0, 6.5, 0],
        ops: [
          { op: "box", x0: -2, y0: -3, z0: 0, x1: 2, y1: 3, z1: 0, color: "steelLight" },
          { op: "box", x0: -2, y0: 1, z0: 0, x1: -1, y1: 2, z1: 0, color: c2, emit: 1.2 },
          { op: "box", x0: 1, y0: -2, z0: 0, x1: 2, y1: -1, z1: 0, color: c2, emit: 1.2 },
        ],
      });
      break;
    case "combo_stair":
      for (let i = 0; i < 6; i++) {
        ops.push({
          op: "box",
          x0: -3 + i,
          y0: 2,
          z0: -2,
          x1: -2 + i,
          y1: 3 + i,
          z1: 2,
          color: i % 2 === 0 ? c1 : c2,
        });
      }
      parts.push({
        name: "cipher-crown",
        kind: "spinY",
        speed: 1.4,
        pivot: [0, 10, 0],
        ops: [
          { op: "box", x0: -2, y0: 0, z0: -2, x1: 2, y1: 2, z1: 2, color: "gold", emit: 1.0 },
        ],
      });
      break;
    case "pascal_pyramid":
      for (let row = 0; row < 5; row++) {
        const w = 4 - row;
        ops.push({
          op: "box",
          x0: -w,
          y0: 2 + row * 2,
          z0: -1,
          x1: w,
          y1: 3 + row * 2,
          z1: 1,
          color: row % 2 === 0 ? c1 : c2,
        });
      }
      parts.push({
        name: "apex-beacon",
        kind: "bob",
        speed: 1.8,
        amp: 0.45,
        pivot: [0, 13, 0],
        ops: [{ op: "sphere", cx: 0, cy: 0, cz: 0, rx: 1.4, ry: 1.4, rz: 1.4, color: "warmGlow", emit: 1.4 }],
      });
      break;
    case "series_spiral":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 13, radius: 1.0, color: "marbleShade" },
        { op: "box", x0: -3, y0: 4, z0: 0, x1: 0, y1: 5, z1: 2, color: c1 },
        { op: "box", x0: 0, y0: 7, z0: -2, x1: 3, y1: 8, z1: 0, color: c2 },
        { op: "box", x0: -2, y0: 10, z0: -2, x1: 0, y1: 11, z1: 0, color: c1 },
      );
      parts.push({
        name: "helix-orb",
        kind: "spinY",
        speed: 1.6,
        pivot: [0, 13.5, 0],
        ops: [
          { op: "box", x0: -3, y0: 0, z0: 0, x1: 3, y1: 1, z1: 0, color: c2, emit: 1.3 },
        ],
      });
      break;
    case "prob_spinner":
      ops.push(
        { op: "box", x0: -3, y0: 2, z0: -3, x1: 3, y1: 7, z1: 3, color: c2 },
        { op: "box", x0: -1, y0: 4, z0: 3, x1: 0, y1: 5, z1: 3, color: c1 },
        { op: "box", x0: 1, y0: 5, z0: 3, x1: 2, y1: 6, z1: 3, color: c1 },
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 7, y1: 10, radius: 0.8, color: "iron" },
      );
      parts.push({
        name: "prob-wheel",
        kind: "spinY",
        speed: 2.0,
        pivot: [0, 11, 0],
        ops: [
          { op: "box", x0: -4, y0: 0, z0: -1, x1: 0, y1: 1, z1: 1, color: c1, emit: 1.0 },
          { op: "box", x0: 1, y0: 0, z0: -1, x1: 4, y1: 1, z1: 1, color: "gold", emit: 1.0 },
        ],
      });
      break;
    case "trig_rotor":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: -3, y1: 11, z1: 1, color: "steel", mirrorX: true },
        { op: "box", x0: -3, y0: 6, z0: 0, x1: 3, y1: 6, z1: 0, color: "slateLight" },
      );
      parts.push({
        name: "unit-phasor",
        kind: "spinZ",
        speed: 1.4,
        pivot: [0, 6.5, 0],
        ops: [
          { op: "box", x0: -1, y0: -1, z0: 0, x1: 1, y1: 4, z1: 0, color: c1, emit: 1.3 },
          { op: "box", x0: -1, y0: 3, z0: -1, x1: 1, y1: 4, z1: 1, color: c2, emit: 1.5 },
        ],
      });
      break;
    case "inv_mirror":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: 4, y1: 3, z1: 1, color: c1 },
        { op: "box", x0: -3, y0: 3, z0: 0, x1: -2, y1: 10, z1: 0, color: "iron", mirrorX: true },
        { op: "box", x0: -2, y0: 4, z0: 0, x1: 2, y1: 9, z1: 0, color: "glass", emit: 0.9 },
      );
      parts.push({
        name: "arc-needle",
        kind: "swingZ",
        speed: 1.5,
        amp: 0.6,
        pivot: [0, 10.5, 0],
        ops: [{ op: "box", x0: -3, y0: 0, z0: 0, x1: 3, y1: 1, z1: 0, color: c2, emit: 1.3 }],
      });
      break;
    case "triangle_prism":
      for (let y = 0; y < 7; y++) {
        const half = Math.max(0, Math.floor((6 - y) / 2));
        ops.push({ op: "box", x0: -half, y0: 2 + y, z0: -half, x1: half, y1: 2 + y, z1: half, color: c1 });
      }
      parts.push({
        name: "circum-ring",
        kind: "spinY",
        speed: 1.1,
        pivot: [0, 10, 0],
        ops: [{ op: "box", x0: -3, y0: 0, z0: -1, x1: 3, y1: 1, z1: 1, color: c2, emit: 1.2 }],
      });
      break;
    case "line_bridge":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -2, x1: -3, y1: 8, z1: 2, color: c1, mirrorX: true },
        { op: "box", x0: -4, y0: 8, z0: -1, x1: 4, y1: 9, z1: 1, color: c2, emit: 0.9 },
      );
      parts.push({
        name: "slope-beam",
        kind: "swingZ",
        speed: 1.0,
        amp: 0.45,
        pivot: [0, 10, 0],
        ops: [{ op: "box", x0: -4, y0: 0, z0: 0, x1: 4, y1: 1, z1: 0, color: c1, emit: 1.2 }],
      });
      break;
    case "circle_radar":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 8, radius: 2.2, color: "slateLight" },
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 8, y1: 9, radius: 3.4, color: c2 },
      );
      parts.push({
        name: "radar-sweep",
        kind: "spinY",
        speed: 1.9,
        pivot: [0, 10, 0],
        ops: [
          { op: "box", x0: -1, y0: 0, z0: -1, x1: 1, y1: 3, z1: 1, color: "iron" },
          { op: "box", x0: -4, y0: 2, z0: 0, x1: 4, y1: 3, z1: 1, color: c1, emit: 1.5 },
        ],
      });
      break;
    case "conic_dish":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 5, radius: 1.5, color: c2 },
        { op: "box", x0: -4, y0: 5, z0: -4, x1: 4, y1: 6, z1: 4, color: "chrome" },
        { op: "box", x0: -4, y0: 6, z0: -4, x1: -3, y1: 8, z1: 4, color: "silver", mirrorX: true },
        { op: "box", x0: -3, y0: 6, z0: -4, x1: 3, y1: 8, z1: -3, color: "silver" },
        { op: "box", x0: -3, y0: 6, z0: 3, x1: 3, y1: 8, z1: 4, color: "silver" },
      );
      parts.push({
        name: "focal-probe",
        kind: "bob",
        speed: 1.7,
        amp: 0.4,
        pivot: [0, 10.5, 0],
        ops: [{ op: "sphere", cx: 0, cy: 0, cz: 0, rx: 1.5, ry: 1.5, rz: 1.5, color: c1, emit: 1.5 }],
      });
      break;
    case "diff_curve":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: -3, y1: 10, z1: 1, color: c2 },
        { op: "box", x0: -2, y0: 2, z0: -1, x1: -1, y1: 7, z1: 1, color: c1 },
        { op: "box", x0: 0, y0: 2, z0: -1, x1: 1, y1: 6, z1: 1, color: c1 },
        { op: "box", x0: 2, y0: 2, z0: -1, x1: 3, y1: 9, z1: 1, color: c2 },
      );
      parts.push({
        name: "tangent-bar",
        kind: "swingZ",
        speed: 1.4,
        amp: 0.5,
        pivot: [0, 10.5, 0],
        ops: [{ op: "box", x0: -4, y0: 0, z0: 0, x1: 4, y1: 1, z1: 0, color: "warmGlow", emit: 1.4 }],
      });
      break;
    case "int_riemann":
      for (let i = -3; i <= 3; i++) {
        const h = 3 + Math.round(5 * Math.cos((i / 3) * 0.9));
        ops.push({
          op: "box",
          x0: i,
          y0: 2,
          z0: -2,
          x1: i,
          y1: h,
          z1: 2,
          color: i % 2 === 0 ? c1 : c2,
        });
      }
      parts.push({
        name: "area-float",
        kind: "bob",
        speed: 1.5,
        amp: 0.4,
        pivot: [0, 10.5, 0],
        ops: [{ op: "box", x0: -3, y0: 0, z0: -1, x1: 3, y1: 1, z1: 1, color: c1, emit: 1.2 }],
      });
      break;
    case "vector_tripod":
      ops.push(
        { op: "box", x0: -1, y0: 2, z0: -1, x1: 1, y1: 10, z1: 1, color: "lime" },
        { op: "box", x0: 1, y0: 3, z0: 0, x1: 4, y1: 4, z1: 1, color: c1, emit: 1.0 },
        { op: "box", x0: 0, y0: 3, z0: 1, x1: 1, y1: 4, z1: 4, color: "sky", emit: 1.0 },
      );
      parts.push({
        name: "cross-rotor",
        kind: "spinY",
        speed: 1.3,
        pivot: [0, 11.5, 0],
        ops: [{ op: "box", x0: -3, y0: 0, z0: -1, x1: 3, y1: 1, z1: 1, color: c2, emit: 1.4 }],
      });
      break;
    case "poly_spire":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 11, radius: 1.6, color: c2 },
        { op: "box", x0: -3, y0: 5, z0: -3, x1: 3, y1: 6, z1: 3, color: c1 },
      );
      parts.push({
        name: "crystal-octa",
        kind: "spinY",
        speed: 1.0,
        pivot: [0, 13, 0],
        ops: [
          { op: "box", x0: -2, y0: -1, z0: -2, x1: 2, y1: 1, z1: 2, color: c1, emit: 1.5 },
          { op: "box", x0: -1, y0: -2, z0: -1, x1: 1, y1: 2, z1: 1, color: "white", emit: 1.2 },
        ],
      });
      break;
    case "bell_arch":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: -3, y1: 4, z1: 1, color: c2, mirrorX: true },
        { op: "box", x0: -2, y0: 2, z0: -1, x1: -1, y1: 7, z1: 1, color: c1, mirrorX: true },
        { op: "box", x0: -1, y0: 2, z0: -1, x1: 1, y1: 10, z1: 1, color: "gold" },
      );
      parts.push({
        name: "z-beacon",
        kind: "swingZ",
        speed: 1.3,
        amp: 0.35,
        pivot: [0, 11.5, 0],
        ops: [{ op: "box", x0: -1, y0: 0, z0: -1, x1: 1, y1: 2, z1: 1, color: c1, emit: 1.4 }],
      });
      break;
    case "logic_gate":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -2, x1: -2, y1: 10, z1: 2, color: c2, mirrorX: true },
        { op: "box", x0: -4, y0: 9, z0: -2, x1: 4, y1: 11, z1: 2, color: "iron" },
      );
      parts.push({
        name: "logic-pulse",
        kind: "bob",
        speed: 1.9,
        amp: 0.45,
        pivot: [0, 6, 0],
        ops: [{ op: "box", x0: -1, y0: -1, z0: -1, x1: 1, y1: 1, z1: 1, color: c1, emit: 1.6 }],
      });
      break;
    case "dev_hq":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -4, x1: -2, y1: 11, z1: -2, color: "cyan", emit: 0.9 },
        { op: "box", x0: 2, y0: 2, z0: -4, x1: 4, y1: 11, z1: -2, color: "pink", emit: 0.9 },
        { op: "box", x0: -4, y0: 11, z0: -4, x1: 4, y1: 13, z1: -2, color: "gold", emit: 1.1 },
        { op: "cylinder", axis: "y", cx: 0, cz: 1, y0: 2, y1: 7, radius: 1.5, color: "iron" },
        { op: "cylinder", axis: "y", cx: 0, cz: 1, y0: 7, y1: 8, radius: 1.8, color: "gold", emit: 1.0 },
      );
      parts.push({
        name: "creator-crown",
        kind: "spinY",
        speed: 1.35,
        pivot: [0, 15.5, -3],
        ops: [
          { op: "box", x0: -2, y0: 0, z0: -1, x1: 0, y1: 2, z1: 1, color: "cyan", emit: 1.4 },
          { op: "box", x0: 1, y0: 0, z0: -1, x1: 3, y1: 2, z1: 1, color: "pink", emit: 1.4 },
        ],
      });
      break;
    case "flat_stage":
      // Low open-sky platform specifically tuned so floor_piano / lights_out / simon_synth / step_sequencer mount on center top
      ops.length = 0;
      ops.push(
        { op: "box", x0: -5, y0: 0, z0: -5, x1: 5, y1: 1, z1: 5, color: "slate" },
        { op: "box", x0: -4, y0: 1, z0: -4, x1: 4, y1: 2, z1: 4, color: "marble" },
        { op: "box", x0: -4, y0: 2, z0: 4, x1: 4, y1: 2, z1: 5, color: c1, emit: 1.0 },
        { op: "box", x0: -5, y0: 1, z0: -5, x1: -4, y1: 4, z1: -4, color: c2, emit: 0.9, mirrorX: true },
      );
      break;
    case "marble_tower":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 13, radius: 1.4, color: "slateLight" },
        { op: "box", x0: -3, y0: 4, z0: -1, x1: 3, y1: 5, z1: 1, color: c1 },
        { op: "box", x0: -1, y0: 8, z0: -3, x1: 1, y1: 9, z1: 3, color: c2 },
        { op: "box", x0: -2, y0: 12, z0: -2, x1: 2, y1: 13, z1: 2, color: "gold", emit: 1.1 },
      );
      break;
    case "tesla_spire":
      ops.push(
        { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 2, y1: 11, radius: 1.5, color: "copper" },
        { op: "ring", axis: "y", cx: 0, cz: 0, y0: 7, y1: 8, outerR: 3.2, innerR: 1.6, color: "brass", emit: 0.6 },
        { op: "ring", axis: "y", cx: 0, cz: 0, y0: 10, y1: 11, outerR: 3.6, innerR: 1.5, color: c1, emit: 1.1 },
        { op: "sphere", cx: 0, cy: 13, cz: 0, rx: 2.2, ry: 2.0, rz: 2.2, color: "chrome", emit: 0.8 },
      );
      break;
    case "gravity_cube":
      ops.push(
        { op: "box", x0: -3, y0: 2, z0: -3, x1: 3, y1: 4, z1: 3, color: "slateLight" },
        { op: "box", x0: -2, y0: 5, z0: -2, x1: 2, y1: 9, z1: 2, color: c1, emit: 1.0 },
        { op: "box", x0: -1, y0: 6, z0: -3, x1: 1, y1: 8, z1: 3, color: c2, emit: 1.2 },
      );
      break;
    case "parabolic_hoop":
      ops.push(
        { op: "box", x0: -1, y0: 2, z0: -5, x1: 1, y1: 11, z1: -4, color: "iron" },
        { op: "box", x0: -3, y0: 9, z0: -4, x1: 3, y1: 13, z1: -3, color: "white" },
        { op: "box", x0: -1, y0: 10, z0: -3, x1: 1, y1: 11, z1: -3, color: "orange", emit: 0.9 },
      );
      break;
    case "turbo_roadster":
      ops.length = 0;
      ops.push(
        // Chassis & sculpted crimson body
        { op: "box", x0: -4, y0: 1, z0: -8, x1: 4, y1: 3, z1: 8, color: "red" },
        { op: "box", x0: -1, y0: 3, z0: 2, x1: 1, y1: 4, z1: 8, color: "gold", emit: 0.4 },
        { op: "box", x0: -4, y0: 3, z0: 2, x1: -2, y1: 4, z1: 8, color: "crimson", mirrorX: true },
        // Open cockpit walls & racing seat
        { op: "box", x0: -4, y0: 3, z0: -6, x1: -3, y1: 5, z1: 2, color: "red", mirrorX: true },
        { op: "box", x0: -2, y0: 2, z0: -4, x1: 2, y1: 3, z1: 1, color: "charcoal" },
        { op: "box", x0: -2, y0: 3, z0: -5, x1: 2, y1: 5, z1: -4, color: "leather" },
        // Steering wheel & dash
        { op: "box", x0: -2, y0: 4, z0: 1, x1: 2, y1: 5, z1: 2, color: "slate" },
        { op: "box", x0: -1, y0: 5, z0: 0, x1: 1, y1: 6, z1: 1, color: "gold" },
        // Windshield & rear wing spoiler
        { op: "box", x0: -3, y0: 5, z0: 1, x1: 3, y1: 7, z1: 2, color: "glass", emit: 0.45 },
        { op: "box", x0: -4, y0: 4, z0: -8, x1: 4, y1: 5, z1: -6, color: "crimson" },
        { op: "box", x0: -4, y0: 6, z0: -8, x1: 4, y1: 7, z1: -7, color: "gold", emit: 0.5 },
        // Headlights & tail lamps
        { op: "box", x0: -3, y0: 2, z0: 8, x1: -2, y1: 3, z1: 8, color: "warmGlow", emit: 1.5, mirrorX: true },
        { op: "box", x0: -3, y0: 2, z0: -8, x1: -2, y1: 3, z1: -8, color: "magenta", emit: 1.3, mirrorX: true },
      );
      [
        [-4, 5, "wheel-fl"],
        [4, 5, "wheel-fr"],
        [-4, -5, "wheel-rl"],
        [4, -5, "wheel-rr"],
      ].forEach(([wx, wz, wName]) => {
        parts.push({
          name: wName,
          kind: "wheel",
          speed: 1.0,
          pivot: [wx, 2, wz],
          ops: [
            { op: "cylinder", axis: "x", cy: 0, cz: 0, x0: -1, x1: 1, radius: 2.0, color: "rubber" },
            { op: "box", x0: -1, y0: -1, z0: -1, x1: 1, y1: 1, z1: 1, color: "silver" },
          ],
        });
      });
      break;
    case "express_train":
      ops.length = 0;
      ops.push(
        // Heavy iron chassis & brass cowcatcher
        { op: "box", x0: -4, y0: 2, z0: -12, x1: 4, y1: 3, z1: 10, color: "charcoal" },
        { op: "box", x0: -3, y0: 1, z0: 10, x1: 3, y1: 3, z1: 12, color: "gold" },
        // Steam boiler & brass bands (front half z: +2..+10)
        { op: "cylinder", axis: "z", cx: 0, cy: 6, z0: 1, z1: 10, radius: 3.1, color: "iron" },
        { op: "box", x0: -3, y0: 4, z0: 4, x1: 3, y1: 8, z1: 5, color: "brass" },
        { op: "box", x0: -3, y0: 4, z0: 8, x1: 3, y1: 8, z1: 9, color: "brass" },
        // Tall smokestack chimney & glowing golden headlamp
        { op: "cylinder", axis: "y", cx: 0, cz: 8, y0: 8, y1: 13, radius: 1.3, color: "black" },
        { op: "cylinder", axis: "y", cx: 0, cz: 8, y0: 12, y1: 13, radius: 1.7, color: "brass" },
        { op: "box", x0: -1, y0: 6, z0: 10, x1: 1, y1: 8, z1: 11, color: "warmGlow", emit: 1.8 },
        // Crimson locomotive cab (z: -2..+2)
        { op: "box", x0: -4, y0: 3, z0: -2, x1: 4, y1: 10, z1: 2, color: "crimson" },
        { op: "box", x0: -4, y0: 10, z0: -3, x1: 4, y1: 11, z1: 3, color: "gold" },
        { op: "box", x0: -4, y0: 6, z0: -1, x1: -4, y1: 8, z1: 1, color: "warmGlow", emit: 1.1, mirrorX: true },
        // Coupled emerald-gold passenger carriage (z: -12..-3)
        { op: "box", x0: -4, y0: 3, z0: -12, x1: 4, y1: 9, z1: -3, color: "tealDark" },
        { op: "box", x0: -4, y0: 9, z0: -12, x1: 4, y1: 10, z1: -3, color: "cream" },
        { op: "box", x0: -4, y0: 5, z0: -10, x1: -4, y1: 7, z1: -8, color: "warmGlow", emit: 1.2, mirrorX: true },
        { op: "box", x0: -4, y0: 5, z0: -6, x1: -4, y1: 7, z1: -4, color: "warmGlow", emit: 1.2, mirrorX: true },
        { op: "box", x0: -3, y0: 3, z0: -12, x1: 3, y1: 4, z1: -12, color: "red", emit: 1.2 },
      );
      [
        [-4, 7, "loco-wheel-fl"],
        [4, 7, "loco-wheel-fr"],
        [-4, 2, "loco-wheel-ml"],
        [4, 2, "loco-wheel-mr"],
        [-4, -5, "coach-wheel-fl"],
        [4, -5, "coach-wheel-fr"],
        [-4, -10, "coach-wheel-rl"],
        [4, -10, "coach-wheel-rr"],
      ].forEach(([wx, wz, wName]) => {
        parts.push({
          name: wName,
          kind: "wheel",
          speed: 1.0,
          pivot: [wx, 2, wz],
          ops: [
            { op: "cylinder", axis: "x", cy: 0, cz: 0, x0: -1, x1: 1, radius: 1.8, color: "iron" },
            { op: "box", x0: -1, y0: -1, z0: -1, x1: 1, y1: 1, z1: 1, color: "gold" },
          ],
        });
      });
      break;
    case "train_station":
      ops.push(
        { op: "box", x0: -5, y0: 2, z0: -3, x1: 5, y1: 8, z1: -1, color: "brick" },
        { op: "box", x0: -5, y0: 2, z0: 2, x1: -4, y1: 8, z1: 3, color: "woodDark", mirrorX: true },
        { op: "box", x0: -6, y0: 8, z0: -4, x1: 6, y1: 10, z1: 4, color: "crimson" },
        { op: "box", x0: -2, y0: 10, z0: -2, x1: 2, y1: 14, z1: 2, color: "brickDark" },
        { op: "box", x0: -1, y0: 11, z0: 2, x1: 1, y1: 13, z1: 2, color: "warmGlow", emit: 1.4 },
      );
      parts.push({
        name: "station-signal",
        kind: "spinY",
        speed: 1.2,
        pivot: [0, 15.5, 0],
        ops: [{ op: "box", x0: -1, y0: 0, z0: -1, x1: 1, y1: 1, z1: 1, color: "gold", emit: 1.5 }],
      });
      break;
    case "venn_rings":
    default:
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -1, x1: -3, y1: 6, z1: 1, color: c1, mirrorX: true },
        { op: "box", x0: -2, y0: 4, z0: -1, x1: 2, y1: 6, z1: 1, color: "gold", emit: 1.1 },
      );
      parts.push({
        name: "venn-orbit",
        kind: "spinY",
        speed: 1.1,
        pivot: [0, 9, 0],
        ops: [
          { op: "box", x0: -4, y0: 0, z0: -1, x1: -1, y1: 2, z1: 1, color: c1, emit: 1.2 },
          { op: "box", x0: 1, y0: 0, z0: -1, x1: 4, y1: 2, z1: 1, color: c2, emit: 1.2 },
        ],
      });
      break;
  }

  return normalizeAndGroundBlueprint({
    name: spec.name,
    description: spec.description,
    category: "prop",
    scaleClass: spec.scaleClass,
    ops,
    parts,
    ...(spec.interactionKind ? { interaction: { kind: spec.interactionKind } } : {}),
  });
}

function findCleanMonumentSpot(
  prefX: number,
  prefZ: number,
  newR: number,
  creations: WorldCreation[],
  paths: WorldPath[],
): [number, number] {
  const isClear = (tx: number, tz: number) => {
    const [ix, iz] = clampPointToIsland(tx, tz, newR + 3.0);
    if (Math.hypot(ix - tx, iz - tz) > 0.3) return false;
    for (const c of creations) {
      const cr = getCreationFootprintRadius(
        c.scaleClass,
        c.blueprint?.stats?.footprintX ?? 14,
        c.blueprint?.stats?.footprintZ ?? 14,
      );
      if (Math.hypot(c.x - tx, c.z - tz) < cr + newR + 2.4) return false;
    }
    for (const p of paths) {
      if (p.kind === "footpath") continue;
      if (distPointToPolyline2D(tx, tz, p.points).dist < newR + 3.2) return false;
    }
    return true;
  };

  if (isClear(prefX, prefZ)) return [prefX, prefZ];
  for (let rad = 2.0; rad <= 32; rad += 2.0) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const cx = Number((prefX + Math.cos(a) * rad).toFixed(1));
      const cz = Number((prefZ + Math.sin(a) * rad).toFixed(1));
      if (isClear(cx, cz)) return [cx, cz];
    }
  }
  return clampPointToIsland(prefX, prefZ, newR + 3.0);
}

export function ensureMathCampusCreations(
  creations: WorldCreation[],
  existingPaths: WorldPath[],
): boolean {
  let added = false;
  const baseTs = Date.now() - 86_400_000;
  const existingIds = new Set(creations.map((c) => c.id));

  const allSpecs: readonly MathMonumentSpec[] = [
    ...MATH_CHAPTER_MONUMENTS,
    ...MATH_INTERACTIVE_ATTRACTIONS,
  ];

  for (let i = 0; i < allSpecs.length; i++) {
    const spec = allSpecs[i];
    if (existingIds.has(spec.id)) continue;

    const blueprint = buildMotifBlueprint(spec);
    const newR = getCreationFootprintRadius(
      spec.scaleClass,
      blueprint.stats?.footprintX ?? 10,
      blueprint.stats?.footprintZ ?? 10,
    );
    const [px, pz] =
      spec.behavior?.type === "vehicle_route"
        ? [spec.preferredX, spec.preferredZ]
        : findCleanMonumentSpot(
            spec.preferredX,
            spec.preferredZ,
            newR,
            creations,
            existingPaths,
          );

    const creation: WorldCreation = {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      creatorPrompt:
        spec.chapterNum === "HQ" ||
        spec.chapterNum === "FX" ||
        spec.chapterNum === "CAR" ||
        spec.chapterNum === "TRN" ||
        spec.chapterNum === "STN"
          ? `MATH_LAND Interactive Attraction by AARUTO + DIPU-_-: ${spec.name}`
          : `MATH_LAND Chapter ${spec.chapterNum}: ${spec.name}`,
      category: "prop",
      scaleClass: spec.scaleClass,
      x: Number(px.toFixed(2)),
      z: Number(pz.toFixed(2)),
      yaw: spec.behavior && "facingYaw" in spec.behavior ? Number(spec.behavior.facingYaw || 0) : 0,
      blueprint,
      behavior: spec.behavior
        ? { ...spec.behavior }
        : {
            type: "landmark",
            facingYaw: 0,
            activity:
              spec.chapterNum === "HQ"
                ? "AARUTO + DIPU-_- Dev Arcade HQ"
                : spec.chapterNum === "FX"
                  ? `Playing ${spec.name}`
                  : `Exploring Chapter ${spec.chapterNum}`,
            statusLine: spec.statusLine,
          },
      liveFeed: null,
      integratedLevel: 1,
      createdAt: baseTs + i * 1000,
      isSeed: true,
    };
    if (creation.behavior?.type !== "vehicle_route" && spec.id !== "math-turbo-roadster") {
      const roadYaw = computeIntelligentBuildingYaw(creation, existingPaths);
      if (typeof roadYaw === "number") {
        creation.yaw = roadYaw;
        if (creation.behavior?.type === "landmark") {
          creation.behavior.facingYaw = roadYaw;
        }
      }
    }

    creations.push(creation);
    existingIds.add(spec.id);
    added = true;
  }

  return added;
}
