import { motion, AnimatePresence } from "framer-motion";

export type SpeedBubbleStunt = "idle" | "grabbed" | "returning" | "thrown";

interface SpeedBubbleProps {
  speed: number | null;
  speedLimit?: number | null;
  /** Stunt state: animates the bubble to/from Tilo's hand. */
  stunt?: SpeedBubbleStunt;
}

const SpeedBubble = ({ speed, speedLimit = null, stunt = "idle" }: SpeedBubbleProps) => {
  const displaySpeed = speed !== null && speed >= 0 ? Math.round(speed) : 0;
  const over = speedLimit !== null && displaySpeed > speedLimit;

  // Target offsets (approximate — Tilo sits just above, left arm phone area)
  const HAND_X = -4;
  const HAND_Y = -160;

  const variants = {
    idle: {
      x: 0,
      y: 0,
      z: 0,
      rotate: 0,
      rotateY: 0,
      rotateX: 0,
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, damping: 18, stiffness: 220 },
    },
    grabbed: {
      // Cinematic 3 act sequence:
      //  Act 1 (0 -> 0.22): "Magnetic call" — bubble wobbles, levitates a bit, anticipates
      //  Act 2 (0.22 -> 0.78): graceful arc up into Tilo's palm with a full 3D spin
      //  Act 3 (0.78 -> 1): soft landing + tiny bounce + settle in the hand
      x: [0, 2, -2, 0, -4, -10, HAND_X - 6, HAND_X + 2, HAND_X],
      y: [0, -4, -2, -8, -40, -110, HAND_Y + 14, HAND_Y - 4, HAND_Y],
      z: [0, 10, 10, 20, 60, 110, 50, 30, 30],
      rotateY: [0, -15, 15, 0, 90, 270, 360, 360, 360],
      rotateX: [0, 5, -5, 0, -20, -30, -8, -2, 0],
      rotate: [0, -3, 3, 0, -6, -12, -8, -5, -6],
      scale: [1, 1.04, 1.04, 1.08, 1.16, 1.26, 1.1, 1.04, 1.05],
      opacity: 1,
      transition: {
        duration: 3.6,
        ease: "easeInOut" as const,
        times: [0, 0.06, 0.12, 0.2, 0.32, 0.58, 0.82, 0.92, 1],
      },
    },
    returning: {
      // Gently placed back down with a soft kiss-to-ground bounce
      x: [HAND_X, HAND_X - 4, -4, 1, 0],
      y: [HAND_Y, HAND_Y + 40, -30, 4, 0],
      z: [30, 30, 12, 0, 0],
      rotateY: [360, 270, 180, 20, 0],
      rotateX: [0, 10, 5, -2, 0],
      rotate: [-6, -3, -1, 1, 0],
      scale: [1.05, 1.02, 1, 1.03, 1],
      opacity: 1,
      transition: {
        duration: 2.4,
        ease: "easeInOut" as const,
        times: [0, 0.35, 0.7, 0.88, 1],
      },
    },
    thrown: {
      // Hurled, spins, then snaps back
      x: [HAND_X, 120, 280, 200, 60, 0],
      y: [HAND_Y, HAND_Y - 100, -120, -40, 20, 0],
      z: [30, 120, 60, 20, 10, 0],
      rotate: [-6, 240, 540, 780, 900, 900],
      rotateY: [360, 540, 720, 540, 360, 0],
      scale: [1.05, 1.1, 0.95, 0.9, 0.95, 1],
      opacity: 1,
      transition: { duration: 2.4, ease: "easeInOut" as const, times: [0, 0.18, 0.45, 0.7, 0.88, 1] },
    },
  } as const;

  const stunting = stunt === "grabbed";

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
      animate={stunt}
      variants={variants as any}
      className="absolute left-3 z-[1002]"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)",
        perspective: 800,
        transformStyle: "preserve-3d",
      }}
    >
      <div className="relative" style={{ transformStyle: "preserve-3d" }}>
        {/* Magnetic aura — pulses outward while Tilo is reeling the dial in */}
        <AnimatePresence>
          {stunting && (
            <>
              {[0, 0.45, 0.9].map((delay) => (
                <motion.div
                  key={`ring-${delay}`}
                  className="absolute inset-0 rounded-full border-2 pointer-events-none"
                  style={{ borderColor: "hsl(25 95% 60% / 0.7)" }}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: [0.9, 2.2], opacity: [0.85, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.4,
                    delay,
                    repeat: 2,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* Sparkle particles trailing the bubble */}
              {[
                { left: "10%", top: "20%", d: 0 },
                { left: "80%", top: "15%", d: 0.2 },
                { left: "50%", top: "85%", d: 0.4 },
                { left: "20%", top: "75%", d: 0.6 },
                { left: "75%", top: "65%", d: 0.8 },
              ].map((p, i) => (
                <motion.div
                  key={`spark-${i}`}
                  className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                  style={{
                    left: p.left,
                    top: p.top,
                    background: "hsl(38 100% 70%)",
                    boxShadow: "0 0 8px hsl(35 100% 60%)",
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: [0, 1.2, 0],
                    opacity: [0, 1, 0],
                    y: [0, -30 - i * 8],
                    x: [0, (i % 2 === 0 ? -1 : 1) * (8 + i * 2)],
                  }}
                  transition={{
                    duration: 1.6,
                    delay: p.d,
                    repeat: Infinity,
                    repeatDelay: 0.3,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* Soft halo behind the bubble during flight */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, hsl(35 100% 65% / 0.55), hsl(20 90% 55% / 0.15) 60%, transparent 80%)",
                  filter: "blur(10px)",
                  transform: "scale(1.8)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0.7, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.4, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
              />
            </>
          )}
        </AnimatePresence>

        {speedLimit !== null && (
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-card border-[2.5px] border-destructive flex items-center justify-center shadow-card z-10">
            <span className="text-foreground text-xs font-extrabold leading-none">{speedLimit}</span>
          </div>
        )}

        <motion.div
          animate={
            stunting
              ? {
                  boxShadow: [
                    "0 0 0px hsl(35 100% 60% / 0)",
                    "0 0 30px hsl(35 100% 60% / 0.9)",
                    "0 0 18px hsl(35 100% 60% / 0.6)",
                  ],
                }
              : { boxShadow: "0 0 0px hsl(35 100% 60% / 0)" }
          }
          transition={{ duration: 1.2, repeat: stunting ? Infinity : 0, ease: "easeInOut" }}
          className={`relative w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center shadow-elevated border-2 ${
            over
              ? "bg-destructive border-destructive/60"
              : "bg-card/95 border-primary/25 backdrop-blur-xl"
          }`}
        >
          <span className={`text-[20px] font-extrabold leading-none tabular-nums ${
            over ? "text-white" : "text-foreground"
          }`}>
            {displaySpeed}
          </span>
          <span className={`text-[7px] font-bold leading-none mt-0.5 uppercase tracking-widest ${
            over ? "text-white/70" : "text-muted-foreground"
          }`}>
            km/h
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
