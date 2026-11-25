import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import stream from "node:stream";
import url from "node:url";
import { createServer as createViteServer } from "vite";
import { checkIslandContentPolicy } from "./src/content_policy";
import { type AppEnv, resolveRuntimeEnv } from "./src/env_types";
import { callGeminiWithFallbacks, createGeminiSdkClient } from "./src/gemini_models";
import { resolveWorldLiveFeeds } from "./src/live_feeds";
import { chooseMoveWithGeminiFlashLite, validateMinigameRequest } from "./src/minigame_ai";
import { MultiplayerHub } from "./src/multiplayer_hub";
import {
  buildSecurityHeaders,
  readBoundedJsonBody,
  redactSecrets,
  resolveVisitorIdentity,
  safeLogError,
  sanitizePlainText,
  validateImageDataUrl,
  verifyMutationSecurity,
} from "./src/security";
import type { TrafficIncidentReason } from "./src/types";
import { WorldStore } from "./src/world_store";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

type NodeIncomingReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type NodeServerRes = {
  statusCode: number;
  headersSent?: boolean;
  setHeader(name: string, value: string | string[]): void;
  end(chunk?: unknown): void;
};

type NodeUpgradeSocket = {
  write(chunk: string | Uint8Array): boolean;
  destroy(): void;
};

const minigameBuckets = new Map<string, { windowStart: number; count: number }>();
function allowMinigameMove(ipHash: string): boolean {
  const now = Date.now();
  if (minigameBuckets.size > 1024) {
    for (const [k, b] of minigameBuckets.entries()) {
      if (now - b.windowStart > 60_000) minigameBuckets.delete(k);
    }
  }
  const cur = minigameBuckets.get(ipHash);
  if (!cur || now - cur.windowStart > 60_000) {
    minigameBuckets.set(ipHash, { windowStart: now, count: 1 });
    return true;
  }
  if (cur.count >= 90) return false;
  cur.count++;
  return true;
}

const incidentBuckets = new Map<string, { windowStart: number; count: number }>();
function allowTrafficIncidentReport(ipHash: string): boolean {
  const now = Date.now();
  if (incidentBuckets.size > 1024) {
    for (const [k, b] of incidentBuckets.entries()) {
      if (now - b.windowStart > 60_000) incidentBuckets.delete(k);
    }
  }
  const cur = incidentBuckets.get(ipHash);
  if (!cur || now - cur.windowStart > 60_000) {
    incidentBuckets.set(ipHash, { windowStart: now, count: 1 });
    return true;
  }
  if (cur.count >= 24) return false;
  cur.count++;
  return true;
}

const geminiAssistBuckets = new Map<string, { windowStart: number; count: number }>();
function allowGeminiAssist(ipHash: string): boolean {
  const now = Date.now();
  if (geminiAssistBuckets.size > 1024) {
    for (const [k, b] of geminiAssistBuckets.entries()) {
      if (now - b.windowStart > 60_000) geminiAssistBuckets.delete(k);
    }
  }
  const cur = geminiAssistBuckets.get(ipHash);
  if (!cur || now - cur.windowStart > 60_000) {
    geminiAssistBuckets.set(ipHash, { windowStart: now, count: 1 });
    return true;
  }
  if (cur.count >= 20) return false;
  cur.count++;
  return true;
}

function ensureWavBase64(base64Data: string, mimeType?: string): { base64: string; mimeType: string } {
  const raw = Buffer.from(base64Data, "base64");
  if (raw.length >= 12 && raw.subarray(0, 4).toString("ascii") === "RIFF") {
    return { base64: base64Data, mimeType: "audio/wav" };
  }
  if (mimeType && /audio\/(mpeg|mp3|ogg|webm|mp4)/i.test(mimeType)) {
    return { base64: base64Data, mimeType };
  }
  const rateMatch = String(mimeType || "").match(/rate=(\d{4,6})/i);
  const sampleRate = rateMatch ? Math.max(8000, Math.min(96000, Number(rateMatch[1]) || 24000)) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = raw.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);
  return {
    base64: Buffer.concat([header, raw]).toString("base64"),
    mimeType: "audio/wav",
  };
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  const isHttps =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...buildSecurityHeaders(isHttps),
      ...(extraHeaders ?? {}),
    },
  });
}

