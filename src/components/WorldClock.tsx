'use client';

import React, { useEffect, useState } from 'react';
import { bucket, lagosH, fmtTime, pad } from '@/lib/solar';
import { CLOCK_CITIES as PLACES } from '@/data/worlds';

interface WorldClockProps {
  simT: number;
  sunElevation: number;
  speed: string; // 'live' | '0' | '60' | '900'
  onSpeedChange: (speed: string) => void;
  onHourChange: (hour: number) => void;
  /** Where the learner is, so the clock names the right city and language. */
  place?: keyof typeof PLACES;
}

export const WorldClock: React.FC<WorldClockProps> = ({
  simT,
  sunElevation,
  speed,
  onSpeedChange,
  onHourChange,
  place = 'lagos',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  /**
   * The value shown while the learner is dragging. The slider must stay
   * controlled for its whole life — handing it `undefined` mid-drag is what
   * produced React's controlled/uncontrolled warnings — but it also must not be
   * yanked around by the clock ticking underneath it, so the drag position is
   * held here until the thumb is released.
   */
  const [dragHour, setDragHour] = useState<number | null>(null);

  const h = lagosH(simT);

  // Release the drag wherever the pointer ends up, not only over the slider.
  useEffect(() => {
    if (dragHour === null) return;
    const release = () => setDragHour(null);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('touchend', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('touchend', release);
    };
  }, [dragHour]);
  const city = PLACES[place] ?? PLACES.lagos;
  const localH = (h + city.offset) % 24;
  const b = bucket(localH);
  const greeting = city.greetings[b];

  const placeStatus =
    `${city.label}, ` +
    (sunElevation > 6
      ? 'daytime'
      : sunElevation > -2
      ? localH < 12
        ? 'sunrise'
        : 'sunset'
      : 'night');

  const sunRays = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i * Math.PI) / 4;
    return {
      x1: 13 + Math.cos(a) * 8.5,
      y1: 13 + Math.sin(a) * 8.5,
      x2: 13 + Math.cos(a) * 11,
      y2: 13 + Math.sin(a) * 11,
    };
  });

  return (
    <section
      id="clock"
      className={isOpen ? 'open' : ''}
      aria-label="World clock"
    >
      <div className="row">
        <div className="time">
          <svg
            id="sunIcon"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            aria-hidden="true"
          >
            {sunElevation > -2 ? (
              <>
                <circle
                  cx="13"
                  cy="13"
                  r="5.5"
                  fill="#F28A2E"
                  stroke="#1D1510"
                  strokeWidth="1.5"
                />
                {sunRays.map((ray, i) => (
                  <line
                    key={i}
                    x1={ray.x1}
                    y1={ray.y1}
                    x2={ray.x2}
                    y2={ray.y2}
                    stroke="#F28A2E"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                ))}
              </>
            ) : (
              <path
                d="M17 4a9 9 0 1 0 5 15A8 8 0 0 1 17 4z"
                fill="#F2A1CB"
                stroke="#1D1510"
                strokeWidth="1.5"
              />
            )}
          </svg>
          <div>
            <div className="t" id="clockT">
              {city.offset
                ? `${pad(Math.floor(localH))}:${pad(Math.floor((localH % 1) * 60))}`
                : fmtTime(simT)}
            </div>
            <div className="place" id="clockP">
              {placeStatus}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="iconbtn"
          id="clockToggle"
          aria-label="Time controls"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M7 12h10M10 17h4" />
          </svg>
        </button>
      </div>

      <div className="say" id="clockSay">
        Right now you&apos;d greet an elder with <b>{greeting.resp}</b>
      </div>

      <div className="slider" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="hour" style={{ fontSize: 12, color: 'var(--ink3)' }}>
          Move the clock
        </label>
        <input
          id="hour"
          type="range"
          min="0"
          max="23.75"
          step="0.25"
          // The slider reads and writes the local hour, so dragging to 07:00
          // in Nairobi lands on 07:00 there, not on Lagos time shown as 09:00.
          value={dragHour ?? Math.floor(localH * 4) / 4}
          onChange={(e) => {
            const hour = parseFloat(e.target.value);
            setDragHour(hour);
            onHourChange((hour - city.offset + 24) % 24);
          }}
          onPointerUp={() => setDragHour(null)}
          onBlur={() => setDragHour(null)}
        />
      </div>

      <div className="seg" role="group" aria-label="Simulation speed">
        <button
          type="button"
          data-sp="live"
          aria-pressed={speed === 'live'}
          onClick={() => onSpeedChange('live')}
        >
          Live
        </button>
        <button
          type="button"
          data-sp="0"
          aria-pressed={speed === '0'}
          onClick={() => onSpeedChange('0')}
        >
          Pause
        </button>
        <button
          type="button"
          data-sp="60"
          aria-pressed={speed === '60'}
          onClick={() => onSpeedChange('60')}
        >
          60×
        </button>
        <button
          type="button"
          data-sp="900"
          aria-pressed={speed === '900'}
          onClick={() => onSpeedChange('900')}
        >
          900×
        </button>
      </div>
    </section>
  );
};
