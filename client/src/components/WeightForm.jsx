import React, { useState } from 'react';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { Plus } from 'lucide-react';

const WeightForm = ({ onUpdate }) => {
  const { t } = useLanguage();
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/weight', { weight, date });
      setWeight('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding weight:', error);
      alert('Failed to add weight. Make sure profile is created first.');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/5 bg-black/40 h-full flex flex-col">
      <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/20 blur-3xl rounded-full"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
          <Plus className="w-5 h-5 text-neon-cyan" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wider">{t('weightForm.logNewData')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end relative z-10 flex-1">
        <div className="w-full sm:w-auto flex-shrink-0">
          <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('weightForm.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-cyber"
            required
          />
        </div>
        <div className="flex-1 w-full min-w-[125px] max-w-[50%]">
          <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">{t('weightForm.weight')}</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input-cyber h-[50px] text-base font-bold"
            required
            placeholder="0.0"
          />
        </div>
        <button
          type="submit"
          className="btn-cyber w-full sm:w-auto h-[50px] px-3 text-xs flex items-center justify-center flex-shrink-0 whitespace-nowrap"
        >
          {t('weightForm.addEntry')}
        </button>
      </form>
    </div>
  );
};

export default WeightForm;
