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
  const cls = size === "lg" ? "w-12 h-12 text-white" : "w-5 h-5 text-white/90";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={cls} strokeWidth={2.6} />;
    case "right":
      return <CornerUpRight className={cls} strokeWidth={2.6} />;
    case "u-turn":
      return <RotateCcw className={cls} strokeWidth={2.6} />;
    case "arrive":
      return <Flag className={cls} strokeWidth={2.6} />;
    default:
      return <ArrowUp className={cls} strokeWidth={2.6} />;
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
  return `${Math.round(m / 10) * 10} m`;
}

const DirectionBanner = ({
  direction,
  distanceMeters,
  streetName,
  nextDirection,
  nextDistanceMeters,
}: DirectionBannerProps) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] px-3 pt-3 pointer-events-none">
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.25)] pointer-events-auto"
        style={{
          // Waze-like solid colored banner — orange/amber palette
          background: "linear-gradient(180deg, hsl(28 95% 54%) 0%, hsl(24 92% 48%) 100%)",
        }}
      >
        <div className="flex items-center gap-4 pl-4 pr-5 py-3.5">
          {/* Big direction icon (Waze style) */}
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/25">
            {directionIcon(direction, "lg")}
          </div>

          {/* Distance + instruction */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold leading-none tracking-tight" style={{ fontSize: "34px" }}>
              {formatDist(distanceMeters)}
            </p>
            <p className="text-white/95 text-[15px] font-semibold mt-1 truncate">
              {directionLabel(direction)}
            </p>
            {streetName && (
              <p className="text-white/80 text-xs truncate mt-0.5">
                vers {streetName}
              </p>
            )}
          </div>
        </div>

        {/* "Puis…" preview band — Waze shows this as a slim strip under the main banner */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2 bg-black/20 border-t border-white/10">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              {directionIcon(nextDirection, "sm")}
            </div>
            <p className="text-white/90 text-xs font-medium flex-1 truncate">
              Puis {shortLabel(nextDirection)}
            </p>
            <p className="text-white/80 text-xs font-bold tabular-nums">
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
