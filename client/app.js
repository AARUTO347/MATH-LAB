import { createMeadowWorldEngine } from "./voxel/meadow_engine.js";
import { createCharacterBuilderController } from "./character_builder.js";
import { createMultiplayerClient } from "./multiplayer_client.js";
import { MATH_CHAPTERS, WORLD_ATTRACTIONS, getMathChapterByCreationId } from "./math_chapters.js";
import { renderChapterLabFrame, evaluateChapterMission, mapCanvasPointerToParams } from "./math_labs.js";
import {
  isSoundEnabled,
  setSoundEnabled,
  playBlip,
  playConfirm,
  playQuizCorrect,
  playMissionFanfare,
  playFireworkBurst,
} from "./sound_fx.js";

const urlParams = new URLSearchParams(location.search);
const isOgCapture = urlParams.get("og") === "1";
if (isOgCapture) {
  document.body.dataset.ogCapture = "1";
}

const worldCanvas = document.getElementById("world-canvas");

const addBtn = document.getElementById("add-btn");
const pickSpotPill = document.getElementById("pick-spot-pill");
const cancelPickBtn = document.getElementById("cancel-pick-btn");

const bottomBuilder = document.getElementById("bottom-builder");
const moveSpotBtn = document.getElementById("move-spot-btn");
const closeBuilderBtn = document.getElementById("close-builder-btn");

const dropZone = document.getElementById("drop-zone");
const imageInput = document.getElementById("image-input");
const dropEmpty = document.getElementById("drop-empty");
const dropPreviewWrap = document.getElementById("drop-preview-wrap");
const dropPreviewImg = document.getElementById("drop-preview-img");
const clearImageBtn = document.getElementById("clear-image-btn");
const promptInput = document.getElementById("prompt-input");
const sculptBtn = document.getElementById("sculpt-btn");
const formError = document.getElementById("form-error");

const buildingPill = document.getElementById("building-pill");
const buildingPillLabel = document.getElementById("building-pill-label");
const buildingPillSub = document.getElementById("building-pill-sub");
const readyGotoBtn = document.getElementById("ready-goto-btn");
const readyGotoLabel = document.getElementById("ready-goto-label");
const locateMineBtn = document.getElementById("locate-mine-btn");
const locateMineLabel = document.getElementById("locate-mine-label");

const hoverCard = document.getElementById("hover-card");
const hoverName = document.getElementById("hover-name");
const hoverFeed = document.getElementById("hover-feed");
const hoverStatus = document.getElementById("hover-status");
const weaveToast = document.getElementById("weave-toast");

const camPanBtn = document.getElementById("cam-pan-btn");
const camOrbitBtn = document.getElementById("cam-orbit-btn");
const camWalkBtn = document.getElementById("cam-walk-btn");
const recenterBtn = document.getElementById("recenter-btn");
const recenterCompass = document.getElementById("recenter-compass");
const avatarBtn = document.getElementById("avatar-btn");
const avatarSwatchDot = document.getElementById("avatar-swatch-dot");
const onlinePill = document.getElementById("online-pill");
const onlineCountEl = document.getElementById("online-count");
const interactPromptBtn = document.getElementById("interact-prompt");
const interactKeyEl = document.getElementById("interact-key");
const interactLabelEl = document.getElementById("interact-label");
const walkEscHintBtn = document.getElementById("walk-esc-hint");
const avatarDialog = document.getElementById("avatar-dialog");

const walkJoystick = document.getElementById("walk-joystick");
const walkJoystickKnob = document.getElementById("walk-joystick-knob");
const walkJoyUp = document.getElementById("walk-joy-up");
const walkJoyDown = document.getElementById("walk-joy-down");
const walkJoyLeft = document.getElementById("walk-joy-left");
const walkJoyRight = document.getElementById("walk-joy-right");

// UI states: "idle" | "picking" | "composing" | "building" | "ready" | "placed"
let uiState = "idle";
let myCreationId = null;
let readyCreation = null;
let worldData = null;
let selectedImageDataUrl = null;
let chosenSpot = null;
let toastTimer = null;

// Live multi-user build queue state
let activeJob = null;
let jobPollInterval = null;
let jobPollInFlight = false;

const VISITOR_STORAGE_KEY = "geminisland_visitor_token_v1";
let cachedVisitorToken = (() => {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(VISITOR_STORAGE_KEY) : null;
  } catch {
    return null;
  }
})();

const CLIENT_TIMEZONE = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
})();

function storeVisitorToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return;
  cachedVisitorToken = token;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(VISITOR_STORAGE_KEY, token);
    }
  } catch {
    // Sandboxed iframes without storage access fall back to in-memory cachedVisitorToken
  }
}

function buildVisitorHeaders(extra = {}) {
  const headers = { ...extra };
  if (cachedVisitorToken) {
    headers["x-meadow-visitor"] = cachedVisitorToken;
  }
  if (CLIENT_TIMEZONE) {
    headers["x-meadow-tz"] = CLIENT_TIMEZONE;
  }
  return headers;
}
window.__geminIslandVisitorHeaders = buildVisitorHeaders;

function showToast(text, durationMs = 4200) {
  if (!text || isOgCapture) return;
  weaveToast.textContent = text;
  weaveToast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    weaveToast.hidden = true;
  }, durationMs);
}

function renderActiveJobLabel() {
  if (buildingPillSub) {
    buildingPillSub.textContent = "Being built with Gemini 4 Hydrogen";
  }
  if (!activeJob) {
    buildingPillLabel.textContent = "Approving query…";
    return;
  }
  if (activeJob.status === "queued" && activeJob.position >= 1) {
    buildingPillLabel.textContent =
      activeJob.position === 1 ? "Next in queue…" : `Waiting in queue (#${activeJob.position})…`;
  } else if (activeJob.phase === "approving") {
    buildingPillLabel.textContent = "Approving query…";
  } else if (activeJob.phase === "reviewing") {
    buildingPillLabel.textContent = "Reviewing 3D model…";
  } else if (activeJob.phase === "refining") {
    buildingPillLabel.textContent = "Polishing details…";
  } else if (activeJob.phase === "placing") {
    buildingPillLabel.textContent = "Placing on island…";
  } else {
    buildingPillLabel.textContent = "Sculpting voxels…";
  }
}

function stopJobTracking() {
  activeJob = null;
  if (jobPollInterval) {
    clearInterval(jobPollInterval);
    jobPollInterval = null;
  }
}

let engine = null;
let characterBuilder = null;
let mpClient = null;
let activeInteractionPrompt = null;
let lastAvatarDialogCloseMs = -1000;
let currentCamMode = "pan";
let sawTouchInput = false;
let joyPointerId = null;

function syncAvatarSwatchDot(app) {
  if (!avatarSwatchDot || !app || typeof app !== "object") return;
  const swatchColor =
    (typeof app.topColor === "string" && app.topColor) ||
    (typeof app.hatColor === "string" && app.hatColor) ||
    "#4c82d4";
  avatarSwatchDot.style.backgroundColor = swatchColor;
}

function updateOnlinePill(count) {
  if (!onlinePill) return;
  if (isOgCapture || typeof count !== "number" || !Number.isFinite(count) || count < 1) {
    onlinePill.hidden = true;
    return;
  }
  const clean = Math.max(1, Math.trunc(count));
  if (onlineCountEl) {
    onlineCountEl.textContent = String(clean);
  }
  onlinePill.hidden = false;
}

function isMobileWalkViewport() {
  if (sawTouchInput) return true;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  return window.innerWidth <= 768;
}

function resetWalkJoystick() {
  joyPointerId = null;
  walkJoystick?.classList.remove("is-active");
  walkJoystickKnob?.setAttribute("transform", "translate(0 0)");
  walkJoyUp?.classList.remove("is-lit");
  walkJoyDown?.classList.remove("is-lit");
  walkJoyLeft?.classList.remove("is-lit");
  walkJoyRight?.classList.remove("is-lit");
  engine?.setJoystickInput(0, 0);
}

function syncWalkJoystickVisibility() {
  const show = !isOgCapture && currentCamMode === "walk" && isMobileWalkViewport();
  if (walkJoystick) {
    walkJoystick.hidden = !show;
  }
  if (show) {
    document.body.dataset.walkMobile = "1";
  } else {
    delete document.body.dataset.walkMobile;
    resetWalkJoystick();
  }
}

function syncCameraModeUI(mode) {
  currentCamMode = mode;
  const isPan = mode === "pan";
  const isOrbit = mode === "orbit";
  const isWalk = mode === "walk";
  if (camPanBtn) {
    camPanBtn.classList.toggle("is-active", isPan);
    camPanBtn.setAttribute("aria-pressed", isPan ? "true" : "false");
  }
  if (camOrbitBtn) {
    camOrbitBtn.classList.toggle("is-active", isOrbit);
    camOrbitBtn.setAttribute("aria-pressed", isOrbit ? "true" : "false");
  }
  if (camWalkBtn) {
    camWalkBtn.classList.toggle("is-active", isWalk);
    camWalkBtn.setAttribute("aria-pressed", isWalk ? "true" : "false");
  }
  const scoreModeEl = document.getElementById("score-mode");
  if (scoreModeEl) {
    scoreModeEl.textContent = `MODE: ${String(mode || "pan").toUpperCase()}`;
  }
  syncWalkJoystickVisibility();
  if (walkEscHintBtn) {
    walkEscHintBtn.hidden = isOgCapture || !isWalk || isMobileWalkViewport();
  }
}

const demoClickTimers = new WeakMap();

