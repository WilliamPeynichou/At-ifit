import React from 'react';
import { Apple, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import NutritionProfileForm from '../components/nutrition/NutritionProfileForm';
import DailyNeeds from '../components/nutrition/DailyNeeds';
import NutritionGuide from './NutritionGuide';

export default function Nutrition() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Apple className="w-9 h-9" style={{ color: 'var(--accent-blue)' }} />
            Nutrition
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Ton profil nutrition général, tes besoins journaliers et le guide. La stratégie de chaque course se calcule dans « Préparer une course ».
          </p>
        </div>
        <Link to="/preparer-course" className="btn-primary flex items-center gap-2 self-start">
          <Flag size={16} /> Préparer une course
        </Link>
      </div>

      <NutritionProfileForm />
      <DailyNeeds />

      <NutritionGuide embedded />
    </div>
  );
}
