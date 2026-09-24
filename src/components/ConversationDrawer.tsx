'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ConvoMessage, ConversationSession } from '@/types';
import { clamp } from '@/lib/solar';
import { GeminiLiveClient, GameStateUpdate } from '@/lib/gemini-live';
import {
  ALL_SCENARIOS,
  ScenarioSpec,
  ScaffoldingPrompt,
  money,
} from '@/data/scenario-specs';
import { GuidedEncounter } from '@/components/phases/GuidedEncounter';
import { getEncounter } from '@/data/encounters';

/**
 * 'guided' is the coached, authored encounter: nudge -> model -> say -> check ->
 * correct -> repeat. 'do' is free practice with the live, improvising trader,
 * unlocked once the guided encounter has been completed.
 */
type Phase = 'guided' | 'do';

/** Which scenario each NPC outside the 3D market opens. */
const SPEC_BY_NPC: Record<string, ScenarioSpec> = {
  musa: ALL_SCENARIOS.hausa,
  chioma: ALL_SCENARIOS.igbo,
  kevo: ALL_SCENARIOS.swahili,
};

const specFor = (npcId: string | undefined): ScenarioSpec =>
  (npcId && SPEC_BY_NPC[npcId]) || ALL_SCENARIOS.yoruba;

/** The scenarios reachable from the drawer's own language switcher. */
const SWITCHABLE = ['yoruba', 'hausa', 'igbo', 'swahili'] as const;
type SwitchableLanguage = (typeof SWITCHABLE)[number];

const SWITCHER: Record<SwitchableLanguage, { label: string; icon: string; npc: string }> = {
  yoruba: { label: 'Èdè Yorùbá', icon: '🍅', npc: 'bisi' },
  hausa: { label: 'Harshen Hausa', icon: '🐪', npc: 'musa' },
  igbo: { label: 'Igbo (experimental)', icon: '🐟', npc: 'chioma' },
  swahili: { label: 'Kiswahili', icon: '🚐', npc: 'kevo' },
};

