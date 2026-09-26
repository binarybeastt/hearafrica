// Generated lessons, looked up by scenario id alongside the hand-written ones.
// getEncounter and getLearningContent check here first, so a generated lesson
// runs through the same engine, judge and voice as Iya Bisi's.

import type { Encounter } from './encounters';
import type { LearningContent } from './learning-content';
import type { ScenarioSpec } from './scenario-specs';

export interface RegisteredLesson {
  spec: ScenarioSpec;
  encounter: Encounter;
  content: LearningContent;
}

const lessons = new Map<string, RegisteredLesson>();

export function registerLesson(lesson: RegisteredLesson) {
  lessons.set(lesson.spec.id, lesson);
}

export function registeredLesson(scenarioId: string): RegisteredLesson | undefined {
  return lessons.get(scenarioId);
}
