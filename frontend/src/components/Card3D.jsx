import { useRef, useState } from 'react';

export default function Card3D({ children, className = '', style = {}, glowColor = 'rgba(99, 102, 241, 0.25)' }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7.5; // Max 7.5 deg
    const rotateY = ((x - centerX) / centerX) * 7.5;

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlareStyle({ opacity: 0.15, x: glareX, y: glareY });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle({ opacity: 0, x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`card3d-wrapper ${className}`}
      style={{
        position: 'relative',
        transform,
        transition: 'transform 0.15s ease-out, box-shadow 0.25s ease-out',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        boxShadow: glareStyle.opacity > 0 ? `0 20px 40px ${glowColor}, 0 0 30px ${glowColor}` : '0 10px 30px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      {/* Glare/Specular Highlight Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit',
          background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 70%)`,
          opacity: glareStyle.opacity,
          transition: 'opacity 0.2s ease-out',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
      {children}
    </div>
  );
}
