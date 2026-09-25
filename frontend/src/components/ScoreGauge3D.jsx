import { useEffect, useState } from 'react';

export default function ScoreGauge3D({ score = 0, label = 'UNKNOWN' }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.min(100, Math.max(0, score));
    const duration = 1200;
    const startTime = performance.now();

    const updateScore = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * ease;
      setAnimatedScore(current);

      if (progress < 1) {
        requestAnimationFrame(updateScore);
      }
    };

    requestAnimationFrame(updateScore);
  }, [score]);

  const getStatusColor = (val, labelStr) => {
    if (labelStr === 'DEFECTIVE' || val < 50) return '#ef4444';
    if (labelStr === 'DEGRADED' || val < 80) return '#f59e0b';
    return '#10b981';
  };

  const color = getStatusColor(animatedScore, label);

  const radius = 72;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0.5rem 0' }}>
      <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            filter: 'blur(15px)',
            transition: 'background 0.5s ease',
          }}
        />

        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 10px ${color}88)` }}>
          <defs>
            <linearGradient id="score-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
          </defs>

          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />

          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#score-cyan-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.5s ease' }}
          />
        </svg>

        <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '2.8rem',
              fontWeight: 800,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '-0.03em',
              background: `linear-gradient(135deg, #ffffff 30%, ${color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: `0 0 20px ${color}44`,
            }}
          >
            {animatedScore.toFixed(0)}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            / 100
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          padding: '6px 16px',
          borderRadius: '20px',
          background: `${color}18`,
          border: `1px solid ${color}44`,
          color: color,
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          boxShadow: `0 0 15px ${color}22`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {label}
      </div>
    </div>
  );
}
