# HearAfrica

An interactive map and spoken, situational language practice prototype. Four encounters have the full guided lesson — a Yoruba tomato stall, a Hausa leather/dates stall, an Akan kente stall, and a Kiswahili matatu conductor in Nairobi — and an experimental Igbo stockfish stall opens straight into free practice, having no encounter script. They all use the same Gemini Live client.

The Nairobi encounter is the one that is not a market: you catch a matatu rather than buy anything, and the etiquette lesson runs the other way round — the conductor is a young man, so the deference the other four teach is the wrong register for him.

## Run

```sh
npm install
npm run dev -- --port 3010
```

Open http://localhost:3010, choose Yoruba/Hausa/Igbo, and click **Practice Live**. Supply a Gemini API key in the conversation's connection settings, or use the existing local `.env.local` configuration. Editing the key does not connect until you press Connect. Closing the conversation releases its connection and microphone.

The current prototype uses browser-side API keys, including the legacy `NEXT_PUBLIC_GEMINI_API_KEY` configuration. These keys are visible to browser code; **do not deploy a shared long-lived key publicly**. A public version needs server-issued ephemeral Live credentials, authentication and usage limits. `.env.local` is ignored by git.

## The worlds

Africa → country → city is the illustrated 2D map. **Three destinations are 3D worlds**: arriving at the deepest zoom puts you in one, as a figure you walk with WASD, the arrow keys, or by tapping the ground. Each is built procedurally — no models or textures, just primitives flat-shaded in the app's palette, so it is the drawn style extruded rather than a second art direction. The sun follows the simulated clock.

| | | |
| --- | --- | --- |
| **Balogun Market**, Lagos | Iya Bisi | danfo, keke, taxi and okada on the sealed roads |
| **Kejetia Market**, Kumasi | Auntie Akosua | a denser roof sea, trotro and yellow-winged taxis |
| **Kencom Stage**, Nairobi | Kevo | a tarmac apron of painted bays, graffiti matatus, jacarandas under the CBD |

A pin floats over each trader; tap it to walk there, and reaching them opens the lesson. The worlds are described once in `src/data/worlds.ts` — the trader, the scenario, the breadcrumb, the clock's city and the HUD copy all come from that table, so adding a fourth is one entry plus a scene builder.

Nairobi is the one that is not a market, and it is built as a terminus rather than a grid of stalls: Kevo stands at the door of his matatu, and the fare goes on the vehicle's rear board rather than on a chalk card on a counter.

**The map is not equally detailed everywhere.** All three countries you can enter now draw their first-order divisions and name them. Below that, the illustrated city layer — roads, water, districts, traffic — exists **only for Lagos**: it is gated on proximity to Lagos, so Kumasi and Nairobi both zoom to a bare country. Building the equivalent for either means real road and water geometry for that city.

## Learning arc

The lesson is a **guided encounter**, coached step by step. The learner is never asked to produce or interpret something they have not been taught.

1. **The coach says what to do next**, in English — *"You have walked up to Iya Bisi's stall. Greet her before anything else."*
2. **The line is shown**: the phrase, its pronunciation, its meaning, and the chunks it is built from.
3. **The app says it aloud.** The microphone stays locked until it has.
4. **The learner says it back**, holding the button.
5. **The model judges the audio** and reports through a `score_attempt` tool call.
6. **If it missed, it is said again** and the learner repeats. After three real attempts they can move on; skipping is always available and never punished.
7. **The trader reacts to how they actually did** — clean, corrected, skipped, or missing a respect marker.

A few steps are real decisions rather than lines to copy, such as how hard to counter-offer. Those move rapport, set the price, and fork her response — and the learner still has to say their choice aloud.

### It happens in the world, not in a panel

Inside the market the coaching is a **lower third** so the trader stays on screen, and her state is shown by the world rather than by meters:

| | |
| --- | --- |
| What she says | a speech bubble over her head |
| The price | chalked on a board on her counter |
| Rapport | how she stands — arms open when you get it right, folded when a respect marker is missing |

**Free practice** — the live, improvising trader in the full drawer, which has a transcript worth scrolling — unlocks once the guided encounter is complete. It is the graduation, not the entry point.

