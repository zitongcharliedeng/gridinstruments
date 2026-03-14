# Synth

Low-latency [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
synthesizer -- polyphonic oscillator-based synth with envelope, EQ, and dynamic
tuning. Based on original WickiSynth by Piers Titus van der Torren.

The synth is designed for an
[isomorphic keyboard](https://en.wikipedia.org/wiki/Isomorphic_keyboard) where
every key is addressed by a two-dimensional coordinate `(x, y)` on the
circle-of-fifths / octave grid. Changing the generator (fifth size in cents)
re-tunes every sounding note in real time -- no restart required.

## Waveform Type and Voice Interface

`WaveformType` enumerates the four native
[OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
waveforms. The `Voice` interface tracks everything needed per sounding note:
oscillator, timbre filter, gain envelope, grid coordinates (for live re-tuning),
and a per-voice vibrato gain node.

``` {.typescript file=_generated/lib/synth.ts}
/**
 * Low-latency Web Audio API Synthesizer
 * 
 * Polyphonic oscillator-based synth with envelope, EQ, and dynamic tuning
 * Based on original WickiSynth by Piers Titus van der Torren
 * 
 * Key features:
 * - Live tuning changes (setGenerator updates all playing notes)
 * - Volume control with smooth transitions
 * - EQ filter for tone shaping (treble/bass boost)
 * - Multiple waveforms
 */

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface Voice {
  oscillator: OscillatorNode;
  timbreFilter: BiquadFilterNode;
  gainNode: GainNode;
  coordX: number;
  coordY: number;
  octaveOffset: number;
  vibratoGainNode: GainNode;
}

```

## Tuning Markers

Reference points for the continuous fifth-size slider. The slider itself is
continuous from `FIFTH_MIN` to `FIFTH_MAX`; these markers are just labels at
musically significant values.

The fifth sizes below span from wide (5-TET, 720 cents) to narrow (7-TET,
685.71 cents). Between these extremes lie the historically important tuning
systems:

| Marker | Fifth (cents) | System | Cultural context |
|--------|--------------|--------|-----------------|
| `tet5` | 720.00 | [5-TET](https://en.xen.wiki/w/5edo) | Indonesian [slendro](https://en.wikipedia.org/wiki/Slendro) |
| `tet17` | 705.88 | [17-TET](https://en.xen.wiki/w/17edo) | 17 equal divisions |
| `pythagorean` | 701.96 | [Pythagorean](https://en.xen.wiki/w/Pythagorean_tuning) | Pure fifths (3:2 ratio) |
| `tet12` | 700.00 | [12-TET](https://en.xen.wiki/w/12edo) | Western standard tuning |
| `tet31` | 696.77 | [31-TET](https://en.xen.wiki/w/31edo) | Meantone-compatible, Huygens |
| `meantone` | 696.58 | [1/4-comma meantone](https://en.xen.wiki/w/Quarter-comma_meantone) | Pure major thirds (5:4) |
| `tet19` | 694.74 | [19-TET](https://en.xen.wiki/w/19edo) | 19 equal divisions |
| `tet7` | 685.71 | [7-TET](https://en.xen.wiki/w/7edo) | Thai, Mandinka balafon |

``` {.typescript file=_generated/lib/synth.ts}
/**
 * Reference tuning markers for the continuous slider
 * These are just labels - the slider is continuous from ~650 to ~750+ cents
 * Users can set ANY value, these are just common reference points
 */
export const TUNING_MARKERS: { id: string; name: string; fifth: number; description: string }[] = [
  { id: 'tet5', name: '5', fifth: 720, description: '5-TET · Indonesian slendro' },
  { id: 'tet17', name: '17', fifth: 705.88, description: '17-TET · 17 equal divisions' },
  { id: 'pythagorean', name: 'Pyth', fifth: 701.96, description: 'Pythagorean · Pure fifths (3:2)' },
  { id: 'tet12', name: '12', fifth: 700, description: '12-TET · Western standard' },
  { id: 'tet31', name: '31', fifth: 696.77, description: '31-TET · Meantone-compatible, historical significance' },
  { id: 'meantone', name: '¼MT', fifth: 696.58, description: '1/4 Meantone · Pure major thirds' },
  { id: 'tet19', name: '19', fifth: 694.74, description: '19-TET · 19 equal divisions' },
  { id: 'tet7', name: '7', fifth: 685.71, description: '7-TET · Thai, Mandinka balafon' },
];

```

### Slider Range and Nearest-Marker Lookup

The slider range `[683, 722]` is chosen to tightly cover all presets from
7-TET (685.71 cents) to 5-TET (720 cents) with a small margin on each side.

`findNearestMarker` performs a linear scan to snap a continuous slider value to
the closest named tuning. This drives the UI label that appears on the slider.

``` {.typescript file=_generated/lib/synth.ts}
export const FIFTH_MIN = 683;
export const FIFTH_MAX = 722;
export const FIFTH_DEFAULT = 700;

/**
 * Find the nearest tuning marker to a given fifth value
 * Returns the marker and how far away it is in cents
 */
export function findNearestMarker(fifthCents: number): { marker: typeof TUNING_MARKERS[0]; distance: number } {
  let nearest = TUNING_MARKERS[0];
  let minDistance = Math.abs(fifthCents - nearest.fifth);
  
  for (const marker of TUNING_MARKERS) {
    const distance = Math.abs(fifthCents - marker.fifth);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = marker;
    }
  }
  
  return { marker: nearest, distance: minDistance };
}

```

## Synth Class -- State Fields

The `Synth` class manages an
[AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext),
a master gain node, a highshelf EQ
[BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode),
and a `Map<string, Voice>` of active voices.

The tuning state is a two-element generator `[fifth, octave]` in
[cents](https://en.wikipedia.org/wiki/Cent_(music)). The default `[700, 1200]`
produces standard 12-TET. The base frequency `293.66 Hz` is D4 at A440 -- the
center of the [DCompose](https://en.xen.wiki/w/Wicki-Hayden_note_layout)
isomorphic layout (coordinate `[0, 0]`).

``` {.typescript file=_generated/lib/synth.ts}
export class Synth {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private eqFilter: BiquadFilterNode | null = null;
  private voices = new Map<string, Voice>();
  private sustainedVoices = new Set<string>();
  private sustain = false;
  private waveform: WaveformType = 'sawtooth';
  
  private vibratoLFO: OscillatorNode | null = null;
  private _vibratoEnabled = false;
  private vibratoRate = 5;
  private vibratoDepth = 10;

  private generator: [number, number] = [700, 1200];
  private baseFreq = 293.66;
  private _d4Hz = 293.66;

  private attackTime = 0.01;
  private releaseTime = 0.1;
  private _masterVolume = 0.3;

  private _eqValue = 0;
  
```

### Audio Graph Initialization

The audio signal chain is:

    oscillators --> per-voice gain --> masterGain --> eqFilter --> destination

Initialization is deferred to the first user gesture (`initSync`) because
mobile browsers require a user interaction before creating an AudioContext
([autoplay policy](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy)).
`tryUnlock` provides a synchronous entry point safe for iOS Safari, while
`init` is the async variant.

``` {.typescript file=_generated/lib/synth.ts}
  private initSync(): void {
    if (this.context) return;

    this.context = new AudioContext({ latencyHint: 'interactive' });

    this.eqFilter = this.context.createBiquadFilter();
    this.eqFilter.type = 'highshelf';
    this.eqFilter.frequency.value = 3000;
    this.eqFilter.gain.value = 0;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this._masterVolume;

    this.masterGain.connect(this.eqFilter);
    this.eqFilter.connect(this.context.destination);
  }

  /** Call synchronously from any user gesture handler to unlock the AudioContext.
   *  Creates the context if needed, then calls resume() synchronously (iOS-safe). */
  tryUnlock(): void {
    this.initSync();
    if (this.context?.state === 'suspended') {
      void this.context.resume();
    }
  }

  async init(): Promise<void> {
    this.initSync();
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }
  
  isInitialized(): boolean {
    return this.context !== null && this.context.state === 'running';
  }
  
```

## Waveform Selection

The waveform can be changed at any time. When set, all currently sounding
voices update their
[OscillatorNode.type](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/type)
immediately -- no click, no gap.

``` {.typescript file=_generated/lib/synth.ts}
  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
    for (const voice of this.voices.values()) {
      voice.oscillator.type = waveform;
    }
  }
  
  getWaveform(): WaveformType {
    return this.waveform;
  }
  
```

## Live Tuning -- Generator Control

The [regular temperament](https://en.xen.wiki/w/Regular_temperament) generator
is the pair `[fifth, octave]` measured in cents. Changing it re-tunes every
active voice instantly by recalculating frequencies from stored grid
coordinates.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Set the tuning generator [fifth, octave] in cents
   * This updates ALL currently playing notes in real-time!
   */
  setGenerator(generator: [number, number]): void {
    this.generator = generator;
    
    this.recalculateBaseFreq();

    for (const voice of this.voices.values()) {
      const newFreq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
      voice.oscillator.frequency.value = newFreq;
    }
  }
  
  getGenerator(): [number, number] {
    return [this.generator[0], this.generator[1]];
  }
  
```

### Fifth Shortcuts

`setFifth` is a convenience wrapper that keeps the octave at 1200 cents
(standard 2:1 ratio) and only varies the fifth. `setTuningMarker` jumps to a
named preset from the `TUNING_MARKERS` table above.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Set just the fifth size (keeping octave at 1200)
   */
  setFifth(cents: number): void {
    this.setGenerator([cents, 1200]);
  }
  
  getFifth(): number {
    return this.generator[0];
  }
  
  /**
   * Jump to a tuning marker (convenience method)
   */
  setTuningMarker(markerId: string): void {
    const marker = TUNING_MARKERS.find(m => m.id === markerId);
    if (marker) {
      this.setFifth(marker.fifth);
    }
  }
  
```

## D Reference Frequency

D-ref is the frequency of grid coordinate `(0, 0)` -- the center of the
[Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
isomorphic layout. At default settings this is D4 = 293.66 Hz (derived from
A440).

The user can shift D-ref across the full range 100 Hz -- 2000 Hz to transpose
the entire instrument. Every sounding voice updates immediately, just like
`setGenerator`.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Set D reference frequency (default 293.66Hz — standard D at A440).
   * This updates baseFreq and all playing notes.
   *
   * D-ref is the center note of the DCompose layout (coordinate [0,0]).
   * Not locked to any specific octave — adjustable across the full range.
   */
  setD4Hz(hz: number): void {
    this._d4Hz = Math.max(100, Math.min(2000, hz));
    this.baseFreq = this._d4Hz;

    for (const voice of this.voices.values()) {
      const newFreq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
      voice.oscillator.frequency.value = newFreq;
    }
  }

  getD4Hz(): number {
    return this._d4Hz;
  }
  
  /**
   * Sets baseFreq to the current D-ref frequency — all note frequencies derive from this.
   */
  private recalculateBaseFreq(): void {
    this.baseFreq = this._d4Hz;
  }
  
```

## Volume Control

Master volume is applied via
[setTargetAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)
with a 10 ms time constant. This exponential ramp avoids the audible clicks
that an instantaneous `.value =` assignment would cause.

``` {.typescript file=_generated/lib/synth.ts}
  setMasterVolume(volume: number): void {
    this._masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(
        this._masterVolume,
        this.context.currentTime,
        0.01
      );
    }
  }
  
  getMasterVolume(): number {
    return this._masterVolume;
  }
  
```

## EQ / Tone Shaping

A single [highshelf](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type)
filter at 3 kHz provides a simple tone control. The UI maps `-1..+1` to
`-12 dB..+12 dB`, giving a bass-boost to treble-boost sweep.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Set EQ value: -1 = bass boost, 0 = flat, +1 = treble boost
   */
  setEQ(value: number): void {
    this._eqValue = Math.max(-1, Math.min(1, value));
    if (this.eqFilter && this.context) {
      const gainDb = this._eqValue * 12;
      this.eqFilter.gain.setTargetAtTime(
        gainDb,
        this.context.currentTime,
        0.01
      );
    }
  }
  
  getEQ(): number {
    return this._eqValue;
  }
  
```

## Sustain Pedal

When sustain is on, `stopNote` defers the release -- the voice keeps sounding
until sustain is toggled off. This mirrors the behavior of a piano sustain
pedal and is wired to the MIDI CC64 (damper) input.

``` {.typescript file=_generated/lib/synth.ts}
  setSustain(enabled: boolean): void {
    this.sustain = enabled;

    if (!enabled) {
      for (const noteId of this.sustainedVoices) {
        this.stopNote(noteId, true);
      }
      this.sustainedVoices.clear();
    }
  }
  
  getSustain(): boolean {
    return this.sustain;
  }
  
  
```

## Vibrato -- Shared LFO

A single shared
[OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
at `vibratoRate` Hz (default 5 Hz) drives pitch modulation for all voices.
Per-voice `GainNode`s scale the LFO amplitude proportionally to each note's
frequency in Hz (not cents), so a 10-cent wobble at A4 (440 Hz) and at A2
(110 Hz) both sound like the same musical interval.

The depth conversion is: `depthHz = frequency * (vibratoDepth / 1200)`. This
comes from the cents-to-ratio formula: a small interval of `d` cents
corresponds to a frequency deviation of `f * (2^(d/1200) - 1)`, which for
small `d` approximates to `f * d / 1200`.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Initialize the shared vibrato LFO (called once on first use)
   */
  private ensureVibratoLFO(): void {
    if (!this.context || this.vibratoLFO) return;
    
    this.vibratoLFO = this.context.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = this.vibratoRate;
    this.vibratoLFO.start();
  }
  
```

### Vibrato Enable / Disable

When enabled, the shared LFO connects to each voice's frequency
[AudioParam](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)
through a per-voice gain node. When disabled, gain is zeroed and the LFO is
disconnected.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Enable/disable vibrato (pitch modulation) on ALL currently-playing voices in real-time.
   * When enabled: connects shared LFO → per-voice gain → oscillator.frequency for every voice.
   * When disabled: zeros gain and disconnects LFO from every voice.
   */
  setVibrato(enabled: boolean): void {
    if (!this.context) return;
    this._vibratoEnabled = enabled;
    const now = this.context.currentTime;
    
    if (enabled) {
      this.ensureVibratoLFO();
      for (const voice of this.voices.values()) {
        const freq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
        const depthHz = freq * (this.vibratoDepth / 1200);
        voice.vibratoGainNode.gain.setValueAtTime(depthHz, now);
        if (this.vibratoLFO) this.vibratoLFO.connect(voice.vibratoGainNode);
        voice.vibratoGainNode.connect(voice.oscillator.frequency);
      }
    } else {
      for (const voice of this.voices.values()) {
        voice.vibratoGainNode.gain.setValueAtTime(0, now);
        try { this.vibratoLFO?.disconnect(voice.vibratoGainNode); } catch { }
      }
    }
  }

  getVibrato(): boolean {
    return this._vibratoEnabled;
  }
  
```

## Frequency Calculation from Isomorphic Coordinates

All note frequencies derive from the
[regular temperament](https://en.xen.wiki/w/Regular_temperament) formula:

    freq = baseFreq * 2^(cents / 1200)

where `cents = y * octave + x * fifth + octaveOffset * 1200`.

Coordinate `(0, 0)` always produces `baseFreq` (D-ref). Moving along the
x-axis steps through the
[circle of fifths](https://en.wikipedia.org/wiki/Circle_of_fifths); moving
along y steps through octaves.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Calculate frequency from isomorphic coordinates.
   * ALL frequencies are relative to D-ref (baseFreq).
   * - Formula: freq = D-ref * 2^(cents/1200)
   * - Coordinate (0,0) = D-ref frequency exactly
   */
  private getFrequency(x: number, y: number, octaveOffset = 0): number {
    const cents = y * this.generator[1] + x * this.generator[0] + octaveOffset * 1200;
    return this.baseFreq * Math.pow(2, cents / 1200);
  }
  
```

## Note On -- Voice Creation

`playNote` creates the per-voice audio graph:

    oscillator --> timbreFilter (lowpass) --> gainNode --> masterGain

The timbre filter maps velocity to cutoff frequency via an exponential curve:
`cutoff = 500 * 36^velocity`. At velocity 0 the cutoff is 500 Hz (muffled);
at velocity 1 it reaches 18 000 Hz (bright). This `500 * 36^v` curve was
chosen because `500 * 36 = 18000`, giving a musically useful range from a
single multiplication.

The gain envelope uses
[setTargetAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime)
for a smooth exponential attack. A square-root velocity curve
(`vel^0.5`) ensures light touches are still audible.

If vibrato is active, the shared LFO is connected to this voice's frequency
input through a per-voice gain node.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Play a note
   * @param noteId Unique identifier for this note instance
   * @param x Circle of fifths position
   * @param y Octave offset
   * @param octaveOffset Global octave offset
   */
  playNote(noteId: string, x: number, y: number, octaveOffset = 0, velocity = 1): void {
    if (!this.context || !this.masterGain || this.context.state !== 'running') return;
    if (this.voices.has(noteId)) return;
    const frequency = this.getFrequency(x, y, octaveOffset);
    const oscillator = this.context.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.value = frequency;

    const timbreFilter = this.context.createBiquadFilter();
    timbreFilter.type = 'lowpass';
    const clampedVel = Math.max(0, Math.min(1, velocity));
    timbreFilter.frequency.value = 500 * Math.pow(36, clampedVel);

    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;
    oscillator.connect(timbreFilter);
    timbreFilter.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.start();
    gainNode.gain.setTargetAtTime(Math.max(0.01, Math.pow(clampedVel, 0.5)), this.context.currentTime, this.attackTime);

    const vibratoGainNode = this.context.createGain();
    vibratoGainNode.gain.value = 0;

    if (this._vibratoEnabled && this.vibratoLFO) {
      const depthHz = frequency * (this.vibratoDepth / 1200);
      vibratoGainNode.gain.setValueAtTime(depthHz, this.context.currentTime);
      this.vibratoLFO.connect(vibratoGainNode);
      vibratoGainNode.connect(oscillator.frequency);
    }
    this.voices.set(noteId, {
      oscillator,
      timbreFilter,
      gainNode,
      coordX: x,
      coordY: y,
      octaveOffset,
      vibratoGainNode,
    });
  }
  
```

## Note Off -- Release Envelope

`stopNote` applies a release envelope: gain ramps to zero via `setTargetAtTime`
with the `releaseTime` time constant, then the oscillator is scheduled to stop
after `5 * releaseTime` (roughly 99.3% of the exponential decay). The vibrato
gain node is disconnected during cleanup.

If sustain is active and `force` is false, the note is deferred to the
`sustainedVoices` set instead of being released.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Stop a note
   * @param noteId The note to stop
   * @param force Force stop even if sustained
   */
  stopNote(noteId: string, force = false): void {
    if (!this.context) return;
    
    const voice = this.voices.get(noteId);
    if (!voice) return;
    
    if (this.sustain && !force) {
      this.sustainedVoices.add(noteId);
      return;
    }

    const { gainNode, oscillator } = voice;
    const now = this.context.currentTime;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(0, now, this.releaseTime);

    oscillator.stop(now + this.releaseTime * 5);

    try { this.vibratoLFO?.disconnect(voice.vibratoGainNode); } catch { }

    this.voices.delete(noteId);
    this.sustainedVoices.delete(noteId);
  }
  
```

## MPE Expression -- Pitch Bend

[MIDI Polyphonic Expression](https://www.midi.org/midi-articles/midi-polyphonic-expression-mpe)
(MPE) provides per-note control dimensions. `setPitchBend` shifts the
oscillator frequency by a given number of semitones (can be fractional) using
the standard equal-temperament formula `bentFreq = baseFreq * 2^(semitones/12)`.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Apply pitch bend to a specific voice by detuning the oscillator.
   * @param noteId The voice to bend
   * @param semitones Pitch offset in semitones (can be fractional)
   */
  setPitchBend(noteId: string, semitones: number): void {
    if (!this.context) return;
    const voice = this.voices.get(noteId);
    if (!voice) return;
    const baseFreq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
    const bentFreq = baseFreq * Math.pow(2, semitones / 12);
    voice.oscillator.frequency.setTargetAtTime(bentFreq, this.context.currentTime, 0.005);
  }

```

### MPE Timbre (CC74 / Slide)

Timbre controls the lowpass filter cutoff via the same `500 * 36^v`
exponential curve used in `playNote`, giving CC74 slide a consistent brightness
range from 500 Hz to 18 000 Hz.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Update timbre (lowpass filter cutoff) for a specific voice.
   * Maps 0→1 to 500Hz→18000Hz via exponential curve.
   * Called from MPE CC74 (slide) input.
   */
  setTimbre(noteId: string, value: number): void {
    if (!this.context) return;
    const voice = this.voices.get(noteId);
    if (!voice) return;
    const clamped = Math.max(0, Math.min(1, value));
    const cutoff = 500 * Math.pow(36, clamped);
    voice.timbreFilter.frequency.setTargetAtTime(cutoff, this.context.currentTime, 0.01);
  }

```

### MPE Pressure (Channel Aftertouch)

Pressure controls per-voice gain with a square-root curve (`value^0.5`),
matching the velocity response so that MPE pressure feels continuous with the
initial strike velocity.

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Update gain for a specific voice from aftertouch/pressure.
   * Uses sqrt curve so light pressure → noticeable volume.
   * Called from MPE channel pressure input.
   */
  setPressure(noteId: string, value: number): void {
    if (!this.context) return;
    const voice = this.voices.get(noteId);
    if (!voice) return;
    const clamped = Math.max(0, Math.min(1, value));
    const gain = Math.max(0.01, Math.pow(clamped, 0.5));
    voice.gainNode.gain.setTargetAtTime(gain, this.context.currentTime, 0.01);
  }

```

## Lifecycle -- Stop All, Query, Dispose

Utility methods for panic (stop all voices), introspection (active note list,
voice count), and teardown (close the AudioContext).

``` {.typescript file=_generated/lib/synth.ts}
  /**
   * Stop all notes
   */
  stopAll(): void {
    for (const noteId of this.voices.keys()) {
      this.stopNote(noteId, true);
    }
    this.sustainedVoices.clear();
  }
  
  /**
   * Get list of currently playing note IDs
   */
  getActiveNotes(): string[] {
    return Array.from(this.voices.keys());
  }
  
  /**
   * Get count of active voices
   */
  getVoiceCount(): number {
    return this.voices.size;
  }
  
  /**
   * Dispose of the synth
   */
  dispose(): void {
    this.stopAll();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
    this.masterGain = null;
    this.eqFilter = null;
  }
}
```
