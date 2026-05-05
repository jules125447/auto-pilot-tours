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
  const cls = size === "lg" ? "w-11 h-11 text-white drop-shadow-md" : "w-4 h-4 text-white/70";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={cls} strokeWidth={2.5} />;
    case "right":
      return <CornerUpRight className={cls} strokeWidth={2.5} />;
    case "u-turn":
      return <RotateCcw className={cls} strokeWidth={2.5} />;
    case "arrive":
      return <Flag className={cls} strokeWidth={2.5} />;
    default:
      return <ArrowUp className={cls} strokeWidth={2.5} />;
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

function urgencyGradient(urgency: string): string {
  switch (urgency) {
    case "now":
      return "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
    case "soon":
      return "linear-gradient(135deg, #e67e22 0%, #d35400 100%)";
    case "approach":
      return "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)";
    default:
      return "linear-gradient(135deg, #2d2d3a 0%, #1e1e2a 100%)";
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

  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] pointer-events-none">
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="pointer-events-auto shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
        style={{
          background: urgencyGradient(urgency),
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
          transition: "background 400ms ease",
        }}
      >
        <div className="flex items-center gap-4 px-5 pb-4 pt-1">
          {/* Direction icon with glow effect */}
          <motion.div
            animate={
              isNow
                ? { scale: [1, 1.15, 1] }
                : isSoon
                ? { scale: [1, 1.06, 1] }
                : { scale: 1 }
            }
            transition={{
              duration: isNow ? 0.6 : 1.2,
              repeat: isSoon ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            {directionIcon(direction, "lg")}
          </motion.div>

          {/* Distance + label */}
          <div className="flex-1 min-w-0">
            <p
              className="text-white font-extrabold leading-none tabular-nums tracking-tight"
              style={{ fontSize: isNow ? "32px" : "28px" }}
            >
              {isNow && direction !== "straight" ? "Maintenant" : formatDist(distanceMeters)}
            </p>
            <p className="text-white/70 text-sm mt-1 truncate font-medium">
              {streetName || directionLabel(direction)}
            </p>
          </div>
        </div>

        {/* "Puis…" preview */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-black/20 border-t border-white/5">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              {directionIcon(nextDirection, "sm")}
            </div>
            <p className="text-white/60 text-xs font-semibold flex-1 truncate">
              Puis {shortLabel(nextDirection)}
            </p>
            <p className="text-white/50 text-xs font-bold tabular-nums">
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
