'use client';

import React from 'react';
import { HoverTarget, ViewLevel } from '@/types';
import { READY } from '@/data/geo-data';
import { NPCS } from '@/data/market-data';

interface HUDOverlaysProps {
  level: ViewLevel;
  countryName?: string;
  countryCode?: string;
  hover: HoverTarget | null;
  hoverPos: { x: number; y: number };
  toastMessage: string | null;
  introVisible: boolean;
  isNpcHere: boolean;
  isConvoOpen: boolean;
  /** Whoever runs the stall in the market you are standing in. */
  traderName?: string;
  /** What the trader stands at: a stall, a matatu. */
  pitchNoun?: string;
}

export const HUDOverlays: React.FC<HUDOverlaysProps> = ({
  level,
  countryName,
  countryCode,
  hover,
  hoverPos,
  toastMessage,
  introVisible,
  isNpcHere,
  isConvoOpen,
  traderName = 'the trader',
  pitchNoun = 'stall',
}) => {
  // Determine hint message
  let hintText = '';
  if (isConvoOpen) {
    hintText = '';
  } else if (level === 'africa') {
    hintText =
      'Scroll or pinch to zoom, drag to move. Nigeria, Ghana and Kenya are glowing: click one.';
  } else if (level === 'country') {
    hintText =
      countryCode === 'GHA'
        ? 'Kejetia Market in Kumasi is ready for Twi. Click it.'
        : countryCode === 'KEN'
        ? 'Kencom Stage in Nairobi is ready for Kiswahili. Click it.'
        : 'Lagos is lit up. Click it to go in.';
  } else if (level === 'lagos') {
    hintText = 'The market is ready for practice. Click it.';
  } else {
    hintText = isNpcHere
      ? `Walk to ${traderName}’s ${pitchNoun}, or tap the pin above it.`
      : 'The traders have gone home. Move the clock to daytime.';
  }

  // Determine tooltip content
  let tipTitle = '';
  let tipSub = '';

  if (hover) {
    if (hover.type === 'country') {
      const r = READY[hover.c.c];
      tipTitle = hover.c.n;
      tipSub = r ? `${r.lang}: ${r.status.toLowerCase()}` : 'Not recorded yet';
    } else if (hover.type === 'lagos') {
      tipTitle = 'Lagos';
      tipSub = 'Yoruba: click to go in';
    } else if (hover.type === 'accra') {
      tipTitle = 'Accra';
      tipSub = 'Twi: being recorded now';
    } else if (hover.type === 'place') {
      tipTitle = hover.p.n;
      tipSub = hover.p.sub;
    } else if (hover.type === 'npc') {
      const c = NPCS[hover.id];
      if (c) {
        tipTitle = c.name;
        tipSub = `${c.role} Click to talk.`;
      }
    } else if (hover.type === 'landmark') {
      const lm = hover.lm;
      tipTitle = lm.name;
      const statusPrefix =
        lm.status === 'ready' ? '⚡ Ready: ' : lm.status === 'orientation' ? '📍 ' : '🔒 ';
      tipSub = `${statusPrefix}${lm.locationName} — ${lm.description}`;
    }
  }

  const hasTip = !!tipTitle;

  return (
    <>
      <div id="frame" aria-hidden="true" />

      {introVisible && (
        <div id="intro" style={{ opacity: introVisible ? 1 : 0 }}>
          <h1 className="lettering" aria-label="HearAfrica">
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
          </h1>
          <p>Africa, as it&apos;s spoken.</p>
        </div>
      )}

      <div
        id="hint"
        role="status"
        // The hint sits over the language selector at the foot of the map. It
        // has nothing to click, so it must not swallow clicks meant for the
        // buttons underneath it.
        style={{ opacity: hintText ? 1 : 0, pointerEvents: 'none' }}
      >
        {hintText}
      </div>

      <div
        id="tip"
        aria-hidden="true"
        style={{
          opacity: hasTip ? 1 : 0,
          left: `${hoverPos.x}px`,
          top: `${hoverPos.y}px`,
        }}
      >
        {hasTip && (
          <>
            <b>{tipTitle}</b>
            <span>{tipSub}</span>
          </>
        )}
      </div>

      <div
        id="toast"
        role="status"
        className={toastMessage ? 'on' : ''}
      >
        {toastMessage}
      </div>
    </>
  );
};
