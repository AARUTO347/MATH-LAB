// Pure Web Audio API retro console chiptune SFX for MATH_LAND

const SFX_STORAGE_KEY = "mathland_sfx_v1";

let audioCtx = null;
let sfxEnabled = (() => {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(SFX_STORAGE_KEY) : null;
    return saved === null ? true : saved !== "0";
  } catch {
    return true;
  }
})();

function ensureAudioCtx() {
  if (!sfxEnabled) return null;
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, duration = 0.06, type = "square", volume = 0.045, delay = 0) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Ignore audio context edge errors
  }
}

export function isSoundEnabled() {
  return sfxEnabled;
}

export function setSoundEnabled(next) {
  sfxEnabled = Boolean(next);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SFX_STORAGE_KEY, sfxEnabled ? "1" : "0");
    }
  } catch {
    // Ignore storage errors
  }
  if (sfxEnabled) {
    playTone(660, 0.06, "square", 0.04);
  }
  return sfxEnabled;
}

export function playBlip(freq = 520, duration = 0.045) {
  playTone(freq, duration, "square", 0.032);
}

export function playConfirm() {
  playTone(523.25, 0.055, "square", 0.04, 0);
  playTone(783.99, 0.08, "square", 0.045, 0.05);
}

export function playQuizCorrect() {
  playTone(587.33, 0.07, "triangle", 0.06, 0);
  playTone(880.0, 0.12, "triangle", 0.065, 0.065);
}

export function playMissionFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, idx) => {
    playTone(f, idx === notes.length - 1 ? 0.22 : 0.085, "square", 0.042, idx * 0.075);
  });
}

export function playFireworkBurst() {
  playTone(320, 0.07, "sawtooth", 0.035, 0);
  playTone(640, 0.09, "triangle", 0.045, 0.06);
  playTone(960, 0.14, "sine", 0.045, 0.12);
}

export function playCarHorn() {
  playTone(349.23, 0.11, "sawtooth", 0.04, 0);
  playTone(440.0, 0.11, "square", 0.032, 0);
  playTone(349.23, 0.14, "sawtooth", 0.038, 0.14);
  playTone(440.0, 0.14, "square", 0.03, 0.14);
}

export function playTrainWhistle() {
  playTone(440.0, 0.24, "triangle", 0.05, 0);
  playTone(554.37, 0.24, "triangle", 0.045, 0);
  playTone(659.25, 0.3, "triangle", 0.042, 0.18);
}

export function playSitChime(sitting = true) {
  if (sitting) {
    playTone(523.25, 0.055, "sine", 0.04, 0);
    playTone(392.0, 0.09, "sine", 0.04, 0.055);
  } else {
    playTone(392.0, 0.055, "sine", 0.04, 0);
    playTone(587.33, 0.09, "sine", 0.045, 0.055);
  }
}
