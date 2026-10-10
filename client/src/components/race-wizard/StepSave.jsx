import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Loader2, Save } from 'lucide-react';
import { StepHeader } from './steps';

export default function StepSave({ canSave, onSave, saving, saveError, savedRace, prompt }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <StepHeader
          step={6}
          title="Sauvegarder et créer ton suivi IA"
          text="La course est enregistrée dans ton compte : tu la retrouves dans « Mes courses » pour revoir le plan et la stratégie."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={onSave} disabled={!canSave || saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {savedRace ? 'Mettre à jour la course' : 'Sauvegarder la course'}
          </button>
          {savedRace && <span className="text-sm flex items-center gap-1" style={{ color: '#788c5d' }}><Check size={16} />Enregistrée</span>}
        </div>
        {!canSave && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Renseigne au minimum le nom de la course et le temps visé.</p>}
        {saveError && <p className="text-sm flex gap-2" style={{ color: '#d97757' }}><AlertTriangle size={18} />{saveError}</p>}
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.2em]" style={{ color: 'var(--accent-blue)' }}>Claude ou ChatGPT</p>
            <h3 className="text-xl mt-1">Prompt de suivi d’entraînement</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Copie-le dans un nouveau projet : il contient la fiche course, le plan de passage, les semaines d’entraînement, ton profil et les consignes de suivi hebdomadaire.
            </p>
          </div>
          <button type="button" className="btn-ghost inline-flex items-center gap-2 shrink-0" onClick={copy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copié' : 'Copier le prompt'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">Ouvrir Claude</a>
          <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">Ouvrir ChatGPT</a>
        </div>
        <textarea
          readOnly
          value={prompt}
          rows={16}
          aria-label="Prompt IA"
          className="input-cyber w-full font-mono text-xs"
        />
      </div>
    </section>
  );
}
