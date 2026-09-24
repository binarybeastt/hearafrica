// Google Gemini Live Client
// Implemented directly with @google/genai following the official capabilities specification:
// https://ai.google.dev/gemini-api/docs/live-api/capabilities

import { GoogleGenAI, Modality, Type, type Session, type LiveServerMessage } from '@google/genai';
import { BALOGUN_IYA_BISI_SPEC, ScenarioSpec } from '@/data/scenario-specs';
import { AudioRecorder, AudioPlayer } from './audio-worklet';
import { liveToken } from './live-credentials';

export interface GameStateUpdate {
  rapportDelta: number;
  currentPrice?: number;
  dealConcluded?: boolean;
  culturalNote?: string;
  transcriptYo?: string;
  transcriptEn?: string;
}

export interface LiveClientCallbacks {
  onGameStateChange?: (update: GameStateUpdate) => void;
  onTraderTurnStart?: () => void;
  onTraderTurnEnd?: () => void;
  onVolumeChange?: (vol: number) => void;
  onConnectionChange?: (connected: boolean, error?: string) => void;
  onTraderSpeechText?: (text: string, isComplete?: boolean) => void;
  onUserSpeechText?: (text: string) => void;
}

// Recommended live model per official docs: https://ai.google.dev/gemini-api/docs/live-api/capabilities
export const RECOMMENDED_LIVE_MODEL = 'gemini-3.8-live';

export class GeminiLiveClient {
  private session: Session | null = null;
  private generation = 0;
  private speechStart: Promise<void> | null = null;
  private speechEnding = false;
  private recorder: AudioRecorder = new AudioRecorder();
  private player: AudioPlayer = new AudioPlayer();
  private spec: ScenarioSpec = BALOGUN_IYA_BISI_SPEC;
  private isConnected = false;
  private isSpeechActive = false;
  private isTraderTurnActive = false;
  private currentTraderTranscript = '';
  private model: string = RECOMMENDED_LIVE_MODEL;
  private voice: string = 'Aoede';

  private callbacks: LiveClientCallbacks = {};

  constructor() {
    if (typeof window !== 'undefined') {
      const storedModel = localStorage.getItem('hearafrica_gemini_live_model');
      if (storedModel) {
        this.model = storedModel;
      }
    }
  }

