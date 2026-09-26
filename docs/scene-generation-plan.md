# Describe-a-situation: generated practice scenes

A learner types a situation — *"I'm asking my landlord to fix the tap"* — and gets a
3D scene and a guided lesson for it. The model **chooses**; the kit **builds**. It never
emits geometry or coordinates.

## Principles

1. **Compose, don't generate.** Scenes are assembled from a kit of procedural pieces
   (people, vehicles, stalls, shops, trees, roads) in the existing flat-shaded style.
   The model picks a template and fills its slots; templates own all placement.
2. **One lesson format.** A generated lesson is an `Encounter` + `ScenarioSpec`, the
   same data the hand-written ones are. The lesson engine, the pronunciation judge,
   TTS and free practice run it unchanged.
3. **Drafts are labelled.** Generated language is unreviewed. It is shown as a draft
   until a fluent speaker corrects and promotes it — the loop the Iya Bisi script went
   through by hand.
4. **Validated, never trusted.** Model output is checked against a schema; anything
   that fails falls back to defaults rather than reaching the renderer or the engine.

## Phases

### 1. Scene kit — extract what exists (no behaviour change)

`src/components/scene/kit/`

| Module | From | Holds |
| --- | --- | --- |
| `core.ts` | the `mat`/`geo`/`outline` copies in all three scenes | shared material and geometry caches, one `clearKitCaches()` |
| `props.ts` | balogun + nairobi | zinc roof, goods pile, palm, broad tree, jacaranda, umbrella stall, lock-up shop, CBD tower, stage shelter, sealed road, price card |
| `markers.ts` | all three `makePin` copies | waypoint pin, approach ring |
| `life.ts` | the copied update loops | crowd of walkers (blockers + separation), posture animator for the trader, daylight rig |

The three worlds import from the kit. **Safety net:** a scene fingerprint
(`scripts/scene-fingerprint.cjs`) records every mesh's geometry, colour and position for
each world before the refactor, and must match after it.

### 2. Composer and templates

`composeScene(layout: SceneLayout): BuiltScene` — deterministic from a seed.

```ts
interface SceneLayout {
  template: 'market-lane' | 'street' | 'bus-stop';
  dressing: PropKind[];          // e.g. ['umbrella-stalls', 'palms', 'kiosk']
  vehicles: VehicleKind[];       // e.g. ['danfo', 'okada']
  density: 'quiet' | 'busy';
  character: {                   // the person you talk to
    role: string; age: 'young' | 'adult' | 'elder';
    gender: 'man' | 'woman'; head: HeadStyle; cloth?: string;
    stands: 'stall' | 'kiosk' | 'doorway' | 'open';
  };
  seed: number;
}
```

Each template lays out its ground, roads and the character's spot, and exposes slots
the dressing fills. Interiors (a living room, a compound) are **not** in this phase —
nothing in the kit is indoors yet.

### 3. Generation

`POST /api/generate-scenario { description, language }` — server-side, Gemini with a
structured-output schema, returning `{ layout, spec, encounter }`.

- Validated against the schema; unknown props and vehicles are dropped, a missing
  template falls back to `street`.
- Stored server-side by id, so `/api/speech` can extend its allow-list to generated
  lines (it still refuses anything that is not in a script).
- Language is limited to what the pipeline supports (see README, Language support).

### 4. UI

A "Describe a situation" entry → generating state → the composed world opens with the
lesson in the lower third, badged **Draft — not yet reviewed by a fluent speaker**.

## Known limits

- **Audio lags a fresh lesson.** ~20 lines at the TTS tier's 10 requests/minute is about
  two minutes before every line is voiced; lines are fetched in lesson order.
- **The store is in memory.** Fine for one server and one user at a time (the hackathon
  case); a real deployment needs a database.
- **Demo with a checked scenario,** not one generated live in front of judges.

## Status

- [x] 1. Scene kit
- [x] 2. Composer and templates
- [ ] 3. Generation
- [ ] 4. UI
