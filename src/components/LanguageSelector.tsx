'use client';

import React, { useState } from 'react';
import { LANGUAGE_REGIONS, LanguageRegion } from '@/data/language-regions';

interface LanguageSelectorProps {
  activeLanguage: string | null;
  onLanguageChange: (langId: string | null) => void;
  /** The region name is passed along because the caller's `activeLanguage`
   * has not re-rendered yet when this fires during a language change. */
  onFocusRegion?: (regionId: string, regionName: string) => void;
  onStartPractice?: (langId: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  activeLanguage,
  onLanguageChange,
  onFocusRegion,
  onStartPractice,
}) => {
  const [showCard, setShowCard] = useState<boolean>(true);

  const activeRegion: LanguageRegion | null =
    activeLanguage && LANGUAGE_REGIONS[activeLanguage]
      ? LANGUAGE_REGIONS[activeLanguage]
      : null;

  return (
    <div className="language-picker">
      {/* Cultural Educational Card (when a language region is active and open) */}
      {activeRegion && showCard && (
        <div
          className="language-card"
          style={{
            backgroundColor: 'rgba(8, 14, 7, 0.92)',
            borderColor: activeRegion.color,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px ${activeRegion.fillColor}`,
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeRegion.color }}
              />
              <span className="font-['Fraunces'] text-lg font-bold text-[#f5eedc]">
                {activeRegion.nativeName}
              </span>
              <span className="text-xs text-[#c48938] font-mono font-bold uppercase tracking-wider">
                ({activeRegion.name})
              </span>
            </div>
            <button
              onClick={() => setShowCard(false)}
              className="text-[#9ea89b] hover:text-[#f5eedc] text-sm p-1 leading-none rounded"
              title="Minimize card"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#d8c29d] mb-2 font-mono">
            <span>🗣️ {activeRegion.speakers}</span>
            <span>•</span>
            <span>🌍 {activeRegion.countries.join(', ')}</span>
          </div>

          <p className="text-xs text-[#c5d0c2] leading-relaxed mb-3">
            {activeRegion.description}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.1)] gap-2">
            <span className="text-[10px] text-[#8e988b] italic truncate">
              {activeRegion.linguisticFamily}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {onFocusRegion && (
                <button
                  type="button"
                  onClick={() => onFocusRegion(activeRegion.id, activeRegion.name)}
                  className="text-xs px-2.5 py-1 rounded font-bold font-['Figtree'] transition-all opacity-80 hover:opacity-100"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#f5eedc',
                  }}
                >
                  Center
                </button>
              )}
              {onStartPractice && (
                <button
                  type="button"
                  onClick={() => onStartPractice(activeLanguage!)}
                  className="text-xs px-3 py-1 rounded font-bold font-['Figtree'] transition-all shadow-md hover:scale-105"
                  style={{
                    backgroundColor: activeRegion.color,
                    color: '#f5eedc',
                  }}
                >
                  🎙️ Practice Live
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pill Selector Bar */}
      <div
        className="language-pills"
        style={{
          backgroundColor: 'rgba(8, 14, 7, 0.88)',
          borderColor: 'rgba(196, 137, 56, 0.35)',
        }}
      >
        <span className="text-[11px] font-mono text-[#9ea89b] px-2 font-bold uppercase tracking-wide hidden sm:inline">
          🌐 Language Sphere:
        </span>

        {(Object.keys(LANGUAGE_REGIONS) as Array<keyof typeof LANGUAGE_REGIONS>).map((key) => {
          const reg = LANGUAGE_REGIONS[key];
          const isActive = activeLanguage === key;
          return (
            <button
              key={key}
              onClick={() => {
                if (isActive) {
                  setShowCard(!showCard);
                } else {
                  onLanguageChange(key);
                  setShowCard(true);
                  if (onFocusRegion) onFocusRegion(reg.id, reg.name);
                }
              }}
              className="px-3 py-1 text-xs rounded-full font-['Figtree'] font-semibold transition-all duration-200"
              style={{
                backgroundColor: isActive ? reg.color : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? '#f5eedc' : '#b0bba8',
                boxShadow: isActive ? `0 0 10px ${reg.fillColor}` : 'none',
                border: isActive ? `1px solid ${reg.accentColor}` : '1px solid transparent',
              }}
            >
              {reg.name}
            </button>
          );
        })}

        {/* Option to clear / view raw political boundaries */}
        <button
          onClick={() => {
            onLanguageChange(null);
            setShowCard(false);
          }}
          className="px-2.5 py-1 text-xs rounded-full font-['Figtree'] transition-all"
          style={{
            backgroundColor: activeLanguage === null ? 'rgba(196, 137, 56, 0.25)' : 'transparent',
            color: activeLanguage === null ? '#f5eedc' : '#7e887a',
            border: activeLanguage === null ? '1px solid #c48938' : '1px solid transparent',
          }}
          title="Turn off language regions to view administrative boundaries only"
        >
          Political
        </button>
      </div>
    </div>
  );
};
