"use client";

import { motion } from "motion/react";

const PARTICLE_COUNT = 24;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + randomBetween(-0.3, 0.3);
  const distance = randomBetween(60, 140);
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    size: randomBetween(4, 10),
    delay: randomBetween(0, 0.15),
  };
});

export function ParticleBurst() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 0.8,
            delay: p.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `hsl(${40 + Math.random() * 20}, 90%, ${55 + Math.random() * 15}%)`,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
}
