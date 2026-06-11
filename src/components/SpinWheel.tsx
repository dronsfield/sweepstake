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

// Segment colors that alternate
const SEGMENT_COLORS = [
  "rgba(0, 180, 216, 0.25)",
  "rgba(140, 82, 255, 0.25)",
  "rgba(255, 107, 107, 0.2)",
  "rgba(245, 166, 35, 0.2)",
];

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
}: {
  teams: Team[];
  winner: Team;
  onRevealComplete: () => void;
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
  const revealAlphaRef = useRef(0);
  const winnerImgRef = useRef<HTMLImageElement | null>(null);

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

          // Segment border
          ctx.beginPath();
          ctx.moveTo(CENTER, CENTER);
          ctx.arc(CENTER, CENTER, WHEEL_RADIUS, startAngle, endAngle);
          ctx.closePath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1;
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

        // Outer ring
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center hub
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, 20, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1a2e";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pointer (triangle at top, pointing down into wheel)
        ctx.beginPath();
        ctx.moveTo(CENTER, CENTER - WHEEL_RADIUS + 6);
        ctx.lineTo(CENTER - POINTER_SIZE * 0.6, CENTER - WHEEL_RADIUS - POINTER_SIZE);
        ctx.lineTo(CENTER + POINTER_SIZE * 0.6, CENTER - WHEEL_RADIUS - POINTER_SIZE);
        ctx.closePath();
        ctx.fillStyle = "var(--wc-coral, #ff6b6b)";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Winner reveal overlay
        if (revealAlphaRef.current > 0) {
          ctx.globalAlpha = revealAlphaRef.current;

          // Darken background
          ctx.beginPath();
          ctx.arc(CENTER, CENTER, WHEEL_RADIUS + 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(10, 10, 30, 0.85)";
          ctx.fill();

          // Winner flag
          const wImg = winnerImgRef.current;
          if (wImg) {
            const size = 80;
            ctx.drawImage(
              wImg,
              CENTER - size / 2,
              CENTER - size / 2 - 20,
              size,
              size * 0.75
            );
          }

          // Winner name
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(winner.name, CENTER, CENTER + 30);

          // Ranking
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "14px sans-serif";
          ctx.fillText(
            `FIFA Ranking: #${winner.fifaRanking}`,
            CENTER,
            CENTER + 54
          );

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
    // Land just inside the segment, near the trailing edge (looks like it barely made it)
    const offset = 0.85 + Math.random() * 0.1;
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
        // Landed — pause then reveal
        setTimeout(() => {
          setWinnerRevealed(true);
          function fadeIn() {
            revealAlphaRef.current = Math.min(1, revealAlphaRef.current + 0.04);
            if (revealAlphaRef.current < 1) {
              requestAnimationFrame(fadeIn);
            } else {
              setTimeout(() => onRevealCompleteRef.current(), 1500);
            }
          }
          requestAnimationFrame(fadeIn);
        }, 800);
      }
    }

    requestAnimationFrame(animate);
  }, [winnerIndex, segmentAngle]);

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
    </div>
  );
}
