import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
  Circle,
  MapPin,
} from "lucide-react";

export type TurnDirection = "straight" | "left" | "right" | "u-turn" | "arrive" | "roundabout";

interface DirectionBannerProps {
  direction: TurnDirection;
  distanceMeters: number;
  streetName?: string;
  nextDirection?: TurnDirection;
  nextDistanceMeters?: number;
  roundaboutExit?: number;
  nextStopTitle?: string;
  distToNextStop?: number;
}

function directionIcon(dir: TurnDirection) {
  const cls = "w-12 h-12";
  const color = "text-primary";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={`${cls} ${color}`} strokeWidth={3} />;
    case "right":
      return <CornerUpRight className={`${cls} ${color}`} strokeWidth={3} />;
    case "u-turn":
      return <RotateCcw className={`${cls} ${color}`} strokeWidth={3} />;
    case "arrive":
      return <Flag className={`${cls} ${color}`} strokeWidth={3} />;
    case "roundabout":
      return <Circle className={`${cls} ${color}`} strokeWidth={3} />;
    default:
      return <ArrowUp className={`${cls} ${color}`} strokeWidth={3} />;
  }
}

function directionLabel(dir: TurnDirection): string {
  switch (dir) {
    case "left":
      return "tournez à gauche";
    case "right":
      return "tournez à droite";
    case "u-turn":
      return "faites demi-tour";
    case "arrive":
      return "vous êtes arrivé";
    case "roundabout":
      return "prenez le rond-point";
    default:
      return "continuez tout droit";
  }
}

function splitDistance(m: number): { value: string; unit: string } {
  if (m >= 1000) return { value: (m / 1000).toFixed(1), unit: "km" };
  if (m >= 100) return { value: String(Math.round(m / 10) * 10), unit: "m" };
  return { value: String(Math.max(0, Math.round(m / 5) * 5)), unit: "m" };
}

function formatDistShort(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

const DirectionBanner = ({
  direction,
  distanceMeters,
  streetName,
  nextStopTitle,
  distToNextStop,
}: DirectionBannerProps) => {
  // Track max distance for this leg to compute progress
  const legMaxRef = useRef<number>(0);
  const [, force] = useState(0);
  useEffect(() => {
    if (distToNextStop && distToNextStop > legMaxRef.current) {
      legMaxRef.current = distToNextStop;
      force((x) => x + 1);
    }
  }, [distToNextStop]);

  // Reset when stop changes
  useEffect(() => {
    legMaxRef.current = distToNextStop ?? 0;
    force((x) => x + 1);
  }, [nextStopTitle]);

  const progress =
    distToNextStop && legMaxRef.current > 0
      ? Math.max(0, Math.min(1, 1 - distToNextStop / legMaxRef.current))
      : 0;

  const { value, unit } = splitDistance(distanceMeters);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className="absolute left-3 right-3 z-[1001] pointer-events-auto rounded-3xl bg-card shadow-elevated border border-primary/15 px-4 py-3.5"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 110px)" }}
    >
      {/* Top row: icon + instruction */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-[72px] h-[72px] rounded-full bg-primary/10 flex items-center justify-center">
          {directionIcon(direction)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground font-medium leading-tight">Dans</p>
          <p className="leading-none mt-0.5 -mb-0.5">
            <span className="text-4xl font-extrabold text-foreground tabular-nums tracking-tight">
              {value}
            </span>
            <span className="text-base font-bold text-foreground ml-1">{unit},</span>
          </p>
          <p className="text-base font-bold text-foreground mt-1.5 truncate">
            {streetName || directionLabel(direction)}
          </p>
        </div>
      </div>

      {/* Progress slider */}
      <div className="mt-3 px-1">
        <div className="relative h-2 rounded-full bg-primary/10 overflow-visible">
          <div
            className="absolute top-0 left-0 h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
          <MapPin
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-4 h-4 text-primary"
            strokeWidth={2.5}
            fill="currentColor"
          />
          <Flag
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/80"
            strokeWidth={2.5}
          />
          {/* Moving dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-card shadow-card transition-all duration-500"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
        {nextStopTitle && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground font-medium truncate pr-2">
              Prochaine étape : <span className="text-foreground font-semibold">{nextStopTitle}</span>
            </p>
            {distToNextStop !== undefined && (
              <p className="text-xs font-bold text-foreground tabular-nums flex-shrink-0">
                {formatDistShort(distToNextStop)}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DirectionBanner;
export { directionLabel };
export function formatDistance(m: number): string {
  return formatDistShort(m);
}
