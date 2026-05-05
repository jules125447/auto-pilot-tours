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
      <div className="waze-arrow-shell-lg">
        <div className="waze-arrow-pulse-lg" />
        <div className="waze-arrow-icon-lg">
          <svg viewBox="0 0 48 48" width="56" height="56">
            <defs>
              <linearGradient id="arrowGradFixed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(15, 85%, 55%)" />
                <stop offset="100%" stopColor="hsl(42, 95%, 55%)" />
              </linearGradient>
              <filter id="arrowShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(15, 85%, 55%)" floodOpacity="0.4" />
              </filter>
            </defs>
            <polygon
              points="24,4 9,40 24,32 39,40"
              fill="url(#arrowGradFixed)"
              stroke="white"
              strokeWidth="3"
              strokeLinejoin="round"
              filter="url(#arrowShadow)"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FixedUserArrow;
