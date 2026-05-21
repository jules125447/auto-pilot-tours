import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface TiloCompanionProps {
  /** Visible on screen */
  visible: boolean;
  /** Currently speaking (drives mouth animation + speech bubble) */
  speaking: boolean;
  /** Latest line spoken — shown in a speech bubble */
  message: string | null;
  /** Where Tilo is looking (-1 left, 0 center, 1 right) */
  lookDirection?: -1 | 0 | 1;
  /** Hide button */
  onClose: () => void;
}

/**
 * Tilo — 2D animated companion that appears during a circuit.
 * Pure SVG + framer-motion for low overhead. Mouth opens while speaking.
 */
const TiloCompanion = ({ visible, speaking, message, lookDirection = 0, onClose }: TiloCompanionProps) => {
  // Blink loop
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: number;
    const loop = () => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
      t = window.setTimeout(loop, 2400 + Math.random() * 2600);
    };
    t = window.setTimeout(loop, 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Pupil offset based on look direction
  const pupilX = lookDirection * 1.8;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="absolute left-3 z-[1002] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 240px)" }}
        >
          <div className="flex items-end gap-2 pointer-events-auto">
            {/* Avatar */}
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background:
                    "radial-gradient(circle, hsl(25 90% 55% / 0.55), hsl(15 85% 50% / 0.15) 60%, transparent 80%)",
                }}
              />

              <motion.svg
                width="86"
                height="86"
                viewBox="0 0 100 100"
                className="relative drop-shadow-[0_8px_18px_rgba(180,80,30,0.35)]"
                animate={{ rotate: speaking ? [0, -1.5, 1.5, 0] : [0, 1, -1, 0] }}
                transition={{
                  duration: speaking ? 0.6 : 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <defs>
                  <radialGradient id="tilo-bg" cx="50%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="hsl(42 95% 70%)" />
                    <stop offset="100%" stopColor="hsl(15 85% 55%)" />
                  </radialGradient>
                  <linearGradient id="tilo-face" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(35 60% 88%)" />
                    <stop offset="100%" stopColor="hsl(25 55% 78%)" />
                  </linearGradient>
                </defs>

                {/* Background circle */}
                <circle cx="50" cy="50" r="48" fill="url(#tilo-bg)" />
                <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />

                {/* Hair top */}
                <path
                  d="M22,42 Q28,18 50,18 Q72,18 78,42 Q72,32 50,32 Q28,32 22,42 Z"
                  fill="hsl(20 55% 22%)"
                />

                {/* Face */}
                <ellipse cx="50" cy="55" rx="26" ry="28" fill="url(#tilo-face)" />

                {/* Ears */}
                <ellipse cx="24" cy="55" rx="3" ry="5" fill="hsl(25 55% 75%)" />
                <ellipse cx="76" cy="55" rx="3" ry="5" fill="hsl(25 55% 75%)" />

                {/* Eyebrows */}
                <motion.g
                  animate={{ y: speaking ? [0, -1.2, 0] : 0 }}
                  transition={{ duration: 0.5, repeat: speaking ? Infinity : 0 }}
                >
                  <path d="M37,46 Q41,43 45,46" stroke="hsl(20 55% 22%)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  <path d="M55,46 Q59,43 63,46" stroke="hsl(20 55% 22%)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </motion.g>

                {/* Eyes */}
                <g>
                  {/* whites */}
                  <ellipse cx="41" cy="52" rx="3.4" ry={blink ? 0.4 : 3.4} fill="white" />
                  <ellipse cx="59" cy="52" rx="3.4" ry={blink ? 0.4 : 3.4} fill="white" />
                  {/* pupils */}
                  {!blink && (
                    <>
                      <circle cx={41 + pupilX} cy={52} r="1.6" fill="hsl(220 30% 18%)" />
                      <circle cx={59 + pupilX} cy={52} r="1.6" fill="hsl(220 30% 18%)" />
                      <circle cx={41 + pupilX - 0.5} cy={51.3} r="0.5" fill="white" />
                      <circle cx={59 + pupilX - 0.5} cy={51.3} r="0.5" fill="white" />
                    </>
                  )}
                </g>

                {/* Cheeks */}
                <circle cx="36" cy="62" r="2.4" fill="hsl(15 85% 65% / 0.45)" />
                <circle cx="64" cy="62" r="2.4" fill="hsl(15 85% 65% / 0.45)" />

                {/* Mouth — animated when speaking */}
                <motion.g
                  animate={
                    speaking
                      ? { scaleY: [0.4, 1, 0.6, 1.1, 0.5], scaleX: [1, 0.95, 1, 0.92, 1] }
                      : { scaleY: 1, scaleX: 1 }
                  }
                  transition={{ duration: 0.45, repeat: speaking ? Infinity : 0, ease: "easeInOut" }}
                  style={{ transformOrigin: "50px 68px" }}
                >
                  {speaking ? (
                    <ellipse cx="50" cy="68" rx="5" ry="3.5" fill="hsl(0 60% 28%)" />
                  ) : (
                    <path
                      d="M44,66 Q50,71 56,66"
                      stroke="hsl(20 55% 22%)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </motion.g>

                {/* Tongue while speaking */}
                {speaking && (
                  <ellipse cx="50" cy="69.5" rx="2.2" ry="1.2" fill="hsl(0 70% 55%)" />
                )}
              </motion.svg>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card/95 backdrop-blur shadow-md border border-border flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Masquer le compagnon"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </motion.div>

            {/* Speech bubble */}
            <AnimatePresence>
              {message && speaking && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.9 }}
                  transition={{ type: "spring", damping: 20, stiffness: 280 }}
                  className="relative max-w-[220px] mb-1"
                >
                  <div
                    className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm shadow-elevated text-sm font-medium leading-snug text-foreground"
                    style={{
                      background: "linear-gradient(135deg, hsl(30 30% 99%), hsl(30 35% 95%))",
                      border: "1px solid hsl(25 35% 88%)",
                    }}
                  >
                    {message}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TiloCompanion;
