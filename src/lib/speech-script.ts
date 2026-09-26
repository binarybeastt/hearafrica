// The lines /api/speech will agree to speak, per language.

import { allEncounters, spokenLines } from '@/data/encounters';
import { ALL_SCENARIOS } from '@/data/scenario-specs';
import { usesTts, voiceFor } from './speech-engines';

/** languageName -> every line its lessons may speak, and the voice that speaks it. */
export function ttsScript(): Map<string, Map<string, string>> {
  const script = new Map<string, Map<string, string>>();
  // Every variant: the greeting a learner hears depends on the clock.
  for (const encounter of allEncounters()) {
    // ALL_SCENARIOS is keyed by language, not by scenario id.
    const spec = Object.values(ALL_SCENARIOS).find((s) => s.id === encounter.scenarioId);
    if (!spec || !usesTts(spec.languageName)) continue;
    const lines = script.get(spec.languageName) ?? new Map<string, string>();
    for (const line of spokenLines(encounter)) lines.set(line, voiceFor(spec));
    script.set(spec.languageName, lines);
  }
  return script;
}