function triggerCameraButtonClickFX(mode) {
  syncCameraModeUI(mode);
  const btn = mode === "walk" ? camWalkBtn : mode === "orbit" ? camOrbitBtn : camPanBtn;
  if (!btn || isOgCapture) return;
  const prevTimer = demoClickTimers.get(btn);
  if (prevTimer) clearTimeout(prevTimer);
  btn.classList.remove("is-demo-click");
  void btn.offsetWidth;
  btn.classList.add("is-demo-click");
  demoClickTimers.set(
    btn,
    setTimeout(() => {
      btn.classList.remove("is-demo-click");
    }, 740),
  );
}

const lastIncidentSentByVehicle = new Map();

async function reportTrafficIncidentToObserver(incident) {
  if (isOgCapture || !incident || typeof incident.vehicleId !== "string") return;
  const nowMs = Date.now();
  const prevMs = lastIncidentSentByVehicle.get(incident.vehicleId) || 0;
  if (nowMs - prevMs < 25_000) return;
  lastIncidentSentByVehicle.set(incident.vehicleId, nowMs);
  try {
    await fetch("/api/traffic-incident", {
      method: "POST",
      headers: buildVisitorHeaders({
        "content-type": "application/json",
        "x-meadow-client": "1",
      }),
      body: JSON.stringify({
        vehicleId: incident.vehicleId,
        peerVehicleId: incident.peerVehicleId || null,
        x: incident.x,
        z: incident.z,
        reason: incident.reason || "self_restored",
      }),
    });
  } catch {
    // Ignore transient network errors during background telemetry
  }
}

engine = createMeadowWorldEngine(
  worldCanvas,
  {
    onHoverCreation(creation, clientX, clientY, reading) {
      if (
        !creation ||
        !consolePower ||
        consolePaused ||
        labOpen ||
        uiState === "picking" ||
        isOgCapture ||
        (activeInteractionPrompt && engine?.isFirstPerson?.())
      ) {
        hoverCard.hidden = true;
        return;
      }
      hoverName.textContent = creation.name;
      if (reading?.summary) {
        hoverFeed.textContent = reading.summary;
        hoverFeed.hidden = false;
      } else {
        hoverFeed.hidden = true;
      }
      hoverStatus.textContent = creation.description || creation.behavior?.statusLine || "";
      const safeX = Math.max(125, Math.min(window.innerWidth - 125, clientX));
      const safeY = Math.max(88, Math.min(window.innerHeight - 24, clientY));
      hoverCard.style.left = `${safeX}px`;
      hoverCard.style.top = `${safeY}px`;
      hoverCard.hidden = false;
    },
    onSelectCreation(creation, reading) {
      if (!creation || isOgCapture) return;
      if (creation.id === "math-dev-hq") {
        playFireworkBurst();
        markDiscovered("math-dev-hq", "AARUTO + DIPU-_- Dev Arcade HQ", 25);
        showToast('AARUTO + DIPU-_- Dev Arcade HQ — "Welcome to MATH_LAND!"', 4200);
        return;
      }
      const attr = WORLD_ATTRACTIONS.find((a) => a.id === creation.id);
      if (attr) {
        markDiscovered(attr.id, attr.label, 20);
      }
      const mathCh = getMathChapterByCreationId(creation.id);
      if (mathCh) {
        markDiscovered(creation.id, mathCh.title, 20);
        openMathLabById(mathCh.id);
        return;
      }
      const baseDesc = creation.description || creation.behavior?.statusLine || "";
      const detail = reading?.summary
        ? baseDesc
          ? `${reading.summary} · ${baseDesc}`
          : reading.summary
        : baseDesc;
      showToast(detail ? `${creation.name} — ${detail}` : creation.name);
    },
    onInteractiveEvent(creation, message) {
      if (creation?.id) {
        markDiscovered(creation.id, creation.name || creation.id, 20);
      }
      if (!message || isOgCapture) return;
      showToast(message);
    },
    onPickGroundSpot(x, z) {
      chosenSpot = { x, z };
      uiState = "composing";
      syncDockUI();
      if (window.innerWidth > 640) {
        promptInput.focus({ preventScroll: true });
      }
    },
    onAutoNudgeSpot(x, z) {
      if (chosenSpot) {
        chosenSpot = { x, z };
      }
    },
    onDragModeChange(mode) {
      syncCameraModeUI(mode);
    },
    onIntroDemoStep(mode) {
      triggerCameraButtonClickFX(mode);
    },
    onCameraChange(camState) {
      if (recenterCompass && typeof camState?.azDeltaFromHome === "number") {
        const deg = ((camState.azDeltaFromHome * 180) / Math.PI).toFixed(1);
        recenterCompass.setAttribute("transform", `rotate(${deg} 12 12)`);
      }
    },
    onInteractionPromptChange(promptInfo) {
      activeInteractionPrompt = promptInfo || null;
      if (!interactPromptBtn) return;
      if (!promptInfo || isOgCapture) {
        interactPromptBtn.hidden = true;
        return;
      }
      if (interactKeyEl) {
        interactKeyEl.textContent = promptInfo.keyHint || "E";
      }
      if (interactLabelEl) {
        interactLabelEl.textContent = promptInfo.label || "Interact";
      }
      interactPromptBtn.hidden = false;
      if (engine?.isFirstPerson?.()) {
        hoverCard.hidden = true;
      }
    },
    onLocalEmote(kind) {
      mpClient?.sendEmote(kind);
    },
    onInteriorChange(roomInfo) {
      if (roomInfo) {
        document.body.dataset.inInterior = "1";
        if (uiState === "picking" || uiState === "composing") {
          hideError();
          chosenSpot = null;
          uiState = "idle";
          syncDockUI();
        }
      } else {
        delete document.body.dataset.inInterior;
      }
      hoverCard.hidden = true;
      mpClient?.forcePoseSync();
    },
    onTrafficIncident(incident) {
      void reportTrafficIncidentToObserver(incident);
    },
  },
  { ogMode: isOgCapture },
);

window.__geminIslandCam = () => engine.getCameraState();
window.__geminIslandEngine = engine;

interactPromptBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  engine?.triggerActiveInteraction?.();
  interactPromptBtn.blur();
});

characterBuilder = createCharacterBuilderController({
  dialogEl: avatarDialog,
  onChange(app) {
    engine?.setLocalAppearance?.(app);
    syncAvatarSwatchDot(app);
  },
  onSave(app) {
    engine?.setLocalAppearance?.(app);
    syncAvatarSwatchDot(app);
    mpClient?.sendProfile(app);
  },
});

avatarDialog?.addEventListener("close", () => {
  lastAvatarDialogCloseMs = performance.now();
  avatarBtn?.blur();
  queueMicrotask(() => avatarBtn?.blur());
});

avatarDialog?.querySelector('[data-cb-action="wave"]')?.addEventListener("click", () => {
  engine?.triggerLocalWave?.();
  mpClient?.sendEmote("wave");
});

syncAvatarSwatchDot(engine?.getLocalAppearance?.() || characterBuilder?.getAppearance?.());

avatarBtn?.addEventListener("click", () => {
  if (isOgCapture) return;
  avatarBtn?.blur();
  hoverCard.hidden = true;
  resetWalkJoystick();
  engine?.releaseWalkPointerLock?.();
  characterBuilder?.open(engine?.getLocalAppearance?.());
});

walkEscHintBtn?.addEventListener("click", () => {
  hoverCard.hidden = true;
  engine?.setDragMode("pan");
  walkEscHintBtn.blur();
});

window.__geminIslandCharacterBuilder = characterBuilder;

camPanBtn?.addEventListener("click", () => {
  engine.setDragMode("pan");
});

camOrbitBtn?.addEventListener("click", () => {
  engine.setDragMode("orbit");
});

camWalkBtn?.addEventListener("click", () => {
  hoverCard.hidden = true;
  if (engine.isFirstPerson()) {
    engine.setDragMode("pan");
    return;
  }
  if (uiState === "picking" || uiState === "composing") {
    hideError();
    chosenSpot = null;
    uiState = "idle";
    syncDockUI();
  }
  engine.setDragMode("walk");
  camWalkBtn.blur();
});

recenterBtn?.addEventListener("click", () => {
  stopWorldTour(false);
  engine.recenterCamera();
  engine.setDragMode("pan");
});

window.addEventListener(
  "pointerdown",
  (e) => {
    if (e.pointerType === "touch" && !sawTouchInput) {
      sawTouchInput = true;
      syncWalkJoystickVisibility();
    }
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  syncWalkJoystickVisibility();
  if (walkEscHintBtn) {
    walkEscHintBtn.hidden = isOgCapture || currentCamMode !== "walk" || isMobileWalkViewport();
  }
});

window.addEventListener("blur", () => {
  if (joyPointerId !== null) resetWalkJoystick();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" && joyPointerId !== null) {
    resetWalkJoystick();
  }
});

function updateWalkJoystickFromPoint(clientX, clientY) {
  if (!walkJoystick) return;
  const rect = walkJoystick.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const maxPx = Math.max(24, rect.width * 0.31);
  const dx = clientX - cx;
  const dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  const clampedPx = Math.min(maxPx, dist);
  const ux = dist > 1e-4 ? dx / dist : 0;
  const uy = dist > 1e-4 ? dy / dist : 0;

  const maxSvg = 34;
  const svgX = ux * (clampedPx / maxPx) * maxSvg;
  const svgY = uy * (clampedPx / maxPx) * maxSvg;
  walkJoystickKnob?.setAttribute("transform", `translate(${svgX.toFixed(1)} ${svgY.toFixed(1)})`);

  const rawMag = clampedPx / maxPx;
  const deadzone = 0.08;
  const eff = rawMag <= deadzone ? 0 : (rawMag - deadzone) / (1 - deadzone);
  const moveRight = ux * eff;
  const moveFwd = -uy * eff;

  walkJoyUp?.classList.toggle("is-lit", moveFwd > 0.28);
  walkJoyDown?.classList.toggle("is-lit", moveFwd < -0.28);
  walkJoyLeft?.classList.toggle("is-lit", moveRight < -0.28);
  walkJoyRight?.classList.toggle("is-lit", moveRight > 0.28);

  engine?.setJoystickInput(moveRight, moveFwd);
}

