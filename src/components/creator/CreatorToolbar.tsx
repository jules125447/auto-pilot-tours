import { Route, MapPin, Volume2, MousePointer, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EditorMode } from "@/pages/CircuitCreator";

interface CreatorToolbarProps {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  onUndoRoute: () => void;
  routeLength: number;
}

const tools: { mode: EditorMode; icon: typeof Route; label: string }[] = [
  { mode: "select", icon: MousePointer, label: "Sélection" },
  { mode: "route", icon: Route, label: "Tracer la route" },
  { mode: "stop", icon: MapPin, label: "Point d'intérêt" },
  { mode: "audio", icon: Volume2, label: "Zone audio" },
];

const CreatorToolbar = ({ mode, setMode, onUndoRoute, routeLength }: CreatorToolbarProps) => {
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
          <Button variant="ghost" size="sm" onClick={onUndoRoute} className="gap-1">
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Annuler</span>
          </Button>
        </>
      )}
    </div>
  );
};

export default CreatorToolbar;
