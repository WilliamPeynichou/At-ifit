import React from 'react';

const seededPercent = (index, salt) => {
  const value = Math.sin((index + 1) * (salt + 11)) * 10000;
  return value - Math.floor(value);
};

const particles = [...Array(20)].map((_, i) => ({
  id: i,
  left: `${seededPercent(i, 1) * 100}%`,
  top: `${seededPercent(i, 2) * 100}%`,
  width: `${seededPercent(i, 3) * 3 + 1}px`,
  height: `${seededPercent(i, 4) * 3 + 1}px`,
  animationDelay: `${seededPercent(i, 5) * 5}s`,
  animationDuration: `${10 + seededPercent(i, 6) * 20}s`,
  background: i % 2 === 0
    ? 'rgba(0, 85, 255, 0.15)'
    : 'rgba(0, 85, 255, 0.08)'
}));

const ParticlesBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
            background: p.background
          }}
        />
      ))}
    </div>
  );
};

export default React.memo(ParticlesBackground);
