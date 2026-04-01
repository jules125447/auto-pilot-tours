import { motion } from "framer-motion";

interface SpeedBubbleProps {
  speed: number | null;
}

const SpeedBubble = ({ speed }: SpeedBubbleProps) => {
  const displaySpeed = speed !== null && speed >= 0 ? speed : 0;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute bottom-44 left-4 z-[1002]"
    >
      <div className="w-16 h-16 rounded-full bg-card/95 backdrop-blur-md border-2 border-border shadow-lg flex flex-col items-center justify-center">
        <span className="text-foreground text-xl font-bold leading-none">
          {displaySpeed}
        </span>
        <span className="text-muted-foreground text-[9px] font-medium leading-none mt-0.5">
          km/h
        </span>
      </div>
    </motion.div>
  );
};

export default SpeedBubble;
