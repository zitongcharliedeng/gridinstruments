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
 */

import { getLayout, KEYBOARD_VARIANTS, KeyboardLayout, KeyCoordinate } from './lib/keyboard-layouts';
import { Synth, WaveformType, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker, TUNING_MARKERS } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { NoteHistoryVisualizer } from './lib/note-history-visualizer';
import { MidiInput, MidiDeviceInfo } from './lib/midi-input';
import { MPEService } from './lib/mpe-service';
import { midiToCoord } from './lib/note-colors';
import { createChordGraffiti } from './lib/chord-graffiti';

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

    this.canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
    this.historyCanvas = document.getElementById('history-canvas') as HTMLCanvasElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.layoutSelect = document.getElementById('layout-select') as HTMLSelectElement;
    this.skewSlider = document.getElementById('skew-slider') as HTMLInputElement;
    this.tuningSlider = document.getElementById('tuning-slider') as HTMLInputElement;

    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.vibratoIndicator = document.getElementById('vibrato-indicator') as HTMLElement;
    this.sustainIndicator = document.getElementById('sustain-indicator') as HTMLElement;
    this.midiDeviceList = document.getElementById('midi-device-list') as HTMLElement;
    this.zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;

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
      this.synth.setWaveform(this.waveformSelect.value as WaveformType);
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
      const skewBadge = document.getElementById('skew-thumb-badge') as HTMLSpanElement | null;
      const updateSkewBadge = (value: number) => {
        if (!skewBadge) return;
        const pct = value * 100;
        skewBadge.style.left = `${pct}%`;
        skewBadge.textContent = value.toFixed(2);
      };
      updateSkewBadge(0);
      this.skewSlider.addEventListener('input', () => {
        const val = parseFloat(this.skewSlider!.value);
        this.visualizer?.setSkewFactor(val);
        this.updateGraffiti?.();
        updateSkewBadge(val);
        this.updateSliderFill(this.skewSlider!);
        // Highlight active endpoint label
        const leftLabel = document.getElementById('skew-label-left');
        const rightLabel = document.getElementById('skew-label-right');
        if (leftLabel) leftLabel.classList.toggle('active', val < 0.25);
        if (rightLabel) rightLabel.classList.toggle('active', val > 0.75);
      });
      // Skew reset
      const skewReset = document.getElementById('skew-reset') as HTMLButtonElement;
      skewReset?.addEventListener('click', () => {
        if (this.skewSlider) {
          this.skewSlider.value = '0';
          this.visualizer?.setSkewFactor(0);
          this.updateGraffiti?.();
          updateSkewBadge(0);
          this.updateSliderFill(this.skewSlider);
          document.getElementById('skew-label-left')?.classList.add('active');
          document.getElementById('skew-label-right')?.classList.remove('active');
        }
      });
    }

    // Tuning slider

    if (this.tuningSlider) {
      this.tuningSlider.min = FIFTH_MIN.toString();
      this.tuningSlider.max = FIFTH_MAX.toString();
      this.tuningSlider.step = '0.01';
      this.tuningSlider.value = FIFTH_DEFAULT.toString();

      const thumbBadge = document.getElementById('tuning-thumb-badge') as HTMLSpanElement | null;
      const range = FIFTH_MAX - FIFTH_MIN;
      const updateThumbBadge = (value: number) => {
        if (!thumbBadge) return;
        const pct = ((value - FIFTH_MIN) / range) * 100;
        thumbBadge.style.left = `${pct}%`;
        thumbBadge.textContent = value.toFixed(1);
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
          const btn = b as HTMLElement;
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
      const tuningReset = document.getElementById('tuning-reset') as HTMLButtonElement;
      tuningReset?.addEventListener('click', () => {
        if (this.tuningSlider) {
          this.tuningSlider.value = FIFTH_DEFAULT.toString();
          this.synth.setFifth(FIFTH_DEFAULT);
          this.visualizer?.setGenerator([FIFTH_DEFAULT, 1200]);
          this.updateGraffiti?.();
          updateThumbBadge(FIFTH_DEFAULT);
          this.updateSliderFill(this.tuningSlider);
        }
      });
    }

    // Note: #fifth-custom-input was removed; #tuning-thumb-badge input handles direct value entry

    // Populate TET preset buttons — positioned proportionally along slider
    const presetsContainer = document.getElementById('tet-presets');
    if (presetsContainer) {
      const sliderRange = FIFTH_MAX - FIFTH_MIN;
      // Sort by fifth value for stagger detection
      const sortedMarkers = [...TUNING_MARKERS].sort((a, b) => a.fifth - b.fifth);
      for (const marker of sortedMarkers) {
        const pct = ((marker.fifth - FIFTH_MIN) / sliderRange) * 100;
        const mark = document.createElement('div');
        mark.className = 'tet-preset-mark';
        mark.style.left = `${pct}%`;
        const tick = document.createElement('div');
        tick.className = 'tet-tick';
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
      }
      // Mark initial active preset (12-TET at 700)
      presetsContainer.querySelector('.tet-preset[data-fifth="700"]')?.classList.add('active');
    }

    // Volume
    const volBadge = document.getElementById('volume-thumb-badge') as HTMLSpanElement | null;
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
    const volReset = document.getElementById('volume-reset') as HTMLButtonElement;
    volReset?.addEventListener('click', () => {
      if (this.volumeSlider) {
        this.volumeSlider.value = '0.3';
        this.synth.setMasterVolume(0.3);
        this.updateSliderFill(this.volumeSlider);
        updateVolBadge(0.3);
      }
    });

    // Button spacing
    const spacingInput = document.getElementById('spacing-input') as HTMLInputElement;
    spacingInput?.addEventListener('input', () => {
      this.visualizer?.setButtonSpacing(parseFloat(spacingInput.value) || 0);
    });

    // D ref unified input — accepts Hz (293.66) or note names (D4, G#5, Bb3)
    const d4RefInput = document.getElementById('d4-ref-input') as HTMLInputElement;
    const d4RefHint = document.getElementById('d4-ref-hint') as HTMLElement;

    const updateD4Hint = (hz: number): void => {
      if (!d4RefHint) return;
      d4RefHint.textContent = hzToNoteAnnotation(hz, 293.66);
    };

    d4RefInput?.addEventListener('input', () => {
      const raw = d4RefInput.value.trim();
      if (raw === '') {
        // Empty input → revert to D4 default immediately
        d4RefInput.value = '293.66';
        d4RefInput.style.borderColor = '';
        this.synth.setD4Hz(293.66);
        this.visualizer?.setD4Hz(293.66);
        updateD4Hint(293.66);
        return;
      }
      // Try note name first (e.g. D4, G#5, Bb3)
      const fromNote = noteNameToHz(raw);
      if (fromNote !== null) {
        // Replace note name with Hz value in input
        d4RefInput.value = fromNote.toFixed(2);
        d4RefInput.style.borderColor = '';
        this.synth.setD4Hz(fromNote);
        this.visualizer?.setD4Hz(fromNote);
        updateD4Hint(fromNote);
        return;
      }
      // Try plain Hz
      const hz = parseFloat(raw);
      if (isFinite(hz) && hz >= 20 && hz <= 20000) {
        d4RefInput.style.borderColor = '';
        this.synth.setD4Hz(hz);
        this.visualizer?.setD4Hz(hz);
        updateD4Hint(hz);
      } else {
        // Invalid input — red border
        d4RefInput.style.borderColor = '#cc3333';
      }
    });

    // Blur: validate and revert to D4 default if invalid
    d4RefInput?.addEventListener('blur', () => {
      const raw = d4RefInput.value.trim();
      if (raw === '') {
        d4RefInput.value = '293.66';
        this.synth.setD4Hz(293.66);
        this.visualizer?.setD4Hz(293.66);
        updateD4Hint(293.66);
        return;
      }
      const hz = parseFloat(raw);
      if (!isFinite(hz) || hz < 20 || hz > 20000) {
        d4RefInput.value = '293.66';
        this.synth.setD4Hz(293.66);
        this.visualizer?.setD4Hz(293.66);
        updateD4Hint(293.66);
      }
      d4RefInput.style.borderColor = '';
    });
    // Focus: select all for easy replacement
    d4RefInput?.addEventListener('focus', () => {
      d4RefInput.select();
    });
    // Init hint
    updateD4Hint(293.66);

    // D-ref reset button
    const d4RefReset = document.getElementById('d4-ref-reset') as HTMLButtonElement;
    d4RefReset?.addEventListener('click', () => {
      if (d4RefInput) {
        d4RefInput.value = '293.66';
        d4RefInput.style.borderColor = '';
        this.synth.setD4Hz(293.66);
        this.visualizer?.setD4Hz(293.66);
        updateD4Hint(293.66);
      }
    });
    d4RefReset?.addEventListener('mouseenter', () => {
      d4RefReset.style.color = 'var(--fg)';
      d4RefReset.style.borderColor = 'var(--accent)';
    });
    d4RefReset?.addEventListener('mouseleave', () => {
      d4RefReset.style.color = '';
      d4RefReset.style.borderColor = '';
    });

    // MIDI settings toggle
    const midiToggle = document.getElementById('midi-settings-toggle');
    const midiPanel = document.getElementById('midi-settings-panel');
    midiToggle?.addEventListener('click', () => {
      const isOpen = midiPanel?.classList.toggle('open');
      if (midiToggle) midiToggle.innerHTML = isOpen ? '<span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI settings' : '<span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI';
    });

    // MPE output UI
    const mpeCheckbox = document.getElementById('mpe-enabled') as HTMLInputElement;
    const mpeSelect = document.getElementById('mpe-output-select') as HTMLSelectElement;

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
    const zoomReset = document.getElementById('zoom-reset') as HTMLButtonElement;
    const zoomBadge = document.getElementById('zoom-thumb-badge') as HTMLSpanElement | null;
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
        this.visualizer?.setZoom(this.defaultZoom);
        this.updateSliderFill(this.zoomSlider);
        updateZoomBadge(this.defaultZoom);
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
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'INPUT') {
      const t = (target as HTMLInputElement).type;
      if (t === 'text' || t === 'number') return;
    }

    const code = event.code;
    // Always pass Ctrl/Meta combos to the browser (Ctrl+C, Ctrl+V, etc.)
    if (event.ctrlKey || event.metaKey) return;
    const allowDefault = ['F5', 'F11', 'F12', 'Escape'].includes(code);
    if (!allowDefault) event.preventDefault();

    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);

    if (code === 'Space') {
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      this.vibratoIndicator?.classList.add('active');
      this.startMpeVibrato();
      return;
    }
    if (code === 'KeyR' || code === 'ShiftLeft') {
      await this.ensureAudioReady();
      this.synth.setSustain(true);
      this.sustainIndicator?.classList.add('active');
      return;
    }
    if (event.shiftKey && (code === 'Equal' || code === 'NumpadAdd')) {
      if (this.visualizer && this.zoomSlider) {
        const newZoom = Math.min(3, parseFloat(this.zoomSlider.value) * 1.1);
        this.visualizer.setZoom(newZoom);
        this.zoomSlider.value = String(newZoom);
        this.updateGraffiti?.();
        this.updateSliderFill(this.zoomSlider);
      }
      return;
    }
    if (event.shiftKey && (code === 'Minus' || code === 'NumpadSubtract')) {
      if (this.visualizer && this.zoomSlider) {
        const newZoom = Math.max(0.2, parseFloat(this.zoomSlider.value) / 1.1);
        this.visualizer.setZoom(newZoom);
        this.zoomSlider.value = String(newZoom);
        this.updateGraffiti?.();
        this.updateSliderFill(this.zoomSlider);
      }
      return;
    }

    const coord = this.currentLayout.keyMap[code] as KeyCoordinate | undefined;
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

    if (code === 'Space') {
      this.synth.setVibrato(false);
      this.vibratoIndicator?.classList.remove('active');
      this.stopMpeVibrato();
      return;
    }
    if (code === 'KeyR' || code === 'ShiftLeft') {
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
      const d4RefInputDrag = document.getElementById('d4-ref-input') as HTMLInputElement;
      if (d4RefInputDrag) d4RefInputDrag.value = newHz.toFixed(2);
      const d4RefHintDrag = document.getElementById('d4-ref-hint') as HTMLElement;
      if (d4RefHintDrag) d4RefHintDrag.textContent = hzToNoteAnnotation(newHz, 293.66);
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
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--fg) 0%, var(--fg) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
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
  const app = new DComposeApp();
  (window as unknown as { dcomposeApp: DComposeApp }).dcomposeApp = app;
});
