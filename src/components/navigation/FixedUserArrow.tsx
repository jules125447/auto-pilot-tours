interface FixedUserArrowProps {
  anchorY: number;
  bearing: number;
  visible: boolean;
}

const FixedUserArrow = ({ anchorY, visible }: FixedUserArrowProps) => {
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 z-[1150]"
      style={{ top: `${anchorY * 100}%`, transform: "translate(-50%, -50%)" }}
    >
      <div className="waze-arrow-shell">
        <div className="waze-arrow-pulse" />
        <div className="waze-arrow-icon">
          <svg viewBox="0 0 40 40" width="40" height="40">
            <defs>
              <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(15, 85%, 55%)" />
                <stop offset="100%" stopColor="hsl(42, 95%, 55%)" />
              </linearGradient>
            </defs>
            <polygon
              points="20,4 8,32 20,26 32,32"
              fill="url(#arrowGrad)"
              stroke="white"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FixedUserArrow;
