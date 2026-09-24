// Real-provider smoke test for the guided lesson's audio -> tool verdict path.
// It first asks Live to synthesize a known phrase, then sends those PCM bytes
// into a fresh judge session and requires a score_attempt function call.
const { loadEnvConfig } = require('@next/env');
const { GoogleGenAI, Modality, Type } = require('@google/genai');

loadEnvConfig(process.cwd());
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const model = process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL || 'gemini-3.8-live';
if (!apiKey) {
  console.error('No Gemini API key configured.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const timeout = (label, ms = 30000) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms));

async function synthesize() {
  let session;
  const chunks = [];
  const complete = new Promise(async (resolve, reject) => {
    try {
      session = await ai.live.connect({
        model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage(message) {
            for (const part of message.serverContent?.modelTurn?.parts || []) {
              if (part.inlineData?.data) chunks.push(Buffer.from(part.inlineData.data, 'base64'));
            }
            if (message.serverContent?.turnComplete) resolve();
          },
          onerror: () => reject(new Error('synthesis websocket error')),
          onclose: event => reject(new Error(`synthesis closed (${event.code})`)),
        },
      });
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: 'Say exactly this Yoruba phrase, and nothing else: Ẹ káàárọ̀ ma' }] }],
        turnComplete: true,
      });
    } catch (error) {
      reject(error);
    }
  });
  try {
    await Promise.race([complete, timeout('audio synthesis')]);
    return Buffer.concat(chunks);
  } finally {
    session?.close();
  }
}

async function judge(audio) {
  let session;
  const verdict = new Promise(async (resolve, reject) => {
    try {
      session = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
          systemInstruction: {
            parts: [{ text: 'Listen to the learner saying “Ẹ káàárọ̀ ma”. Call score_attempt exactly once. Do not answer normally.' }],
          },
          tools: [{
            functionDeclarations: [{
              name: 'score_attempt',
              description: 'Report whether the spoken attempt matches the target.',
              parameters: {
                type: Type.OBJECT,
                properties: { correct: { type: Type.BOOLEAN } },
                required: ['correct'],
              },
            }],
          }],
        },
        callbacks: {
          onmessage(message) {
            const call = message.toolCall?.functionCalls?.find(item => item.name === 'score_attempt');
            if (call) resolve(call.args || {});
          },
          onerror: () => reject(new Error('judge websocket error')),
          onclose: event => reject(new Error(`judge closed (${event.code})`)),
        },
      });
      session.sendRealtimeInput({ activityStart: {} });
      for (let offset = 0; offset < audio.length; offset += 3200) {
        session.sendRealtimeInput({
          audio: {
            data: audio.subarray(offset, offset + 3200).toString('base64'),
            mimeType: 'audio/pcm;rate=24000',
          },
        });
      }
      session.sendRealtimeInput({ activityEnd: {} });
    } catch (error) {
      reject(error);
    }
  });
  try {
    return await Promise.race([verdict, timeout('score_attempt')]);
  } finally {
    session?.close();
  }
}

(async () => {
  try {
    const audio = await synthesize();
    if (!audio.length) throw new Error('synthesis returned no audio');
    const result = await judge(audio);
    console.log(`score_attempt received: correct=${result.correct === true}`);
    process.exit(result.correct === true ? 0 : 1);
  } catch (error) {
    console.error(`FAIL: ${String(error.message).replaceAll(apiKey, '[redacted]')}`);
    process.exit(1);
  }
})();
