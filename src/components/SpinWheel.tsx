"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Team } from "@/lib/teams";

const CANVAS_SIZE = 380;
const CENTER = CANVAS_SIZE / 2;
const WHEEL_RADIUS = 160;
const FLAG_SIZE = 28;
const POINTER_SIZE = 18;

function loadFlagImage(code: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `/flags/${code}.svg`;
  });
}

// Football pitch greens
const SEGMENT_COLORS = ["#2e8b3a", "#256e2f"];

// Custom easing: fast start, very slow crawl at the end.
// Uses a high-power ease-out so the last ~30% of time covers only a few segments.
function easeOutSpin(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Build wheel segments: shuffle the team order once, then tile it to fill ~20 slots
function buildSegments(teams: Team[]): Team[] {
  const order = shuffle(teams);
  const repeats = teams.length <= 10 ? Math.floor(20 / teams.length) : 1;
  const segments: Team[] = [];
  for (let r = 0; r < repeats; r++) {
    for (const t of order) segments.push(t);
  }
  return segments;
}

export function SpinWheel({
  teams: teamsProp,
  winner,
  onRevealComplete,
  actionLabel,
  tier = "top",
}: {
  teams: Team[];
  winner: Team;
  onRevealComplete: () => void;
  actionLabel?: string;
  tier?: "top" | "bottom";
}) {
  const [teams] = useState(() => buildSegments(teamsProp));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const angleRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef(0);
  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  const [buttonState, setButtonState] = useState<"visible" | "fading" | "hidden">("visible");
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const revealAlphaRef = useRef(0);
  const revealTRef = useRef(0);
  const winnerImgRef = useRef<HTMLImageElement | null>(null);
  const particlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; alpha: number; size: number; hue: number }[]
  >([]);

  const segmentAngle = (Math.PI * 2) / teams.length;

  // Compute the target angle so the winner segment lands under the pointer (top)
  const [winnerIndex] = useState(() => {
    const indices = teams
      .map((t, i) => (t.code === winner.code ? i : -1))
      .filter((i) => i >= 0);
    return indices[Math.floor(Math.random() * indices.length)];
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const imgs = await Promise.all(teams.map((t) => loadFlagImage(t.code)));
      if (cancelled) return;

      const map = new Map<string, HTMLImageElement>();
      teams.forEach((t, i) => map.set(t.code, imgs[i]));
      imagesRef.current = map;
      winnerImgRef.current = map.get(winner.code) ?? null;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 2;
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      const ctx = canvas.getContext("2d")!;

      function draw() {
        if (cancelled) return;
        const pr = window.devicePixelRatio || 2;
        ctx.clearRect(0, 0, CANVAS_SIZE * pr, CANVAS_SIZE * pr);
        ctx.save();
        ctx.scale(pr, pr);

        const angle = angleRef.current;

        // Draw wheel segments
        for (let i = 0; i < teams.length; i++) {
          const startAngle = angle + i * segmentAngle - Math.PI / 2;
          const endAngle = startAngle + segmentAngle;

          // Segment fill
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.arc(CENTER, CENTER, WHEEL_RADIUS, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          ctx.fill();

          // Segment border — pitch markings
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.arc(CENTER, CENTER, WHEEL_RADIUS, startAngle, endAngle);
          ctx.closePath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Flag image at outer edge, rotated to align with segment
          const midAngle = startAngle + segmentAngle / 2;
          const flagDist = WHEEL_RADIUS - FLAG_SIZE / 2 - 6;
          const fx = CENTER + Math.cos(midAngle) * flagDist;
          const fy = CENTER + Math.sin(midAngle) * flagDist;
          const img = imagesRef.current.get(teams[i].code);
          if (img) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.drawImage(
              img,
              -FLAG_SIZE / 2,
              -FLAG_SIZE * 0.75 / 2,
              FLAG_SIZE,
              FLAG_SIZE * 0.75
            );
            ctx.restore();
          }
        }

        // Outer ring — thick pitch marking
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Center hub
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#1e5c26";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pointer (gold World Cup triangle) — fade out during reveal
        const pointerAlpha = 1 - revealAlphaRef.current;
        if (pointerAlpha > 0.01) {
          ctx.globalAlpha = pointerAlpha;
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER - WHEEL_RADIUS + 6);
          ctx.lineTo(CENTER - POINTER_SIZE * 0.6, CENTER - WHEEL_RADIUS - POINTER_SIZE);
          ctx.lineTo(CENTER + POINTER_SIZE * 0.6, CENTER - WHEEL_RADIUS - POINTER_SIZE);
          ctx.closePath();
          ctx.fillStyle = "#d4a844";
          ctx.fill();
          ctx.strokeStyle = "#f5c842";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Winner reveal overlay
        if (revealAlphaRef.current > 0) {
          revealTRef.current += 1 / 60;
          const rt = revealTRef.current;
          const alpha = revealAlphaRef.current;

          ctx.globalAlpha = alpha;

          // Darken background
          ctx.beginPath();
          ctx.arc(CENTER, CENTER, WHEEL_RADIUS + 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(10, 10, 30, 0.88)";
          ctx.fill();

          // Flag — bouncy scale entrance
          const revealY = CENTER - 45;
          const wImg = winnerImgRef.current;
          if (wImg) {
            const size = 80;
            const scaleT = Math.min(rt / 0.6, 1);
            const scale =
              scaleT < 1
                ? 1 - Math.pow(1 - scaleT, 3) * Math.cos(scaleT * Math.PI * 2.5) * (1 - scaleT)
                : 1;
            ctx.save();
            ctx.translate(CENTER, revealY);
            ctx.scale(scale, scale);
            ctx.drawImage(
              wImg,
              -size / 2,
              -size * 0.75 / 2,
              size,
              size * 0.75
            );
            ctx.restore();
          }

          // Winner name — slides up and fades in
          const nameT = Math.max(0, Math.min((rt - 0.3) / 0.5, 1));
          const nameEase = 1 - Math.pow(1 - nameT, 3);
          ctx.globalAlpha = alpha * nameEase;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(winner.name, CENTER, revealY + 55 + (1 - nameEase) * 15);

          // Ranking — slides up after name
          const rankT = Math.max(0, Math.min((rt - 0.6) / 0.5, 1));
          const rankEase = 1 - Math.pow(1 - rankT, 3);
          ctx.globalAlpha = alpha * rankEase;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "14px sans-serif";
          ctx.fillText(
            `FIFA Ranking: #${winner.fifaRanking}`,
            CENTER,
            revealY + 79 + (1 - rankEase) * 10
          );



          // Confetti particles
          ctx.globalAlpha = 1;
          for (const p of particlesRef.current) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12;
            p.vx *= 0.99;
            p.alpha = Math.max(0, p.alpha - 0.008);
            if (p.alpha > 0) {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = `hsl(${p.hue}, 85%, 55%)`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.globalAlpha = 1;
        }

        ctx.restore();
        rafRef.current = requestAnimationFrame(draw);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [teams, winner, segmentAngle]);

  const handleSpin = useCallback(() => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setButtonState("fading");
    setTimeout(() => setButtonState("hidden"), 400);

    // The draw code places segment i at:
    //   startAngle = angleRef + i * segmentAngle - PI/2
    // The pointer is at the top (-PI/2). For the winner's segment midpoint
    // to land under the pointer we need:
    //   finalAngle + winnerIndex * segmentAngle - PI/2 + segmentAngle/2 = -PI/2  (mod 2PI)
    //   finalAngle = -(winnerIndex + 0.5) * segmentAngle  (mod 2PI)
    // Top tier: land near the trailing edge (barely made it)
    // Bottom tier: land 50-70% through (mid-segment, less dramatic)
    const offset = tier === "bottom"
      ? 0.5 + Math.random() * 0.2
      : 0.85 + Math.random() * 0.1;
    const targetAngle = -((winnerIndex + offset) * segmentAngle);
    // Normalize current angle to [0, 2PI)
    const currentMod =
      ((angleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const targetMod =
      ((targetAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    // How far from current position to target (going forward / clockwise)
    const gap = ((targetMod - currentMod) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    // Add several full rotations for drama, plus the gap
    const fullRotations = Math.PI * 2 * (4 + Math.floor(Math.random() * 2));
    const totalRotation = fullRotations + gap;

    const startAngle = angleRef.current;
    const duration = 8000 + Math.random() * 2000;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutSpin(t);

      angleRef.current = startAngle + totalRotation * eased;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Landed — brief pause then reveal
        setTimeout(() => {
          setWinnerRevealed(true);
          revealTRef.current = 0;

          // Spawn confetti burst
          const confetti = [];
          const hues = [40, 43, 46, 50];
          for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + Math.random() * 0.4;
            const speed = 2.5 + Math.random() * 4;
            confetti.push({
              x: CENTER,
              y: CENTER,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 3,
              alpha: 1,
              size: 2 + Math.random() * 4,
              hue: hues[Math.floor(Math.random() * hues.length)],
            });
          }
          particlesRef.current = confetti;

          function fadeIn() {
            revealAlphaRef.current = Math.min(1, revealAlphaRef.current + 0.035);
            if (revealAlphaRef.current < 1) {
              requestAnimationFrame(fadeIn);
            } else if (actionLabel) {
              setTimeout(() => setShowAction(true), 800);
            } else {
              setTimeout(() => onRevealCompleteRef.current(), 2000);
            }
          }
          requestAnimationFrame(fadeIn);
        }, 200);
      }
    }

    requestAnimationFrame(animate);
  }, [winnerIndex, segmentAngle, actionLabel, tier]);

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
          onClick={handleSpin}
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
          Spin!
        </button>
      )}
      {showAction && actionLabel && (
        <button
          onClick={onRevealComplete}
          style={{
            position: "absolute",
            top: "62%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--wc-coral)",
            color: "#fff",
            fontWeight: 600,
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            zIndex: 1,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
