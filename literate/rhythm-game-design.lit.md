# Rhythm Game Mode — Design Document

Design decisions for the rhythm/learning game mode. This is a living document — TODOs are inline with the decisions they belong to. When a TODO is completed, it becomes prose with a link to the implementation.

This document is a literate spec — no code blocks to tangle. Implementation lives in other `.lit.md` files (`game-engine.lit.md`, `machines/gameMachine.lit.md`, future `rhythm-*.lit.md`). All code, configs, tests, workflows, and platform wrappers are tangled from `.lit.md` files — no exceptions.

See also: [GitHub Issue #156](https://github.com/zitongcharliedeng/gridinstruments/issues/156) (external contributor discussion mirror).

---

## First-Class Notation: Approach Circles

The grid IS the score. Notes appear **in-place on the cell** where the finger needs to be.

- **Approach circle** (shrinks toward the cell center) signals timing — hit when it converges
- This is the only notation native to 2D — it says "this cell, this moment" without imposing a scroll direction
- The shape recognition advantage: chords appear as their geometric shape (triangle = triad) before you hit them
- Draw connecting lines between simultaneous approach circles so the player sees chord shapes forming

### Optional Secondary Notations

These are opt-in, never default:

- Traditional staff notation (read-only overlay)
- QWERTY-mapped scrolling view
- Vertical lane view (for players coming from osu/bemuse)
- Fade-in notation (cells brighten rather than shrink)

Players choose their notation. The approach circle is the default because it reflects what the fingers actually do.

### Held Notes & Touch Occlusion

On touchscreens, the finger covers the cell being held, hiding release timing.

Solutions (layered, all active):

1. **Audio-first** — backing track is drums-only, so the sustained note IS the sound. Release timing is audible from musical context.
2. **Halo/ring outside finger shadow** — visible edge indicator that drains/shrinks during the hold
3. **Haptic pulse at release point** — vibration stops or buzzes at release time (mobile only)
4. **Larger cells** — fingertip covers center, edge indicator stays visible

- [ ] Prototype approach circle rendering on the existing Canvas grid
- [ ] Determine approach circle animation curve (linear shrink vs eased)
- [ ] Prototype held-note halo that's visible outside finger shadow
- [ ] Test haptic feedback on Android/iOS for release timing

---

## Feedback System: Emergent, Not Discrete

No "PERFECT/GREAT/GOOD" text overlays. Everything is a continuous gradient.

### Scaled 808 Hit Effect

A percussive hit effect (808/click) plays on every note hit. Its **quality scales continuously** with timing accuracy:

- Dead-on → full, warm, resonant 808 with natural decay
- Slightly off → thinner, less body
- Way off → dry click, almost no resonance

Implementation: apply a low-pass filter proportional to timing delta (ms). Accurate = full spectrum. Inaccurate = progressively filtered. One continuous parameter.

### Feedback Stack

| Layer | What | How |
|-------|------|-----|
| 1. Note pitch | You hear what you're playing | Primary feedback — the song sounds right or wrong |
| 2. Scaled 808 | Percussive layer whose richness reflects accuracy | Low-pass filter scaled by timing delta |
| 3. Visual ripple | Brief cell flash, intensity scales with accuracy | Canvas animation, no text popup |
| 4. Absence | Silence/dissonance on miss IS the feedback | No note = gap in the music |
| 5. Release | Natural decay on correct release, abrupt cut on early | Audio envelope tied to hold state |

### Scoring: Single Continuous Number

- Timing delta (ms) mapped to a score curve — the number speaks for itself
- No combo multipliers (they reward streaks over accuracy — fake signal)
- No discrete buckets
- The song itself is the score — it sounds better when you play better

### Backing Track: Drums Only

- Player's hits ARE the harmony
- No pre-baked harmony that masks bad playing
- Silence when you miss — that's the feedback
- Transparency: you hear exactly what you're doing right and wrong

- [ ] Design the 808 filter scaling curve (linear? logarithmic? perceptual?)
- [ ] Implement continuous score from timing delta
- [ ] Prototype drums-only backing track separation (or author drum-only tracks)
- [ ] Visual ripple effect on Canvas cells (intensity ∝ accuracy)

---

## Menu: The Grid IS the Interface

No traditional menu screens. The grid is always present and always playable.

### States (XState machine, same visual surface)

| State | Grid behavior | Overlay |
|-------|---------------|---------|
| `freePlay` | Live, no approach circles, noodle freely | None — you're playing |
| `songSelect` | Faded preview of first few notes | Song cards overlaid on grid |
| `playing` | Approach circles active, drums backing | Score number, minimal HUD |
| `paused` | Grid frozen | Resume/quit options as chord shapes |
| `results` | Grid shows replay ghost | Final score, no letter grade |

### Transitions Are Not Page Navigations

The grid never leaves the screen. State changes = the grid changing behavior + minimal overlays.

- Zero screens before first note (anti-pattern: Menu → Mode → Song → Difficulty → Loading → Play)
- Instant response on every tap (no async spinners)
- Sound on every interaction, not just during songs

- [ ] Design the XState machine for game mode states
- [ ] Prototype song-select overlay on the grid
- [ ] Define transition animations (approach circles fade in/out)

---

## Chord-Based Navigation

Menu buttons are chord shapes overlaid on the grid. One UI element, multiple input methods.

### Input Methods (always a fallback)

| Input | How to "confirm" | Skill level |
|-------|-------------------|-------------|
| Mouse | Click the triangle shape | Anyone |
| Touch | Tap center of the triangle | Anyone |
| Tab + Enter | Standard keyboard nav (a11y) | Anyone |
| Keyboard grid | Press all 3 keys forming the chord | Learning |
| MIDI controller | Play the actual chord on hardware | Musician |

### Chord → Action Mapping

| Chord | Action | Emotional mapping |
|-------|--------|-------------------|
| Major | Confirm / Select | Affirmative, bright |
| Minor | Back / Cancel | Retreat, soft |
| Diminished | Delete / Discard | Tension, destruction |

### Position-Agnostic Detection

Chord detection matches **interval patterns, not absolute cell positions**. A major chord anywhere on the grid triggers "confirm." The visual triangle overlay is a suggestion (default: centered around D-ref), but input is accepted from any position.

This is possible because the layout is isomorphic — the shape is the same everywhere.

### Accessibility: Three Tiers

1. **A11y standard** — Tab to focus → Enter/Space to activate. Screen reader announces "Confirm — or play a major chord."
2. **Casual** — Mouse click / touch tap on the triangle shape
3. **Musical** — Play the chord shape anywhere on grid

All three fire the same XState transition. The machine doesn't know which input method was used.

Triangle overlays are real focusable DOM elements with `aria-label`, not just Canvas drawings.

- [ ] Implement chord shape detection (interval-based, position-agnostic)
- [ ] Create focusable DOM overlay elements for menu buttons
- [ ] Wire chord detection + click + tab/enter to same XState events
- [ ] Design visual appearance of chord-shape menu buttons on grid

---

## Pattern Recognition & Shape Notation

The isomorphic layout means shapes ARE theory:

- Major chord = same triangle everywhere
- Minor chord = different triangle, also position-invariant
- Approach circles draw connecting lines between simultaneous notes → chord shapes visible before you hit them

### Two-Hand Optimization

- Color-code L/R hand notes (e.g., blue/yellow)
- Song charts specify hand assignment per note
- Mirrored/duplicate notes (same pitch, multiple grid positions) → chart picks most ergonomic position

### Tuning

- **12-TET is MVP** — Eb = D# = same cell. One grid.
- Isomorphic grid supports arbitrary tunings by design — microtonal is a parameter change, not architecture change
- Non-12-TET (19-TET, 31-TET, just intonation) → denser grid. Future feature.

- [ ] Prototype chord-shape connecting lines between simultaneous approach circles
- [ ] Design hand-assignment data format for song charts
- [ ] Test approach circles with non-12-TET tunings (do the shapes still work?)

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Game state | XState v5 | Typed machines, auto-generated tests, actor model, visual inspector |
| Rendering | Canvas 2D (existing) | Already works, fast enough for grid + approach circles |
| Audio | Web Audio AudioWorklet | Separate thread, clean message-passing boundary |
| Scoring | Pure functions | Timing delta → score curve, unit-testable |
| MIDI | Web MIDI API (existing) | Already implemented in `midi-input.lit.md` |

### WASM Strategy

Start pure web. WASM is a surgical upgrade to the AudioWorklet **only if** JS audio becomes a measured bottleneck. The AudioWorklet boundary is already isolated — swapping JS for WASM is a file swap, not a rewrite.

### What NOT to use

- **Effect-TS** for game loop — overkill, adds latency (Effect-TS is already scoped to `services/` only)
- **Rust state machines** — lose XState test generation and inspector
- **Full WASM from day one** — adds build complexity, hurts accessibility

### Testing

- XState `@xstate/test` generates test paths from the game state machine
- Scoring functions are pure → unit tests via `bun:test` or Playwright
- Approach circle timing vs audio sync → integration test with real AudioContext
- Input latency → `performance.now()` assertions
- Existing `tests/xstate-graph.spec.ts` framework handles all of this

- [ ] Create `machines/rhythmGameMachine.lit.md` with game states
- [ ] Add rhythm game invariants to `tests/machines/invariant-checks.ts`

---

## Cross-Platform Distribution

### One codebase, all targets

| Platform | Method | Cost | Priority |
|----------|--------|------|----------|
| Web PWA | GitHub Pages / Cloudflare | Free | 1st — primary |
| itch.io | Web upload | Free | 2nd |
| F-Droid | Android, open source | Free | 3rd |
| Google Play | Capacitor wrapper | $25 one-time | 4th |
| Steam | Tauri or web app | $100 one-time | 5th |
| Flathub / Snap | Linux desktop | Free | 6th |
| Apple App Store | Capacitor + CoreMIDI plugin | $99/year | Last — only when iOS MIDI demand exists |

### MIDI Across Platforms

| Platform | Solution |
|----------|----------|
| Chrome desktop (Win/Linux/macOS) | Web MIDI API ✅ |
| Safari macOS | ❌ No Web MIDI — users must use Chrome |
| iOS (any browser) | ❌ Need Capacitor app with `capacitor-musetrainer-midi` for CoreMIDI |
| Android Chrome | Web MIDI API ✅ |

PWA is the iOS entry point for everything except hardware MIDI. 99% of iOS users won't have MIDI controllers on their phone.

### Existing Cross-Platform Tools

- `capacitor-musetrainer-midi` — npm package, Web + iOS CoreMIDI + Android
- `tauri-plugin-midi` — Rust midir, cross-platform desktop
- `@superpoweredsdk/web` — WASM AudioWorklet for low-latency audio
- `gnesher/phaser-capacitor` — reference template (we won't use Phaser, but the Capacitor wiring applies)

All platform configs, CI workflows, and MIDI bridge code are tangled from `.lit.md` files:

- `literate/platform-capacitor.lit.md` → capacitor config + iOS/Android wiring
- `literate/platform-tauri.lit.md` → tauri config + desktop wiring
- `literate/platform-midi-bridge.lit.md` → unified MIDI abstraction (Web MIDI API + CoreMIDI via Capacitor plugin)
- `literate/ci-deploy.lit.md` → GitHub Actions workflows for all targets

- [ ] Test PWA installability on Android and iOS
- [ ] Evaluate `capacitor-musetrainer-midi` for iOS CoreMIDI bridging
- [ ] Create `literate/platform-capacitor.lit.md` for mobile wrapper
- [ ] Create `literate/platform-midi-bridge.lit.md` for unified MIDI abstraction
- [ ] Create `literate/ci-deploy.lit.md` for multi-target CI workflows

---

## Open Questions

- What's the song/chart format? MIDI files? Custom JSON? Both?
- How do users create/share charts? Built-in editor? Import from osu/BMS?
- Multiplayer: same grid, different colors? Split screen? Network?
- Should the typing-game bridge (QWERTY words → grid positions) be a separate mode or integrated?
- How does this relate to the existing Piano Tiles mode in `gameMachine`?

---

*This document originated from a design discussion on 2026-03-14. See issue #156 for the raw conversation thread.*
