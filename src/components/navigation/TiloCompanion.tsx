import { motion, AnimatePresence } from "framer-motion";
import tiloMascot from "@/assets/tilo-mascot.png";

interface TiloCompanionProps {
  visible: boolean;
  speaking: boolean;
  message: string | null;
  lookDirection?: -1 | 0 | 1;
  onClose: () => void;
}

/**
 * Tilo — mascot companion (PNG-based) animated with framer-motion.
 * Idle: gentle bobbing + slight sway. Speaking: faster bounce + bubble.
 */
const TiloCompanion = ({ visible, speaking, message }: TiloCompanionProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 140, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 140, opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", damping: 20, stiffness: 220 }}
          className="absolute left-3 z-[1002] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 240px)" }}
        >
          <div className="flex items-end gap-2 pointer-events-auto">
            {/* Mascot */}
            <motion.div
              animate={
                speaking
                  ? { y: [0, -6, 0, -3, 0], rotate: [0, -3, 3, -2, 0] }
                  : { y: [0, -4, 0], rotate: [0, 1.5, -1.5, 0] }
              }
              transition={{
                duration: speaking ? 0.7 : 3.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              {/* Glow halo */}
              <motion.div
                animate={{ opacity: speaking ? [0.5, 0.9, 0.5] : [0.35, 0.55, 0.35] }}
                transition={{ duration: speaking ? 0.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, hsl(25 95% 55% / 0.65), hsl(15 85% 50% / 0.15) 60%, transparent 80%)",
                }}
              />

              {/* Shadow under feet */}
              <motion.div
                animate={{ scaleX: speaking ? [1, 0.85, 1] : [1, 0.95, 1], opacity: [0.35, 0.25, 0.35] }}
                transition={{ duration: speaking ? 0.7 : 3.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-2 rounded-full bg-black/40 blur-md"
              />

              <motion.img
                src={tiloMascot}
                alt="Tilo"
                className="relative w-28 h-28 object-contain drop-shadow-[0_10px_18px_rgba(180,80,30,0.45)] select-none"
                draggable={false}
                animate={speaking ? { scale: [1, 1.04, 0.98, 1.03, 1] } : { scale: [1, 1.015, 1] }}
                transition={{
                  duration: speaking ? 0.5 : 3.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            {/* Speech bubble */}
            <AnimatePresence>
              {message && speaking && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.9 }}
                  transition={{ type: "spring", damping: 20, stiffness: 280 }}
                  className="relative max-w-[220px] mb-2"
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
