import { useCallback, useEffect, useRef, useState } from "react";

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };

const W = 320;
const H = 220;
const COLORS = [
  { sky: "#87e8f4", far: "#73bfe6", hill: "#4654a3", ground: "#29265f", accent: "#fff06a" },
  { sky: "#ffb6a3", far: "#ef7395", hill: "#8d3b72", ground: "#452442", accent: "#fff098" },
  { sky: "#b6f27c", far: "#59c98b", hill: "#257179", ground: "#163d52", accent: "#d9ff72" },
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const randomPickup = (): Point => ({ x: 28 + Math.random() * 264, y: 74 + Math.random() * 118 });

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const player = useRef({ x: 55, y: 168, vx: 0, vy: 0, direction: "right" as Direction });
  const pickups = useRef<Point[]>([
    { x: 120, y: 150 },
    { x: 210, y: 96 },
    { x: 278, y: 174 },
    { x: 175, y: 185 },
  ]);
  const enemies = useRef<Point[]>([
    { x: 245, y: 155 },
    { x: 92, y: 92 },
  ]);
  const dashUntil = useRef(0);
  const pulseUntil = useRef(0);
  const invincibleUntil = useRef(0);
  const lastTime = useRef(0);
  const scoreRef = useRef(0);
  const heartsRef = useRef(3);

  const [power, setPower] = useState(true);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(true);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [world, setWorld] = useState(0);
  const [message, setMessage] = useState("");
  const [screenBlocks, setScreenBlocks] = useState<number[]>([]);

  const addScreenBlock = () => {
    setScreenBlocks((blocks) => {
      if (blocks.length >= 6) return blocks;
      const nextId = (blocks.at(-1) ?? 0) + 1;
      return [...blocks, nextId];
    });
  };

  const resetGame = useCallback(() => {
    player.current = { x: 55, y: 168, vx: 0, vy: 0, direction: "right" };
    pickups.current = [
      { x: 120, y: 150 },
      { x: 210, y: 96 },
      { x: 278, y: 174 },
      { x: 175, y: 185 },
    ];
    enemies.current = [
      { x: 245, y: 155 },
      { x: 92, y: 92 },
    ];
    scoreRef.current = 0;
    heartsRef.current = 3;
    setScore(0);
    setHearts(3);
    setMessage("");
  }, []);

  const startGame = useCallback(() => {
    if (!power) return;
    if (!started || heartsRef.current <= 0) {
      resetGame();
      setStarted(true);
      setPaused(false);
      return;
    }
    setPaused((value) => !value);
  }, [power, resetGame, started]);

  const actionA = useCallback(() => {
    if (!power || !started || paused) return;
    dashUntil.current = performance.now() + 380;
    setMessage("BOOST!");
    window.setTimeout(() => setMessage(""), 420);
  }, [paused, power, started]);

  const actionB = useCallback(() => {
    if (!power || !started || paused) return;
    const now = performance.now();
    pulseUntil.current = now + 320;
    enemies.current = enemies.current.filter((enemy) => {
      const distance = Math.hypot(enemy.x - player.current.x, enemy.y - player.current.y);
      if (distance < 58) {
        scoreRef.current += 50;
        setScore(scoreRef.current);
        return false;
      }
      return true;
    });
  }, [paused, power, started]);

  const pressDirection = (direction: Direction, active: boolean) => {
    keys.current[direction] = active;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        w: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      };
      if (map[event.key]) {
        event.preventDefault();
        keys.current[map[event.key]] = true;
      }
      if (event.key === "z" || event.key === "j") actionA();
      if (event.key === "x" || event.key === "k") actionB();
      if (event.key === "Enter") startGame();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        w: "up",
        ArrowDown: "down",
        s: "down",
        ArrowLeft: "left",
        a: "left",
        ArrowRight: "right",
        d: "right",
      };
      if (map[event.key]) keys.current[map[event.key]] = false;
    };
    const releaseAll = () => {
      keys.current = {};
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", releaseAll);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", releaseAll);
      window.removeEventListener("blur", releaseAll);
    };
  }, [actionA, actionB, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let frame = 0;

    const drawText = (text: string, x: number, y: number, align: CanvasTextAlign = "left") => {
      ctx.textAlign = align;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = "#29265f";
      ctx.fillText(text, x + 1, y + 1);
      ctx.fillStyle = "#fff8d6";
      ctx.fillText(text, x, y);
    };

    const drawCloud = (x: number, y: number) => {
      ctx.fillStyle = "#fff8d6";
      ctx.fillRect(x, y + 6, 34, 7);
      ctx.fillRect(x + 7, y, 13, 13);
      ctx.fillRect(x + 20, y + 3, 8, 10);
    };

    const drawGem = (x: number, y: number, t: number) => {
      const bob = Math.sin(t / 230 + x) * 2;
      ctx.fillStyle = "#6a3dcc";
      ctx.fillRect(x - 5, y - 7 + bob, 10, 12);
      ctx.fillStyle = "#ff63b8";
      ctx.fillRect(x - 3, y - 9 + bob, 6, 14);
      ctx.fillStyle = "#fff8d6";
      ctx.fillRect(x - 1, y - 7 + bob, 2, 4);
    };

    const drawPlayer = (t: number) => {
      const p = player.current;
      const step = Math.floor(t / 130) % 2;
      ctx.fillStyle = "rgba(33,30,76,.2)";
      ctx.fillRect(p.x - 8, p.y + 8, 18, 4);
      ctx.fillStyle = "#29265f";
      ctx.fillRect(p.x - 7, p.y - 10, 15, 17);
      ctx.fillStyle = "#ffca73";
      ctx.fillRect(p.x - 5, p.y - 14, 11, 9);
      ctx.fillStyle = "#ff4d78";
      ctx.fillRect(p.x - 7, p.y - 15, 13, 4);
      ctx.fillRect(p.x + (p.direction === "left" ? -10 : 5), p.y - 13, 5, 3);
      ctx.fillStyle = "#29265f";
      ctx.fillRect(p.x + (p.direction === "left" ? -3 : 3), p.y - 10, 2, 2);
      ctx.fillStyle = "#fff8d6";
      ctx.fillRect(p.x - 5, p.y - 6, 11, 7);
      ctx.fillStyle = "#ff4d78";
      ctx.fillRect(p.x - 6, p.y + 1, 4, 8 - step * 2);
      ctx.fillRect(p.x + 4, p.y + 1, 4, 6 + step * 2);
    };

    const drawEnemy = (enemy: Point, t: number) => {
      const bob = Math.floor(Math.sin(t / 220 + enemy.x) * 2);
      ctx.fillStyle = "#29265f";
      ctx.fillRect(enemy.x - 8, enemy.y - 8 + bob, 16, 13);
      ctx.fillStyle = "#8b64d6";
      ctx.fillRect(enemy.x - 6, enemy.y - 10 + bob, 12, 13);
      ctx.fillStyle = "#fff8d6";
      ctx.fillRect(enemy.x - 4, enemy.y - 5 + bob, 3, 3);
      ctx.fillRect(enemy.x + 2, enemy.y - 5 + bob, 3, 3);
      ctx.fillStyle = "#29265f";
      ctx.fillRect(enemy.x - 3, enemy.y - 4 + bob, 1, 1);
      ctx.fillRect(enemy.x + 3, enemy.y - 4 + bob, 1, 1);
    };

    const render = (time: number) => {
      const dt = Math.min((time - lastTime.current) / 16.67 || 1, 2);
      lastTime.current = time;
      const palette = COLORS[world];

      ctx.fillStyle = "#17203b";
      ctx.fillRect(0, 0, W, H);

      if (!power) {
        ctx.fillStyle = "#111622";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#252d3a";
        ctx.fillRect(158, 108, 4, 4);
        frame = requestAnimationFrame(render);
        return;
      }

      if (started && !paused && heartsRef.current > 0) {
        const p = player.current;
        const speed = time < dashUntil.current ? 4.4 : 2.15;
        let dx = 0;
        let dy = 0;
        if (keys.current.left) dx--;
        if (keys.current.right) dx++;
        if (keys.current.up) dy--;
        if (keys.current.down) dy++;
        if (dx && dy) {
          dx *= 0.707;
          dy *= 0.707;
        }
        p.x = clamp(p.x + dx * speed * dt, 14, W - 14);
        p.y = clamp(p.y + dy * speed * dt, 66, H - 16);
        if (dx < 0) p.direction = "left";
        if (dx > 0) p.direction = "right";

        pickups.current = pickups.current.filter((gem) => {
          if (Math.hypot(gem.x - p.x, gem.y - p.y) < 16) {
            scoreRef.current += 100;
            setScore(scoreRef.current);
            return false;
          }
          return true;
        });
        if (pickups.current.length === 0) {
          pickups.current = Array.from({ length: 5 }, randomPickup);
          enemies.current.push(randomPickup());
          setMessage("WAVE CLEAR!");
          window.setTimeout(() => setMessage(""), 700);
        }

        enemies.current.forEach((enemy, index) => {
          const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
          enemy.x += Math.cos(angle) * (0.28 + index * 0.03) * dt;
          enemy.y += Math.sin(angle) * (0.28 + index * 0.03) * dt;
          if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < 14 && time > invincibleUntil.current) {
            heartsRef.current -= 1;
            setHearts(heartsRef.current);
            invincibleUntil.current = time + 1300;
            p.x = 55;
            p.y = 168;
            if (heartsRef.current <= 0) setMessage("GAME OVER");
          }
        });
      }

      ctx.fillStyle = palette.sky;
      ctx.fillRect(0, 0, W, H);
      drawCloud(30, 44);
      drawCloud(228, 58);
      ctx.fillStyle = palette.far;
      ctx.fillRect(0, 104, W, 116);
      for (let x = -20; x < W; x += 58) {
        ctx.fillRect(x, 86 + ((x / 58) % 2) * 7, 42, 28);
        ctx.fillRect(x + 9, 78 + ((x / 58) % 2) * 7, 22, 16);
      }
      ctx.fillStyle = palette.hill;
      for (let x = -14; x < W; x += 46) {
        ctx.fillRect(x, 133, 38, 87);
        ctx.fillRect(x + 7, 122, 24, 98);
        ctx.fillRect(x + 13, 115, 12, 105);
      }
      ctx.fillStyle = palette.ground;
      ctx.fillRect(0, 150, W, 70);
      ctx.fillStyle = "#514a87";
      for (let x = 8; x < W; x += 30) ctx.fillRect(x, 162 + ((x / 30) % 3) * 15, 4, 4);

      pickups.current.forEach((gem) => drawGem(gem.x, gem.y, time));
      enemies.current.forEach((enemy) => drawEnemy(enemy, time));
      if (time > invincibleUntil.current || Math.floor(time / 90) % 2 === 0) drawPlayer(time);

      if (time < pulseUntil.current) {
        const radius = 58 * (1 - (pulseUntil.current - time) / 320);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.current.x, player.current.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(34,31,77,.86)";
      ctx.fillRect(0, 0, W, 29);
      drawText(`SCORE ${String(scoreRef.current).padStart(5, "0")}`, 10, 19);
      drawText(
        `LIFE ${"■".repeat(heartsRef.current)}${"□".repeat(3 - heartsRef.current)}`,
        310,
        19,
        "right",
      );

      if (!started || paused || heartsRef.current <= 0) {
        ctx.fillStyle = "rgba(25,24,57,.72)";
        ctx.fillRect(42, 78, 236, 70);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(46, 82, 228, 62);
        const title = heartsRef.current <= 0 ? "GAME OVER" : paused ? "PAUSED" : "CRYSTAL RUN";
        drawText(title, 160, 104, "center");
        drawText(
          heartsRef.current <= 0 ? "START TO RETRY" : !started ? "PRESS START" : "PRESS START",
          160,
          130,
          "center",
        );
      } else if (message) {
        drawText(message, 160, 48, "center");
      }

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [message, paused, power, started, world]);

  return (
    <main className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <section className="intro">
        <div className="eyebrow">
          <span /> POCKET ARCADE / 001
        </div>
        <h1>
          PIXEL
          <br />
          <em>PLAY.</em>
        </h1>
        <p>Collect the crystals. Dodge the shadow bits. Keep your high score alive.</p>
        <div className="key-guide" aria-label="Keyboard controls">
          <span>
            <kbd>WASD</kbd> MOVE
          </span>
          <span>
            <kbd>Z</kbd> BOOST
          </span>
          <span>
            <kbd>X</kbd> PULSE
          </span>
        </div>
      </section>

      <section className="console-wrap" aria-label="Pocket Arcade handheld game console">
        <div className="console-shadow" />
        <div className="console">
          <div className="top-details" aria-hidden="true">
            <span />
            <i />
            <i />
            <i />
            <b />
          </div>
          <div className="screen-bezel">
            <div className="screen-labels">
              <span>DOT MATRIX</span>
              <span>STEREO COLOR</span>
            </div>
            <div className="screen">
              <canvas ref={canvasRef} width={W} height={H} aria-label="Crystal Run game screen" />
              {/* Add any custom HTML for the game screen inside this layer. */}
              <div className="screen-html-layer">
                <div className="html-layer-tools">
                  <span>HTML LAYER</span>
                  <button
                    type="button"
                    onClick={addScreenBlock}
                    disabled={screenBlocks.length >= 6}
                  >
                    + ADD
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreenBlocks([])}
                    disabled={!screenBlocks.length}
                  >
                    CLEAR
                  </button>
                </div>
                <div className="custom-screen-content">
                  {screenBlocks.map((block, index) => (
                    <button
                      type="button"
                      className={`screen-html-item block-${index + 1}`}
                      key={block}
                      onClick={() =>
                        setScreenBlocks((blocks) => blocks.filter((item) => item !== block))
                      }
                      aria-label={`Remove HTML item ${block}`}
                    >
                      <i />
                      <b>ITEM {block}</b>
                      <small>CLICK TO REMOVE</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="screen-glare" aria-hidden="true" />
            </div>
            <div className="screen-footer">
              <span className={power ? "power-light on" : "power-light"} />
              <span>POWER</span>
              <b>CRYSTAL RUN</b>
            </div>
          </div>

          <div className="brand-row">
            <div>
              <strong>PIXBOY</strong>
              <span>COLOR</span>
            </div>
            <small>PB-01</small>
          </div>

          <div className="controls">
            <div className="dpad" aria-label="Directional pad">
              <button
                className="d-up"
                aria-label="Move up"
                onPointerDown={() => pressDirection("up", true)}
                onPointerLeave={() => pressDirection("up", false)}
              />
              <button
                className="d-left"
                aria-label="Move left"
                onPointerDown={() => pressDirection("left", true)}
                onPointerLeave={() => pressDirection("left", false)}
              />
              <div className="d-center" />
              <button
                className="d-right"
                aria-label="Move right"
                onPointerDown={() => pressDirection("right", true)}
                onPointerLeave={() => pressDirection("right", false)}
              />
              <button
                className="d-down"
                aria-label="Move down"
                onPointerDown={() => pressDirection("down", true)}
                onPointerLeave={() => pressDirection("down", false)}
              />
            </div>

            <div className="action-cluster">
              <div>
                <button className="action b" onClick={actionB}>
                  B
                </button>
                <span>PULSE</span>
              </div>
              <div>
                <button className="action a" onClick={actionA}>
                  A
                </button>
                <span>BOOST</span>
              </div>
            </div>
          </div>

          <div className="utility">
            <div className="utility-button">
              <button
                onClick={() => setWorld((value) => (value + 1) % COLORS.length)}
                aria-label="Change game color world"
              />
              <span>SELECT</span>
            </div>
            <div className="utility-button">
              <button onClick={startGame} aria-label="Start or pause game" />
              <span>START</span>
            </div>
          </div>

          <div className="console-bottom">
            <button
              className="power-switch"
              onClick={() => {
                setPower((value) => !value);
                setPaused(false);
              }}
              aria-label={power ? "Turn console off" : "Turn console on"}
              aria-pressed={power}
            >
              <span />
            </button>
            <div className="speaker" aria-label="Speaker">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <aside className="score-card">
        <span>NOW PLAYING</span>
        <strong>CRYSTAL RUN</strong>
        <div>
          <b>{String(score).padStart(5, "0")}</b>
          <small>LIVE SCORE</small>
        </div>
        <p>{hearts > 0 ? "Adventure mode" : "Run complete"}</p>
      </aside>
    </main>
  );
}
