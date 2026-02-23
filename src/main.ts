/**
 * DCompose Web — Main Application
 *
 * Wires together:
 * - Web MIDI input (MidiInput) with per-device management
 * - Isomorphic keyboard (KeyboardVisualizer) with skew slider
 * - Note history + waterfall + chord panel (NoteHistoryVisualizer)
 * - Keyboard layout dropdown (isomorphic-qwerty variants)
 * - Web Audio synth (Synth)
 */

import { getLayout, KEYBOARD_VARIANTS, KeyboardLayout, KeyCoordinate } from './lib/keyboard-layouts';
import { Synth, WaveformType, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker, TUNING_MARKERS } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { NoteHistoryVisualizer } from './lib/note-history-visualizer';
import { MidiInput, MidiDeviceInfo, MidiChannelMode } from './lib/midi-input';
import { midiToCoord } from './lib/note-colors';
import { Note } from 'tonal';
import { createChordGraffiti } from './lib/chord-graffiti';

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private historyVisualizer: NoteHistoryVisualizer | null = null;
  private midi: MidiInput;
  private currentLayout: KeyboardLayout;

  private octaveOffset: number = 0;
  private transposeOffset: number = 0;

  // Active notes keyed by the input source string (keyboard code or pointer id)
  private activeNotes: Map<string, { coordX: number; coordY: number; vibratoOnPress: boolean }> = new Map();
  private keyRepeat: Set<string> = new Set();

  private pointerDown: Map<number, { coordX: number; coordY: number } | null> = new Map();
  private draggingGoldenLine: boolean = false;
  private goldenLineDragStartY: number = 0;
  private goldenLineDragStartHz: number = 293.66;

  // DOM
  private canvas: HTMLCanvasElement;
  private historyCanvas: HTMLCanvasElement;
  private waveformSelect: HTMLSelectElement;
  private layoutSelect: HTMLSelectElement | null = null;
  private skewSlider: HTMLInputElement | null = null;
  private tuningSlider: HTMLInputElement | null = null;
  private tuningValue: HTMLElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private vibratoIndicator: HTMLElement | null = null;
  private sustainIndicator: HTMLElement | null = null;
  private midiDeviceList: HTMLElement | null = null;
  private midiChannelModeSelect: HTMLSelectElement | null = null;
  private zoomSlider: HTMLInputElement | null = null;
  private defaultZoom: number = 1.0;
  private updateGraffiti: (() => void) | null = null;

  constructor() {
    this.synth = new Synth();
    this.midi = new MidiInput();
    this.currentLayout = getLayout('ansi');

    this.canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
    this.historyCanvas = document.getElementById('history-canvas') as HTMLCanvasElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.layoutSelect = document.getElementById('layout-select') as HTMLSelectElement;
    this.skewSlider = document.getElementById('skew-slider') as HTMLInputElement;
    this.tuningSlider = document.getElementById('tuning-slider') as HTMLInputElement;
    this.tuningValue = document.getElementById('tuning-value') as HTMLElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.vibratoIndicator = document.getElementById('vibrato-indicator') as HTMLElement;
    this.sustainIndicator = document.getElementById('sustain-indicator') as HTMLElement;
    this.midiDeviceList = document.getElementById('midi-device-list') as HTMLElement;
    this.midiChannelModeSelect = document.getElementById('midi-channel-mode') as HTMLSelectElement;
    this.zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement;

    this.init();
  }

  private async init(): Promise<void> {
    this.setupVisualizer();
    this.setupHistoryVisualizer();
    this.setupEventListeners();
    await this.midi.init();
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
      const r = container.getBoundingClientRect();
      this.visualizer.resize(Math.max(r.width - 2, 300), Math.max(r.height - 2, 200));
    });
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
      // MIDI status is shown in the MIDI settings panel; no need to duplicate in history canvas
    });
  }

  private async handleMidiNoteOn(midiNote: number, _velocity: number): Promise<void> {
    await this.ensureAudioReady();
    const [coordX, coordY] = midiToCoord(midiNote);
    const noteKey = `midi_${midiNote}`;
    const audioNoteId = `midi_${midiNote}_${coordX}_${coordY}`;
    const vibratoActive = this.synth.getVibrato();

    this.synth.playNote(audioNoteId, coordX, coordY, 0, vibratoActive);
    this.activeNotes.set(noteKey, { coordX, coordY, vibratoOnPress: vibratoActive });
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
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

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
      this.skewSlider.addEventListener('input', () => {
        const val = parseFloat(this.skewSlider!.value);
        this.visualizer?.setSkewFactor(val);
        this.updateGraffiti?.();
        const skewValue = document.getElementById('skew-value');
        if (skewValue) skewValue.textContent = val.toFixed(2);
        // Highlight active endpoint label
        const leftLabel = document.getElementById('skew-label-left');
        const rightLabel = document.getElementById('skew-label-right');
        if (leftLabel) leftLabel.classList.toggle('active', val < 0.25);
        if (rightLabel) rightLabel.classList.toggle('active', val > 0.75);
      });
    }

    // Tuning slider
    const nearestMarkerDisplay = document.getElementById('nearest-marker');
    if (this.tuningSlider) {
      this.tuningSlider.min = FIFTH_MIN.toString();
      this.tuningSlider.max = FIFTH_MAX.toString();
      this.tuningSlider.step = '0.1';
      this.tuningSlider.value = FIFTH_DEFAULT.toString();

      const thumbBadge = document.getElementById('tuning-thumb-badge');
      const range = FIFTH_MAX - FIFTH_MIN;

      const updateThumbBadge = (value: number) => {
        if (!thumbBadge) return;
        const pct = ((value - FIFTH_MIN) / range) * 100;
        thumbBadge.style.left = `${pct}%`;
        thumbBadge.textContent = `${value.toFixed(1)}\u00a2`;
      };
      updateThumbBadge(FIFTH_DEFAULT);
      this.tuningSlider.addEventListener('input', () => {
        const value = parseFloat(this.tuningSlider!.value);
        this.synth.setFifth(value);
        this.visualizer?.setGenerator([value, 1200]);
        this.updateGraffiti?.();
        if (this.tuningValue) this.tuningValue.textContent = value.toFixed(1);
        updateThumbBadge(value);
        if (nearestMarkerDisplay) {
          const { marker } = findNearestMarker(value);
          const offset = value - marker.fifth;
          const absOffset = Math.abs(offset);
          if (absOffset < 0.1) {
            nearestMarkerDisplay.textContent = `= ${marker.name}`;
            nearestMarkerDisplay.style.color = '#88ff88';
          } else if (absOffset < 1.0) {
            nearestMarkerDisplay.textContent = `${marker.name} ${offset > 0 ? '+' : ''}${offset.toFixed(1)}\u00a2`;
            nearestMarkerDisplay.style.color = '#ffff88';
          } else {
            nearestMarkerDisplay.textContent = `\u2248 ${marker.name} (${offset > 0 ? '+' : ''}${offset.toFixed(1)}\u00a2)`;
            nearestMarkerDisplay.style.color = '#888';
          }
        }
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
        if (this.tuningValue) this.tuningValue.textContent = marker.fifth.toFixed(1);
        if (nearestMarkerDisplay) {
          nearestMarkerDisplay.textContent = `= ${marker.name}`;
          nearestMarkerDisplay.style.color = '#88ff88';
        }
      });
    }

    // Populate TET preset buttons — positioned proportionally along slider
    const presetsContainer = document.getElementById('tet-presets');
    if (presetsContainer) {
      const sliderRange = FIFTH_MAX - FIFTH_MIN;
      // Sort by fifth value for stagger detection
      const sortedMarkers = [...TUNING_MARKERS].sort((a, b) => a.fifth - b.fifth);
      let lastPct = -Infinity;
      for (const marker of sortedMarkers) {
        const pct = ((marker.fifth - FIFTH_MIN) / sliderRange) * 100;
        const mark = document.createElement('div');
        mark.className = 'tet-preset-mark';
        // Stagger labels that are too close to previous (< 3% of range)
        if (Math.abs(pct - lastPct) < 5) mark.classList.add('stagger');
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
        lastPct = pct;
      }
      // Mark initial active preset (12-TET at 700)
      presetsContainer.querySelector('.tet-preset[data-fifth="700"]')?.classList.add('active');
    }

    // Volume
    this.volumeSlider?.addEventListener('input', () => {
      this.synth.setMasterVolume(parseFloat(this.volumeSlider!.value));
    });

    // Button spacing
    const spacingInput = document.getElementById('spacing-input') as HTMLInputElement;
    spacingInput?.addEventListener('input', () => {
      this.visualizer?.setButtonSpacing(parseFloat(spacingInput.value) || 0);
    });

    // D4 Hz reference inputs
    const d4HzInput = document.getElementById('d4-hz-input') as HTMLInputElement;
    const d4NoteInput = document.getElementById('d4-note-input') as HTMLInputElement;

    d4HzInput?.addEventListener('input', () => {
      const hz = parseFloat(d4HzInput.value) || 293.66;
      this.synth.setD4Hz(hz);
      this.visualizer?.setD4Hz(hz);
      if (d4NoteInput) d4NoteInput.value = Note.fromFreq(hz) || '';
    });

    d4NoteInput?.addEventListener('input', () => {
      const freq = Note.freq(d4NoteInput.value.trim().toUpperCase());
      if (freq && freq >= 100 && freq <= 2000) {
        const hz = Math.round(freq * 100) / 100;
        this.synth.setD4Hz(hz);
        this.visualizer?.setD4Hz(hz);
        if (d4HzInput) d4HzInput.value = hz.toFixed(2);
      }
    });

    // MIDI channel mode
    this.midiChannelModeSelect?.addEventListener('change', () => {
      this.midi.setChannelMode(this.midiChannelModeSelect!.value as MidiChannelMode);
    });

    // MIDI settings toggle
    const midiToggle = document.getElementById('midi-settings-toggle');
    const midiPanel = document.getElementById('midi-settings-panel');
    midiToggle?.addEventListener('click', () => {
      const isOpen = midiPanel?.classList.toggle('open');
      if (midiToggle) midiToggle.textContent = isOpen ? '⚙ MIDI settings' : '⚙ MIDI';
    });

    // Prevent space scroll
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) e.preventDefault();
    });


    // Zoom slider
    const zoomReset = document.getElementById('zoom-reset') as HTMLButtonElement;
    // Mobile default: ~1.6x on touch (base is already 3x via dPy=height/3, so 1.6*3 ≈ 5x)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.defaultZoom = isTouchDevice ? 1.6 : 1.0;
    if (this.zoomSlider) {
      this.zoomSlider.value = this.defaultZoom.toString();
      this.visualizer?.setZoom(this.defaultZoom);
      this.zoomSlider.addEventListener('input', () => {
        const zoom = parseFloat(this.zoomSlider!.value);
        this.visualizer?.setZoom(zoom);
        this.updateGraffiti?.();
      });
    }
    zoomReset?.addEventListener('click', () => {
      if (this.zoomSlider) {
        this.zoomSlider.value = this.defaultZoom.toString();
        this.visualizer?.setZoom(this.defaultZoom);
      }
    });
    window.addEventListener('blur', () => this.stopAllNotes());

    // Auto-return focus to body after using range/select controls so keyboard always works
    document.querySelectorAll<HTMLElement>('select, input[type="range"]').forEach(el => {
      el.addEventListener('pointerup', () => setTimeout(() => el.blur(), 0));
      el.addEventListener('change', () => setTimeout(() => el.blur(), 0));
    });
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
    const allowDefault = ['F5', 'F11', 'F12', 'Escape'].includes(code);
    if (!allowDefault) event.preventDefault();

    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);

    if (code === 'Space') {
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      if (this.vibratoIndicator) this.vibratoIndicator.style.display = 'inline';
      return;
    }
    if (code === 'AltLeft' || code === 'AltRight') {
      await this.ensureAudioReady();
      this.synth.setSustain(true);
      if (this.sustainIndicator) this.sustainIndicator.style.display = 'inline';
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (code === 'Equal' || code === 'NumpadAdd')) {
      event.preventDefault();
      if (this.visualizer) {
        const { scaleX, scaleY } = this.visualizer.getScale();
        this.visualizer.setScale(scaleX * 1.1, scaleY * 1.1);
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && (code === 'Minus' || code === 'NumpadSubtract')) {
      event.preventDefault();
      if (this.visualizer) {
        const { scaleX, scaleY } = this.visualizer.getScale();
        this.visualizer.setScale(scaleX / 1.1, scaleY / 1.1);
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
    const vibratoActive = this.synth.getVibrato();

    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset, vibratoActive);
    this.activeNotes.set(code, { coordX, coordY, vibratoOnPress: vibratoActive });

    // MIDI note for history panel
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.historyVisualizer?.noteOn(effectiveCoordX, effectiveCoordY, midiNote);

    this.render();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);

    if (code === 'Space') {
      this.synth.setVibrato(false);
      if (this.vibratoIndicator) this.vibratoIndicator.style.display = 'none';
      return;
    }
    if (code === 'AltLeft' || code === 'AltRight') {
      this.synth.setSustain(false);
      if (this.sustainIndicator) this.sustainIndicator.style.display = 'none';
      return;
    }

    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    this.synth.stopNote(audioNoteId);
    this.activeNotes.delete(code);
    this.historyVisualizer?.noteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  // ─── Pointer input ──────────────────────────────────────────────────────

  private async handlePointerDown(event: PointerEvent): Promise<void> {
    await this.ensureAudioReady();
    this.canvas.setPointerCapture(event.pointerId);

    const rect = this.canvas.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const goldenLineY = this.visualizer?.getGoldenLineY();

    if (goldenLineY !== undefined && Math.abs(clickY - goldenLineY) < 10) {
      this.draggingGoldenLine = true;
      this.goldenLineDragStartY = clickY;
      this.goldenLineDragStartHz = this.synth.getD4Hz();
      return;
    }

    const button = this.getButtonAtPointer(event);
    if (button) this.playPointerNote(event.pointerId, button.coordX, button.coordY);
    this.pointerDown.set(event.pointerId, button);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (this.draggingGoldenLine) {
      const rect = this.canvas.getBoundingClientRect();
      const deltaY = this.goldenLineDragStartY - (event.clientY - rect.top);
      const newHz = Math.max(100, Math.min(2000, this.goldenLineDragStartHz + deltaY * 0.5));
      this.synth.setD4Hz(newHz);
      this.visualizer?.setD4Hz(newHz);
      const d4HzInput = document.getElementById('d4-hz-input') as HTMLInputElement;
      if (d4HzInput) d4HzInput.value = newHz.toFixed(2);
      const d4NoteInput = document.getElementById('d4-note-input') as HTMLInputElement;
      if (d4NoteInput) d4NoteInput.value = Note.fromFreq(newHz) || '';
      return;
    }

    if (!this.pointerDown.has(event.pointerId)) return;
    const currentButton = this.pointerDown.get(event.pointerId);
    const newButton = this.getButtonAtPointer(event);
    const currentId = currentButton ? `${currentButton.coordX}_${currentButton.coordY}` : null;
    const newId = newButton ? `${newButton.coordX}_${newButton.coordY}` : null;

    if (currentId !== newId) {
      if (currentButton) this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
      if (newButton) this.playPointerNote(event.pointerId, newButton.coordX, newButton.coordY);
      this.pointerDown.set(event.pointerId, newButton);
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
    this.canvas.releasePointerCapture(event.pointerId);
  }

  private getButtonAtPointer(event: PointerEvent): { coordX: number; coordY: number } | null {
    if (!this.visualizer) return null;
    const rect = this.canvas.getBoundingClientRect();
    return this.visualizer.getButtonAtPoint(event.clientX - rect.left, event.clientY - rect.top);
  }

  private playPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    const vibratoActive = this.synth.getVibrato();
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset, vibratoActive);
    this.activeNotes.set(`ptr_${pointerId}`, { coordX, coordY, vibratoOnPress: vibratoActive });
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.historyVisualizer?.noteOn(effectiveCoordX, effectiveCoordY, midiNote);
    this.render();
  }

  private stopPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    this.synth.stopNote(audioNoteId);
    this.activeNotes.delete(`ptr_${pointerId}`);
    this.historyVisualizer?.noteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  public stopAllNotes(): void {
    this.synth.stopAll();
    this.historyVisualizer?.clearAll();
    this.activeNotes.clear();
    this.keyRepeat.clear();
    this.pointerDown.clear();
    this.render();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.visualizer) return;
    const activeNoteIds = Array.from(this.activeNotes.values()).map(
      ({ coordX, coordY }) => `${coordX}_${coordY}`
    );
    this.visualizer.setActiveNotes(activeNoteIds);
    this.visualizer.render();
  }

  private async ensureAudioReady(): Promise<void> {
    if (!this.synth.isInitialized()) await this.synth.init();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new DComposeApp();
  (window as unknown as { dcomposeApp: DComposeApp }).dcomposeApp = app;
});
