import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface AudioOverlayProps {
  text: string;
  onDismiss: () => void;
}

const AudioOverlay = ({ text, onDismiss }: AudioOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className="absolute bottom-44 left-4 right-4 z-[1001]"
    >
      <div className="rounded-2xl p-4 border border-border bg-card/95 backdrop-blur-lg shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
            <Volume2 className="w-5 h-5 text-secondary-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-primary text-[10px] font-mono uppercase tracking-[0.2em] mb-1">
              Audio géolocalisé
            </p>
            <p className="text-foreground text-sm leading-relaxed">{text}</p>

            <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full rounded-full bg-secondary"
              />
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AudioOverlay;
