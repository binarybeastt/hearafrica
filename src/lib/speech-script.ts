// The lines /api/speech will agree to speak, per language.

import { ENCOUNTERS, spokenLines } from '@/data/encounters';
import { ALL_SCENARIOS } from '@/data/scenario-specs';
import { usesTts } from './speech-engines';

/** languageName -> every line its lessons may speak, for the TTS languages. */
export function ttsScript(): Map<string, Set<string>> {
  const script = new Map<string, Set<string>>();
  for (const encounter of Object.values(ENCOUNTERS)) {
    // ALL_SCENARIOS is keyed by language, not by scenario id.
    const spec = Object.values(ALL_SCENARIOS).find((s) => s.id === encounter.scenarioId);
    if (!spec || !usesTts(spec.languageName)) continue;
    const lines = script.get(spec.languageName) ?? new Set<string>();
    for (const line of spokenLines(encounter)) lines.add(line);
    script.set(spec.languageName, lines);
  }
  return script;
}