  setModel(model: string) {
    this.model = model.trim() || RECOMMENDED_LIVE_MODEL;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hearafrica_gemini_live_model', this.model);
    }
  }

  getModel(): string {
    return this.model;
  }

  setCallbacks(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(spec: ScenarioSpec = BALOGUN_IYA_BISI_SPEC): Promise<boolean> {
    this.disconnect();
    const generation = this.generation;
    this.spec = spec;

    // Request the microphone only when the learner chooses to speak.
    this.recorder.setCallbacks(
      (chunk) => this.handleOutgoingAudioChunk(chunk),
      (vol) => this.callbacks.onVolumeChange?.(vol)
    );

    try {
      // Create GoogleGenAI client as specified in official docs:
      // https://ai.google.dev/gemini-api/docs/live-api/capabilities
      const token = await liveToken();
      if (generation !== this.generation) return false;
      const ai = new GoogleGenAI({ apiKey: token });

      const connecting = ai.live.connect({
        model: this.model,
        callbacks: {
          // A WebSocket opening is not yet a successful setup handshake.
          onopen: () => {},
          onmessage: (message: LiveServerMessage) => {
            if (generation === this.generation) this.handleServerMessage(message);
          },
          onerror: (err: ErrorEvent) => {
            if (generation !== this.generation) return;
            this.disconnect();
            this.callbacks.onConnectionChange?.(false, err.message || 'Gemini connection failed. Check your key and network.');
          },
          onclose: (event: CloseEvent) => {
            if (generation !== this.generation) return;
            this.disconnect();
            this.callbacks.onConnectionChange?.(false, event.reason || `Gemini disconnected (code ${event.code}). Reconnect to continue.`);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: this.spec.systemPrompt }],
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'update_game_state',
                  description:
                    'Update the cultural rapport and agreed price based on learner dialogue and the scenario’s cultural etiquette.',
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      rapport_delta: {
                        type: Type.INTEGER,
                        description: 'Change in rapport (-20 to +30) based on learner etiquette and respect.',
                      },
                      current_price: {
                        type: Type.INTEGER,
                        description: 'Current agreed price in Naira (e.g. 1800) if discussed.',
                      },
                      deal_concluded: {
                        type: Type.BOOLEAN,
                        description: 'Set to true when the transaction is completed.',
                      },
                      cultural_note: {
                        type: Type.STRING,
                        description: 'Brief feedback on cultural etiquette, elder greeting, or tone usage.',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      });

      // Close a late socket even when setup timed out or the user left the scenario.
      void connecting.then(session => {
        if (generation !== this.generation) session.close();
      }).catch(() => {});
      let timer: ReturnType<typeof setTimeout> | undefined;
      const session = await Promise.race([
        connecting,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Gemini setup timed out. Check your network and reconnect.')), 20000);
        }),
      ]).finally(() => clearTimeout(timer));

      if (generation !== this.generation) {
        session.close();
        return false;
      }
      this.session = session;
      this.isConnected = true;
      if (this.callbacks.onConnectionChange) {
        this.callbacks.onConnectionChange(true);
      }
      return true;
    } catch (err: any) {
      if (generation !== this.generation) return false;
      this.disconnect();
      this.isConnected = false;
      if (this.callbacks.onConnectionChange) {
        this.callbacks.onConnectionChange(false, err?.message || 'Failed to connect');
      }
      return false;
    }
  }

  disconnect() {
    ++this.generation;
    this.isSpeechActive = false;
    this.speechEnding = false;
    this.speechStart = null;
    this.isTraderTurnActive = false;
    this.currentTraderTranscript = '';
    if (this.session) {
      try {
        this.session.close();
      } catch {
        // ignore
      }
      this.session = null;
    }
    this.isConnected = false;
    this.player.destroy();
    this.recorder.destroy();
    this.callbacks.onConnectionChange?.(false);
    this.callbacks.onTraderTurnEnd?.();
    this.callbacks.onVolumeChange?.(0);
  }

  // --- AUDIO STREAMING INPUT ---

  async startSpeechTurn() {
    if (!this.session || !this.isConnected) throw new Error('Connect Gemini Live first.');
    if (this.isSpeechActive || this.speechStart || this.speechEnding) return;
    const generation = this.generation;
    const session = this.session;
    const start = (async () => {
      await this.player.resume();
      if (generation !== this.generation) return;
      if (!await this.recorder.init()) throw new Error('Microphone unavailable. Allow microphone access, or use text.');
      if (generation !== this.generation) return;
      this.player.stopPlayback();
      this.currentTraderTranscript = '';
      this.isTraderTurnActive = false;
      this.callbacks.onTraderTurnEnd?.();
      session.sendRealtimeInput({ activityStart: {} });
      this.isSpeechActive = true;
      const preBuffer = await this.recorder.start();
      if (generation === this.generation && preBuffer.length) this.sendPcmChunk(preBuffer);
    })();
    this.speechStart = start;
    try { await start; }
    finally { if (this.speechStart === start) this.speechStart = null; }
  }

  private handleOutgoingAudioChunk(pcmData: Uint8Array) {
    if (!this.isSpeechActive) return;
    if (this.session && this.isConnected) {
      this.sendPcmChunk(pcmData);
    }
  }

  private sendPcmChunk(pcmData: Uint8Array) {
    let binary = '';
    const bytes = new Uint8Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    try {
      // Official SDK method: session.sendRealtimeInput
      this.session?.sendRealtimeInput({
        audio: {
          data: base64Data,
          mimeType: 'audio/pcm;rate=16000',
        },
      });
    } catch (err) {
      console.error('Error sending audio chunk to Gemini Live:', err);
    }
  }

  async endSpeechTurn() {
    if (this.speechEnding) return;
    this.speechEnding = true;
    const generation = this.generation;
    try {
      await this.speechStart;
      if (!this.isSpeechActive || generation !== this.generation) return;
      // Keep forwarding audio until the trailing syllables have been captured.
      await this.recorder.stop(300);
      if (generation !== this.generation) return;
      this.isSpeechActive = false;
      this.session?.sendRealtimeInput({ activityEnd: {} });
    } finally {
      if (generation === this.generation) this.speechEnding = false;
    }
  }

  // --- TEXT / SUGGESTED PROMPTS INPUT ---

  async sendTextMessage(text: string) {
    if (!this.session || !this.isConnected) {
      console.warn('Cannot send text: Gemini Live session is not active.');
      return;
    }

    await this.endSpeechTurn();
    if (!this.session || !this.isConnected) return;

    // Ensure audio playback context is resumed on this user interaction
    await this.player.resume();
    this.player.stopPlayback();
    this.currentTraderTranscript = '';
    this.isTraderTurnActive = false;

    try {
      // Official SDK method: session.sendClientContent
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.error('Error sending client content to Gemini Live:', err);
    }
  }

  // --- SERVER RESPONSE HANDLING ---

  private handleServerMessage(message: LiveServerMessage) {
    try {
      // 1. Interruption / Barge-in: Stop trader audio immediately
      if (message.serverContent?.interrupted) {
        this.player.stopPlayback();
        this.isTraderTurnActive = false;
        this.currentTraderTranscript = '';
        this.callbacks.onTraderTurnEnd?.();
      }

      // 2. Audio chunks from modelTurn
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            // 24kHz PCM16 audio
            const binary = atob(part.inlineData.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            this.player.playChunk(bytes);
            if (!this.isTraderTurnActive) {
              this.isTraderTurnActive = true;
              if (this.callbacks.onTraderTurnStart) {
                this.callbacks.onTraderTurnStart();
              }
            }
          }
        }
      }

      // 3. Audio Transcriptions / Text chunks from Gemini Live
      const textChunk =
        message.serverContent?.outputTranscription?.text ??
        message.serverContent?.modelTurn?.parts?.find((p) => p.text)?.text;

      if (textChunk) {
        this.currentTraderTranscript += textChunk;
        if (this.callbacks.onTraderSpeechText) {
          this.callbacks.onTraderSpeechText(this.currentTraderTranscript, false);
        }
      }

      if (message.serverContent?.inputTranscription?.text) {
        if (this.callbacks.onUserSpeechText) {
          this.callbacks.onUserSpeechText(message.serverContent.inputTranscription.text);
        }
      }

      // 4. Turn Complete
      if (message.serverContent?.turnComplete) {
        this.isTraderTurnActive = false;
        if (this.callbacks.onTraderSpeechText && this.currentTraderTranscript) {
          this.callbacks.onTraderSpeechText(this.currentTraderTranscript, true);
        }
        this.currentTraderTranscript = '';
        if (this.callbacks.onTraderTurnEnd) {
          this.callbacks.onTraderTurnEnd();
        }
      }

      // 5. Handling Tool Calls (update_game_state)
      // NOTE: @google/genai requires each FunctionResponse to contain { id, name, response }
      if (message.toolCall?.functionCalls && message.toolCall.functionCalls.length > 0) {
        const functionResponses = [];

        for (const call of message.toolCall.functionCalls) {
          if (call.name === 'update_game_state') {
            const args = (call.args as any) || {};
            if (this.callbacks.onGameStateChange) {
              this.callbacks.onGameStateChange({
                rapportDelta: typeof args.rapport_delta === 'number' && Number.isFinite(args.rapport_delta)
                  ? Math.max(-20, Math.min(30, args.rapport_delta)) : 0,
                currentPrice: typeof args.current_price === 'number' && Number.isFinite(args.current_price) && args.current_price >= 0
                  ? Math.round(args.current_price) : undefined,
                dealConcluded: args.deal_concluded === true,
                culturalNote: typeof args.cultural_note === 'string' ? args.cultural_note : undefined,
              });
            }
          }

          functionResponses.push({
            id: call.id || 'call_id',
            name: call.name || 'update_game_state',
            response: {
              output: {
                status: 'ok',
                prompt: `Now speak your in-character verbal dialogue response out loud to the learner in ${this.spec.languageName}.`,
              },
            },
          });
        }

        if (this.session && functionResponses.length > 0) {
          try {
            this.session.sendToolResponse({
              functionResponses,
            });
          } catch (err) {
            console.error('Failed to send toolResponse to Gemini Live:', err);
          }
        }
      }
    } catch (e) {
      console.error('Error handling Gemini Live server message:', e);
    }
  }

  get isLive(): boolean {
    return this.isConnected;
  }

  get traderSpeaking(): boolean {
    return this.player.playing;
  }
}
