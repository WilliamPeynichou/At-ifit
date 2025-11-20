import React, { useState } from 'react';
import api from '../api';
import { Plus } from 'lucide-react';

const WeightForm = ({ onUpdate }) => {
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
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/20 blur-3xl rounded-full"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
          <Plus className="w-5 h-5 text-neon-cyan" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wider">LOG NEW DATA</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end relative z-10">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-cyber"
            required
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="input-cyber"
            required
            placeholder="0.0"
          />
        </div>
        <button
          type="submit"
          className="btn-cyber w-full sm:w-auto h-[50px] flex items-center justify-center"
        >
          ADD ENTRY
        </button>
      </form>
    </div>
  );
};

export default WeightForm;
