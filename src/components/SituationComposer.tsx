'use client';

// "Describe a situation": the learner writes what they are about to face, and a
// scene and a guided lesson are drafted for it. The result is always marked as
// a draft — nobody fluent has checked the language yet.

import React, { useState } from 'react';
import { GENERATABLE_LANGUAGES, type GeneratableLanguage, type GeneratedLesson } from '@/data/generated';
import { registerLesson } from '@/data/generated-registry';
import { ALL_SCENARIOS } from '@/data/scenario-specs';

const EXAMPLES = [
  'Asking my elderly landlord to fix the leaking tap before the weekend',
  "Greeting my friend's parents when I visit their house for the first time",
  'Telling the danfo conductor where I am stopping and getting my change',
];

interface SituationComposerProps {
  initialLanguage?: string;
  /** The world clock's part of the day, so the greeting matches it. */
  part: 'm' | 'a' | 'e';
  onReady: (lesson: GeneratedLesson) => void;
  onClose: () => void;
}

export const SituationComposer: React.FC<SituationComposerProps> = ({ initialLanguage, part, onReady, onClose }) => {
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<GeneratableLanguage>(
    (GENERATABLE_LANGUAGES as readonly string[]).includes(initialLanguage ?? '')
      ? (initialLanguage as GeneratableLanguage)
      : 'yoruba'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, language, part }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Something went wrong (HTTP ${response.status}).`);
      const lesson = body as GeneratedLesson;
      registerLesson({ spec: lesson.spec, encounter: lesson.encounter, content: lesson.content });
      onReady(lesson);
    } catch (err: any) {
      setError(err?.message || 'Could not draft that situation.');
      setBusy(false);
    }
  };

  const ready = description.trim().length >= 8 && !busy;

  return (
    <div
      role="dialog"
      aria-label="Describe a situation"
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(29,21,16,0.45)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 92vw)',
          background: 'var(--paper)',
          border: '2.5px solid var(--ink)',
          borderRadius: '18px',
          boxShadow: '4px 4px 0 var(--ink)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <b style={{ fontFamily: 'var(--font-display)', fontSize: '17px' }}>Practise a situation before you face it</b>
        <p style={{ fontSize: '12px', color: 'var(--ink2)', margin: 0, lineHeight: 1.45 }}>
          Describe what you are about to do, and you will get a scene to walk into and a guided conversation to
          practise. It is a <b>draft</b>: the language has not been checked by a fluent speaker.
        </p>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Asking my landlord to fix the tap before the weekend"
          rows={3}
          maxLength={400}
          disabled={busy}
          autoFocus
          style={{
            padding: '9px 11px',
            borderRadius: '10px',
            border: '2px solid var(--ink)',
            background: 'var(--paper2)',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => setDescription(example)}
              style={{ fontSize: '11px', padding: '4px 9px', minHeight: 0, textAlign: 'left' }}
            >
              {example}
            </button>
          ))}
        </div>

        <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          In
          <select
            value={language}
            disabled={busy}
            onChange={(e) => setLanguage(e.target.value as GeneratableLanguage)}
            style={{ padding: '5px 8px', borderRadius: '8px', border: '2px solid var(--ink)', background: 'var(--paper2)' }}
          >
            {GENERATABLE_LANGUAGES.map((id) => (
              <option key={id} value={id}>
                {ALL_SCENARIOS[id].languageName}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <div className="note" role="alert" style={{ fontSize: '12px', background: '#FBD0B4' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn" onClick={onClose} disabled={busy} style={{ minHeight: '40px' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={generate}
            disabled={!ready}
            style={{ flex: 1, minHeight: '40px' }}
          >
            {busy ? 'Setting the scene… (about 15 seconds)' : 'Build my scene →'}
          </button>
        </div>
      </div>
    </div>
  );
};
