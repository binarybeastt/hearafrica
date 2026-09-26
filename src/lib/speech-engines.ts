// Which engine speaks a language's scripted lines.
//
// Standalone TTS (gemini-3.8-flash-tts) treats its text as a verbatim
// transcript; the Live reader intermittently drops the final word. Languages
// move to TTS one at a time, once a fluent speaker has listened to the result.
// Yorùbá is not in the TTS docs' language table, but the table stops at "U"
// and a probe synthesized it — see the README's language section.
//
// Keyed on ScenarioSpec.languageName, which is what a SpeakRequest carries.

export const TTS_LANGUAGES: ReadonlySet<string> = new Set(['Èdè Yorùbá']);

export function usesTts(languageName: string): boolean {
  return TTS_LANGUAGES.has(languageName);
}

/**
 * The TTS voice for whoever speaks a lesson's lines. It used to be Kore, a
 * woman's voice, for everyone — Alhaji Musa and Kevo included.
 */
export function voiceFor(speaker: { traderPronouns: { subject: string }; traderAgeGroup: 'elder' | 'peer' }): string {
  if (speaker.traderPronouns.subject !== 'he') return 'Kore';
  return speaker.traderAgeGroup === 'elder' ? 'Charon' : 'Puck';
}
