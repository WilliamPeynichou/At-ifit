import React from 'react';
import { Sparkles } from 'lucide-react';

const AnalyticsPlaceholder = ({ title = 'Bientôt', description = 'Section en cours de construction' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="p-6 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid var(--glass-border)' }}>
      <Sparkles size={48} style={{ color: 'var(--text-muted)' }} />
    </div>
    <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)' }}>{description}</p>
  </div>
);

export default AnalyticsPlaceholder;
