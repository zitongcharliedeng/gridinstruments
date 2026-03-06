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
import { midiToCoord, coordToMidiNote } from './lib/note-colors';
import { createChordGraffiti } from './lib/chord-graffiti';
import { appMachine } from './machines/appMachine';
import { overlayMachine } from './machines/overlayMachine';
import { waveformMachine } from './machines/waveformMachine';
import { pedalMachine } from './machines/pedalMachines';
import { panelMachine, clampPanelHeight } from './machines/panelMachine';
import { midiPanelMachine } from './machines/midiPanelMachine';
import { mpeMachine } from './machines/mpeMachine';
import { dialogMachine } from './machines/dialogMachine';
import { createActor } from 'xstate';
import readmeText from '../README.md?raw';
// Type guard for WaveformType
/** Converts a restricted subset of Markdown to HTML for the About dialog. */
function renderMarkdown(md: string): string {
  // Drop H1 title, image/badge lines, and the ## Development section
  const withoutDev = md
    .replace(/^# .+\n/m, '')                          // remove H1 title
    .replace(/^\[?!\[.*$/gm, '')                      // remove image/badge lines (![...] and [![...])
    .split(/^## Development$/m)[0];                    // cut at Development section

  return withoutDev
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Tables — before inline formatting (avoid pipe/bracket confusion)
    .replace(/^\|(.+)\|$/gm, (_: string, row: string) =>
      '<tr>' + row.split('|').map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>')
    .replace(/<tr>(<td>[-:\s]+<\/td>)+<\/tr>\n?/g, '')  // remove separator rows
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    // Inline formatting
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)(?!\n<li>)/g, '$1</ul>')
    .replace(/<li>/g, (m: string, offset: number, str: string) => str.lastIndexOf('<li>', offset) < str.lastIndexOf('</ul>', offset) ? '<ul><li>' : m)
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function isWaveformType(value: unknown): value is WaveformType {
  return typeof value === 'string' && ['sine', 'square', 'sawtooth', 'triangle'].includes(value);
}

interface SliderPresetPoint { value: number; label: string }

const SKEW_PRESETS: SliderPresetPoint[] = [
  { value: 0, label: 'DCompose' },
  { value: 1, label: 'MidiMech' },
];

const SHEAR_PRESETS: SliderPresetPoint[] = [
  { value: 0, label: 'DCompose' },
  { value: 1, label: 'Wicki-Hayden' },
];

const TUNING_LABEL_PRESETS: SliderPresetPoint[] = TUNING_MARKERS.map(m => ({ value: m.fifth, label: m.name }));

function formatSliderAnnotation(
  value: number,
  presets: SliderPresetPoint[],
  precision: number,
  unit: string = '',
): string {
  let nearest = presets[0];
  let minDist = Math.abs(value - nearest.value);
  for (const p of presets) {
    const d = Math.abs(value - p.value);
    if (d < minDist) { minDist = d; nearest = p; }
  }
  // Threshold = half the last displayed digit (e.g. precision=2 → 0.005)
  const threshold = 0.5 * Math.pow(10, -precision);
  if (minDist < threshold) return nearest.label;
  const offset = value - nearest.value;
  const rounded = parseFloat(Math.abs(offset).toFixed(precision));
  const sign = offset > 0 ? '+' : '\u2212';
  return `${nearest.label} ${sign}${rounded.toFixed(precision)}${unit}`;
}

const tuningTableRows = TUNING_MARKERS
  .slice().sort((a, b) => a.fifth - b.fifth)
  .map(m => `<tr><td><strong>${m.fifth % 1 === 0 ? m.fifth : '~' + m.fifth}¢</strong></td><td>${m.description}</td></tr>`)
  .join('\n');

const SLIDER_INFO: Record<string, string> = {
  tuning: `
<h2>Fifths Tuning</h2>
<p>Sets the size of the <strong>perfect fifth</strong> generator in <a href="https://en.wikipedia.org/wiki/Cent_(music)" target="_blank" rel="noopener">cents</a>. This single parameter determines the entire tuning system.</p>
<table>
${tuningTableRows}
</table>
<p>The notch marks below the slider show where <a href="https://en.wikipedia.org/wiki/Equal_temperament" target="_blank" rel="noopener">equal temperaments</a> and named temperaments fall. Click a marker to snap to it.</p>
<h3>Why the Fifth?</h3>
<p>The <a href="https://en.wikipedia.org/wiki/Isomorphic_keyboard" target="_blank" rel="noopener">isomorphic keyboard</a> grid is generated by two intervals: the <strong>fifth</strong> and the <strong>octave</strong> (fixed at 1200¢). Changing the fifth size changes how all other intervals stack — it's the single degree of freedom in <a href="https://en.wikipedia.org/wiki/Regular_temperament" target="_blank" rel="noopener">rank-2 regular temperament</a>.</p>
<h3>References</h3>
<ul>
<li><a href="https://en.wikipedia.org/wiki/Equal_temperament" target="_blank" rel="noopener">Equal temperament</a> — Wikipedia</li>
<li><a href="https://en.wikipedia.org/wiki/Regular_temperament" target="_blank" rel="noopener">Regular temperament</a> — Wikipedia</li>
<li><a href="https://en.xen.wiki/w/Gallery_of_EDO_visualizations" target="_blank" rel="noopener">EDO Visualizations</a> — Xenharmonic Wiki</li>
</ul>`,

  skew: `
<h2>Mech Skew</h2>
<p>Continuously interpolates the lattice basis vectors between two named keyboard layouts:</p>
<table>
<tr><td><strong>0</strong></td><td><strong>DCompose / Wicki-Hayden</strong> — diagonal parallelogram grid at the Striso angle</td></tr>
<tr><td><strong>1</strong></td><td><strong>MidiMech</strong> — orthogonal rectangular grid</td></tr>
</table>
<p>Values beyond [0, 1] extrapolate past these endpoints. The grid never degenerates — the lattice cell determinant remains non-zero across all practical values.</p>
<h3>What Is This?</h3>
<p>Every <a href="https://en.wikipedia.org/wiki/Isomorphic_keyboard" target="_blank" rel="noopener">isomorphic keyboard</a> maps the same pitch lattice (generated by the <strong>perfect fifth</strong> and <strong>octave</strong>) to different screen geometries. The skew parameter traces a linear path through the space of 2×2 basis matrices — <a href="https://en.wikipedia.org/wiki/General_linear_group" target="_blank" rel="noopener">GL(2,ℝ)</a>.</p>
<p>This is <em>not</em> a rotation — it's an affine interpolation. The parameter space is fundamentally unbounded (no cyclic wrap-around). Both endpoints are simply named landmarks in an infinite field.</p>
<h3>References</h3>
<ul>
<li><a href="https://github.com/flipcoder/midimech" target="_blank" rel="noopener">MidiMech</a> by flipcoder — isomorphic layout visualizer</li>
<li><a href="https://www.striso.org/the-note-layout/" target="_blank" rel="noopener">Striso board</a> by Piers Titus van der Torren — physical isomorphic instrument</li>
<li><a href="https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout" target="_blank" rel="noopener">Wicki-Hayden note layout</a> — Wikipedia</li>
</ul>`,

  shear: `
<h2>Wicked Shear</h2>
<p>A pure <a href="https://en.wikipedia.org/wiki/Shear_mapping" target="_blank" rel="noopener">shear mapping</a> that flattens the lattice rows toward horizontal:</p>
<table>
<tr><td><strong>0</strong></td><td><strong>DCompose</strong> — rows follow the natural lattice angle</td></tr>
<tr><td><strong>1</strong></td><td><strong>Wicki-Hayden</strong> — rows become horizontal (wholetone direction flattened)</td></tr>
</table>
<p>This is the same shear mapping described in the <a href="https://en.wikipedia.org/wiki/Harmonic_table_note_layout" target="_blank" rel="noopener">Harmonic Table</a> Wikipedia article: <em>"The two pitch arrays are trivially obtained from each other by direct shear mapping."</em></p>
<h3>Mathematical Properties</h3>
<ul>
<li><strong>Area-preserving</strong> — the cell determinant is independent of the shear parameter at DCompose</li>
<li><strong>Group structure</strong> — shear transformations form the additive group (ℝ, +), unbounded with no periodicity</li>
<li><strong>Formula</strong>: <code>genY0 = genY0 + bFact × (genY1/2 − genY0)</code></li>
</ul>
<h3>The Wicki-Hayden Point</h3>
<p>At shear = 1, the layout sits at τ = e<sup>iπ/3</sup> in the <a href="https://en.wikipedia.org/wiki/Upper_half-plane" target="_blank" rel="noopener">upper half-plane</a> — a fixed point of the <a href="https://en.wikipedia.org/wiki/Modular_group" target="_blank" rel="noopener">modular group PSL(2,ℤ)</a> with <strong>ℤ/6ℤ hexagonal symmetry</strong> (60° rotational). This is the deepest group-theoretic structure in the space of 2D lattices.</p>
<h3>Lattice vs Voronoi Cells</h3>
<p>The parallelogram cells you see are the <strong>lattice fundamental domain</strong> — defined directly by the basis vectors. But hit detection uses nearest-neighbor regions: <a href="https://en.wikipedia.org/wiki/Voronoi_diagram" target="_blank" rel="noopener">Voronoi cells</a>, also called <a href="https://en.wikipedia.org/wiki/Wigner%E2%80%93Seitz_cell" target="_blank" rel="noopener">Wigner–Seitz cells</a> in crystallography.</p>
<p><a href="https://en.wikipedia.org/wiki/File:Wigner-Seitz_Animation.gif" target="_blank" rel="noopener"><img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Wigner-Seitz_Animation.gif" alt="Wigner-Seitz cell construction — nearest-neighbor regions form hexagons from a triangular lattice" style="max-width:100%;margin:8px 0;"></a></p>
<h3>References</h3>
<ul>
<li><a href="https://en.wikipedia.org/wiki/Shear_mapping" target="_blank" rel="noopener">Shear mapping</a> — Wikipedia</li>
<li><a href="https://en.wikipedia.org/wiki/Harmonic_table_note_layout" target="_blank" rel="noopener">Harmonic Table note layout</a> — Wikipedia</li>
<li><a href="https://en.wikipedia.org/wiki/Wigner%E2%80%93Seitz_cell" target="_blank" rel="noopener">Wigner–Seitz cell</a> — Wikipedia</li>
<li><a href="https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout" target="_blank" rel="noopener">Wicki-Hayden note layout</a> — Wikipedia</li>
<li><a href="https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html" target="_blank" rel="noopener">WickiSynth</a> by Piers Titus van der Torren</li>
</ul>`,
};

function setupInfoDialogs(): void {
  const dialog = document.getElementById('info-dialog');
  const closeBtn = document.getElementById('info-close');
  const contentEl = document.getElementById('info-content');
  if (!(dialog instanceof HTMLDialogElement)) return;

  const infoDialogActor = createActor(dialogMachine);
  infoDialogActor.subscribe((snapshot) => {
    if (snapshot.matches('open')) {
      if (contentEl) contentEl.innerHTML = snapshot.context.content;
      dialog.showModal();
    } else {
      dialog.close();
    }
  });
  infoDialogActor.start();

  // Track active popup to close on outside click
  let activePopup: HTMLElement | null = null;

  document.querySelectorAll<HTMLButtonElement>('.slider-info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.info;
      const content = (key && SLIDER_INFO[key]) ?? '';
      
      // Close any existing popup
      if (activePopup && activePopup !== btn) {
        activePopup.classList.remove('visible');
        activePopup = null;
      }

      // Find or create popup for this button
      let popup = btn.nextElementSibling as HTMLElement | null;
      if (!popup || !popup.classList.contains('info-popup')) {
        popup = document.createElement('div');
        popup.className = 'info-popup';
        btn.parentElement?.insertBefore(popup, btn.nextSibling);
      }

      // Toggle popup visibility
      const isVisible = popup.classList.contains('visible');
      if (isVisible) {
        popup.classList.remove('visible');
        activePopup = null;
      } else {
        popup.innerHTML = content;
        popup.classList.add('visible');
        activePopup = popup;
      }
    });
  });

  // Close popup on outside click
  document.addEventListener('click', (e) => {
    if (activePopup && !(e.target instanceof HTMLElement && (e.target.closest('.slider-info-btn') || e.target.closest('.info-popup')))) {
      activePopup.classList.remove('visible');
      activePopup = null;
    }
  });

  closeBtn?.addEventListener('click', () => infoDialogActor.send({ type: 'CLOSE' }));

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) infoDialogActor.send({ type: 'CLOSE' });
  });
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

