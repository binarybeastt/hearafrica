// A small real-provider smoke test. Never prints the API key or raw error objects.
const { loadEnvConfig } = require('@next/env');
const { GoogleGenAI, Modality } = require('@google/genai');
loadEnvConfig(process.cwd());
const key = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!key) { console.error('No Gemini API key configured.'); process.exit(1); }
let session;
let finished = false;
const timeout = setTimeout(() => finish('FAIL: no complete response within 30 seconds', 1), 30000);
function finish(message, code) {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);
  console.log(message);
  session?.close();
  setTimeout(() => process.exit(code), 100);
}
let audio = false, transcript = false;
(async () => {
  try {
    session = await new GoogleGenAI({ apiKey: key }).live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        realtimeInputConfig: { automaticActivityDetection: { disabled: true } },
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage(message) {
          if (message.serverContent?.modelTurn?.parts?.some(p => p.inlineData?.data)) audio = true;
          if (message.serverContent?.outputTranscription?.text) transcript = true;
          if (message.serverContent?.turnComplete) finish(`Response complete: audio=${audio}, transcript=${transcript}`, audio && transcript ? 0 : 1);
        },
        onerror() { finish('FAIL: Gemini WebSocket error', 1); },
        onclose(event) { if (!finished) finish(`FAIL: Gemini closed (${event.code}): ${String(event.reason).replaceAll(key, '[redacted]')}`, 1); },
      },
    });
    if (finished) { session.close(); return; }
    console.log('Gemini setup accepted. Requesting a brief spoken Yoruba greeting.');
    session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Say a short greeting in Yoruba.' }] }], turnComplete: true });
  } catch (error) {
    finish(`FAIL: ${String(error.message).replaceAll(key, '[redacted]')}`, 1);
  }
})();