if (walkJoystick) {
  walkJoystick.addEventListener("contextmenu", (e) => e.preventDefault());

  walkJoystick.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (joyPointerId !== null) return;
    joyPointerId = e.pointerId;
    walkJoystick.classList.add("is-active");
    hoverCard.hidden = true;
    try {
      walkJoystick.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events in tests may omit active capture handles
    }
    updateWalkJoystickFromPoint(e.clientX, e.clientY);
  });

  walkJoystick.addEventListener("pointermove", (e) => {
    if (joyPointerId !== e.pointerId) return;
    e.stopPropagation();
    e.preventDefault();
    updateWalkJoystickFromPoint(e.clientX, e.clientY);
  });

  const endJoystickGesture = (e) => {
    if (joyPointerId !== e.pointerId) return;
    e.stopPropagation();
    resetWalkJoystick();
  };

  walkJoystick.addEventListener("pointerup", endJoystickGesture);
  walkJoystick.addEventListener("pointercancel", endJoystickGesture);
  walkJoystick.addEventListener("lostpointercapture", endJoystickGesture);
}

function syncDockUI() {
  if (isOgCapture) return;

  addBtn.hidden = true;
  pickSpotPill.hidden = true;
  bottomBuilder.hidden = true;
  buildingPill.hidden = true;
  readyGotoBtn.hidden = true;
  locateMineBtn.hidden = true;

  if (myCreationId && uiState !== "ready") {
    uiState = "placed";
  }

  switch (uiState) {
    case "picking":
      pickSpotPill.hidden = false;
      engine.setSpotPickerState({
        mode: "picking",
        ...(chosenSpot ? { x: chosenSpot.x, z: chosenSpot.z } : {}),
      });
      break;
    case "composing":
      bottomBuilder.hidden = false;
      engine.setPreviewPrompt(promptInput.value);
      engine.setSpotPickerState({
        mode: "staked",
        x: chosenSpot?.x ?? 16,
        z: chosenSpot?.z ?? 10,
      });
      break;
    case "building":
      buildingPill.hidden = false;
      renderActiveJobLabel();
      engine.setSpotPickerState({
        mode: "building",
        x: chosenSpot?.x ?? 16,
        z: chosenSpot?.z ?? 10,
      });
      break;
    case "ready": {
      readyGotoBtn.hidden = false;
      const name = readyCreation?.name || "your creation";
      readyGotoLabel.textContent = `Ready · Go to ${name}`;
      engine.setSpotPickerState({ mode: "hidden" });
      break;
    }
    case "placed": {
      locateMineBtn.hidden = false;
      const mine = worldData?.creations?.find((c) => c.id === myCreationId);
      locateMineLabel.textContent = mine ? `Locate · ${mine.name}` : "Locate yours";
      engine.setSpotPickerState({ mode: "hidden" });
      break;
    }
    default:
      addBtn.hidden = false;
      engine.setSpotPickerState({ mode: "hidden" });
      break;
  }
}

async function pollActiveJob() {
  if (!activeJob || jobPollInFlight) return;
  jobPollInFlight = true;
  try {
    const res = await fetch(`/api/job?id=${encodeURIComponent(activeJob.jobId)}`, {
      headers: buildVisitorHeaders(),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.visitorToken) storeVisitorToken(data.visitorToken);
    if (!data.ok || !data.job) return;

    const job = data.job;
    if (job.status === "done") {
      stopJobTracking();
      sculptBtn.disabled = false;
      if (data.world) {
        worldData = data.world;
        engine.applyWorldSnapshot(worldData);
      }
      if (data.feeds) {
        engine.applyLiveFeeds(data.feeds);
      }
      myCreationId = job.creationId || data.world?.myCreationId || myCreationId;
      readyCreation =
        job.creation || worldData?.creations?.find((c) => c.id === myCreationId) || null;
      uiState = "ready";
      syncDockUI();
      return;
    }

    if (job.status === "failed") {
      stopJobTracking();
      sculptBtn.disabled = false;
      if (job.creationId) {
        myCreationId = job.creationId;
        uiState = "placed";
        syncDockUI();
        return;
      }
      uiState = "composing";
      syncDockUI();
      showFormError(job.error || "Could not build that right now — try again.");
      return;
    }

    activeJob = { ...job };
    renderActiveJobLabel();
  } catch {
    // ignore transient poll hiccups; next tick or WS broadcast will recover
  } finally {
    jobPollInFlight = false;
  }
}

function startTrackingJob(jobInfo) {
  stopJobTracking();
  activeJob = { ...jobInfo };
  uiState = "building";
  syncDockUI();

  jobPollInterval = setInterval(() => {
    if (uiState === "building" && activeJob) {
      pollActiveJob();
    }
  }, 2500);
}

// Dynamically resize the 3D staked plot on the island as the visitor describes tiny vs colossal subjects!
promptInput.addEventListener("input", () => {
  engine.setPreviewPrompt(promptInput.value);
});

// 1. Click "+ Add" -> pick where on the island it will go
addBtn.addEventListener("click", () => {
  if (engine.isFirstPerson()) {
    engine.setDragMode("pan");
  }
  if (myCreationId) {
    uiState = "placed";
    syncDockUI();
    return;
  }
  hoverCard.hidden = true;
  engine.setPreviewPrompt(promptInput.value);
  uiState = "picking";
  syncDockUI();
});

cancelPickBtn.addEventListener("click", () => {
  chosenSpot = null;
  uiState = "idle";
  syncDockUI();
});

moveSpotBtn.addEventListener("click", () => {
  uiState = "picking";
  syncDockUI();
});

closeBuilderBtn.addEventListener("click", () => {
  hideError();
  chosenSpot = null;
  uiState = "idle";
  syncDockUI();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (
      characterBuilder?.isOpen?.() ||
      (avatarDialog &&
        (avatarDialog.open || (e.target instanceof Node && avatarDialog.contains(e.target)))) ||
      performance.now() - lastAvatarDialogCloseMs < 80
    ) {
      return;
    }
    if (uiState === "picking" || uiState === "composing") {
      e.preventDefault();
      hideError();
      chosenSpot = null;
      uiState = "idle";
      syncDockUI();
    } else if (engine.isFirstPerson()) {
      e.preventDefault();
      hoverCard.hidden = true;
      engine.setDragMode("pan");
    }
  }
});

worldCanvas.addEventListener("pointerleave", () => {
  hoverCard.hidden = true;
});

readyGotoBtn.addEventListener("click", () => {
  if (!myCreationId) return;
  hoverCard.hidden = true;
  uiState = "placed";
  syncDockUI();
  engine.focusCreationById(myCreationId);
  const mine = worldData?.creations?.find((c) => c.id === myCreationId) || readyCreation;
  if (mine) {
    const desc = mine.description || mine.behavior?.statusLine || "";
    showToast(desc ? `${mine.name} — ${desc}` : mine.name, 4600);
  }
});

locateMineBtn.addEventListener("click", () => {
  if (!myCreationId) return;
  hoverCard.hidden = true;
  engine.focusCreationById(myCreationId);
  const mine = worldData?.creations?.find((c) => c.id === myCreationId);
  if (mine) {
    const desc = mine.description || mine.behavior?.statusLine || "";
    showToast(desc ? `${mine.name} — ${desc}` : mine.name);
  }
});

async function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unsupported image format"));
      img.onload = () => {
        const maxSide = 960;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const c = document.createElement("canvas");
        c.width = Math.max(1, width);
        c.height = Math.max(1, height);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function hideError() {
  formError.hidden = true;
}

async function handleSelectedFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    showFormError("Choose a PNG, JPG, or WebP image.");
    return;
  }
  hideError();
  try {
    selectedImageDataUrl = await resizeImageFile(file);
    dropPreviewImg.src = selectedImageDataUrl;
    dropEmpty.hidden = true;
    dropPreviewWrap.hidden = false;
  } catch (err) {
    showFormError(err.message || "Could not process that image.");
  }
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (file) handleSelectedFile(file);
});

clearImageBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  selectedImageDataUrl = null;
  imageInput.value = "";
  dropPreviewImg.removeAttribute("src");
  dropPreviewWrap.hidden = true;
  dropEmpty.hidden = false;
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) handleSelectedFile(file);
});

window.addEventListener("paste", (e) => {
  if (uiState !== "composing") return;
  const items = e.clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) handleSelectedFile(f);
      break;
    }
  }
});

