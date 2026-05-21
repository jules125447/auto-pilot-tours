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
      rotate: 0,
      scale: 1,
      opacity: 1,
      transition: { type: "spring" as const, damping: 18, stiffness: 220 },
    },
    grabbed: {
      x: HAND_X,
      y: HAND_Y,
      rotate: [0, -12, -6],
      scale: [1, 1.08, 1],
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
    returning: {
      x: [HAND_X, HAND_X - 2, 0],
      y: [HAND_Y, HAND_Y + 40, 0],
      rotate: [-6, -3, 0],
      scale: [1, 1.02, 1],
      opacity: 1,
      transition: { duration: 1.1, ease: "easeInOut" as const },
    },
    thrown: {
      x: [HAND_X, 80, 240, 180, 0],
      y: [HAND_Y, HAND_Y - 60, -80, -30, 0],
      rotate: [0, 240, 540, 720, 720],
      scale: [1, 1.05, 1, 0.95, 1],
      opacity: 1,
      transition: { duration: 1.4, ease: "easeInOut" as const, times: [0, 0.2, 0.55, 0.8, 1] },
    },
  } as const;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
      animate={stunt}
      variants={variants as any}
      className="absolute left-3 z-[1002]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}
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
