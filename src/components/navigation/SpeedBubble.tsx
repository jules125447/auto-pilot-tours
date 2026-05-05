import { motion } from "framer-motion";

interface SpeedBubbleProps {
  speed: number | null;
  speedLimit?: number | null;
}

const SpeedBubble = ({ speed, speedLimit = null }: SpeedBubbleProps) => {
  const displaySpeed = speed !== null && speed >= 0 ? Math.round(speed) : 0;
  const over = speedLimit !== null && displaySpeed > speedLimit;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 260 }}
      className="absolute left-3 z-[1002]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}
    >
      <div className="relative">
        {speedLimit !== null && (
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-card border-[2.5px] border-destructive flex items-center justify-center shadow-card z-10">
            <span className="text-foreground text-xs font-extrabold leading-none">{speedLimit}</span>
          </div>
        )}

        <div
          className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center shadow-elevated border-2 ${
            over
              ? "bg-destructive border-destructive/60"
              : "bg-card/95 border-primary/20 backdrop-blur-xl"
          }`}
        >
          <span className={`text-[20px] font-extrabold leading-none tabular-nums ${
            over ? "text-white" : "text-foreground"
          }`}>
            {displaySpeed}
          </span>
          <span className={`text-[7px] font-bold leading-none mt-0.5 uppercase tracking-widest ${
            over ? "text-white/70" : "text-muted-foreground"
          }`}>
            km/h
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