function toWebRequest(req: NodeIncomingReq): Request {
  const proto =
    (typeof req.headers["x-forwarded-proto"] === "string" &&
      req.headers["x-forwarded-proto"].split(",")[0].trim()) ||
    "http";
  const host =
    (typeof req.headers["x-forwarded-host"] === "string" &&
      req.headers["x-forwarded-host"].split(",")[0].trim()) ||
    req.headers.host ||
    `localhost:${PORT}`;
  const fullUrl = `${proto}://${host}${req.url || "/"}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") {
      headers.set(k, v);
    } else if (Array.isArray(v)) {
      headers.set(k, v.join(", "));
    }
  }

  const method = (req.method || "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };
  if (hasBody) {
    init.body = stream.Readable.toWeb(
      req as unknown as Parameters<typeof stream.Readable.toWeb>[0],
    ) as unknown as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }
  return new Request(fullUrl, init);
}

async function sendWebResponse(res: NodeServerRes, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const setCookies = (webRes.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookies && setCookies.length > 0) {
    res.setHeader("set-cookie", setCookies);
  }
  if (!webRes.body) {
    res.end();
    return;
  }
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function tryServeStaticFile(req: NodeIncomingReq, res: NodeServerRes, rootDir: string): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const cleanRel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const resolved = path.resolve(rootDir, cleanRel);
  if (!resolved.startsWith(path.resolve(rootDir))) {
    return false;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return false;
  }
  const ext = path.extname(resolved).toLowerCase();
  res.statusCode = 200;
  res.setHeader("content-type", MIME_BY_EXT[ext] || "application/octet-stream");
  res.setHeader("x-content-type-options", "nosniff");
  if (ext === ".png" || ext === ".jpg" || ext === ".ico") {
    res.setHeader("cache-control", "public, max-age=3600");
  }
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  fs.createReadStream(resolved).pipe(res as unknown as NodeJS.WritableStream);
  return true;
}

export async function startServer(customPort?: number) {
  const mpHub = new MultiplayerHub();

  const worldStore = new WorldStore({
    getEnv: () => resolveRuntimeEnv(),
    onBroadcast: (payload) => {
      mpHub.broadcastWorldEvent(payload);
    },
  });

  async function handleApiRequest(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/mp") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const parsed = await readBoundedJsonBody(request, 32_768);
        if (!parsed.ok) {
          return jsonResponse(request, { ok: false, error: parsed.error }, parsed.status);
        }
        const syncRes = mpHub.handleHttpSync(parsed.data);
        return jsonResponse(request, syncRes, 200);
      }

      if (url.pathname === "/api/world") {
        if (request.method !== "GET") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const id = await resolveVisitorIdentity(request, env);
        const snapshot = worldStore.getWorldSnapshot(id.cookieId, id.dayKey);
        return jsonResponse(
          request,
          {
            ...snapshot,
            visitorToken: id.visitorToken,
          },
          200,
          id.setCookieHeader ? { "Set-Cookie": id.setCookieHeader } : undefined,
        );
      }

      if (url.pathname === "/api/world/reset") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const id = await resolveVisitorIdentity(request, env);
        const resetRes = worldStore.resetVisitorWorld(id.cookieId);
        const snapshot = worldStore.getWorldSnapshot(id.cookieId, id.dayKey);
        return jsonResponse(
          request,
          {
            ok: true,
            removedCount: resetRes.removedCount,
            cancelledJobs: resetRes.cancelledJobs,
            world: {
              ...snapshot,
              visitorToken: id.visitorToken,
            },
            visitorToken: id.visitorToken,
          },
          200,
          id.setCookieHeader ? { "Set-Cookie": id.setCookieHeader } : undefined,
        );
      }

      if (url.pathname === "/api/job") {
        if (request.method !== "GET") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const id = await resolveVisitorIdentity(request, env);
        const jobId = sanitizePlainText(url.searchParams.get("id") ?? "", 64, true);
        const statusRes = worldStore.getBuildJobStatus(jobId || null, id.cookieId, id.dayKey);
        const feeds = statusRes.world
          ? await resolveWorldLiveFeeds(statusRes.world.creations)
          : undefined;
        return jsonResponse(
          request,
          {
            ok: true,
            job: statusRes.job,
            visitorToken: id.visitorToken,
            ...(statusRes.world ? { world: statusRes.world } : {}),
            ...(feeds ? { feeds } : {}),
          },
          200,
          id.setCookieHeader ? { "Set-Cookie": id.setCookieHeader } : undefined,
        );
      }

      if (url.pathname === "/api/feeds") {
        if (request.method !== "GET") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const snapshot = worldStore.getWorldSnapshot("", "");
        const feeds = await resolveWorldLiveFeeds(snapshot.creations);
        return jsonResponse(request, { ok: true, feeds }, 200, {
          "cache-control": "public, max-age=20",
        });
      }

      if (url.pathname === "/api/audit") {
        if (request.method !== "GET") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const report = worldStore.getWorldAuditReport();
        return jsonResponse(request, report, 200, {
          "cache-control": "public, max-age=10",
        });
      }

      if (url.pathname === "/api/eta") {
        if (request.method !== "GET") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const telemetry = worldStore.getBuildEtaTelemetry();
        const diagnostics = worldStore.getBuildDiagnostics();
        return jsonResponse(
          request,
          { ok: true, telemetry, diagnostics },
          200,
          { "cache-control": "public, max-age=5" },
        );
      }

      if (url.pathname === "/api/traffic-incident") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const id = await resolveVisitorIdentity(request, env);
        if (!allowTrafficIncidentReport(id.ipHash)) {
          return jsonResponse(request, { ok: false, error: "Rate limited." }, 429);
        }
        const parsedBody = await readBoundedJsonBody(request, 4_096);
        if (!parsedBody.ok) {
          return jsonResponse(request, { ok: false, error: parsedBody.error }, parsedBody.status);
        }
        const raw = parsedBody.data;
        const vehicleId = sanitizePlainText(raw.vehicleId, 64, true);
        const peerVehicleId = raw.peerVehicleId
          ? sanitizePlainText(raw.peerVehicleId, 64, true)
          : null;
        const allowedReasons = new Set<TrafficIncidentReason>([
          "clash_gridlock",
          "turnaround_blocked",
          "building_obstruction",
          "self_restored",
        ]);
        const rawReason = sanitizePlainText(raw.reason, 32, true) as TrafficIncidentReason;
        const reason: TrafficIncidentReason = allowedReasons.has(rawReason)
          ? rawReason
          : "self_restored";
        const x = typeof raw.x === "number" && Number.isFinite(raw.x) ? raw.x : 0;
        const z = typeof raw.z === "number" && Number.isFinite(raw.z) ? raw.z : 0;
        if (!vehicleId) {
          return jsonResponse(request, { ok: false, error: "vehicleId required." }, 400);
        }
        const result = worldStore.reportTrafficIncident({
          vehicleId,
          peerVehicleId,
          x,
          z,
          reason,
        });
        return jsonResponse(request, result, result.ok ? 200 : 404);
      }

      if (url.pathname === "/api/minigame-move") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse(
            request,
            { ok: false, error: "Gemini opponent is temporarily unavailable." },
            503,
          );
        }
        const id = await resolveVisitorIdentity(request, env);
        if (!allowMinigameMove(id.ipHash)) {
          return jsonResponse(
            request,
            { ok: false, error: "Too many rapid moves — pause a moment." },
            429,
          );
        }
        const parsedBody = await readBoundedJsonBody(request, 8_192);
        if (!parsedBody.ok) {
          return jsonResponse(request, { ok: false, error: parsedBody.error }, parsedBody.status);
        }
        const validated = validateMinigameRequest(parsedBody.data);
        if (!validated.ok) {
          return jsonResponse(request, { ok: false, error: validated.error }, 400);
        }
        const result = await chooseMoveWithGeminiFlashLite({
          apiKey,
          configuredModel: env.MINIGAME_MODEL,
          req: validated.req,
          validMoves: validated.validMoves,
        });
        return jsonResponse(request, { ok: true, ...result }, 200);
      }

      if (url.pathname === "/api/build") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse(
            request,
            { ok: false, error: "Sculpting service requires GEMINI_API_KEY." },
            503,
          );
        }

        const parsedBody = await readBoundedJsonBody(request, 5_000_000);
        if (!parsedBody.ok) {
          return jsonResponse(request, { ok: false, error: parsedBody.error }, parsedBody.status);
        }
        const body = parsedBody.data;
        const prompt = sanitizePlainText(body.prompt, 480, true);
        const imgCheck = validateImageDataUrl(body.imageDataUrl);
        if (!imgCheck.ok) {
          return jsonResponse(request, { ok: false, error: imgCheck.error }, imgCheck.status);
        }
        if (!prompt && !imgCheck.base64) {
          return jsonResponse(
            request,
            { ok: false, error: "Add a photo or short description first." },
            400,
          );
        }
        if (prompt) {
          const policyRes = checkIslandContentPolicy(prompt);
          if (!policyRes.allowed) {
            return jsonResponse(request, { ok: false, error: policyRes.reason }, 400);
          }
        }

        const id = await resolveVisitorIdentity(request, env);
        const cookieHeaders = id.setCookieHeader ? { "Set-Cookie": id.setCookieHeader } : undefined;

        const enqueued = await worldStore.enqueueBuildJob({
          ipHash: id.ipHash,
          cookieId: id.cookieId,
          dayKey: id.dayKey,
          prompt,
          imageBase64: imgCheck.base64,
          imageMimeType: imgCheck.mimeType,
          x: typeof body.x === "number" && Number.isFinite(body.x) ? body.x : null,
          z: typeof body.z === "number" && Number.isFinite(body.z) ? body.z : null,
          yaw: typeof body.yaw === "number" && Number.isFinite(body.yaw) ? body.yaw : null,
        });

        if (!enqueued.ok) {
          const extra = {
            ...(cookieHeaders ?? {}),
            ...(enqueued.retryAfterSec ? { "Retry-After": String(enqueued.retryAfterSec) } : {}),
          };
          return jsonResponse(
            request,
            {
              ok: false,
              ...(enqueued.alreadyPlaced
                ? { alreadyPlaced: true, myCreationId: enqueued.myCreationId }
                : {}),
              error: enqueued.error,
            },
            enqueued.status,
            extra,
          );
        }

        return jsonResponse(
          request,
          {
            ok: true,
            queued: true,
            job: enqueued.job,
            visitorToken: id.visitorToken,
          },
          200,
          cookieHeaders,
        );
      }

      if (url.pathname === "/api/gemini/explain") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse(
            request,
            { ok: false, error: "Gemini Tutor requires GEMINI_API_KEY." },
            503,
          );
        }
        const id = await resolveVisitorIdentity(request, env);
        if (!allowGeminiAssist(id.ipHash)) {
          return jsonResponse(
            request,
            { ok: false, error: "Tutor cooldown active — wait a moment." },
            429,
          );
        }
        const parsedBody = await readBoundedJsonBody(request, 24_576);
        if (!parsedBody.ok) {
          return jsonResponse(request, { ok: false, error: parsedBody.error }, parsedBody.status);
        }
        const body = parsedBody.data;
        const chapterTitle = sanitizePlainText(body.chapterTitle, 120, true) || "SST Lab";
        const formulaSummary = sanitizePlainText(body.formulaSummary, 240, true);
        const readout = sanitizePlainText(body.readout, 220, true);
        const question = sanitizePlainText(body.question, 320, true);
        const modelPref = sanitizePlainText(body.modelPref, 48, true);
        const promptCheck = checkIslandContentPolicy(`${chapterTitle} ${question}`, {
          educationalMode: true,
        });
        if (!promptCheck.allowed) {
          return jsonResponse(request, { ok: false, error: promptCheck.reason }, 400);
        }

        const overrideModels =
          modelPref === "gemini-2.5-flash" || modelPref === "2.5"
            ? ["gemini-2.5-flash", "gemini-4-hydrogen", "gemini-3.1-flash-lite"]
            : modelPref === "gemini-4-hydrogen"
              ? ["gemini-4-hydrogen", "gemini-2.5-flash", "gemini-3.1-flash-lite"]
              : undefined;

        const result = await callGeminiWithFallbacks({
          apiKey,
          mode: "director",
          hydrogenModel: env.HYDROGEN_MODEL,
          hydrogenModels: env.HYDROGEN_MODELS,
          primaryModel: env.ARGON_MODEL,
          fallbackModel: env.FALLBACK_MODEL,
          overrideModels,
          systemPrompt:
            "You are the friendly SST-LAB CBSE Social Science Tutor (History, Geography, Civics & Economics) for a pixel-art gaming console created by AARUTO + DIPU-_-. Reply with strict JSON only: {\"explanation\": string, \"keyFormula\": string, \"tryTip\": string}. Keep explanation clear, accurate, engaging, and 2-3 short sentences suitable to read aloud.",
          userText: [
            `Chapter: ${chapterTitle}`,
            formulaSummary ? `Live step breakdown: ${formulaSummary}` : "",
            readout ? `Current readout: ${readout}` : "",
            question
              ? `Student question: ${question}`
              : "Explain intuitively what is happening in this interactive lab right now and one experiment to try.",
          ]
            .filter(Boolean)
            .join("\n"),
          temperature: 0.45,
          thinkingBudget: 512,
          maxOutputTokens: 2048,
          maxCascadeMs: 28_000,
        });

        const explanation = sanitizePlainText(result.json.explanation, 520, true);
        const keyFormula = sanitizePlainText(result.json.keyFormula, 140, true);
        const tryTip = sanitizePlainText(result.json.tryTip, 200, true);
        return jsonResponse(request, {
          ok: true,
          explanation: explanation || "Adjust the sliders or drag the canvas to watch the curve and slope respond live.",
          keyFormula,
          tryTip,
          modelUsed: result.modelUsed,
        });
      }

      if (url.pathname === "/api/gemini/tts") {
        if (request.method !== "POST") {
          return jsonResponse(request, { ok: false, error: "Method not allowed." }, 405);
        }
        const csrfErr = verifyMutationSecurity(request);
        if (csrfErr) {
          return jsonResponse(request, { ok: false, error: csrfErr }, 403);
        }
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse(
            request,
            { ok: false, error: "Gemini Audio requires GEMINI_API_KEY." },
            503,
          );
        }
        const id = await resolveVisitorIdentity(request, env);
        if (!allowGeminiAssist(id.ipHash)) {
          return jsonResponse(
            request,
            { ok: false, error: "Audio cooldown active — wait a moment." },
            429,
          );
        }
        const parsedBody = await readBoundedJsonBody(request, 12_288);
        if (!parsedBody.ok) {
          return jsonResponse(request, { ok: false, error: parsedBody.error }, parsedBody.status);
        }
        const text = sanitizePlainText(parsedBody.data.text, 600, true);
        if (!text) {
          return jsonResponse(request, { ok: false, error: "Provide text to speak." }, 400);
        }
        const requestedVoice = sanitizePlainText(parsedBody.data.voiceName, 32, true);
        const VALID_TTS_VOICES = new Set(["Puck", "Charon", "Kore", "Fenrir", "Zephyr"]);
        const safeVoice = VALID_TTS_VOICES.has(requestedVoice) ? requestedVoice : "Kore";
        const ttsMode = sanitizePlainText(parsedBody.data.ttsMode, 24, true);
        const ai = createGeminiSdkClient(apiKey);
        const ttsModels =
          ttsMode === "3.8"
            ? ["gemini-3.8-flash-lite-tts", "gemini-2.5-flash-preview-tts", "gemini-3.8-flash-tts"]
            : ["gemini-2.5-flash-preview-tts", "gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"];
        const attempts: string[] = [];
        let lastErr: unknown = null;

        const runTtsAttempt = async (model: string, withSpeechMeta: boolean) => {
          const part: Record<string, unknown> = withSpeechMeta
            ? {
                text,
                speechMetadata: {
                  style: "Clear, warm, upbeat interactive social science tutor",
                },
              }
            : { text };
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [part],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: safeVoice },
                },
              },
            },
          });
          const parts = response.candidates?.[0]?.content?.parts || [];
          return parts.find((p) => p?.inlineData?.data)?.inlineData;
        };

        for (const model of ttsModels) {
          const metaStrategies = model.includes("2.5") ? [false] : [true, false];
          for (const withSpeechMeta of metaStrategies) {
            try {
              const inline = await runTtsAttempt(model, withSpeechMeta);
              if (inline?.data) {
                const wav = ensureWavBase64(inline.data, inline.mimeType);
                return jsonResponse(request, {
                  ok: true,
                  mimeType: wav.mimeType,
                  audioBase64: wav.base64,
                  modelUsed: model,
                  voiceUsed: safeVoice,
                });
              }
              attempts.push(`${model}(meta=${withSpeechMeta}):no_inline_audio`);
            } catch (err) {
              lastErr = err;
              const msg = redactSecrets(err, [apiKey]);
              attempts.push(`${model}(meta=${withSpeechMeta}):${msg}`);
              if (withSpeechMeta && !/speech_?metadata|INVALID_ARGUMENT|400/i.test(msg)) {
                break;
              }
            }
          }
        }
        safeLogError("gemini_tts", attempts.join(" | ") || lastErr, [apiKey]);
        return jsonResponse(
          request,
          { ok: false, error: "Voice synthesizer busy — try again in a moment." },
          503,
        );
      }

      return jsonResponse(request, { ok: false, error: "Not found." }, 404);
    } catch (err) {
      safeLogError("api_unhandled", err, [env.GEMINI_API_KEY, env.CREATOR_HMAC_SECRET]);
      return jsonResponse(request, { ok: false, error: "Internal server error." }, 500);
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const distDir = path.join(__dirname, "dist");
  const publicDir = path.join(__dirname, "public");

  const httpServer = http.createServer();

  let viteMiddleware: ((req: NodeIncomingReq, res: NodeServerRes, next: () => void) => void) | null =
    null;

  if (!isProd || !fs.existsSync(path.join(distDir, "index.html"))) {
    const vite = await createViteServer({
      root: __dirname,
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        allowedHosts: true,
      },
      appType: "spa",
    });
    viteMiddleware = vite.middlewares as unknown as (
      req: NodeIncomingReq,
      res: NodeServerRes,
      next: () => void,
    ) => void;
  }

  httpServer.on("request", async (req: NodeIncomingReq, res: NodeServerRes) => {
    const urlPath = (req.url || "/").split("?")[0];

    if (urlPath.startsWith("/api/")) {
      const env = resolveRuntimeEnv();
      const webReq = toWebRequest(req);
      const webRes = await handleApiRequest(webReq, env);
      await sendWebResponse(res, webRes);
      return;
    }

    if (viteMiddleware) {
      viteMiddleware(req, res, () => {
        if (!res.headersSent) {
          res.statusCode = 404;
          res.end("Not Found");
        }
      });
      return;
    }

    if (tryServeStaticFile(req, res, distDir)) return;
    if (tryServeStaticFile(req, res, publicDir)) return;

    const indexPath = path.join(distDir, "index.html");
    if (fs.existsSync(indexPath)) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      fs.createReadStream(indexPath).pipe(res as unknown as NodeJS.WritableStream);
      return;
    }
    res.statusCode = 404;
    res.end("Not Found");
  });

  httpServer.on("upgrade", (req: NodeIncomingReq, socket: NodeUpgradeSocket, head: Uint8Array) => {
    const handled = mpHub.handleUpgrade(req, socket, head);
    if (!handled && !viteMiddleware) {
      socket.destroy();
    }
  });

  const listenPort = customPort ?? PORT;
  await new Promise<void>((resolve) => {
    httpServer.listen(listenPort, HOST, () => {
      console.log(`MATH-LAND server listening on http://${HOST}:${listenPort}`);
      resolve();
    });
  });

  return {
    httpServer,
    worldStore,
    mpHub,
    close: () =>
      new Promise<void>((resolve) => {
        mpHub.dispose();
        httpServer.close(() => resolve());
      }),
  };
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(url.fileURLToPath(import.meta.url));

if (isMainModule) {
  void startServer();
}
