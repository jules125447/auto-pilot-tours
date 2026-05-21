import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import tiloBody from "@/assets/tilo-body.png";
import tiloHead from "@/assets/tilo-head.png";
import tiloArmLeft from "@/assets/tilo-arm-left.png";
import tiloArmRight from "@/assets/tilo-arm-right.png";

interface TiloCompanionProps {
  visible: boolean;
  speaking: boolean;
  message: string | null;
  lookDirection?: -1 | 0 | 1;
  onClose: () => void;
}

/**
 * Tilo — mascot built from layered parts (body + head + arms).
 * Each part animates independently: head tilts/nods, arms swing, eyes blink/glow.
 */
const TiloCompanion = ({ visible, speaking, message }: TiloCompanionProps) => {
  // Blink loop
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t: number;
    const loop = () => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
      t = window.setTimeout(loop, 2200 + Math.random() * 2600);
    };
    t = window.setTimeout(loop, 1400);
    return () => window.clearTimeout(t);
  }, []);

  // Container is the full mascot bounding box. Parts are positioned in %.
  // Original mascot is 1066 x 992. Display size: 150 x 140 px.
  const W = 150;
  const H = 140;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 140, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 140, opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", damping: 20, stiffness: 220 }}
          className="absolute left-3 z-[1002] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 230px)" }}
        >
          <div className="flex items-end gap-2 pointer-events-auto">
            {/* Whole mascot — bobs */}
            <motion.div
              animate={{ y: speaking ? [0, -4, 0, -2, 0] : [0, -3, 0] }}
              transition={{
                duration: speaking ? 0.7 : 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
              style={{ width: W, height: H }}
            >
              {/* Glow halo */}
              <motion.div
                animate={{ opacity: speaking ? [0.55, 0.95, 0.55] : [0.35, 0.55, 0.35] }}
                transition={{ duration: speaking ? 0.7 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-3 rounded-full blur-2xl pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, hsl(25 95% 55% / 0.6), hsl(15 85% 50% / 0.15) 60%, transparent 80%)",
                }}
              />

              {/* Shadow under feet */}
              <motion.div
                animate={{
                  scaleX: speaking ? [1, 0.85, 1] : [1, 0.94, 1],
                  opacity: [0.35, 0.22, 0.35],
                }}
                transition={{ duration: speaking ? 0.7 : 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-16 h-2 rounded-full bg-black/40 blur-md"
              />

              {/* BODY (base layer) */}
              <img
                src={tiloBody}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{ filter: "drop-shadow(0 8px 12px rgba(180,80,30,0.35))" }}
              />

              {/* LEFT ARM (phone) — swings from shoulder */}
              <motion.img
                src={tiloArmLeft}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{
                  // crop was (150..380, 400..720) on 1066x992
                  left: `${(150 / 1066) * 100}%`,
                  top: `${(400 / 992) * 100}%`,
                  width: `${(230 / 1066) * 100}%`,
                  transformOrigin: "85% 5%", // near the shoulder (top-right of crop)
                }}
                animate={{
                  rotate: speaking ? [-2, 6, -3, 4, -2] : [-2, 3, -2],
                }}
                transition={{
                  duration: speaking ? 0.9 : 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* RIGHT ARM (flag) — waves */}
              <motion.img
                src={tiloArmRight}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{
                  // crop was (740..1010, 200..600) on 1066x992
                  left: `${(740 / 1066) * 100}%`,
                  top: `${(200 / 992) * 100}%`,
                  width: `${(270 / 1066) * 100}%`,
                  transformOrigin: "20% 95%", // shoulder (bottom-left of crop)
                }}
                animate={{
                  rotate: speaking ? [-4, 14, -6, 10, -4] : [-3, 8, -3],
                }}
                transition={{
                  duration: speaking ? 1 : 2.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* HEAD — tilts, with eye blink overlay */}
              <motion.div
                className="absolute"
                style={{
                  // crop was (260..790, 40..410) on 1066x992
                  left: `${(260 / 1066) * 100}%`,
                  top: `${(40 / 992) * 100}%`,
                  width: `${(530 / 1066) * 100}%`,
                  transformOrigin: "50% 92%", // neck pivot
                }}
                animate={{
                  rotate: speaking ? [-3, 4, -2, 3, -3] : [-2, 2, -2],
                  y: speaking ? [0, -1.5, 0, -1, 0] : [0, -1, 0],
                }}
                transition={{
                  duration: speaking ? 1.1 : 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img
                  src={tiloHead}
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none"
                />

                {/* Eyes — pulsing glow, hidden when blinking */}
                {!blink && (
                  <motion.div
                    className="absolute pointer-events-none"
                    style={{
                      left: "22%",
                      right: "22%",
                      top: "44%",
                      height: "16%",
                      background:
                        "radial-gradient(ellipse at 28% 50%, hsl(35 100% 65% / 0.55), transparent 40%), radial-gradient(ellipse at 72% 50%, hsl(35 100% 65% / 0.55), transparent 40%)",
                      filter: "blur(2px)",
                      borderRadius: "50%",
                    }}
                    animate={{ opacity: speaking ? [0.7, 1, 0.7] : [0.5, 0.85, 0.5] }}
                    transition={{
                      duration: speaking ? 0.6 : 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}

                {/* Blink — dark bands over eyes */}
                {blink && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: "22%",
                      right: "22%",
                      top: "47%",
                      height: "8%",
                      background: "hsl(220 25% 10%)",
                      borderRadius: "40%",
                    }}
                  />
                )}
              </motion.div>
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
