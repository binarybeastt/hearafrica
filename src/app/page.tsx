'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorldCanvas } from '@/components/WorldCanvas';
import { BrandTrail } from '@/components/BrandTrail';
import { WorldClock } from '@/components/WorldClock';
import { ConversationDrawer } from '@/components/ConversationDrawer';
import { HUDOverlays } from '@/components/HUDOverlays';
import { MarketScene3D } from '@/components/scene/MarketScene3D';
import { EncounterBar } from '@/components/EncounterBar';
import { EncounterSnapshot } from '@/components/phases/GuidedEncounter';
import { TraderMood } from '@/components/scene/balogun-scene';
import { getEncounter } from '@/data/encounters';
import { ALL_SCENARIOS } from '@/data/scenario-specs';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  ViewLevel,
  Country,
  Place,
  HoverTarget,
  ConversationSession,
} from '@/types';
import { Landmark } from '@/data/landmarks-data';
import { NPCS } from '@/data/market-data';
import { WORLDS, WORLD_BY_LANGUAGE, WorldId, CLOCK_CITIES } from '@/data/worlds';
import { lagosH, bucket, fmtTime, npcHere } from '@/lib/solar';

export default function HearAfricaPage() {
  // Simulation clock state
  const [simT, setSimT] = useState<number>(() => Date.now());
  const [speed, setSpeed] = useState<string>('live');
  const speedRef = useRef<string>('live');
  speedRef.current = speed;

  // View state
  const [level, setLevel] = useState<ViewLevel>('africa');
  const [curCountry, setCurCountry] = useState<Country | null>(null);
  const [sunElevation, setSunElevation] = useState<number>(10);
  const [navTarget, setNavTarget] = useState<string | null>(null);

  /**
   * The map covers Africa down to Lagos; the market itself is the 3D world, so
   * arriving at market level is arriving in it. There is no separate mode.
   */
  const inWorld = level === 'market';

  // Drop any lingering map hover as soon as the 3D world takes over.
  useEffect(() => {
    if (inWorld) setHover(null);
  }, [inWorld]);

  /**
   * Inside the market the guided lesson is a lower third and the trader stays
   * on screen; free practice keeps the full drawer, which has a transcript
   * worth scrolling.
   */
  const [mode, setMode] = useState<'guided' | 'free'>('guided');
  const [snapshot, setSnapshot] = useState<EncounterSnapshot | null>(null);
  /** Which world the learner is in. The map hands off to one of them. */
  const [market, setMarket] = useState<WorldId>('balogun');
  const world = WORLDS[market];
  const traderId = world.traderId;
  const activeSpec = ALL_SCENARIOS[world.scenario];

  /** Her posture is the rapport meter: derived from what just happened. */
  const traderMood: TraderMood = !snapshot
    ? 'idle'
    : snapshot.listening
    ? 'listening'
    : snapshot.stage === 'reaction'
    ? snapshot.lastPerformance === 'missedCritical'
      ? 'cool'
      : snapshot.lastPerformance === 'firstTry'
      ? 'warm'
      : 'speaking'
    : snapshot.stage === 'done'
    ? 'pleased'
    : 'idle';


  // Linguistic region state (Default: Yoruba trans-border region)
  const [activeLanguage, setActiveLanguage] = useState<string | null>('yoruba');

  // Hover and notifications
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [introVisible, setIntroVisible] = useState<boolean>(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conversation state
  const [convo, setConvo] = useState<ConversationSession | null>(null);
  // The greeting follows the clock at the moment the learner walks up, and then
  // stays put: the lesson must not change language under them mid-way.
  const activeEncounter = getEncounter(activeSpec.id, convo?.b);

  // Intro fade out after 2.4s
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroVisible(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, []);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Sim tick handler called from canvas animation frame loop
  const handleSimTick = useCallback((dt: number) => {
    setSimT((prev) => {
      const curSpeed = speedRef.current;
      if (curSpeed === 'live') {
        return Date.now();
      }
      const mult = parseFloat(curSpeed) || 0;
      return prev + dt * 1000 * mult;
    });
  }, []);

  // Speed change handler
  const handleSpeedChange = useCallback(
    (newSpeed: string) => {
      if (newSpeed === 'live') {
        setSimT(Date.now());
      }
      setSpeed(newSpeed);
    },
    []
  );

  // Hour slider scrubbing
  const handleHourChange = useCallback(
    (targetHour: number) => {
      setSimT((prev) => {
        const curH = lagosH(prev);
        const diff = targetHour - curH;
        return prev + diff * 3600e3;
      });
      if (speedRef.current === 'live') {
        setSpeed('0');
      }
    },
    []
  );

  // Level & sun elevation changes from canvas
  const handleLevelChange = useCallback(
    (newLevel: ViewLevel, country: Country | null) => {
      setLevel(newLevel);
      setCurCountry(country);
    },
    []
  );

  const handleSunElevationChange = useCallback((el: number) => {
    setSunElevation(el);
  }, []);

  const handleHoverChange = useCallback(
    (target: HoverTarget | null, pos: { x: number; y: number }) => {
      setHover(target);
      setHoverPos(pos);
    },
    []
  );

  // NPC dialogue trigger
  const handleOpenConvo = useCallback(
    (npcId: string) => {
      setMode('guided');
      setSnapshot(null);
      const np = NPCS[npcId];
      if (!np) return;
      // The world's own local time: Nairobi's morning is not Lagos's.
      const h = (lagosH(simT) + CLOCK_CITIES[world.clock].offset) % 24;
      const newSession: ConversationSession = {
        id: npcId,
        np,
        b: bucket(h),
        time: fmtTime(simT),
        rap: 40,
        price: null,
        step: 'greet',
        notes: [],
        lessons: [],
      };
      setConvo(newSession);
    },
    [simT, world.clock]
  );

  const handleCloseConvo = useCallback(() => {
    setConvo(null);
  }, []);

  const handleNavTarget = useCallback((target: string) => {
    setConvo(null);
    setNavTarget(target);
  }, []);

  /**
   * Drops the learner into a 3D world rather than opening the conversation
   * over the map: you arrive in it and walk to the trader, and the lesson
   * starts when you reach them.
   */
  const enterWorld = useCallback(
    (id: WorldId) => {
      setMarket(id);
      handleNavTarget(WORLDS[id].place[1]);
      showToast(WORLDS[id].arrivalToast);
    },
    [handleNavTarget, showToast]
  );

  const handleLandmarkSelect = useCallback(
    (lm: Landmark) => {
      if (lm.scenarioId === 'kejetia_kente') {
        enterWorld('kejetia');
      } else if (lm.scenarioId === 'balogun') {
        enterWorld('balogun');
      } else if (lm.scenarioId === 'nairobi_matatu') {
        enterWorld('nairobi');
      } else if (lm.scenarioId === 'kano_leather') {
        handleOpenConvo('musa');
      } else if (lm.scenarioId === 'onitsha_stockfish') {
        handleOpenConvo('chioma');
      } else if (lm.navTarget) {
        handleNavTarget(lm.navTarget);
      } else {
        showToast(`${lm.name}: ${lm.description}`);
      }
    },
    [enterWorld, handleNavTarget, handleOpenConvo, showToast]
  );

  const handleStartPractice = useCallback(
    (langId: string) => {
      const worldId = WORLD_BY_LANGUAGE[langId];
      if (worldId) {
        enterWorld(worldId);
      } else if (langId === 'hausa') {
        handleOpenConvo('musa');
      } else if (langId === 'igbo') {
        handleOpenConvo('chioma');
      } else {
        enterWorld('balogun');
      }
    },
    [enterWorld, handleOpenConvo]
  );

  // Whether the traders are out is a question about the world's own local time,
  // not about Lagos — the Nairobi stage was calling itself closed at 08:00.
  const isNpcActive = npcHere(
    (lagosH(simT) + CLOCK_CITIES[world.clock].offset) % 24
  );
  const barActive = inWorld && !!convo && mode === 'guided' && !!activeEncounter;

  return (
    <main style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 2D Canvas Engine */}
      <WorldCanvas
        simT={simT}
        activeLanguage={activeLanguage}
        onSimTick={handleSimTick}
        onHoverChange={handleHoverChange}
        onLevelChange={handleLevelChange}
        onSunElevationChange={handleSunElevationChange}
        onCountrySelect={() => {}}
        onLagosSelect={() => {}}
        onPlaceSelect={(p) => {
          if (p.id === 'balogun') {
            handleOpenConvo('bisi');
          }
        }}
        onNpcSelect={handleOpenConvo}
        onLandmarkSelect={handleLandmarkSelect}
        onToast={showToast}
        navTarget={navTarget}
        paused={inWorld}
        onNavComplete={() => setNavTarget(null)}
      />

      {/* Brand & Breadcrumb Trail */}
      <BrandTrail
        level={level}
        countryName={curCountry?.n}
        countryCode={curCountry?.c}
        market={market}
        onNavigate={handleNavTarget}
      />

      {/* World Clock with Solar Time and Controls */}
      <WorldClock
        simT={simT}
        sunElevation={sunElevation}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        onHourChange={handleHourChange}
        place={world.clock}
      />

      {/* Linguistic Regions Selector Toolbar (Languages don't stop at borders) */}
      {/* Hidden while the 3D market is up: it belongs to the map, and
          clicking it from inside the world navigated away mid-lesson. */}
      {!inWorld && (
      <LanguageSelector
        activeLanguage={activeLanguage}
        onLanguageChange={setActiveLanguage}
        onStartPractice={handleStartPractice}
        onFocusRegion={(regionId, regionName) => {
          // Actually fly there. This used to only raise a toast, so "Center"
          // appeared to do nothing at all.
          const focused = WORLDS[WORLD_BY_LANGUAGE[regionId] ?? 'balogun'];
          setMarket(focused.id);
          handleNavTarget(focused.countryView);
          showToast(`Viewing the ${regionName} linguistic sphere`);
        }}
      />
      )}

      {/* At market level the illustrated map hands off to the 3D market. */}
      {inWorld && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 25 }}>
          <MarketScene3D
            sunElevation={sunElevation}
            market={market}
            traderName={activeSpec.traderName}
            pitchNoun={world.pitchNoun}
            onApproachTrader={() => {
              // After hours the stall is packed up; the lesson waits for daytime.
              if (!isNpcActive) {
                showToast(`${activeSpec.traderName} has packed up for the day. Move the clock to daytime.`);
                return;
              }
              handleOpenConvo(traderId);
            }}
            paused={!!convo}
            focusTrader={barActive}
            traderLine={barActive ? snapshot?.traderLine ?? null : null}
            traderMood={traderMood}
            price={snapshot?.price ?? null}
          />
          {!convo && (
            <button
              type="button"
              onClick={() => handleNavTarget(world.city[1])}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 30,
                padding: '9px 14px',
                background: 'var(--paper)',
                border: '2px solid var(--ink)',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              ← Leave {world.place[0]}
            </button>
          )}
        </div>
      )}

      {barActive && activeEncounter && (
        <EncounterBar
          spec={activeSpec}
          encounter={activeEncounter}
          rapport={snapshot?.rapport ?? activeSpec.startingRapport}
          onToast={showToast}
          onStateChange={setSnapshot}
          onClose={handleCloseConvo}
          onFreePractice={() => setMode('free')}
        />
      )}

      {/* Full drawer: free practice, and every scenario outside the market. */}
      <ConversationDrawer
        convo={barActive ? null : convo}
        freeOnly={inWorld && mode === 'free'}
        onClose={handleCloseConvo}
        onRestart={handleOpenConvo}
        onToast={showToast}
      />

      {/* HUD Overlays: Decorative Frame, Intro, Hints, Tooltips, Toasts */}
      <HUDOverlays
        level={level}
        countryName={curCountry?.n}
        countryCode={curCountry?.c}
        hover={inWorld ? null : hover}
        hoverPos={hoverPos}
        toastMessage={toastMessage}
        introVisible={introVisible}
        isNpcHere={isNpcActive}
        traderName={activeSpec.traderName}
        pitchNoun={world.pitchNoun}
        isConvoOpen={!!convo}
      />
    </main>
  );
}