### Why the model judges, not transcription

Speech recognition for Yorùbá and Hausa drops tone marks and mangles words, so comparing its text against a target both fails correct speech and passes wrong speech. Instead the attempt is judged the way rapport already is: the model hears the audio, is told the exact target phrase, and calls `score_attempt` with a verdict, a coaching note, and what it heard. See `src/lib/pronunciation-judge.ts`.

The judge is told to accept a heavy foreign accent and imperfect tones — they are beginners — but to reject a missing mandatory respect marker outright, however good the rest was.

When no verdict arrives (no audio, a dropped connection, no tool call), the attempt is **inconclusive**: it costs no rapport, does not consume an attempt, and never pushes the learner toward the skip. That is our failure, not theirs.

### Sockets and audio

Both Live sessions are long-lived, because opening one per line was the source of the waits:

- **Speech** (`src/lib/speech-synthesizer.ts`) holds one socket and speaks every line as a turn on it. Opening the lesson warms it and prefetches every line of the encounter — targets, all four reaction variants each, and both counter-offers — so nothing is synthesized while the learner waits.
- **Judging** holds one socket per language. The target phrase is sent as a `TARGET:` turn immediately before each attempt rather than living in the system instruction, and the instruction insists each attempt is judged fresh.

A line is synthesized once and cached in IndexedDB, so replays are instant and free. **Nothing is bundled** — a fresh browser regenerates every line. Audio-only Live sessions cap at 15 minutes; when a socket dies it is nulled and the next request reconnects, costing one retry rather than the lesson.

### Language support

Yorùbá (`yo`), Hausa (`ha`) and Akan (`ak`) are all in the Live API's 99-language list. **Igbo is not**, in either direction — so its audio and its transcription are both unreliable, and it should not be treated as supported. The Live API's language list is much broader than the standalone TTS and Speech-to-Text products; this app uses the Live API for both directions and so is not limited by those.

These are every African language in that list, and they are the only ones a new scenario can be built on:

| | | | |
| --- | --- | --- | --- |
| Afrikaans `af` | Akan `ak` | Amharic `am` | Hausa `ha` |
| Kinyarwanda `rw` | Oromo `om` | Somali `so` | Southern Sotho `st` |
| Swahili `sw` | Tswana `tn` | Wolof `wo` | Yorùbá `yo` |
| Zulu `zu` | | | |

Arabic (`ar`) is also listed and is spoken across North Africa. Notably **absent**, beyond Igbo: Xhosa, Shona, Lingala, Fulfulde, Tigrinya, Chichewa, Ewe, Malagasy, and Nigerian Pidgin. Twi has no entry of its own — it is a dialect of Akan, which is what the Kejetia scenario leans on.

Being on the list is a floor, not a guarantee: it means the model will attempt the language in both directions, not that its tone or register is good. Every line still needs a fluent speaker, and the cache below is how that judgement gets frozen.

Native audio output chooses its language automatically and **does not accept an explicit language code**, so adherence is steered only by system instructions. That makes the audio cache load-bearing rather than merely fast: generate a line once, listen to it, regenerate until it is right, and it is then frozen. Review the cache, not the model.

### The model stops early

Measured against the real provider, synthesis **drops the last word of a line**, intermittently and in every language. "Naenda Westlands." came back as "Naenda"; "Sasa, kondakta?" as "Sasa,". It also sometimes returns about 0.8 seconds of audio whatever the line is. Three things guard against it, and all three are needed:

1. **The reader instruction names the failure.** `READER_INSTRUCTION` in `speech-synthesizer.ts` ends by demanding the final word be pronounced completely with a pause after it. Adding that paragraph measurably lengthened takes across the whole encounter and made several unreliable lines read verbatim on repeat runs.
2. **`plausible()` in `audio-cache.ts` keeps short takes out of the cache**, and its floor is calibrated against measured readings (0.10–0.16 s/char) rather than guessed. It was previously about three times too permissive, so a 0.8s stub of "Naenda Westlands." cleared it and the cache kept the stub forever. A rejected take costs one retry; an accepted fragment costs the lesson.
3. **Lines are written with a tail the clip can eat.** Where a step's meaning sits in the final word, the line is extended so that word is no longer last — "Si ni hamsini kawaida?" became "Si ni hamsini kawaida, bwana?", because *kawaida* is the whole point of the line and it was the word being lost.

