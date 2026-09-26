'use client';

// Development-only preview of composed scenes: pick a template and dressing and
// walk around the result. Generated layouts can be pasted in as JSON to see
// exactly what the composer makes of them.

import React, { useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { MarketScene3D } from '@/components/scene/MarketScene3D';
import {
  DENSITIES,
  DRESSING,
  normalizeLayout,
  SCENE_TEMPLATES,
  STANDS,
  type Dressing,
  type SceneLayout,
} from '@/data/scene-layout';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ScenePreview />;
}

function ScenePreview() {
  const [template, setTemplate] = useState<SceneLayout['template']>('street');
  const [stands, setStands] = useState<SceneLayout['character']['stands']>('kiosk');
  const [density, setDensity] = useState<SceneLayout['density']>('busy');
  const [dressing, setDressing] = useState<Dressing[]>(['lock-up-shops', 'palms']);
  const [seed, setSeed] = useState(7);
  const [json, setJson] = useState('');

  const layout = useMemo(() => {
    if (json.trim()) {
      try {
        return normalizeLayout(JSON.parse(json));
      } catch {
        return normalizeLayout({});
      }
    }
    return normalizeLayout({
      template,
      dressing,
      density,
      seed,
      priceTitle: stands === 'doorway' || stands === 'open' ? null : 'PRICE',
      character: { stands, gender: 'woman', age: 'elder', head: 'gele' },
    });
  }, [template, stands, density, dressing, seed, json]);

  const toggle = (d: Dressing) =>
    setDressing((all) => (all.includes(d) ? all.filter((x) => x !== d) : [...all, d]));

  return (
    <main style={{ position: 'fixed', inset: 0 }}>
      <MarketScene3D layout={layout} sunElevation={40} traderName="them" />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 40,
          width: 290,
          padding: 12,
          background: 'var(--paper)',
          border: '2px solid var(--ink)',
          borderRadius: 12,
          fontSize: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <b>Composed scene preview</b>
        <label>
          Template{' '}
          <select value={template} onChange={(e) => setTemplate(e.target.value as SceneLayout['template'])}>
            {SCENE_TEMPLATES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Stands at{' '}
          <select value={stands} onChange={(e) => setStands(e.target.value as SceneLayout['character']['stands'])}>
            {STANDS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Density{' '}
          <select value={density} onChange={(e) => setDensity(e.target.value as SceneLayout['density'])}>
            {DENSITIES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {DRESSING.map((d) => (
            <label key={d}>
              <input type="checkbox" checked={dressing.includes(d)} onChange={() => toggle(d)} /> {d}
            </label>
          ))}
        </div>
        <label>
          Seed <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} style={{ width: 70 }} />
        </label>
        <textarea
          placeholder="…or paste a layout as JSON"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={3}
        />
      </div>
    </main>
  );
}
