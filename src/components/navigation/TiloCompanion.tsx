import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import tiloBody from "@/assets/tilo-body.png";
import tiloHead from "@/assets/tilo-head.png";
import tiloArmLeft from "@/assets/tilo-arm-left.png";
import tiloArmRight from "@/assets/tilo-arm-right.png";

export type TiloMood = "idle" | "happy" | "angry" | "surprised" | "calm" | "funny" | "amazed";

interface TiloCompanionProps {
  visible: boolean;
  speaking: boolean;
  message: string | null;
  lookDirection?: -1 | 0 | 1;
  onClose: () => void;
  /** Mood overlay (smile / angry brow on the head) */
  mood?: TiloMood;
  /** When true, the left arm is held up (presenting the speedometer) */
  holding?: boolean;
  /** When true, the right arm performs a throwing motion */
  throwing?: boolean;
  /** Visibly extends the left arm down toward the speedometer */
  reaching?: boolean;
  /** Eyes look down (toward the speedometer) */
  lookingDown?: boolean;
  /** Dancing mode — Tilo arrives with a boombox and grooves */
  dancing?: boolean;
}

/**
 * Tilo — mascot built from layered parts (body + head + arms).
 * Each part animates independently: head tilts/nods, arms swing, eyes blink/glow.
 */
