import { Route, MapPin, Volume2, MousePointer, Undo2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistance, formatDuration } from "@/lib/routing";
import type { EditorMode } from "@/pages/CircuitCreator";

interface CreatorToolbarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onUndoRoute: () => void;
  onClearRoute: () => void;
  routeLength: number;
  routeLoading: boolean;
  totalDistance: number;
  totalDuration: number;
}

const tools: { mode: EditorMode; icon: typeof Route; label: string }[] = [
  { mode: "select", icon: MousePointer, label: "Sélection" },
  { mode: "route", icon: Route, label: "Tracer la route" },
  { mode: "stop", icon: MapPin, label: "Point d'intérêt" },
  { mode: "audio", icon: Volume2, label: "Zone audio" },
];

const CreatorToolbar = ({
  mode,
  setMode,
  onUndoRoute,
  onClearRoute,
  routeLength,
  routeLoading,
  totalDistance,
  totalDuration,
}: CreatorToolbarProps) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-xl shadow-elevated p-1.5 border border-border">
      {tools.map((tool) => (
        <Button
          key={tool.mode}
          variant={mode === tool.mode ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode(tool.mode)}
          className="gap-2"
        >
          <tool.icon className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{tool.label}</span>
        </Button>
      ))}

      {mode === "route" && routeLength > 0 && (
        <>
          <div className="w-px h-6 bg-border mx-1" />
          {routeLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {totalDistance > 0 && (
            <span className="text-xs text-muted-foreground px-1 hidden sm:inline">
              {formatDistance(totalDistance)} · {formatDuration(totalDuration)}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onUndoRoute} className="gap-1" disabled={routeLoading}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearRoute} className="gap-1 text-destructive hover:text-destructive" disabled={routeLoading}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export default CreatorToolbar;
