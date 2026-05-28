import { ArrowLeft, Volume2, VolumeX, Radio } from "lucide-react";
import tiloLogo from "@/assets/tilo-logo.png";

interface NavigationTopHeaderProps {
  onBack: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const NavigationTopHeader = ({ onBack, voiceEnabled, onToggleVoice }: NavigationTopHeaderProps) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-[1002] pointer-events-none"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <div className="relative flex items-center justify-center px-4 pt-1 pb-2 pointer-events-auto">
        <button
          onClick={onBack}
          aria-label="Retour"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-card shadow-elevated border border-primary/15 flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-primary" strokeWidth={2.5} />
        </button>

        <img
          src={tiloLogo}
          alt="Tilo"
          className="h-32 sm:h-36 w-auto object-contain drop-shadow-sm select-none -my-4"
          draggable={false}
        />

        <button
          onClick={onToggleVoice}
          aria-label="Voix"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-card shadow-elevated border border-primary/15 flex items-center justify-center active:scale-95 transition-all"
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-primary" strokeWidth={2.5} />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" strokeWidth={2.5} />
          )}
        </button>
      </div>

      <div className="flex justify-center pointer-events-auto -mt-1">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card shadow-card border border-primary/20">
          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" strokeWidth={2.5} />
          <span className="text-xs font-bold text-primary tracking-wide">Navigation en direct</span>
        </div>
      </div>
    </div>
  );
};

export default NavigationTopHeader;