const TiloCompanion = ({
  visible,
  speaking,
  message,
  mood = "idle",
  holding = false,
  throwing = false,
  reaching = false,
  lookingDown = false,
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

  // Container is the full mascot bounding box. Parts are positioned in %.
  // Original mascot is 1066 x 992. Display size: 150 x 140 px.
  const W = 150;
  const H = 140;

  // Left arm rotation depending on action
  const leftArmAnim = dancing
    ? { rotate: [-15, 25, -15, 25, -15], scaleY: [1, 1.05, 1, 1.05, 1] } // dance sway
    : reaching
    ? { rotate: [-2, 18, 28, 24, 28], scaleY: [1, 1.05, 1.12, 1.1, 1.12] } // extends down toward bubble
    : holding
    ? { rotate: [28, -10, -28, -34, -30], scaleY: [1.12, 1.05, 1, 1, 1] } // pulls bubble up to chest
    : speaking
    ? { rotate: [-2, 6, -3, 4, -2] }
    : { rotate: [-2, 3, -2] };
  const leftArmDur = dancing ? 0.6 : reaching ? 1.3 : holding ? 1.4 : speaking ? 0.9 : 2.8;
  const leftArmRepeat = reaching || holding ? 0 : Infinity;

  // Right arm: throw motion overrides idle
  const rightArmAnim = dancing
    ? { rotate: [-30, 35, -30, 35, -30] }
    : throwing
    ? { rotate: [-4, -60, 80, 40, -4] }
    : speaking
    ? { rotate: [-4, 14, -6, 10, -4] }
    : { rotate: [-3, 8, -3] };
  const rightArmDur = dancing ? 0.6 : throwing ? 1.2 : speaking ? 1 : 2.4;
  const rightArmRepeat = throwing ? 0 : Infinity;

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
            {/* Whole mascot — bobs */}
            <motion.div
              animate={
                dancing
                  ? { y: [0, -10, 0, -6, 0], rotate: [-4, 4, -4, 4, -4] }
                  : { y: speaking ? [0, -4, 0, -2, 0] : [0, -3, 0] }
              }
              transition={{
                duration: dancing ? 0.55 : speaking ? 0.7 : 3.2,
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
                      ? "radial-gradient(circle, hsl(140 80% 55% / 0.6), hsl(140 70% 45% / 0.15) 60%, transparent 80%)"
                      : mood === "angry"
                      ? "radial-gradient(circle, hsl(0 90% 55% / 0.7), hsl(15 80% 45% / 0.2) 60%, transparent 80%)"
                      : "radial-gradient(circle, hsl(25 95% 55% / 0.6), hsl(15 85% 50% / 0.15) 60%, transparent 80%)",
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

              {/* LEFT ARM (phone) — swings from shoulder; raises when holding */}
              <motion.img
                src={tiloArmLeft}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{
                  left: `${(150 / 1066) * 100}%`,
                  top: `${(400 / 992) * 100}%`,
                  width: `${(230 / 1066) * 100}%`,
                  transformOrigin: "85% 5%",
                }}
                animate={leftArmAnim}
                transition={{
                  duration: leftArmDur,
                  repeat: leftArmRepeat,
                  ease: "easeInOut",
                }}
              />

              {/* RIGHT ARM (flag) — waves; throws on demand */}
              <motion.img
                src={tiloArmRight}
                alt=""
                draggable={false}
                className="absolute select-none"
                style={{
                  left: `${(740 / 1066) * 100}%`,
                  top: `${(200 / 992) * 100}%`,
                  width: `${(270 / 1066) * 100}%`,
                  transformOrigin: "20% 95%",
                }}
                animate={rightArmAnim}
                transition={{
                  duration: rightArmDur,
                  repeat: rightArmRepeat,
                  ease: "easeInOut",
                }}
              />

              {/* HEAD — tilts, with eye blink overlay + mood expression */}
              <motion.div
                className="absolute"
                style={{
                  left: `${(260 / 1066) * 100}%`,
                  top: `${(40 / 992) * 100}%`,
                  width: `${(530 / 1066) * 100}%`,
                  transformOrigin: "50% 92%",
                }}
                animate={{
                  rotate: lookingDown
                    ? [0, -4, -2, -4]
                    : mood === "angry"
                    ? [-6, 8, -6, 8, -6]
                    : mood === "happy"
                    ? [-2, 2, -2]
                    : speaking
                    ? [-3, 4, -2, 3, -3]
                    : [-2, 2, -2],
                  y: lookingDown ? [0, 4, 5, 4] : speaking ? [0, -1.5, 0, -1, 0] : [0, -1, 0],
                }}
                transition={{
                  duration: lookingDown ? 1.6 : mood === "angry" ? 0.35 : speaking ? 1.1 : 3.6,
                  repeat: lookingDown ? 0 : Infinity,
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
                      background: (() => {
                        // Pupil position (left%, top%) inside the eye ellipse
                        const px = lookingDown ? 18 : 28;
                        const py = lookingDown ? 88 : 50;
                        const qx = lookingDown ? 62 : 72;
                        const qy = lookingDown ? 88 : 50;
                        const color =
                          mood === "angry"
                            ? "hsl(0 100% 60% / 0.85)"
                            : mood === "happy"
                            ? "hsl(140 90% 65% / 0.75)"
                            : "hsl(35 100% 65% / 0.6)";
                        return `radial-gradient(ellipse at ${px}% ${py}%, ${color}, transparent 38%), radial-gradient(ellipse at ${qx}% ${qy}%, ${color}, transparent 38%)`;
                      })(),
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

                {/* Mood mouth overlay (SVG) */}
                {mood !== "idle" && (
                  <svg
                    viewBox="0 0 100 40"
                    className="absolute pointer-events-none"
                    style={{
                      left: "30%",
                      right: "30%",
                      top: "66%",
                      width: "40%",
                      height: "14%",
                    }}
                  >
                    {mood === "happy" || mood === "amazed" ? (
                      <path d="M10 10 Q 50 38 90 10" fill="none" stroke="hsl(140 80% 30%)" strokeWidth="6" strokeLinecap="round" />
                    ) : mood === "funny" ? (
                      <>
                        <path d="M8 14 Q 50 42 92 14" fill="hsl(0 70% 35%)" stroke="hsl(0 70% 25%)" strokeWidth="4" strokeLinecap="round" />
                        <path d="M20 24 Q 50 36 80 24" fill="hsl(0 0% 100%)" stroke="none" />
                      </>
                    ) : mood === "surprised" ? (
                      <ellipse cx="50" cy="22" rx="10" ry="14" fill="hsl(220 25% 12%)" stroke="hsl(25 60% 30%)" strokeWidth="3" />
                    ) : mood === "calm" ? (
                      <path d="M20 18 Q 50 26 80 18" fill="none" stroke="hsl(25 50% 30%)" strokeWidth="5" strokeLinecap="round" />
                    ) : (
                      <path d="M10 30 Q 50 0 90 30" fill="none" stroke="hsl(0 80% 35%)" strokeWidth="6" strokeLinecap="round" />
                    )}
                  </svg>
                )}

                {/* Surprised / amazed → raised eyebrows */}
                {(mood === "surprised" || mood === "amazed") && (
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{ left: "18%", right: "18%", top: "32%", width: "64%", height: "10%" }}
                  >
                    <path d="M8 14 Q 22 2 36 14" stroke="hsl(25 50% 25%)" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <path d="M64 14 Q 78 2 92 14" stroke="hsl(25 50% 25%)" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                )}

                {/* Funny → blush cheeks */}
                {mood === "funny" && (
                  <>
                    <div className="absolute rounded-full pointer-events-none" style={{ left: "18%", top: "58%", width: "12%", height: "8%", background: "hsl(0 80% 70% / 0.55)", filter: "blur(2px)" }} />
                    <div className="absolute rounded-full pointer-events-none" style={{ right: "18%", top: "58%", width: "12%", height: "8%", background: "hsl(0 80% 70% / 0.55)", filter: "blur(2px)" }} />
                  </>
                )}

                {/* Calm → half-closed eyelids */}
                {mood === "calm" && (
                  <div
                    className="absolute pointer-events-none"
                    style={{ left: "22%", right: "22%", top: "44%", height: "8%", background: "hsl(220 25% 10%)", borderRadius: "40%", opacity: 0.85 }}
                  />
                )}

                {/* Angry brows */}
                {mood === "angry" && (
                  <svg
                    viewBox="0 0 100 20"
                    className="absolute pointer-events-none"
                    style={{
                      left: "18%",
                      right: "18%",
                      top: "36%",
                      width: "64%",
                      height: "10%",
                    }}
                  >
                    <path d="M5 18 L 40 4" stroke="hsl(0 85% 30%)" strokeWidth="5" strokeLinecap="round" />
                    <path d="M95 18 L 60 4" stroke="hsl(0 85% 30%)" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                )}
              </motion.div>

              {/* BOOMBOX — appears next to Tilo while dancing */}
              <AnimatePresence>
                {dancing && (
                  <motion.div
                    initial={{ x: -60, y: 20, opacity: 0, rotate: -20 }}
                    animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    exit={{ x: -60, y: 30, opacity: 0, rotate: -20, transition: { duration: 0.8 } }}
                    transition={{ type: "spring", damping: 14, stiffness: 200 }}
                    className="absolute pointer-events-none"
                    style={{ left: "-38%", top: "38%", width: "62%" }}
                  >
                    <motion.div
                      animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <svg viewBox="0 0 120 80" className="w-full h-auto drop-shadow-lg">
                        {/* body */}
                        <rect x="4" y="14" width="112" height="60" rx="8" fill="hsl(220 25% 18%)" stroke="hsl(25 95% 55%)" strokeWidth="2.5" />
                        {/* handle */}
                        <path d="M30 14 Q 60 -4 90 14" stroke="hsl(25 95% 55%)" strokeWidth="3" fill="none" strokeLinecap="round" />
                        {/* speakers */}
                        <circle cx="28" cy="46" r="16" fill="hsl(25 90% 50%)" />
                        <circle cx="28" cy="46" r="9" fill="hsl(220 25% 10%)" />
                        <circle cx="28" cy="46" r="4" fill="hsl(35 95% 65%)" />
                        <circle cx="92" cy="46" r="16" fill="hsl(25 90% 50%)" />
                        <circle cx="92" cy="46" r="9" fill="hsl(220 25% 10%)" />
                        <circle cx="92" cy="46" r="4" fill="hsl(35 95% 65%)" />
                        {/* display */}
                        <rect x="48" y="28" width="24" height="10" rx="2" fill="hsl(140 80% 55%)" />
                        {/* buttons */}
                        <circle cx="54" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                        <circle cx="60" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                        <circle cx="66" cy="58" r="2.5" fill="hsl(25 95% 55%)" />
                      </svg>
                    </motion.div>

                    {/* musical notes */}
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
