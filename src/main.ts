/**
 * DCompose Web — Main Application
 *
 * Wires together:
 * - Web MIDI input (MidiInput) with per-device management
 * - MPE output (MpeOutput) for external synthesizers
 * - Isomorphic keyboard (KeyboardVisualizer) with skew slider
 * - Note history + waterfall + chord panel (NoteHistoryVisualizer)
 * - Keyboard layout dropdown (isomorphic-qwerty variants)
 * - Web Audio synth (Synth)
 *
 * TODO — Future Features:
 *
 * 1. GHOST OVERLAY / SONG LEARNING MODE
 *    - Link user's videos and covers as ghost overlay on the keyboard grid
 *    - Notes play as semi-transparent falling blocks (like Guitar Hero / Synthesia)
 *    - For non-MIDI conversions: audio-to-note analysis or manual charting
 *    - Each linked song is confirmed human-playable (played by the author)
 *    - Could also accept MIDI files for direct overlay
 *
 * 2. FULLSCREEN GRID MODE
 *    - Option to expand keyboard grid to fill entire viewport (100vh)
 *    - Hide controls strip, history panel, title bar — maximum play surface
 *    - Essential for touchscreen tablet performance use
 *    - Toggle via button or keyboard shortcut (e.g. F11 or double-tap)
 *
 * 3. CHORD VISUALIZER OVERLAY (FULLSCREEN)
 *    - In fullscreen grid mode, optionally overlay the chord visualizer component
 *    - Render with low opacity ("dryly") so it doesn't obscure the keys
 *    - Shows detected chord names / shapes without leaving fullscreen
 */

import { getLayout, KEYBOARD_VARIANTS, KeyboardLayout } from './lib/keyboard-layouts';
import { Synth, WaveformType, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker, TUNING_MARKERS } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { NoteHistoryVisualizer } from './lib/note-history-visualizer';
import { MidiInput, MidiDeviceInfo } from './lib/midi-input';
import { MPEService } from './lib/mpe-service';
import { midiToCoord } from './lib/note-colors';
import { createChordGraffiti } from './lib/chord-graffiti';
import './machines/_smoke'; // TODO: remove in Task 14
import { appMachine } from './machines/appMachine';
import { createActor } from 'xstate';
// Type guard for WaveformType
function isWaveformType(value: unknown): value is WaveformType {
  return typeof value === 'string' && ['sine', 'square', 'sawtooth', 'triangle'].includes(value);
}

/**
 * Helper to safely get a DOM element with type narrowing.
 * Throws if element not found or is not an instance of the expected type.
 */
function getElement<T extends HTMLElement>(id: string, type: new() => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) {
    throw new Error(`Element #${id} not found or wrong type (expected ${type.name})`);
  }
  return el;
}

/**
 * Helper to safely get an optional DOM element with type narrowing.
 * Returns null if element not found or is not an instance of the expected type.
 */
