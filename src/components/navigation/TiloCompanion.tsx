import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import tiloBody from "@/assets/tilo-body-full.png";
import tiloTail from "@/assets/tilo-tail.png";
import tiloArmLeft from "@/assets/tilo-arm-left.png";
import tiloArmRight from "@/assets/tilo-arm-right.png";

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
 * Tilo — fox mascot built from layered parts so that the BODY stays mostly
 * still while the TAIL wags, ARMS swing, EYES blink/glow/look, and MOUTH
 * lip-syncs.
 */
const TiloCompanion = ({
  visible,
  speaking,
  message,
  mood = "idle",
  dancing = false,
  lookDirection = 0,
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

  // ── Auto-look loop: pupils drift left/right when idle ──────────────────
  const [autoLook, setAutoLook] = useState<-1 | 0 | 1>(0);
  useEffect(() => {
    if (lookDirection !== 0) return;
    let t: number;
    const loop = () => {
      const dirs: Array<-1 | 0 | 1> = [-1, 0, 1, 0];
      setAutoLook(dirs[Math.floor(Math.random() * dirs.length)]);
      t = window.setTimeout(loop, 1800 + Math.random() * 2200);
    };
    t = window.setTimeout(loop, 1200);
    return () => window.clearTimeout(t);
  }, [lookDirection]);
  const look = lookDirection || autoLook;

  const W = 180;
  const H = 180;

  // Eye/mouth anchors on the BODY image (% of bbox; head is the upper part)
  const FACE = {
    leftEye:  { x: 38, y: 28, w: 6, h: 4 },
    rightEye: { x: 53, y: 28, w: 6, h: 4 },
    mouth:    { x: 43, y: 38, w: 11, h: 4 },
    leftBrow: { x: 35, y: 24, w: 10, h: 3 },
    rightBrow:{ x: 51, y: 24, w: 10, h: 3 },
  };

  // ── Tail wag ───────────────────────────────────────────────────────────
  const tailAnim = dancing
    ? { rotate: [-25, 25, -25, 25, -25] }
    : mood === "happy"
    ? { rotate: [-18, 18, -18] }
    : mood === "angry"
    ? { rotate: [-6, 6, -6, 6, -6] }
    : mood === "surprised"
    ? { rotate: [0, -15, -5, -15, -5] }
    : mood === "calm"
    ? { rotate: [-3, 3, -3] }
    : { rotate: [-8, 8, -8] };
  const tailDur = dancing ? 0.5 : mood === "happy" ? 0.7 : mood === "angry" ? 0.3 : mood === "calm" ? 4 : 1.4;

  // ── Arm swings ─────────────────────────────────────────────────────────
  const leftArmAnim = dancing
    ? { rotate: [-15, 25, -15, 25, -15] }
    : mood === "happy"
    ? { rotate: [-5, 12, -5, 8, -5] }
    : speaking
    ? { rotate: [-3, 7, -3, 5, -3] }
    : { rotate: [-2, 4, -2] };
  const leftArmDur = dancing ? 0.55 : speaking ? 0.9 : 2.8;

  const rightArmAnim = dancing
    ? { rotate: [-30, 30, -30, 30, -30] }
    : mood === "angry"
    ? { rotate: [-8, 8, -8, 8, -8] }
    : speaking
    ? { rotate: [-3, 6, -3, 5, -3] }
    : { rotate: [-2, 3, -2] };
  const rightArmDur = dancing ? 0.55 : speaking ? 1 : 2.4;

  // Subtle body breathing (no big jumps)
  const bodyAnim = dancing
    ? { y: [0, -4, 0, -3, 0], rotate: [-2, 2, -2, 2, -2] }
    : mood === "angry"
    ? { x: [-1, 1, -1, 1, 0], rotate: [-0.5, 0.5, -0.5] }
    : { y: [0, -1.5, 0], scaleY: [1, 1.012, 1] };
  const bodyDur = dancing ? 0.55 : mood === "angry" ? 0.25 : 3.4;

  // Halo color
  const haloBg = useMemo(() => {
    switch (mood) {
      case "happy":
        return "radial-gradient(circle, hsl(140 90% 60% / 0.5), hsl(140 70% 45% / 0.1) 60%, transparent 80%)";
      case "angry":
        return "radial-gradient(circle, hsl(0 95% 58% / 0.65), hsl(15 80% 45% / 0.15) 60%, transparent 80%)";
      case "surprised":
      case "amazed":
        return "radial-gradient(circle, hsl(45 100% 65% / 0.6), hsl(25 95% 55% / 0.15) 60%, transparent 80%)";
      case "funny":
        return "radial-gradient(circle, hsl(320 90% 65% / 0.5), hsl(280 75% 55% / 0.12) 60%, transparent 80%)";
      case "calm":
        return "radial-gradient(circle, hsl(200 80% 65% / 0.4), hsl(190 60% 50% / 0.1) 60%, transparent 80%)";
      default:
        return "radial-gradient(circle, hsl(25 95% 55% / 0.5), hsl(15 85% 50% / 0.12) 60%, transparent 80%)";
    }
  }, [mood]);

  // Particles (no stars)
  const showSparkles = mood === "happy" || mood === "amazed" || dancing;
  const showHearts = mood === "funny";
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
            <motion.div
              animate={bodyAnim}
              transition={{ duration: bodyDur, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
              style={{ width: W, height: H, transformOrigin: "50% 95%" }}
            >
              {/* Pulsing halo */}
              <motion.div
                animate={{
                  opacity: speaking ? [0.5, 0.95, 0.5] : [0.3, 0.55, 0.3],
                  scale: speaking ? [0.95, 1.08, 0.95] : [0.98, 1.04, 0.98],
                }}
                transition={{ duration: speaking ? 0.7 : 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-4 rounded-full blur-2xl pointer-events-none"
                style={{ background: haloBg }}
              />

              {/* Ground shadow */}
              <motion.div
                animate={{
                  scaleX: speaking ? [1, 0.9, 1] : [1, 0.96, 1],
                  opacity: [0.38, 0.24, 0.38],
                }}
                transition={{ duration: speaking ? 0.7 : 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-24 h-3 rounded-full bg-black/45 blur-md"
              />

              {/* TAIL — behind body, wags from base */}
              <motion.img
                src={tiloTail}
                alt=""
                draggable={false}
                className="absolute select-none pointer-events-none"
                style={{
                  left: "44%",
                  top: "36%",
                  width: "55%",
                  transformOrigin: "10% 60%",
                  zIndex: 1,
                  filter: "drop-shadow(0 6px 10px rgba(180,80,30,0.3))",
                }}
                animate={tailAnim}
                transition={{ duration: tailDur, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* BODY (with head) */}
              <img
                src={tiloBody}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full object-contain select-none"
                style={{
                  filter: "drop-shadow(0 8px 12px rgba(180,80,30,0.4))",
                  zIndex: 2,
                }}
              />

              {/* LEFT ARM (compass) — swings from shoulder */}
              <motion.img
                src={tiloArmLeft}
                alt=""
                draggable={false}
                className="absolute select-none pointer-events-none"
                style={{
                  left: "8%",
                  top: "36%",
                  width: "40%",
                  transformOrigin: "85% 12%",
                  zIndex: 3,
                  filter: "drop-shadow(0 4px 6px rgba(180,80,30,0.35))",
                }}
                animate={leftArmAnim}
                transition={{ duration: leftArmDur, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* RIGHT ARM — subtle wave */}
              <motion.img
                src={tiloArmRight}
                alt=""
                draggable={false}
                className="absolute select-none pointer-events-none"
                style={{
                  left: "48%",
                  top: "38%",
                  width: "30%",
                  transformOrigin: "15% 10%",
                  zIndex: 3,
                  filter: "drop-shadow(0 4px 6px rgba(180,80,30,0.35))",
                }}
                animate={rightArmAnim}
                transition={{ duration: rightArmDur, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* PUPILS — drift with look direction (over painted eyes) */}
              {!blink && (
                <>
                  {[FACE.leftEye, FACE.rightEye].map((e, i) => (
                    <motion.div
                      key={i}
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: `${e.x + e.w * 0.3}%`,
                        top: `${e.y + e.h * 0.2}%`,
                        width: `${e.w * 0.4}%`,
                        height: `${e.h * 0.6}%`,
                        background: "hsl(20 70% 12%)",
                        zIndex: 5,
                      }}
                      animate={{
                        x: look * 3,
                        y: 0,
                        opacity: 0.85,
                      }}
                      transition={{ type: "spring", damping: 18, stiffness: 200 }}
                    />
                  ))}
                </>
              )}

              {/* Eye glow */}
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
                            ? "radial-gradient(circle, hsl(0 100% 60% / 0.6), transparent 70%)"
                            : mood === "happy"
                            ? "radial-gradient(circle, hsl(140 90% 65% / 0.5), transparent 70%)"
                            : mood === "amazed"
                            ? "radial-gradient(circle, hsl(45 100% 70% / 0.6), transparent 70%)"
                            : "radial-gradient(circle, hsl(35 100% 65% / 0.45), transparent 70%)",
                        filter: "blur(2px)",
                        zIndex: 4,
                      }}
                      animate={{ opacity: speaking ? [0.5, 0.95, 0.5] : [0.35, 0.75, 0.35] }}
                      transition={{ duration: speaking ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </>
              )}

              {/* Blink — eyelids */}
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
                        zIndex: 6,
                      }}
                    />
                  ))}
                </>
              )}

              {/* MOUTH — lip-sync + mood */}
              {(mood !== "idle" || speaking) && (
                <motion.svg
                  viewBox="0 0 100 40"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${FACE.mouth.x}%`,
                    top: `${FACE.mouth.y}%`,
                    width: `${FACE.mouth.w}%`,
                    height: `${FACE.mouth.h}%`,
                    zIndex: 5,
                  }}
                  animate={speaking ? { scaleY: [1, 0.5, 1.15, 0.7, 1] } : { scaleY: 1 }}
                  transition={{ duration: 0.26, repeat: Infinity, ease: "easeInOut" }}
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
                  ) : mood === "angry" ? (
                    <path d="M10 30 Q 50 0 90 30" fill="none" stroke="hsl(0 80% 35%)" strokeWidth="6" strokeLinecap="round" />
                  ) : speaking ? (
                    <ellipse cx="50" cy="22" rx="8" ry="6" fill="hsl(220 25% 12%)" />
                  ) : null}
                </motion.svg>
              )}

              {/* Surprised / amazed brows */}
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
                        zIndex: 5,
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
                    style={{ left: "34%", top: "35%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.65)", filter: "blur(2px)", zIndex: 5 }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute rounded-full pointer-events-none"
                    style={{ left: "59%", top: "35%", width: "7%", height: "4%", background: "hsl(0 80% 70% / 0.65)", filter: "blur(2px)", zIndex: 5 }}
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
                      style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: 5 }}
                      animate={{ y: [0, 1, 0, 1, 0] }}
                      transition={{ duration: 0.3, repeat: Infinity }}
                    >
                      <path d={b.d} stroke="hsl(0 85% 30%)" strokeWidth="6" strokeLinecap="round" />
                    </motion.svg>
                  ))}
                </>
              )}

              {/* ── Particles ─────────────────────────────────────── */}
              {showSparkles && (
                <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 7 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute text-yellow-300"
                      style={{ left: `${20 + i * 18}%`, top: "22%", fontSize: 14, filter: "drop-shadow(0 0 4px hsl(45 100% 60%))" }}
                      animate={{ y: [-5, -45, -75], opacity: [0, 1, 0], rotate: [0, 180, 360], scale: [0.6, 1.2, 0.4] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                    >
                      ✦
                    </motion.div>
                  ))}
                </div>
              )}
              {showHearts && (
                <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 7 }}>
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
              {showSteam && (
                <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 7 }}>
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
                <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 7 }}>
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
                    style={{ left: "-32%", top: "55%", width: "55%", zIndex: 8 }}
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