// Enqueue build into the multi-user workshop queue -> close builder immediately so visitor can explore while watching live build stages!
sculptBtn.addEventListener("click", async () => {
  if (uiState === "building") return;
  hideError();
  const prompt = promptInput.value.trim();
  if (!prompt && !selectedImageDataUrl) {
    showFormError("Add a photo or short description first.");
    return;
  }

  engine.setPreviewPrompt(prompt);
  const spotX = chosenSpot?.x ?? null;
  const spotZ = chosenSpot?.z ?? null;

  uiState = "building";
  sculptBtn.disabled = true;
  buildingPillLabel.textContent = "Approving query…";
  if (buildingPillSub) {
    buildingPillSub.textContent = "Being built with Gemini 4 Hydrogen";
  }
  syncDockUI();

  try {
    const res = await fetch("/api/build", {
      method: "POST",
      headers: buildVisitorHeaders({
        "content-type": "application/json",
        "x-meadow-client": "1",
      }),
      body: JSON.stringify({
        prompt,
        imageDataUrl: selectedImageDataUrl || undefined,
        x: spotX,
        z: spotZ,
      }),
    });
    const data = await res.json();
    if (data?.visitorToken) storeVisitorToken(data.visitorToken);

    if (!res.ok || !data.ok) {
      sculptBtn.disabled = false;
      if (data.alreadyPlaced && data.myCreationId) {
        myCreationId = data.myCreationId;
        uiState = "placed";
        syncDockUI();
        return;
      }
      uiState = "composing";
      syncDockUI();
      showFormError(data.error || "Could not build that right now — try again.");
      return;
    }

    if (data.job) {
      startTrackingJob(data.job);
      return;
    }

    // Direct synchronous fallback if ever returned
    sculptBtn.disabled = false;
    worldData = data.world;
    myCreationId = data.creation.id;
    readyCreation = data.creation;
    if (data.feeds) engine.applyLiveFeeds(data.feeds);
    engine.applyWorldSnapshot(worldData);
    uiState = "ready";
    syncDockUI();
  } catch {
    sculptBtn.disabled = false;
    uiState = "composing";
    syncDockUI();
    showFormError("Network hiccup while building — try again.");
  }
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sculptBtn.click();
  }
});

async function refreshLiveFeeds() {
  try {
    const res = await fetch("/api/feeds");
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && data.feeds) {
      engine.applyLiveFeeds(data.feeds);
    }
  } catch {
    // ignore transient feed errors
  }
}

async function refreshDailyEligibility() {
  if (isOgCapture || uiState === "building" || uiState === "ready") return;
  try {
    const res = await fetch("/api/world", {
      headers: buildVisitorHeaders(),
    });
    if (!res.ok) return;
    const latest = await res.json();
    if (latest?.visitorToken) storeVisitorToken(latest.visitorToken);
    worldData = latest;
    myCreationId = latest.myCreationId || null;
    engine.applyWorldSnapshot(worldData);
    if (latest.myActiveJob && !myCreationId) {
      startTrackingJob(latest.myActiveJob);
    } else if (!myCreationId && uiState === "placed") {
      uiState = "idle";
      syncDockUI();
    }
  } catch {
    // ignore transient network errors
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (uiState === "building" && activeJob) {
      pollActiveJob();
    } else {
      refreshDailyEligibility();
    }
  }
});

function handleWorldMessage(msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "queue_tick" && activeJob && uiState === "building") {
    const qIdx = Array.isArray(msg.queuedIds) ? msg.queuedIds.indexOf(activeJob.jobId) : -1;
    const activeEntry = Array.isArray(msg.sculpting)
      ? msg.sculpting.find((s) => s.jobId === activeJob.jobId)
      : null;
    if (qIdx >= 0) {
      activeJob.status = "queued";
      activeJob.phase = "queued";
      activeJob.position = qIdx + 1;
      renderActiveJobLabel();
    } else if (activeEntry) {
      activeJob.status = "sculpting";
      if (activeEntry.phase) {
        activeJob.phase = activeEntry.phase;
      } else if (activeJob.phase === "queued") {
        activeJob.phase = "sculpting";
      }
      activeJob.position = 0;
      renderActiveJobLabel();
    }
    pollActiveJob();
    return;
  }

  if ((msg.type === "creation_placed" || msg.type === "world_updated") && msg.world) {
    worldData = {
      ...msg.world,
      myCreationId,
    };
    engine.applyWorldSnapshot(worldData);
    if (uiState === "building" && activeJob) {
      pollActiveJob();
    } else if (uiState === "placed" || uiState === "ready") {
      syncDockUI();
    }
    refreshLiveFeeds();

    if (
      msg.type === "creation_placed" &&
      msg.creation &&
      msg.creation.id !== myCreationId &&
      uiState !== "building"
    ) {
      showToast(`Someone added "${msg.creation.name}" to MATH_LAND!`, 4200);
    }
    syncScoreTelemetry();
  }
}

if (!isOgCapture) {
  mpClient = createMultiplayerClient({
    multiplayerEnabled: !isOgCapture,
    getLocalPose: () => engine?.getLocalMultiplayerPose?.(),
    getLocalProfile: () => engine?.getLocalAppearance?.(),
    getExtraHeaders: () => buildVisitorHeaders(),
    onWorldMessage: handleWorldMessage,
    onWelcome(msg) {
      engine?.syncMultiplayerWelcome?.(msg?.players || []);
      if (typeof msg?.onlineCount === "number") {
        updateOnlinePill(msg.onlineCount);
      }
    },
    onPeerJoin(player, msg) {
      engine?.upsertRemotePlayer?.(player);
      if (typeof msg?.onlineCount === "number") {
        updateOnlinePill(msg.onlineCount);
      }
    },
    onPeerPose(poseMsg) {
      engine?.updateRemotePlayerPose?.(poseMsg);
    },
    onPeerProfile(profileMsg) {
      engine?.updateRemotePlayerProfile?.(profileMsg);
    },
    onPeerEmote(emoteMsg) {
      engine?.triggerRemotePlayerEmote?.(emoteMsg);
    },
    onPeerLeave(id, msg) {
      engine?.removeRemotePlayer?.(id);
      if (typeof msg?.onlineCount === "number") {
        updateOnlinePill(msg.onlineCount);
      }
    },
    onOnlineCountChange(count) {
      updateOnlinePill(count);
    },
  });
}

window.__geminIslandMp = mpClient;

async function initWorld() {
  try {
    const res = await fetch("/api/world", {
      headers: buildVisitorHeaders(),
    });
    if (res.ok) {
      worldData = await res.json();
      if (worldData?.visitorToken) storeVisitorToken(worldData.visitorToken);
      myCreationId = worldData.myCreationId || myCreationId || null;
      engine.applyWorldSnapshot(worldData);
      syncScoreTelemetry();
      if (!isOgCapture) {
        if (myCreationId) {
          uiState = "placed";
          syncDockUI();
        } else if (worldData.myActiveJob) {
          startTrackingJob(worldData.myActiveJob);
        } else {
          uiState = "idle";
          syncDockUI();
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch initial world:", err);
  }

  refreshLiveFeeds();
  if (!isOgCapture) {
    setInterval(refreshLiveFeeds, 90_000);
    setInterval(refreshDailyEligibility, 10 * 60_000);
  }
}

// ---------------- PIXBOY Console Hardware, 20-Chapter Rack & Interactive Math Labs ----------------
const chapterRackEl = document.getElementById("chapter-rack");
const attractionRackEl = document.getElementById("attraction-rack");
const mathLabOverlay = document.getElementById("math-lab-overlay");
const mlBadgeEl = document.getElementById("ml-badge");
const mlTitleEl = document.getElementById("ml-title");
const mlPrevBtn = document.getElementById("ml-prev-btn");
const mlNextBtn = document.getElementById("ml-next-btn");
const ml3dBtn = document.getElementById("ml-3d-btn");
const mlCloseBtn = document.getElementById("ml-close-btn");
const mlTabLabBtn = document.getElementById("ml-tab-lab");
const mlTabActivityBtn = document.getElementById("ml-tab-activity");
const mlTabSheetBtn = document.getElementById("ml-tab-sheet");
const mlPanelLab = document.getElementById("ml-panel-lab");
const mlPanelActivity = document.getElementById("ml-panel-activity");
const mlPanelSheet = document.getElementById("ml-panel-sheet");
const mathLabCanvas = document.getElementById("math-lab-canvas");
const mlReadoutEl = document.getElementById("ml-readout");
const mlPlayBtn = document.getElementById("ml-play-btn");
const mlSpeedBtn = document.getElementById("ml-speed-btn");
const mlRandBtn = document.getElementById("ml-rand-btn");
const mlResetBtn = document.getElementById("ml-reset-btn");
const mlMissionPill = document.getElementById("ml-mission-pill");
const mlP1Name = document.getElementById("ml-p1-name");
const mlP1Range = document.getElementById("ml-p1-range");
const mlP1Val = document.getElementById("ml-p1-val");
const mlP2Name = document.getElementById("ml-p2-name");
const mlP2Range = document.getElementById("ml-p2-range");
const mlP2Val = document.getElementById("ml-p2-val");
const mlPresetsEl = document.getElementById("ml-presets");
const mlAiText = document.getElementById("ml-ai-text");
const mlRealText = document.getElementById("ml-real-text");
const mlSheetImg = document.getElementById("ml-sheet-img");
const mlSyllabusText = document.getElementById("ml-syllabus-text");

const mlActMissionState = document.getElementById("ml-act-mission-state");
const mlActMissionTitle = document.getElementById("ml-act-mission-title");
const mlActMissionHint = document.getElementById("ml-act-mission-hint");
const mlActMissionStatus = document.getElementById("ml-act-mission-status");
const mlActGotoLabBtn = document.getElementById("ml-act-goto-lab-btn");
const mlActivityScore = document.getElementById("ml-activity-score");
const mlQuizList = document.getElementById("ml-quiz-list");

const pauseOverlay = document.getElementById("pause-overlay");
const pauseStatsEl = document.getElementById("pause-stats");
const powerOffScreen = document.getElementById("power-off-screen");
const powerLight = document.getElementById("power-light");
const powerSwitchBtn = document.getElementById("power-switch");
const screenFooterTitle = document.getElementById("screen-footer-title");
const expandScreenBtn = document.getElementById("expand-screen-btn");
const expandSideBtn = document.getElementById("expand-side-btn");
const collapseScreenBtn = document.getElementById("collapse-screen-btn");
const bezelSkyBtn = document.getElementById("bezel-sky-btn");
const bezelTourBtn = document.getElementById("bezel-tour-btn");
const bezelSfxBtn = document.getElementById("bezel-sfx-btn");
const pauseTourBtn = document.getElementById("pause-tour-btn");

const scoreBuildsEl = document.getElementById("score-builds");
const scoreXpEl = document.getElementById("score-xp");
const scoreMasteryEl = document.getElementById("score-mastery");
const scoreChapterEl = document.getElementById("score-chapter");

const PROGRESS_STORAGE_KEY = "mathland_progress_v1";
const explorerProgress = (() => {
  const blank = { xp: 0, discoveredIds: [], solvedMissions: [], quizCorrect: [], quizPicked: {} };
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PROGRESS_STORAGE_KEY) : null;
    if (!raw) return blank;
    const parsed = JSON.parse(raw);
    return {
      xp: Number(parsed?.xp) || 0,
      discoveredIds: Array.isArray(parsed?.discoveredIds) ? parsed.discoveredIds : [],
      solvedMissions: Array.isArray(parsed?.solvedMissions) ? parsed.solvedMissions : [],
      quizCorrect: Array.isArray(parsed?.quizCorrect) ? parsed.quizCorrect : [],
      quizPicked: parsed?.quizPicked && typeof parsed.quizPicked === "object" ? parsed.quizPicked : {},
    };
  } catch {
    return blank;
  }
})();

function saveProgress() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(explorerProgress));
    }
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
}