function getElementOrNull<T extends HTMLElement>(id: string, type: new() => T): T | null {
  const el = document.getElementById(id);
  if (el === null) return null;
  if (!(el instanceof type)) return null;
  return el;
}

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private historyVisualizer: NoteHistoryVisualizer | null = null;
  private midi: MidiInput;
  private mpe: MPEService;
  private currentLayout: KeyboardLayout;

  private octaveOffset: number = 0;
  private transposeOffset: number = 0;

  // Active notes keyed by the input source string (keyboard code or pointer id)
  private activeNotes: Map<string, { coordX: number; coordY: number }> = new Map();
  private keyRepeat: Set<string> = new Set();

  private pointerDown: Map<number, { coordX: number; coordY: number } | null> = new Map();
  private draggingGoldenLine: boolean = false;
  private goldenLineDragStartY: number = 0;
  private goldenLineDragStartHz: number = 293.66;

  // MPE vibrato state (Space key sends sinusoidal pitch bend to all active MPE notes)
  private vibratoRAF: number | null = null;
  private vibratoPhase = 0;

  // Cached canvas rect — invalidated on resize only
  private cachedCanvasRect: DOMRect | null = null;
  // RAF-throttled render scheduling
  private renderScheduled: boolean = false;
  // DOM
  private canvas: HTMLCanvasElement;
  private historyCanvas: HTMLCanvasElement;
  private waveformSelect: HTMLSelectElement;
  private layoutSelect: HTMLSelectElement | null = null;
  private skewSlider: HTMLInputElement | null = null;
  private tuningSlider: HTMLInputElement | null = null;

  private volumeSlider: HTMLInputElement | null = null;
  private vibratoIndicator: HTMLElement | null = null;
  private sustainIndicator: HTMLElement | null = null;
  private midiDeviceList: HTMLElement | null = null;
  private zoomSlider: HTMLInputElement | null = null;
  private defaultZoom: number = 1.0;
  private updateGraffiti: (() => void) | null = null;

  constructor() {
    this.synth = new Synth();
    this.midi = new MidiInput();
    this.mpe = new MPEService();
    this.currentLayout = getLayout('ansi');

    this.canvas = getElement('keyboard-canvas', HTMLCanvasElement);
    this.historyCanvas = getElement('history-canvas', HTMLCanvasElement);
    this.waveformSelect = getElement('waveform-select', HTMLSelectElement);
    this.layoutSelect = getElement('layout-select', HTMLSelectElement);
    this.skewSlider = getElement('skew-slider', HTMLInputElement);
    this.tuningSlider = getElement('tuning-slider', HTMLInputElement);

    this.volumeSlider = getElement('volume-slider', HTMLInputElement);
    this.vibratoIndicator = getElement('vibrato-indicator', HTMLElement);
    this.sustainIndicator = getElement('sustain-indicator', HTMLElement);
    this.midiDeviceList = getElement('midi-device-list', HTMLElement);
    this.zoomSlider = getElement('zoom-slider', HTMLInputElement);

    this.init();
  }

  private async init(): Promise<void> {
    this.setupVisualizer();
    this.setupHistoryVisualizer();
    this.setupEventListeners();
    await this.midi.init();
    await this.mpe.init();
    this.setupMidiListeners();
    // Chord shape graffiti overlays (dynamic — reads grid geometry from visualizer)
    const keyboardContainer = document.getElementById('keyboard-container');
    if (keyboardContainer && this.visualizer) {
      this.updateGraffiti = createChordGraffiti({ container: keyboardContainer, visualizer: this.visualizer });
    }
    this.render();
    // Deferred graffiti update: initial createChordGraffiti runs before first render
    // settles layout, so re-trigger after a frame to ensure buttons are positioned.
    requestAnimationFrame(() => this.updateGraffiti?.());
  }

  // ─── Visualizer setup ───────────────────────────────────────────────────

  private setupVisualizer(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width - 2, 300);
    const height = Math.max(rect.height - 2, 200);

    this.visualizer = new KeyboardVisualizer(this.canvas, { width, height });

    window.addEventListener('resize', () => {
      if (!this.visualizer || !container) return;
      this.cachedCanvasRect = null; // invalidate on resize
      const r = container.getBoundingClientRect();
      this.visualizer.resize(Math.max(r.width - 2, 300), Math.max(r.height - 2, 200));
    });
    window.addEventListener('scroll', () => { this.cachedCanvasRect = null; }, { passive: true });
    window.addEventListener('orientationchange', () => { this.cachedCanvasRect = null; });
    document.addEventListener('scroll', () => { this.cachedCanvasRect = null; }, { passive: true, capture: true });
  }

  private setupHistoryVisualizer(): void {
    if (!this.historyCanvas) return;
    this.historyVisualizer = new NoteHistoryVisualizer(this.historyCanvas);
    this.historyVisualizer.start();

    // Clef selector

    window.addEventListener('resize', () => {
      if (!this.historyVisualizer || !this.historyCanvas) return;
      this.historyVisualizer.resize(
        this.historyCanvas.parentElement?.clientWidth ?? 900,
        220
      );
    });
  }

  // ─── MIDI ───────────────────────────────────────────────────────────────

  private setupMidiListeners(): void {
    this.midi.onNoteOn((note, velocity, _channel) => {
      this.handleMidiNoteOn(note, velocity);
    });
    this.midi.onNoteOff((note, _velocity, _channel) => {
      this.handleMidiNoteOff(note);
    });
    this.midi.onStatusChange((devices) => {
      this.updateMidiDevicePanel(devices);
    });

    // TODO: Forward MIDI expression to mpe once per-channel note tracking is implemented.
    // Currently we don't track which MPE noteId maps to which MIDI input channel,
    // so we can't route expression messages from external controllers to the correct MPE voice.
    this.midi.onPitchBend((_channel, _value) => {
      // TODO: mpe.sendPitchBend(noteIdForChannel, value * bendRange)
    });
    this.midi.onSlide((_channel, _value) => {
      // TODO: mpe.sendSlide(noteIdForChannel, value)
    });
    this.midi.onPressure((_channel, _value) => {
      // TODO: mpe.sendPressure(noteIdForChannel, value)
    });
  }

  private async handleMidiNoteOn(midiNote: number, velocity: number): Promise<void> {
    await this.ensureAudioReady();
    const [coordX, coordY] = midiToCoord(midiNote);
    const noteKey = `midi_${midiNote}`;
    const audioNoteId = `midi_${midiNote}_${coordX}_${coordY}`;
    this.synth.playNote(audioNoteId, coordX, coordY, 0);
    this.mpe.noteOn(audioNoteId, midiNote, velocity / 127);
    this.activeNotes.set(noteKey, { coordX, coordY });
    this.historyVisualizer?.noteOn(coordX, coordY, midiNote);
    this.render();
  }

  private handleMidiNoteOff(midiNote: number): void {
    const noteKey = `midi_${midiNote}`;
    const noteData = this.activeNotes.get(noteKey);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const audioNoteId = `midi_${midiNote}_${coordX}_${coordY}`;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(noteKey);
    this.historyVisualizer?.noteOff(coordX, coordY);
    this.render();
  }

  private updateMidiDevicePanel(devices: MidiDeviceInfo[]): void {
    if (!this.midiDeviceList) return;
    this.midiDeviceList.innerHTML = '';

    if (devices.length === 0) {
      this.midiDeviceList.innerHTML = '<span class="midi-no-devices">No MIDI devices detected</span>';
      return;
    }

    for (const device of devices) {
      const row = document.createElement('label');
      row.className = 'midi-device-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = device.enabled;
      cb.addEventListener('change', () => {
        this.midi.setDeviceEnabled(device.id, cb.checked);
      });

      const dot = document.createElement('span');
      dot.className = `midi-dot ${device.connected ? 'connected' : 'disconnected'}`;

      const name = document.createElement('span');
      name.className = 'midi-device-name';
      name.textContent = device.name + (device.manufacturer ? ` (${device.manufacturer})` : '');

      row.appendChild(cb);
      row.appendChild(dot);
      row.appendChild(name);
      this.midiDeviceList.appendChild(row);
    }
  }

  // ─── Event listeners ────────────────────────────────────────────────────

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    // touch-action: none in CSS eliminates the need for touchstart preventDefault
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.waveformSelect?.addEventListener('change', () => {
      const waveform = this.waveformSelect.value;
      if (isWaveformType(waveform)) {
        this.synth.setWaveform(waveform);
      }
    });

    // Keyboard layout dropdown
    if (this.layoutSelect) {
      // Populate options
      for (const variant of KEYBOARD_VARIANTS) {
        const opt = document.createElement('option');
        opt.value = variant.id;
        opt.textContent = variant.name;
        this.layoutSelect.appendChild(opt);
      }
      this.layoutSelect.value = 'ansi';
      this.layoutSelect.addEventListener('change', () => {
        this.currentLayout = getLayout(this.layoutSelect!.value);
      });
    }

    // DCompose ↔ MidiMech skew slider
    if (this.skewSlider) {
      const skewBadge = getElementOrNull('skew-thumb-badge', HTMLInputElement);
      const skewLabel = getElementOrNull('skew-label', HTMLSpanElement);

      const updateSkewLabel = (value: number): void => {
        if (!skewLabel) return;
        if (value <= 0.15) skewLabel.textContent = 'SKEW [MidiMech]';
        else if (value >= 0.85) skewLabel.textContent = 'SKEW [DCompose]';
        else skewLabel.textContent = 'SKEW';
      };

      const updateSkewBadge = (value: number) => {
        if (!skewBadge) return;
        // Position badge: clamp to slider range for positioning
        const sliderMin = parseFloat(this.skewSlider!.min);
        const sliderMax = parseFloat(this.skewSlider!.max);
        const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, value));
        const pct = ((clampedForPos - sliderMin) / (sliderMax - sliderMin)) * 100;
        skewBadge.style.left = `${pct}%`;
        skewBadge.value = value.toFixed(2);
      };

      updateSkewBadge(0);
      updateSkewLabel(0);

      this.skewSlider.addEventListener('input', () => {
        const val = parseFloat(this.skewSlider!.value);
        this.visualizer?.setSkewFactor(val);
        this.updateGraffiti?.();
        updateSkewBadge(val);
        updateSkewLabel(val);
        this.updateSliderFill(this.skewSlider!);
      });

      // Skew reset
      const skewReset = getElementOrNull('skew-reset', HTMLButtonElement);
      skewReset?.addEventListener('click', () => {
        if (this.skewSlider) {
          this.skewSlider.value = '0';
          this.skewSlider.dispatchEvent(new Event('input'));
        }
      });

      // Skew badge direct input — accepts values outside slider 0-1 range
      if (skewBadge) {
        skewBadge.addEventListener('change', () => {
          const raw = parseFloat(skewBadge.value);
          if (isFinite(raw)) {
            this.visualizer?.setSkewFactor(raw);
            this.updateGraffiti?.();
            updateSkewBadge(raw);
            updateSkewLabel(raw);
            // Clamp slider thumb to its range, but let the actual skew go beyond
            if (this.skewSlider) {
              const clamped = Math.max(0, Math.min(1, raw));
              this.skewSlider.value = clamped.toString();
              this.updateSliderFill(this.skewSlider);
            }
          } else {
            const current = parseFloat(this.skewSlider?.value ?? '0');
            skewBadge.value = current.toFixed(2);
          }
        });
        skewBadge.addEventListener('focus', () => skewBadge.select());
      }
    }
    // Tuning slider

    if (this.tuningSlider) {
      this.tuningSlider.min = FIFTH_MIN.toString();
      this.tuningSlider.max = FIFTH_MAX.toString();
      this.tuningSlider.step = '0.01';
      this.tuningSlider.value = FIFTH_DEFAULT.toString();

      const thumbBadge = getElementOrNull('tuning-thumb-badge', HTMLInputElement);
      const range = FIFTH_MAX - FIFTH_MIN;
      const updateThumbBadge = (value: number) => {
        if (!thumbBadge) return;
        const pct = ((value - FIFTH_MIN) / range) * 100;
        thumbBadge.style.left = `${pct}%`;
        thumbBadge.value = value.toFixed(1);
      };
      updateThumbBadge(FIFTH_DEFAULT);
      this.tuningSlider.addEventListener('input', () => {
        const value = parseFloat(this.tuningSlider!.value);
        this.synth.setFifth(value);
        this.visualizer?.setGenerator([value, 1200]);
        this.updateGraffiti?.();

        updateThumbBadge(value);
        this.updateSliderFill(this.tuningSlider!);
        // Sync active TET preset button
        document.querySelectorAll('.tet-preset').forEach(b => {
          const btn = b instanceof HTMLElement ? b : null;
          if (!btn) return;
          btn.classList.toggle('active', Math.abs(Number(btn.dataset.fifth) - value) < 0.1);
        });
      });

      this.tuningSlider.addEventListener('dblclick', () => {
        const currentValue = parseFloat(this.tuningSlider!.value);
        const { marker } = findNearestMarker(currentValue);
        this.tuningSlider!.value = marker.fifth.toString();
        this.synth.setFifth(marker.fifth);
        this.visualizer?.setGenerator([marker.fifth, 1200]);
        this.updateSliderFill(this.tuningSlider!);
      });
      // Tuning reset
      const tuningReset = getElementOrNull('tuning-reset', HTMLButtonElement);
      tuningReset?.addEventListener('click', () => {
        if (this.tuningSlider) {
          this.tuningSlider.value = FIFTH_DEFAULT.toString();
          this.tuningSlider.dispatchEvent(new Event('input'));
        }
      });
      // Tuning badge direct input handler
      if (thumbBadge) {
        thumbBadge.addEventListener('change', () => {
          const raw = parseFloat(thumbBadge.value);
          if (isFinite(raw) && raw >= FIFTH_MIN && raw <= FIFTH_MAX) {
            if (this.tuningSlider) {
              this.tuningSlider.value = raw.toString();
              this.synth.setFifth(raw);
              this.visualizer?.setGenerator([raw, 1200]);
              this.updateGraffiti?.();
              updateThumbBadge(raw);
              this.updateSliderFill(this.tuningSlider);
              document.querySelectorAll('.tet-preset').forEach(b => {
                const btn = b instanceof HTMLElement ? b : null;
                if (!btn) return;
                btn.classList.toggle('active', Math.abs(Number(btn.dataset.fifth) - raw) < 0.1);
              });
            }
          } else {
            // Revert to current slider value
            const current = parseFloat(this.tuningSlider?.value ?? FIFTH_DEFAULT.toString());
            thumbBadge.value = current.toFixed(1);
          }
        });
        thumbBadge.addEventListener('focus', () => thumbBadge.select());
      }
    }
    // Note: #fifth-custom-input was removed; #tuning-thumb-badge input handles direct value entry

    // Populate TET preset buttons — positioned proportionally along slider
    const presetsContainer = document.getElementById('tet-presets');
    if (presetsContainer) {
      const sliderRange = FIFTH_MAX - FIFTH_MIN;
      // Sort by fifth value for stagger detection
      const sortedMarkers = [...TUNING_MARKERS].sort((a, b) => a.fifth - b.fifth);
      sortedMarkers.forEach((marker, i) => {
        const pct = ((marker.fifth - FIFTH_MIN) / sliderRange) * 100;
        const mark = document.createElement('div');
        mark.className = 'tet-preset-mark';
        mark.style.left = `${pct}%`;
        const tick = document.createElement('div');
        tick.className = i % 2 === 0 ? 'tet-tick tet-tick-long' : 'tet-tick tet-tick-short';
        const btn = document.createElement('button');
        btn.className = 'tet-preset';
        btn.dataset.fifth = marker.fifth.toString();
        btn.textContent = marker.name;
        btn.title = `${marker.description} (${marker.fifth.toFixed(2)}\u00a2)`;
        btn.addEventListener('click', () => {
          if (this.tuningSlider) {
            this.tuningSlider.value = marker.fifth.toString();
            this.tuningSlider.dispatchEvent(new Event('input'));
          }
        });
        mark.appendChild(tick);
        mark.appendChild(btn);
        presetsContainer.appendChild(mark);
      });
      // Mark initial active preset (12-TET at 700)
      presetsContainer.querySelector('.tet-preset[data-fifth="700"]')?.classList.add('active');
    }

    // Volume
    const volBadge = getElementOrNull('volume-thumb-badge', HTMLSpanElement);
    const updateVolBadge = (value: number) => {
      if (!volBadge) return;
      const min = 0, max = 1;
      const pct = ((value - min) / (max - min)) * 100;
      volBadge.style.left = `${pct}%`;
      if (value <= 0) {
        volBadge.textContent = '-\u221E';
      } else {
        const db = 20 * Math.log10(value);
        volBadge.textContent = db.toFixed(1);
      }
    };
    this.volumeSlider?.addEventListener('input', () => {
      const val = parseFloat(this.volumeSlider!.value);
      this.synth.setMasterVolume(val);
      if (this.volumeSlider) this.updateSliderFill(this.volumeSlider);
      updateVolBadge(val);
    });
    updateVolBadge(0.3);
    const volReset = getElementOrNull('volume-reset', HTMLButtonElement);
      volReset?.addEventListener('click', () => {
        if (this.volumeSlider) {
          this.volumeSlider.value = '0.3';
          this.volumeSlider.dispatchEvent(new Event('input'));
        }
      });

    // Button spacing
    const spacingInput = getElementOrNull('spacing-input', HTMLInputElement);
    spacingInput?.addEventListener('input', () => {
      this.visualizer?.setButtonSpacing(parseFloat(spacingInput.value) || 0);
    });

    // D ref — slider (D2–D6 range) + text badge (just Hz, like all other sliders)
    // Note annotation shown in bracket inside the slider label overlay.
    const dRefInput = getElementOrNull('d-ref-input', HTMLInputElement);
    const dRefSlider = getElementOrNull('d-ref-slider', HTMLInputElement);
    const dRefLabel = getElementOrNull('d-ref-label', HTMLSpanElement);

    /** Update slider label overlay with nearest note annotation in brackets */
    const updateDRefLabel = (hz: number): void => {
      if (!dRefLabel) return;
      const annotation = hzToNoteAnnotation(hz, 293.66);
      dRefLabel.innerHTML = annotation
        ? `D REF (Hz) <span style="color:#88ff88">${annotation}</span>`
        : 'D REF (Hz)';
    };

    const updateDRefDisplay = (hz: number): void => {
      // Badge: always just the number + position it on the slider
      if (dRefInput && document.activeElement !== dRefInput) {
        dRefInput.value = hz.toFixed(2);
      }
      // Position badge over slider thumb
      if (dRefInput && dRefSlider) {
        const min = parseFloat(dRefSlider.min);
        const max = parseFloat(dRefSlider.max);
        const clamped = Math.max(min, Math.min(max, hz));
        const pct = ((clamped - min) / (max - min)) * 100;
        dRefInput.style.left = `${pct}%`;
      }
      // Slider: clamp to range
      if (dRefSlider && document.activeElement !== dRefSlider) {
        const min = parseFloat(dRefSlider.min);
        const max = parseFloat(dRefSlider.max);
        dRefSlider.value = Math.max(min, Math.min(max, hz)).toFixed(2);
        this.updateSliderFill(dRefSlider);
      }
      updateDRefLabel(hz);
    };

    /** Apply a new Hz value from any source */
    const applyDRefHz = (hz: number): void => {
      this.synth.setD4Hz(hz);
      this.visualizer?.setD4Hz(hz);
      updateDRefDisplay(hz);
    };

    dRefInput?.addEventListener('input', () => {
      const raw = dRefInput.value.trim();
      if (raw === '') return;
      // Try note name first (e.g. A4, G#5, Bb3)
      const fromNote = noteNameToHz(raw);
      if (fromNote !== null) {
        dRefInput.value = fromNote.toFixed(2);
        dRefInput.style.borderColor = '';
        applyDRefHz(fromNote);
        return;
      }
      // Try plain Hz
      const hz = parseFloat(raw);
      if (isFinite(hz) && hz >= 20 && hz <= 20000) {
        dRefInput.style.borderColor = '';
        applyDRefHz(hz);
      } else {
        dRefInput.style.borderColor = '#cc3333';
      }
    });

    dRefInput?.addEventListener('blur', () => {
      const raw = dRefInput.value.trim();
      if (raw === '') { applyDRefHz(293.66); return; }
      const fromNote = noteNameToHz(raw);
      if (fromNote !== null) {
        dRefInput.value = fromNote.toFixed(2);
        dRefInput.style.borderColor = '';
        applyDRefHz(fromNote);
        return;
      }
      const hz = parseFloat(raw);
      if (isFinite(hz) && hz >= 20 && hz <= 20000) {
        dRefInput.value = hz.toFixed(2);
        dRefInput.style.borderColor = '';
      } else {
        applyDRefHz(293.66);
      }
    });

    dRefInput?.addEventListener('focus', () => {
      dRefInput.select();
    });

    dRefSlider?.addEventListener('input', () => {
      const hz = parseFloat(dRefSlider.value);
      if (isFinite(hz)) {
        applyDRefHz(hz);
        this.updateSliderFill(dRefSlider);
      }
    });

    // Init
    if (dRefInput) dRefInput.value = '293.66';
    if (dRefSlider) dRefSlider.value = '293.66';
    updateDRefDisplay(293.66);

    // D-ref reset button
    const dRefReset = getElementOrNull('d-ref-reset', HTMLButtonElement);
      dRefReset?.addEventListener('click', () => {
        if (dRefInput) dRefInput.style.borderColor = '';
        if (dRefSlider) {
          dRefSlider.value = '293.66';
          dRefSlider.dispatchEvent(new Event('input'));
        }
      });
    dRefReset?.addEventListener('mouseenter', () => {
      dRefReset.style.color = 'var(--fg)';
      dRefReset.style.borderColor = 'var(--accent)';
    });
    dRefReset?.addEventListener('mouseleave', () => {
      dRefReset.style.color = '';
      dRefReset.style.borderColor = '';
    });
    // MIDI settings toggle
    const midiToggle = document.getElementById('midi-settings-toggle');
    const midiPanel = document.getElementById('midi-settings-panel');
    midiToggle?.addEventListener('click', () => {
      const isOpen = midiPanel?.classList.toggle('open');
      if (midiToggle) midiToggle.innerHTML = isOpen ? '<span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI settings' : '<span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI';
    });

    // MPE output UI
    const mpeCheckbox = getElementOrNull('mpe-enabled', HTMLInputElement);
    const mpeSelect = getElementOrNull('mpe-output-select', HTMLSelectElement);

    const refreshMpeOutputs = () => {
      if (!mpeSelect) return;
      const outputs = this.mpe.getAvailableOutputs();
      mpeSelect.innerHTML = '';
      if (outputs.length === 0) {
        mpeSelect.innerHTML = '<option value="">No MIDI outputs</option>';
        mpeSelect.disabled = true;
        return;
      }
      for (const out of outputs) {
        const opt = document.createElement('option');
        opt.value = out.id;
        opt.textContent = out.name ?? out.id;
        mpeSelect.appendChild(opt);
      }
      mpeSelect.disabled = !mpeCheckbox?.checked;
    };

    mpeCheckbox?.addEventListener('change', () => {
      const enabled = mpeCheckbox.checked;
      this.mpe.setEnabled(enabled);
      if (mpeSelect) mpeSelect.disabled = !enabled;
      if (enabled) {
        const selectedId = mpeSelect?.value;
        const outputs = this.mpe.getAvailableOutputs();
        const selected = outputs.find(o => o.id === selectedId) ?? outputs[0] ?? null;
        this.mpe.setOutput(selected);
      } else {
        this.mpe.setOutput(null);
      }
    });

    mpeSelect?.addEventListener('change', () => {
      if (!mpeCheckbox?.checked) return;
      const outputs = this.mpe.getAvailableOutputs();
      const selected = outputs.find(o => o.id === mpeSelect.value) ?? null;
      this.mpe.setOutput(selected);
    });

    refreshMpeOutputs();
    // Refresh on MIDI device connection changes
    const midiAccess = this.mpe.getMidiAccess();
    if (midiAccess) {
      midiAccess.onstatechange = () => refreshMpeOutputs();
    }

    // Prevent space scroll
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) e.preventDefault();
    });


    // Zoom slider
    const zoomReset = getElementOrNull('zoom-reset', HTMLButtonElement);
    const zoomBadge = getElementOrNull('zoom-thumb-badge', HTMLSpanElement);
    const updateZoomBadge = (value: number) => {
      if (!zoomBadge) return;
      const min = 0.2, max = 3;
      const pct = ((value - min) / (max - min)) * 100;
      zoomBadge.style.left = `${pct}%`;
      zoomBadge.textContent = value.toFixed(2);
    };
    // Mobile default: ~1.6x on touch (base is already 3x via dPy=height/3, so 1.6*3 ≈ 5x)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.defaultZoom = isTouchDevice ? 1.6 : 1.0;
    if (this.zoomSlider) {
      this.zoomSlider.value = this.defaultZoom.toString();
      this.visualizer?.setZoom(this.defaultZoom);
      updateZoomBadge(this.defaultZoom);
      this.zoomSlider.addEventListener('input', () => {
        const zoom = parseFloat(this.zoomSlider!.value);
        this.visualizer?.setZoom(zoom);
        this.updateGraffiti?.();
        this.updateSliderFill(this.zoomSlider!);
        updateZoomBadge(zoom);
      });
    }
      zoomReset?.addEventListener('click', () => {
        if (this.zoomSlider) {
          this.zoomSlider.value = this.defaultZoom.toString();
          this.zoomSlider.dispatchEvent(new Event('input'));
        }
      });
    window.addEventListener('blur', () => this.stopAllNotes());

    // Auto-return focus to body after using range/select controls so keyboard always works
    document.querySelectorAll<HTMLElement>('select, input[type="range"]').forEach(el => {
      el.addEventListener('pointerup', () => setTimeout(() => el.blur(), 0));
      el.addEventListener('change', () => setTimeout(() => el.blur(), 0));
    });

    // Text inputs: Enter/Escape blur to restore keyboard focus
    document.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          el.blur();
        }
      });
    });

    // Initialize slider progress fills
    document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(s => this.updateSliderFill(s));
  }

  // ─── Keyboard input ─────────────────────────────────────────────────────

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'INPUT') {
      const t = target instanceof HTMLInputElement ? target.type : '';
      if (!t) return;
      if (t === 'text' || t === 'number') return;
    }

    const code = event.code;
    // Always pass Ctrl/Meta combos to the browser (Ctrl+C, Ctrl+V, etc.)
    if (event.ctrlKey || event.metaKey) return;
    const allowDefault = ['F5', 'F11', 'F12', 'Escape'].includes(code);
    if (!allowDefault) event.preventDefault();

    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);

    // Shift (left or right) = vibrato (hold)
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      this.vibratoIndicator?.classList.add('active');
      this.startMpeVibrato();
      return;
    }
    // Space = sustain (hold)
    if (code === 'Space') {
      await this.ensureAudioReady();
      this.synth.setSustain(true);
      this.sustainIndicator?.classList.add('active');
      return;
    }
    // Shift+=/- zoom shortcuts removed — Shift is now vibrato-only

    const coord = this.currentLayout.keyMap[code];
    if (!coord) return;

    await this.ensureAudioReady();
    const [coordX, coordY] = coord;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset);
    this.activeNotes.set(code, { coordX, coordY });

    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.mpe.noteOn(audioNoteId, midiNote, 0.7);
    this.historyVisualizer?.noteOn(effectiveCoordX, effectiveCoordY, midiNote);

    this.render();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);

    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.synth.setVibrato(false);
      this.vibratoIndicator?.classList.remove('active');
      this.stopMpeVibrato();
      return;
    }
    if (code === 'Space') {
      this.synth.setSustain(false);
      this.sustainIndicator?.classList.remove('active');
      return;
    }

    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(code);
    this.historyVisualizer?.noteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  // ─── Pointer input ──────────────────────────────────────────────────────

  private handlePointerDown(event: PointerEvent): void {
    this.pointerDown.set(event.pointerId, null);
    if (!this.synth.isInitialized()) {
      this.synth.init().then(() => this.handlePointerDownInner(event));
      return;
    }
    this.handlePointerDownInner(event);
  }

  private handlePointerDownInner(event: PointerEvent): void {
    try { this.canvas.setPointerCapture(event.pointerId); } catch (_) { /* iOS Safari */ }
    const rect = this.getCanvasRect();
    const clickY = event.clientY - rect.top;
    const goldenLineY = this.visualizer?.getGoldenLineY();
    // Golden line drag: mouse only — touch near center hijacks D4 cell, causing D4→G2 drift
    if (event.pointerType === 'mouse' && goldenLineY !== undefined && Math.abs(clickY - goldenLineY) < 10) {
      this.draggingGoldenLine = true;
      this.goldenLineDragStartY = clickY;
      this.goldenLineDragStartHz = this.synth.getD4Hz();
      return;
    }
    const button = this.getButtonAtPointer(event);
    if (button) this.playPointerNote(event.pointerId, button.coordX, button.coordY, event.pressure);
    this.pointerDown.set(event.pointerId, button);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.draggingGoldenLine) {
      const rect = this.getCanvasRect();
      const deltaY = this.goldenLineDragStartY - (event.clientY - rect.top);
      const newHz = Math.max(20, Math.min(20000, this.goldenLineDragStartHz + deltaY * 0.5));
      this.synth.setD4Hz(newHz);
      this.visualizer?.setD4Hz(newHz);
      // Reuse the same display updater (badge=number, label=annotation, position)
      const dInput = getElementOrNull('d-ref-input', HTMLInputElement);
      const dSlider = getElementOrNull('d-ref-slider', HTMLInputElement);
      const dLabel = getElementOrNull('d-ref-label', HTMLSpanElement);
      if (dInput) dInput.value = newHz.toFixed(2);
      if (dSlider) {
        const min = parseFloat(dSlider.min), max = parseFloat(dSlider.max);
        const clamped = Math.max(min, Math.min(max, newHz));
        dSlider.value = clamped.toFixed(2);
        this.updateSliderFill(dSlider);
        // Position badge over slider thumb
        if (dInput) {
          const pct = ((clamped - min) / (max - min)) * 100;
          dInput.style.left = `${pct}%`;
        }
      }
      if (dLabel) {
        const ann = hzToNoteAnnotation(newHz, 293.66);
        dLabel.textContent = ann ? `D REF (Hz) [${ann}]` : 'D REF (Hz)';
      }
      return;
    }

    if (!this.pointerDown.has(event.pointerId)) return;
    const currentButton = this.pointerDown.get(event.pointerId);
    if (!currentButton) return;
    const newButton = this.getButtonAtPointer(event);
    const currentId = `${currentButton.coordX}_${currentButton.coordY}`;
    const newId = newButton ? `${newButton.coordX}_${newButton.coordY}` : null;

    if (currentId !== newId) {
      if (currentButton) this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
      if (newButton) this.playPointerNote(event.pointerId, newButton.coordX, newButton.coordY, event.pressure);
      this.pointerDown.set(event.pointerId, newButton);
    } else if (currentButton && this.mpe.isEnabled()) {
      const effectiveCoordX = currentButton.coordX + this.transposeOffset;
      const effectiveCoordY = currentButton.coordY + this.octaveOffset;
      const noteId = `ptr_${event.pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
      this.mpe.sendPressure(noteId, event.pressure);
      // Sub-cell offset → pitch bend (Y-axis) and slide/CC74 (X-axis)
      if (this.visualizer) {
        const { cellHv1, cellHv2 } = this.visualizer.getGridGeometry();
        const buttons = this.visualizer.getButtons();
        const btn = buttons.find(b => b.coordX === currentButton.coordX && b.coordY === currentButton.coordY);
        if (btn) {
          const rect = this.getCanvasRect();
          const dx = (event.clientX - rect.left) - btn.x;
          const dy = (event.clientY - rect.top) - btn.y;

          // Pitch axis: project onto cellHv2 (octave direction), negate so up = higher
          const pitchDirLen = Math.sqrt(cellHv2.x * cellHv2.x + cellHv2.y * cellHv2.y);
          const pitchOffset = (dx * cellHv2.x + dy * cellHv2.y) / pitchDirLen;
          const cellHeight = pitchDirLen * 2; // cellHv2 is a half-vector
          const semitones = -pitchOffset / cellHeight * 2; // ±2 semitones per cell

          // Timbre axis: project onto cellHv1 (wholetone direction), normalize 0-1
          const timbreDirLen = Math.sqrt(cellHv1.x * cellHv1.x + cellHv1.y * cellHv1.y);
          const timbreOffset = (dx * cellHv1.x + dy * cellHv1.y) / timbreDirLen;
          const normalizedX = Math.max(0, Math.min(1, (timbreOffset / timbreDirLen + 1) / 2));

          this.mpe.sendPitchBend(noteId, semitones);
          this.mpe.sendSlide(noteId, normalizedX);
        }
      }
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    if (this.draggingGoldenLine) {
      this.draggingGoldenLine = false;
      this.canvas.releasePointerCapture(event.pointerId);
      return;
    }
    const currentButton = this.pointerDown.get(event.pointerId);
    if (currentButton) this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
    this.pointerDown.delete(event.pointerId);
    try { this.canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  private getButtonAtPointer(event: PointerEvent): { coordX: number; coordY: number } | null {
    if (!this.visualizer) return null;
    const rect = this.getCanvasRect();
    return this.visualizer.getButtonAtPoint(event.clientX - rect.left, event.clientY - rect.top);
  }

  private playPointerNote(pointerId: number, coordX: number, coordY: number, pressure: number = 0.7): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset);
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.mpe.noteOn(audioNoteId, midiNote, Math.max(0.01, pressure));
    this.activeNotes.set(`ptr_${pointerId}`, { coordX, coordY });
    this.historyVisualizer?.noteOn(effectiveCoordX, effectiveCoordY, midiNote);
    this.render();
  }

  private stopPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(`ptr_${pointerId}`);
    this.historyVisualizer?.noteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  public stopAllNotes(): void {
    this.synth.setSustain(false);
    this.sustainIndicator?.classList.remove('active');
    this.synth.setVibrato(false);
    this.vibratoIndicator?.classList.remove('active');
    this.stopMpeVibrato();
    this.synth.stopAll();
    this.mpe.panic();
    this.historyVisualizer?.clearAll();
    this.activeNotes.clear();
    this.keyRepeat.clear();
    this.pointerDown.clear();
    this.render();
  }

  // ─── MPE vibrato ─────────────────────────────────────────────────────────

  /** Reconstruct MPE noteIds from the activeNotes map. */
  private getMpeNoteIds(): string[] {
    const ids: string[] = [];
    for (const [key, { coordX, coordY }] of this.activeNotes) {
      if (key.startsWith('ptr_')) {
        ids.push(`${key}_${coordX + this.transposeOffset}_${coordY + this.octaveOffset}`);
      } else if (key.startsWith('midi_')) {
        ids.push(`${key}_${coordX}_${coordY}`);
      } else {
        ids.push(`key_${key}_${coordX + this.transposeOffset}_${coordY + this.octaveOffset}`);
      }
    }
    return ids;
  }

  /** Start sinusoidal pitch bend vibrato on all active MPE notes (~5Hz, ±0.5 semitones). */
  private startMpeVibrato(): void {
    if (!this.mpe.isEnabled() || this.vibratoRAF !== null) return;
    this.vibratoPhase = 0;
    const tick = () => {
      this.vibratoPhase += 0.314; // ≈5Hz at 60fps
      const bend = Math.sin(this.vibratoPhase) * 0.5; // ±0.5 semitones
      for (const noteId of this.getMpeNoteIds()) {
        this.mpe.sendPitchBend(noteId, bend);
      }
      this.vibratoRAF = requestAnimationFrame(tick);
    };
    this.vibratoRAF = requestAnimationFrame(tick);
  }

  /** Stop MPE vibrato and reset pitch bend to zero for all active notes. */
  private stopMpeVibrato(): void {
    if (this.vibratoRAF !== null) {
      cancelAnimationFrame(this.vibratoRAF);
      this.vibratoRAF = null;
    }
    // Reset pitch bend to 0 for all active notes
    for (const noteId of this.getMpeNoteIds()) {
      this.mpe.sendPitchBend(noteId, 0);
    }
    this.vibratoPhase = 0;
  }

  // ─── Slider fill ─────────────────────────────────────────────────────────

  private updateSliderFill(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const ratio = (val - min) / (max - min);
    // Thumb is 3px wide. At ratio=0 thumb center is at 1.5px,
    // at ratio=1 center is at trackWidth-1.5px. Correct gradient to match.
    const thumbW = 3;
    const offset = (0.5 - ratio) * thumbW;
    const pct = `calc(${(ratio * 100).toFixed(2)}% + ${offset.toFixed(1)}px)`;
    slider.style.background = `linear-gradient(to right, var(--fg) ${pct}, #000 ${pct})`;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.visualizer) return;
    // Throttle to one repaint per animation frame (avoids redundant redraws on rapid touch input)
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      if (!this.visualizer) return;
      const activeNoteIds = Array.from(this.activeNotes.values()).map(
        ({ coordX, coordY }) => `${coordX}_${coordY}`
      );
      this.visualizer.setActiveNotes(activeNoteIds);
      this.visualizer.render();
    });
  }

  /** Cached canvas rect — avoids layout thrashing on every pointer event. */
  private getCanvasRect(): DOMRect {
    this.cachedCanvasRect = this.canvas.getBoundingClientRect();
    return this.cachedCanvasRect;
  }
  private async ensureAudioReady(): Promise<void> {
    if (!this.synth.isInitialized()) await this.synth.init();
  }
}

