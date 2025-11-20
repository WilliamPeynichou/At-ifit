import React, { useState, useEffect } from 'react';
import api from '../api';
import { User } from 'lucide-react';

const UserProfile = ({ onUpdate }) => {
  const [formData, setFormData] = useState({
    height: '',
    age: '',
    pseudo: '',
    gender: 'male',
    targetWeight: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/user');
      if (res.data) {
        setFormData(res.data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/user', formData);
      if (onUpdate) onUpdate();
      alert('Profile updated!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="text-neon-cyan animate-pulse">LOADING PROFILE DATA...</div>;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-neon-purple/20 blur-3xl rounded-full"></div>
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
          <User className="w-5 h-5 text-neon-purple" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wider">PILOT PROFILE</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Call Sign</label>
            <input
              type="text"
              name="pseudo"
              value={formData.pseudo}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="input-cyber"
            >
              <option value="male" className="bg-slate-900">Male</option>
              <option value="female" className="bg-slate-900">Female</option>
              <option value="other" className="bg-slate-900">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Height (cm)</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="input-cyber"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-neon-cyan mb-2 uppercase tracking-widest">Target Weight (kg) <span className="text-neon-purple ml-2">/// MISSION GOAL</span></label>
            <input
              type="number"
              name="targetWeight"
              value={formData.targetWeight || ''}
              onChange={handleChange}
              className="input-cyber border-neon-purple/30 focus:border-neon-purple"
              placeholder="OPTIONAL"
            />
          </div>
          {formData.consoKcal && (
            <div className="col-span-2 mt-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-green-400 mb-2 uppercase tracking-widest">Daily Fuel Target <span className="text-green-600 ml-2">/// CALCULATED</span></label>
                <div className="input-cyber bg-green-500/10 border-green-500/30 text-green-400 font-mono text-lg flex items-center justify-between">
                  <span>{formData.consoKcal} KCAL</span>
                </div>
              </div>
              {formData.weeksToGoal && (
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-2 uppercase tracking-widest">Est. Time to Goal <span className="text-blue-600 ml-2">/// PROJECTED</span></label>
                  <div className="input-cyber bg-blue-500/10 border-blue-500/30 text-blue-400 font-mono text-lg flex items-center justify-between">
                    <span>{formData.weeksToGoal} WEEKS</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn-cyber w-full"
        >
          UPDATE RECORDS
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