function getMasteredChapterCount() {
  let count = 0;
  for (const ch of MATH_CHAPTERS) {
    const missionDone = explorerProgress.solvedMissions.includes(ch.id);
    const quizCount = (ch.quiz || []).filter((_, qi) =>
      explorerProgress.quizCorrect.includes(`${ch.id}:${qi}`),
    ).length;
    if (missionDone || quizCount >= 3) count++;
  }
  return count;
}

function isChapterMastered(ch) {
  if (!ch) return false;
  if (explorerProgress.solvedMissions.includes(ch.id)) return true;
  const quizCount = (ch.quiz || []).filter((_, qi) =>
    explorerProgress.quizCorrect.includes(`${ch.id}:${qi}`),
  ).length;
  return quizCount >= 3;
}

function getExplorerRank(xp) {
  if (xp >= 800) return "MATH_LAND Legend";
  if (xp >= 450) return "Euler Scholar";
  if (xp >= 220) return "Tensor Architect";
  if (xp >= 80) return "Algebra Scout";
  return "Voxel Novice";
}

function maybeCelebrateRankUp(prevXp, nextXp) {
  const prevRank = getExplorerRank(prevXp);
  const nextRank = getExplorerRank(nextXp);
  if (nextRank !== prevRank && !isOgCapture) {
    playMissionFanfare();
    showToast(`RANK UP! Explorer Rank: ${nextRank}`, 4200);
  }
}

function awardXp(amount) {
  const pts = Math.max(0, Math.round(amount));
  if (!pts) return;
  const prevXp = explorerProgress.xp;
  explorerProgress.xp += pts;
  saveProgress();
  syncScoreTelemetry();
  maybeCelebrateRankUp(prevXp, explorerProgress.xp);
}

function markDiscovered(id, label, xpBonus = 20) {
  if (!id || explorerProgress.discoveredIds.includes(id)) return false;
  const prevXp = explorerProgress.xp;
  explorerProgress.discoveredIds.push(id);
  explorerProgress.xp += xpBonus;
  saveProgress();
  syncScoreTelemetry();
  if (label && !isOgCapture) {
    showToast(`Discovered ${label}! +${xpBonus} XP`, 3400);
  }
  maybeCelebrateRankUp(prevXp, explorerProgress.xp);
  return true;
}

let activeChapterIdx = 0;
let activeAttractionId = "";
let arcadeHopIdx = -1;
let labOpen = false;
let labTab = "lab";
let consolePower = true;
let consolePaused = false;
let labP1 = MATH_CHAPTERS[0].p1Default;
let labP2 = MATH_CHAPTERS[0].p2Default;
let labAnimPaused = false;
let labSpeed = 1;
let labSimTime = 0;
let lastLabRafMs = 0;
let focusedMonumentIdx = -1;

function syncScoreTelemetry() {
  const count = worldData?.creations?.length ?? 203;
  const mastered = getMasteredChapterCount();
  if (scoreBuildsEl) {
    scoreBuildsEl.textContent = `${String(count).padStart(5, "0")} BUILDS`;
  }
  if (scoreXpEl) {
    scoreXpEl.textContent = `XP ${String(explorerProgress.xp).padStart(4, "0")}`;
  }
  if (scoreMasteryEl) {
    scoreMasteryEl.textContent = `${mastered}/20★`;
  }
  if (pauseStatsEl) {
    const rank = getExplorerRank(explorerProgress.xp).toUpperCase();
    pauseStatsEl.textContent = `RANK: ${rank} · XP ${String(explorerProgress.xp).padStart(4, "0")} · ${mastered}/20 CHAPTERS`;
  }
  const ch = MATH_CHAPTERS[activeChapterIdx] || MATH_CHAPTERS[0];
  if (scoreChapterEl) {
    scoreChapterEl.textContent = `CH ${ch.id} · ${ch.shortTitle.replace(/^\d+\s*/, "")}`;
  }
}

