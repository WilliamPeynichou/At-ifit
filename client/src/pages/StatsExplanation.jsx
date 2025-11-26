import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Info, TrendingUp, TrendingDown, Target, Activity, Heart, Flame, Calendar, Scale, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatsExplanation = () => {
  const { t } = useLanguage();

  // Scroll to section if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, []);

  const statsSections = [
    {
      icon: Scale,
      title: t('stats.bmi.title'),
      description: t('stats.bmi.description'),
      whatIs: t('stats.bmi.whatIs'),
      whatIsDesc: t('stats.bmi.whatIsDesc'),
      calculation: t('stats.bmi.calculation'),
      calculationDesc: t('stats.bmi.calculationDesc'),
      genderDifferences: t('stats.bmi.genderDifferences'),
      genderDifferencesDesc: t('stats.bmi.genderDifferencesDesc'),
      transgenderConsiderations: t('stats.bmi.transgenderConsiderations'),
      transgenderConsiderationsDesc: t('stats.bmi.transgenderConsiderationsDesc'),
      possibleValues: t('stats.bmi.possibleValues'),
      possibleValuesDesc: t('stats.bmi.possibleValuesDesc'),
      categories: [
        { range: '< 18.5', label: t('stats.bmi.underweight'), color: 'text-blue-400', consequences: t('stats.bmi.underweightConsequences') },
        { range: '18.5 - 24.9', label: t('stats.bmi.normal'), color: 'text-green-400', consequences: t('stats.bmi.normalConsequences') },
        { range: '25 - 29.9', label: t('stats.bmi.overweight'), color: 'text-amber-400', consequences: t('stats.bmi.overweightConsequences') },
        { range: '≥ 30', label: t('stats.bmi.obese'), color: 'text-rose-400', consequences: t('stats.bmi.obeseConsequences') }
      ]
    },
    {
      icon: Activity,
      title: t('stats.relativeEffort.title'),
      description: t('stats.relativeEffort.description'),
      whatIs: t('stats.relativeEffort.whatIs'),
      whatIsDesc: t('stats.relativeEffort.whatIsDesc'),
      calculation: t('stats.relativeEffort.calculation'),
      calculationDesc: t('stats.relativeEffort.calculationDesc'),
      howToRead: t('stats.relativeEffort.howToRead'),
      howToReadDesc: t('stats.relativeEffort.howToReadDesc'),
      ranges: t('stats.relativeEffort.ranges'),
      rangesDesc: t('stats.relativeEffort.rangesDesc')
    },
    {
      icon: TrendingDown,
      title: t('stats.dayDelta7.title'),
      description: t('stats.dayDelta7.description'),
      consequences: t('stats.dayDelta7.consequences')
    },
    {
      icon: TrendingDown,
      title: t('stats.dayDelta30.title'),
      description: t('stats.dayDelta30.description'),
      consequences: t('stats.dayDelta30.consequences')
    },
    {
      icon: TrendingDown,
      title: t('stats.weeklyAvg.title'),
      description: t('stats.weeklyAvg.description'),
      consequences: t('stats.weeklyAvg.consequences')
    },
    {
      icon: TrendingDown,
      title: t('stats.monthlyAvg.title'),
      description: t('stats.monthlyAvg.description'),
      consequences: t('stats.monthlyAvg.consequences')
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

      {/* TCA Warning Section - First thing visible */}
      <div className="mb-12 glass-panel rounded-2xl p-6 border-2 border-red-500/50 bg-red-950/20 hover:border-red-500/70 transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 flex-shrink-0">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-red-400 mb-3 tracking-wider">
              {t('stats.tcaWarning.title')}
            </h2>
            <div className="space-y-3 text-slate-200 leading-relaxed">
              <p className="text-lg">
                {t('stats.tcaWarning.intro')}
              </p>
              <p>
                {t('stats.tcaWarning.definition')}
              </p>
              <p className="font-semibold text-red-300">
                {t('stats.tcaWarning.danger')}
              </p>
              <div className="mt-4 pt-4 border-t border-red-500/30">
                <a
                  href="https://www.inicea.fr/articles/nos-articles/les-troubles-du-comportement-alimentaire-TCA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-bold transition-all group"
                >
                  <span>{t('stats.tcaWarning.learnMore')}</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-6">
        {statsSections.map((stat, index) => {
          const Icon = stat.icon;
          // Add id for sections to enable anchor navigation
          let sectionId;
          if (stat.title === t('stats.bmi.title')) {
            sectionId = 'bmi';
          } else if (stat.title === t('stats.relativeEffort.title')) {
            sectionId = 'relative-effort';
          } else if (stat.title === t('stats.calories.title')) {
            sectionId = 'calories';
          } else if (stat.title === t('stats.dailyFuel.title')) {
            sectionId = 'daily-fuel';
          }
          return (
            <div
              key={index}
              id={sectionId}
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
                  {stat.whatIs && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.whatIs}</h3>
                      <p className="text-slate-300 leading-relaxed">
                        {stat.whatIsDesc}
                      </p>
                    </div>
                  )}
                  {stat.calculation && (
                    <div className="mb-4">
                      <div className="bg-black/30 rounded-lg p-3 mb-2 border border-white/5">
                        <p className="text-sm text-slate-400 font-mono">
                          {stat.calculation}
                        </p>
                      </div>
                      {stat.calculationDesc && (
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {stat.calculationDesc}
                        </p>
                      )}
                    </div>
                  )}
                  {stat.genderDifferences && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.genderDifferences}</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {stat.genderDifferencesDesc}
                      </p>
                    </div>
                  )}
                  {stat.transgenderConsiderations && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.transgenderConsiderations}</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {stat.transgenderConsiderationsDesc}
                      </p>
                    </div>
                  )}
                  {stat.possibleValues && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.possibleValues}</h3>
                      <p className="text-slate-300 leading-relaxed">
                        {stat.possibleValuesDesc}
                      </p>
                    </div>
                  )}
                  {stat.howToRead && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.howToRead}</h3>
                      <p className="text-slate-300 leading-relaxed">
                        {stat.howToReadDesc}
                      </p>
                    </div>
                  )}
                  {stat.ranges && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{stat.ranges}</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {stat.rangesDesc}
                      </p>
                    </div>
                  )}
                  {stat.categories && (
                    <div className="mt-4 space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-2">{t('stats.bmi.categoriesTitle')}</h3>
                      {stat.categories.map((cat, idx) => (
                        <div key={idx} className="bg-black/30 rounded-lg p-4 border border-white/5">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-slate-300 w-32 font-bold">{cat.range}</span>
                            <span className={`font-bold text-lg ${cat.color}`}>{cat.label}</span>
                          </div>
                          {cat.consequences && (
                            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                              {cat.consequences}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {stat.consequences && (
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <h3 className="text-sm font-bold text-blue-300 mb-2">{t('stats.consequences')}</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {stat.consequences}
                      </p>
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

