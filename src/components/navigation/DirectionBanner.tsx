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
  const cls = size === "lg" ? "w-10 h-10 text-white" : "w-4 h-4 text-white/80";
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

/** Waze-style urgency */
function urgencyFromDistance(m: number): "calm" | "approach" | "soon" | "now" {
  if (m <= 50) return "now";
  if (m <= 150) return "soon";
  if (m <= 400) return "approach";
  return "calm";
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

  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] pointer-events-none">
      {/* Main banner — dark like Waze, full width, no border-radius at top */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="pointer-events-auto"
        style={{
          background: "linear-gradient(180deg, #2d2d3a 0%, #23232e 100%)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
        }}
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-1">
          {/* Direction icon — pulsing when imminent */}
          <motion.div
            animate={
              isNow
                ? { scale: [1, 1.1, 1] }
                : isSoon
                ? { scale: [1, 1.05, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: isNow ? 0.7 : 1.2,
              repeat: isSoon ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="flex-shrink-0"
          >
            {directionIcon(direction, "lg")}
          </motion.div>

          {/* Distance + street name */}
          <div className="flex-1 min-w-0">
            <p
              className="text-white font-bold leading-none tabular-nums"
              style={{ fontSize: isNow ? "28px" : "24px" }}
            >
              {isNow && direction !== "straight" ? "Maintenant" : formatDist(distanceMeters)}
            </p>
            {streetName && (
              <p className="text-white/70 text-sm mt-0.5 truncate">{streetName}</p>
            )}
            {!streetName && (
              <p className="text-white/70 text-sm mt-0.5 truncate">
                {directionLabel(direction)}
              </p>
            )}
          </div>
        </div>

        {/* "Puis…" preview strip — slightly darker */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 border-t border-white/5">
            <div className="flex-shrink-0">
              {directionIcon(nextDirection, "sm")}
            </div>
            <p className="text-white/70 text-xs font-medium flex-1 truncate">
              Puis {shortLabel(nextDirection)}
            </p>
            <p className="text-white/60 text-xs font-semibold tabular-nums">
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
