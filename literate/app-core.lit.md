# App Core

DComposeApp — the main application class managing synth, visualizer, MIDI, keyboard/pointer input, and all UI wiring.

``` {.typescript file=_generated/app-core.ts}
import { getLayout, KEYBOARD_VARIANTS, KeyboardLayout, codeToLabel, isDvorakLayout, type LabelLayout } from './lib/keyboard-layouts';
import { Synth, WaveformType, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker, TUNING_MARKERS } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { NoteHistoryVisualizer } from './lib/note-history-visualizer';
import { MidiInput, MidiDeviceInfo } from './lib/midi-input';
import { MPEService } from './lib/mpe-service';
import { midiToCoord, coordToMidiNote } from './lib/note-colors';
import { createChordGraffiti } from './lib/chord-graffiti';
import { createIcons, Info, Search, Star, Maximize, RotateCcw, RotateCw, Settings, X } from 'lucide';
import { mountVisOverlay } from './components/mount-vis-overlay';
import { mountGridOverlay } from './components/mount-grid-overlay';
import { mountPedals } from './components/mount-pedals';
import { mountTopBar } from './components/mount-topbar';
import { mountSongBar } from './components/mount-songbar';
import { waveformMachine } from './machines/waveformMachine';
import { pedalMachine } from './machines/pedalMachines';
import { mpeMachine } from './machines/mpeMachine';
import { gameMachine } from './machines/gameMachine';
import { parseMidi } from './lib/midi-parser';
import { buildNoteGroups, computeMedianMidiNote, findOptimalTransposition, transposeSong, foldOctaves, quantizeNotes } from './lib/game-engine';
import type { QuantizationLevel } from './lib/game-engine';
import { loadCalibratedRange, saveCalibratedRange, clearCalibratedRange } from './lib/calibration';
import { searchAllAdapters, type MidiSearchResult } from './lib/midi-search';
import { createActor } from 'xstate';
import SlimSelect from 'slim-select';
import { OverlayScrollbars } from 'overlayscrollbars';

import { isWaveformType, parseNum, formatSliderAnnotation, noteNameToHz } from './app-helpers';
import { createSelectAtSlot, getElement, getElementOrNull, hideNativeSelect, setupCyclingButton } from './app-dom';
import { thumbCenterPx, clampBadgePosition, applySliderFill } from './app-slider';
import { SHEAR_PRESETS, TUNING_LABEL_PRESETS } from './app-constants';
```

All dependencies come from sibling modules tangled from their own literate files. The app wires together synth, visualizer, MIDI, MPE, game engine, and UI state machines into a single orchestrator class.

``` {.typescript file=_generated/app-core.ts}
export class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private historyVisualizer: NoteHistoryVisualizer | null = null;
  private midi: MidiInput;
  private mpe: MPEService;
  private currentLayout: KeyboardLayout;

  private octaveOffset = 0;
  private transposeOffset = 0;

  private activeNotes = new Map<string, { coordX: number; coordY: number }>();
  private noteHoldCounts = new Map<string, number>();
  private keyRepeat = new Set<string>();
  private midiChannelVoice = new Map<string, string>();
  private midiPitchBendRange = 24;
  private expressionBend = true;
  private expressionVelocity = true;
  private expressionPressure = true;
  private expressionTimbre = true;
  private timbreReverse = false;

  private pointerDown = new Map<number, { coordX: number; coordY: number } | null>();
  private pointerWiggle = new Map<number, { xs: number[]; times: number[]; lastDir: number; changes: number }>();

  private maxSimultaneousKeys = 8;
  private peakKeysThisSession = 0;
  private ghostingWarningShown = false;

  private vibratoRAF: number | null = null;
  private vibratoPhase = 0;
  private arrowLeftHeld = false;
  private arrowRightHeld = false;
  private arrowVibratoInterval: ReturnType<typeof setInterval> | null = null;
  private arrowVibratoPhase = 0;
```

The second group of private fields covers DOM references and UI state: canvas elements, all slider inputs, pedal/game actors, idle detection, and the calibration range used by game mode to restrict playable notes.

``` {.typescript file=_generated/app-core.ts}
  private cachedCanvasRect: DOMRect | null = null;
  private renderScheduled = false;
  private canvas: HTMLCanvasElement;
  private historyCanvas: HTMLCanvasElement;
  private layoutSelect: HTMLSelectElement | null = null;
  private skewSlider: HTMLInputElement | null = null;
  private bfactSlider: HTMLInputElement | null = null;
  private tuningSlider: HTMLInputElement | null = null;

  private volumeSlider: HTMLInputElement | null = null;
  private vibratoIndicator: HTMLElement | null = null;
  private sustainIndicator: HTMLElement | null = null;
  private sustainActor: ReturnType<typeof createActor<typeof pedalMachine>> | null = null;
  private vibratoActor: ReturnType<typeof createActor<typeof pedalMachine>> | null = null;
  private midiDeviceList: HTMLElement | null = null;
  private zoomSlider: HTMLInputElement | null = null;
  private defaultZoom = 1.0;
  private detectedDpi = 96;
  private updateGraffiti: (() => void) | null = null;
  private gameActor: ReturnType<typeof createActor<typeof gameMachine>> | null = null;
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIdle = true;
  private gameElapsedInterval: ReturnType<typeof setInterval> | null = null;

  private calibrating = false;
  private calibratedCells = new Set<string>();
  private calibratedRange: ReadonlySet<string> | null = null;

  private static readonly STORAGE_KEYS = {
    zoom: 'gi_zoom', skew: 'gi_skew', bfact: 'gi_bfact', tuning: 'gi_tuning',
    volume: 'gi_volume', waveform: 'gi_waveform', dref: 'gi_dref', layout: 'gi_layout',
    midiPbRange: 'gi_midi_pb_range',
    exprBend: 'gi_expr_bend', exprVelocity: 'gi_expr_velocity', exprPressure: 'gi_expr_pressure', exprTimbre: 'gi_expr_timbre',
    timbreCcMode: 'gi_timbre_cc_mode',
    maxKeys: 'gi_max_keys',
    pressureMode: 'gi_pressure_mode',
    timbreReverse: 'gi_timbre_reverse',
    dpi: 'gi_dpi',
  } as const;

  private loadSetting(key: keyof typeof DComposeApp.STORAGE_KEYS, fallback: string): string {
    try { return localStorage.getItem(DComposeApp.STORAGE_KEYS[key]) ?? fallback; }
    catch { return fallback; }
  }

  private saveSetting(key: keyof typeof DComposeApp.STORAGE_KEYS, value: string): void {
    try { localStorage.setItem(DComposeApp.STORAGE_KEYS[key], value); }
    catch { /* storage full or private mode */ }
  }

  private applyTimbreCcMode(cc: string): void {
    const numericCc = parseInt(cc, 10);
    if (!isNaN(numericCc) && numericCc >= 0 && numericCc <= 127) {
      this.mpe.updateSettings({ timbreCC: numericCc });
    }
  }
```

The constructor initializes the core subsystems (synth, MIDI, MPE, layout) and grabs DOM references for all sliders and indicators. Expression settings are restored from localStorage so MPE behavior persists across sessions. The async `init()` call is fire-and-forget because the constructor itself cannot be async.

``` {.typescript file=_generated/app-core.ts}
  constructor() {
    this.synth = new Synth();
    this.midi = new MidiInput();
    this.mpe = new MPEService();
    this.currentLayout = getLayout('ansi');

    this.canvas = getElement('keyboard-canvas', HTMLCanvasElement);
    this.historyCanvas = getElement('history-canvas', HTMLCanvasElement);
    this.layoutSelect = null;
    this.skewSlider = null;
    this.bfactSlider = null;
    this.tuningSlider = null;

    this.volumeSlider = null;
    this.vibratoIndicator = null;
    this.sustainIndicator = null;
    this.midiDeviceList = null;
    this.zoomSlider = null;

    const savedPbRange = parseInt(this.loadSetting('midiPbRange', '24'), 10);
    this.midiPitchBendRange = (savedPbRange >= 2 && savedPbRange <= 96) ? savedPbRange : 24;
    this.expressionBend = this.loadSetting('exprBend', 'true') === 'true';
    this.expressionVelocity = this.loadSetting('exprVelocity', 'true') === 'true';
    this.expressionPressure = this.loadSetting('exprPressure', 'true') === 'true';
    this.expressionTimbre = this.loadSetting('exprTimbre', 'true') === 'true';
    this.timbreReverse = this.loadSetting('timbreReverse', 'false') === 'true';

    void this.init();
  }
```

The component migration renders several controls only after Solid mounts, so the
constructor cannot safely query them yet. `bindMountedControls` refreshes the
cached element references once the shell components and dynamic selects exist.

``` {.typescript file=_generated/app-core.ts}
  private bindMountedControls(): void {
    this.layoutSelect = getElementOrNull('layout-select', HTMLSelectElement);
    this.skewSlider = getElementOrNull('skew-slider', HTMLInputElement);
    this.bfactSlider = getElementOrNull('bfact-slider', HTMLInputElement);
    this.tuningSlider = getElementOrNull('tuning-slider', HTMLInputElement);
    this.volumeSlider = getElementOrNull('volume-slider', HTMLInputElement);
    this.vibratoIndicator = getElementOrNull('vibrato-indicator', HTMLElement);
    this.sustainIndicator = getElementOrNull('sustain-indicator', HTMLElement);
    this.midiDeviceList = getElementOrNull('midi-device-list', HTMLElement);
    this.zoomSlider = getElementOrNull('zoom-slider', HTMLInputElement);
  }
```

Initialization is async because MIDI and MPE both require browser permission grants. The init sequence is ordered: icons first (so UI renders immediately), then visualizer and history panel, then event listeners, then MIDI/MPE (which may prompt the user). The MPE subscription pipes per-note expression data into the visualizer for real-time pressure/bend display.

``` {.typescript file=_generated/app-core.ts}
  private async init(): Promise<void> {
    createIcons({ icons: { Info, Search, Star, Maximize, RotateCcw, RotateCw, Settings, X } });
    this.calibratedRange = loadCalibratedRange();
    this.setupVisualizer();
    if (this.calibratedRange) {
      this.visualizer?.setCalibratedRange(this.calibratedRange);
    }
    this.setupHistoryVisualizer();
    this.setupEventListeners();
    createIcons({ icons: { Info, Search, Star, Maximize, RotateCcw, RotateCw, Settings, X } });
    await this.midi.init();
    await this.mpe.init();
    this.mpe.subscribe((voices) => {
      const expr = new Map<string, { pressure: number; pitchBend: number }>();
      for (const v of voices) {
        if (v.state === 'active') {
          expr.set(v.noteId, { pressure: v.pressure, pitchBend: v.pitchBend });
        }
      }
      this.visualizer?.setMPEExpression(expr);
      this.visualizer?.render();
    });
    this.setupMidiListeners();
    this.updateMidiDevicePanel(this.midi.getDevices());
    const keyboardContainer = document.getElementById('keyboard-container');
    if (keyboardContainer && this.visualizer) {
      this.updateGraffiti = createChordGraffiti({ container: keyboardContainer, visualizer: this.visualizer });
    }
    this.render();
    requestAnimationFrame(() => {
      this.updateGraffiti?.();
      this.setIdleState(true);
    });
  }
```

The visualizer wraps the main canvas element with a `KeyboardVisualizer` instance. A `ResizeObserver` keeps the canvas dimensions synchronized with its container, and scroll/orientation listeners invalidate the cached bounding rect so hit-testing stays accurate after layout shifts.

``` {.typescript file=_generated/app-core.ts}
  private setupVisualizer(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width - 2, 300);
    const height = Math.max(rect.height - 2, 200);

    this.visualizer = new KeyboardVisualizer(this.canvas, { width, height });

    new ResizeObserver((entries) => {
      if (!this.visualizer) return;
      this.cachedCanvasRect = null;
      const entry = entries[0];
      const w = Math.max(entry.contentRect.width - 2, 300);
      const h = Math.max(entry.contentRect.height - 2, 200);
      this.visualizer.resize(w, h);
      this.updateGraffiti?.();
    }).observe(container);

    window.addEventListener('scroll', () => { this.cachedCanvasRect = null; }, { passive: true });
    window.addEventListener('orientationchange', () => { this.cachedCanvasRect = null; });
    document.addEventListener('scroll', () => { this.cachedCanvasRect = null; }, { passive: true, capture: true });
  }
```

