import { useEffect, useState } from 'react';

const DIMENSIONS = [
  { key: 'sharpness', label: 'Sharpness', color: '#6366f1' },
  { key: 'exposure', label: 'Exposure', color: '#8b5cf6' },
  { key: 'noise', label: 'Noise Clarity', color: '#a78bfa' },
  { key: 'contrast', label: 'Contrast', color: '#10b981' },
  { key: 'saturation', label: 'Saturation', color: '#06b6d4' },
];

export default function ExplainabilityPanel({ explainability }) {
  const [animated, setAnimated] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(explainability), 200);
    return () => clearTimeout(timer);
  }, [explainability]);

  return (
    <div>
      {DIMENSIONS.map(({ key, label, color }) => {
        let val = animated[key] ?? 0;
        // Auto-scale if decimal 0.0 - 1.0 is received
        if (val > 0 && val <= 1.0) {
          val = val * 100;
        }
        const score = Math.max(0, Math.min(100, Math.round(val)));

        return (
          <div className="explain-row" key={key}>
            <span className="explain-label">{label}</span>
            <div className="explain-bar-track">
              <div
                className="explain-bar-fill"
                style={{
                  width: `${score}%`,
                  background: `linear-gradient(90deg, ${color}88, ${color})`,
                }}
              />
            </div>
            <span className="explain-score">{score}</span>
          </div>
        );
      })}
    </div>
  );
}
