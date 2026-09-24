// Audio Capture (16kHz PCM16), Pre/Post-buffering, and 24kHz PCM16 Playback

export class AudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  // 250ms pre-buffer ring (at 16kHz, 250ms = 4000 samples)
  private preBufferSize = 4000;
  private preBuffer: Int16Array = new Int16Array(4000);
  private preBufferIndex = 0;
  private isPreBufferFull = false;

  private isRecording = false;
  private volumeCallback?: (vol: number) => void;
  private chunkCallback?: (pcmData: Uint8Array) => void;

  private generation = 0;
  private pendingInit: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (this.audioCtx && this.mediaStream?.getAudioTracks().some(t => t.readyState === 'live')) return true;
    if (this.pendingInit) return this.pendingInit;
    const pending = this.initialize();
    this.pendingInit = pending;
    try { return await pending; }
    finally { if (this.pendingInit === pending) this.pendingInit = null; }
  }

  private async initialize(): Promise<boolean> {
    const generation = this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }
      this.mediaStream = stream;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 16000 });
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Using ScriptProcessorNode for maximum compatibility across browsers for raw PCM16 extraction
      this.processorNode = this.audioCtx.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);

        // Calculate RMS Volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (this.volumeCallback) {
          this.volumeCallback(Math.min(1, rms * 4.5));
        }

        if (this.isRecording) {
          if (this.chunkCallback) {
            this.chunkCallback(new Uint8Array(pcm16.buffer));
          }
        } else {
          // Fill circular pre-buffer ring
          for (let i = 0; i < pcm16.length; i++) {
            this.preBuffer[this.preBufferIndex] = pcm16[i];
            this.preBufferIndex = (this.preBufferIndex + 1) % this.preBufferSize;
            if (this.preBufferIndex === 0) this.isPreBufferFull = true;
          }
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioCtx.destination);
      return true;
    } catch (err) {
      if (generation === this.generation) this.destroy();
      console.warn('Microphone access unavailable or declined:', err);
      return false;
    }
  }

  setCallbacks(
    onChunk: (pcmData: Uint8Array) => void,
    onVolume?: (vol: number) => void
  ) {
    this.chunkCallback = onChunk;
    this.volumeCallback = onVolume;
  }

  async start(): Promise<Uint8Array> {
    // If not yet initialized or tracks ended, initialize on this user gesture
    if (
      !this.audioCtx ||
      !this.mediaStream ||
      this.mediaStream.getAudioTracks().length === 0 ||
      this.mediaStream.getAudioTracks().every((t) => t.readyState === 'ended')
    ) {
      if (!await this.init()) throw new Error('Microphone access is required to speak.');
    }

    // Critical: modern browsers suspend AudioContext until a user gesture triggers resume()
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('Could not resume recording AudioContext:', err);
      }
    }

    this.isRecording = true;

    // Extract ordered pre-buffer to prevent clipping initial syllables
    const orderedPreBuffer = new Int16Array(this.isPreBufferFull ? this.preBufferSize : this.preBufferIndex);
    if (this.isPreBufferFull) {
      const firstPart = this.preBuffer.subarray(this.preBufferIndex);
      const secondPart = this.preBuffer.subarray(0, this.preBufferIndex);
      orderedPreBuffer.set(firstPart, 0);
      orderedPreBuffer.set(secondPart, firstPart.length);
    } else {
      orderedPreBuffer.set(this.preBuffer.subarray(0, this.preBufferIndex), 0);
    }

    this.preBufferIndex = 0;
    this.isPreBufferFull = false;
    return new Uint8Array(
      orderedPreBuffer.buffer,
      orderedPreBuffer.byteOffset,
      orderedPreBuffer.byteLength
    );
  }

  stop(delayMs = 250): Promise<void> {
    return new Promise((resolve) => {
      // Short post-buffer trailing delay to capture final syllable tones
      setTimeout(() => {
        this.isRecording = false;
        if (this.volumeCallback) this.volumeCallback(0);
        resolve();
      }, delayMs);
    });
  }

  destroy() {
    ++this.generation;
    this.pendingInit = null;
    this.preBufferIndex = 0;
    this.isPreBufferFull = false;
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }
}

// 24kHz PCM Audio Output Player for Gemini Live
export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private isPlaying = false;
  private activeSourceNodes: AudioBufferSourceNode[] = [];

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  async resume(): Promise<void> {
    this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('Could not resume playback AudioContext:', err);
      }
    }
  }

  playChunk(pcmData: Uint8Array) {
    this.init();
    if (!this.audioCtx) return;

    // Convert Uint8Array back to 16-bit PCM then to Float32
    const int16View = new Int16Array(
      pcmData.buffer,
      pcmData.byteOffset,
      pcmData.byteLength / 2
    );
    const float32Data = new Float32Array(int16View.length);
    for (let i = 0; i < int16View.length; i++) {
      float32Data[i] = int16View[i] / 32768.0;
    }

    const audioBuffer = this.audioCtx.createBuffer(
      1,
      float32Data.length,
      24000
    );
    audioBuffer.copyToChannel(float32Data, 0);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;
    this.isPlaying = true;

    this.activeSourceNodes.push(source);
    source.onended = () => {
      const index = this.activeSourceNodes.indexOf(source);
      if (index > -1) this.activeSourceNodes.splice(index, 1);
      if (this.activeSourceNodes.length === 0) {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Plays one complete pre-rendered buffer and resolves when it finishes.
   * Used by the drill phases, which play cached audio rather than a live turn.
   */
  playBuffer(pcmData: Uint8Array): Promise<void> {
    this.init();
    if (!this.audioCtx || pcmData.byteLength < 2) return Promise.resolve();
    return new Promise((resolve) => {
      const source = this.audioCtx!.createBufferSource();
      const int16View = new Int16Array(
        pcmData.buffer,
        pcmData.byteOffset,
        Math.floor(pcmData.byteLength / 2)
      );
      const float32Data = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Data[i] = int16View[i] / 32768.0;
      }
      const audioBuffer = this.audioCtx!.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data, 0);
      source.buffer = audioBuffer;
      source.connect(this.audioCtx!.destination);

      this.activeSourceNodes.push(source);
      this.isPlaying = true;
      source.onended = () => {
        const index = this.activeSourceNodes.indexOf(source);
        if (index > -1) this.activeSourceNodes.splice(index, 1);
        if (this.activeSourceNodes.length === 0) this.isPlaying = false;
        resolve();
      };
      source.start();
    });
  }

  // Instant interruption / barge-in cancellation
  stopPlayback() {
    for (const s of this.activeSourceNodes) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        // ignore already stopped
      }
    }
    this.activeSourceNodes = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
    this.isPlaying = false;
  }

  destroy() {
    this.stopPlayback();
    if (this.audioCtx) void this.audioCtx.close().catch(() => {});
    this.audioCtx = null;
    this.nextPlayTime = 0;
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}
