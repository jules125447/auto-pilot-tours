import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import tiloMascot from "@/assets/tilo-mascot.png";

export type TiloMood = "idle" | "happy" | "angry" | "surprised" | "calm" | "funny" | "amazed";

interface TiloCompanionProps {
  visible: boolean;
  speaking: boolean;
  message: string | null;
  lookDirection?: -1 | 0 | 1;
  onClose: () => void;
  mood?: TiloMood;
  holding?: boolean;
  throwing?: boolean;
  reaching?: boolean;
  lookingDown?: boolean;
  dancing?: boolean;
}

/**
 * Tilo — Fox mascot (single sprite) with expressive overlays for moods,
 * blink, eye glow, mouth expressions, and arm/dance motions.
 *
 * The mascot image is 1024x1024. The fox face occupies roughly:
 *   - eyes: top ~30%, left eye centered ~38%, right eye ~52%, height ~5%
 *   - mouth: top ~44%, centered ~46%, width ~10%
 *   - brows: top ~27%
 */
const TiloCompanion = ({
  visible,
  speaking,
  message,
  mood = "idle",
  dancing = false,
}: TiloCompanionProps) => {
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

  // Display size of the whole mascot
  const W = 160;
  const H = 160;

  // Approx fox face anchors on the 1024 mascot canvas (as % of mascot bbox)
  const FACE = {
    leftEye:  { x: 36, y: 30, w: 6,  h: 4 },
    rightEye: { x: 51, y: 30, w: 6,  h: 4 },
    mouth:    { x: 41, y: 42, w: 12, h: 5 },
    leftBrow: { x: 33, y: 26, w: 10, h: 3 },
    rightBrow:{ x: 50, y: 26, w: 10, h: 3 },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 140, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{
            x: -320,
            y: 20,
            opacity: 0,
            scale: 0.8,
            rotate: -10,
            transition: { duration: 1.6, ease: "easeInOut" },
          }}
          transition={{ type: "spring", damping: 22, stiffness: 180 }}
          className="absolute left-3 z-[1002] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 230px)" }}
        >
          <div className="flex items-end gap-2 pointer-events-auto">
            {/* Whole mascot — bobs + dances */}
            <motion.div
              animate={
                dancing
                  ? { y: [0, -12, 0, -8, 0], rotate: [-5, 5, -5, 5, -5] }
                  : speaking
                  ? { y: [0, -5, 0, -3, 0], rotate: [-1.5, 1.5, -1.5] }
                  : { y: [0, -3, 0], rotate: [-1, 1, -1] }
              }
              transition={{
                duration: dancing ? 0.5 : speaking ? 0.8 : 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
              style={{ width: W, height: H }}
            >
              {/* Glow halo — color shifts with mood */}
              <motion.div
                animate={{
                  opacity: speaking ? [0.55, 0.95, 0.55] : [0.35, 0.55, 0.35],
                }}
                transition={{ duration: speaking ? 0.7 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-3 rounded-full blur-2xl pointer-events-none"
                style={{
                  background:
                    mood === "happy"
                      ? "radial-gradient(circle, hsl(140 80% 55% / 0.55), hsl(140 70% 45% / 0.12) 60%, transparent 80%)"
                      : mood === "angry"
                      ? "radial-gradient(circle, hsl(0 90% 55% / 0.65), hsl(15 80% 45% / 0.18) 60%, transparent 80%)"
                      : mood === "surprised" || mood === "amazed"
                      ? "radial-gradient(circle, hsl(45 100% 60% / 0.6), hsl(25 90% 50% / 0.15) 60%, transparent 80%)"
                      : "radial-gradient(circle, hsl(25 95% 55% / 0.55), hsl(15 85% 50% / 0.13) 60%, transparent 80%)",
                }}
              />

              {/* Shadow under feet */}
              <motion.div
                animate={{
                  scaleX: speaking ? [1, 0.85, 1] : [1, 0.94, 1],
                  opacity: [0.35, 0.22, 0.35],
                }}
                transition={{ duration: speaking ? 0.7 : 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-20 h-2 rounded-full bg-black/40 blur-md"
              />

              {/* MASCOT base image */}
              <img
                src={tiloMascot}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{ filter: "drop-shadow(0 8px 12px rgba(180,80,30,0.35))" }}
              />

              {/* Eye glow overlay (additive over painted eyes) */}
              {!blink && (mood === "happy" || mood === "angry" || mood === "amazed" || speaking) && (
                <>
                  <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: `${FACE.leftEye.x}%`,
                      top: `${FACE.leftEye.y}%`,
                      width: `${FACE.leftEye.w}%`,
                      height: `${FACE.leftEye.h}%`,
                      background:
                        mood === "angry"
                          ? "radial-gradient(circle, hsl(0 100% 60% / 0.7), transparent 70%)"
                          : mood === "happy"
                          ? "radial-gradient(circle, hsl(140 90% 65% / 0.55), transparent 70%)"
                          : "radial-gradient(circle, hsl(35 100% 65% / 0.5), transparent 70%)",
                      filter: "blur(2px)",
                    }}
                    animate={{ opacity: speaking ? [0.6, 1, 0.6] : [0.4, 0.8, 0.4] }}
                    transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: `${FACE.rightEye.x}%`,
                      top: `${FACE.rightEye.y}%`,
                      width: `${FACE.rightEye.w}%`,
                      height: `${FACE.rightEye.h}%`,
                      background:
                        mood === "angry"
                          ? "radial-gradient(circle, hsl(0 100% 60% / 0.7), transparent 70%)"
                          : mood === "happy"
                          ? "radial-gradient(circle, hsl(140 90% 65% / 0.55), transparent 70%)"
                          : "radial-gradient(circle, hsl(35 100% 65% / 0.5), transparent 70%)",
                      filter: "blur(2px)",
                    }}
                    animate={{ opacity: speaking ? [0.6, 1, 0.6] : [0.4, 0.8, 0.4] }}
                    transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}

              {/* Blink — dark bands over both eyes */}
              {blink && (
                <>
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.leftEye.x}%`,
                      top: `${FACE.leftEye.y + 1}%`,
                      width: `${FACE.leftEye.w}%`,
                      height: `${FACE.leftEye.h * 0.6}%`,
                      background: "hsl(25 60% 25%)",
                      borderRadius: "50%",
                    }}
                  />
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.rightEye.x}%`,
                      top: `${FACE.rightEye.y + 1}%`,
                      width: `${FACE.rightEye.w}%`,
                      height: `${FACE.rightEye.h * 0.6}%`,
                      background: "hsl(25 60% 25%)",
                      borderRadius: "50%",
                    }}
                  />
                </>
              )}

              {/* Mood mouth overlay */}
              {mood !== "idle" && (
                <svg
                  viewBox="0 0 100 40"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${FACE.mouth.x}%`,
                    top: `${FACE.mouth.y}%`,
                    width: `${FACE.mouth.w}%`,
                    height: `${FACE.mouth.h}%`,
                  }}
                >
                  {mood === "happy" || mood === "amazed" ? (
                    <path d="M10 10 Q 50 38 90 10" fill="none" stroke="hsl(0 0% 12%)" strokeWidth="6" strokeLinecap="round" />
                  ) : mood === "funny" ? (
                    <>
                      <path d="M8 10 Q 50 40 92 10" fill="hsl(0 70% 30%)" stroke="hsl(0 0% 12%)" strokeWidth="4" strokeLinecap="round" />
                      <path d="M22 22 Q 50 34 78 22" fill="hsl(0 0% 100%)" stroke="none" />
                    </>
                  ) : mood === "surprised" ? (
                    <ellipse cx="50" cy="22" rx="10" ry="14" fill="hsl(220 25% 12%)" stroke="hsl(0 0% 12%)" strokeWidth="3" />
                  ) : mood === "calm" ? (
                    <path d="M20 18 Q 50 26 80 18" fill="none" stroke="hsl(0 0% 12%)" strokeWidth="5" strokeLinecap="round" />
                  ) : (
                    <path d="M10 30 Q 50 0 90 30" fill="none" stroke="hsl(0 80% 35%)" strokeWidth="6" strokeLinecap="round" />
                  )}
                </svg>
              )}

              {/* Surprised / amazed → raised eyebrows */}
              {(mood === "surprised" || mood === "amazed") && (
                <>
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.leftBrow.x}%`,
                      top: `${FACE.leftBrow.y - 2}%`,
                      width: `${FACE.leftBrow.w}%`,
                      height: `${FACE.leftBrow.h}%`,
                    }}
                  >
                    <path d="M5 18 Q 50 2 95 18" stroke="hsl(20 60% 18%)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.rightBrow.x}%`,
                      top: `${FACE.rightBrow.y - 2}%`,
                      width: `${FACE.rightBrow.w}%`,
                      height: `${FACE.rightBrow.h}%`,
                    }}
                  >
                    <path d="M5 18 Q 50 2 95 18" stroke="hsl(20 60% 18%)" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                </>
              )}

              {/* Funny → blush cheeks */}
              {mood === "funny" && (
                <>
                  <div className="absolute rounded-full pointer-events-none" style={{ left: "32%", top: "37%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.6)", filter: "blur(2px)" }} />
                  <div className="absolute rounded-full pointer-events-none" style={{ left: "57%", top: "37%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.6)", filter: "blur(2px)" }} />
                </>
              )}

              {/* Angry brows */}
              {mood === "angry" && (
                <>
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.leftBrow.x}%`,
                      top: `${FACE.leftBrow.y}%`,
                      width: `${FACE.leftBrow.w}%`,
                      height: `${FACE.leftBrow.h}%`,
                    }}
                  >
                    <path d="M5 4 L 95 18" stroke="hsl(0 85% 30%)" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{
                      left: `${FACE.rightBrow.x}%`,
                      top: `${FACE.rightBrow.y}%`,
                      width: `${FACE.rightBrow.w}%`,
                      height: `${FACE.rightBrow.h}%`,
                    }}
                  >
                    <path d="M5 18 L 95 4" stroke="hsl(0 85% 30%)" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                </>
              )}

              {/* BOOMBOX — appears next to Tilo while dancing */}
              <AnimatePresence>
                {dancing && (
                  <motion.div
                    initial={{ x: -60, y: 20, opacity: 0, rotate: -20 }}
                    animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    exit={{ x: -60, y: 30, opacity: 0, rotate: -20, transition: { duration: 0.8 } }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
                    className="absolute pointer-events-none"
                    style={{ left: "-32%", top: "48%", width: "55%" }}
                  >
                    <motion.div
                      animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg viewBox="0 0 120 80" className="w-full h-auto drop-shadow-lg">
                        <rect x="4" y="14" width="112" height="60" rx="8" fill="hsl(220 25% 18%)" stroke="hsl(25 95% 55%)" strokeWidth="2.5" />
                        <path d="M30 14 Q 60 -4 90 14" stroke="hsl(25 95% 55%)" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <circle cx="28" cy="46" r="16" fill="hsl(25 90% 50%)" />
                        <circle cx="28" cy="46" r="9" fill="hsl(220 25% 10%)" />
                        <circle cx="28" cy="46" r="4" fill="hsl(35 95% 65%)" />
                        <circle cx="92" cy="46" r="16" fill="hsl(25 90% 50%)" />
                        <circle cx="92" cy="46" r="9" fill="hsl(220 25% 10%)" />
                        <circle cx="92" cy="46" r="4" fill="hsl(35 95% 65%)" />
                        <rect x="48" y="28" width="24" height="10" rx="2" fill="hsl(140 80% 55%)" />
                        <circle cx="54" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                        <circle cx="60" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                        <circle cx="66" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                      </svg>
                    </motion.div>

                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute text-2xl"
                        style={{ left: `${20 + i * 25}%`, top: -10 }}
                        animate={{ y: [-5, -40, -70], opacity: [0, 1, 0], rotate: [0, 15, -15] }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          delay: i * 0.7,
                          ease: "easeOut",
                        }}
                      >
                        ♪
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
