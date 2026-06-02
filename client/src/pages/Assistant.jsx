import React from 'react';
import Chatbot from '../components/Chatbot';

const Assistant = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
      <div className="mb-4 md:mb-6">
        <p className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: 'var(--accent-blue)' }}>
          Coach IA
        </p>
        <h1 className="text-2xl md:text-4xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
          Assistant sportif
        </h1>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
          Pose tes questions sur tes activités, ta charge, tes tendances ou tes objectifs. Les actions proposées devront toujours être validées avant exécution.
        </p>
      </div>

      <Chatbot variant="page" />
    </div>
  );
};

export default Assistant;
