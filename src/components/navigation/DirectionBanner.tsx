import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
} from "lucide-react";

export type TurnDirection = "straight" | "left" | "right" | "u-turn" | "arrive";

interface DirectionBannerProps {
  direction: TurnDirection;
  distanceMeters: number;
  streetName?: string;
  nextDirection?: TurnDirection;
  nextDistanceMeters?: number;
}

function directionIcon(dir: TurnDirection, size: "lg" | "sm" = "lg") {
  const cls = size === "lg" ? "w-14 h-14 text-white" : "w-5 h-5 text-white/90";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={cls} strokeWidth={2.8} />;
    case "right":
      return <CornerUpRight className={cls} strokeWidth={2.8} />;
    case "u-turn":
      return <RotateCcw className={cls} strokeWidth={2.8} />;
    case "arrive":
      return <Flag className={cls} strokeWidth={2.8} />;
    default:
      return <ArrowUp className={cls} strokeWidth={2.8} />;
  }
}

function directionLabel(dir: TurnDirection): string {
  switch (dir) {
    case "left":
      return "Tournez à gauche";
    case "right":
      return "Tournez à droite";
    case "u-turn":
      return "Faites demi-tour";
    case "arrive":
      return "Vous êtes arrivé";
    default:
      return "Continuez tout droit";
  }
}

function shortLabel(dir: TurnDirection): string {
  switch (dir) {
    case "left":
      return "à gauche";
    case "right":
      return "à droite";
    case "u-turn":
      return "demi-tour";
    case "arrive":
      return "à destination";
    default:
      return "tout droit";
  }
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (m >= 100) return `${Math.round(m / 10) * 10} m`;
  return `${Math.max(0, Math.round(m / 5) * 5)} m`;
}

/** Waze-style urgency: distance buckets drive color intensity. */
function urgencyFromDistance(m: number): "calm" | "approach" | "soon" | "now" {
  if (m <= 40) return "now";
  if (m <= 120) return "soon";
  if (m <= 350) return "approach";
  return "calm";
}

function bannerGradient(urgency: "calm" | "approach" | "soon" | "now"): string {
  // Amber/orange palette tuned per urgency (project uses warm tones, not Waze blue)
  switch (urgency) {
    case "now":
      return "linear-gradient(180deg, hsl(0 85% 56%) 0%, hsl(8 88% 48%) 100%)";
    case "soon":
      return "linear-gradient(180deg, hsl(18 96% 54%) 0%, hsl(14 94% 46%) 100%)";
    case "approach":
      return "linear-gradient(180deg, hsl(28 95% 54%) 0%, hsl(24 92% 48%) 100%)";
    default:
      return "linear-gradient(180deg, hsl(36 92% 52%) 0%, hsl(32 90% 46%) 100%)";
  }
}

const DirectionBanner = ({
  direction,
  distanceMeters,
  streetName,
  nextDirection,
  nextDistanceMeters,
}: DirectionBannerProps) => {
  const urgency = urgencyFromDistance(distanceMeters);
  const isNow = urgency === "now";
  const isSoon = urgency === "soon" || isNow;

  // Approach progress bar (fills as user closes in within ~600m)
  const progress = Math.max(0, Math.min(1, 1 - distanceMeters / 600));

  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] px-3 pt-3 pointer-events-none">
      <motion.div
        key={urgency} // re-trigger entrance subtly when urgency changes
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="rounded-2xl overflow-hidden shadow-[0_10px_36px_rgba(0,0,0,0.32)] pointer-events-auto"
        style={{ background: bannerGradient(urgency) }}
      >
        <div className="flex items-center gap-4 pl-4 pr-5 py-4">
          {/* Big direction icon — pulses when imminent */}
          <motion.div
            animate={
              isNow
                ? { scale: [1, 1.08, 1] }
                : isSoon
                ? { scale: [1, 1.04, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: isNow ? 0.7 : 1.2,
              repeat: isSoon ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="flex-shrink-0 w-[72px] h-[72px] rounded-2xl bg-white/15 flex items-center justify-center ring-2 ring-white/30"
          >
            {directionIcon(direction, "lg")}
          </motion.div>

          {/* Distance + instruction */}
          <div className="flex-1 min-w-0">
            <p
              className="text-white font-extrabold leading-none tracking-tight tabular-nums"
              style={{ fontSize: isNow ? "40px" : "36px" }}
            >
              {isNow && direction !== "straight" ? "Maintenant" : formatDist(distanceMeters)}
            </p>
            <p className="text-white/95 text-[15px] font-bold mt-1 truncate uppercase tracking-wide">
              {directionLabel(direction)}
            </p>
            {streetName && (
              <p className="text-white/80 text-xs truncate mt-0.5">vers {streetName}</p>
            )}
          </div>
        </div>

        {/* Approach progress bar */}
        <div className="h-1 bg-black/25">
          <motion.div
            className="h-full bg-white/90"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.4 }}
          />
        </div>

        {/* "Puis…" preview band */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black/25 border-t border-white/10">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              {directionIcon(nextDirection, "sm")}
            </div>
            <p className="text-white/90 text-xs font-semibold flex-1 truncate">
              Puis {shortLabel(nextDirection)}
            </p>
            <p className="text-white/85 text-xs font-bold tabular-nums">
              {formatDist(nextDistanceMeters)}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DirectionBanner;
export { directionLabel, formatDist as formatDistance };
