import { motion } from "framer-motion";

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
      // 3D arc into Tilo's hand — slow, dramatic, then settles in palm
      x: [0, -2, -6, HAND_X, HAND_X],
      y: [0, -50, -110, HAND_Y, HAND_Y],
      z: [0, 60, 100, 40, 40],
      rotateY: [0, 120, 240, 360, 360],
      rotateX: [0, -15, -25, -5, 0],
      rotate: [0, -4, -10, -6, -6],
      scale: [1, 1.12, 1.22, 1.08, 1.05],
      opacity: 1,
      transition: { duration: 2.4, ease: "easeInOut" as const, times: [0, 0.3, 0.6, 0.85, 1] },
    },
    returning: {
      // Gently placed back down
      x: [HAND_X, HAND_X - 4, -2, 0],
      y: [HAND_Y, HAND_Y + 30, -20, 0],
      z: [40, 30, 10, 0],
      rotateY: [360, 270, 180, 0],
      rotateX: [0, 10, 5, 0],
      rotate: [-6, -3, -1, 0],
      scale: [1.05, 1.02, 1, 1],
      opacity: 1,
      transition: { duration: 2.2, ease: "easeInOut" as const, times: [0, 0.35, 0.75, 1] },
    },
    thrown: {
      // Hurled, spins, then snaps back
      x: [HAND_X, 120, 280, 200, 60, 0],
      y: [HAND_Y, HAND_Y - 100, -120, -40, 20, 0],
      z: [40, 120, 60, 20, 10, 0],
      rotate: [-6, 240, 540, 780, 900, 900],
      rotateY: [360, 540, 720, 540, 360, 0],
      scale: [1.05, 1.1, 0.95, 0.9, 0.95, 1],
      opacity: 1,
      transition: { duration: 2.4, ease: "easeInOut" as const, times: [0, 0.18, 0.45, 0.7, 0.88, 1] },
    },
  } as const;

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
      <div className="relative">
        {speedLimit !== null && (
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-card border-[2.5px] border-destructive flex items-center justify-center shadow-card z-10">
            <span className="text-foreground text-xs font-extrabold leading-none">{speedLimit}</span>
          </div>
        )}

        <div
          className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center shadow-elevated border-2 ${
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
        </div>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
