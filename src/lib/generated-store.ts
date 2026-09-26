// Server-side memory of generated lessons, so /api/speech can speak their lines
// while still refusing anything that is not in a script.
//
// In memory, per server instance: enough for one server and a user at a time.
// Kept on globalThis so development hot reloads do not forget it.

import { spokenLines } from '@/data/encounters';
import type { GeneratedLesson } from '@/data/generated';
import { voiceFor } from './speech-engines';

const MAX_LESSONS = 50;

const store: Map<string, GeneratedLesson> =
  ((globalThis as Record<string, unknown>).__hearafricaGenerated as Map<string, GeneratedLesson>) ??
  ((globalThis as Record<string, unknown>).__hearafricaGenerated = new Map<string, GeneratedLesson>());

export function saveGenerated(lesson: GeneratedLesson) {
  store.set(lesson.id, lesson);
  // Oldest first out, so memory stays bounded.
  while (store.size > MAX_LESSONS) store.delete(store.keys().next().value as string);
}

/** The voice for this exact line if a generated lesson in this language has it, else null. */
export function generatedLineVoice(languageName: string, text: string): string | null {
  for (const lesson of store.values()) {
    if (lesson.spec.languageName === languageName && spokenLines(lesson.encounter).includes(text)) {
      return voiceFor(lesson.spec);
    }
  }
  return null;
}