The history visualizer drives the waterfall display and staff notation in the top panel. Like the main canvas, it uses a `ResizeObserver` to stay sized correctly when the user drags the panel divider.

``` {.typescript file=_generated/app-core.ts}
  private setupHistoryVisualizer(): void {
    this.historyVisualizer = new NoteHistoryVisualizer(this.historyCanvas);
    this.historyVisualizer.start();

    const historyContainer = this.historyCanvas.parentElement;
    if (historyContainer) {
      new ResizeObserver((entries) => {
        if (!this.historyVisualizer) return;
        const entry = entries[0];
        this.historyVisualizer.resize(
          entry.contentRect.width > 0 ? entry.contentRect.width : 900,
          entry.contentRect.height > 0 ? entry.contentRect.height : 120
        );
      }).observe(historyContainer);
    }

    this.historyCanvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      if (!this.historyVisualizer) return;
      const rect = this.historyCanvas.getBoundingClientRect();
      const xInCanvas = e.clientX - rect.left;
      const PIANO_W = 52;
      if (xInCanvas <= PIANO_W) {
        const delta = e.deltaY > 0 ? 1 : -1;
        const current = this.historyVisualizer.getTimeWindow();
        const octaves = Math.round(current);
        const newVal = Math.min(8, Math.max(2, octaves + delta));
        const half = Math.floor(newVal * 12 / 2);
        this.historyVisualizer.setNoteRange(coordToMidiNote(0, 0) - half, coordToMidiNote(0, 0) + half);
      } else {
        const delta = e.deltaY > 0 ? 0.5 : -0.5;
        const current = this.historyVisualizer.getTimeWindow();
        const newVal = Math.min(10, Math.max(1, current + delta));
        this.historyVisualizer.setTimeWindow(newVal);
      }
    }, { passive: false });
  }
```

MIDI listener setup wires incoming note-on, note-off, pitch bend, slide (CC74), and pressure (aftertouch) messages from physical controllers into the synth and MPE service. Each expression dimension is gated by its own toggle so users can selectively disable per-note expression channels.

``` {.typescript file=_generated/app-core.ts}
  private setupMidiListeners(): void {
    this.midi.onNoteOn((note, velocity, channel, deviceId) => {
      this.handleMidiNoteOn(note, velocity, channel, deviceId);
    });
    this.midi.onNoteOff((note, _velocity, channel, deviceId) => {
      this.handleMidiNoteOff(note, channel, deviceId);
    });
    this.midi.onStatusChange((devices) => {
      this.updateMidiDevicePanel(devices);
    });

    const getVoicesForChannel = (deviceId: string, channel: number): string[] => {
      const prefix = `${deviceId}_${channel}_`;
      const ids: string[] = [];
      for (const [key, noteId] of this.midiChannelVoice) {
        if (key.startsWith(prefix)) ids.push(noteId);
      }
      return ids;
    };

    this.midi.onPitchBend((channel, value, deviceId) => {
      for (const audioNoteId of getVoicesForChannel(deviceId, channel)) {
        if (this.expressionBend) this.synth.setPitchBend(audioNoteId, value * this.midiPitchBendRange);
        this.mpe.sendPitchBend(audioNoteId, value * this.midiPitchBendRange);
      }
    });
    this.midi.onSlide((channel, value, deviceId) => {
      const v = this.timbreReverse ? 1 - value : value;
      for (const audioNoteId of getVoicesForChannel(deviceId, channel)) {
        if (this.expressionTimbre) this.synth.setTimbre(audioNoteId, v);
        this.mpe.sendSlide(audioNoteId, v);
      }
    });
    this.midi.onPressure((channel, value, deviceId) => {
      for (const audioNoteId of getVoicesForChannel(deviceId, channel)) {
        if (this.expressionPressure) this.synth.setPressure(audioNoteId, value);
        this.mpe.sendPressure(audioNoteId, value);
      }
    });
  }
```

MIDI note-on maps the incoming MIDI note number to grid coordinates using `midiToCoord`, then starts a voice in both the audio synth and the MPE service. Calibration mode piggybacks on this path to record which cells the user can physically reach on their controller.

``` {.typescript file=_generated/app-core.ts}
  private handleMidiNoteOn(midiNote: number, velocity: number, channel: number, deviceId: string): void {
    const [coordX, coordY] = midiToCoord(midiNote);
    const noteKey = `midi_${deviceId}_${channel}_${midiNote}`;
    const audioNoteId = `midi_${deviceId}_${channel}_${midiNote}_${coordX}_${coordY}`;
    const existing = this.activeNotes.get(noteKey);
    if (existing) {
      const oldAudioId = this.midiChannelVoice.get(`${deviceId}_${channel}_${midiNote}`);
      if (oldAudioId) {
        this.synth.stopNote(oldAudioId);
        this.mpe.noteOff(oldAudioId, midiNote);
      }
      this.trackNoteOff(existing.coordX, existing.coordY);
    }
    if (this.calibrating) {
      this.calibratedCells.add(`${coordX}_${coordY}`);
      this.visualizer?.setCalibratedRange(new Set(this.calibratedCells));
    }
    this.activeNotes.set(noteKey, { coordX, coordY });
    this.midiChannelVoice.set(`${deviceId}_${channel}_${midiNote}`, audioNoteId);
    this.trackNoteOn(coordX, coordY, midiNote);
    if (this.gameActor?.getSnapshot().matches('playing')) {
      this.gameActor.send({ type: 'NOTE_PRESSED', cellId: `${coordX}_${coordY}`, midiNote });
    }
    this.render();
    this.synth.tryUnlock();
    if (this.synth.isInitialized()) {
      this.synth.playNote(audioNoteId, coordX, coordY, 0, this.expressionVelocity ? velocity / 127 : 1);
      this.mpe.noteOn(audioNoteId, midiNote, velocity / 127);
    }
  }

  private handleMidiNoteOff(midiNote: number, channel: number, deviceId: string): void {
    const noteKey = `midi_${deviceId}_${channel}_${midiNote}`;
    const noteData = this.activeNotes.get(noteKey);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const audioNoteId = `midi_${deviceId}_${channel}_${midiNote}_${coordX}_${coordY}`;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(noteKey);
    this.midiChannelVoice.delete(`${deviceId}_${channel}_${midiNote}`);
    this.trackNoteOff(coordX, coordY);
    this.render();
  }
```

