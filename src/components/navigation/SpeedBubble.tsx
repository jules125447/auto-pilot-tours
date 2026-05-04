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
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)" }}
    >
      <div className="relative">
        {/* Speed limit ring (red circle) — Waze style */}
        {speedLimit !== null && (
          <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-white border-[2.5px] border-red-500 flex items-center justify-center shadow-md z-10">
            <span className="text-black text-xs font-extrabold leading-none">
              {speedLimit}
            </span>
          </div>
        )}

        {/* Dark speed bubble — like Waze */}
        <div
          className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.3)] border-[2.5px] ${
            over ? "bg-red-500 border-red-300" : "bg-[#2d2d3a] border-white/20"
          }`}
        >
          <span
            className={`text-[22px] font-extrabold leading-none tabular-nums ${
              over ? "text-white" : "text-white"
            }`}
          >
            {displaySpeed}
          </span>
          <span className="text-[8px] font-semibold leading-none mt-0.5 uppercase tracking-wider text-white/60">
            km/h
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