Whether any residue is real clipping or only the output transcription losing its last token is **not settled** — telling them apart needs someone to listen to the takes.

## Architecture

- `src/app/page.tsx`: the map, the handoff into a 3D world, and which UI the conversation uses.
- `src/data/worlds.ts`: the 3D worlds and everything each one implies — trader, scenario, breadcrumb, clock city, HUD nouns.
- `src/components/WorldCanvas.tsx`: the illustrated 2D map, Africa down to a city.
- `src/data/geo-admin1.ts`: first-order divisions — Nigeria's states, Ghana's regions, Benin and Niger borderlands (Natural Earth), and Kenya's 47 counties (geoBoundaries, public domain). A language sphere tints the ones it covers, so a language with no polygons under it draws from its hull alone.
- `src/components/scene/`: the 3D worlds — `balogun-scene.ts` (which also defines the `BuiltScene` contract the others implement), `kejetia-scene.ts`, `nairobi-scene.ts`, `MarketScene3D.tsx` (renderer, walking, two-shot camera, speech bubble), `people.ts`, `vehicles.ts`.
- `src/components/EncounterBar.tsx`: the guided lesson as a lower third, used inside the 3D worlds.
- `src/components/ConversationDrawer.tsx`: the full panel, used for free practice and for scenarios with no 3D world (Hausa, Igbo).
- `src/components/phases/GuidedEncounter.tsx`: the lesson loop.
- `src/lib/encounter-engine.ts`: the lesson state machine, pure and unit tested.
- `src/data/encounters.ts`: the scripts — trader lines, coach nudges, target lines, choices, and per-performance reactions. Yorùbá, Hausa, Akan and Kiswahili. **Glosses and lines here are first-pass and not yet reviewed by native speakers.**
- `src/data/learning-content.ts`: chunks — the recombinable units behind the tiles and the mandatory-word checks.
- `src/lib/speech-synthesizer.ts`, `src/lib/audio-cache.ts`: one voice socket, cached per line.
- `src/lib/pronunciation-judge.ts`: judges a spoken attempt via the `score_attempt` tool call.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run check:live
```

`check:live` makes one real provider request using the configured key and checks that audio plus transcription arrive. It consumes API usage.

Run `npm run build` with the dev server **stopped**: `next build` and `next dev` share `.next`, and building over a running dev server leaves it serving 500s until you stop it, clear `.next` and start again.

The automated tests mock audio and transport, and cover the live session lifecycle (stale sessions, explicit speech boundaries, trailing audio, early release, denied microphone, microphone granted after teardown), the lesson state machine (the correction loop, rapport, choices, and that an inconclusive verdict never costs the learner an attempt), and the rule that a truncated take is never cached.

Browser verification performed: map handoff into the 3D market, walking to the stall, the lesson opening on arrival, the two-shot camera, the speech bubble and price card, and cold-cache audio playing in ~11ms after prefetch. For Nairobi: both entry points (the Kiswahili region button and the Kencom Stage map pin), the handoff into the 3D stage, the breadcrumb, the Nairobi clock and its Swahili greeting, walking to Kevo, the lesson opening in the lower third, and the fare board reading head-on.

**Not verified, and it needs a person:** the microphone round trip — holding the button, the audio reaching `PronunciationJudge`, and whether its verdicts are fair. Pronunciation, tone and the wording of every line in `encounters.ts` need a fluent speaker. For Nairobi that specifically means a Kenyan speaker: the encounter leans on Nairobi register (`Sasa`, `Niaje`, `Nishushe hapa`) rather than coastal Swahili, and whether the fares and the conductor's brusqueness ring true is exactly the kind of thing only a local will catch.

API references: [Live guide](https://ai.google.dev/gemini-api/docs/live-guide), [Live API](https://ai.google.dev/gemini-api/docs/live-api).
