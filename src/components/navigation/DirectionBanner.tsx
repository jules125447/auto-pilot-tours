import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
  Navigation,
} from "lucide-react";

export type TurnDirection = "straight" | "left" | "right" | "u-turn" | "arrive";

interface DirectionBannerProps {
  direction: TurnDirection;
  distanceMeters: number;
  streetName?: string;
  nextDirection?: TurnDirection;
  nextDistanceMeters?: number;
}

function directionIcon(dir: TurnDirection) {
  const cls = "w-8 h-8 text-white";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={cls} />;
    case "right":
      return <CornerUpRight className={cls} />;
    case "u-turn":
      return <RotateCcw className={cls} />;
    case "arrive":
      return <Flag className={cls} />;
    default:
      return <ArrowUp className={cls} />;
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

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  // Round to nearest 10m for cleaner display
  return `${Math.round(m / 10) * 10} m`;
}

const bgByDirection: Record<TurnDirection, string> = {
  straight: "hsl(152, 50%, 40%)",
  left: "hsl(205, 60%, 48%)",
  right: "hsl(205, 60%, 48%)",
  "u-turn": "hsl(35, 85%, 50%)",
  arrive: "hsl(152, 50%, 40%)",
};

const DirectionBanner = ({
  direction,
  distanceMeters,
  streetName,
  nextDirection,
  nextDistanceMeters,
}: DirectionBannerProps) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-[1001]">
      {/* Main direction */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-0 rounded-b-2xl overflow-hidden shadow-lg"
        style={{ background: bgByDirection[direction] }}
      >
        <div className="flex items-center gap-4 px-5 py-4 safe-area-top">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            {directionIcon(direction)}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              Dans {formatDist(distanceMeters)}
            </p>
            <p className="text-white text-xl font-bold truncate">
              {directionLabel(direction)}
            </p>
            {streetName && (
              <p className="text-white/70 text-sm truncate mt-0.5">
                {streetName}
              </p>
            )}
          </div>

          {/* Distance big */}
          <div className="text-right flex-shrink-0">
            <p className="text-white text-2xl font-bold font-mono">
              {formatDist(distanceMeters)}
            </p>
          </div>
        </div>

        {/* Next direction preview */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className="flex items-center gap-3 px-5 py-2 bg-black/15 border-t border-white/10">
            <div className="w-6 h-6 flex items-center justify-center opacity-70">
              {directionIcon(nextDirection)}
            </div>
            <p className="text-white/70 text-xs font-medium flex-1 truncate">
              Puis {directionLabel(nextDirection).toLowerCase()}
            </p>
            <p className="text-white/60 text-xs font-mono">
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
