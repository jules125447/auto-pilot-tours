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
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 130px)" }}
    >
      <div className="relative">
        {/* Speed limit ring (red circle) — Waze style */}
        {speedLimit !== null && (
          <div className="absolute -top-2 -right-2 w-11 h-11 rounded-full bg-white border-[3px] border-red-500 flex items-center justify-center shadow-md z-10">
            <span className="text-black text-base font-extrabold leading-none">
              {speedLimit}
            </span>
          </div>
        )}

        {/* Speed bubble */}
        <div
          className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-[0_4px_18px_rgba(0,0,0,0.25)] border-[3px] ${
            over ? "bg-red-500 border-white" : "bg-white border-white"
          }`}
        >
          <span
            className={`text-[26px] font-extrabold leading-none tabular-nums ${
              over ? "text-white" : "text-neutral-900"
            }`}
          >
            {displaySpeed}
          </span>
          <span
            className={`text-[10px] font-semibold leading-none mt-1 uppercase tracking-wider ${
              over ? "text-white/90" : "text-neutral-500"
            }`}
          >
            km/h
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
