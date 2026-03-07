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
      <div
        className="rounded-2xl p-4 border border-white/10"
        style={{
          background: "linear-gradient(135deg, rgba(0,0,0,0.85), rgba(20,40,30,0.9))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-start gap-3">
          {/* Animated sound wave icon */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(152 50% 35%), hsl(205 55% 45%))" }}
          >
            <Volume2 className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">
              Audio géolocalisé
            </p>
            <p className="text-white/90 text-sm leading-relaxed">{text}</p>

            {/* Progress bar */}
            <div className="mt-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(152 50% 42%), hsl(205 55% 50%))",
                }}
              />
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <VolumeX className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AudioOverlay;
