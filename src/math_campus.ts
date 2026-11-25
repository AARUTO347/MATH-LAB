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
  category?: WorldCreation["category"];
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
    | "graph_studio"
    | "dev_hq"
    | "cozy_house"
    | "flat_stage"
    | "marble_tower"
    | "tesla_spire"
    | "gravity_cube"
    | "parabolic_hoop"
    | "turbo_roadster"
    | "rally_coupe"
    | "dune_buggy"
    | "express_train"
    | "train_station"
    | "abacus_frame"
    | "fraction_stand"
    | "balance_scale"
    | "pendulum_tower"
    | "rocket_pad"
    | "ferris_wheel";
  behavior?: WorldCreation["behavior"];
}

export const MATH_CHAPTER_MONUMENTS: readonly MathMonumentSpec[] = [
  {
    chapterNum: "00",
    id: "math-ch-00",
    name: "Ch.00 SST-LAB 4-Pillar Atlas Hub",
    description:
      "Interactive CBSE Social Science pavilion uniting History, Geography, Civics & Economics timelines and spatial models.",
    statusLine: "Inspect Ch.00 SST-LAB 4-Pillar Atlas Lab",
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
    name: "Ch.01 Indus Valley Citadel Spire",
    description:
      "Harappan & Mohenjo-daro planned urban grid monument showcasing baked brick drainage, Great Bath & granary trade.",
    statusLine: "Inspect Ch.01 Indus Valley Civilization Lab",
    preferredX: 46,
    preferredZ: -24,
    scaleClass: "medium",
    accentColor: "terracotta",
    secondaryColor: "amber",
    motif: "argand_spire",
  },
  {
    chapterNum: "02",
    id: "math-ch-02",
    name: "Ch.02 Mauryan Ashoka Pillar Gate",
    description:
      "Sarnath Lion Capital & Mauryan edict gateway celebrating Dhamma inscriptions, Pataliputra governance & Silk routes.",
    statusLine: "Inspect Ch.02 Mauryan Empire & Ashoka Lab",
    preferredX: 58,
    preferredZ: -8,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "teal",
    motif: "matrix_gate",
  },
  {
    chapterNum: "03",
    id: "math-ch-03",
    name: "Ch.03 Sultanate & Mughal Arch",
    description:
      "Stepped red-sandstone & marble synthesis pavilion exploring medieval court administration, Mansabdari & heritage architecture.",
    statusLine: "Inspect Ch.03 Delhi Sultanate & Mughal Lab",
    preferredX: 58,
    preferredZ: 14,
    scaleClass: "medium",
    accentColor: "crimson",
    secondaryColor: "cream",
    motif: "combo_stair",
  },
  {
    chapterNum: "04",
    id: "math-ch-04",
    name: "Ch.04 Freedom Struggle Timeline Spire",
    description:
      "Stepped 1857-to-1947 historical pyramid tracing Swadeshi, Dandi March & constitutional awakening across modern India.",
    statusLine: "Inspect Ch.04 1857 & Freedom Struggle Lab",
    preferredX: 48,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "indigo",
    motif: "pascal_pyramid",
  },
  {
    chapterNum: "05",
    id: "math-ch-05",
    name: "Ch.05 Industrial & Printing Helix",
    description:
      "Steam engine, spinning jenny & Gutenberg print helix visualizing world revolutions and industrial urbanization.",
    statusLine: "Inspect Ch.05 World Revolutions & Industry Lab",
    preferredX: 30,
    preferredZ: 48,
    scaleClass: "medium",
    accentColor: "amber",
    secondaryColor: "slateLight",
    motif: "series_spiral",
  },
  {
    chapterNum: "06",
    id: "math-ch-06",
    name: "Ch.06 Global Trade & Diplomacy Hub",
    description:
      "20th-century world history & multilateral diplomacy beacon illustrating post-1945 institutions and global interdependence.",
    statusLine: "Inspect Ch.06 Contemporary World History Lab",
    preferredX: 10,
    preferredZ: 54,
    scaleClass: "medium",
    accentColor: "blue",
    secondaryColor: "cream",
    motif: "prob_spinner",
  },
  {
    chapterNum: "07",
    id: "math-ch-07",
    name: "Ch.07 Globe Graticule & IST Rotor",
    description:
      "Spinning Latitude-Longitude globe ring calibrated to the 82.5°E Indian Standard Time meridian and heat zones.",
    statusLine: "Inspect Ch.07 Latitudes, Longitudes & IST Lab",
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
    name: "Ch.08 Plate Tectonics Fault Mirror",
    description:
      "Himalayan uplift & lithospheric plate boundary observatory tracking earthquakes, volcanoes & fold mountains.",
    statusLine: "Inspect Ch.08 Plate Tectonics & Landforms Lab",
    preferredX: -32,
    preferredZ: 48,
    scaleClass: "medium",
    accentColor: "fire",
    secondaryColor: "cyan",
    motif: "inv_mirror",
  },
  {
    chapterNum: "09",
    id: "math-ch-09",
    name: "Ch.09 Monsoon & Climate Sundial",
    description:
      "Southwest & Northeast Monsoon wind observatory tracking ITCZ pressure belts, Coriolis deflection & rainfall seasons.",
    statusLine: "Inspect Ch.09 Indian Monsoon & Climate Lab",
    preferredX: -48,
    preferredZ: 34,
    scaleClass: "medium",
    accentColor: "teal",
    secondaryColor: "yellow",
    motif: "triangle_prism",
  },
  {
    chapterNum: "10",
    id: "math-ch-10",
    name: "Ch.10 Himalayan & River Basin Bridge",
    description:
      "Watershed span monument modeling perennial Ganga-Brahmaputra basins alongside Peninsular Godavari & Narmada rivers.",
    statusLine: "Inspect Ch.10 River Systems & Drainage Lab",
    preferredX: -58,
    preferredZ: 14,
    scaleClass: "medium",
    accentColor: "water",
    secondaryColor: "leaf",
    motif: "line_bridge",
  },
  {
    chapterNum: "11",
    id: "math-ch-11",
    name: "Ch.11 Soil Strata & Crop Radar",
    description:
      "Agrarian radar beacon mapping Alluvial, Black Regur, Red & Laterite soil zones with Kharif & Rabi crop cycles.",
    statusLine: "Inspect Ch.11 Soils, Agriculture & Crops Lab",
    preferredX: -58,
    preferredZ: -8,
    scaleClass: "medium",
    accentColor: "screenGreen",
    secondaryColor: "soil",
    motif: "circle_radar",
  },
  {
    chapterNum: "12",
    id: "math-ch-12",
    name: "Ch.12 Solar & Mineral Resource Dish",
    description:
      "Clean energy solar collector & Chota Nagpur mineral belt pavilion balancing hydro, solar, wind & sustainable mining.",
    statusLine: "Inspect Ch.12 Minerals & Renewable Energy Lab",
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
    name: "Ch.13 Constitution Preamble Arch",
    description:
      "Granite Preamble arch celebrating Justice, Liberty, Equality, Fraternity and Articles 14–32 Fundamental Rights.",
    statusLine: "Inspect Ch.13 Constitution & Rights Lab",
    preferredX: -32,
    preferredZ: -44,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "cyan",
    motif: "diff_curve",
  },
  {
    chapterNum: "14",
    id: "math-ch-14",
    name: "Ch.14 Sansad Hemicycle Terraces",
    description:
      "Stepped 543-seat Sansad Bhavan legislative dome simulating Lok Sabha, Rajya Sabha bills & constitutional majority.",
    statusLine: "Inspect Ch.14 Parliament & Elections Lab",
    preferredX: -12,
    preferredZ: -52,
    scaleClass: "medium",
    accentColor: "brick",
    secondaryColor: "gold",
    motif: "int_riemann",
  },
  {
    chapterNum: "15",
    id: "math-ch-15",
    name: "Ch.15 Panchayati Raj 3-Tier Pillar",
    description:
      "Three-tier federalism monument linking Gram Panchayat, Block Samiti & Zila Parishad local self-government.",
    statusLine: "Inspect Ch.15 Federalism & Local Govt Lab",
    preferredX: 12,
    preferredZ: -52,
    scaleClass: "medium",
    accentColor: "lime",
    secondaryColor: "orange",
    motif: "vector_tripod",
  },
  {
    chapterNum: "16",
    id: "math-ch-16",
    name: "Ch.16 Supreme Court Justice Spire",
    description:
      "Rule-of-law crystal spire demonstrating separation of Legislature, Executive & independent Judiciary review.",
    statusLine: "Inspect Ch.16 Judiciary & Rule of Law Lab",
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
    name: "Ch.17 United Nations Diplomacy Arch",
    description:
      "Global peacekeeping & multilateral assembly monument highlighting UN Charter agencies, UNESCO heritage & treaties.",
    statusLine: "Inspect Ch.17 United Nations & Diplomacy Lab",
    preferredX: 68,
    preferredZ: -30,
    scaleClass: "medium",
    accentColor: "sky",
    secondaryColor: "gold",
    motif: "bell_arch",
  },
  {
    chapterNum: "18",
    id: "math-ch-18",
    name: "Ch.18 Demand & Supply Market Gate",
    description:
      "Microeconomics price-discovery gateway modeling Market Equilibrium, Consumer Surplus & bumper harvest supply shifts.",
    statusLine: "Inspect Ch.18 Demand & Supply Markets Lab",
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
    name: "Ch.19 Economy GDP Sectors Rings",
    description:
      "Interlocking Primary Agriculture, Secondary Industry & Tertiary Services rings tracking GDP growth and banking credit.",
    statusLine: "Inspect Ch.19 Sectors of Indian Economy Lab",
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
    name: "AARUTO + DIPU-_- SST-LAB Dev HQ",
    description:
      "Creator landmark MADE BY \"AARUTO\" + \"DIPU-_-\"! Click or press E to launch sky-high SST-LAB festival fireworks.",
    statusLine: "Launch AARUTO + DIPU-_- SST-LAB Fireworks",
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
    name: "Sangeet Heritage Floor Piano",
    description:
      "Cultural heritage raga scale mat curated by AARUTO + DIPU-_-. Walk across or click keys to play Sa-Re-Ga-Ma-Pa notes.",
    statusLine: "Walk or Click Keys to Play Heritage Piano",
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
    name: "Folk Rhythm Step Sequencer",
    description:
      "Interactive 8x4 folk percussion & trade-beat matrix built by AARUTO + DIPU-_-. Toggle pads to compose live rhythms.",
    statusLine: "Toggle Pads on Folk Rhythm Sequencer",
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
    name: "Civic Signal Lights-Out Grid",
    description:
      "Ch.15 Local Governance city power puzzle grid. Light up every district block across the 3x3 town plaza.",
    statusLine: "Light All 9 District Civic Blocks",
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
    name: "Dynasty Era Memory Synth",
    description:
      "Chronological era-sequence challenge designed by AARUTO + DIPU-_-. Repeat escalating historical chime patterns.",
    statusLine: "Play Dynasty Era Memory Synth",
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
    name: "Silk Route Trade Cascade Tower",
    description:
      "Spiral trade-caravan tower where glowing spice & silk beads cascade along ancient transcontinental routes.",
    statusLine: "Send Trade Goods Down Silk Route Helix",
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
    name: "Hydro-Electric Power Grid Coil",
    description:
      "Ch.12 Clean Energy & Electrification tower powering SST-LAB with glowing high-voltage hydro lightning arcs.",
    statusLine: "Trigger Clean Energy Hydro-Grid Arc",
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
    name: "Magnetic Pole Reversal Cube",
    description:
      "Ch.08 Earth Interior & Geomagnetic monument. Click to flip polarity and invert this levitating voxel core.",
    statusLine: "Flip Geomagnetic Pole Inverter Cube",
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
    name: "Heritage Courtyard Hoop Court",
    description:
      "SST-LAB Olympic & School Courtyard created by AARUTO + DIPU-_-. Shoot 2pt and 3pt arcs from the court pads.",
    statusLine: "Shoot Courtyard Trick-Shots on Court",
    preferredX: -36,
    preferredZ: -14,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "white",
    interactionKind: "basketball_hoop",
    motif: "parabolic_hoop",
  },
  {
    chapterNum: "20",
    id: "math-ch-20",
    name: "Ch.20 World Atlas & Trade Studio",
    description:
      "Interactive Global Geography & International Trade plotter spire with meridian beacon and maritime shipping lanes!",
    statusLine: "Inspect Ch.20 World Atlas & Trade Studio",
    preferredX: 28,
    preferredZ: -44,
    scaleClass: "medium",
    accentColor: "cyan",
    secondaryColor: "magenta",
    motif: "graph_studio",
  },
  {
    chapterNum: "HSE",
    id: "math-house-clubhouse",
    name: "SST-LAB Cozy House",
    description:
      "Enterable manor house by AARUTO + DIPU-_-! Walk inside [E] for the SST-LAB Quest Book, Live 4-Channel Atlas TV, Tea Kettle & Fireplace.",
    statusLine: "Enter Cozy House · Press E for Quest Book & TV",
    preferredX: -14.5,
    preferredZ: -16.5,
    scaleClass: "medium",
    category: "building",
    accentColor: "crimson",
    secondaryColor: "gold",
    motif: "cozy_house",
    behavior: {
      type: "landmark",
      facingYaw: 0,
      activity: "Cozy Manor · SST Quest Book, Atlas TV & Tea Inside",
      statusLine: "Walk to door & press E to enter Quest Book, TV & Fireplace!",
    },
  },
  {
    chapterNum: "CAR",
    id: "math-turbo-roadster",
    name: "Pixel Turbo Roadster Car",
    description:
      "Drivable crimson & gold voxel roadster built for SST-LAB by AARUTO + DIPU-_-. Press E or click CAR to steer with WASD, Shift Turbo & H Horn!",
    statusLine: "Ready to Drive · Press E or Click CAR",
    preferredX: 11.5,
    preferredZ: -10.5,
    scaleClass: "medium",
    category: "vehicle",
    accentColor: "red",
    secondaryColor: "gold",
    motif: "turbo_roadster",
    behavior: {
      type: "landmark",
      facingYaw: 0.35,
      activity: "Parked · Ready to Drive!",
      statusLine: "Press E or click CAR to cruise SST-LAB roads!",
    },
  },
  {
    chapterNum: "CAR",
    id: "math-rally-coupe",
    name: "Cobalt Rally Coupe Car",
    description:
      "Drivable azure & cream expedition coupe parked near SST-LAB Cozy House. Press E to explore landforms and districts!",
    statusLine: "Ready to Drive · Cobalt Expedition Coupe",
    preferredX: -11.5,
    preferredZ: -25.5,
    scaleClass: "medium",
    category: "vehicle",
    accentColor: "blue",
    secondaryColor: "cream",
    motif: "rally_coupe",
    behavior: {
      type: "landmark",
      facingYaw: 1.57,
      activity: "Parked by Cozy House · Ready to Drive!",
      statusLine: "Press E to drive the Cobalt Rally Coupe!",
    },
  },
  {
    chapterNum: "CAR",
    id: "math-dune-buggy",
    name: "Thar Desert Dune Buggy",
    description:
      "Drivable sunburst desert expedition buggy with roll-cage & off-road wheels. Press E to survey SST-LAB terrain!",
    statusLine: "Ready to Drive · Desert Expedition Buggy",
    preferredX: 26.5,
    preferredZ: 24.5,
    scaleClass: "medium",
    category: "vehicle",
    accentColor: "amber",
    secondaryColor: "orange",
    motif: "dune_buggy",
    behavior: {
      type: "landmark",
      facingYaw: -0.78,
      activity: "Parked by South Promenade · Ready to Drive!",
      statusLine: "Press E to drive the Desert Dune Buggy!",
    },
  },
  {
    chapterNum: "TRN",
    id: "math-express-train",
    name: "SST-LAB Express Train",
    description:
      "Heritage steam locomotive & coach gliding along SST-LAB's scenic circular railway tracks. Hop aboard [E] or click RIDE TRAIN!",
    statusLine: "Heritage Rail Express · Press E to Board",
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
        { id: "stop-sst-central", name: "Central Railway Junction", x: 0, z: -64, dwellSec: 2.2 },
        { id: "stop-sst-east", name: "Heritage East Junction", x: 62, z: -16, dwellSec: 1.8 },
        { id: "stop-sst-south", name: "South Harbor Station", x: 0, z: 64, dwellSec: 1.8 },
      ],
      statusLine: "Heritage Express touring the SST-LAB scenic railway!",
    },
  },
  {
    chapterNum: "STN",
    id: "math-train-station",
    name: "SST-LAB Central Railway Junction",
    description:
      "Covered brick-and-brass railway junction built by AARUTO + DIPU-_- along the SST-LAB Express loop.",
    statusLine: "Central Railway Junction · Catch the Express!",
    preferredX: 0,
    preferredZ: -74,
    scaleClass: "medium",
    accentColor: "brick",
    secondaryColor: "gold",
    motif: "train_station",
  },
  {
    chapterNum: "BAS",
    id: "math-park-abacus",
    name: "Basic SST Cardinal Compass Plaza",
    description:
      "Class 1–5 Basic SST Park giant trade & counting frame / compass dial. Click to cycle cardinal bearings & tally counts!",
    statusLine: "Basic SST Park · Click to Cycle Cardinal Bearings!",
    preferredX: -34,
    preferredZ: 32,
    scaleClass: "medium",
    accentColor: "gold",
    secondaryColor: "cyan",
    interactionKind: "abacus_frame",
    motif: "abacus_frame",
  },
  {
    chapterNum: "BAS",
    id: "math-park-fraction",
    name: "India States & Landforms Kiosk",
    description:
      "Class 3–6 Map Symbols & Landforms Market Stand by AARUTO + DIPU-_-. Click to cycle India's physiographic zones!",
    statusLine: "Basic SST Park · Click to Explore India Landforms!",
    preferredX: -46,
    preferredZ: 22,
    scaleClass: "medium",
    accentColor: "orange",
    secondaryColor: "crimson",
    interactionKind: "fraction_stand",
    motif: "fraction_stand",
  },
  {
    chapterNum: "BAS",
    id: "math-park-scale",
    name: "Barter & Rupee Trade Scale Plaza",
    description:
      "Class 3–8 Historical Barter-to-Rupee Fair Trade Scale monument. Click to test grain, silver & rupee trade balance!",
    statusLine: "Basic SST Park · Click Scale to Balance Barter Trade!",
    preferredX: -22,
    preferredZ: 42,
    scaleClass: "medium",
    accentColor: "amber",
    secondaryColor: "emerald",
    interactionKind: "balance_scale",
    motif: "balance_scale",
  },
  {
    chapterNum: "EXP",
    id: "math-exp-pendulum",
    name: "Richter Seismograph Pendulum Tower",
    description:
      "Field Experiment Yard seismic station measuring P-waves, S-waves & tectonic earthquake tremors!",
    statusLine: "Field Experiment Yard · Click Seismograph to Test Quake!",
    preferredX: 36,
    preferredZ: 20,
    scaleClass: "medium",
    accentColor: "cyan",
    secondaryColor: "gold",
    interactionKind: "pendulum_tower",
    motif: "pendulum_tower",
  },
  {
    chapterNum: "EXP",
    id: "math-exp-rocket",
    name: "INSAT Weather Satellite Launch Pad",
    description:
      "CBSE Geography & Monsoon satellite launch pad. Click or press E to launch a voxel weather sonde!",
    statusLine: "Field Experiment Yard · Click Pad to Launch Weather Sonde!",
    preferredX: 48,
    preferredZ: 10,
    scaleClass: "medium",
    accentColor: "red",
    secondaryColor: "amber",
    interactionKind: "rocket_pad",
    motif: "rocket_pad",
  },
  {
    chapterNum: "EXP",
    id: "math-exp-wheel",
    name: "Civic Heritage Observation Wheel",
    description:
      "Rotating Field Experiment Yard observation wheel surveying SST-LAB's biomes, rivers & historical monuments!",
    statusLine: "Field Experiment Yard · Click Wheel to Shift Speed!",
    preferredX: 42,
    preferredZ: -4,
    scaleClass: "large",
    accentColor: "magenta",
    secondaryColor: "gold",
    interactionKind: "ferris_wheel",
    motif: "ferris_wheel",
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
      (
        [
          [-4, 5, "wheel-fl"],
          [4, 5, "wheel-fr"],
          [-4, -5, "wheel-rl"],
          [4, -5, "wheel-rr"],
        ] as const
      ).forEach(([wx, wz, wName]) => {
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
      (
        [
          [-4, 7, "loco-wheel-fl"],
          [4, 7, "loco-wheel-fr"],
          [-4, 2, "loco-wheel-ml"],
          [4, 2, "loco-wheel-mr"],
          [-4, -5, "coach-wheel-fl"],
          [4, -5, "coach-wheel-fr"],
          [-4, -10, "coach-wheel-rl"],
          [4, -10, "coach-wheel-rr"],
        ] as const
      ).forEach(([wx, wz, wName]) => {
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
    case "graph_studio":
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: 0, x1: 4, y1: 10, z1: 0, color: "slate" },
        { op: "box", x0: -4, y0: 6, z0: -1, x1: 4, y1: 6, z1: 1, color: "white", emit: 0.5 },
        { op: "box", x0: 0, y0: 2, z0: -1, x1: 0, y1: 11, z1: 1, color: "white", emit: 0.5 },
        { op: "box", x0: -4, y0: 4, z0: 1, x1: -2, y1: 6, z1: 1, color: c1, emit: 1.4 },
        { op: "box", x0: -2, y0: 6, z0: 1, x1: 0, y1: 9, z1: 1, color: c1, emit: 1.5 },
        { op: "box", x0: 0, y0: 7, z0: 1, x1: 2, y1: 9, z1: 1, color: c2, emit: 1.4 },
        { op: "box", x0: 2, y0: 4, z0: 1, x1: 4, y1: 7, z1: 1, color: c2, emit: 1.4 },
      );
      parts.push({
        name: "graph-orbiter",
        kind: "spinY",
        speed: 1.35,
        pivot: [0, 12.5, 0],
        ops: [
          { op: "box", x0: -3, y0: 0, z0: -1, x1: 3, y1: 1, z1: 1, color: c1, emit: 1.5 },
          { op: "box", x0: -1, y0: -1, z0: -3, x1: 1, y1: 1, z1: 3, color: "gold", emit: 1.4 },
        ],
      });
      break;
    case "cozy_house":
      ops.length = 0;
      ops.push(
        // Stone foundation & front doorstep
        { op: "box", x0: -6, y0: 0, z0: -6, x1: 6, y1: 1, z1: 6, color: "stone" },
        { op: "box", x0: -2, y0: 0, z0: 6, x1: 2, y1: 1, z1: 7, color: "marble" },
        // Cream timber-framed walls & cozy brick corners
        { op: "box", x0: -5, y0: 1, z0: -5, x1: 5, y1: 8, z1: 5, color: "cream" },
        { op: "box", x0: -5, y0: 1, z0: -5, x1: -4, y1: 8, z1: -4, color: "woodDark", mirrorX: true },
        { op: "box", x0: -5, y0: 1, z0: 4, x1: -4, y1: 8, z1: 5, color: "woodDark", mirrorX: true },
        // Arched front door (z = +5) & glowing windows
        { op: "box", x0: -2, y0: 1, z0: 5, x1: 2, y1: 6, z1: 5, color: "oak" },
        { op: "box", x0: -1, y0: 2, z0: 5, x1: 1, y1: 5, z1: 5, color: "amber", emit: 0.7 },
        { op: "box", x0: -4, y0: 4, z0: 5, x1: -3, y1: 6, z1: 5, color: "warmGlow", emit: 1.4, mirrorX: true },
        { op: "box", x0: -5, y0: 4, z0: -2, x1: -5, y1: 6, z1: 1, color: "warmGlow", emit: 1.2, mirrorX: true },
        // Pitched crimson shingle roof & chimney
        { op: "box", x0: -6, y0: 8, z0: -6, x1: 6, y1: 9, z1: 6, color: "crimson" },
        { op: "box", x0: -5, y0: 9, z0: -5, x1: 5, y1: 11, z1: 5, color: "crimson" },
        { op: "box", x0: -3, y0: 11, z0: -3, x1: 3, y1: 13, z1: 3, color: "red" },
        { op: "box", x0: 2, y0: 9, z0: -4, x1: 4, y1: 15, z1: -2, color: "brick" },
        // Porch lantern
        { op: "box", x0: -1, y0: 7, z0: 6, x1: 1, y1: 8, z1: 6, color: "gold", emit: 1.5 },
      );
      parts.push({
        name: "house-smoke",
        kind: "bob",
        speed: 1.2,
        amp: 0.55,
        pivot: [3, 16.5, -3],
        ops: [{ op: "sphere", cx: 0, cy: 0, cz: 0, rx: 1.3, ry: 1.1, rz: 1.3, color: "white", emit: 0.4 }],
      });
      break;
    case "rally_coupe":
      ops.length = 0;
      ops.push(
        { op: "box", x0: -4, y0: 1, z0: -8, x1: 4, y1: 3, z1: 8, color: "blue" },
        { op: "box", x0: -1, y0: 3, z0: -7, x1: 1, y1: 4, z1: 8, color: "cream" },
        { op: "box", x0: -3, y0: 3, z0: -4, x1: 3, y1: 7, z1: 2, color: "blueDark" },
        { op: "box", x0: -2, y0: 4, z0: 2, x1: 2, y1: 6, z1: 3, color: "glass", emit: 0.5 },
        { op: "box", x0: -4, y0: 5, z0: -8, x1: 4, y1: 6, z1: -7, color: "cream" },
        { op: "box", x0: -3, y0: 2, z0: 8, x1: -2, y1: 3, z1: 8, color: "warmGlow", emit: 1.5, mirrorX: true },
        { op: "box", x0: -3, y0: 2, z0: -8, x1: -2, y1: 3, z1: -8, color: "red", emit: 1.3, mirrorX: true },
      );
      (
        [
          [-4, 5, "wheel-fl"],
          [4, 5, "wheel-fr"],
          [-4, -5, "wheel-rl"],
          [4, -5, "wheel-rr"],
        ] as const
      ).forEach(([wx, wz, wName]) => {
        parts.push({
          name: wName,
          kind: "wheel",
          speed: 1.0,
          pivot: [wx, 2, wz],
          ops: [
            { op: "cylinder", axis: "x", cy: 0, cz: 0, x0: -1, x1: 1, radius: 2.0, color: "rubber" },
            { op: "box", x0: -1, y0: -1, z0: -1, x1: 1, y1: 1, z1: 1, color: "gold" },
          ],
        });
      });
      break;
    case "dune_buggy":
      ops.length = 0;
      ops.push(
        { op: "box", x0: -4, y0: 2, z0: -7, x1: 4, y1: 3, z1: 7, color: "orange" },
        { op: "box", x0: -3, y0: 3, z0: 1, x1: 3, y1: 4, z1: 7, color: "amber" },
        { op: "box", x0: -3, y0: 3, z0: -5, x1: -2, y1: 7, z1: 2, color: "charcoal", mirrorX: true },
        { op: "box", x0: -3, y0: 7, z0: -5, x1: 3, y1: 8, z1: 1, color: "amber" },
        { op: "box", x0: -2, y0: 3, z0: -6, x1: 2, y1: 5, z1: -4, color: "iron" },
        { op: "box", x0: -2, y0: 4, z0: 7, x1: -1, y1: 5, z1: 7, color: "warmGlow", emit: 1.6, mirrorX: true },
      );
      (
        [
          [-4, 5, "wheel-fl"],
          [4, 5, "wheel-fr"],
          [-4, -5, "wheel-rl"],
          [4, -5, "wheel-rr"],
        ] as const
      ).forEach(([wx, wz, wName]) => {
        parts.push({
          name: wName,
          kind: "wheel",
          speed: 1.0,
          pivot: [wx, 2, wz],
          ops: [
            { op: "cylinder", axis: "x", cy: 0, cz: 0, x0: -1, x1: 1, radius: 2.2, color: "rubber" },
            { op: "box", x0: -1, y0: -1, z0: -1, x1: 1, y1: 1, z1: 1, color: "orange" },
          ],
        });
      });
      break;
    case "abacus_frame":
      ops.push(
        { op: "box", x0: -5, y0: 2, z0: -1, x1: -4, y1: 11, z1: 1, color: "woodDark", mirrorX: true },
        { op: "box", x0: -5, y0: 10, z0: -1, x1: 5, y1: 11, z1: 1, color: "woodDark" },
        { op: "box", x0: -4, y0: 4, z0: 0, x1: 4, y1: 4, z1: 0, color: "gold" },
        { op: "box", x0: -4, y0: 6, z0: 0, x1: 4, y1: 6, z1: 0, color: "gold" },
        { op: "box", x0: -4, y0: 8, z0: 0, x1: 4, y1: 8, z1: 0, color: "gold" },
        { op: "box", x0: -3, y0: 3, z0: -1, x1: -2, y1: 5, z1: 1, color: "red", emit: 0.7 },
        { op: "box", x0: 0, y0: 3, z0: -1, x1: 1, y1: 5, z1: 1, color: "cyan", emit: 0.7 },
        { op: "box", x0: -2, y0: 5, z0: -1, x1: -1, y1: 7, z1: 1, color: "gold", emit: 0.8 },
        { op: "box", x0: 2, y0: 7, z0: -1, x1: 3, y1: 9, z1: 1, color: "mint", emit: 0.8 },
      );
      break;
    case "fraction_stand":
      ops.push(
        { op: "box", x0: -5, y0: 1, z0: -3, x1: 5, y1: 5, z1: 3, color: "wood" },
        { op: "box", x0: -5, y0: 5, z0: -3, x1: 5, y1: 6, z1: 3, color: "cream" },
        { op: "box", x0: -5, y0: 6, z0: -3, x1: -4, y1: 11, z1: -2, color: "woodDark", mirrorX: true },
        { op: "box", x0: -6, y0: 11, z0: -4, x1: 6, y1: 12, z1: 4, color: "crimson" },
        { op: "box", x0: -4, y0: 11, z0: -4, x1: -2, y1: 12, z1: 4, color: "cream", mirrorX: true },
      );
      parts.push({
        name: "pizza-wheel",
        kind: "spinY",
        speed: 0.9,
        pivot: [0, 8, 0],
        ops: [
          { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 0, y1: 1, radius: 3, color: "gold", emit: 1.1 },
          { op: "box", x0: 0, y0: 0, z0: 0, x1: 3, y1: 1, z1: 2, color: "crimson", emit: 1.3 },
        ],
      });
      break;
    case "balance_scale":
      ops.push(
        { op: "box", x0: -3, y0: 1, z0: -3, x1: 3, y1: 2, z1: 3, color: "stone" },
        { op: "box", x0: -1, y0: 2, z0: -1, x1: 1, y1: 11, z1: 1, color: "gold", emit: 0.6 },
        { op: "box", x0: -1, y0: 11, z0: -1, x1: 1, y1: 12, z1: 1, color: "amber", emit: 1.2 },
      );
      parts.push({
        name: "scale-beam",
        kind: "swingZ",
        speed: 1.4,
        amp: 0.16,
        pivot: [0, 10.5, 0],
        ops: [
          { op: "box", x0: -6, y0: 0, z0: -1, x1: 6, y1: 1, z1: 1, color: "gold" },
          { op: "box", x0: -6, y0: -4, z0: -2, x1: -4, y1: -3, z1: 2, color: "cyan", emit: 1.0, mirrorX: true },
          { op: "box", x0: -6, y0: -3, z0: 0, x1: -5, y1: 0, z1: 0, color: "silver", mirrorX: true },
          { op: "box", x0: -6, y0: -3, z0: -1, x1: -4, y1: -1, z1: 1, color: "mint", emit: 1.1 },
          { op: "box", x0: 4, y0: -3, z0: -1, x1: 6, y1: -1, z1: 1, color: "pink", emit: 1.1 },
        ],
      });
      break;
    case "pendulum_tower":
      ops.push(
        { op: "box", x0: -4, y0: 1, z0: -4, x1: -3, y1: 14, z1: -3, color: "stone", mirrorX: true },
        { op: "box", x0: -4, y0: 1, z0: 3, x1: -3, y1: 14, z1: 4, color: "stone", mirrorX: true },
        { op: "box", x0: -4, y0: 14, z0: -4, x1: 4, y1: 15, z1: 4, color: "gold" },
        { op: "box", x0: -2, y0: 15, z0: -2, x1: 2, y1: 16, z1: 2, color: "cyan", emit: 1.3 },
      );
      parts.push({
        name: "pendulum-arm",
        kind: "swingZ",
        speed: 2.1,
        amp: 0.42,
        pivot: [0, 13.5, 0],
        ops: [
          { op: "box", x0: 0, y0: -9, z0: 0, x1: 0, y1: 0, z1: 0, color: "silver" },
          { op: "sphere", cx: 0, cy: -10, cz: 0, rx: 2, ry: 2, rz: 2, color: "amber", emit: 1.4 },
        ],
      });
      break;
    case "rocket_pad":
      ops.push(
        { op: "box", x0: -5, y0: 1, z0: -5, x1: 5, y1: 2, z1: 5, color: "charcoal" },
        { op: "box", x0: -4, y0: 2, z0: -4, x1: -3, y1: 12, z1: -3, color: "iron" },
        { op: "box", x0: -4, y0: 10, z0: -3, x1: -1, y1: 11, z1: -2, color: "amber" },
        { op: "box", x0: -2, y0: 2, z0: -2, x1: 2, y1: 3, z1: 2, color: "orange", emit: 1.2 },
      );
      parts.push({
        name: "rocket-body",
        kind: "bob",
        speed: 1.8,
        amp: 0.45,
        pivot: [0, 4, 0],
        ops: [
          { op: "cylinder", axis: "y", cx: 0, cz: 0, y0: 0, y1: 8, radius: 1.8, color: "white" },
          { op: "box", x0: -2, y0: 0, z0: -1, x1: 2, y1: 2, z1: 1, color: "crimson" },
          { op: "cone", cx: 0, y0: 8, y1: 11, cz: 0, rBottom: 1.9, rTop: 0.4, color: "red", emit: 0.9 },
          { op: "box", x0: -1, y0: -2, z0: -1, x1: 1, y1: 0, z1: 1, color: "amber", emit: 1.6 },
        ],
      });
      break;
    case "ferris_wheel":
      ops.length = 0;
      ops.push(
        { op: "box", x0: -6, y0: 0, z0: -5, x1: 6, y1: 1, z1: 5, color: "stone" },
        { op: "box", x0: -4, y0: 1, z0: -3, x1: -3, y1: 10, z1: -2, color: "iron", mirrorX: true },
        { op: "box", x0: -2, y0: 1, z0: 2, x1: -1, y1: 10, z1: 3, color: "iron", mirrorX: true },
        { op: "box", x0: -2, y0: 9, z0: -3, x1: 2, y1: 10, z1: 3, color: "gold", emit: 1.1 },
      );
      parts.push({
        name: "wheel-rim",
        kind: "spinZ",
        speed: 0.65,
        pivot: [0, 10, 0],
        ops: [
          { op: "ring", axis: "z", cx: 0, cy: 0, z0: -1, z1: 1, outerR: 7, innerR: 6, color: "cream", emit: 0.8 },
          { op: "box", x0: -7, y0: -1, z0: -2, x1: -5, y1: 1, z1: 2, color: "pink", emit: 1.4 },
          { op: "box", x0: 5, y0: -1, z0: -2, x1: 7, y1: 1, z1: 2, color: "cyan", emit: 1.4 },
          { op: "box", x0: -1, y0: 5, z0: -2, x1: 1, y1: 7, z1: 2, color: "gold", emit: 1.4 },
          { op: "box", x0: -1, y0: -7, z0: -2, x1: 1, y1: -5, z1: 2, color: "mint", emit: 1.4 },
        ],
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
    category: spec.category ?? "prop",
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
  const byId = new Map(creations.map((c) => [c.id, c]));

  const allSpecs: readonly MathMonumentSpec[] = [
    ...MATH_CHAPTER_MONUMENTS,
    ...MATH_INTERACTIVE_ATTRACTIONS,
  ];

  for (let i = 0; i < allSpecs.length; i++) {
    const spec = allSpecs[i];
    const nextPrompt =
      spec.chapterNum === "HQ" ||
      spec.chapterNum === "HSE" ||
      spec.chapterNum === "FX" ||
      spec.chapterNum === "CAR" ||
      spec.chapterNum === "TRN" ||
      spec.chapterNum === "STN"
        ? `SST-LAB Interactive Attraction by AARUTO + DIPU-_-: ${spec.name}`
        : `SST-LAB Chapter ${spec.chapterNum}: ${spec.name}`;

    const existing = byId.get(spec.id);
    if (existing) {
      if (existing.name !== spec.name || existing.description !== spec.description) {
        existing.name = spec.name;
        existing.description = spec.description;
        existing.creatorPrompt = nextPrompt;
        if (existing.blueprint) {
          existing.blueprint.name = spec.name;
          existing.blueprint.description = spec.description;
        }
        if (spec.behavior) {
          existing.behavior = { ...spec.behavior };
        } else if (existing.behavior?.type === "landmark") {
          existing.behavior.statusLine = spec.statusLine;
        }
        added = true;
      }
      continue;
    }

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
      creatorPrompt: nextPrompt,
      category: spec.category ?? "prop",
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
                ? "AARUTO + DIPU-_- SST-LAB Dev HQ"
                : spec.chapterNum === "FX"
                  ? `Playing ${spec.name}`
                  : `Exploring SST Chapter ${spec.chapterNum}`,
            statusLine: spec.statusLine,
          },
      liveFeed: null,
      integratedLevel: 1,
      createdAt: baseTs + i * 1000,
      isSeed: true,
    };
    if (creation.behavior?.type !== "vehicle_route" && spec.category !== "vehicle") {
      const roadYaw = computeIntelligentBuildingYaw(creation, existingPaths);
      if (typeof roadYaw === "number") {
        creation.yaw = roadYaw;
        if (creation.behavior?.type === "landmark") {
          creation.behavior.facingYaw = roadYaw;
        }
      }
    }

    creations.push(creation);
    byId.set(spec.id, creation);
    added = true;
  }

  return added;
}
