import { motion } from "framer-motion";
import { Pause, Play, List, X, Route, Clock, Gauge, Flag, type LucideIcon } from "lucide-react";

interface NavigationBarProps {
  currentStop?: {
    id: string;
    title: string;
    type: string;
    duration: string | null;
  };
  currentStopIndex?: number;
  totalStops?: number;
  distanceRemaining: number;
  etaMinutes: number;
  distToNextStop?: number;
  etaNextStop?: number;
  onNext?: () => void;
  onPrev?: () => void;
  hasGps: boolean;
  isLastStopDone?: boolean;
  speed?: number | null;
  onStop?: () => void;
  approachingStart?: boolean;
  distToStart?: number | null;
  etaToStartSeconds?: number | null;
  paused?: boolean;
  onTogglePause?: () => void;
  onShowSteps?: () => void;
}

function formatArrivalTime(etaMinutes: number): string {
  if (!etaMinutes || etaMinutes <= 0) return "--:--";
  const arrival = new Date(Date.now() + etaMinutes * 60 * 1000);
  return arrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatKm(meters: number): { value: string; unit: string } {
  if (!meters || meters <= 0) return { value: "—", unit: "" };
  if (meters >= 1000) return { value: String(Math.round(meters / 1000)), unit: "km" };
  return { value: String(Math.round(meters)), unit: "m" };
}

function formatHM(minutes: number): { value: string; unit: string } {
  if (!minutes || minutes <= 0) return { value: "—", unit: "" };
  if (minutes < 60) return { value: String(Math.round(minutes)), unit: "min" };
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return { value: m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`, unit: "" };
}

const Stat = ({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
}) => (
  <div className="flex-1 flex flex-col items-center text-center gap-1.5 px-1">
    <Icon className="w-5 h-5 text-primary" strokeWidth={2.5} />
    <p className="text-[10px] text-muted-foreground font-medium leading-none">{label}</p>
    <p className="leading-none">
      <span className="text-lg font-extrabold text-foreground tabular-nums tracking-tight">{value}</span>
      {unit && <span className="text-xs font-semibold text-muted-foreground ml-1">{unit}</span>}
    </p>
  </div>
);

const NavigationBar = ({
  distanceRemaining,
  etaMinutes,
  hasGps,
  speed,
  onStop,
  paused = false,
  onTogglePause,
  onShowSteps,
}: NavigationBarProps) => {
  const arrivalTime = formatArrivalTime(etaMinutes);
  const dist = hasGps ? formatKm(distanceRemaining) : { value: "—", unit: "" };
  const time = hasGps ? formatHM(etaMinutes) : { value: "—", unit: "" };
  const spd = hasGps && speed != null && speed >= 0
    ? { value: String(Math.round(speed)), unit: "km/h" }
    : { value: "—", unit: "" };

  return (
    <div className="relative z-[1000] pointer-events-none">
      {/* Stats card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute left-3 right-3 pointer-events-auto rounded-3xl bg-card shadow-elevated border border-primary/15 px-3 py-3.5 flex items-stretch"
        style={{ bottom: "calc(100% + 10px)" }}
      >
        <Stat icon={Route} label="Distance restante" value={dist.value} unit={dist.unit} />
        <div className="w-px bg-border my-1" />
        <Stat icon={Clock} label="Temps restant" value={time.value} unit={time.unit} />
        <div className="w-px bg-border my-1" />
        <Stat icon={Gauge} label="Vitesse" value={spd.value} unit={spd.unit} />
        <div className="w-px bg-border my-1" />
        <Stat icon={Flag} label="Arrivée" value={arrivalTime} />
      </motion.div>

      {/* Action bar */}
      <div
        className="pointer-events-auto px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", paddingTop: 6 }}
      >
        <div className="flex items-stretch gap-2">
          <button
            onClick={onTogglePause}
            className="flex-1 h-12 rounded-2xl bg-card shadow-card border border-primary/15 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {paused ? (
              <Play className="w-4 h-4 text-primary" strokeWidth={2.8} fill="currentColor" />
            ) : (
              <Pause className="w-4 h-4 text-primary" strokeWidth={2.8} fill="currentColor" />
            )}
            <span className="text-sm font-bold text-foreground">{paused ? "Reprendre" : "Pause"}</span>
          </button>

          <button
            onClick={onShowSteps}
            className="flex-1 h-12 rounded-2xl bg-card shadow-card border border-primary/15 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <List className="w-4 h-4 text-foreground" strokeWidth={2.5} />
            <span className="text-sm font-bold text-foreground">Étapes</span>
          </button>

          <button
            onClick={onStop}
            className="flex-1 h-12 rounded-2xl bg-card shadow-card border border-destructive/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <X className="w-4 h-4 text-destructive" strokeWidth={2.8} />
            <span className="text-sm font-bold text-destructive">Quitter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
