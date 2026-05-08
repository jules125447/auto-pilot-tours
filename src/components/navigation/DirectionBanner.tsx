import { motion } from "framer-motion";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  Flag,
  Circle,
} from "lucide-react";

export type TurnDirection = "straight" | "left" | "right" | "u-turn" | "arrive" | "roundabout";

interface DirectionBannerProps {
  direction: TurnDirection;
  distanceMeters: number;
  streetName?: string;
  nextDirection?: TurnDirection;
  nextDistanceMeters?: number;
}

function directionIcon(dir: TurnDirection, size: "lg" | "sm" = "lg") {
  const cls = size === "lg" ? "w-10 h-10 drop-shadow-md" : "w-4 h-4";
  const color = size === "lg" ? "text-white" : "text-amber-800/70";
  switch (dir) {
    case "left":
      return <CornerUpLeft className={`${cls} ${color}`} strokeWidth={2.5} />;
    case "right":
      return <CornerUpRight className={`${cls} ${color}`} strokeWidth={2.5} />;
    case "u-turn":
      return <RotateCcw className={`${cls} ${color}`} strokeWidth={2.5} />;
    case "arrive":
      return <Flag className={`${cls} ${color}`} strokeWidth={2.5} />;
    case "roundabout":
      return <Circle className={`${cls} ${color}`} strokeWidth={2.5} />;
    default:
      return <ArrowUp className={`${cls} ${color}`} strokeWidth={2.5} />;
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
    case "roundabout":
      return "Rond-point";
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
    case "roundabout":
      return "rond-point";
    default:
      return "tout droit";
  }
}

function formatDist(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (m >= 100) return `${Math.round(m / 10) * 10} m`;
  return `${Math.max(0, Math.round(m / 5) * 5)} m`;
}

function urgencyFromDistance(m: number): "calm" | "approach" | "soon" | "now" {
  if (m <= 50) return "now";
  if (m <= 150) return "soon";
  if (m <= 400) return "approach";
  return "calm";
}

function urgencyStyles(urgency: string) {
  switch (urgency) {
    case "now":
      return {
        bg: "linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(0 75% 50%) 100%)",
        iconBg: "rgba(255,255,255,0.25)",
      };
    case "soon":
      return {
        bg: "linear-gradient(135deg, hsl(25 90% 50%) 0%, hsl(15 85% 55%) 100%)",
        iconBg: "rgba(255,255,255,0.2)",
      };
    case "approach":
      return {
        bg: "linear-gradient(135deg, hsl(42 95% 55%) 0%, hsl(25 90% 50%) 100%)",
        iconBg: "rgba(255,255,255,0.2)",
      };
    default:
      return {
        bg: "linear-gradient(135deg, hsl(30 30% 97%) 0%, hsl(25 35% 93%) 100%)",
        iconBg: "linear-gradient(135deg, hsl(15 85% 55% / 0.18), hsl(42 95% 55% / 0.12))",
      };
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
  const isCalm = urgency === "calm";
  const styles = urgencyStyles(urgency);

  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] pointer-events-none">
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="pointer-events-auto shadow-elevated"
        style={{
          background: styles.bg,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
          transition: "background 400ms ease",
        }}
      >
        <div className="flex items-center gap-4 px-5 pb-4 pt-1">
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
            style={{ background: styles.iconBg, backdropFilter: "blur(8px)" }}
          >
            {directionIcon(direction, "lg")}
          </motion.div>

          <div className="flex-1 min-w-0">
            <p
              className={`font-extrabold leading-none tabular-nums tracking-tight ${
                isCalm ? "text-foreground" : "text-white"
              }`}
              style={{ fontSize: isNow ? "32px" : "28px" }}
            >
              {isNow && direction !== "straight" ? "Maintenant" : formatDist(distanceMeters)}
            </p>
            <p className={`text-sm mt-1 truncate font-medium ${isCalm ? "text-muted-foreground" : "text-white/80"}`}>
              {streetName || directionLabel(direction)}
            </p>
          </div>
        </div>

        {/* "Puis…" preview */}
        {nextDirection && nextDistanceMeters !== undefined && (
          <div className={`flex items-center gap-2.5 px-5 py-2.5 border-t ${
            isCalm
              ? "bg-muted/50 border-border"
              : "bg-black/10 border-white/10"
          }`}>
            <div className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
              isCalm ? "bg-primary/10" : "bg-white/15"
            }`}>
              {directionIcon(nextDirection, "sm")}
            </div>
            <p className={`text-xs font-semibold flex-1 truncate ${isCalm ? "text-muted-foreground" : "text-white/70"}`}>
              Puis {shortLabel(nextDirection)}
            </p>
            <p className={`text-xs font-bold tabular-nums ${isCalm ? "text-muted-foreground" : "text-white/60"}`}>
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
