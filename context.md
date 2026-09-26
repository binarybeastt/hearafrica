# HearAfrica — context

Where the project stands and what is left, language by language. Written 2026-09-26; everything
is on `main`. For how things work, see `README.md`; for the generated-scene
plan, `docs/scene-generation-plan.md`.

## What it is

A pan-African spoken-language app for people about to face a real situation — a market, a
bus, a landlord, a family visit — in the language of the place. You walk into a 3D world,
reach the person, and are coached through the exchange line by line: you hear each line,
say it back, and a model listening to your audio judges it, including whether you kept the
respect words. Or you describe your own situation and get a scene and lesson drafted for it.

## How it is built

| Job | Model | Why |
| --- | --- | --- |
| Speaking scripted lines | `gemini-3.8-flash-tts` (Yorùbá only so far) or the Live API | TTS reads text verbatim; Live drops the last word intermittently |
| Judging an attempt | Gemini Live, one open socket per lesson | Hears the audio against the target; speech-to-text drops tone marks and garbles Akan and Igbo |
| Free practice | Gemini Live | Real-time, improvised conversation |
| Drafting a situation | `gemini-3.8-flash`, structured output | Returns choices and lines; code checks every field |

- **Keys never reach the browser.** `/api/live-token` issues single-use ephemeral Live tokens; `/api/speech` and `/api/generate-scenario` run server-side. There is no way to enter a key in the app.
- **Scenes are composed, not generated.** A layout (template, props, vehicles, person) is built from a shared kit (`src/components/scene/kit/`). Templates: `street`, `market-lane`, `bus-stop`, `parlour`, `counter`.
- **One lesson format** for hand-written and generated lessons: `ScenarioSpec` + `Encounter` + chunks.

## Done

**Platform**
- Git repo, private GitHub remote (`binarybeastt/hearafrica`).
- Server-held key: ephemeral tokens for Live, server routes for TTS and generation, rate limits and cross-site refusal on each.
- Scene kit extracted from the three hand-built worlds, proven unchanged by `npm run check:scenes` (scene-graph fingerprints).
- Audio cache keyed by line text, so a reworded line gets new audio.
- 56 tests pass; typecheck and production build clean; the key is absent from the build output.

**Across languages**
- The judge understands fused respect words and re-checks a failing attempt twice before telling the learner; missing respect is only reported when every check agrees.
- TTS voices follow the speaker (Kore for women, Charon for elder men, Puck for young men); lessons fall back to the Live voice when TTS is out.

**Lessons**
- Iya Bisi (Balogun) rewritten with a Lagos Yorùbá speaker: asking how she sells, prices said in English, bulk basket, jàra, elder register.
- Iya Bisi extended to 7 steps: greeting follows the world clock, a note on the register she answers in, *Ẹ kú ọjà*, asking her to repeat (she answers slowly), a walk-away bargaining option, peppers asked from memory.
- Stalls are closed at night; the lesson waits for daytime.

**Practise your own situation**
- Describe a situation → a composed 3D scene and a guided lesson, badged as a draft.
- Indoor rooms (parlour, counter) with seated people and walls.
- The draft's greeting follows the clock; the prompt defines "correct" as how locals say it, not the textbook translation.

## Status by language

