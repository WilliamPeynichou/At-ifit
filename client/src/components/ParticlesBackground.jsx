import React, { useMemo } from 'react';

const ParticlesBackground = () => {
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${10 + Math.random() * 20}s`,
      background: i % 2 === 0
        ? 'rgba(249, 115, 22, 0.5)'
        : 'rgba(0, 85, 255, 0.4)'
    }));
  }, []);

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