// ─── D ref helper functions ────────────────────────────────────────────────

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function noteNameToHz(input: string): number | null {
  const m = input.trim().match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!m) return null;
  const noteKey = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const semitone = NOTE_SEMITONES[noteKey];
  if (semitone === undefined) return null;
  const octave = parseInt(m[2], 10);
  // D4 = 293.66Hz, D = semitone 2
  const semitonesFromD4 = (octave - 4) * 12 + (semitone - 2);
  return 293.66 * Math.pow(2, semitonesFromD4 / 12);
}

function hzToNoteAnnotation(hz: number, _d4Hz: number): string {
  const NOTE_NAMES = ['D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#'];
  const semisFromD4 = 12 * Math.log2(hz / 293.66);
  const roundedSemis = Math.round(semisFromD4);
  const cents = Math.round((semisFromD4 - roundedSemis) * 100);
  const noteIdx = ((roundedSemis % 12) + 12) % 12;
  const octave = 4 + Math.floor(roundedSemis / 12);
  const noteName = NOTE_NAMES[noteIdx] + octave;
  if (Math.abs(cents) < 1) return `${noteName}`;
  return `${cents > 0 ? '+' : ''}${cents}\u00a2 from ${noteName}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebarToggle = getElementOrNull('sidebar-toggle', HTMLButtonElement);
  const sidebar = document.getElementById('sidebar');
  sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    if (sidebarToggle) {
      sidebarToggle.textContent = sidebar?.classList.contains('collapsed') ? '▶' : '◀';
    }
    // Trigger resize so keyboard canvas reflows
    window.dispatchEvent(new Event('resize'));
  });

  new DComposeApp();
  // Create and start the AppMachine actor (observes only — DComposeApp still controls all behaviour)
  const appActor = createActor(appMachine, {
    input: { initialVolume: -10.5, defaultZoom: 1.0, touchDevice: 'ontouchstart' in window },
  });
  appActor.start();
  // Expose for debugging and Playwright verification
  (window as Window & { dcomposeApp?: unknown }).dcomposeApp = {
    actor: appActor,
    getSnapshot: () => appActor.getSnapshot(),
  };
});
