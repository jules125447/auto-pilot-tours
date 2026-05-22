import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
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
 * Tilo — Fox mascot with rich, mood-driven animations.
 * Layers: ambient glow, ground shadow, particles, body motion, mascot sprite,
 * eye glow + blink, mood-specific facial overlays, and a dancing boombox.
 */
const TiloCompanion = ({
  visible,
  speaking,
  message,
  mood = "idle",
  dancing = false,
}: TiloCompanionProps) => {
  // ── Blink loop ─────────────────────────────────────────────────────────
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

  const W = 170;
  const H = 170;

  // Approx fox face anchors on the 1024 mascot canvas (% of bbox)
  const FACE = {
    leftEye:  { x: 36, y: 30, w: 6,  h: 4 },
    rightEye: { x: 51, y: 30, w: 6,  h: 4 },
    mouth:    { x: 41, y: 42, w: 12, h: 5 },
    leftBrow: { x: 33, y: 26, w: 10, h: 3 },
    rightBrow:{ x: 50, y: 26, w: 10, h: 3 },
  };

  // ── Body motion by mood ────────────────────────────────────────────────
  const bodyAnim = useMemo(() => {
    if (dancing) {
      return {
        animate: { y: [0, -14, 0, -10, 0], rotate: [-6, 6, -6, 6, -6], scaleY: [1, 0.96, 1.04, 0.97, 1] },
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const },
      };
    }
    switch (mood) {
      case "happy":
        return {
          animate: { y: [0, -16, 0, -6, 0], rotate: [-2, 2, -2], scaleY: [1, 0.94, 1.06, 0.98, 1] },
          transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "angry":
        return {
          animate: { x: [-2, 2, -2, 2, -1, 1, 0], y: [0, -2, 0, -2, 0], rotate: [-3, 3, -3, 3, 0] },
          transition: { duration: 0.32, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "surprised":
        return {
          animate: { y: [0, -10, -4, -8, -4], scale: [1, 1.08, 1.02, 1.05, 1] },
          transition: { duration: 0.9, repeat: Infinity, ease: "easeOut" as const },
        };
      case "amazed":
        return {
          animate: { y: [0, -8, -4, -10, 0], rotate: [-3, 3, -3, 3, -3], scale: [1, 1.04, 1, 1.04, 1] },
          transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "funny":
        return {
          animate: { rotate: [-8, 8, -8, 8, -8], y: [0, -4, 0, -4, 0] },
          transition: { duration: 0.7, repeat: Infinity, ease: "easeInOut" as const },
        };
      case "calm":
        return {
          animate: { y: [0, -2, 0], rotate: [-1, 1, -1], scaleY: [1, 1.015, 1] },
          transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" as const },
        };
      default:
        return {
          animate: speaking
            ? { y: [0, -5, 0, -3, 0], rotate: [-1.5, 1.5, -1.5], scaleY: [1, 0.98, 1.02, 0.99, 1] }
            : { y: [0, -3, 0], rotate: [-1, 1, -1], scaleY: [1, 1.01, 1] },
          transition: { duration: speaking ? 0.7 : 3.2, repeat: Infinity, ease: "easeInOut" as const },
        };
    }
  }, [mood, dancing, speaking]);

  // Halo color per mood
  const haloBg = useMemo(() => {
    switch (mood) {
      case "happy":
        return "radial-gradient(circle, hsl(140 90% 60% / 0.55), hsl(140 70% 45% / 0.12) 60%, transparent 80%)";
      case "angry":
        return "radial-gradient(circle, hsl(0 95% 58% / 0.7), hsl(15 80% 45% / 0.18) 60%, transparent 80%)";
      case "surprised":
      case "amazed":
        return "radial-gradient(circle, hsl(45 100% 65% / 0.65), hsl(25 95% 55% / 0.18) 60%, transparent 80%)";
      case "funny":
        return "radial-gradient(circle, hsl(320 90% 65% / 0.55), hsl(280 75% 55% / 0.14) 60%, transparent 80%)";
      case "calm":
        return "radial-gradient(circle, hsl(200 80% 65% / 0.45), hsl(190 60% 50% / 0.12) 60%, transparent 80%)";
      default:
        return "radial-gradient(circle, hsl(25 95% 55% / 0.55), hsl(15 85% 50% / 0.13) 60%, transparent 80%)";
    }
  }, [mood]);

  // Particles: sparkles for happy/amazed, hearts for funny, stars for surprised, steam for angry, zzz for calm
  const showSparkles = mood === "happy" || mood === "amazed" || dancing;
  const showHearts = mood === "funny";
  const showStars = mood === "surprised";
  const showSteam = mood === "angry";
  const showZ = mood === "calm";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 160, opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
          exit={{
            x: -340,
            y: 30,
            opacity: 0,
            scale: 0.75,
            rotate: -12,
            transition: { duration: 1.4, ease: "easeInOut" },
          }}
          transition={{ type: "spring", damping: 14, stiffness: 220, mass: 0.9 }}
          className="absolute left-3 z-[1002] pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 230px)" }}
        >
          <div className="flex items-end gap-2 pointer-events-auto">
            {/* Whole mascot */}
            <motion.div
              {...bodyAnim}
              className="relative"
              style={{ width: W, height: H, transformOrigin: "50% 95%" }}
            >
              {/* Pulsing halo */}
              <motion.div
                animate={{
                  opacity: speaking ? [0.5, 0.95, 0.5] : [0.3, 0.55, 0.3],
                  scale: speaking ? [0.95, 1.1, 0.95] : [0.98, 1.04, 0.98],
                }}
                transition={{ duration: speaking ? 0.7 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-4 rounded-full blur-2xl pointer-events-none"
                style={{ background: haloBg }}
              />

              {/* Ground shadow */}
              <motion.div
                animate={{
                  scaleX: dancing ? [1, 0.75, 1.05, 0.8, 1] : speaking ? [1, 0.85, 1] : [1, 0.94, 1],
                  opacity: [0.4, 0.22, 0.4],
                }}
                transition={{ duration: dancing ? 0.5 : speaking ? 0.7 : 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-24 h-3 rounded-full bg-black/45 blur-md"
              />

              {/* MASCOT base image with subtle squash/stretch */}
              <motion.img
                src={tiloMascot}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{ filter: "drop-shadow(0 10px 14px rgba(180,80,30,0.45))", transformOrigin: "50% 95%" }}
                animate={
                  mood === "surprised"
                    ? { scale: [1, 1.05, 1.02, 1.05, 1] }
                    : mood === "happy"
                    ? { scaleX: [1, 1.04, 0.97, 1.02, 1], scaleY: [1, 0.96, 1.05, 0.98, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: mood === "surprised" ? 0.9 : 1.1, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Eye glow overlay */}
              {!blink && (mood === "happy" || mood === "angry" || mood === "amazed" || speaking) && (
                <>
                  {[FACE.leftEye, FACE.rightEye].map((e, i) => (
                    <motion.div
                      key={i}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: `${e.x}%`,
                        top: `${e.y}%`,
                        width: `${e.w}%`,
                        height: `${e.h}%`,
                        background:
                          mood === "angry"
                            ? "radial-gradient(circle, hsl(0 100% 60% / 0.75), transparent 70%)"
                            : mood === "happy"
                            ? "radial-gradient(circle, hsl(140 90% 65% / 0.6), transparent 70%)"
                            : mood === "amazed"
                            ? "radial-gradient(circle, hsl(45 100% 70% / 0.7), transparent 70%)"
                            : "radial-gradient(circle, hsl(35 100% 65% / 0.5), transparent 70%)",
                        filter: "blur(2px)",
                      }}
                      animate={{ opacity: speaking ? [0.6, 1, 0.6] : [0.4, 0.85, 0.4] }}
                      transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </>
              )}

              {/* Blink — dark bands over both eyes */}
              {blink && (
                <>
                  {[FACE.leftEye, FACE.rightEye].map((e, i) => (
                    <div
                      key={i}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${e.x}%`,
                        top: `${e.y + 1}%`,
                        width: `${e.w}%`,
                        height: `${e.h * 0.6}%`,
                        background: "hsl(25 60% 25%)",
                        borderRadius: "50%",
                      }}
                    />
                  ))}
                </>
              )}

              {/* Mood mouth overlay */}
              {mood !== "idle" && (
                <motion.svg
                  viewBox="0 0 100 40"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${FACE.mouth.x}%`,
                    top: `${FACE.mouth.y}%`,
                    width: `${FACE.mouth.w}%`,
                    height: `${FACE.mouth.h}%`,
                  }}
                  animate={speaking ? { scaleY: [1, 0.6, 1.1, 0.7, 1] } : { scaleY: 1 }}
                  transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
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
                </motion.svg>
              )}

              {/* Surprised / amazed → raised eyebrows */}
              {(mood === "surprised" || mood === "amazed") && (
                <>
                  {[FACE.leftBrow, FACE.rightBrow].map((b, i) => (
                    <motion.svg
                      key={i}
                      viewBox="0 0 100 20"
                      className="absolute pointer-events-none"
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y - 2}%`,
                        width: `${b.w}%`,
                        height: `${b.h}%`,
                      }}
                      animate={{ y: [0, -2, 0, -1, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <path d="M5 18 Q 50 2 95 18" stroke="hsl(20 60% 18%)" strokeWidth="6" fill="none" strokeLinecap="round" />
                    </motion.svg>
                  ))}
                </>
              )}

              {/* Funny → blush cheeks */}
              {mood === "funny" && (
                <>
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{ left: "32%", top: "37%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.65)", filter: "blur(2px)" }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{ left: "57%", top: "37%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.65)", filter: "blur(2px)" }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}

              {/* Angry brows */}
              {mood === "angry" && (
                <>
                  {[
                    { ...FACE.leftBrow, d: "M5 4 L 95 18" },
                    { ...FACE.rightBrow, d: "M5 18 L 95 4" },
                  ].map((b, i) => (
                    <motion.svg
                      key={i}
                      viewBox="0 0 100 20"
                      className="absolute pointer-events-none"
                      style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                      animate={{ y: [0, 1, 0, 1, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                    >
                      <path d={b.d} stroke="hsl(0 85% 30%)" strokeWidth="6" strokeLinecap="round" />
                    </motion.svg>
                  ))}
                </>
              )}

              {/* ── Particles ────────────────────────────────────────── */}
              {showSparkles && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const left = 15 + i * 17;
                    const delay = i * 0.35;
                    return (
                      <motion.div
                        key={i}
                        className="absolute text-yellow-300"
                        style={{ left: `${left}%`, top: "20%", fontSize: 14, filter: "drop-shadow(0 0 4px hsl(45 100% 60%))" }}
                        animate={{
                          y: [-5, -45, -80],
                          opacity: [0, 1, 0],
                          rotate: [0, 180, 360],
                          scale: [0.6, 1.2, 0.4],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, delay, ease: "easeOut" }}
                      >
                        ✦
                      </motion.div>
                    );
                  })}
                </div>
              )}
              {showHearts && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{ left: `${30 + i * 18}%`, top: "30%", fontSize: 16 }}
                      animate={{ y: [-5, -55], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.6], rotate: [-10, 10, -10] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
                    >
                      💖
                    </motion.div>
                  ))}
                </div>
              )}
              {showStars && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{ left: `${20 + i * 20}%`, top: "15%", fontSize: 16 }}
                      animate={{ scale: [0, 1.3, 0], opacity: [0, 1, 0], rotate: [0, 90] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
                    >
                      ⭐
                    </motion.div>
                  ))}
                </div>
              )}
              {showSteam && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full bg-white/70 blur-sm"
                      style={{ left: `${28 + i * 18}%`, top: "5%", width: 10, height: 10 }}
                      animate={{ y: [-5, -45], opacity: [0, 0.8, 0], scale: [0.6, 1.6, 0.8] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                    />
                  ))}
                </div>
              )}
              {showZ && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute text-blue-300 font-bold"
                      style={{ left: `${55 + i * 6}%`, top: `${25 - i * 5}%`, fontSize: 12 + i * 4 }}
                      animate={{ y: [0, -20], opacity: [0, 1, 0], rotate: [-10, 10, -10] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: "easeInOut" }}
                    >
                      z
                    </motion.div>
                  ))}
                </div>
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
                    style={{ left: "-32%", top: "55%", width: "55%" }}
                  >
                    <motion.div
                      animate={{ rotate: [-10, 10, -10], y: [0, -5, 0] }}
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
                        style={{ left: `${20 + i * 25}%`, top: -10, color: "hsl(25 95% 55%)" }}
                        animate={{ y: [-5, -40, -70], opacity: [0, 1, 0], rotate: [0, 15, -15], scale: [0.8, 1.2, 0.6] }}
                        transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
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
                  initial={{ opacity: 0, x: -8, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8, scale: 0.85 }}
                  transition={{ type: "spring", damping: 18, stiffness: 300 }}
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
