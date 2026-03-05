import React, { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Info, TrendingUp, TrendingDown, Target, Activity, Heart, Flame, Calendar, Scale, AlertTriangle, ExternalLink, ChevronLeft, BookOpen } from 'lucide-react';
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
        { range: '< 18.5', label: t('stats.bmi.underweight'), color: 'text-blue-600', consequences: t('stats.bmi.underweightConsequences') },
        { range: '18.5 - 24.9', label: t('stats.bmi.normal'), color: 'text-green-600', consequences: t('stats.bmi.normalConsequences') },
        { range: '25 - 29.9', label: t('stats.bmi.overweight'), color: 'text-amber-600', consequences: t('stats.bmi.overweightConsequences') },
        { range: '≥ 30', label: t('stats.bmi.obese'), color: 'text-rose-600', consequences: t('stats.bmi.obeseConsequences') }
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

  const quickNavLinks = [
    { anchor: '#bmi', label: 'IMC', icon: Scale },
    { anchor: '#relative-effort', label: 'Effort Relatif', icon: Activity },
    { anchor: '#calories', label: 'Calories', icon: Flame },
    { anchor: '#daily-fuel', label: 'Carburant', icon: Heart },
  ];

  const scrollTo = (anchor) => {
    const el = document.querySelector(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ChevronLeft className="w-4 h-4" />
          Retour au dashboard
        </Link>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 flex-shrink-0" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.25)', borderRadius: '12px' }}>
            <BookOpen className="w-6 h-6" style={{ color: 'var(--accent-blue)' }} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {t('stats.pageTitle')}
            </h1>
            <p className="mt-1 text-base" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
              {t('stats.pageSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick navigation buttons */}
        <div className="flex flex-wrap gap-2 mt-6">
          {quickNavLinks.map(({ anchor, label, icon: NavIcon }) => (
            <button
              key={anchor}
              onClick={() => scrollTo(anchor)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-blue-light)';
                e.currentTarget.style.borderColor = 'rgba(0,85,255,0.3)';
                e.currentTarget.style.color = 'var(--accent-blue)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <NavIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TCA Warning Section - First thing visible */}
      <div
        className="mb-12 glass-panel p-6 transition-all"
        style={{ border: '2px solid rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.08)' }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg flex-shrink-0" style={{ background: 'rgba(220,38,38,0.12)', border: '1.5px solid rgba(220,38,38,0.35)' }}>
            <AlertTriangle className="w-8 h-8" style={{ color: '#dc2626' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-3 tracking-wider" style={{ color: '#dc2626' }}>
              {t('stats.tcaWarning.title')}
            </h2>
            <div className="space-y-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p className="text-lg">
                {t('stats.tcaWarning.intro')}
              </p>
              <p>
                {t('stats.tcaWarning.definition')}
              </p>
              <p className="font-semibold" style={{ color: '#b91c1c' }}>
                {t('stats.tcaWarning.danger')}
              </p>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(220,38,38,0.25)' }}>
                <a
                  href="https://www.inicea.fr/articles/nos-articles/les-troubles-du-comportement-alimentaire-TCA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all group"
                  style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.35)', color: '#dc2626' }}
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
              className="glass-panel p-6 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg flex-shrink-0" style={{ background: 'rgba(0,85,255,0.1)', border: '1.5px solid rgba(0,85,255,0.25)' }}>
                  <Icon className="w-6 h-6 text-neon-cyan" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2 tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    {stat.title}
                  </h2>
                  <p className="mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {stat.description}
                  </p>
                  {stat.whatIs && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.whatIs}</h3>
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {stat.whatIsDesc}
                      </p>
                    </div>
                  )}
                  {stat.calculation && (
                    <div className="mb-4">
                      <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
                          {stat.calculation}
                        </p>
                      </div>
                      {stat.calculationDesc && (
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {stat.calculationDesc}
                        </p>
                      )}
                    </div>
                  )}
                  {stat.genderDifferences && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.genderDifferences}</h3>
                      <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                        {stat.genderDifferencesDesc}
                      </p>
                    </div>
                  )}
                  {stat.transgenderConsiderations && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.transgenderConsiderations}</h3>
                      <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                        {stat.transgenderConsiderationsDesc}
                      </p>
                    </div>
                  )}
                  {stat.possibleValues && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.possibleValues}</h3>
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {stat.possibleValuesDesc}
                      </p>
                    </div>
                  )}
                  {stat.howToRead && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.howToRead}</h3>
                      <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {stat.howToReadDesc}
                      </p>
                    </div>
                  )}
                  {stat.ranges && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{stat.ranges}</h3>
                      <p className="leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                        {stat.rangesDesc}
                      </p>
                    </div>
                  )}
                  {stat.categories && (
                    <div className="mt-4 space-y-4">
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{t('stats.bmi.categoriesTitle')}</h3>
                      {stat.categories.map((cat, idx) => (
                        <div key={idx} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid var(--glass-border)' }}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono w-32 font-bold" style={{ color: 'var(--text-secondary)' }}>{cat.range}</span>
                            <span className={`font-bold text-lg ${cat.color}`}>{cat.label}</span>
                          </div>
                          {cat.consequences && (
                            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {cat.consequences}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {stat.consequences && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.2)' }}>
                      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--accent-blue)' }}>{t('stats.consequences')}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {stat.consequences}
                      </p>
                    </div>
                  )}
                  {stat.note && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <p className="text-sm" style={{ color: '#b45309' }}>
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
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          to="/"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('stats.backToDashboard')}
        </Link>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          Remonter en haut ↑
        </button>
      </div>
    </div>
  );
};

export default StatsExplanation;
