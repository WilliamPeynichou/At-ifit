import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Info, TrendingUp, TrendingDown, Target, Activity, Heart, Flame, Calendar, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatsExplanation = () => {
  const { t } = useLanguage();

  const statsSections = [
    {
      icon: Scale,
      title: t('stats.bmi.title'),
      description: t('stats.bmi.description'),
      calculation: t('stats.bmi.calculation'),
      categories: [
        { range: '< 18.5', label: t('stats.bmi.underweight'), color: 'text-blue-400' },
        { range: '18.5 - 24.9', label: t('stats.bmi.normal'), color: 'text-green-400' },
        { range: '25 - 29.9', label: t('stats.bmi.overweight'), color: 'text-amber-400' },
        { range: '≥ 30', label: t('stats.bmi.obese'), color: 'text-rose-400' }
      ]
    },
    {
      icon: Calendar,
      title: t('stats.startDate.title'),
      description: t('stats.startDate.description')
    },
    {
      icon: Activity,
      title: t('stats.daysActive.title'),
      description: t('stats.daysActive.description')
    },
    {
      icon: TrendingUp,
      title: t('stats.peakWeight.title'),
      description: t('stats.peakWeight.description')
    },
    {
      icon: TrendingDown,
      title: t('stats.lowestWeight.title'),
      description: t('stats.lowestWeight.description')
    },
    {
      icon: Target,
      title: t('stats.totalLogs.title'),
      description: t('stats.totalLogs.description')
    },
    {
      icon: TrendingDown,
      title: t('stats.dayDelta7.title'),
      description: t('stats.dayDelta7.description')
    },
    {
      icon: TrendingDown,
      title: t('stats.dayDelta30.title'),
      description: t('stats.dayDelta30.description')
    },
    {
      icon: TrendingDown,
      title: t('stats.weeklyAvg.title'),
      description: t('stats.weeklyAvg.description')
    },
    {
      icon: TrendingDown,
      title: t('stats.monthlyAvg.title'),
      description: t('stats.monthlyAvg.description')
    },
    {
      icon: Target,
      title: t('stats.daysToGoal.title'),
      description: t('stats.daysToGoal.description'),
      note: t('stats.daysToGoal.note')
    },
    {
      icon: Activity,
      title: t('stats.correlation.title'),
      description: t('stats.correlation.description')
    },
    {
      icon: Activity,
      title: t('stats.distance.title'),
      description: t('stats.distance.description')
    },
    {
      icon: Flame,
      title: t('stats.calories.title'),
      description: t('stats.calories.description')
    },
    {
      icon: Heart,
      title: t('stats.bpm.title'),
      description: t('stats.bpm.description')
    },
    {
      icon: Flame,
      title: t('stats.dailyFuel.title'),
      description: t('stats.dailyFuel.description')
    },
    {
      icon: Calendar,
      title: t('stats.timeToGoal.title'),
      description: t('stats.timeToGoal.description')
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30">
            <Info className="w-8 h-8 text-neon-cyan" />
          </div>
          <h1 className="text-4xl font-black tracking-widest">
            <span className="text-white">{t('stats.pageTitle')}</span>
          </h1>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          {t('stats.pageSubtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="space-y-6">
        {statsSections.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 hover:border-neon-cyan/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex-shrink-0">
                  <Icon className="w-6 h-6 text-neon-cyan" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2 tracking-wider">
                    {stat.title}
                  </h2>
                  <p className="text-slate-300 mb-3 leading-relaxed">
                    {stat.description}
                  </p>
                  {stat.calculation && (
                    <div className="bg-black/30 rounded-lg p-3 mb-3 border border-white/5">
                      <p className="text-sm text-slate-400 font-mono">
                        {stat.calculation}
                      </p>
                    </div>
                  )}
                  {stat.categories && (
                    <div className="mt-4 space-y-2">
                      {stat.categories.map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <span className="font-mono text-slate-400 w-24">{cat.range}</span>
                          <span className={`font-bold ${cat.color}`}>{cat.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stat.note && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-sm text-amber-300">
                        <strong>{t('stats.note')}:</strong> {stat.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg text-neon-cyan font-bold transition-all"
        >
          ← {t('stats.backToDashboard')}
        </Link>
      </div>
    </div>
  );
};

export default StatsExplanation;

