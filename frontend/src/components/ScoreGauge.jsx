import { useEffect, useState } from 'react';

function getColor(score) {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function ScoreGauge({ score, label }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 80;
  const stroke = 10;
  const normalizedR = radius - stroke / 2;
  const circumference = normalizedR * 2 * Math.PI;
  const pct = animated / 100;
  const dashOffset = circumference - pct * circumference;
  const color = getColor(score);

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" width={radius * 2} height={radius * 2}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={radius} cy={radius} r={normalizedR}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />

        {/* Progress */}
        <circle
          cx={radius} cy={radius} r={normalizedR}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius} ${radius})`}
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Score text */}
        <text
          x={radius} y={radius - 4}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="28" fontWeight="800" fill="white" fontFamily="Inter, sans-serif"
        >
          {Math.round(animated)}
        </text>
        <text
          x={radius} y={radius + 22}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="#9ca3af" fontFamily="Inter, sans-serif" fontWeight="500"
        >
          OUT OF 100
        </text>
      </svg>

      <span className={`gauge-label ${label}`}>{label}</span>
    </div>
  );
}
