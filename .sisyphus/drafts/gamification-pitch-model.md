# Draft: Gamification PoC (#73)

## Requirements (confirmed)
- "Pitch first citizen elitist" — timbre and volume are secondary/irrelevant for game data
- Grid is pitch x pitch (both axes are pitch dimensions)
- Must support microtonal (fifth-size slider = continuously variable tuning)
- "Remember Unix" — compose existing libraries, don't reinvent
- "Focus on 12 EDO first" — pragmatic starting point, must NOT lock out microtonality
- Import from largest open-source song databases (MuseScore, BitMIDI — 113k+ songs)
- Spectrum analyser = future feature, not primary
- Cents as internal intermediate format — architecturally pure, matches synth internals
- Poly-EDO support: architecture must not block it, even if PoC doesn't implement it

## Technical Decisions (confirmed)

### Internal Format: Cents from D4
- One float per pitch. Universal. Matches synth.ts line 341 (already thinks in cents)
- NOT MIDI numbers (12-TET locked, "impure")
- NOT grid coordinates (tuning-dependent meaning)
- NOT Hz (not perceptually uniform)
- Cents IS the logarithmic-physics representation of pitch. Nothing purer exists except raw waveforms.

### Import Pipeline
```
MIDI file:        (noteNumber - 62) × 100        →  cents from D4
MPE/microtonal:   (noteNumber - 62) × 100 + bend →  cents from D4
Any EDO (future): step × (1200 / N)              →  cents from D4
Scala (future):   1200 × log2(ratio)             →  cents from D4
Audio (future):   1200 × log2(hz / 293.66)       →  cents from D4
```

### MIDI Import Behavior
- On .mid file drop: auto-set fifth slider to 700¢ (12-TET)
- If user changes tuning: show warning "Song patterns are 12-TET — intervals will sound different in this tuning"
- This is a FEATURE: "Play Merry Christmas in Pythagorean tuning" is educational and cool
- Warning is informational, not blocking — user can freely change tuning

### Cents → Grid Key Mapping (at game time)
```
Given target cents C and current fifth-size F:
Find [x, y] minimizing |y×1200 + x×F - C|
```
- For 12-TET (F=700): exact for all MIDI-derived notes
- For other EDOs: snaps to nearest grid key (correct musical behavior)

### Song Data Model
```typescript
interface SongNote {
  cents: number;        // cents from D4 (0 = D4, -200 = C4 in 12-TET)
  startMs: number;      // milliseconds from song start
  durationMs: number;   // note length
}

interface Song {
  title: string;
  notes: SongNote[];    // sorted by startMs
  sourceTuning: number; // fifth-size in cents the song was made for (700 for MIDI)
}
```

### MIDI Parser
- Inline, ~200 lines TypeScript. No npm dependency.
- Standard MIDI File format: header chunk + track chunks + delta-time events
- Only extract noteOn/noteOff events + timing
- Linthesia, Rexiano, every Synthesia clone did exactly this

### Game Mechanic: Sequential Glow
- Keys light up one at a time in order
- Player presses the glowing key to advance
- No rhythm/timing for PoC — just learn the pattern
- Score = speed (time to complete)

### Test Strategy: TDD
- Test infrastructure exists (XState + Playwright)
- New tests as StateInvariant objects in invariant-checks.ts
- RED → GREEN → REFACTOR for each component

## Research Findings (from 3 agents)

### Databases
- BitMIDI: 113,229 MIDI files, free, all genres
- Lakh MIDI Dataset: 178,561 files (academic)
- VGMusic: ~45,000 video game music files
- GiantMIDI-Piano: 10,855 high-quality piano transcriptions
- MuseScore.com: 1.5M+ scores, exports MusicXML and MIDI

### What Every Project Uses
Every successful project (Linthesia, Rexiano, MuseScore, tonal.js, Tone.js, Google Magenta, pretty-midi) converged on: `{midi, time, duration, velocity}` — MIDI number + seconds timing.

We use cents instead of raw MIDI to keep the architecture pure for microtonal, but the IMPORT source is the same MIDI files everyone else uses.

### Existing Codebase Assets
- `midiToCoord()` in note-colors.ts — MIDI → grid coords (12-TET)
- `coordToFrequency()` in keyboard-layouts.ts — coords → Hz with arbitrary generator
- `coordToMidi()` in keyboard-layouts.ts — coords → MIDI
- Synth already uses cents internally (synth.ts:341)

### No New Dependencies
Constraint: "No new npm dependencies beyond xstate"
- MIDI parser: inline (~200 lines)
- MusicXML parser (future): browser DOMParser (built-in)
- Pitch detection (future): Web Audio AnalyserNode + small algorithm

## Additional Tasks (from interview)
- EDO vs TET explanation on the site (About dialog or overlay tooltip)
- Tuning warning must be explicit: "Song patterns are 12-TET — this tuning changes how intervals sound. The shapes remain the same."
- Median note auto-sets D-ref on song load (crop notes outside grid range)
- Ghost white note in note visualizer showing expected note by name
- Range detection: use selected keyboard layout's keyMap to compute playable range (min/max x, y coords). For MIDI: expand on first notes received. For touch: visible keys at current zoom.
- Song browser/search: FUTURE (separate issue). PoC = file drop only. Architecture supports both (game engine takes SongNote[], source doesn't matter).

## Metis Gap Analysis Findings
### Questions resolved by user:
- Chords: per issue comments, "if the score is A->B->C->AC, we can play A,G,G,H,B,B,B,B,B,B,C,ABC and that will be valid" — simultaneous notes glow together, pressing ANY one advances. Extra notes don't invalidate.
- Repeated notes: brief visual feedback on advancement (flash/pulse)
- Game UI: controls in overlay (GAME section), glow on canvas during play
- Sustain/vibrato: still work during game (no conflict — Space is not used for game)

### Critical implementation details from Metis:
- `drawCell()` has 4-state union: 'active' | 'sustained' | 'white' | 'black' — need to add 'target'
- Need separate `targetNotes: Set<string>` parallel to `activeNotes` (can't reuse same set)
- `getCellIdsForMidiNotes()` already exists — maps MIDI notes to grid cell IDs
- Must handle: running status in MIDI parser, Note On vel=0 as Note Off, channel 10 (drums) filtering
- No existing file drop or "mode" concept — both must be built
- Priority: active > target > sustained > white/black

### Guardrails from Metis:
- MUST NOT modify render pipeline when game mode is off
- MUST NOT add any npm dependencies
- MUST NOT add rhythm scoring, leaderboards, difficulty levels, auto-play
- MUST NOT block tuning changes — warning only
- Parser must handle Type 0 + Type 1 MIDI, running status, vel=0 Note Off

## Scope Boundaries
- INCLUDE: MIDI import, sequential glow game, TDD tests, tuning warning, EDO vs TET explanation, D-ref auto-centering
- EXCLUDE: rhythm/timing scoring, spectrum analyzer, poly-EDO authoring, MusicXML import, song database browser, adaptive JI
- FUTURE: all of the above, but architecture supports them (no format locks out future features)

## Issue #73 Updated
All context documented in issue comment: https://github.com/zitongcharliedeng/gridinstruments/issues/73#issuecomment-4030403207