/** Thumb center px offset — source of truth for fill, badge & notch alignment. */
function thumbCenterPx(ratio: number, slider: HTMLInputElement): number {
  const thumbW = 3;
  const trackW = slider.offsetWidth;
  return trackW > 0
    ? ratio * (trackW - thumbW) + thumbW / 2
    : 0;
}

/** Clamp badge position to stay within slider bounds.
 * Badge has transform: translateX(-50%), so we clamp the center position
 * to ensure the badge doesn't extend beyond the slider edges.
 */
function clampBadgePosition(centerPx: number, slider: HTMLInputElement, badgeWidth: number = 50): number {
  const trackW = slider.offsetWidth;
  if (trackW <= 0) return centerPx;
  const halfBadgeW = badgeWidth / 2;
  return Math.max(halfBadgeW, Math.min(trackW - halfBadgeW, centerPx));
}

/** Apply fill gradient to a range input (module-level for use in actor subscribers). */
function applySliderFill(slider: HTMLInputElement): void {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const val = parseFloat(slider.value) || 0;
  const ratio = (val - min) / (max - min);
  const trackW = slider.offsetWidth;
  if (trackW > 0) {
    const fillPct = (thumbCenterPx(ratio, slider) / trackW) * 100;
    slider.style.background = `linear-gradient(to right, var(--fg) ${fillPct.toFixed(2)}%, #000 ${fillPct.toFixed(2)}%)`;
  } else {
    const pct = ratio * 100;
    slider.style.background = `linear-gradient(to right, var(--fg) ${pct.toFixed(2)}%, #000 ${pct.toFixed(2)}%)`;
  }
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

  // Active notes keyed by the input source string (keyboard code, pointer id, or midi device+note)
  private activeNotes: Map<string, { coordX: number; coordY: number }> = new Map();
  // Reference counts per coordinate — only fires historyVisualizer noteOff when all sources release
  private noteHoldCounts: Map<string, number> = new Map();
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
  private defaultZoom: number = 1.0;
  private updateGraffiti: (() => void) | null = null;

  private static readonly STORAGE_KEYS = {
    zoom: 'gi_zoom', skew: 'gi_skew', bfact: 'gi_bfact', tuning: 'gi_tuning',
    volume: 'gi_volume', waveform: 'gi_waveform', dref: 'gi_dref', layout: 'gi_layout',
  } as const;

  private loadSetting(key: keyof typeof DComposeApp.STORAGE_KEYS, fallback: string): string {
    try { return localStorage.getItem(DComposeApp.STORAGE_KEYS[key]) ?? fallback; }
    catch { return fallback; }
  }

  private saveSetting(key: keyof typeof DComposeApp.STORAGE_KEYS, value: string): void {
    try { localStorage.setItem(DComposeApp.STORAGE_KEYS[key], value); }
    catch { /* storage full or private mode */ }
  }

  constructor() {
    this.synth = new Synth();
    this.midi = new MidiInput();
    this.mpe = new MPEService();
    this.currentLayout = getLayout('ansi');

    this.canvas = getElement('keyboard-canvas', HTMLCanvasElement);
    this.historyCanvas = getElement('history-canvas', HTMLCanvasElement);
    this.layoutSelect = getElement('layout-select', HTMLSelectElement);
    this.skewSlider = getElement('skew-slider', HTMLInputElement);
    this.bfactSlider = getElement('bfact-slider', HTMLInputElement);
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
    this.updateMidiDevicePanel(this.midi.getDevices());
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

  private setupHistoryVisualizer(): void {
    if (!this.historyCanvas) return;
    this.historyVisualizer = new NoteHistoryVisualizer(this.historyCanvas);
    this.historyVisualizer.start();

    const historyContainer = this.historyCanvas.parentElement;
    if (historyContainer) {
      new ResizeObserver((entries) => {
        if (!this.historyVisualizer) return;
        const entry = entries[0];
        this.historyVisualizer.resize(
          entry.contentRect.width || 900,
          entry.contentRect.height || 120
        );
      }).observe(historyContainer);
    }
  }

  // ─── MIDI ───────────────────────────────────────────────────────────────

  private setupMidiListeners(): void {
    this.midi.onNoteOn((note, velocity, _channel, deviceId) => {
      this.handleMidiNoteOn(note, velocity, deviceId);
    });
    this.midi.onNoteOff((note, _velocity, _channel, deviceId) => {
      this.handleMidiNoteOff(note, deviceId);
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

  private handleMidiNoteOn(midiNote: number, velocity: number, deviceId: string): void {
    this.synth.tryUnlock();
    if (!this.synth.isInitialized()) return;
    const [coordX, coordY] = midiToCoord(midiNote);
    const noteKey = `midi_${deviceId}_${midiNote}`;
    const audioNoteId = `midi_${deviceId}_${midiNote}_${coordX}_${coordY}`;
    this.synth.playNote(audioNoteId, coordX, coordY, 0);
    this.mpe.noteOn(audioNoteId, midiNote, velocity / 127);
    this.activeNotes.set(noteKey, { coordX, coordY });
    this.trackNoteOn(coordX, coordY, midiNote);
    this.render();
  }

  private handleMidiNoteOff(midiNote: number, deviceId: string): void {
    const noteKey = `midi_${deviceId}_${midiNote}`;
    const noteData = this.activeNotes.get(noteKey);
    if (!noteData) return;
    const { coordX, coordY } = noteData;
    const audioNoteId = `midi_${deviceId}_${midiNote}_${coordX}_${coordY}`;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(noteKey);
    this.trackNoteOff(coordX, coordY);
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
    const savedWaveform = this.loadSetting('waveform', 'sawtooth');
    const initialWaveform = isWaveformType(savedWaveform) ? savedWaveform : 'sawtooth' as WaveformType;
    const waveformActor = createActor(waveformMachine, { input: { initial: initialWaveform } });
    waveformActor.subscribe((snapshot) => {
      const active = snapshot.context.active;
      document.querySelectorAll<HTMLButtonElement>('.wave-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.waveform === active);
      });
      this.synth.setWaveform(active);
      this.saveSetting('waveform', active);
    });
    waveformActor.start();
    document.querySelectorAll<HTMLButtonElement>('.wave-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const waveform = btn.dataset.waveform;
        if (isWaveformType(waveform)) waveformActor.send({ type: 'SELECT', waveform });
      });
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
      const savedLayout = this.loadSetting('layout', 'ansi');
      this.layoutSelect.value = savedLayout;
      this.currentLayout = getLayout(savedLayout);
      this.layoutSelect.addEventListener('change', () => {
        this.currentLayout = getLayout(this.layoutSelect!.value);
        this.saveSetting('layout', this.layoutSelect!.value);
      });
    }

    // DCompose ↔ MidiMech skew slider (DOM mutations driven by appActor subscriber)
    if (this.skewSlider) {
      const skewBadge = getElementOrNull('skew-thumb-badge', HTMLInputElement);

      const savedSkew = this.loadSetting('skew', '0');
      this.skewSlider.value = savedSkew;
      this.visualizer?.setSkewFactor(parseFloat(savedSkew));

      this.skewSlider.addEventListener('input', () => {
        const val = parseFloat(this.skewSlider!.value);
        this.visualizer?.setSkewFactor(val);
        this.updateGraffiti?.();
        this.saveSetting('skew', this.skewSlider!.value);
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
        skewBadge.addEventListener('focus', () => skewBadge.select());
      }

      this.populateSliderPresets('skew-presets', this.skewSlider, [
        { value: 0, label: 'DCompose', description: 'DCompose: diagonal parallelogram grid (Striso angle). Wicki-Hayden shares this skew — use WICKED SHEAR to differentiate.' },
        { value: 1, label: 'MidiMech', description: 'MidiMech: orthogonal rectangular grid' },
      ]);
    }

    // Shear (bFact) slider — row-flattening toward Wicki-Hayden
    if (this.bfactSlider) {
      const bfactBadge = getElementOrNull('bfact-thumb-badge', HTMLInputElement);
      const bfactLabel = getElementOrNull('bfact-label', HTMLSpanElement);

      const updateBfactLabel = (value: number): void => {
        if (!bfactLabel) return;
        const ann = formatSliderAnnotation(value, SHEAR_PRESETS, 2);
        bfactLabel.innerHTML = `WICKED SHEAR <span style='color:#88ff88'>${ann}</span>`;
      };

      const updateBfactBadge = (value: number) => {
        if (!bfactBadge) return;
        const sliderMin = parseFloat(this.bfactSlider!.min);
        const sliderMax = parseFloat(this.bfactSlider!.max);
        const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, value));
        const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
        const centerPx = thumbCenterPx(ratio, this.bfactSlider!);
        const clampedPx = clampBadgePosition(centerPx, this.bfactSlider!, 50);
        bfactBadge.style.left = `${clampedPx}px`;
        bfactBadge.value = value.toFixed(2);
      };

      const savedBfact = this.loadSetting('bfact', '0');
      this.bfactSlider.value = savedBfact;
      updateBfactBadge(parseFloat(savedBfact));
      updateBfactLabel(parseFloat(savedBfact));
      this.visualizer?.setBFact(parseFloat(savedBfact));

      this.bfactSlider.addEventListener('input', () => {
        const val = parseFloat(this.bfactSlider!.value);
        this.visualizer?.setBFact(val);
        this.updateGraffiti?.();
        updateBfactBadge(val);
        updateBfactLabel(val);
        this.updateSliderFill(this.bfactSlider!);
        this.saveSetting('bfact', this.bfactSlider!.value);
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
        bfactBadge.addEventListener('focus', () => bfactBadge.select());
      }

      this.populateSliderPresets('bfact-presets', this.bfactSlider, [
        { value: 0, label: 'DCompose', description: 'DCompose: no row shear (default lattice)' },
        { value: 1, label: 'Wicki-Hayden', description: 'Wicki-Hayden: horizontal rows (shear mapping from Tonnetz)' },
      ]);
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
        const ratio = (value - FIFTH_MIN) / range;
        const centerPx = thumbCenterPx(ratio, this.tuningSlider!);
        const clampedPx = clampBadgePosition(centerPx, this.tuningSlider!, 50);
        thumbBadge.style.left = `${clampedPx}px`;
        thumbBadge.value = value.toFixed(1);
      };
      const tuningLabel = getElementOrNull('tuning-label', HTMLSpanElement);
      const updateTuningLabel = (value: number) => {
        if (!tuningLabel) return;
        const ann = formatSliderAnnotation(value, TUNING_LABEL_PRESETS, 1, '\u00a2');
        tuningLabel.innerHTML = `FIFTHS TUNING (cents) <span style='color:#88ff88'>${ann}</span>`;
      };
      updateTuningLabel(FIFTH_DEFAULT);
      updateThumbBadge(FIFTH_DEFAULT);

      const savedTuning = this.loadSetting('tuning', FIFTH_DEFAULT.toString());
      this.tuningSlider.value = savedTuning;
      updateThumbBadge(parseFloat(savedTuning));
      updateTuningLabel(parseFloat(savedTuning));
      this.synth.setFifth(parseFloat(savedTuning));
      this.visualizer?.setGenerator([parseFloat(savedTuning), 1200]);

      this.tuningSlider.addEventListener('input', () => {
        const value = parseFloat(this.tuningSlider!.value);
        this.synth.setFifth(value);
        this.visualizer?.setGenerator([value, 1200]);
        this.updateGraffiti?.();

        updateThumbBadge(value);
        updateTuningLabel(value);
        this.updateSliderFill(this.tuningSlider!);
        this.saveSetting('tuning', this.tuningSlider!.value);
      });

      this.tuningSlider.addEventListener('dblclick', () => {
        const currentValue = parseFloat(this.tuningSlider!.value);
        const { marker } = findNearestMarker(currentValue);
        this.tuningSlider!.value = marker.fifth.toString();
        this.synth.setFifth(marker.fifth);
        this.visualizer?.setGenerator([marker.fifth, 1200]);
        this.updateSliderFill(this.tuningSlider!);
        updateThumbBadge(marker.fifth);
        updateTuningLabel(marker.fifth);
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
              updateTuningLabel(raw);
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

    if (this.tuningSlider) {
      const tetPresets = TUNING_MARKERS.map(m => ({
        value: m.fifth,
        label: m.name,
        description: `${m.description} (${m.fifth.toFixed(2)}\u00a2)`,
      }));
      this.populateSliderPresets('tet-presets', this.tuningSlider, tetPresets);
    }

     // Volume slider — DOM mutations driven by appActor subscriber
     const savedVolume = this.loadSetting('volume', '0.3');
     if (this.volumeSlider) {
       this.volumeSlider.value = savedVolume;
       this.synth.setMasterVolume(parseFloat(savedVolume));
     }
     this.volumeSlider?.addEventListener('input', () => {
       const val = parseFloat(this.volumeSlider!.value);
       this.synth.setMasterVolume(val);
       this.saveSetting('volume', this.volumeSlider!.value);
     });
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
         const ratio = (clamped - min) / (max - min);
         const centerPx = thumbCenterPx(ratio, dRefSlider);
         const clampedPx = clampBadgePosition(centerPx, dRefSlider, 80);
         dRefInput.style.left = `${clampedPx}px`;
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
        this.saveSetting('dref', dRefSlider.value);
      }
    });

    // Init
    const savedDref = this.loadSetting('dref', '293.66');
    if (dRefInput) dRefInput.value = savedDref;
    if (dRefSlider) dRefSlider.value = savedDref;
    updateDRefDisplay(parseFloat(savedDref));

    // D-ref reset button
    const dRefReset = getElementOrNull('d-ref-reset', HTMLButtonElement);
      dRefReset?.addEventListener('click', () => {
        if (dRefInput) dRefInput.style.borderColor = '';
        if (dRefSlider) {
          dRefSlider.value = '293.66';
          dRefSlider.dispatchEvent(new Event('input'));
        }
      });
    // Hover styling handled by CSS .slider-reset:hover — no JS needed.
    // MIDI settings toggle (XState actor)
    const midiToggle = document.getElementById('midi-settings-toggle');
    const midiPanel = document.getElementById('midi-settings-panel');
    const midiPanelActor = createActor(midiPanelMachine);

    midiPanelActor.subscribe((snapshot) => {
      const isOpen = snapshot.matches('open');
      midiPanel?.classList.toggle('open', isOpen);
      if (midiToggle) midiToggle.innerHTML = isOpen ? '<span id="midi-chevron" style="display:inline-flex;align-items:center;line-height:0;transition:transform 0.15s ease;transform:rotate(90deg)">▶</span><span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI settings' : '<span id="midi-chevron" style="display:inline-flex;align-items:center;line-height:0;transition:transform 0.15s ease">▶</span><span style="display:inline-flex;align-items:center;line-height:0">⚙</span> MIDI';
    });

    midiPanelActor.start();

    midiToggle?.addEventListener('click', () => {
      midiPanelActor.send({ type: 'TOGGLE_MIDI' });
    });

    // MPE output UI — XState actor
    const mpeCheckbox = getElementOrNull('mpe-enabled', HTMLInputElement);
    const mpeSelect = getElementOrNull('mpe-output-select', HTMLSelectElement);
    const mpeActor = createActor(mpeMachine);

    mpeActor.subscribe((snapshot) => {
      const isEnabled = snapshot.matches('enabled');
      if (mpeCheckbox) mpeCheckbox.checked = isEnabled;
      if (mpeSelect) mpeSelect.disabled = !isEnabled;
    });

    mpeActor.start();

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
      mpeSelect.disabled = !mpeActor.getSnapshot().matches('enabled');
    };

    mpeCheckbox?.addEventListener('change', () => {
      mpeActor.send({ type: 'TOGGLE' });
      const enabled = mpeActor.getSnapshot().matches('enabled');
      this.mpe.setEnabled(enabled);
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
      if (!mpeActor.getSnapshot().matches('enabled')) return;
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


     // Zoom slider — DOM mutations driven by appActor subscriber
     const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
     this.defaultZoom = isTouchDevice ? Math.min(1.6, window.innerWidth / 480) : 1.0;
     const savedZoom = this.loadSetting('zoom', this.defaultZoom.toString());
     if (this.zoomSlider) {
       this.zoomSlider.value = savedZoom;
       this.visualizer?.setZoom(parseFloat(savedZoom));
     }
     this.zoomSlider?.addEventListener('input', () => {
       const zoom = parseFloat(this.zoomSlider!.value);
       this.visualizer?.setZoom(zoom);
       this.updateGraffiti?.();
       this.saveSetting('zoom', this.zoomSlider!.value);
     });
     const zoomReset = getElementOrNull('zoom-reset', HTMLButtonElement);
     zoomReset?.addEventListener('click', () => {
       if (this.zoomSlider) {
         this.zoomSlider.value = this.defaultZoom.toString();
         this.zoomSlider.dispatchEvent(new Event('input'));
       }
     });
    window.addEventListener('blur', () => this.stopAllNotes());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.stopAllNotes();
    });

    // Auto-return focus to body after using range/select controls so keyboard always works
    document.querySelectorAll<HTMLElement>('select, input[type="range"], input[type="checkbox"]').forEach(el => {
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


    // Grid settings overlay — XState actor
    const gridCog = getElementOrNull('grid-settings-btn', HTMLButtonElement);
    const gridOverlay = document.getElementById('grid-overlay');
    if (gridCog && gridOverlay) {
      const overlayActor = createActor(overlayMachine);
      overlayActor.subscribe((snapshot) => {
        const visible = snapshot.matches('visible');
        gridOverlay.classList.toggle('hidden', !visible);
        gridCog.classList.toggle('active', visible);
      });
      overlayActor.start();
      gridCog.addEventListener('click', () => overlayActor.send({ type: 'TOGGLE' }));
      gridOverlay.addEventListener('click', (e) => {
        if (e.target === gridOverlay) overlayActor.send({ type: 'CLOSE' });
      });
      (window as Window & { overlayActor?: unknown }).overlayActor = overlayActor;
    }

    // Pedal actors — XState runtime manages indicator classList + synth state
    const sustainPedal = getElementOrNull('sustain-indicator', HTMLButtonElement);
    const vibratoPedal = getElementOrNull('vibrato-indicator', HTMLButtonElement);

    this.sustainActor = createActor(pedalMachine);
    this.sustainActor.subscribe((snapshot) => {
      const active = snapshot.matches('active');
      this.sustainIndicator?.classList.toggle('active', active);
      this.synth.setSustain(active);
    });
    this.sustainActor.start();

    this.vibratoActor = createActor(pedalMachine);
    this.vibratoActor.subscribe((snapshot) => {
      const active = snapshot.matches('active');
      this.vibratoIndicator?.classList.toggle('active', active);
      this.synth.setVibrato(active);
    });
    this.vibratoActor.start();

    if (sustainPedal) {
      sustainPedal.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.sustainActor!.send({ type: 'ACTIVATE' });
      });
      sustainPedal.addEventListener('pointerup', () => {
        this.sustainActor!.send({ type: 'DEACTIVATE' });
      });
      sustainPedal.addEventListener('pointerleave', () => {
        this.sustainActor!.send({ type: 'DEACTIVATE' });
      });
    }
    if (vibratoPedal) {
      vibratoPedal.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.vibratoActor!.send({ type: 'ACTIVATE' });
      });
      vibratoPedal.addEventListener('pointerup', () => {
        this.vibratoActor!.send({ type: 'DEACTIVATE' });
      });
      vibratoPedal.addEventListener('pointerleave', () => {
        this.vibratoActor!.send({ type: 'DEACTIVATE' });
      });
    }
    // Initialize slider progress fills
    document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(s => this.updateSliderFill(s));
  }

  // ─── Keyboard input ─────────────────────────────────────────────────────

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

    const isSynthKey =
      code === 'ShiftLeft' || code === 'ShiftRight' ||
      code === 'Space' ||
      code in this.currentLayout.keyMap;

    if (!isSynthKey) return;

    event.preventDefault();

    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);

    // Shift (left or right) = vibrato (hold)
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.vibratoActor?.send({ type: 'ACTIVATE' });
      this.synth.tryUnlock();
      if (!this.synth.isInitialized()) return;
      this.startMpeVibrato();
      return;
    }
    // Space = sustain (hold)
    if (code === 'Space') {
      this.sustainActor?.send({ type: 'ACTIVATE' });
      this.synth.tryUnlock();
      if (!this.synth.isInitialized()) return;
      return;
    }
    // Shift+=/- zoom shortcuts removed — Shift is now vibrato-only

    this.synth.tryUnlock();                  // synchronous, iOS-safe
    if (!this.synth.isInitialized()) return; // not running yet — drop this keypress

    const coord = this.currentLayout.keyMap[code];
    if (!coord) return;

    const [coordX, coordY] = coord;
    const effectiveCoordX = coordX + this.transposeOffset;
    const effectiveCoordY = coordY + this.octaveOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${effectiveCoordY}`;
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset);
    this.activeNotes.set(code, { coordX, coordY });

    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.mpe.noteOn(audioNoteId, midiNote, 0.7);
    this.trackNoteOn(effectiveCoordX, effectiveCoordY, midiNote);

    this.render();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);

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
    const midiNote = 62 + effectiveCoordX * 7 + effectiveCoordY * 12;
    this.synth.stopNote(audioNoteId);
    this.mpe.noteOff(audioNoteId, midiNote);
    this.activeNotes.delete(code);
    this.trackNoteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  // ─── Pointer input ──────────────────────────────────────────────────────

  private handlePointerDown(event: PointerEvent): void {
    this.pointerDown.set(event.pointerId, null);
    this.synth.tryUnlock();                  // synchronous, iOS-safe
    if (!this.synth.isInitialized()) return; // not running yet — first touch silently wakes audio
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
           const ratio = (clamped - min) / (max - min);
           const centerPx = thumbCenterPx(ratio, dSlider);
           const clampedPx = clampBadgePosition(centerPx, dSlider, 80);
           dInput.style.left = `${clampedPx}px`;
         }
       }
       if (dLabel) {
        const ann = hzToNoteAnnotation(newHz, 293.66);
        dLabel.innerHTML = ann ? `D REF (Hz) <span style="color:#88ff88">${ann}</span>` : 'D REF (Hz)';
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
    this.trackNoteOn(effectiveCoordX, effectiveCoordY, midiNote);
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
    this.trackNoteOff(effectiveCoordX, effectiveCoordY);
    this.render();
  }

  private trackNoteOn(coordX: number, coordY: number, midiNote: number): void {
    const key = `${coordX},${coordY}`;
    const count = this.noteHoldCounts.get(key) ?? 0;
    if (count === 0) {
      this.historyVisualizer?.noteOn(coordX, coordY, midiNote);
    }
    this.noteHoldCounts.set(key, count + 1);
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

  private populateSliderPresets(
    containerId: string,
    slider: HTMLInputElement,
    presets: Array<{ value: number; label: string; description: string }>,
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
      // #5: Hide marks outside the slider range entirely
      if (ratio < -0.02 || ratio > 1.02) return;
      const mark = document.createElement('div');
      mark.className = 'slider-preset-mark';
      const clamped = Math.max(0, Math.min(1, ratio));
      mark.style.left = `calc(${clamped.toFixed(6)} * (100% - 3px) + 1.5px)`;
      // #5: Fade marks near edges of slider range
      const edgeDist = Math.min(clamped, 1 - clamped);
      if (edgeDist < 0.03) {
        mark.style.opacity = String(0.3 + 0.7 * (edgeDist / 0.03));
      }

      const tick = document.createElement('div');
      const tickClass = alternate && i % 2 === 1 ? 'slider-tick-staggered' : 'slider-tick-long';
      tick.className = `slider-tick ${tickClass}`;

      const btn = document.createElement('button');
      btn.className = 'slider-preset-btn';
      btn.dataset.value = preset.value.toString();
      btn.textContent = preset.label;
      btn.title = preset.description;
      btn.addEventListener('click', () => {
        slider.value = preset.value.toString();
        slider.dispatchEvent(new Event('input'));
      });

      mark.appendChild(tick);
      mark.appendChild(btn);
      container.appendChild(mark);
    });

    const updateActive = () => {
      const val = parseFloat(slider.value);
      container.querySelectorAll('.slider-preset-mark').forEach(mark => {
        const btn = mark.querySelector('.slider-preset-btn') as HTMLElement | null;
        if (!btn) return;
        const pVal = parseFloat(btn.dataset.value ?? '');
        const isActive = Math.abs(val - pVal) < 0.05;
        btn.classList.toggle('active', isActive);
        (mark as HTMLElement).classList.toggle('active', isActive);
        (mark as HTMLElement).classList.toggle('preset-below', !isActive && pVal < val);
        (mark as HTMLElement).classList.toggle('preset-above', !isActive && pVal > val);
      });
    };
    slider.addEventListener('input', updateActive);
    updateActive();

  }

  // ─── Slider fill ─────────────────────────────────────────────────────────

  private updateSliderFill(slider: HTMLInputElement): void {
    applySliderFill(slider);
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
      const activeMidiNotes = new Set(
        Array.from(this.activeNotes.values()).map(({ coordX, coordY }) => coordToMidiNote(coordX, coordY))
      );
      const activeNoteIds = this.visualizer.getCellIdsForMidiNotes(activeMidiNotes);
      this.visualizer.setActiveNotes(activeNoteIds);
      this.visualizer.render();
    });
  }

  /** Cached canvas rect — avoids layout thrashing on every pointer event. */
  private getCanvasRect(): DOMRect {
    this.cachedCanvasRect = this.canvas.getBoundingClientRect();
    return this.cachedCanvasRect;
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
  return `${noteName} ${cents > 0 ? '+' : ''}${cents}¢`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (parseInt(localStorage.getItem('gi_visualiser_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_visualiser_h');
  if (parseInt(localStorage.getItem('gi_pedals_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_pedals_h');

  document.getElementById('reset-layout')?.addEventListener('click', () => {
    Object.keys(localStorage).filter(k => k.startsWith('gi_')).forEach(k => localStorage.removeItem(k));
    location.reload();
  });

  document.querySelectorAll<HTMLElement>('.panel-resize-handle').forEach(handle => {
    const targetId = handle.dataset.target;
    const minH = parseInt(handle.dataset.min ?? '40', 10);
    const dataMax = parseInt(handle.dataset.max ?? '600', 10);
    const defaultH = parseInt(handle.dataset.default ?? '120', 10);
    const storageKey = handle.dataset.key;
    const hiddenKey = handle.dataset.hiddenKey;
    const dirUp = handle.dataset.direction === 'up';
    const panel = targetId ? document.getElementById(targetId) : null;
    if (!panel) return;

    const savedHeight = storageKey ? parseInt(localStorage.getItem(storageKey) ?? '0', 10) : 0;
    const startCollapsed = hiddenKey ? localStorage.getItem(hiddenKey) === 'true' : false;

    const actor = createActor(panelMachine, {
      input: {
        defaultHeight: defaultH,
        minHeight: minH,
        maxHeight: dataMax,
        dirUp,
        initialHeight: savedHeight > 0 ? savedHeight : defaultH,
        startCollapsed,
      },
    });

    let prevState = '';
    actor.subscribe((snapshot) => {
      const state = snapshot.value as string;
      if (state === 'routing') return;
      const { height } = snapshot.context;
      const isCollapsed = state === 'collapsed';
      const isDragging = state === 'dragging';

      panel.classList.toggle('collapsed', isCollapsed);
      handle.classList.toggle('dragging', isDragging);
      panel.style.transition = isDragging ? 'none' : '';

      if (isCollapsed) {
        panel.style.height = '';
      } else {
        panel.style.height = clampPanelHeight(height, minH, dataMax) + 'px';
      }

      if (state !== prevState && !isDragging) {
        if (storageKey) {
          try { localStorage.setItem(storageKey, isCollapsed ? '0' : Math.round(height).toString()); } catch { /* */ }
        }
        if (hiddenKey) {
          try { localStorage.setItem(hiddenKey, isCollapsed ? 'true' : 'false'); } catch { /* */ }
        }
        if (isCollapsed && document.activeElement === handle) handle.focus();
      }
      if (state === 'idle' && prevState === 'dragging' && storageKey) {
        try { localStorage.setItem(storageKey, Math.round(height).toString()); } catch { /* */ }
      }
      prevState = state;
    });
    actor.start();

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch { /* synthetic events in tests may lack active pointer registration */ }
      actor.send({ type: 'DRAG_START', clientY: e.clientY });
    });
    handle.addEventListener('pointermove', (e: PointerEvent) => {
      if (!actor.getSnapshot().matches('dragging')) return;
      actor.send({ type: 'DRAG_MOVE', clientY: e.clientY });
    });
    const stopDrag = () => {
      if (!actor.getSnapshot().matches('dragging')) return;
      actor.send({ type: 'DRAG_END' });
    };
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);

    handle.addEventListener('dblclick', () => {
      actor.send({ type: 'DBLCLICK' });
    });

    handle.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const grow = dirUp ? e.key === 'ArrowUp' : e.key === 'ArrowDown';
        actor.send({ type: 'RESIZE_STEP', grow });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        actor.send({ type: 'TOGGLE' });
      }
    });
  });

  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const actor = (window as Window & { overlayActor?: { send: (e: { type: string }) => void; getSnapshot: () => { matches: (s: string) => boolean } } }).overlayActor;
      if (actor?.getSnapshot().matches('visible')) {
        actor.send({ type: 'CLOSE' });
      }
    }
  });

  // About dialog — XState actor
  const aboutBtn = document.getElementById('about-btn');
  const aboutDialog = document.getElementById('about-dialog');
  const aboutClose = document.getElementById('about-close');
  const aboutContentEl = document.getElementById('about-content');
  if (aboutDialog instanceof HTMLDialogElement) {
    const aboutRendered = renderMarkdown(readmeText);
    const aboutDialogActor = createActor(dialogMachine);
    aboutDialogActor.subscribe((snapshot) => {
      if (snapshot.matches('open')) {
        if (aboutContentEl) aboutContentEl.innerHTML = snapshot.context.content;
        aboutDialog.showModal();
      } else {
        aboutDialog.close();
      }
    });
    aboutDialogActor.start();

    aboutBtn?.addEventListener('click', () => {
      aboutDialogActor.send({ type: 'OPEN', content: aboutRendered });
    });
    aboutClose?.addEventListener('click', () => aboutDialogActor.send({ type: 'CLOSE' }));
    aboutDialog.addEventListener('click', (e) => {
      if (e.target === aboutDialog) aboutDialogActor.send({ type: 'CLOSE' });
    });
  }

  setupInfoDialogs();

  const app = new DComposeApp();
  const appActor = createActor(appMachine, {
    input: { initialVolume: -10.5, defaultZoom: 1.0, touchDevice: 'ontouchstart' in window },
  });

  // ─── Skew slider: appActor subscriber drives badge, label & fill ──────────
  const _skewSlider = getElementOrNull('skew-slider', HTMLInputElement);
  const _skewBadge = getElementOrNull('skew-thumb-badge', HTMLInputElement);
  const _skewLabel = getElementOrNull('skew-label', HTMLSpanElement);
  let _prevSkewValue = NaN;

  appActor.subscribe((snapshot) => {
    const skew = snapshot.context.sliders.skew;
    if (skew.value === _prevSkewValue) return;
    _prevSkewValue = skew.value;

     if (_skewBadge && _skewSlider) {
       const sliderMin = parseFloat(_skewSlider.min);
       const sliderMax = parseFloat(_skewSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, skew.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _skewSlider);
       const clampedPx = clampBadgePosition(centerPx, _skewSlider, 50);
       _skewBadge.style.left = `${clampedPx}px`;
       _skewBadge.value = skew.value.toFixed(2);
     }

     if (_skewLabel) {
      const ann = formatSliderAnnotation(skew.value, SKEW_PRESETS, 2);
      _skewLabel.innerHTML = `MECH SKEW <span style='color:#88ff88'>${ann}</span>`;
    }

    if (_skewSlider) {
      applySliderFill(_skewSlider);
    }
   });

  // ─── Volume slider: appActor subscriber drives badge & fill ──────────────────
  const _volumeSlider = getElementOrNull('volume-slider', HTMLInputElement);
  const _volumeBadge = getElementOrNull('volume-thumb-badge', HTMLSpanElement);
  let _prevVolumeValue = NaN;

  appActor.subscribe((snapshot) => {
    const volume = snapshot.context.sliders.volume;
    if (volume.value === _prevVolumeValue) return;
    _prevVolumeValue = volume.value;

     if (_volumeBadge && _volumeSlider) {
       const sliderMin = parseFloat(_volumeSlider.min);
       const sliderMax = parseFloat(_volumeSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, volume.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _volumeSlider);
       const clampedPx = clampBadgePosition(centerPx, _volumeSlider, 50);
       _volumeBadge.style.left = `${clampedPx}px`;
       _volumeBadge.textContent = volume.badgeText;
     }

     if (_volumeSlider) {
      applySliderFill(_volumeSlider);
    }
  });

  // ─── Zoom slider: appActor subscriber drives badge & fill ────────────────────
  const _zoomSlider = getElementOrNull('zoom-slider', HTMLInputElement);
  const _zoomBadge = getElementOrNull('zoom-thumb-badge', HTMLSpanElement);
  let _prevZoomValue = NaN;

  appActor.subscribe((snapshot) => {
    const zoom = snapshot.context.sliders.zoom;
    if (zoom.value === _prevZoomValue) return;
    _prevZoomValue = zoom.value;

     if (_zoomBadge && _zoomSlider) {
       const sliderMin = parseFloat(_zoomSlider.min);
       const sliderMax = parseFloat(_zoomSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, zoom.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _zoomSlider);
       const clampedPx = clampBadgePosition(centerPx, _zoomSlider, 50);
       _zoomBadge.style.left = `${clampedPx}px`;
       _zoomBadge.textContent = zoom.badgeText;
     }

    if (_zoomSlider) {
      applySliderFill(_zoomSlider);
    }
  });

   appActor.start();

   if (_skewSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'skew', value: parseFloat(_skewSlider.value) });
   }

   if (_volumeSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'volume', value: parseFloat(_volumeSlider.value) });
   }

   if (_zoomSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: parseFloat(_zoomSlider.value) });
   }

  // ─── Wire DOM → appActor (dual-write: DComposeApp handles services) ───────
  if (_skewSlider) {
    _skewSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'skew', value: parseFloat(_skewSlider.value) });
    });
  }
  if (_skewBadge) {
    _skewBadge.addEventListener('change', () => {
      const raw = parseFloat(_skewBadge.value);
      if (isFinite(raw)) {
        appActor.send({ type: 'SLIDER_BADGE_EDIT', slider: 'skew', rawValue: raw.toString() });
      }
    });
  }
  document.getElementById('midi-settings-toggle')?.addEventListener('click', () => {
    appActor.send({ type: 'MIDI_PANEL_TOGGLE' });
  });
  const _mpeCheckbox = getElementOrNull('mpe-enabled', HTMLInputElement);
  if (_mpeCheckbox) {
    _mpeCheckbox.addEventListener('change', () => {
      appActor.send({ type: 'MPE_ENABLE', enabled: _mpeCheckbox.checked });
    });
  }
  const _mpeSelect = getElementOrNull('mpe-output-select', HTMLSelectElement);
  if (_mpeSelect) {
    _mpeSelect.addEventListener('change', () => {
      appActor.send({ type: 'MPE_SELECT_OUTPUT', outputId: _mpeSelect.value });
    });
  }
  document.querySelectorAll<HTMLButtonElement>('.wave-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const waveform = btn.dataset.waveform;
      if (isWaveformType(waveform)) appActor.send({ type: 'SET_WAVEFORM', waveform });
    });
  });
  const _layoutSelect = getElementOrNull('layout-select', HTMLSelectElement);
  if (_layoutSelect) {
    _layoutSelect.addEventListener('change', () => {
      appActor.send({ type: 'SET_LAYOUT', layoutId: _layoutSelect.value });
    });
  }
  // Expose for debugging and Playwright verification
  (window as Window & { dcomposeApp?: unknown }).dcomposeApp = {
    actor: appActor,
    getSnapshot: () => appActor.getSnapshot(),
    getActiveNoteCount: () => (app as unknown as { activeNotes: Map<string, unknown> }).activeNotes.size,
    isAudioReady: () => (app as unknown as { synth: { isInitialized: () => boolean } }).synth.isInitialized(),
    getGridGeometry: () => (app as unknown as { visualizer: { getGridGeometry: () => { cellHv1: {x:number,y:number}, cellHv2: {x:number,y:number}, width: number, height: number } | null } }).visualizer?.getGridGeometry() ?? null,
    getDefaultZoom: () => (app as unknown as { defaultZoom: number }).defaultZoom,
    };
});

