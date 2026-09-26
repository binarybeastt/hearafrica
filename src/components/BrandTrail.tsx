'use client';

import React from 'react';
import { ViewLevel } from '@/types';
import { WORLDS, WorldId } from '@/data/worlds';

interface BrandTrailProps {
  level: ViewLevel;
  countryName?: string;
  countryCode?: string;
  /** Which world the learner is standing in, once at market level. */
  market?: WorldId;
  /** Names the place instead of the world's own, for a generated scene. */
  placeLabel?: string;
  onNavigate: (viewKey: string) => void;
}

const COUNTRY_VIEW: Record<string, string> = {
  GHA: 'ghana',
  NGA: 'nigeria',
  KEN: 'kenya',
};

export const BrandTrail: React.FC<BrandTrailProps> = ({
  level,
  countryName,
  countryCode,
  market = 'balogun',
  placeLabel,
  onNavigate,
}) => {
  const world = WORLDS[market] ?? WORLDS.balogun;
  const parts: [string, string][] = [['Africa', 'africa']];

  if (level !== 'africa') {
    if (level === 'country' && countryName) {
      parts.push([countryName, COUNTRY_VIEW[countryCode ?? ''] ?? 'africa']);
    } else if (level !== 'country') {
      parts.push(world.country);
    }
  }

  if (level === 'lagos' || level === 'market') {
    parts.push(world.city);
  }

  if (level === 'market') {
    parts.push(placeLabel ? [placeLabel, world.place[1]] : world.place);
  }

  return (
    <div id="brand">
      <div className="name lettering" aria-label="HearAfrica">
        <span aria-hidden="true">H</span>
        <span aria-hidden="true">e</span>
        <span aria-hidden="true">a</span>
        <span aria-hidden="true">r</span>
        <span aria-hidden="true">A</span>
        <span aria-hidden="true">f</span>
        <span aria-hidden="true">r</span>
        <span aria-hidden="true">i</span>
        <span aria-hidden="true">c</span>
        <span aria-hidden="true">a</span>
      </div>
      <nav id="trail" aria-label="Where you are">
        {parts.map((p, i) => (
          <React.Fragment key={p[0]}>
            {i > 0 && (
              <span className="sep" aria-hidden="true">
                ›
              </span>
            )}
            <button
              type="button"
              aria-current={i === parts.length - 1 ? 'true' : undefined}
              onClick={() => onNavigate(p[1])}
            >
              {p[0]}
            </button>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};