function renderChapterRack() {
  if (!chapterRackEl) return;
  chapterRackEl.innerHTML = "";
  MATH_CHAPTERS.forEach((ch, idx) => {
    const mastered = isChapterMastered(ch);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chapter-chip${idx === activeChapterIdx ? " is-active" : ""}${mastered ? " is-mastered" : ""}`;
    btn.textContent = mastered ? `★ ${ch.shortTitle}` : ch.shortTitle;
    btn.title = `Ch.${ch.id}: ${ch.title}${mastered ? " (Mastered)" : ""}`;
    btn.setAttribute("role", "listitem");
    btn.addEventListener("click", () => {
      playBlip(580);
      openMathLabByIndex(idx);
    });
    chapterRackEl.appendChild(btn);
  });
}

function renderAttractionRack() {
  if (!attractionRackEl) return;
  attractionRackEl.innerHTML = "";
  WORLD_ATTRACTIONS.forEach((attr, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isHq = attr.id === "math-dev-hq";
    btn.className = `attraction-chip${isHq ? " is-hq" : ""}${activeAttractionId === attr.id ? " is-active" : ""}`;
    btn.textContent = `[${attr.tag}] ${attr.label}`;
    btn.title = attr.desc;
    btn.setAttribute("role", "listitem");
    btn.addEventListener("click", () => {
      stopWorldTour(false);
      arcadeHopIdx = idx;
      visitWorldAttraction(attr);
    });
    attractionRackEl.appendChild(btn);
  });
}

function visitWorldAttraction(attr) {
  if (!attr) return;
  if (!consolePower) setConsolePower(true);
  if (consolePaused) setConsolePaused(false);
  if (labOpen) closeMathLab();
  hoverCard.hidden = true;
  activeAttractionId = attr.id;
  renderAttractionRack();
  engine?.focusCreationById?.(attr.id);
  const ent = engine?.getCreationEntity?.(attr.id);
  const fxMsg = attr.id === "math-dev-hq" ? ent?.interactive?.trigger?.() : null;
  if (attr.id === "math-dev-hq") {
    playFireworkBurst();
  } else {
    playConfirm();
  }
  const newlyFound = markDiscovered(attr.id, attr.label, attr.id === "math-dev-hq" ? 25 : 20);
  if (fxMsg) {
    showToast(`${attr.label} — ${fxMsg}`, 4200);
  } else if (!newlyFound) {
    showToast(`${attr.label} — ${attr.desc} (Click 3D model or press E to play!)`, 4000);
  }
}

function hopNextWorldAttraction() {
  stopWorldTour(false);
  arcadeHopIdx = (arcadeHopIdx + 1) % WORLD_ATTRACTIONS.length;
  visitWorldAttraction(WORLD_ATTRACTIONS[arcadeHopIdx]);
}

function checkCurrentMissionStatus() {
  const ch = MATH_CHAPTERS[activeChapterIdx];
  if (!ch) return false;
  const res = evaluateChapterMission(ch.id, labP1, labP2);
  let solvedRecorded = explorerProgress.solvedMissions.includes(ch.id);

  if (res.solved && !solvedRecorded) {
    explorerProgress.solvedMissions.push(ch.id);
    solvedRecorded = true;
    const reward = ch.mission?.xp || 50;
    playMissionFanfare();
    awardXp(reward);
    renderChapterRack();
    showToast(`Ch.${ch.id} Mission Complete! +${reward} XP`, 3800);
  }

  const isSolvedVisual = Boolean(res.solved || solvedRecorded);
  if (mlMissionPill) {
    mlMissionPill.classList.toggle("is-solved", isSolvedVisual);
    mlMissionPill.textContent = res.solved
      ? "MISSION: SOLVED ✓"
      : solvedRecorded
        ? "MISSION: BADGE ✓"
        : "MISSION: GOAL";
  }
  if (mlActMissionState) {
    mlActMissionState.classList.toggle("is-solved", isSolvedVisual);
    mlActMissionState.textContent = res.solved
      ? "LIVE SOLVED ✓"
      : solvedRecorded
        ? "COMPLETED ✓"
        : "IN PROGRESS";
  }
  if (mlActMissionStatus) {
    mlActMissionStatus.textContent = `Live: ${res.currentLabel}`;
  }
  return Boolean(res.solved);
}

function renderActivityQuiz(ch) {
  if (!mlQuizList || !ch) return;
  const questions = Array.isArray(ch.quiz) ? ch.quiz : [];
  const solvedCount = questions.filter((_, qi) =>
    explorerProgress.quizCorrect.includes(`${ch.id}:${qi}`),
  ).length;
  if (mlActivityScore) {
    mlActivityScore.textContent = `${solvedCount} / ${questions.length} SOLVED`;
  }
  mlQuizList.innerHTML = "";
  questions.forEach((item, qi) => {
    const key = `${ch.id}:${qi}`;
    const card = document.createElement("article");
    card.className = "quiz-item";

    const qEl = document.createElement("p");
    qEl.className = "quiz-q";
    qEl.textContent = `Q${qi + 1}. ${item.q}`;
    card.appendChild(qEl);

    const choicesEl = document.createElement("div");
    choicesEl.className = "quiz-choices";
    const picked = explorerProgress.quizPicked[key];
    const isCorrectSaved = explorerProgress.quizCorrect.includes(key);

    item.choices.forEach((choiceText, ci) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-opt";
      if (isCorrectSaved && ci === item.answerIdx) {
        btn.classList.add("is-correct");
      } else if (picked === ci && ci !== item.answerIdx) {
        btn.classList.add("is-wrong");
      }
      btn.textContent = choiceText;
      btn.disabled = isCorrectSaved;
      btn.addEventListener("click", () => {
        explorerProgress.quizPicked[key] = ci;
        if (ci === item.answerIdx && !explorerProgress.quizCorrect.includes(key)) {
          explorerProgress.quizCorrect.push(key);
          playQuizCorrect();
          awardXp(25);
          renderChapterRack();
          showToast(`Correct Answer! +25 XP`, 2800);
        } else {
          playBlip(240, 0.08);
          saveProgress();
        }
        renderActivityQuiz(ch);
      });
      choicesEl.appendChild(btn);
    });
    card.appendChild(choicesEl);

    if (typeof picked === "number" || isCorrectSaved) {
      const exp = document.createElement("p");
      exp.className = "quiz-explain";
      exp.textContent = isCorrectSaved
        ? `✓ ${item.explain}`
        : "Not quite — review the concept and pick another answer!";
      card.appendChild(exp);
    }

    mlQuizList.appendChild(card);
  });
}

function syncActivityPanel(ch) {
  if (!ch) return;
  if (mlActMissionTitle) {
    mlActMissionTitle.textContent = ch.mission?.title || `Explore ${ch.title}`;
  }
  if (mlActMissionHint) {
    mlActMissionHint.textContent = ch.mission?.hint || "";
  }
  checkCurrentMissionStatus();
  renderActivityQuiz(ch);
}

function setLabTab(nextTab) {
  labTab = nextTab === "sheet" ? "sheet" : nextTab === "activity" ? "activity" : "lab";
  if (labTab === "lab") {
    lastLabCssW = 0;
  }
  if (labTab === "activity") {
    syncActivityPanel(MATH_CHAPTERS[activeChapterIdx]);
  }
  if (mlTabLabBtn) {
    mlTabLabBtn.classList.toggle("is-active", labTab === "lab");
    mlTabLabBtn.setAttribute("aria-selected", labTab === "lab" ? "true" : "false");
  }
  if (mlTabActivityBtn) {
    mlTabActivityBtn.classList.toggle("is-active", labTab === "activity");
    mlTabActivityBtn.setAttribute("aria-selected", labTab === "activity" ? "true" : "false");
  }
  if (mlTabSheetBtn) {
    mlTabSheetBtn.classList.toggle("is-active", labTab === "sheet");
    mlTabSheetBtn.setAttribute("aria-selected", labTab === "sheet" ? "true" : "false");
  }
  if (mlPanelLab) mlPanelLab.hidden = labTab !== "lab";
  if (mlPanelActivity) mlPanelActivity.hidden = labTab !== "activity";
  if (mlPanelSheet) mlPanelSheet.hidden = labTab !== "sheet";
}

function applyLabParams(nextP1, nextP2) {
  labP1 = Number(nextP1);
  labP2 = Number(nextP2);
  if (mlP1Range) mlP1Range.value = String(labP1);
  if (mlP2Range) mlP2Range.value = String(labP2);
  if (mlP1Val) mlP1Val.textContent = String(labP1);
  if (mlP2Val) mlP2Val.textContent = String(labP2);
  checkCurrentMissionStatus();
}

function loadChapterIntoLabUI(idx) {
  activeChapterIdx = ((idx % MATH_CHAPTERS.length) + MATH_CHAPTERS.length) % MATH_CHAPTERS.length;
  const ch = MATH_CHAPTERS[activeChapterIdx];
  labP1 = ch.p1Default;
  labP2 = ch.p2Default;

  if (mlBadgeEl) mlBadgeEl.textContent = `CH ${ch.id}`;
  if (mlTitleEl) mlTitleEl.textContent = ch.title;
  if (screenFooterTitle) screenFooterTitle.textContent = labOpen ? `CH ${ch.id} · ${ch.title.toUpperCase()}` : "MATH_LAND 3D";
  if (mlP1Name) mlP1Name.textContent = ch.p1Label;
  if (mlP1Range) {
    mlP1Range.min = String(ch.p1Min);
    mlP1Range.max = String(ch.p1Max);
    mlP1Range.step = String(ch.p1Step);
    mlP1Range.value = String(labP1);
  }
  if (mlP1Val) mlP1Val.textContent = String(labP1);

  if (mlP2Name) mlP2Name.textContent = ch.p2Label;
  if (mlP2Range) {
    mlP2Range.min = String(ch.p2Min);
    mlP2Range.max = String(ch.p2Max);
    mlP2Range.step = String(ch.p2Step);
    mlP2Range.value = String(labP2);
  }
  if (mlP2Val) mlP2Val.textContent = String(labP2);

  if (mlAiText) mlAiText.textContent = ch.aiUses;
  if (mlRealText) mlRealText.textContent = ch.realLife;
  if (mlSyllabusText) mlSyllabusText.textContent = `${ch.labTitle} — ${ch.syllabus}`;
  if (mlSheetImg) {
    mlSheetImg.src = ch.image;
    mlSheetImg.alt = `Chapter ${ch.id}: ${ch.title} reference sheet`;
  }

  if (mlPresetsEl) {
    mlPresetsEl.innerHTML = "";
    ch.presets.forEach((preset) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ml-preset-btn";
      b.textContent = preset.label;
      b.addEventListener("click", () => {
        applyLabParams(preset.p1, preset.p2);
      });
      mlPresetsEl.appendChild(b);
    });
  }

  syncActivityPanel(ch);
  renderChapterRack();
  syncScoreTelemetry();
}

function openMathLabByIndex(idx) {
  stopWorldTour(false);
  if (!consolePower) setConsolePower(true);
  if (consolePaused) setConsolePaused(false);
  hoverCard.hidden = true;
  engine?.releaseWalkPointerLock?.();
  loadChapterIntoLabUI(idx);
  labOpen = true;
  if (mathLabOverlay) mathLabOverlay.hidden = false;
  if (screenFooterTitle) {
    const ch = MATH_CHAPTERS[activeChapterIdx];
    screenFooterTitle.textContent = `CH ${ch.id} · ${ch.title.toUpperCase()}`;
  }
}

function openMathLabById(chId) {
  const idx = MATH_CHAPTERS.findIndex((c) => c.id === chId || c.creationId === chId);
  openMathLabByIndex(idx >= 0 ? idx : 0);
}

function closeMathLab() {
  labOpen = false;
  if (mathLabOverlay) mathLabOverlay.hidden = true;
  if (screenFooterTitle) screenFooterTitle.textContent = "MATH_LAND 3D";
}

function setConsolePaused(next) {
  if (!consolePower) return;
  consolePaused = Boolean(next);
  if (consolePaused) {
    stopWorldTour(false);
    hoverCard.hidden = true;
    engine?.releaseWalkPointerLock?.();
    releaseConsolePad();
    syncScoreTelemetry();
  }
  if (pauseOverlay) pauseOverlay.hidden = !consolePaused;
  engine?.setPaused?.(consolePaused);
}

function setConsolePower(next) {
  consolePower = Boolean(next);
  if (powerOffScreen) powerOffScreen.hidden = consolePower;
  if (powerLight) powerLight.classList.toggle("on", consolePower);
  if (powerSwitchBtn) {
    powerSwitchBtn.setAttribute("aria-pressed", consolePower ? "true" : "false");
    powerSwitchBtn.setAttribute("aria-label", consolePower ? "Turn console off" : "Turn console on");
  }
  if (!consolePower) {
    stopWorldTour(false);
    hoverCard.hidden = true;
    engine?.releaseWalkPointerLock?.();
    releaseConsolePad();
    consolePaused = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
    closeMathLab();
  }
  engine?.setPaused?.(!consolePower || consolePaused);
}

function toggleExpandedScreen(forceState) {
  const next = typeof forceState === "boolean"
    ? forceState
    : !document.body.classList.contains("is-screen-expanded");
  document.body.classList.toggle("is-screen-expanded", next);
  if (expandScreenBtn) expandScreenBtn.setAttribute("aria-pressed", next ? "true" : "false");
  if (collapseScreenBtn) collapseScreenBtn.hidden = !next;
  requestAnimationFrame(() => engine?.resize?.());
}

mlP1Range?.addEventListener("input", () => {
  applyLabParams(Number(mlP1Range.value), labP2);
});

mlP2Range?.addEventListener("input", () => {
  applyLabParams(labP1, Number(mlP2Range.value));
});

let labCanvasPointerId = null;
function applyLabPointer(e, isClick) {
  if (!mathLabCanvas) return;
  const rect = mathLabCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (e.clientX - rect.left) / rect.width;
  const ny = (e.clientY - rect.top) / rect.height;
  const ch = MATH_CHAPTERS[activeChapterIdx];
  const next = mapCanvasPointerToParams(ch.id, nx, ny, labP1, labP2, ch, isClick);
  applyLabParams(next.p1, next.p2);
}

if (mathLabCanvas) {
  mathLabCanvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    labCanvasPointerId = e.pointerId;
    try {
      mathLabCanvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic event environments
    }
    applyLabPointer(e, true);
  });
  mathLabCanvas.addEventListener("pointermove", (e) => {
    if (labCanvasPointerId !== e.pointerId) return;
    applyLabPointer(e, false);
  });
  const endLabPointer = (e) => {
    if (labCanvasPointerId === e.pointerId) {
      labCanvasPointerId = null;
    }
  };
  mathLabCanvas.addEventListener("pointerup", endLabPointer);
  mathLabCanvas.addEventListener("pointercancel", endLabPointer);
}

mlPlayBtn?.addEventListener("click", () => {
  labAnimPaused = !labAnimPaused;
  mlPlayBtn.textContent = labAnimPaused ? "PLAY" : "PAUSE";
  mlPlayBtn.classList.toggle("is-active", labAnimPaused);
});

mlSpeedBtn?.addEventListener("click", () => {
  labSpeed = labSpeed === 1 ? 2 : labSpeed === 2 ? 0.5 : 1;
  mlSpeedBtn.textContent = `${labSpeed}x`;
});

mlRandBtn?.addEventListener("click", () => {
  const ch = MATH_CHAPTERS[activeChapterIdx];
  const pickStep = (min, max, step) => {
    const nSteps = Math.max(1, Math.round((max - min) / step));
    const k = Math.floor(Math.random() * (nSteps + 1));
    return Number(Math.min(max, min + k * step).toFixed(4));
  };
  playBlip(640);
  applyLabParams(
    pickStep(ch.p1Min, ch.p1Max, ch.p1Step),
    pickStep(ch.p2Min, ch.p2Max, ch.p2Step),
  );
});

mlResetBtn?.addEventListener("click", () => {
  const ch = MATH_CHAPTERS[activeChapterIdx];
  playBlip(460);
  applyLabParams(ch.p1Default, ch.p2Default);
  showToast(`Reset Ch.${ch.id} sliders to default`, 2200);
});

const SKY_MODES = ["day", "sunset", "night"];
let skyModeIdx = 0;
function syncSkyButtonUI() {
  if (!bezelSkyBtn) return;
  const mode = SKY_MODES[skyModeIdx] || "day";
  bezelSkyBtn.textContent = `SKY: ${mode.toUpperCase()}`;
  bezelSkyBtn.classList.toggle("is-active", mode !== "day");
}

function syncSfxButtonUI() {
  if (!bezelSfxBtn) return;
  const on = isSoundEnabled();
  bezelSfxBtn.textContent = on ? "SFX: ON" : "SFX: OFF";
  bezelSfxBtn.classList.toggle("is-active", on);
  bezelSfxBtn.setAttribute("aria-pressed", on ? "true" : "false");
}

let worldTourTimer = null;
let worldTourRunning = false;
let worldTourStepIdx = 0;

function getWorldTourStops() {
  return [
    {
      kind: "spot",
      x: 3.8,
      z: -10.8,
      zoom: 1.5,
      id: "math-sign",
      label: "MATH_LAND Welcome Sign",
      toast: "Tour Stop: MATH_LAND Town Sign — MADE BY AARUTO + DIPU-_-",
    },
    ...WORLD_ATTRACTIONS.map((a) => ({
      kind: "attraction",
      attraction: a,
      id: a.id,
      label: a.label,
    })),
    ...MATH_CHAPTERS.map((ch) => ({
      kind: "chapter",
      chapter: ch,
      id: ch.creationId,
      label: ch.title,
    })),
  ];
}

function syncTourButtonsUI() {
  if (bezelTourBtn) {
    bezelTourBtn.textContent = worldTourRunning ? "TOUR: ON" : "TOUR";
    bezelTourBtn.classList.toggle("is-active", worldTourRunning);
    bezelTourBtn.setAttribute("aria-pressed", worldTourRunning ? "true" : "false");
  }
  if (pauseTourBtn) {
    pauseTourBtn.textContent = worldTourRunning ? "STOP AUTO TOUR" : "AUTO TOUR ISLAND";
    pauseTourBtn.classList.toggle("is-primary", worldTourRunning);
  }
}

function runNextWorldTourStep() {
  if (!worldTourRunning || !consolePower || consolePaused || labOpen) return;
  const stops = getWorldTourStops();
  if (!stops.length) return;
  const stop = stops[worldTourStepIdx % stops.length];
  worldTourStepIdx = (worldTourStepIdx + 1) % stops.length;

  if (stop.kind === "spot") {
    engine?.setDragMode?.("pan");
    engine?.focusOn?.(stop.x, stop.z, stop.zoom);
    playBlip(540);
    showToast(stop.toast, 3800);
  } else if (stop.kind === "attraction") {
    engine?.setDragMode?.("pan");
    engine?.focusCreationById?.(stop.attraction.id);
    activeAttractionId = stop.attraction.id;
    renderAttractionRack();
    const ent = engine?.getCreationEntity?.(stop.attraction.id);
    const fxMsg = stop.attraction.id === "math-dev-hq" ? ent?.interactive?.trigger?.() : null;
    if (stop.attraction.id === "math-dev-hq") {
      playFireworkBurst();
    } else {
      playBlip(620);
    }
    const newlyFound = markDiscovered(
      stop.attraction.id,
      stop.attraction.label,
      stop.attraction.id === "math-dev-hq" ? 25 : 20,
    );
    if (fxMsg) {
      showToast(`Tour: ${stop.attraction.label} — ${fxMsg}`, 3800);
    } else if (!newlyFound) {
      showToast(`Tour: ${stop.attraction.label}`, 3600);
    }
  } else if (stop.kind === "chapter") {
    engine?.setDragMode?.("pan");
    engine?.focusCreationById?.(stop.chapter.creationId);
    playBlip(520);
    const newlyFound = markDiscovered(stop.chapter.creationId, stop.chapter.title, 20);
    if (!newlyFound) {
      showToast(`Tour Ch.${stop.chapter.id}: ${stop.chapter.title}`, 3600);
    }
  }
}

function startWorldTour() {
  if (!consolePower) setConsolePower(true);
  if (consolePaused) setConsolePaused(false);
  if (labOpen) closeMathLab();
  if (worldTourTimer) clearInterval(worldTourTimer);
  worldTourRunning = true;
  worldTourStepIdx = 0;
  syncTourButtonsUI();
  runNextWorldTourStep();
  worldTourTimer = setInterval(runNextWorldTourStep, 4500);
}

function stopWorldTour(notify = false) {
  if (!worldTourRunning && !worldTourTimer) return;
  worldTourRunning = false;
  if (worldTourTimer) {
    clearInterval(worldTourTimer);
    worldTourTimer = null;
  }
  syncTourButtonsUI();
  if (notify && !isOgCapture) {
    showToast("Auto Tour stopped", 2000);
  }
}

function toggleWorldTour() {
  if (worldTourRunning) stopWorldTour(true);
  else startWorldTour();
}

bezelSkyBtn?.addEventListener("click", () => {
  skyModeIdx = (skyModeIdx + 1) % SKY_MODES.length;
  const mode = SKY_MODES[skyModeIdx];
  engine?.setAtmosphereMode?.(mode);
  syncSkyButtonUI();
  playBlip(mode === "night" ? 420 : mode === "sunset" ? 560 : 680);
  const label = mode === "night" ? "Starlight Night" : mode === "sunset" ? "Golden Sunset" : "Sunlit Day";
  showToast(`MATH_LAND Sky: ${label}`, 2600);
});

bezelSfxBtn?.addEventListener("click", () => {
  const next = setSoundEnabled(!isSoundEnabled());
  syncSfxButtonUI();
  showToast(next ? "Retro Chiptune SFX: ON" : "Retro Chiptune SFX: OFF", 2000);
});

bezelTourBtn?.addEventListener("click", toggleWorldTour);
pauseTourBtn?.addEventListener("click", () => {
  setConsolePaused(false);
  toggleWorldTour();
});

worldCanvas?.addEventListener("pointerdown", () => {
  if (worldTourRunning) stopWorldTour(false);
});

syncSkyButtonUI();
syncSfxButtonUI();
syncTourButtonsUI();

mlMissionPill?.addEventListener("click", () => setLabTab("activity"));
mlActGotoLabBtn?.addEventListener("click", () => setLabTab("lab"));
mlTabLabBtn?.addEventListener("click", () => setLabTab("lab"));
mlTabActivityBtn?.addEventListener("click", () => setLabTab("activity"));
mlTabSheetBtn?.addEventListener("click", () => setLabTab("sheet"));
mlPrevBtn?.addEventListener("click", () => {
  playBlip(520);
  openMathLabByIndex(activeChapterIdx - 1);
});
mlNextBtn?.addEventListener("click", () => {
  playBlip(580);
  openMathLabByIndex(activeChapterIdx + 1);
});
mlCloseBtn?.addEventListener("click", closeMathLab);
ml3dBtn?.addEventListener("click", () => {
  const ch = MATH_CHAPTERS[activeChapterIdx];
  playConfirm();
  closeMathLab();
  engine?.focusCreationById?.(ch.creationId);
  markDiscovered(ch.creationId, ch.title, 20);
  showToast(`Focused Ch.${ch.id}: ${ch.title}`, 3200);
});

document.getElementById("arcade-hop-btn")?.addEventListener("click", hopNextWorldAttraction);
document.getElementById("bezel-toys-btn")?.addEventListener("click", hopNextWorldAttraction);
document.getElementById("bezel-labs-btn")?.addEventListener("click", () => {
  if (labOpen) closeMathLab();
  else openMathLabByIndex(activeChapterIdx);
});
document.getElementById("open-atlas-left-btn")?.addEventListener("click", () => {
  openMathLabByIndex(activeChapterIdx);
});
document.getElementById("open-atlas-right-btn")?.addEventListener("click", () => {
  openMathLabByIndex(activeChapterIdx);
});
expandScreenBtn?.addEventListener("click", () => toggleExpandedScreen());
expandSideBtn?.addEventListener("click", () => toggleExpandedScreen());
collapseScreenBtn?.addEventListener("click", () => toggleExpandedScreen(false));

powerSwitchBtn?.addEventListener("click", () => setConsolePower(!consolePower));
document.getElementById("btn-select")?.addEventListener("click", () => {
  if (!consolePower) return;
  if (consolePaused) setConsolePaused(false);
  if (labOpen) {
    openMathLabByIndex(activeChapterIdx + 1);
  } else {
    openMathLabByIndex(activeChapterIdx);
  }
});
document.getElementById("btn-start")?.addEventListener("click", () => {
  if (!consolePower) return;
  if (labOpen) closeMathLab();
  setConsolePaused(!consolePaused);
});

document.getElementById("pause-resume-btn")?.addEventListener("click", () => setConsolePaused(false));
document.getElementById("pause-labs-btn")?.addEventListener("click", () => {
  setConsolePaused(false);
  openMathLabByIndex(activeChapterIdx);
});
document.getElementById("pause-dev-btn")?.addEventListener("click", () => {
  setConsolePaused(false);
  arcadeHopIdx = 0;
  visitWorldAttraction(WORLD_ATTRACTIONS[0]);
});
document.getElementById("pause-add-btn")?.addEventListener("click", () => {
  setConsolePaused(false);
  addBtn?.click();
});
document.getElementById("pause-home-btn")?.addEventListener("click", () => {
  setConsolePaused(false);
  engine?.recenterCamera?.();
  engine?.setDragMode?.("pan");
});
document.getElementById("pause-expand-btn")?.addEventListener("click", () => {
  setConsolePaused(false);
  toggleExpandedScreen();
});

function handleConsoleA() {
  if (!consolePower || consolePaused) return;
  stopWorldTour(false);
  playConfirm();
  if (labOpen) {
    ml3dBtn?.click();
    return;
  }
  if (engine?.triggerActiveInteraction?.()) return;
  if (engine?.isFirstPerson?.()) {
    engine.jumpLocalPlayer?.();
    return;
  }
  focusedMonumentIdx = (focusedMonumentIdx + 1) % MATH_CHAPTERS.length;
  const ch = MATH_CHAPTERS[focusedMonumentIdx];
  loadChapterIntoLabUI(focusedMonumentIdx);
  engine?.focusCreationById?.(ch.creationId);
  showToast(`Ch.${ch.id}: ${ch.title} (click monument or SELECT for Lab)`, 3200);
}

function handleConsoleB() {
  if (!consolePower) return;
  stopWorldTour(false);
  playBlip(400);
  if (consolePaused) {
    setConsolePaused(false);
    return;
  }
  if (labOpen) {
    closeMathLab();
    return;
  }
  const order = ["pan", "orbit", "walk"];
  const cur = engine?.getDragMode?.() || "pan";
  const next = order[(order.indexOf(cur) + 1) % order.length];
  engine?.setDragMode?.(next);
}

document.getElementById("btn-a")?.addEventListener("click", handleConsoleA);
document.getElementById("btn-b")?.addEventListener("click", handleConsoleB);

// Continuous D-Pad wiring + keyboard visual feedback
const dpadBtns = {
  up: document.getElementById("dpad-up"),
  down: document.getElementById("dpad-down"),
  left: document.getElementById("dpad-left"),
  right: document.getElementById("dpad-right"),
};
const btnAEl = document.getElementById("btn-a");
const btnBEl = document.getElementById("btn-b");

function flashConsoleBtn(el) {
  if (!el) return;
  el.classList.add("is-pressed");
  setTimeout(() => el.classList.remove("is-pressed"), 140);
}

const padState = { up: false, down: false, left: false, right: false };
function syncConsolePadVector() {
  const dx = (padState.right ? 1 : 0) - (padState.left ? 1 : 0);
  const dy = (padState.up ? 1 : 0) - (padState.down ? 1 : 0);
  dpadBtns.up?.classList.toggle("is-pressed", padState.up);
  dpadBtns.down?.classList.toggle("is-pressed", padState.down);
  dpadBtns.left?.classList.toggle("is-pressed", padState.left);
  dpadBtns.right?.classList.toggle("is-pressed", padState.right);
  engine?.setConsolePad?.(dx, dy);
}
function releaseConsolePad() {
  padState.up = padState.down = padState.left = padState.right = false;
  syncConsolePadVector();
}
[
  ["up", dpadBtns.up],
  ["down", dpadBtns.down],
  ["left", dpadBtns.left],
  ["right", dpadBtns.right],
].forEach(([dir, el]) => {
  if (!el) return;
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!consolePower || consolePaused) return;
    stopWorldTour(false);
    playBlip(440, 0.035);
    padState[dir] = true;
    syncConsolePadVector();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
    el.addEventListener(ev, () => {
      padState[dir] = false;
      syncConsolePadVector();
    });
  });
});
window.addEventListener("pointerup", releaseConsolePad);
window.addEventListener("blur", releaseConsolePad);

// Console keyboard shortcuts (WASD/Arrows D-pad highlight, Z -> A, X -> B, Enter -> Pause, [ / ] flip labs)
const keyToDpad = {
  w: "up",
  arrowup: "up",
  s: "down",
  arrowdown: "down",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
};
window.addEventListener("keydown", (e) => {
  const tag = e.target?.tagName?.toLowerCase();
  if (tag === "textarea" || tag === "input" || document.querySelector("dialog[open]")) return;
  const lk = e.key ? String(e.key).toLowerCase() : "";
  if (keyToDpad[lk] && consolePower && !consolePaused) {
    dpadBtns[keyToDpad[lk]]?.classList.add("is-pressed");
  }
  if (labOpen && (e.key === "[" || e.key === "ArrowLeft")) {
    e.preventDefault();
    playBlip(520);
    openMathLabByIndex(activeChapterIdx - 1);
    return;
  }
  if (labOpen && (e.key === "]" || e.key === "ArrowRight")) {
    e.preventDefault();
    playBlip(580);
    openMathLabByIndex(activeChapterIdx + 1);
    return;
  }
  if (lk === "z" || lk === "j") {
    flashConsoleBtn(btnAEl);
    handleConsoleA();
  } else if (lk === "x" || lk === "k") {
    flashConsoleBtn(btnBEl);
    handleConsoleB();
  } else if (e.key === "Enter" && !e.target?.matches?.("button, a")) {
    e.preventDefault();
    if (!consolePower) return;
    if (labOpen) closeMathLab();
    else setConsolePaused(!consolePaused);
  } else if (e.key === "Escape" && labOpen) {
    closeMathLab();
  } else if (e.key === "Escape" && document.body.classList.contains("is-screen-expanded") && !engine?.isFirstPerson?.()) {
    toggleExpandedScreen(false);
  }
});
window.addEventListener("keyup", (e) => {
  const lk = e.key ? String(e.key).toLowerCase() : "";
  if (keyToDpad[lk]) {
    dpadBtns[keyToDpad[lk]]?.classList.remove("is-pressed");
  }
});

// Interactive 2D Lab HiDPI animation loop (only runs when Lab tab is active)
const labCtx = mathLabCanvas?.getContext?.("2d") || null;
let lastLabCssW = 0;
let lastLabCssH = 0;
let lastLabDpr = 0;
function stepMathLabCanvas(now) {
  requestAnimationFrame(stepMathLabCanvas);
  const dt = lastLabRafMs ? Math.min(0.08, Math.max(0, (now - lastLabRafMs) * 0.001)) : 0;
  lastLabRafMs = now;
  if (!labOpen || labTab !== "lab" || !consolePower || consolePaused || !labCtx || !mathLabCanvas) {
    return;
  }
  if (!labAnimPaused) {
    labSimTime += dt * labSpeed;
  }
  const rect = mathLabCanvas.getBoundingClientRect();
  const cssW = Math.max(240, Math.round(rect.width || mathLabCanvas.clientWidth || 540));
  const cssH = Math.max(160, Math.round(rect.height || mathLabCanvas.clientHeight || 260));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cssW !== lastLabCssW || cssH !== lastLabCssH || dpr !== lastLabDpr) {
    lastLabCssW = cssW;
    lastLabCssH = cssH;
    lastLabDpr = dpr;
    mathLabCanvas.width = Math.round(cssW * dpr);
    mathLabCanvas.height = Math.round(cssH * dpr);
  }
  labCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ch = MATH_CHAPTERS[activeChapterIdx];
  const missionRes = evaluateChapterMission(ch.id, labP1, labP2);
  const readout = renderChapterLabFrame(
    labCtx,
    cssW,
    cssH,
    ch.id,
    labP1,
    labP2,
    labSimTime,
    { missionSolved: missionRes.solved },
  );
  if (mlReadoutEl && readout) {
    mlReadoutEl.textContent = readout;
  }
}

renderAttractionRack();
loadChapterIntoLabUI(0);
requestAnimationFrame(stepMathLabCanvas);

initWorld();