The gate for any language is the Live API's language list, because judging runs on Live
(see the README's Language support). TTS is a quality upgrade on
top, not a requirement.

| Language | Guided lesson | 3D world | Scripted voice | Reviewed by a speaker | Generation |
| --- | --- | --- | --- | --- | --- |
| **Yorùbá** | Iya Bisi, 7 steps | Balogun Market | TTS | Mostly — see open lines below | ✅ |
| **Hausa** | Alhaji Musa, 4 steps | none (drawer only) | Live | ❌ | ✅ |
| **Akan (Twi)** | Auntie Akosua, 5 steps | Kejetia Market | Live | ❌ | ✅ |
| **Swahili** | Kevo, 5 steps | Kencom Stage | Live | ❌ | ✅ |
| **Igbo** | free practice only | none | Live | ❌ | ❌ |

**Igbo:** decided to leave out — neither Live nor transcription supports it, so attempts cannot be judged reliably. Still in the code (language button, free-practice scenario, map sphere); whether to remove it entirely or only hide it is **undecided**.

**Could be added** (on the Live list, and on the TTS list, so both voice and judging work): Afrikaans, Amharic, Kinyarwanda, Somali, Southern Sotho, Arabic.
**Live only** (judging works, but scripted lines would use the Live voice and its clipping): Zulu, Wolof, Tswana, Oromo.

## Left to do

### Every language

1. **Grounding generated language.** Drafts are often grammatical but not how people speak (e.g. *Élò ni kẹ̀tẹ́ tòmátì yìí?* where a Lagosian asks *Báwo lẹ ṣe lé…*). In order of value:
   - A **style guide per language** written from a speaker's corrections, added to the generation prompt.
   - **Approved lines as examples** for the closest situations.
   - A **phrase bank** for tourist basics; Wikivoyage phrasebooks (CC BY-SA) can seed it.
   - **✓ verified / ⚠ draft** labels per line, and a "we'd say it like this" correction button that feeds the bank.
2. **Native-speaker review** of every hand-written lesson outside Yorùbá.
3. **Moving each language's scripted voice to TTS** — one line in `src/lib/speech-engines.ts` per language, after someone fluent has listened to the result.
4. **TTS quota — the real blocker.** `gemini-3.8-flash-tts` allows **100 requests a day** (and 10/minute) on the current tier, shared by every learner; one fresh browser's Iya Bisi lesson uses 25–45. When it runs out, lines fall back to the Live voice (shipped), but that brings back Live's clipping. Fix before moving more languages to TTS: generate each lesson's audio once and serve it as files (spread over a few days at 100/day), or upgrade the tier.

### Yorùbá

- Lines not yet confirmed by a speaker: *Dáadáa ni ma. Ẹ kú ọjà o!* and *O ṣé o, ọmọ mi!*; the walk-away (*Ó dáa ma, mo ń lọ* / *Wá, wá! … fifty-two thousand*); the peppers step (*Ata rodo? Paint kan jẹ́ three thousand*); *pàdánù*; *lé* in *báwo lẹ ṣe lé*; the evening greeting spelled *Ẹ káalẹ́*.
- Prices (₦4,000 a paint, ₦60,000 a basket, ₦50,000 settled, ₦3,000 peppers) are estimates.
- Her slow repeat plays at 17.6s — possibly too slow; a gentler pace may read better.

### Hausa

- **TTS checked:** all 16 lines voiced completely (voice Charon — Musa is an elder man); spoken prices come back from transcription as digits, not as missing words. Ready to switch on (`TTS_LANGUAGES` in `src/lib/speech-engines.ts`) once the quota problem is solved.
- **Judge checked:** correct lines pass 9/9; a greeting without *Alhaji* is rejected 3/3.
- *Ina kwana?* is a morning greeting, but the lesson uses it at any hour; a Hausa speaker should supply afternoon/evening forms.
- No 3D world: a Kano world (Kurmi Market or the Kofar Mata dye pits) would bring it level with the others.
- Lesson unreviewed.

### Akan (Twi)

- **Greeting follows the clock** (*Maakye / Maaha / Maadwo*, from the clock's own table); the learner's *Yaa ɛna* stays, as the reply to an elder woman at any hour — a speaker should confirm.
- **Judge checked:** correct lines pass 8/9; *Yaa ɛna* without *Auntie* is rejected 3/3. A wrong-register *Yaa nua* test passed, but its audio came from the Live voice, which may have "corrected" it — retest with TTS audio.
- TTS not yet checked (quota ran out before its lines).
- Lesson unreviewed; needs a Ghanaian speaker (Twi is a dialect of Akan).
- Transcription does not support Akan at all — judging must stay on Live.

### Swahili

- **Judge inconclusive:** *Naenda Westlands, tafadhali* and *Nishushe hapa, tafadhali* failed every check, heard as *Nenda…* and *Nishuuhapa*. The test audio came from the Live voice (TTS quota spent), so the fault may be the audio, not the judge — retest with TTS audio or a real recording before changing anything.
- TTS voice will be Puck (Kevo is a young man); not yet checked (quota).
- Lesson unreviewed; needs a *Kenyan* speaker specifically — it leans on Nairobi register (*Sasa*, *Niaje*), not coastal Swahili, and on real matatu fares.

### Scenes

- **Rooms not yet seen on screen** — the parlour and counter pass their tests but the browser pane was hidden when they were built. Look at them in `/dev/scenes`.
- **Attractions**, proposed and awaiting a decision: three templates — gallery/museum (Nike Art Gallery, Nairobi National Museum, Manhyia Palace Museum, Gidan Makama), palace or compound courtyard (Manhyia, the Emir's Palace; also the landlord scenes), performance ground (Bomas of Kenya, Freedom Park) — plus two landmark models, the National Theatre and the Kofar Mata dye pits. Whether they become enterable map landmarks is also undecided.

## Known issues

- The Live line voice (Hausa, Akan, Swahili) is never closed when a lesson ends; it lives until Gemini drops it (≤15 min).
- The map's night shading throws `createImageData … not of type 'long'` on load (`WorldCanvas.tsx` `drawNight`). A separate task was started for it.
- Tunde (a Yorùbá NPC on the 2D Lagos map) has no scenario and probably opens Iya Bisi's conversation — not verified.
- Generated lessons are held in memory on the server; a restart forgets them.

## Shipping

- Everything is merged into `main` and pushed; `server-live-tokens` points at the same commit.
- Deploy target: Vercel recommended (nothing needs a long-running server). Set `GEMINI_API_KEY` in the host's environment, never with a `NEXT_PUBLIC_` prefix.
- Checks: `npm test`, `npm run typecheck`, `npm run build` (dev server stopped), `npm run check:scenes`.