The MIDI device panel renders a list of connected controllers with enable/disable checkboxes and connection-status dots. It handles three states: WebMIDI unavailable (browser doesn't support it), no devices detected, and the normal device list.

``` {.typescript file=_generated/app-core.ts}
  private updateMidiDevicePanel(devices: MidiDeviceInfo[]): void {
    if (!this.midiDeviceList) return;
    this.midiDeviceList.innerHTML = '';

    if (!this.midi.isAvailable) {
      this.midiDeviceList.innerHTML = '<span class="midi-no-devices" style="line-height:1.5;">WebMIDI is not available in this browser.<br>Use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Opera</strong> for MIDI input.<br><span style="color:var(--dim);font-size:9px;">Safari, iOS, and Firefox do not support WebMIDI.</span></span>';
      return;
    }
    if (devices.length === 0) {
      this.midiDeviceList.innerHTML = '<span class="midi-no-devices">No MIDI devices detected — plug in a controller</span>';
      return;
    }

    for (const device of devices) {
      const row = document.createElement('label');
      row.className = 'midi-device-row';

      const wrapper = document.createElement('span');
      wrapper.className = 'gi-checkbox';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = device.enabled;
      cb.addEventListener('change', () => {
        this.midi.setDeviceEnabled(device.id, cb.checked);
      });
      const check = document.createElement('span');
      check.className = 'gi-check';
      wrapper.appendChild(cb);
      wrapper.appendChild(check);

      const dot = document.createElement('span');
      dot.className = `midi-dot ${device.connected ? 'connected' : 'disconnected'}`;

      const name = document.createElement('span');
      name.className = 'midi-device-name';
      name.textContent = device.name + (device.manufacturer ? ` (${device.manufacturer})` : '');

      row.appendChild(wrapper);
      row.appendChild(dot);
      row.appendChild(name);
      this.midiDeviceList.appendChild(row);
    }
  }
```

`setupEventListeners` is the largest method in the class -- it wires every UI control to its backing state. Keyboard and pointer listeners come first, then each slider/toggle/select gets its event bindings, localStorage persistence, and reset button. The method is split across multiple code blocks below for readability.

``` {.typescript file=_generated/app-core.ts}
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); });

    const visSettingsBtn = document.getElementById('vis-settings-btn');
    const visOverlayMount = document.getElementById('vis-overlay-mount');
    if (visSettingsBtn && visOverlayMount && this.historyVisualizer) {
      mountVisOverlay(visOverlayMount, visSettingsBtn, this.historyVisualizer);
    }

    const topbarMountEl = document.getElementById('topbar-mount');
    if (topbarMountEl) {
      mountTopBar(
        topbarMountEl,
        () => { /* about dialog wired in main.ts via #about-btn id */ },
        () => {
          Object.keys(localStorage).filter(k => k.startsWith('gi_')).forEach(k => { localStorage.removeItem(k); });
          location.reload();
        },
      );
    }

    const gridCog = getElementOrNull('grid-settings-btn', HTMLButtonElement);
    const gridOverlayMount = document.getElementById('grid-overlay-mount');
    if (gridCog && gridOverlayMount) {
      mountGridOverlay(gridOverlayMount, gridCog);
    }

    const savedMax = this.loadSetting('maxKeys', '8');
    this.maxSimultaneousKeys = parseInt(savedMax, 10);

    const songbarMountEl = document.getElementById('songbar-mount');
    if (songbarMountEl) {
      mountSongBar(songbarMountEl, {
        onSearch: () => { /* value read imperatively below via #midi-search-input */ },
        onSearchFocus: () => {
          const hint = document.querySelector<HTMLElement>('#song-bar-hint');
          if (hint) hint.style.display = 'none';
        },
        onSearchBlur: () => {
          const searchInput = document.querySelector<HTMLInputElement>('#midi-search-input');
          const hint = document.querySelector<HTMLElement>('#song-bar-hint');
          if (searchInput && hint && searchInput.value.trim() === '') {
            const gameState = this.gameActor ? String(this.gameActor.getSnapshot().value) : undefined;
            if (!gameState || gameState === 'idle' || gameState === 'error') {
              hint.style.display = '';
            }
          }
        },
        onQuantizationCycle: () => { /* value read on-demand by loadMidiFromBuffer */ },
        onGameReset: () => { this.gameActor?.send({ type: 'GAME_RESTART' }); },
        onCalibrateStart: () => { this.enterCalibrationMode(); },
        onCalibrateConfirm: () => { this.exitCalibrationMode(true); },
        onCalibrateCancel: () => { this.exitCalibrationMode(false); },
        onMaxKeysChange: (n: number) => {
          this.maxSimultaneousKeys = n;
          this.saveSetting('maxKeys', String(n));
        },
        initialMaxKeys: this.maxSimultaneousKeys,
      });
    }

    createSelectAtSlot('wave-select-slot', 'wave-select', [
      { value: 'sawtooth', text: 'SAW' },
      { value: 'sine', text: 'SIN' },
      { value: 'square', text: 'SQR' },
      { value: 'triangle', text: 'TRI' },
      { value: 'pluck', text: 'PLUCK' },
      { value: 'organ', text: 'ORGAN' },
      { value: 'brass', text: 'BRASS' },
      { value: 'pad', text: 'PAD' },
      { value: 'bell', text: 'BELL' },
      { value: 'bass', text: 'BASS' },
      { value: 'bright', text: 'BRIGHT' },
      { value: 'warm', text: 'WARM' },
      { value: 'guitar', text: 'GUITAR' },
    ], {});

    createSelectAtSlot('layout-select-slot', 'layout-select', [], {});

    createSelectAtSlot('mpe-output-select-slot', 'mpe-output-select', [
      { value: '', text: 'No MIDI outputs' },
    ], { style: 'min-width:120px;', disabled: '' });

    setupCyclingButton('quantization-level', [
      { value: 'none', label: 'None' },
      { value: '1/4', label: '1/4' },
      { value: '1/8', label: '1/8' },
      { value: '1/16', label: '1/16' },
    ], 'none', () => { /* value read on-demand by loadMidiFromBuffer */ });

    this.bindMountedControls();

    const gridOverlay = getElementOrNull('grid-overlay', HTMLDivElement);
    if (gridOverlay) {
      gridOverlay.setAttribute('data-overlayscrollbars-initialize', '');
      const overlayScrollbars = OverlayScrollbars(gridOverlay, {
        scrollbars: {
          theme: 'gi-scrollbar',
          visibility: 'visible',
          autoHide: 'never',
        },
      });
      gridCog?.addEventListener('click', () => {
        setTimeout(() => {
          overlayScrollbars.update();
        }, 50);
      });
    }
    const savedWaveform = this.loadSetting('waveform', 'sawtooth');
    const initialWaveform: WaveformType = isWaveformType(savedWaveform) ? savedWaveform : 'sawtooth';
    const waveformActor = createActor(waveformMachine, { input: { initial: initialWaveform } });
    const waveSelect = getElementOrNull('wave-select', HTMLSelectElement);
    let waveSS: SlimSelect | null = null;
    if (waveSelect) {
      waveSelect.value = initialWaveform;
      waveSS = new SlimSelect({
        select: waveSelect,
        settings: { showSearch: false },
        events: {
          afterChange: (newVal) => {
            const wf = newVal[0]?.value;
            if (wf && isWaveformType(wf)) waveformActor.send({ type: 'SELECT', waveform: wf });
            document.querySelectorAll<HTMLElement>('.ss-main').forEach(el => { el.blur(); });
          },
        },
      });
    }
    waveformActor.subscribe((snapshot) => {
      const active = snapshot.context.active;
      if (waveSS) waveSS.setSelected(active);
      this.synth.setWaveform(active);
      this.saveSetting('waveform', active);
    });
    waveformActor.start();
    const waveReset = getElementOrNull('wave-reset', HTMLButtonElement);
    waveReset?.addEventListener('click', () => { waveformActor.send({ type: 'SELECT', waveform: 'sawtooth' }); });
```

The keyboard layout selector auto-detects ISO vs ANSI by probing the Keyboard API for the `IntlBackslash` key. When the user changes layout, QWERTY overlay labels update to match the new physical key positions.

``` {.typescript file=_generated/app-core.ts}
    if (this.layoutSelect) {
      for (const variant of KEYBOARD_VARIANTS) {
        const opt = document.createElement('option');
        opt.value = variant.id;
        opt.textContent = variant.name;
        this.layoutSelect.appendChild(opt);
      }
      const savedLayout = this.loadSetting('layout', '');
      if (savedLayout) {
        this.layoutSelect.value = savedLayout;
        this.currentLayout = getLayout(savedLayout);
        this.labelLayout = isDvorakLayout(savedLayout) ? 'dvorak' : 'qwerty';
      } else {
        this.currentLayout = getLayout('ansi');
        this.layoutSelect.value = 'ansi';
        try {
          const kb = (navigator as unknown as Record<string, unknown>)['keyboard'] as unknown as { getLayoutMap?: () => Promise<Map<string, string>> } | undefined;
          if (kb?.getLayoutMap) {
            kb.getLayoutMap().then((layoutMap) => {
              if (layoutMap.has('IntlBackslash')) {
                this.currentLayout = getLayout('iso');
                if (this.layoutSelect) this.layoutSelect.value = 'iso';
                this.visualizer?.render();
              }
            }).catch(() => { /* fallback to ANSI */ });
          }
        } catch { /* Keyboard API not available */ }
      }

      const layoutSS = new SlimSelect({
        select: this.layoutSelect,
        settings: { showSearch: false },
        events: {
          afterChange: (newVal) => {
            const val = newVal[0]?.value;
            if (val) {
              this.currentLayout = getLayout(val);
              this.labelLayout = isDvorakLayout(val) ? 'dvorak' : 'qwerty';
              this.saveSetting('layout', val);
              const qToggle = getElementOrNull('qwerty-overlay-toggle', HTMLInputElement);
              if (qToggle?.checked) {
                this.visualizer?.setQwertyLabels(this.buildKeyboardLabels());
                this.visualizer?.render();
              }
            }
            document.querySelector<HTMLElement>('.ss-main')?.blur();
          },
        },
      });
      const layoutReset = getElementOrNull('layout-reset', HTMLButtonElement);
      layoutReset?.addEventListener('click', () => {
        layoutSS.setSelected('ansi');
      });
    }
```

The skew slider smoothly morphs between DCompose (diagonal parallelogram, skew=0) and MidiMech (orthogonal rectangular, skew=1) geometries. The thumb badge shows the current numeric value and is directly editable for precise input.

``` {.typescript file=_generated/app-core.ts}
    if (this.skewSlider) {
      const skewRef = this.skewSlider;
      const skewBadge = getElementOrNull('skew-thumb-badge', HTMLInputElement);

      const savedSkew = this.loadSetting('skew', '0');
      skewRef.value = savedSkew;
      this.visualizer?.setSkewFactor(parseFloat(savedSkew));

      skewRef.addEventListener('input', () => {
        const val = parseFloat(skewRef.value);
        this.visualizer?.setSkewFactor(val);
        this.updateGraffiti?.();
        this.saveSetting('skew', skewRef.value);
      });

      const skewReset = getElementOrNull('skew-reset', HTMLButtonElement);
      skewReset?.addEventListener('click', () => {
        if (this.skewSlider) {
          this.skewSlider.value = '0';
          this.skewSlider.dispatchEvent(new Event('input'));
        }
      });

      if (skewBadge) {
        skewBadge.addEventListener('change', () => {
          const raw = parseFloat(skewBadge.value);
          if (isFinite(raw)) {
            this.visualizer?.setSkewFactor(raw);
            this.updateGraffiti?.();
            if (this.skewSlider) {
              const sMin = parseFloat(this.skewSlider.min);
              const sMax = parseFloat(this.skewSlider.max);
              this.skewSlider.value = Math.max(sMin, Math.min(sMax, raw)).toString();
            }
          } else {
            const current = parseFloat(this.skewSlider?.value ?? '0');
            skewBadge.value = current.toFixed(2);
          }
        });
        skewBadge.addEventListener('focus', () => { skewBadge.select(); });
      }

      this.populateSliderPresets('skew-presets', this.skewSlider, [
        { value: 0, label: 'DCompose / Wicki-Hayden', description: 'DCompose: diagonal parallelogram grid (Striso angle). Wicki-Hayden shares this skew — use WICKED SHEAR to differentiate.' },
        { value: 1, label: 'MidiMech', description: 'MidiMech: orthogonal rectangular grid' },
      ]);
    }
```

Wicked Shear (bfact) controls the row-offset angle of the lattice. At bfact=0 (DCompose), rows stack diagonally; at bfact=1 (Wicki-Hayden), rows align horizontally. The label dynamically annotates which preset is closest to the current value.

``` {.typescript file=_generated/app-core.ts}
    if (this.bfactSlider) {
      const bfactRef = this.bfactSlider;
      const bfactBadge = getElementOrNull('bfact-thumb-badge', HTMLInputElement);
      const bfactLabel = getElementOrNull('bfact-label', HTMLSpanElement);

      const updateBfactLabel = (value: number): void => {
        if (!bfactLabel) return;
        const ann = formatSliderAnnotation(value, SHEAR_PRESETS, 2);
        bfactLabel.innerHTML = `WICKED SHEAR <span style='color:#88ff88'>${ann}</span>`;
      };

      const updateBfactBadge = (value: number): void => {
        if (!bfactBadge) return;
        const sliderMin = parseFloat(bfactRef.min);
        const sliderMax = parseFloat(bfactRef.max);
        const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, value));
        const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
        const centerPx = thumbCenterPx(ratio, bfactRef);
        const clampedPx = clampBadgePosition(centerPx, bfactRef, 50);
        bfactBadge.style.left = `${clampedPx}px`;
        bfactBadge.value = value.toFixed(2);
      };

      const savedBfact = this.loadSetting('bfact', '0');
      bfactRef.value = savedBfact;
      updateBfactBadge(parseFloat(savedBfact));
      updateBfactLabel(parseFloat(savedBfact));
      this.visualizer?.setBFact(parseFloat(savedBfact));

      bfactRef.addEventListener('input', () => {
        const val = parseFloat(bfactRef.value);
        this.visualizer?.setBFact(val);
        this.updateGraffiti?.();
        updateBfactBadge(val);
        updateBfactLabel(val);
        this.updateSliderFill(bfactRef);
        this.saveSetting('bfact', bfactRef.value);
      });

      const bfactReset = getElementOrNull('bfact-reset', HTMLButtonElement);
      bfactReset?.addEventListener('click', () => {
        if (this.bfactSlider) {
          this.bfactSlider.value = '0';
          this.bfactSlider.dispatchEvent(new Event('input'));
        }
      });

      if (bfactBadge) {
        bfactBadge.addEventListener('change', () => {
          const raw = parseFloat(bfactBadge.value);
          if (isFinite(raw)) {
            this.visualizer?.setBFact(raw);
            this.updateGraffiti?.();
            updateBfactBadge(raw);
            updateBfactLabel(raw);
            if (this.bfactSlider) {
              const sMin = parseFloat(this.bfactSlider.min);
              const sMax = parseFloat(this.bfactSlider.max);
              this.bfactSlider.value = Math.max(sMin, Math.min(sMax, raw)).toString();
              this.updateSliderFill(this.bfactSlider);
            }
          } else {
            const current = parseFloat(this.bfactSlider?.value ?? '0');
            bfactBadge.value = current.toFixed(2);
          }
        });
        bfactBadge.addEventListener('focus', () => { bfactBadge.select(); });
      }

      this.populateSliderPresets('bfact-presets', this.bfactSlider, [
        { value: 0, label: 'DCompose', description: 'DCompose: no row shear (default lattice)' },
        { value: 1, label: 'Wicki-Hayden', description: 'Wicki-Hayden: horizontal rows (shear mapping from Tonnetz)' },
      ]);
    }
```

The fifths tuning slider sets the generator interval in cents. This is the core microtonality control: 700 cents = 12-TET, 701.96 = Pythagorean, 696.58 = quarter-comma meantone. Double-clicking snaps to the nearest named temperament marker. The thumb badge is editable for precise cent values.

``` {.typescript file=_generated/app-core.ts}
    if (this.tuningSlider) {
      const tuningRef = this.tuningSlider;
      tuningRef.min = FIFTH_MIN.toString();
      tuningRef.max = FIFTH_MAX.toString();
      tuningRef.step = '0.01';
      tuningRef.value = FIFTH_DEFAULT.toString();

      const thumbBadge = getElementOrNull('tuning-thumb-badge', HTMLInputElement);
      const range = FIFTH_MAX - FIFTH_MIN;
      const updateThumbBadge = (value: number): void => {
        if (!thumbBadge) return;
        const ratio = (value - FIFTH_MIN) / range;
        const centerPx = thumbCenterPx(ratio, tuningRef);
        const clampedPx = clampBadgePosition(centerPx, tuningRef, 50);
        thumbBadge.style.left = `${clampedPx}px`;
        thumbBadge.value = value.toFixed(1);
      };
      const tuningLabel = getElementOrNull('tuning-label', HTMLSpanElement);
      const updateTuningLabel = (value: number): void => {
        if (!tuningLabel) return;
        const ann = formatSliderAnnotation(value, TUNING_LABEL_PRESETS, 1, '\u00a2');
        tuningLabel.innerHTML = `FIFTHS TUNING (cents) <span style='color:#88ff88'>${ann}</span>`;
      };
      updateTuningLabel(FIFTH_DEFAULT);
      updateThumbBadge(FIFTH_DEFAULT);

      const savedTuning = this.loadSetting('tuning', FIFTH_DEFAULT.toString());
      tuningRef.value = savedTuning;
      updateThumbBadge(parseFloat(savedTuning));
      updateTuningLabel(parseFloat(savedTuning));
      this.synth.setFifth(parseFloat(savedTuning));
      this.visualizer?.setGenerator([parseFloat(savedTuning), 1200]);

      tuningRef.addEventListener('input', () => {
        const value = parseFloat(tuningRef.value);
        this.synth.setFifth(value);
        this.visualizer?.setGenerator([value, 1200]);
        this.updateGraffiti?.();

        updateThumbBadge(value);
        updateTuningLabel(value);
        this.updateSliderFill(tuningRef);
        this.saveSetting('tuning', tuningRef.value);
      });

      tuningRef.addEventListener('dblclick', () => {
        const currentValue = parseFloat(tuningRef.value);
        const { marker } = findNearestMarker(currentValue);
        tuningRef.value = marker.fifth.toString();
        this.synth.setFifth(marker.fifth);
        this.visualizer?.setGenerator([marker.fifth, 1200]);
        this.updateSliderFill(tuningRef);
        updateThumbBadge(marker.fifth);
        updateTuningLabel(marker.fifth);
      });
      const tuningReset = getElementOrNull('tuning-reset', HTMLButtonElement);
      tuningReset?.addEventListener('click', () => {
        if (this.tuningSlider) {
          this.tuningSlider.value = FIFTH_DEFAULT.toString();
          this.tuningSlider.dispatchEvent(new Event('input'));
        }
      });
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
              updateTuningLabel(raw);
            }
          } else {
            const current = parseFloat(this.tuningSlider?.value ?? FIFTH_DEFAULT.toString());
            thumbBadge.value = current.toFixed(1);
          }
        });
        thumbBadge.addEventListener('focus', () => { thumbBadge.select(); });
      }
    }
```

TET preset tick marks are generated from the `TUNING_MARKERS` array (5-TET through 53-TET and named temperaments). Each tick is a clickable button that snaps the tuning slider to that temperament's fifth size.

``` {.typescript file=_generated/app-core.ts}
    if (this.tuningSlider) {
      const tetPresets = TUNING_MARKERS.map(m => ({
        value: m.fifth,
        label: m.name,
        description: `${m.description} (${m.fifth.toFixed(2)}\u00a2)`,
      }));
      this.populateSliderPresets('tet-presets', this.tuningSlider, tetPresets);
    }

     const savedVolume = this.loadSetting('volume', '0.3');
     if (this.volumeSlider) {
       this.volumeSlider.value = savedVolume;
       this.synth.setMasterVolume(parseFloat(savedVolume));
     }
     if (this.volumeSlider) {
       const volRef = this.volumeSlider;
       volRef.addEventListener('input', () => {
         const val = parseFloat(volRef.value);
         this.synth.setMasterVolume(val);
         this.saveSetting('volume', volRef.value);
       });
     }
     const volReset = getElementOrNull('volume-reset', HTMLButtonElement);
     volReset?.addEventListener('click', () => {
       if (this.volumeSlider) {
         this.volumeSlider.value = '0.3';
         this.volumeSlider.dispatchEvent(new Event('input'));
       }
     });
```

The D-ref input accepts both raw Hz values and note names (e.g. "A4", "Bb3"). The slider and text input stay synchronized bidirectionally -- editing one updates the other. This lets users set the reference pitch by ear (slider) or by theory (note name).

``` {.typescript file=_generated/app-core.ts}
    const spacingInput = getElementOrNull('spacing-input', HTMLInputElement);
    spacingInput?.addEventListener('input', () => {
      this.visualizer?.setButtonSpacing(parseNum(spacingInput.value, 0));
    });

    const dRefInput = getElementOrNull('d-ref-input', HTMLInputElement);
    const dRefSlider = getElementOrNull('d-ref-slider', HTMLInputElement);
    const dRefLabel = getElementOrNull('d-ref-label', HTMLSpanElement);

    const updateDRefLabel = (hz: number): void => {
      if (!dRefLabel) return;
      dRefLabel.textContent = `D REF (${hz.toFixed(1)} Hz)`;
    };

    const updateDRefDisplay = (hz: number): void => {
      if (dRefInput && document.activeElement !== dRefInput) {
        dRefInput.value = hz.toFixed(2);
      }
      if (dRefInput && dRefSlider) {
        const min = parseFloat(dRefSlider.min);
         const max = parseFloat(dRefSlider.max);
         const clamped = Math.max(min, Math.min(max, hz));
         const ratio = (clamped - min) / (max - min);
         const centerPx = thumbCenterPx(ratio, dRefSlider);
         const clampedPx = clampBadgePosition(centerPx, dRefSlider, 80);
         dRefInput.style.left = `${clampedPx}px`;
       }
      if (dRefSlider && document.activeElement !== dRefSlider) {
        const min = parseFloat(dRefSlider.min);
        const max = parseFloat(dRefSlider.max);
        dRefSlider.value = Math.max(min, Math.min(max, hz)).toFixed(2);
        this.updateSliderFill(dRefSlider);
      }
      updateDRefLabel(hz);
    };

    const applyDRefHz = (hz: number): void => {
      this.synth.setD4Hz(hz);
      this.visualizer?.setD4Hz(hz);
      updateDRefDisplay(hz);
    };

```

The D-ref input field handles both numeric Hz values and note name strings (e.g.
"A4", "Bb3"). On each keystroke, it tries note-name parsing first via
`noteNameToHz`, falling back to raw float parsing. Blur commits the value or
resets to the default 293.66 Hz if invalid.

``` {.typescript file=_generated/app-core.ts}
    dRefInput?.addEventListener('input', () => {
      const raw = dRefInput.value.trim();
      if (raw === '') return;
      const fromNote = noteNameToHz(raw);
      if (fromNote !== null) {
        dRefInput.value = fromNote.toFixed(2);
        dRefInput.setCustomValidity('');
        applyDRefHz(fromNote);
        return;
      }
      const hz = parseFloat(raw);
      if (isFinite(hz) && hz >= 20 && hz <= 20000) {
        dRefInput.setCustomValidity('');
        applyDRefHz(hz);
      } else {
        dRefInput.setCustomValidity('Invalid Hz or note name');
      }
    });

    dRefInput?.addEventListener('blur', () => {
      const raw = dRefInput.value.trim();
      if (raw === '') { applyDRefHz(293.66); return; }
      const fromNote = noteNameToHz(raw);
      if (fromNote !== null) {
        dRefInput.value = fromNote.toFixed(2);
        dRefInput.setCustomValidity('');
        applyDRefHz(fromNote);
        return;
      }
      const hz = parseFloat(raw);
      if (isFinite(hz) && hz >= 20 && hz <= 20000) {
        dRefInput.value = hz.toFixed(2);
        dRefInput.setCustomValidity('');
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
        this.saveSetting('dref', dRefSlider.value);
      }
    });

    const savedDref = this.loadSetting('dref', '293.66');
    if (dRefInput) dRefInput.value = savedDref;
    if (dRefSlider) dRefSlider.value = savedDref;
    updateDRefDisplay(parseFloat(savedDref));

    const dRefReset = getElementOrNull('d-ref-reset', HTMLButtonElement);
      dRefReset?.addEventListener('click', () => {
        if (dRefInput) dRefInput.setCustomValidity('');
        if (dRefSlider) {
          dRefSlider.value = '293.66';
          dRefSlider.dispatchEvent(new Event('input'));
        }
      });
```

MIDI expression settings let the user configure pitch bend range (2-48 semitones) and toggle individual expression dimensions on or off. This is important because not all controllers send all MPE dimensions, and some players prefer deterministic behavior over expressive control.

``` {.typescript file=_generated/app-core.ts}
    const pbRangeInput = getElementOrNull('midi-pb-range-expr', HTMLInputElement);
    if (pbRangeInput) {
      pbRangeInput.value = this.midiPitchBendRange.toString();
      pbRangeInput.addEventListener('change', () => {
        const val = parseInt(pbRangeInput.value, 10);
        if (val >= 2 && val <= 96) {
          this.midiPitchBendRange = val;
          this.saveSetting('midiPbRange', val.toString());
        } else {
          pbRangeInput.value = this.midiPitchBendRange.toString();
        }
      });
      pbRangeInput.addEventListener('blur', () => {
        const val = parseInt(pbRangeInput.value, 10);
        const clamped = Math.max(0, Math.min(96, val));
        pbRangeInput.value = clamped.toString();
        if (clamped >= 2 && clamped <= 48) {
          this.midiPitchBendRange = clamped;
          this.saveSetting('midiPbRange', clamped.toString());
        }
      });
    }

```

Each expression dimension (bend, velocity, pressure, timbre) has a checkbox that
toggles it on or off, persisted in localStorage. The timbre CC mode cycles through
CC74 (brightness), CC1 (mod wheel), and CC11 (expression) via a compact cycling
button component.

``` {.typescript file=_generated/app-core.ts}
    const exprBendCb = getElementOrNull('expr-bend', HTMLInputElement);
    if (exprBendCb) {
      exprBendCb.checked = this.expressionBend;
      exprBendCb.addEventListener('change', () => {
        this.expressionBend = exprBendCb.checked;
        this.saveSetting('exprBend', exprBendCb.checked.toString());
      });
    }
    const exprVelCb = getElementOrNull('expr-velocity', HTMLInputElement);
    if (exprVelCb) {
      exprVelCb.checked = this.expressionVelocity;
      exprVelCb.addEventListener('change', () => {
        this.expressionVelocity = exprVelCb.checked;
        this.saveSetting('exprVelocity', exprVelCb.checked.toString());
      });
    }
    const PRESSURE_MODES = [
      { value: 'channel', label: 'Channel' },
      { value: 'poly', label: 'Poly AT' },
      { value: 'mpe', label: 'MPE' },
      { value: 'off', label: 'Off' },
    ];
    const savedPressureMode = this.loadSetting('pressureMode', 'channel');
    this.expressionPressure = savedPressureMode !== 'off';
    setupCyclingButton('pressure-mode', PRESSURE_MODES, savedPressureMode, (mode) => {
      this.expressionPressure = mode !== 'off';
      this.saveSetting('pressureMode', mode);
    });

    const exprTimbreCb = getElementOrNull('expr-timbre', HTMLInputElement);
    if (exprTimbreCb) {
      exprTimbreCb.checked = this.expressionTimbre;
      exprTimbreCb.addEventListener('change', () => {
        this.expressionTimbre = exprTimbreCb.checked;
        this.saveSetting('exprTimbre', exprTimbreCb.checked.toString());
      });
    }

    const timbreRevCb = getElementOrNull('timbre-reverse', HTMLInputElement);
    if (timbreRevCb) {
      timbreRevCb.checked = this.timbreReverse;
      timbreRevCb.addEventListener('change', () => {
        this.timbreReverse = timbreRevCb.checked;
        this.saveSetting('timbreReverse', timbreRevCb.checked.toString());
      });
    }

    const TIMBRE_CC_OPTIONS = [
      { value: '74', label: 'CC74' },
      { value: '1', label: 'CC1' },
      { value: '11', label: 'CC11' },
    ];
    const savedTimbreMode = this.loadSetting('timbreCcMode', '74');
    this.applyTimbreCcMode(savedTimbreMode);
    setupCyclingButton('timbre-cc-mode', TIMBRE_CC_OPTIONS, savedTimbreMode, (cc) => {
      this.applyTimbreCcMode(cc);
      this.saveSetting('timbreCcMode', cc);
    });
```

MPE output sends per-note expression data to an external MIDI device. The state machine (`mpeMachine`) gates the enable/disable toggle, while the SlimSelect dropdown lists available MIDI outputs. The output list refreshes automatically when devices are connected or disconnected.

``` {.typescript file=_generated/app-core.ts}
    const mpeCheckbox = getElementOrNull('mpe-enabled', HTMLInputElement);
    const mpeSelect = getElementOrNull('mpe-output-select', HTMLSelectElement);
    const mpeActor = createActor(mpeMachine);

    let mpeSS: SlimSelect | null = null;
    if (mpeSelect) {
      mpeSS = new SlimSelect({
        select: mpeSelect,
        settings: { showSearch: false },
        events: {
          afterChange: (newVal) => {
            if (!mpeActor.getSnapshot().matches('enabled')) return;
            const outputs = this.mpe.getAvailableOutputs();
            const selected = outputs.find(o => o.id === newVal[0]?.value) ?? null;
            this.mpe.setOutput(selected);
            document.querySelectorAll<HTMLElement>('.ss-main').forEach(el => { el.blur(); });
          },
        },
      });
      hideNativeSelect(mpeSelect);
    }

    mpeActor.subscribe((snapshot) => {
      const isEnabled = snapshot.matches('enabled');
      if (mpeCheckbox) mpeCheckbox.checked = isEnabled;
      if (mpeSS) {
        if (isEnabled) { mpeSS.enable(); } else { mpeSS.disable(); }
      }
      if (mpeSelect) hideNativeSelect(mpeSelect);
    });

    mpeActor.start();

    const refreshMpeOutputs = (): void => {
      if (!mpeSS) return;
      const outputs = this.mpe.getAvailableOutputs();
      if (outputs.length === 0) {
        mpeSS.setData([{ text: 'No MIDI outputs', value: '', placeholder: true }]);
        mpeSS.disable();
        if (mpeSelect) hideNativeSelect(mpeSelect);
        return;
      }
      mpeSS.setData(outputs.map(o => ({ text: o.name ?? o.id, value: o.id })));
      if (!mpeActor.getSnapshot().matches('enabled')) {
        mpeSS.disable();
      }
      if (mpeSelect) hideNativeSelect(mpeSelect);
    };

    mpeCheckbox?.addEventListener('change', () => {
      mpeActor.send({ type: 'TOGGLE' });
      const enabled = mpeActor.getSnapshot().matches('enabled');
      this.mpe.setEnabled(enabled);
      if (enabled) {
        const selectedId = mpeSelect?.value;
        const outputs = this.mpe.getAvailableOutputs();
        const selected = outputs.find(o => o.id === selectedId) ?? outputs[0];
        this.mpe.setOutput(selected);
      } else {
        this.mpe.setOutput(null);
      }
    });

    refreshMpeOutputs();
    const midiAccess = this.mpe.getMidiAccess();
    if (midiAccess) {
      midiAccess.onstatechange = () => { refreshMpeOutputs(); };
    }
```

Prevent the browser's default Space-key scroll behavior when the keyboard body has focus, since Space is the sustain pedal.

``` {.typescript file=_generated/app-core.ts}
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) e.preventDefault();
    });


```

### Default Zoom — matching grid cells to finger instrument key widths

The grid should feel like other finger instruments. Three reference key widths:

| Instrument | Key width | Source |
|-----------|----------|--------|
| QWERTY keyboard key + padding | ~19mm | [Cherry MX keycap](https://deskthority.net/wiki/Cherry_MX) |
| Piano white key | ~23mm | [Musical keyboard](https://en.wikipedia.org/wiki/Musical_keyboard#Size) |
| [LinnStrument](https://www.rogerlinndesign.com/linnstrument) pad | ~17mm | Roger Linn Design |

We target **23mm** (piano white key) as the default — it's the largest common reference and produces cells where note labels are comfortably readable. Users can adjust via the zoom slider.

#### DPI detection via matchMedia resolution probing

The CSS `1px = 1/96 inch` spec constant is only a **reference pixel** for print
layout — on screen, browsers do not guarantee this mapping. A 27" 1080p desktop
monitor has ~82 physical DPI while a 13" MacBook retina has ~227 physical DPI,
yet both nominally use 96 CSS px/inch. The result: `PIANO_KEY_MM * 96 / 25.4`
produces a CSS pixel count that is ~2x too large on high-DPI laptops and ~1.5x
too small on low-DPI TVs.

The correct approach: probe the actual physical DPI using
[`matchMedia('(resolution: Ndpi)')`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/resolution).
This is how virtual ruler sites achieve real-world accuracy without device databases.
We binary-search the DPI from 40 to 600, fall back to `96 * devicePixelRatio`
if matchMedia is unavailable (headless/CI), and clamp to a sane range.

``` {.typescript file=_generated/app-core.ts}
     const PIANO_KEY_MM = 23;
     const MM_PER_INCH = 25.4;

     const detectPhysicalDPI = (): number => {
       if (typeof window.matchMedia !== 'function') {
         return Math.max(72, Math.min(300, 96 * window.devicePixelRatio));
       }
       let lo = 40, hi = 600;
       while (lo < hi) {
         const mid = Math.floor((lo + hi + 1) / 2);
         if (window.matchMedia(`(min-resolution: ${mid}dpi)`).matches) {
           lo = mid;
         } else {
           hi = mid - 1;
         }
       }
       return lo;
     };

     this.detectedDpi = detectPhysicalDPI();
     const savedDpiOverride = parseFloat(this.loadSetting('dpi', ''));
     const physicalDPI = (savedDpiOverride >= 40 && savedDpiOverride <= 600)
       ? savedDpiOverride
       : this.detectedDpi;
     if (physicalDPI !== this.detectedDpi) {
       this.visualizer?.setCssPxPerInch(physicalDPI);
     }
     const logicalDPI = physicalDPI / (window.devicePixelRatio || 1);
     const pianoKeyPx = PIANO_KEY_MM * logicalDPI / MM_PER_INCH;
```

The grid's cell width at zoom=1.0 comes from the lattice geometry — specifically the **half-vectors** `cellHv1` (wholetone direction) and `cellHv2` (octave direction). These change with the skew and shear sliders, so we measure them live:

``` {.typescript file=_generated/app-core.ts}
     if (!this.visualizer) throw new Error('visualizer must be initialized before zoom');
     const geometry = this.visualizer.getGridGeometry();
     const gridCellWidthPx =
       (Math.abs(geometry.cellHv1.x) + Math.abs(geometry.cellHv2.x)) * 2;

     const dpiBasedZoom = pianoKeyPx / gridCellWidthPx;
     this.defaultZoom = dpiBasedZoom;
     const savedZoom = this.loadSetting('zoom', this.defaultZoom.toString());
     if (this.zoomSlider) {
       this.zoomSlider.value = savedZoom;
       this.visualizer?.setZoom(parseFloat(savedZoom));
     }
     if (this.zoomSlider) {
       const zoomRef = this.zoomSlider;
       zoomRef.addEventListener('input', () => {
         const zoom = parseFloat(zoomRef.value);
         this.visualizer?.setZoom(zoom);
         this.updateGraffiti?.();
         this.saveSetting('zoom', zoomRef.value);
       });
     }
     const zoomReset = getElementOrNull('zoom-reset', HTMLButtonElement);
     zoomReset?.addEventListener('click', () => {
       if (this.zoomSlider) {
         this.zoomSlider.value = this.defaultZoom.toString();
         this.zoomSlider.dispatchEvent(new Event('input'));
       }
     });
```

The DPI override input lets users correct auto-detection on non-standard displays. When set, the value is persisted to localStorage and applied to the visualizer's `cssPxPerInch`, then the zoom reset target is recalculated so the physical key size stays accurate. The reset button clears the override and restores the auto-detected value.

``` {.typescript file=_generated/app-core.ts}
     const dpiOverride = getElementOrNull('dpi-override', HTMLInputElement);
     const dpiOverrideReset = getElementOrNull('dpi-override-reset', HTMLButtonElement);
     const savedDpiStr = this.loadSetting('dpi', '');
     if (dpiOverride && savedDpiStr !== '') {
       dpiOverride.value = savedDpiStr;
     }
     dpiOverride?.addEventListener('change', () => {
       if (!dpiOverride.value.trim()) {
         this.saveSetting('dpi', '');
         this.visualizer?.setCssPxPerInch(this.detectedDpi);
         if (this.zoomSlider) {
           this.zoomSlider.value = this.defaultZoom.toString();
           this.zoomSlider.dispatchEvent(new Event('input'));
         }
         return;
       }
       const dpiVal = parseFloat(dpiOverride.value);
       if (dpiVal >= 40 && dpiVal <= 600) {
         this.saveSetting('dpi', dpiOverride.value);
         this.visualizer?.setCssPxPerInch(dpiVal);
         if (this.zoomSlider) {
           this.zoomSlider.value = this.defaultZoom.toString();
           this.zoomSlider.dispatchEvent(new Event('input'));
         }
       }
     });
     dpiOverrideReset?.addEventListener('click', () => {
       if (dpiOverride) dpiOverride.value = '';
       this.saveSetting('dpi', '');
       this.visualizer?.setCssPxPerInch(this.detectedDpi);
       if (this.zoomSlider) {
         this.zoomSlider.value = this.defaultZoom.toString();
         this.zoomSlider.dispatchEvent(new Event('input'));
       }
     });
```

The QWERTY overlay toggle renders physical key labels (Q, W, E, R...) on the grid cells so players can see which keyboard key triggers which note. When the toggle is off, grid cells show only note names.

``` {.typescript file=_generated/app-core.ts}
    const qwertyToggle = getElementOrNull('qwerty-overlay-toggle', HTMLInputElement);
    if (qwertyToggle) {
      if (qwertyToggle.checked) {
        this.visualizer?.setQwertyLabels(this.buildKeyboardLabels());
        this.visualizer?.render();
      }
      qwertyToggle.addEventListener('change', () => {
        if (qwertyToggle.checked) {
          this.visualizer?.setQwertyLabels(this.buildKeyboardLabels());
        } else {
          this.visualizer?.setQwertyLabels(new Map());
        }
        this.visualizer?.render();
      });
    }


    window.addEventListener('blur', () => { this.stopAllNotes(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.stopAllNotes();
    });
```

Focus management prevents UI controls from capturing keyboard input after interaction. Selects, sliders, and checkboxes auto-blur on pointer-up so subsequent keypresses route to the synth instead of the control. Text inputs blur on Enter/Escape to return focus to the instrument.

``` {.typescript file=_generated/app-core.ts}
    document.querySelectorAll<HTMLElement>('select, input[type="range"], input[type="checkbox"]').forEach(el => {
      el.addEventListener('pointerup', () => setTimeout(() => { el.blur(); }, 0));
      el.addEventListener('change', () => setTimeout(() => { el.blur(); }, 0));
    });

    document.querySelectorAll<HTMLInputElement>('input[type="text"]').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          el.blur();
        }
      });
    });
```

The grid settings overlay is a SolidJS component mounted into `#grid-overlay-mount`.
`mountGridOverlay` wires the cog button toggle and returns a `setVisible` handle.
After mounting, the existing slider event listeners attach to the rendered DOM elements
as before, since all IDs are preserved.

``` {.typescript file=_generated/app-core.ts}

```

Sustain and vibrato pedals are modeled as `pedalMachine` actors (activate/deactivate state). Keyboard modifiers (Space/Shift) drive the actors directly; the on-screen pedal buttons are handled by the `PedalsPanel` SolidJS component mounted into `#pedals-mount`. The actors' subscriptions toggle CSS classes and synth behavior in lockstep.

``` {.typescript file=_generated/app-core.ts}
    this.sustainActor = createActor(pedalMachine);
    this.vibratoActor = createActor(pedalMachine);

    const pedalsMountEl = document.getElementById('pedals-mount');
    if (pedalsMountEl && this.sustainActor && this.vibratoActor) {
      mountPedals(pedalsMountEl, this.sustainActor, this.vibratoActor);
      this.bindMountedControls();
    }

    this.sustainActor.subscribe((snapshot) => {
      const active = snapshot.matches('active');
      this.sustainIndicator?.classList.toggle('active', active);
      this.synth.setSustain(active);
    });
    this.sustainActor.start();

    this.vibratoActor.subscribe((snapshot) => {
      const active = snapshot.matches('active');
      this.vibratoIndicator?.classList.toggle('active', active);
      this.synth.setVibrato(active);
    });
    this.vibratoActor.start();
```

The SolidJS SongBar component mounts into `#songbar-mount` and owns all song bar UI.
Callbacks delegate back into the app for calibration, game reset, max-keys persistence,
and search. The game actor (`gameMachine`) manages the Piano Tiles game lifecycle --
idle, loading, playing, complete, error. Its subscription drives all game UI updates:
target notes, progress bar, elapsed timer, and score overlay.

``` {.typescript file=_generated/app-core.ts}
    this.gameActor = createActor(gameMachine);
    this.gameActor.start();

```

The game actor subscription drives the entire Piano Tiles UI. On each state
transition, it updates target note highlighting, progress bar width, elapsed
timer, ghosting warnings, and the score overlay. The `playing` state disables
the tuning slider and calibrate button to prevent mid-game tuning changes.

``` {.typescript file=_generated/app-core.ts}
    this.gameActor.subscribe((snapshot) => {
      const state = String(snapshot.value);
      const ctx = snapshot.context;

      this.visualizer?.setGameState(state);
      if (state === 'playing') {
        this.visualizer?.setGameProgress(ctx.currentGroupIndex, ctx.noteGroups.length, Date.now() - ctx.startTimeMs);
      }

      const statusEl = document.querySelector<HTMLElement>('#game-status');
      const progressFill = document.querySelector<HTMLElement>('#game-progress-fill');
      const elapsedTimer = document.querySelector<HTMLElement>('#game-elapsed-timer');
      const songBarHint = document.getElementById('song-bar-hint');

      if (this.tuningSlider) this.tuningSlider.disabled = state === 'playing';

      const calibrateBtn = getElementOrNull('calibrate-btn', HTMLButtonElement);
      if (calibrateBtn) calibrateBtn.disabled = false;

      if (state === 'playing') {
        if (this.idleTimeout !== null) {
          clearTimeout(this.idleTimeout);
          this.idleTimeout = null;
        }
        this.setIdleState(false);

        const currentGroup = ctx.noteGroups[ctx.currentGroupIndex];
        if (currentGroup && this.visualizer) {
          let allTargetCellIds = this.visualizer.getCellIdsForMidiNotes(new Set(currentGroup.midiNotes));
          const calRange = this.calibratedRange;
          if (calRange && calRange.size > 0) {
            allTargetCellIds = allTargetCellIds.filter(id => calRange.has(id));
          }
          this.visualizer.setTargetNotes(allTargetCellIds);

          if (!this.ghostingWarningShown && allTargetCellIds.length > 3 && this.peakKeysThisSession > 0 && allTargetCellIds.length > this.peakKeysThisSession) {
            this.ghostingWarningShown = true;
            const hint = document.getElementById('song-bar-hint');
            if (hint) {
              hint.style.display = '';
              hint.style.opacity = '1';
              hint.textContent = `This chord needs ${allTargetCellIds.length} keys — your keyboard may limit to ${this.peakKeysThisSession}. Try a MIDI controller.`;
              setTimeout(() => { hint.style.opacity = '0'; }, 5000);
            }
          }

          const pressedMidis = new Set(ctx.pressedMidiNotes);
          if (pressedMidis.size > 0) {
            const pressedCellIds = this.visualizer.getCellIdsForMidiNotes(pressedMidis);
            this.visualizer.setPressedTargetNotes(pressedCellIds);
          } else {
            this.visualizer.setPressedTargetNotes([]);
          }
        } else {
          this.visualizer?.setTargetNotes(ctx.targetCellIds);
          this.visualizer?.setPressedTargetNotes([]);
        }
        const firstCellId = ctx.targetCellIds[0];
        if (firstCellId) {
          const parts = firstCellId.split('_');
          const x = parseInt(parts[0] ?? '0', 10);
          const y = parseInt(parts[1] ?? '0', 10);
          const midiNote = coordToMidiNote(x, y);
          this.historyVisualizer?.setGhostNote(midiNote);
        } else {
          this.historyVisualizer?.setGhostNote(null);
        }
        this.render();
        if (statusEl) statusEl.style.display = 'flex';
        if (songBarHint) songBarHint.style.display = 'none';

        if (progressFill && ctx.noteGroups.length > 0) {
          const pct = (ctx.currentGroupIndex / ctx.noteGroups.length) * 100;
          progressFill.style.width = `${pct}%`;
        }

        if (!this.gameElapsedInterval && ctx.startTimeMs > 0) {
          const startMs = ctx.startTimeMs;
          const updateTimer = (): void => {
            const el = document.getElementById('game-elapsed-timer');
            if (el) {
              const totalSec = Math.floor((Date.now() - startMs) / 1000);
              const minutes = Math.floor(totalSec / 60);
              const seconds = totalSec % 60;
              el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
          };
          updateTimer();
          this.gameElapsedInterval = setInterval(updateTimer, 1000);
        }
```

The remaining game states handle loading (show progress bar, hide hint), completion (show score overlay, stop timer), and idle/error (clear all game visuals, restore the song bar hint).

``` {.typescript file=_generated/app-core.ts}
      } else if (state === 'loading') {
        if (statusEl) statusEl.style.display = 'flex';
        if (songBarHint) songBarHint.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
        if (elapsedTimer) elapsedTimer.textContent = '';
      } else if (state === 'complete') {
        if (this.gameElapsedInterval !== null) {
          clearInterval(this.gameElapsedInterval);
          this.gameElapsedInterval = null;
        }
        this.visualizer?.setTargetNotes([]);
        this.visualizer?.setPressedTargetNotes([]);
        this.historyVisualizer?.setGhostNote(null);
        this.render();
        const elapsedMs = ctx.finishTimeMs - ctx.startTimeMs;
        const elapsedSec = (elapsedMs / 1000).toFixed(1);
        this.showGameScore(elapsedSec);
        if (statusEl) statusEl.style.display = 'flex';
        if (songBarHint) songBarHint.style.display = 'none';
        if (progressFill) progressFill.style.width = '100%';
        if (elapsedTimer) {
          const totalSec = Math.floor(parseFloat(elapsedSec));
          const minutes = Math.floor(totalSec / 60);
          const seconds = totalSec % 60;
          elapsedTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      } else {
        if (this.gameElapsedInterval !== null) {
          clearInterval(this.gameElapsedInterval);
          this.gameElapsedInterval = null;
        }
        this.visualizer?.setTargetNotes([]);
        this.visualizer?.setPressedTargetNotes([]);
        this.historyVisualizer?.setGhostNote(null);
        this.render();
        if (statusEl) statusEl.style.display = 'none';
        if (songBarHint) songBarHint.style.display = '';
        if (progressFill) progressFill.style.width = '0%';
        if (elapsedTimer) elapsedTimer.textContent = '';
      }
    });
```

Drag-and-drop MIDI file loading lets users drop a `.mid` file anywhere on the page. The song bar gets a visual `dropping` class during drag-over, and the file is parsed into note groups for the game engine on drop.

``` {.typescript file=_generated/app-core.ts}
    const songBar = document.getElementById('song-bar');
    document.body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      if (songBar) songBar.classList.add('dropping');
    });

    document.body.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!e.relatedTarget || !(e.relatedTarget instanceof Node) || !(document.documentElement.contains(e.relatedTarget))) {
        if (songBar) songBar.classList.remove('dropping');
      }
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (songBar) songBar.classList.remove('dropping');

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
        return;
      }

      const songTitle = file.name.replace(/\.(mid|midi)$/i, '');
      file.arrayBuffer().then((buffer) => {
        this.loadMidiFromBuffer(buffer, songTitle);
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to read file';
        const actor = this.gameActor;
        if (actor) actor.send({ type: 'LOAD_FAILED', error: msg });
      });
    });

    document.body.addEventListener('midi-file-upload', ((e: CustomEvent<File>) => {
      const file = e.detail;
      const songTitle = file.name.replace(/\.(mid|midi)$/i, '');
      file.arrayBuffer().then((buffer) => {
        this.loadMidiFromBuffer(buffer, songTitle);
      }).catch(() => { /* handled by game actor */ });
    }) as EventListener);
```

The MIDI search input queries multiple online MIDI repositories via `searchAllAdapters` with 300ms debounce. Results render as clickable rows that fetch and load the selected file directly into the game engine.

``` {.typescript file=_generated/app-core.ts}
    const searchInput = getElementOrNull('midi-search-input', HTMLInputElement);
    const resultsDiv = document.getElementById('midi-search-results');
    if (searchInput && resultsDiv) {
      let searchDebounce: ReturnType<typeof setTimeout> | null = null;
      searchInput.addEventListener('input', () => {
        if (searchDebounce !== null) clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => void (async () => {
          const query = searchInput.value.trim();
          if (query.length < 2) { resultsDiv.innerHTML = ''; resultsDiv.style.display = 'none'; return; }
          resultsDiv.style.display = 'block';
          resultsDiv.innerHTML = '<div class="search-status">Searching\u2026</div>';
          try {
            const { results, errors } = await searchAllAdapters(query);
            if (results.length === 0) {
              const errMsg = errors.length > 0 ? errors.join('; ') : 'no matches';
              resultsDiv.innerHTML = `<div class="search-status">No results — ${errMsg}</div>`;
              return;
            }
            resultsDiv.innerHTML = '';
            for (const r of results) {
              const row = document.createElement('div');
              row.className = 'search-result';
              row.dataset.fetchUrl = r.fetchUrl;

              const titleSpan = document.createElement('span');
              titleSpan.className = 'result-title';
              titleSpan.textContent = r.title;

              const sourceSpan = document.createElement('span');
              sourceSpan.className = 'result-source';
              sourceSpan.textContent = r.source;

              row.appendChild(titleSpan);
              row.appendChild(sourceSpan);

              row.addEventListener('click', () => {
                void this.handleSearchResultClick(r);
                resultsDiv.style.display = 'none';
                searchInput.value = '';
              });

              resultsDiv.appendChild(row);
            }
          } catch {
            resultsDiv.innerHTML = '<div class="search-status">Search failed</div>';
          }
        })(), 300);
      });
    }
```

``` {.typescript file=_generated/app-core.ts}
    document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(s => { this.updateSliderFill(s); });
  }
```

Keyboard input handling maps physical key codes to grid coordinates through the current layout's `keyMap`. Modifier keys are intercepted first: Shift triggers vibrato, Space triggers sustain, and arrow keys bend pitch (or produce vibrato when both are held simultaneously). Regular keys play notes by computing grid coordinates with octave and transpose offsets applied.

``` {.typescript file=_generated/app-core.ts}
  private handleKeyDown(event: KeyboardEvent): void {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'INPUT') {
      const t = target instanceof HTMLInputElement ? target.type : '';
      if (!t) return;
      if (t === 'text' || t === 'number') return;
    }

    const code = event.code;
    if (event.ctrlKey || event.metaKey) return;

    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      event.preventDefault();
      if (code === 'ArrowLeft') this.arrowLeftHeld = true;
      if (code === 'ArrowRight') this.arrowRightHeld = true;
      if (this.arrowLeftHeld && this.arrowRightHeld) {
        this.startArrowVibrato();
      } else {
        this.stopArrowVibrato();
        const bendSemitones = code === 'ArrowLeft' ? -1 : 1;
        for (const [noteCode, noteData] of this.activeNotes) {
          const cx = noteData.coordX + this.transposeOffset;
          const cy = noteData.coordY + this.octaveOffset;
          const noteId = `key_${noteCode}_${cx}_${cy}`;
          this.synth.setPitchBend(noteId, bendSemitones);
        }
      }
      return;
    }

    const isSynthKey =
      code === 'ShiftLeft' || code === 'ShiftRight' ||
      code === 'Space' ||
      code in this.currentLayout.keyMap;

    if (!isSynthKey) return;

    event.preventDefault();

    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);

    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.vibratoActor?.send({ type: 'ACTIVATE' });
      this.synth.tryUnlock();
      if (!this.synth.isInitialized()) return;
      this.startMpeVibrato();
      return;
    }
    if (code === 'Space') {
      this.sustainActor?.send({ type: 'ACTIVATE' });
      this.synth.tryUnlock();
      if (!this.synth.isInitialized()) return;
      return;
    }
    this.synth.tryUnlock();                  // synchronous, iOS-safe

    if (!(code in this.currentLayout.keyMap)) return;
    const coord = this.currentLayout.keyMap[code];

    const [coordX, coordY] = coord;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    const midiNote = coordToMidiNote(effectiveCoordX, effectiveCoordY);
    if (this.calibrating) {
      this.calibratedCells.add(`${effectiveCoordX}_${effectiveCoordY}`);
      this.visualizer?.setCalibratedRange(new Set(this.calibratedCells));
    }
    this.activeNotes.set(code, { coordX, coordY });
    this.peakKeysThisSession = Math.max(this.peakKeysThisSession, this.activeNotes.size);
    this.trackNoteOn(effectiveCoordX, effectiveCoordY, midiNote);
    if (this.gameActor?.getSnapshot().matches('playing')) {
      this.gameActor.send({ type: 'NOTE_PRESSED', cellId: `${effectiveCoordX}_${effectiveCoordY}`, midiNote });
    }
    this.render();
    if (this.synth.isInitialized()) {
      this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset);
      this.mpe.noteOn(audioNoteId, midiNote, 0.7);
    }
  }
```

Key-up mirrors key-down: arrow releases clear pitch bend (or switch from vibrato back to single-direction bend), Shift/Space deactivate their respective pedal actors, and note keys stop the corresponding synth voice and update the history visualizer.

``` {.typescript file=_generated/app-core.ts}
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);

    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      if (code === 'ArrowLeft') this.arrowLeftHeld = false;
      if (code === 'ArrowRight') this.arrowRightHeld = false;
      this.stopArrowVibrato();
      if (this.arrowLeftHeld || this.arrowRightHeld) {
        const bendSemitones = this.arrowLeftHeld ? -1 : 1;
        for (const [noteCode, noteData] of this.activeNotes) {
          const cx = noteData.coordX + this.transposeOffset;
          const cy = noteData.coordY + this.octaveOffset;
          const noteId = `key_${noteCode}_${cx}_${cy}`;
          this.synth.setPitchBend(noteId, bendSemitones);
        }
      } else {
        for (const [noteCode, noteData] of this.activeNotes) {
          const cx = noteData.coordX + this.transposeOffset;
          const cy = noteData.coordY + this.octaveOffset;
          const noteId = `key_${noteCode}_${cx}_${cy}`;
          this.synth.setPitchBend(noteId, 0);
        }
      }
      return;
    }

    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.vibratoActor?.send({ type: 'DEACTIVATE' });
      this.stopMpeVibrato();
      return;
    }
    if (code === 'Space') {
      this.sustainActor?.send({ type: 'DEACTIVATE' });
      return;
    }

    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    const midiNote = coordToMidiNote(effectiveCoordX, effectiveCoordY);
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(code);
    this.trackNoteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }
```

Pointer input (touch and mouse) uses the Pointer Events API for unified handling. Pointer-down starts a note, pointer-move slides between cells (stopping the old note and starting the new one), and pointer-up releases. For MPE-enabled sessions, pointer-move also tracks pressure, pitch bend (vertical displacement within a cell), and slide/timbre (horizontal displacement).

``` {.typescript file=_generated/app-core.ts}
  private handlePointerDown(event: PointerEvent): void {
    this.pointerDown.set(event.pointerId, null);
    this.synth.tryUnlock();
    this.handlePointerDownInner(event);
  }

  private handlePointerDownInner(event: PointerEvent): void {
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* iOS Safari */ }
    const button = this.getButtonAtPointer(event);
    if (button) this.playPointerNote(event.pointerId, button.coordX, button.coordY, event.pressure);
    this.pointerDown.set(event.pointerId, button);
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.pointerDown.has(event.pointerId)) return;
    const currentButton = this.pointerDown.get(event.pointerId);
    if (!currentButton) return;
    const newButton = this.getButtonAtPointer(event);
    const currentId = `${currentButton.coordX}_${currentButton.coordY}`;
    const newId = newButton ? `${newButton.coordX}_${newButton.coordY}` : null;

    if (currentId !== newId) {
      this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
      if (newButton) this.playPointerNote(event.pointerId, newButton.coordX, newButton.coordY, event.pressure);
      this.pointerDown.set(event.pointerId, newButton);
    } else if (!this.mpe.isEnabled()) {
      const now = performance.now();
      let wg = this.pointerWiggle.get(event.pointerId);
      if (!wg) {
        wg = { xs: [event.clientX], times: [now], lastDir: 0, changes: 0 };
        this.pointerWiggle.set(event.pointerId, wg);
      } else {
        const prevX = wg.xs[wg.xs.length - 1];
        const dx = event.clientX - prevX;
        wg.xs.push(event.clientX);
        wg.times.push(now);
        while (wg.times.length > 1 && now - wg.times[0] > 500) {
          wg.times.shift();
          wg.xs.shift();
          wg.changes = Math.max(0, wg.changes - 1);
        }
        if (Math.abs(dx) > 3) {
          const dir = dx > 0 ? 1 : -1;
          if (wg.lastDir !== 0 && dir !== wg.lastDir) wg.changes++;
          wg.lastDir = dir;
        }
      }
      const wiggling = wg.changes >= 3;
      if (wiggling && !this.synth.getVibrato()) {
        this.synth.setVibrato(true);
      } else if (!wiggling && this.synth.getVibrato() && !this.arrowLeftHeld && !this.arrowRightHeld) {
        this.synth.setVibrato(false);
      }
    } else if (this.mpe.isEnabled()) {
      const effectiveCoordX = currentButton.coordX + this.transposeOffset;
      const effectiveCoordY = currentButton.coordY + this.octaveOffset;
      const noteId = `ptr_${event.pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
      this.mpe.sendPressure(noteId, event.pressure);
      if (this.visualizer) {
        const { cellHv1, cellHv2 } = this.visualizer.getGridGeometry();
        const buttons = this.visualizer.getButtons();
        const btn = buttons.find(b => b.coordX === currentButton.coordX && b.coordY === currentButton.coordY);
        if (btn) {
          const rect = this.getCanvasRect();
          const dx = (event.clientX - rect.left) - btn.x;
          const dy = (event.clientY - rect.top) - btn.y;

          const pitchDirLen = Math.sqrt(cellHv2.x * cellHv2.x + cellHv2.y * cellHv2.y);
          const pitchOffset = (dx * cellHv2.x + dy * cellHv2.y) / pitchDirLen;
          const cellHeight = pitchDirLen * 2; // cellHv2 is a half-vector
          const semitones = -pitchOffset / cellHeight * 2;

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
    const currentButton = this.pointerDown.get(event.pointerId);
    if (currentButton) this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
    this.pointerDown.delete(event.pointerId);
    if (this.pointerWiggle.has(event.pointerId)) {
      this.pointerWiggle.delete(event.pointerId);
      if (this.pointerWiggle.size === 0 && this.synth.getVibrato() && !this.arrowLeftHeld && !this.arrowRightHeld) {
        this.synth.setVibrato(false);
      }
    }
    try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* iOS Safari */ }
  }

  private getButtonAtPointer(event: PointerEvent): { coordX: number; coordY: number } | null {
    if (!this.visualizer) return null;
    const rect = this.getCanvasRect();
    return this.visualizer.getButtonAtPoint(event.clientX - rect.left, event.clientY - rect.top);
  }
```

`playPointerNote` and `stopPointerNote` are the pointer equivalents of the keyboard note-on/off path. They apply the same octave and transpose offsets, feed the same synth and MPE pipelines, and participate in calibration mode and game hit detection identically to keyboard input.

``` {.typescript file=_generated/app-core.ts}
  private playPointerNote(pointerId: number, coordX: number, coordY: number, pressure = 0.7): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    if (this.calibrating) {
      this.calibratedCells.add(`${effectiveCoordX}_${effectiveCoordY}`);
      this.visualizer?.setCalibratedRange(new Set(this.calibratedCells));
    }
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset);
    const midiNote = coordToMidiNote(effectiveCoordX, effectiveCoordY);
    this.mpe.noteOn(audioNoteId, midiNote, Math.max(0.01, pressure));
    this.activeNotes.set(`ptr_${pointerId}`, { coordX, coordY });
    this.trackNoteOn(effectiveCoordX, effectiveCoordY, midiNote);
    if (this.gameActor?.getSnapshot().matches('playing')) {
      this.gameActor.send({ type: 'NOTE_PRESSED', cellId: `${effectiveCoordX}_${effectiveCoordY}`, midiNote });
    }
    this.render();
  }

  private stopPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${effectiveCoordY}`;
    const midiNote = coordToMidiNote(effectiveCoordX, effectiveCoordY);
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(`ptr_${pointerId}`);
    this.trackNoteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }
```

Note tracking uses reference counting (`noteHoldCounts`) because multiple input sources can play the same grid cell simultaneously -- e.g. a MIDI controller and a keyboard key both hitting the same note. The history visualizer only gets a note-on when the count goes from 0 to 1, and a note-off when it returns to 0.

``` {.typescript file=_generated/app-core.ts}
  private trackNoteOn(coordX: number, coordY: number, midiNote: number): void {
    const key = `${coordX},${coordY}`;
    const count = this.noteHoldCounts.get(key) ?? 0;
    if (count === 0) {
      this.historyVisualizer?.noteOn(coordX, coordY, midiNote);
    }
    this.noteHoldCounts.set(key, count + 1);
    this.resetIdleTimer();
  }

  private trackNoteOff(coordX: number, coordY: number): void {
    const key = `${coordX},${coordY}`;
    const count = this.noteHoldCounts.get(key) ?? 0;
    if (count <= 1) {
      this.noteHoldCounts.delete(key);
      this.historyVisualizer?.noteOff(coordX, coordY);
    } else {
      this.noteHoldCounts.set(key, count - 1);
    }
  }

  public stopAllNotes(): void {
    this.sustainActor?.send({ type: 'DEACTIVATE' });
    this.vibratoActor?.send({ type: 'DEACTIVATE' });
    this.stopMpeVibrato();
    this.synth.stopAll();
    this.mpe.panic();
    this.historyVisualizer?.clearAll();
    this.activeNotes.clear();
    this.noteHoldCounts.clear();
    this.keyRepeat.clear();
    this.pointerDown.clear();
    this.midiChannelVoice.clear();
    this.render();
  }
```

The idle timer controls the visibility of decorative elements (chord graffiti, song bar hint) that should fade out during active playing and reappear after 10 seconds of silence. During an active game session, the idle timer is suppressed entirely.

``` {.typescript file=_generated/app-core.ts}
  private resetIdleTimer(): void {
    const gameState = this.gameActor ? String(this.gameActor.getSnapshot().value) : undefined;
    if (gameState === 'playing') return;

    if (this.idleTimeout !== null) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    if (this.isIdle) {
      this.setIdleState(false);
    }

    this.idleTimeout = setTimeout(() => {
      this.idleTimeout = null;
      const gs = this.gameActor ? String(this.gameActor.getSnapshot().value) : undefined;
      if (gs !== 'playing') {
        this.setIdleState(true);
      }
    }, 10000);
  }

  private setIdleState(idle: boolean): void {
    this.isIdle = idle;

    const graffitiEl = document.querySelector<SVGElement>('.graffiti-overlay');
    if (graffitiEl) graffitiEl.style.opacity = idle ? '1' : '0';

    const songBarHint = document.getElementById('song-bar-hint');
    if (songBarHint) songBarHint.style.opacity = idle ? '1' : '0';

    this.historyVisualizer?.setIdleState(idle);
  }
```

Search result click handling fetches the MIDI file from the remote URL and pipes it into the same `loadMidiFromBuffer` path used by drag-and-drop. The results div shows a loading indicator during the fetch.

``` {.typescript file=_generated/app-core.ts}
  private async handleSearchResultClick(result: MidiSearchResult): Promise<void> {
    const resultsDiv = document.getElementById('midi-search-results');
    if (resultsDiv) resultsDiv.innerHTML = '<div class="search-status">Loading\u2026</div>';
    try {
      const response = await fetch(result.fetchUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      this.loadMidiFromBuffer(buffer, result.title);
      if (resultsDiv) resultsDiv.innerHTML = '';
    } catch (err) {
      if (resultsDiv) resultsDiv.innerHTML = '<div class="search-status">Load failed</div>';
      const actor = this.gameActor;
      if (actor) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch MIDI';
        actor.send({ type: 'LOAD_FAILED', error: msg });
      }
    }
  }
```

MIDI buffer loading is the shared entry point for both drag-and-drop files and search results. It parses the raw MIDI bytes, applies quantization, computes optimal transposition to fit the calibrated range, adjusts the D-ref frequency to center the song's median pitch, and forces 12-TET tuning (since standard MIDI files assume equal temperament).

``` {.typescript file=_generated/app-core.ts}
  private loadMidiFromBuffer(buffer: ArrayBuffer, songTitle: string): void {
    const actor = this.gameActor;
    if (!actor) return;

    const titleEl = document.querySelector<HTMLElement>('#game-song-title');
    if (titleEl) {
      titleEl.textContent = songTitle;
    }

    const badgeEl = document.querySelector<HTMLElement>('#game-quantization-badge');
    const levelBtn = getElementOrNull('quantization-level', HTMLButtonElement);
    const rawLevel = levelBtn?.value ?? 'none';
    const level: QuantizationLevel = rawLevel === '1/4' || rawLevel === '1/8' || rawLevel === '1/16' ? rawLevel : 'none';
    if (badgeEl) {
      badgeEl.textContent = level === 'none' ? '' : `Q:${level}`;
    }

    actor.send({ type: 'FILE_DROPPED', file: new File([], `${songTitle}.mid`) });

    try {
      const { events, tempoMap, timeSigMap } = parseMidi(buffer);
      const quantizedEvents = quantizeNotes(events, tempoMap, timeSigMap, level);

      const medianMidi = computeMedianMidiNote(quantizedEvents);

      let groups = buildNoteGroups(quantizedEvents, this.maxSimultaneousKeys);

      const range = this.calibratedRange;
      let semitones = 0;
      if (range && range.size > 0) {
        semitones = findOptimalTransposition(groups, range);
        groups = transposeSong(groups, semitones);
        groups = foldOctaves(groups, range);
      }

      const adjustedMedianMidi = medianMidi + semitones;
      const adjustedMedianHz = 440 * Math.pow(2, (adjustedMedianMidi - 69) / 12);
      const dRefSlider = getElementOrNull('d-ref-slider', HTMLInputElement);
      if (dRefSlider) {
        const dMin = parseFloat(dRefSlider.min);
        const dMax = parseFloat(dRefSlider.max);
        dRefSlider.value = Math.max(dMin, Math.min(dMax, adjustedMedianHz)).toFixed(2);
        dRefSlider.dispatchEvent(new Event('input'));
      }

      if (groups.length === 0) {
        actor.send({ type: 'LOAD_FAILED', error: 'No playable notes found in MIDI file' });
        return;
      }

      const currentTuning = parseFloat(this.tuningSlider?.value ?? '700');
      const needsTuningWarning = Math.abs(currentTuning - 700) > 0.5;
      if (this.tuningSlider) {
        this.tuningSlider.value = '700';
        this.tuningSlider.dispatchEvent(new Event('input'));
      }
      actor.send({ type: 'SONG_LOADED', noteGroups: groups });
      if (needsTuningWarning) {
        this.showTuningWarning();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse MIDI file';
      actor.send({ type: 'LOAD_FAILED', error: msg });
    }
  }
```

Game UI overlays are created programmatically rather than in HTML because they appear only transiently. The score overlay shows completion time with a "Play again" button, the tuning warning auto-dismisses after 3 seconds, and the ghosting toast warns keyboard users when a chord requires more simultaneous keys than their keyboard can register.

``` {.typescript file=_generated/app-core.ts}
  private showGameScore(elapsedSec: string): void {
    const existing = document.getElementById('game-score-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'game-score-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"JetBrains Mono",monospace;color:#fff;';

    const heading = document.createElement('div');
    heading.style.cssText = 'font-size:48px;font-weight:700;margin-bottom:16px;';
    heading.textContent = 'Complete!';

    const time = document.createElement('div');
    time.style.cssText = 'font-size:24px;color:#888;margin-bottom:32px;';
    time.textContent = `${elapsedSec}s`;

    const btn = document.createElement('button');
    btn.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:14px;color:#fff;background:#000;border:1px solid #333;padding:12px 24px;cursor:pointer;';
    btn.textContent = 'Play again';
    btn.addEventListener('click', () => {
      overlay.remove();
      this.gameActor?.send({ type: 'GAME_RESET' });
    });

    overlay.appendChild(heading);
    overlay.appendChild(time);
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
  }

  private showTuningWarning(): void {
    const existing = document.getElementById('game-tuning-warning');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'game-tuning-warning';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:50;background:#000;color:#fff;font-family:"JetBrains Mono",monospace;font-size:12px;padding:8px 16px;text-align:center;border-bottom:1px solid #333;cursor:pointer;';
    banner.textContent = 'Tuning set to 12-TET for game mode';

     const dismiss = (): void => { banner.remove(); };
     banner.addEventListener('click', dismiss);
     setTimeout(dismiss, 3000);

     document.body.appendChild(banner);
   }

```

MPE vibrato uses `requestAnimationFrame` to oscillate pitch bend at approximately 5Hz across all active notes. Arrow-key vibrato uses `setInterval` instead because it runs at a fixed tick rate independent of frame rendering. Both systems track phase to produce smooth sinusoidal bends.

``` {.typescript file=_generated/app-core.ts}
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

  private startMpeVibrato(): void {
    if (!this.mpe.isEnabled() || this.vibratoRAF !== null) return;
    this.vibratoPhase = 0;
    const tick = (): void => {
      this.vibratoPhase += 0.314; // ≈5Hz at 60fps
      const bend = Math.sin(this.vibratoPhase) * 0.5; // ±0.5 semitones
      for (const noteId of this.getMpeNoteIds()) {
        this.mpe.sendPitchBend(noteId, bend);
      }
      this.vibratoRAF = requestAnimationFrame(tick);
    };
    this.vibratoRAF = requestAnimationFrame(tick);
  }

  private stopMpeVibrato(): void {
    if (this.vibratoRAF !== null) {
      cancelAnimationFrame(this.vibratoRAF);
      this.vibratoRAF = null;
    }
    for (const noteId of this.getMpeNoteIds()) {
      this.mpe.sendPitchBend(noteId, 0);
    }
    this.vibratoPhase = 0;
  }

  private startArrowVibrato(): void {
    if (this.arrowVibratoInterval !== null) return;
    this.arrowVibratoPhase = 0;
    this.arrowVibratoInterval = setInterval(() => {
      this.arrowVibratoPhase += 0.52; // ~5Hz at 60 ticks/s
      const bend = Math.sin(this.arrowVibratoPhase);
      for (const [noteCode, noteData] of this.activeNotes) {
        const cx = noteData.coordX + this.transposeOffset;
        const cy = noteData.coordY + this.octaveOffset;
        const noteId = `key_${noteCode}_${cx}_${cy}`;
        this.synth.setPitchBend(noteId, bend);
      }
    }, 16);
  }

  private stopArrowVibrato(): void {
    if (this.arrowVibratoInterval !== null) {
      clearInterval(this.arrowVibratoInterval);
      this.arrowVibratoInterval = null;
    }
    this.arrowVibratoPhase = 0;
  }
```

`populateSliderPresets` generates the tick marks and clickable preset buttons beneath each slider. Presets are positioned proportionally along the slider track and get `active`/`preset-below`/`preset-above` classes for visual feedback relative to the current slider value.

``` {.typescript file=_generated/app-core.ts}
  private populateSliderPresets(
    containerId: string,
    slider: HTMLInputElement,
    presets: { value: number; label: string; description: string }[],
  ): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const sliderMin = parseFloat(slider.min);
    const sliderMax = parseFloat(slider.max);
    const range = sliderMax - sliderMin;
    const alternate = container.hasAttribute('data-alternate-ticks');
    const sorted = [...presets].sort((a, b) => a.value - b.value);

    sorted.forEach((preset, i) => {
      const ratio = (preset.value - sliderMin) / range;
      if (ratio < 0 || ratio > 1) return;
      const mark = document.createElement('div');
      mark.className = 'slider-preset-mark';
      mark.style.left = `calc(${ratio.toFixed(6)} * (100% - 3px) + 1.5px)`;

      const tick = document.createElement('div');
      const tickClass = alternate && i % 2 === 1 ? 'slider-tick-staggered' : 'slider-tick-long';
      tick.className = `slider-tick ${tickClass}`;

      const btn = document.createElement('button');
      btn.className = 'slider-preset-btn';
      btn.dataset.value = preset.value.toString();
      btn.textContent = preset.label;
      btn.dataset.description = preset.description;
      btn.addEventListener('click', () => {
        slider.value = preset.value.toString();
        slider.dispatchEvent(new Event('input'));
      });

      mark.appendChild(tick);
      mark.appendChild(btn);
      container.appendChild(mark);
    });

    const updateActive = (): void => {
      const val = parseFloat(slider.value);
      container.querySelectorAll<HTMLElement>('.slider-preset-mark').forEach(mark => {
        const btn = mark.querySelector<HTMLElement>('.slider-preset-btn');
        if (!btn) return;
        const pVal = parseFloat(btn.dataset.value ?? '');
        const isActive = Math.abs(val - pVal) < 0.05;
        btn.classList.toggle('active', isActive);
        mark.classList.toggle('active', isActive);
        mark.classList.toggle('preset-below', !isActive && pVal < val);
        mark.classList.toggle('preset-above', !isActive && pVal > val);
      });
    };
    slider.addEventListener('input', updateActive);
    updateActive();

  }

  private updateSliderFill(slider: HTMLInputElement): void {
    applySliderFill(slider);
  }
```

The render method is throttled to one repaint per animation frame via `renderScheduled`. It computes which grid cells are active by projecting note coordinates through the current fifth-size tuning, then hands the set to the visualizer. This projection is necessary because in non-12-TET tunings, the same pitch can map to different grid positions.

``` {.typescript file=_generated/app-core.ts}
  private render(): void {
    if (!this.visualizer) return;
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      if (!this.visualizer) return;
      const fifth = this.synth.getFifth();
      const activePitchCents = new Set(
        Array.from(this.activeNotes.values()).map(({ coordX, coordY }) =>
          Math.round(coordX * fifth + coordY * 1200)
        )
      );
      const activeNoteIds = this.visualizer.getCellIdsForPitchCents(activePitchCents, fifth);
      const sourceIds = Array.from(this.activeNotes.values()).map(({ coordX, coordY }) => `${coordX}_${coordY}`);
      this.visualizer.setActiveNotes(activeNoteIds, sourceIds);
      this.visualizer.render();
    });
  }

  private getCanvasRect(): DOMRect {
    this.cachedCanvasRect = this.canvas.getBoundingClientRect();
    return this.cachedCanvasRect;
  }
```

Calibration mode shows a banner instructing the user to play all reachable notes on their controller. Each note-on (from any input source) adds the cell to the calibrated set, which is persisted to localStorage. The game engine later uses this range to transpose songs and crop notes that fall outside the player's physical reach.

``` {.typescript file=_generated/app-core.ts}
  private enterCalibrationMode(): void {
    this.calibrating = true;
    this.calibratedCells = new Set();
    this.visualizer?.setCalibratedRange(new Set<string>());
    const banner = document.getElementById('calibration-banner');
    const msg = document.getElementById('calibration-msg');
    const warning = document.getElementById('calibration-warning');
    if (banner) banner.style.display = 'flex';
    if (msg) msg.textContent = 'Play reachable notes';
    const gameState = this.gameActor ? String(this.gameActor.getSnapshot().value) : undefined;
    if (gameState === 'playing' || gameState === 'loading') {
      this.gameActor?.send({ type: 'GAME_RESET' });
    }
    if (warning && (gameState === 'playing' || gameState === 'loading' || gameState === 'complete')) {
      warning.style.display = '';
      warning.textContent = 'Song stopped — calibration changes the playable range';
    } else if (warning) {
      warning.style.display = 'none';
    }
    const btn = document.getElementById('calibrate-btn');
    if (btn) btn.style.display = 'none';
    this.render();
  }

  private exitCalibrationMode(confirm: boolean): void {
    this.calibrating = false;
    if (confirm) {
      if (this.calibratedCells.size === 0) {
        clearCalibratedRange();
        this.calibratedRange = null;
      } else {
        saveCalibratedRange(this.calibratedCells);
        this.calibratedRange = new Set(this.calibratedCells);
      }
      const count = this.calibratedCells.size;
      const msg = document.getElementById('calibration-msg');
      if (msg) {
        msg.textContent = count > 0 ? `Range saved (${count} keys)` : 'Range cleared';
        setTimeout(() => { msg.textContent = 'Play reachable notes'; }, 2000);
      }
    }
    this.visualizer?.setCalibratedRange(this.calibratedRange);
    this.calibratedCells = new Set();
    const banner = document.getElementById('calibration-banner');
    if (banner) banner.style.display = 'none';
    const btn = document.getElementById('calibrate-btn');
    if (btn) {
      btn.textContent = 'Calibrate Playable Area';
      btn.style.display = '';
    }
    this.render();
  }
```

`buildKeyboardLabels` maps each physical key code in the current layout to its printable label (e.g. `KeyQ` becomes `Q`). The resulting map is keyed by grid cell ID (`coordX_coordY`) so the visualizer can render the label on the correct cell.

``` {.typescript file=_generated/app-core.ts}
  private labelLayout: LabelLayout = 'qwerty';

  private buildKeyboardLabels(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [code, coord] of Object.entries(this.currentLayout.keyMap)) {
      const label = codeToLabel(code, this.labelLayout);
      if (label) {
        map.set(`${coord[0]}_${coord[1]}`, label);
      }
    }
    return map;
  }
}
```
