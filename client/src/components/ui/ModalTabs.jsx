import React, { useId, useRef, useState } from 'react';

const ModalTabs = ({ tabs, accent = '#0055ff', defaultIndex = 0 }) => {
  const [active, setActive] = useState(defaultIndex);
  const id = useId();
  const tabRefs = useRef([]);
  const activeIndex = Math.min(Math.max(active, 0), Math.max(tabs.length - 1, 0));
  const handleKeyDown = (event, index) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div
        role="tablist"
        aria-label="Sections du graphique"
        className="flex items-center gap-1 px-6 py-3 overflow-x-auto custom-scrollbar"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        {tabs.map((tab, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              type="button"
              ref={element => { tabRefs.current[idx] = element; }}
              id={`${id}-tab-${idx}`}
              aria-controls={`${id}-panel-${idx}`}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={event => handleKeyDown(event, idx)}
              role="tab"
              aria-selected={isActive}
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

      {tabs.map((tab, idx) => (
        <div
          key={tab.label}
          id={`${id}-panel-${idx}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${idx}`}
          hidden={idx !== activeIndex}
          tabIndex={0}
          className={idx === activeIndex ? 'flex-1 overflow-y-auto custom-scrollbar p-6' : undefined}
        >
          {idx === activeIndex ? tab.content : null}
        </div>
      ))}
    </div>
  );
};

export default ModalTabs;
