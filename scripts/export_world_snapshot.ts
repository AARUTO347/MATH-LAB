import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppEnv } from "../src/env_types";
import { WorldStore } from "../src/world_store";
import { resolveWorldLiveFeeds } from "../src/live_feeds";

async function main(): Promise<void> {
  const tempPersist = path.join(os.tmpdir(), `sstlab-export-${Date.now()}.json`);
  const env: AppEnv = {
    PORT: 3000,
    NODE_ENV: "production",
    GEMINI_API_KEY: "",
    HYDROGEN_MODEL: "gemini-4-hydrogen",
    HYDROGEN_MODELS: "gemini-4-hydrogen,gemini-2.5-flash",
    ARGON_MODEL: "gemini-4-hydrogen",
    FALLBACK_MODEL: "gemini-2.5-flash",
    MINIGAME_MODEL: "gemini-3.1-flash-lite",
    WS_ORIGIN_ALLOWLIST: "",
    WORLD_STATE_PATH: tempPersist,
  };

  const store = new WorldStore({
    getEnv: () => env,
    onBroadcast: () => {},
    persistPath: tempPersist,
  });

  const snapshot = store.getWorldSnapshot("static-bundle", "static");
  const publicDir = path.resolve(process.cwd(), "public");
  await fs.mkdir(publicDir, { recursive: true });

  const worldOutPath = path.join(publicDir, "world-snapshot.json");
  await fs.writeFile(worldOutPath, JSON.stringify(snapshot), "utf8");

  let feeds: Record<string, unknown> = {};
  try {
    feeds = await resolveWorldLiveFeeds(snapshot.creations);
  } catch {
    feeds = {};
  }
  const feedsOutPath = path.join(publicDir, "feeds-snapshot.json");
  await fs.writeFile(feedsOutPath, JSON.stringify({ ok: true, feeds }), "utf8");

  try {
    await fs.unlink(tempPersist);
  } catch {
    // Ignore cleanup errors
  }

  console.log(
    `[prebuild] Exported SST-LAB static bundle: ${snapshot.creations.length} creations, ${snapshot.paths.length} paths, ${snapshot.props.length} props, ${snapshot.villagers.length} villagers -> public/world-snapshot.json`,
  );
}

main().catch((err) => {
  console.error("[prebuild] Failed to export world snapshot:", err);
  process.exit(1);
});