interface ConversationDrawerProps {
  convo: ConversationSession | null;
  /**
   * Opens straight into free practice and hides the guided/free switch. Used
   * when the guided lesson has already been done in the 3D market, where it is
   * a lower third rather than this panel.
   */
  freeOnly?: boolean;
  onClose: () => void;
  onRestart: (npcId: string) => void;
  onToast: (msg: string) => void;
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  convo,
  freeOnly = false,
  onClose,
  onRestart,
  onToast,
}) => {
  const [currentSpec, setCurrentSpec] = useState<ScenarioSpec>(() =>
    specFor(convo?.id)
  );

  // Session & Live State
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [rapport, setRapport] = useState<number>(40);
  const [price, setPrice] = useState<number | null>(null);
  const [dealConcluded, setDealConcluded] = useState<boolean>(false);

  // Gemini Live Connection State
  const [apiKey, setApiKey] = useState<string>('');
  const [keyInput, setKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const finishingRef = useRef(false);
  const currentUserMsgIdRef = useRef<string | null>(null);
  const userTranscriptRef = useRef('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('idle');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTraderSpeaking, setIsTraderSpeaking] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [customTextInput, setCustomTextInput] = useState<string>('');

  // Scaffolding Level (1: Full, 2: Clues, 3: Voice Only) — applies within DO.
  const [scaffoldingLevel, setScaffoldingLevel] = useState<1 | 2 | 3>(1);

  // Lesson phase. 'guided' is authored and cached; only 'do' opens a live session.
  const [phase, setPhase] = useState<Phase>('do');
  const [guidedDone, setGuidedDone] = useState(false);
  const encounter = getEncounter(currentSpec.id);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const currentTraderMsgIdRef = useRef<string | null>(null);

  // Refs for rock-solid event handling (avoiding closure staleness & listener recreation)
  const isRecordingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const convoRef = useRef(convo);


  convoRef.current = convo;
  isConnectedRef.current = isConnected;
  isRecordingRef.current = isRecording;

  // Initialize client on mount
  useEffect(() => {
    const saved =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('hearafrica_gemini_api_key') ||
          localStorage.getItem('openafrica_gemini_api_key'))) ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      '';
    setApiKey(saved);
    setKeyInput(saved);

    const client = new GeminiLiveClient();
    clientRef.current = client;

    client.setCallbacks({
      onConnectionChange(connected, error) {
        isConnectedRef.current = connected;
        setIsConnected(connected);
        if (!connected) {
          isRecordingRef.current = false;
          setIsRecording(false);
          setIsTraderSpeaking(false);
          setMicVolume(0);
        }
        if (connected) {
          setConnectionStatus('connected');
          onToast(`Connected to Gemini Live (${client.getModel()})`);
        } else {
          setConnectionStatus(error ? `Error: ${error}` : 'disconnected');
          if (error) onToast(error);
        }
      },
      onTraderTurnStart() {
        setIsTraderSpeaking(true);
      },
      onTraderTurnEnd() {
        setIsTraderSpeaking(false);
        currentTraderMsgIdRef.current = null;
      },
      onVolumeChange(vol) {
        setMicVolume(vol);
      },
      onTraderSpeechText(text, isComplete) {
        const id = currentTraderMsgIdRef.current ?? crypto.randomUUID();
        currentTraderMsgIdRef.current = isComplete ? null : id;
        setMessages(prev => prev.some(m => m.id === id)
          ? prev.map(m => m.id === id ? { ...m, text } : m)
          : [...prev, { id, sender: 'npc', text }]);
      },
      onUserSpeechText(text) {
        const id = currentUserMsgIdRef.current ?? crypto.randomUUID();
        currentUserMsgIdRef.current = id;
        userTranscriptRef.current += text;
        const transcript = userTranscriptRef.current;
        setMessages(prev => prev.some(m => m.id === id)
          ? prev.map(m => m.id === id ? { ...m, text: transcript } : m)
          : [...prev, { id, sender: 'you', text: transcript }]);
      },
      onGameStateChange(update: GameStateUpdate) {
        setRapport((prev) => clamp(prev + update.rapportDelta, 0, 100));
        if (update.currentPrice !== undefined) {
          setPrice(update.currentPrice);
        }
        if (update.dealConcluded) {
          setDealConcluded(true);
        }
        if (update.culturalNote) {
          setMessages((prev) => [
            ...prev,
            {
              id: `note-${Date.now()}`,
              sender: 'sys',
              note: update.culturalNote,
              bad: update.rapportDelta < 0,
            },
          ]);
        }
      },
    });

    return () => {
      client.disconnect();
    };
  }, [onToast]);

  // Sync scenario whenever convo changes
  useEffect(() => {
    if (convo) {
      const specToUse = specFor(convo.id);

      setCustomTextInput('');
      setCurrentSpec(specToUse);
      setPhase(freeOnly || !getEncounter(specToUse.id) ? 'do' : 'guided');
      setGuidedDone(false);
      setRapport(specToUse.startingRapport);
      setPrice(specToUse.initialAskingPrice);
      setDealConcluded(false);
      currentTraderMsgIdRef.current = null;

      const initialNotes: ConvoMessage[] = [
        {
          id: 'sys-start',
          sender: 'sys',
          text: `You walk up to ${specToUse.traderName}'s stall in ${specToUse.location}. It's ${convo.time}. Speak first.`,
        },
        {
          id: 'sys-goal',
          sender: 'sys',
          text: `🎯 Situational Goal: ${specToUse.culturalBrief.goal} Cultural rule: ${specToUse.culturalBrief.culturalRule}`,
        },
      ];
      setMessages(initialNotes);

    }
  }, [convo]);

  // A committed key or scenario change creates exactly one current session.
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    currentUserMsgIdRef.current = null;
    userTranscriptRef.current = '';
    // HEAR and BUILD play cached audio and need no socket; connecting only on
    // DO keeps quota down and keeps the drills working on a flaky network.
    if (convo && apiKey && phase === 'do') {
      client.setApiKey(apiKey);
      void client.connect(currentSpec);
      setConnectionStatus('connecting');
    } else {
      client.disconnect();
    }
    return () => client.disconnect();
  }, [convo, apiKey, currentSpec, phase]);

  // Switch between languages directly in the drawer
  const handleSwitchLanguage = (langKey: SwitchableLanguage) => {
    const newSpec = ALL_SCENARIOS[langKey];
    if (!newSpec) return;

    setCustomTextInput('');
    setCurrentSpec(newSpec);
    setPhase(freeOnly || !getEncounter(newSpec.id) ? 'do' : 'guided');
    setGuidedDone(false);
    setRapport(newSpec.startingRapport);
    setPrice(newSpec.initialAskingPrice);
    setDealConcluded(false);
    currentTraderMsgIdRef.current = null;

    const notes: ConvoMessage[] = [
      {
        id: `sys-start-${Date.now()}`,
        sender: 'sys',
        text: `Switched language to ${newSpec.languageName}. You are now at ${newSpec.traderName}'s stall in ${newSpec.location}.`,
      },
      {
        id: `sys-goal-${Date.now()}`,
        sender: 'sys',
        text: `🎯 Situational Goal: ${newSpec.culturalBrief.goal} Cultural rule: ${newSpec.culturalBrief.culturalRule}`,
      },
    ];
    setMessages(notes);

    onToast(`Switched scenario to ${newSpec.languageName} (${newSpec.traderName})`);
  };

  // Auto-scroll chat log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, isTraderSpeaking]);

  // --- AUDIO RECORDING & SPACEBAR CONTROLS ---

  const handleStartSpeaking = useCallback(async () => {
    if (!isConnectedRef.current) {
      onToast('Please connect your Gemini API key first.');
      return;
    }
    if (isRecordingRef.current || finishingRef.current) return;
    currentUserMsgIdRef.current = null;
    userTranscriptRef.current = '';
    currentTraderMsgIdRef.current = null;
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      await clientRef.current?.startSpeechTurn();
    } catch (err: any) {
      console.error('Error starting speech turn:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      onToast('Microphone error: ' + (err?.message || 'Check browser permissions'));
    }
  }, [onToast]);

  const handleStopSpeaking = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setMicVolume(0);
    finishingRef.current = true;
    setIsFinishing(true);

    try {
      await clientRef.current?.endSpeechTurn();
    } catch (err) {
      console.error('Error ending speech turn:', err);
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  }, []);

  // Single persistent window listener for Spacebar push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        // Allow spaces when user is typing in text input or textarea
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'button' || (document.activeElement as HTMLElement)?.isContentEditable) {
          return;
        }
        if (convoRef.current) {
          e.preventDefault();
          handleStartSpeaking();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (convoRef.current) {
          e.preventDefault();
          handleStopSpeaking();
        }
      }
    };

    const handleBlur = () => {
      if (isRecordingRef.current) {
        handleStopSpeaking();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleStartSpeaking, handleStopSpeaking]);

  // Touch/click toggles; Space is push-to-talk. Avoid overlapping mouse/touch events.
  const handleMicClick = () => {
    if (isRecordingRef.current) void handleStopSpeaking();
    else void handleStartSpeaking();
  };

  // Send a suggested scaffolding prompt directly to Gemini Live
  const handleSendPrompt = (prompt: ScaffoldingPrompt) => {
    if (!isConnected) {
      onToast(`Please connect your Gemini API key to talk with ${currentSpec.traderName}.`);
      return;
    }

    if (scaffoldingLevel === 2) {
      setCustomTextInput(prompt.clueWord.replace(/\.{3}|…/g, ''));
      onToast('Complete the clue in your own words, or say your answer aloud.');
      return;
    }
    currentTraderMsgIdRef.current = null;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'you',
        text: prompt.fullYo,
        en: prompt.en,
      },
    ]);

    clientRef.current?.sendTextMessage(prompt.fullYo);
  };

  // Send custom text message to Gemini Live
  const handleSendCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = customTextInput.trim();
    if (!text) return;
    if (!isConnected) {
      onToast('Please connect your Gemini API key.');
      return;
    }

    currentTraderMsgIdRef.current = null;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'you',
        text,
      },
    ]);

    clientRef.current?.sendTextMessage(text);
    setCustomTextInput('');
  };

  // Send repair phrase to Gemini Live
  const handleSendRepair = (nativeText: string, en: string) => {
    if (!isConnected) {
      onToast('Please connect your Gemini API key.');
      return;
    }

    currentTraderMsgIdRef.current = null;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'you',
        text: nativeText,
        en,
      },
    ]);

    clientRef.current?.sendTextMessage(nativeText);
  };

  // Save API Key and Connect
  const handleSaveApiKey = () => {
    const key = keyInput.trim();
    if (!key) {
      onToast('Please paste a valid Gemini API key.');
      return;
    }
    if (clientRef.current) {
      clientRef.current.setApiKey(key);
      if (key === apiKey) {
        void clientRef.current.connect(currentSpec);
        setConnectionStatus('connecting');
      } else {
        setApiKey(key);
      }
      setShowSettings(false);
    }
  };

  if (!convo) return null;

  return (
    <aside
      id="convo"
      className="on"
      aria-label="Gemini Live Conversation"
      aria-hidden="false"
    >
      {/* Header: Vintage Poster Marigold Bar with NPC Avatar & 3 Meters */}
      <div className="cv-head">
        <div className="cv-top">
          <svg className="cv-av" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill={currentSpec.avatarColors.bg} />
            <ellipse
              cx="24"
              cy="40"
              rx="15"
              ry="11"
              fill={currentSpec.avatarColors.cloth}
            />
            <circle cx="24" cy="21" r="9" fill="#5A3A26" />
            {currentSpec.avatarColors.wrap && (
              <path
                d="M14 19a10 10 0 0 1 20 0z"
                fill={currentSpec.avatarColors.wrap}
              />
            )}
          </svg>

          <div className="cv-who">
            <h2>{currentSpec.traderName}</h2>
            <p>
              {phase !== 'do'
                ? `📖 Guided lesson • ${currentSpec.languageName}`
                : isConnected
                ? `🟢 Live • ${currentSpec.languageName}`
                : `⚪ ${connectionStatus === 'connecting' ? 'Connecting…' : 'Disconnected'} • ${currentSpec.languageName}`}
            </p>
          </div>

          <button
            type="button"
            className="iconbtn"
            id="cvClose"
            aria-label="Leave conversation"
            onClick={onClose}
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
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Quick Language Switcher Bar */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '4px 0 2px 0',
          }}
        >
          {SWITCHABLE.map((langKey) => {
            const isSelected = currentSpec.languageId === langKey;
            const { label, icon } = SWITCHER[langKey];

            return (
              <button
                key={langKey}
                type="button"
                onClick={() => handleSwitchLanguage(langKey)}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: '2px solid var(--ink)',
                  background: isSelected ? 'var(--ink)' : 'var(--paper)',
                  color: isSelected ? 'var(--paper)' : 'var(--ink)',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'none' : '2px 2px 0 var(--ink)',
                  transform: isSelected ? 'translate(1px, 1px)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 3 Dashboard Meters: Time, Current Asking Price, Rapport */}
        <div className="cv-dash meters">
          <div className="cv-cell meter">
            <span className="cv-k l">TIME</span>
            <span className="cv-v v" id="cvTime">
              {convo.time}
            </span>
          </div>

          <div className="cv-cell meter">
            <span className="cv-k l">PRICE</span>
            <span className="cv-v v" id="cvPrice">
              {money(currentSpec, price ?? currentSpec.initialAskingPrice)}
            </span>
          </div>

          <div className="cv-cell meter rap">
            <span className="cv-k l">RAPPORT</span>
            <div className="cv-bar bar">
              <div
                className="cv-fill"
                id="cvFill"
                style={{
                  width: `${rapport}%`,
                  backgroundColor:
                    rapport >= 60
                      ? '#11663F'
                      : rapport >= 30
                      ? '#F6B82C'
                      : '#D44A28',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Log */}
      <div className="cv-log" id="cvLog" ref={logRef}>
        <div role="status" style={{ fontSize: 12, marginBottom: 8, overflowWrap: 'anywhere' }}>
          {connectionStatus.startsWith('Error:') ? connectionStatus : ''}
          <button type="button" className="btn" onClick={() => setShowSettings(v => !v)}>
            {isConnected ? 'Connection settings' : 'API key / reconnect'}
          </button>
        </div>
        {/* If no API key is set, show vintage key entry card directly inside drawer */}
        {(!apiKey || (!isConnected && connectionStatus !== 'connecting') || showSettings) && (
          <div
            style={{
              background: 'var(--paper)',
              border: '2px solid var(--ink)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '3px 3px 0 var(--ink)',
              margin: '8px 0 16px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '18px' }}>🔑</span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '14px',
                }}
              >
                Connect Gemini Live API Key
              </span>
            </div>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--ink2)',
                lineHeight: 1.4,
                marginBottom: '8px',
              }}
            >
              Practice with Gemini Live. Igbo voice is experimental; pronunciation should be reviewed by fluent speakers. Enter your API
              key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--ink)', textDecoration: 'underline' }}
              >
                Google AI Studio
              </a>
              .
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                aria-label="Gemini API key"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '2px solid var(--ink)',
                  fontSize: '12px',
                  outline: 'none',
                  background: 'var(--paper2)',
                }}
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="btn primary"
                style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
              >
                {connectionStatus === 'connecting' ? 'Reconnect' : 'Connect'}
              </button>
            </div>
          </div>
        )}

        {/* Situational Brief Card */}
        <div
          style={{
            background: 'var(--paper)',
            border: '2px solid var(--ink)',
            borderRadius: '12px',
            padding: '10px 12px',
            margin: '4px 0 10px 0',
            boxShadow: '3px 3px 0 var(--ink)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 900,
              }}
            >
              📍 {currentSpec.title}
            </span>
            <span
              style={{
                fontSize: '10px',
                background: 'var(--marigold)',
                padding: '2px 6px',
                borderRadius: '6px',
                border: '1px solid var(--ink)',
                fontWeight: 700,
              }}
            >
              {currentSpec.commodity}
            </span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--ink2)',
              lineHeight: 1.45,
            }}
          >
            <p style={{ margin: '2px 0' }}>
              <b>Trader:</b> {currentSpec.culturalBrief.who}
            </p>
            <p style={{ margin: '2px 0' }}>
              <b>Cultural Rule:</b> {currentSpec.culturalBrief.culturalRule}
            </p>
            <p style={{ margin: '2px 0', color: 'var(--ink)' }}>
              <b>Target:</b> {currentSpec.culturalBrief.targetPriceText}
            </p>
          </div>
        </div>

        {/* Message stream */}
        {messages.map((m) => {
          if (m.sender === 'sys') {
            return (
              <div key={m.id} className="note">
                <span>{m.text}</span>
                {m.note && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '4px',
                      color: m.bad ? '#D44A28' : '#11663F',
                      fontWeight: 700,
                    }}
                  >
                    {m.bad ? '⚠️ ' : '✨ '}
                    {m.note}
                  </span>
                )}
              </div>
            );
          }

          if (scaffoldingLevel === 3) return null;

          if (m.sender === 'you') {
            return (
              <div key={m.id} className="u-bubble" style={{ alignSelf: 'flex-end' }}>
                <div className="line">{m.text}</div>
                {scaffoldingLevel === 1 && m.en && <div className="hint">{m.en}</div>}
              </div>
            );
          }

          return (
            <div key={m.id} className="m-bubble">
              <div className="line">{m.text}</div>
              {scaffoldingLevel === 1 && m.en && <div className="hint">{m.en}</div>}
            </div>
          );
        })}

        {/* Trader Speaking / Thinking Indicator */}
        {isTraderSpeaking && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '12px',
              background: '#FAD4E7',
              border: '2px solid var(--ink)',
              width: 'fit-content',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '2px 2px 0 var(--ink)',
              animation: 'pulse 1.2s infinite',
            }}
          >
            <span>🎙️</span>
            <span>{currentSpec.traderName} is speaking...</span>
          </div>
        )}
      </div>

      {/* Drawer Bottom Controls */}
      <div className="cv-choices" id="cvChoices">
        {!dealConcluded ? (
          <>
            {/* Guided encounter, then free practice with the live trader */}
            {encounter && !freeOnly && (
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'var(--paper2)',
                  padding: '3px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--ink)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPhase('guided')}
                  title="Coached, step by step"
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '5px 4px',
                    borderRadius: '7px',
                    background: phase === 'guided' ? 'var(--ink)' : 'transparent',
                    color: phase === 'guided' ? 'var(--paper)' : 'var(--ink2)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Guided lesson
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('do')}
                  title={
                    guidedDone
                      ? 'Free practice — she can say anything'
                      : 'Finish the guided lesson first, or jump in anyway'
                  }
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '5px 4px',
                    borderRadius: '7px',
                    background: phase === 'do' ? 'var(--ink)' : 'transparent',
                    color:
                      phase === 'do' ? 'var(--paper)' : guidedDone ? 'var(--ink2)' : 'var(--ink3)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Free practice{guidedDone ? '' : ' ·  unguided'}
                </button>
              </div>
            )}

            {phase === 'guided' && encounter ? (
              <GuidedEncounter
                spec={currentSpec}
                encounter={encounter}
                apiKey={apiKey}
                model={clientRef.current?.getModel()}
                onToast={onToast}
                onRapportChange={setRapport}
                onPriceChange={setPrice}
                onFinished={() => setGuidedDone(true)}
              />
            ) : (
              <>
            {/* Scaffolding level, within the live conversation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--ink2)',
                  textTransform: 'uppercase',
                }}
              >
                {scaffoldingLevel === 1
                  ? 'Full support'
                  : scaffoldingLevel === 2
                  ? 'Clues only'
                  : 'Voice only'}
              </span>

              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  background: 'var(--paper2)',
                  padding: '2px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--ink)',
                }}
              >
                {([1, 2, 3] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: scaffoldingLevel === level ? 'var(--ink)' : 'transparent',
                      color: scaffoldingLevel === level ? 'var(--paper)' : 'var(--ink2)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setScaffoldingLevel(level)}
                  >
                    {level === 1 ? 'Full' : level === 2 ? 'Clues' : 'Voice'}
                  </button>
                ))}
              </div>
            </div>

            {/* Speak Strip: Hold Spacebar or Click Mic to Stream Audio */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '2px 0',
              }}
            >
              <button
                type="button"
                onClick={handleMicClick}
                disabled={!isConnected || isFinishing}
                aria-pressed={isRecording}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  borderRadius: '14px',
                  border: isRecording ? '2px solid #D44A28' : '2px solid var(--ink)',
                  background: isRecording ? '#FAD4E7' : 'var(--paper)',
                  color: isRecording ? '#D44A28' : 'var(--ink)',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                  boxShadow: isRecording
                    ? '0 0 12px rgba(212, 74, 40, 0.45)'
                    : '3px 3px 0 var(--ink)',
                  transform: isRecording ? 'translate(1px, 1px)' : 'none',
                  transition: 'all 0.12s ease',
                  opacity: isConnected ? 1 : 0.6,
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: '18px' }}>
                  {isRecording ? '🔴' : '🎙️'}
                </span>
                <span>
                  {isRecording
                    ? 'Listening… tap to finish, or release Space'
                    : isFinishing ? 'Sending…' : 'Tap to speak, or hold Space'}
                </span>

                {/* Live Volume Audio Level Indicator */}
                {isRecording && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      height: '14px',
                      marginLeft: '4px',
                    }}
                  >
                    {[0.1, 0.25, 0.45, 0.65, 0.85].map((thresh, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: '3.5px',
                          height: micVolume >= thresh ? `${8 + idx * 2.5}px` : '4px',
                          backgroundColor:
                            micVolume >= thresh ? '#D44A28' : 'rgba(212, 74, 40, 0.3)',
                          borderRadius: '2px',
                          transition: 'height 0.06s ease',
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            </div>

            {/* Quick Repair Lifelines to Gemini Live (Dynamic per Language) */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                overflowX: 'auto',
                paddingBottom: '2px',
              }}
            >
              {currentSpec.repairPhrases.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="choice"
                  style={{
                    minHeight: 'auto',
                    padding: '4px 8px',
                    fontSize: '11px',
                    flexShrink: 0,
                    flexDirection: 'row',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                  onClick={() => handleSendRepair(r.yo, r.en)}
                  disabled={!isConnected || isRecording || isFinishing}
                  title={r.en}
                >
                  <span>
                    {r.intent === 'repeat' ? '🔁' : r.intent === 'slow' ? '🐢' : '🇬🇧'}
                  </span>
                  <span
                    className="yo"
                    style={{ fontSize: '11px', fontWeight: 600 }}
                  >
                    {r.yo}
                  </span>
                </button>
              ))}
            </div>

            {/* Scaffolding Prompts (Click to Send to Gemini Live) */}
            {scaffoldingLevel !== 3 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {currentSpec.scaffoldingPrompts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="choice"
                    onClick={() => handleSendPrompt(p)}
                    disabled={!isConnected || isRecording || isFinishing}
                    style={{ opacity: isConnected ? 1 : 0.6 }}
                  >
                    <span className="yo" lang={currentSpec.languageCode}>
                      {scaffoldingLevel === 2 ? p.clueWord : p.fullYo}
                    </span>
                    <span className="en">{scaffoldingLevel === 1 ? p.en : p.intent}</span>
                    {scaffoldingLevel === 1 && <span className="hint">{p.phonetic}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: 'var(--ink2)',
                  fontStyle: 'italic',
                  background: 'var(--paper2)',
                  borderRadius: '12px',
                  border: '1.5px dashed var(--ink)',
                }}
              >
                🎯 Pure voice mode active. Hold Spacebar to speak in {currentSpec.languageName}!
              </div>
            )}

            {/* Custom Text Input to Gemini Live */}
            {scaffoldingLevel !== 3 && <form
              onSubmit={handleSendCustomText}
              style={{ display: 'flex', gap: '6px', marginTop: '2px' }}
            >
              <input
                type="text"
                placeholder={
                  isConnected
                    ? `Or type in ${currentSpec.languageName} / English...`
                    : 'Connect API key to begin...'
                }
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                disabled={!isConnected || isFinishing}
                aria-pressed={isRecording}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '2px solid var(--ink)',
                  background: 'var(--paper)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!isConnected || isRecording || isFinishing || !customTextInput.trim()}
                className="btn primary"
                style={{
                  minHeight: '36px',
                  padding: '0 14px',
                  fontSize: '12px',
                  opacity: isConnected && customTextInput.trim() ? 1 : 0.5,
                }}
              >
                Send
              </button>
            </form>}
              </>
            )}
          </>
        ) : (
          /* Deal Concluded Summary Card */
          <div className="sum">
            <h3>You paid</h3>
            <div className="big">{money(currentSpec, price ?? currentSpec.targetFairPrice)}</div>
            <div style={{ fontSize: '14px', color: 'var(--ink2)' }}>
              Usual asking price: {money(currentSpec, currentSpec.initialAskingPrice)}. Rapport:{' '}
              <b>
                {rapport >= 60
                  ? 'Warm 🤝'
                  : rapport >= 30
                  ? 'Neutral 😐'
                  : 'Cold ❄️'}{' '}
                ({rapport}%)
              </b>
            </div>

            <div
              style={{
                fontSize: '13px',
                background: price && price <= currentSpec.targetFairPrice ? '#D4E8D6' : '#FBD0B4',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1.5px solid var(--ink)',
              }}
            >
              {price && price <= currentSpec.targetFairPrice
                ? `🎉 Goal Achieved: You bought ${currentSpec.commodity} under ${money(currentSpec, currentSpec.targetFairPrice)} while maintaining cultural rapport with ${currentSpec.traderName}!`
                : `💡 Target price was under ${money(currentSpec, currentSpec.targetFairPrice)}. In ${currentSpec.location}, polite persistence and respectful greetings bring the best deal.`}
            </div>

            <div className="btnrow">
              <button type="button" className="btn" onClick={onClose}>
                Leave stall
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => onRestart(currentSpec.languageId === 'hausa' ? 'musa' : currentSpec.languageId === 'igbo' ? 'chioma' : 'bisi')}
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
