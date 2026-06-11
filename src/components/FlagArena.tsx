"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Team } from "@/lib/teams";

const CANVAS_SIZE = 400;
const CIRCLE_RADIUS = 130;
const FLAG_DRAW_SIZE = 36;
const REVEAL_FLAG_SIZE = 80;
const CENTER = CANVAS_SIZE / 2;
const ANGLE_LERP = 0.06; // how fast flags close gaps (0-1 per frame)
const RADIUS_LERP = 0.04; // how fast radius adjusts

function getPxRatio() {
  return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2;
}

type FlagSprite = {
  team: Team;
  img: HTMLImageElement;
  // Angle on the circle (radians)
  currentAngle: number;
  targetAngle: number;
  // Scatter position (for initial state)
  scatterX: number;
  scatterY: number;
  // Visual state
  alpha: number;
  scale: number;
  alive: boolean;
  dying: boolean;
};

function shuffleExcluding(teams: Team[], winner: Team): Team[] {
  const others = teams.filter((t) => t.code !== winner.code);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others;
}

function loadFlagImage(code: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `/flags/${code}.svg`;
  });
}

// Normalize angle difference to [-PI, PI] for shortest-path lerp
function angleLerp(current: number, target: number, t: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export function FlagArena({
  teams,
  winner,
  onRevealComplete,
}: {
  teams: Team[];
  winner: Team;
  onRevealComplete: () => void;
}) {
  const [buttonState, setButtonState] = useState<"visible" | "fading" | "hidden">("visible");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pxRatio = useRef(2);
  const spritesRef = useRef<FlagSprite[]>([]);
  const phaseRef = useRef<"scatter" | "forming" | "spinning" | "reveal">("scatter");
  const spinAngleRef = useRef(0);
  const speedRef = useRef(0);
  const rafRef = useRef(0);
  const blurRef = useRef(0);
  const winnerImgRef = useRef<HTMLImageElement | null>(null);
  const revealAlphaRef = useRef(0);
  const targetRadiusRef = useRef(CIRCLE_RADIUS);
  const currentRadiusRef = useRef(CIRCLE_RADIUS);
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; alpha: number; size: number }[]
  >([]);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  // Track forming animation progress
  const formingT = useRef(0);

  const eliminationOrder = useMemo(
    () => shuffleExcluding(teams, winner),
    [teams, winner]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const images = await Promise.all(teams.map((t) => loadFlagImage(t.code)));
      if (cancelled) return;

      winnerImgRef.current = images[teams.findIndex((t) => t.code === winner.code)];

      // Create sprites all stacked at center
      spritesRef.current = teams.map((team, i) => {
        const circleAngle = (i / teams.length) * Math.PI * 2;
        return {
          team,
          img: images[i],
          currentAngle: circleAngle,
          targetAngle: circleAngle,
          scatterX: CENTER,
          scatterY: CENTER,
          alpha: 1,
          scale: 1,
          alive: true,
          dying: false,
        };
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = getPxRatio();
      pxRatio.current = dpr;
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      function draw() {
        if (cancelled) return;
        const pr = pxRatio.current;
        ctx!.clearRect(0, 0, CANVAS_SIZE * pr, CANVAS_SIZE * pr);
        ctx!.save();
        ctx!.scale(pr, pr);

        const sprites = spritesRef.current;
        const phase = phaseRef.current;

        // Advance spin — scale angular speed by initial/current radius
        // so linear speed (px/frame) stays constant as the circle shrinks
        if (phase === "spinning") {
          const radiusScale = CIRCLE_RADIUS / Math.max(currentRadiusRef.current, 1);
          spinAngleRef.current += speedRef.current * radiusScale;
        }

        // Smoothly interpolate radius
        currentRadiusRef.current +=
          (targetRadiusRef.current - currentRadiusRef.current) * RADIUS_LERP;
        const radius = currentRadiusRef.current;

        // Update target angles for alive, non-dying sprites
        const activeSprites = sprites.filter((s) => s.alive && !s.dying);
        const activeCount = activeSprites.length;
        if (activeCount > 0 && phase === "spinning") {
          activeSprites.forEach((sprite, i) => {
            sprite.targetAngle = (i / activeCount) * Math.PI * 2 + spinAngleRef.current;
          });
        }

        // Update sprite states
        for (const sprite of sprites) {
          if (!sprite.alive) continue;
          if (sprite.dying) {
            sprite.alpha = Math.max(0, sprite.alpha - 0.04);
            if (sprite.alpha <= 0) {
              sprite.alive = false;
            }
            // Keep spinning at same effective speed
            if (phase === "spinning") {
              const radiusScale = CIRCLE_RADIUS / Math.max(currentRadiusRef.current, 1);
              sprite.currentAngle += speedRef.current * radiusScale;
            }
          } else if (phase === "spinning") {
            sprite.currentAngle = angleLerp(
              sprite.currentAngle,
              sprite.targetAngle,
              0.15
            );
          }
        }

        // Helper to compute sprite position
        function spritePos(sprite: FlagSprite) {
          if (phase === "scatter") {
            return { x: sprite.scatterX, y: sprite.scatterY };
          } else if (phase === "forming") {
            const ease = 1 - Math.pow(1 - Math.min(formingT.current, 1), 3);
            const cx = CENTER + Math.cos(sprite.currentAngle) * radius;
            const cy = CENTER + Math.sin(sprite.currentAngle) * radius;
            return {
              x: sprite.scatterX + (cx - sprite.scatterX) * ease,
              y: sprite.scatterY + (cy - sprite.scatterY) * ease,
            };
          } else {
            return {
              x: CENTER + Math.cos(sprite.currentAngle) * radius,
              y: CENTER + Math.sin(sprite.currentAngle) * radius,
            };
          }
        }

        // Global blur (for final reveal sequence)
        const globalBlur = blurRef.current > 0.01;

        // Pass 1: dying sprites (drawn first = behind), blurred and fading
        for (const sprite of sprites) {
          if (!sprite.alive || !sprite.dying) continue;
          const { x, y } = spritePos(sprite);
          const dyingBlur = (1 - sprite.alpha) * 6;
          ctx!.filter = globalBlur
            ? `blur(${blurRef.current * 10 + dyingBlur}px)`
            : `blur(${dyingBlur}px)`;
          ctx!.globalAlpha = sprite.alpha;
          ctx!.drawImage(
            sprite.img,
            x - FLAG_DRAW_SIZE / 2,
            y - FLAG_DRAW_SIZE / 2,
            FLAG_DRAW_SIZE,
            FLAG_DRAW_SIZE * 0.75
          );
        }

        // Pass 2: alive sprites (drawn on top)
        ctx!.filter = globalBlur ? `blur(${blurRef.current * 10}px)` : "none";
        for (const sprite of sprites) {
          if (!sprite.alive || sprite.dying) continue;
          const { x, y } = spritePos(sprite);
          ctx!.globalAlpha = sprite.alpha;
          ctx!.drawImage(
            sprite.img,
            x - FLAG_DRAW_SIZE / 2,
            y - FLAG_DRAW_SIZE / 2,
            FLAG_DRAW_SIZE,
            FLAG_DRAW_SIZE * 0.75
          );
        }

        ctx!.filter = "none";

        // Forming animation tick
        if (phase === "forming") {
          formingT.current += 0.025;
        }

        // Reveal
        if (phase === "reveal" && revealAlphaRef.current > 0) {
          ctx!.globalAlpha = revealAlphaRef.current;
          const wImg = winnerImgRef.current;
          if (wImg) {
            const size = REVEAL_FLAG_SIZE;
            ctx!.drawImage(
              wImg,
              CENTER - size / 2,
              CENTER - size / 2 - 20,
              size,
              size * 0.75
            );
          }

          ctx!.fillStyle = "#ffffff";
          ctx!.font = "bold 24px sans-serif";
          ctx!.textAlign = "center";
          ctx!.fillText(winner.name, CENTER, CENTER + REVEAL_FLAG_SIZE / 2);

          ctx!.fillStyle = "rgba(255,255,255,0.5)";
          ctx!.font = "14px sans-serif";
          ctx!.fillText(
            `FIFA Ranking: #${winner.fifaRanking}`,
            CENTER,
            CENTER + REVEAL_FLAG_SIZE / 2 + 24
          );

          // Particles
          for (const p of particlesRef.current) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha = Math.max(0, p.alpha - 0.015);
            p.vy += 0.1;
            if (p.alpha > 0) {
              ctx!.globalAlpha = p.alpha;
              ctx!.fillStyle = `hsl(${40 + Math.random() * 20}, 90%, 55%)`;
              ctx!.beginPath();
              ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx!.fill();
            }
          }
        }

        ctx!.globalAlpha = 1;
        ctx!.restore();
        rafRef.current = requestAnimationFrame(draw);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [teams, winner]);

  const handleDraw = useCallback(() => {
    setButtonState("fading");
    setTimeout(() => setButtonState("hidden"), 400);
    phaseRef.current = "forming";
    formingT.current = 0;

    // Set initial target radius
    const count = spritesRef.current.length;
    targetRadiusRef.current = Math.min(CIRCLE_RADIUS, Math.max(50, count * 10));
    currentRadiusRef.current = targetRadiusRef.current;

    setTimeout(() => {
      phaseRef.current = "spinning";
      speedRef.current = 0.04;

      let dropIndex = 0;
      const totalToDrop = eliminationOrder.length;

      function recalcRadius() {
        const aliveCount = spritesRef.current.filter(
          (s) => s.alive && !s.dying
        ).length;
        targetRadiusRef.current = Math.min(
          CIRCLE_RADIUS,
          Math.max(50, aliveCount * 10)
        );
      }

      function beginReveal() {
        // Speed up the spin
        speedRef.current = 0.08;
        // Brief fast spin, then blur and reveal
        setTimeout(() => {
          speedRef.current = 0.12;
          setTimeout(() => {
            const blurUp = () => {
              blurRef.current = Math.min(1, blurRef.current + 0.05);
              if (blurRef.current < 1) {
                requestAnimationFrame(blurUp);
              } else {
                spritesRef.current.forEach((s) => (s.alive = false));
                phaseRef.current = "reveal";

                const particles = [];
                for (let i = 0; i < 30; i++) {
                  const angle =
                    (i / 30) * Math.PI * 2 + Math.random() * 0.3;
                  particles.push({
                    x: CENTER,
                    y: CENTER,
                    vx: Math.cos(angle) * (2 + Math.random() * 3),
                    vy: Math.sin(angle) * (2 + Math.random() * 3) - 2,
                    alpha: 1,
                    size: 2 + Math.random() * 4,
                  });
                }
                particlesRef.current = particles;
                speedRef.current = 0;

                const fadeIn = () => {
                  revealAlphaRef.current = Math.min(
                    1,
                    revealAlphaRef.current + 0.04
                  );
                  blurRef.current = Math.max(0, blurRef.current - 0.05);
                  if (revealAlphaRef.current < 1) {
                    requestAnimationFrame(fadeIn);
                  } else {
                    setTimeout(() => onRevealCompleteRef.current(), 1500);
                  }
                };
                requestAnimationFrame(fadeIn);
              }
            };
            requestAnimationFrame(blurUp);
          }, 600);
        }, 800);
      }

      function scheduleNextDrop() {
        const aliveNonDying = totalToDrop - dropIndex;
        // +1 because winner is not in eliminationOrder
        const remainingVisible = aliveNonDying + 1;

        if (remainingVisible <= 2) {
          setTimeout(beginReveal, 1000);
          return;
        }

        // Mark one as dying (it fades out in place)
        const toDrop = eliminationOrder[dropIndex];
        const sprite = spritesRef.current.find(
          (s) => s.team.code === toDrop.code
        );
        if (sprite) {
          sprite.dying = true;
        }
        dropIndex++;
        recalcRadius();

        const newRemainingVisible = totalToDrop - dropIndex + 1;

        let delay: number;
        if (newRemainingVisible > 12) {
          delay = 300;
        } else if (newRemainingVisible > 7) {
          delay = 400;
        } else {
          delay = 500;
        }

        setTimeout(scheduleNextDrop, delay);
      }

      setTimeout(scheduleNextDrop, 1500);
    }, 900);
  }, [eliminationOrder]);

  return (
    <div style={{ position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE * 2}
        height={CANVAS_SIZE * 2}
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          display: "block",
          margin: "0 auto",
        }}
      />
      {buttonState !== "hidden" && (
        <button
          onClick={handleDraw}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--wc-coral)",
            color: "#fff",
            fontWeight: 600,
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            opacity: buttonState === "fading" ? 0 : 1,
            transition: "opacity 0.4s ease",
            zIndex: 1,
          }}
        >
          Draw!
        </button>
      )}
    </div>
  );
}
