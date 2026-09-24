'use client';

// The guided encounter as a lower third, not a sidebar.
//
// Inside the 3D market the trader is standing in front of you, so the coaching
// UI must not cover her. This is a strip across the bottom carrying only what a
// step actually needs: the nudge, the line, the microphone. Her words appear in
// a speech bubble over her head, the price is chalked on her counter, and her
// warmth is in how she stands — none of it belongs in a panel.
//
// The full drawer is still the right shape for free practice, which has a real
// transcript worth scrolling.

import React, { useState } from 'react';
import { ScenarioSpec } from '@/data/scenario-specs';
import { Encounter } from '@/data/encounters';
import { GuidedEncounter, EncounterSnapshot } from '@/components/phases/GuidedEncounter';

interface EncounterBarProps {
  spec: ScenarioSpec;
  encounter: Encounter;
  model?: string;
  rapport: number;
  onToast: (message: string) => void;
  onStateChange: (snapshot: EncounterSnapshot) => void;
  onClose: () => void;
  onFreePractice: () => void;
}

export const EncounterBar: React.FC<EncounterBarProps> = ({
  spec,
  encounter,
  model,
  rapport,
  onToast,
  onStateChange,
  onClose,
  onFreePractice,
}) => {
  const [finished, setFinished] = useState(false);

  const warmth =
    rapport >= 65 ? 'Warm' : rapport >= 40 ? 'Cordial' : rapport >= 20 ? 'Cool' : 'Cold';

  return (
    <aside
      aria-label={`Guided lesson with ${spec.traderName}`}
      style={{
        position: 'fixed',
        left: 'max(12px, env(safe-area-inset-left, 0px))',
        right: 'max(12px, env(safe-area-inset-right, 0px))',
        bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        maxWidth: '760px',
        margin: '0 auto',
        background: 'var(--paper)',
        border: '2.5px solid var(--ink)',
        borderRadius: '20px',
        boxShadow: '5px 5px 0 var(--ink)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'min(46vh, 340px)',
        overflow: 'hidden',
      }}
    >
      {/* A single slim row: who, how she is taking you, and the way out. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderBottom: '2px solid var(--ink)',
          background: 'var(--marigold)',
          flexShrink: 0,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="24" fill={spec.avatarColors.bg} />
          <ellipse cx="24" cy="34" rx="15" ry="12" fill={spec.avatarColors.cloth} />
          <circle cx="24" cy="19" r="9" fill="#5A3A26" />
          {spec.avatarColors.wrap && (
            <path d="M15 17a9 9 0 0 1 18 0Z" fill={spec.avatarColors.wrap} />
          )}
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
            {spec.traderName}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--ink2)' }}>
            {spec.location} · {warmth.toLowerCase()} with you
          </div>
        </div>

        {/* Warmth as a short mark, not a dashboard gauge. */}
        <div
          title={`Rapport ${rapport}%`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          {warmth}
          <span
            style={{
              display: 'inline-block',
              width: '38px',
              height: '7px',
              border: '1.5px solid var(--ink)',
              borderRadius: '4px',
              background: 'var(--paper2)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.max(0, Math.min(100, rapport))}%`,
                background: rapport >= 40 ? 'var(--green)' : 'var(--brown)',
                transition: 'width .4s',
              }}
            />
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Leave the conversation"
          style={{
            border: '1.5px solid var(--ink)',
            background: 'var(--paper)',
            borderRadius: '7px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* The microphone was scrolling out of sight on short viewports, which
          left the learner with no way to answer. Scrolling lives here, and the
          action row inside the encounter stays pinned to the bottom. */}
      <div
        style={{
          padding: '10px 12px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          minHeight: 0,
        }}
      >
        <GuidedEncounter
          spec={spec}
          encounter={encounter}
          model={model}
          onToast={onToast}
          onStateChange={onStateChange}
          worldMode
          onFinished={() => setFinished(true)}
        />

        {finished && (
          <button
            type="button"
            className="btn"
            onClick={onFreePractice}
            style={{ width: '100%', marginTop: '8px', minHeight: '38px', fontSize: '12px' }}
          >
            Talk to her freely →
          </button>
        )}
      </div>
    </aside>
  );
};
