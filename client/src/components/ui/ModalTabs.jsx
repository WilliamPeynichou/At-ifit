import React, { useState } from 'react';

const ModalTabs = ({ tabs, accent = '#0055ff', defaultIndex = 0 }) => {
  const [active, setActive] = useState(defaultIndex);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-1 px-6 py-3 overflow-x-auto custom-scrollbar"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === active;
          return (
            <button
              key={tab.label}
              onClick={() => setActive(idx)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap"
              style={isActive ? {
                background: accent,
                color: '#fff',
                boxShadow: `0 0 20px ${accent}40`,
              } : {
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {tab.icon && <span className="flex items-center">{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {tabs[active]?.content}
      </div>
    </div>
  );
};

export default ModalTabs;
