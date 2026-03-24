# Grid Overlay Mount

Mounts the SolidJS SettingsOverlay component into the grid keyboard area.
This is the bridge between the vanilla TS app and the Solid component system
for the per-grid settings panel. The `mountGridOverlay` function is called from
app-core during initialization.

All settings (SOUND, VISUAL, INPUT) live in this single overlay panel.

The overlay preserves every existing DOM ID so that the app-core event
listeners continue to work without modification. Solid renders the structure;
app-core wires up the behaviour.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import { InfoButton } from './InfoButton';
import { InfoBox } from './InfoBox';
import { SliderRow } from './SliderRow';
import { TUNING_MARKERS } from '../lib/synth';
import { srcLink, tuningTableRows } from '../app-constants';

const VOLUME_INFO = `<h2>Volume</h2><p>Master output volume.</p>${srcLink('synth.lit.md', 'Source: synth.lit.md')}`;
const TUNING_INFO = `<h2>Fifths Tuning</h2><p>Sets the perfect fifth generator in cents. This single parameter determines the entire tuning system.</p><table>${tuningTableRows}</table><p>Click a marker to snap to an equal temperament.</p>${srcLink('synth.lit.md', 'Source: synth.lit.md')}`;
const DREF_INFO = `<h2>D-ref Frequency</h2><p>The reference pitch at grid origin [0,0]. Default 293.66 Hz (D4 in 12-TET). Adjustable to any frequency.</p>${srcLink('keyboard-layouts.lit.md', 'Source: keyboard-layouts.lit.md')}`;
const SKEW_INFO = `<h2>Mech Skew</h2><p>Interpolates between DCompose/Wicki-Hayden (0) and MidiMech (1) grid layouts.</p>${srcLink('note-colors.lit.md', 'Source: note-colors.lit.md')}`;
const SHEAR_INFO = `<h2>Wicked Shear</h2><p>Shear mapping: 0=DCompose (natural angle), 1=Wicki-Hayden (horizontal rows). Area-preserving.</p>${srcLink('note-colors.lit.md', 'Source: note-colors.lit.md')}`;
const ZOOM_INFO = `<h2>Zoom</h2><p>Scales grid cell size. Default calculated from physical key width (23.5mm piano key target).</p>${srcLink('app-core.lit.md', 'Source: app-core.lit.md')}`;
const MIDI_INFO = `<h2>MIDI Input</h2><p>External MIDI controllers send note numbers (0-127). 12-note constraint: microtonal tunings produce duplicate mappings. Use Calibrate to restrict range.</p>${srcLink('midi-input.lit.md', 'Source: midi-input.lit.md')}`;
const BEND_INFO = `<h2>Pitch Bend</h2><p>Bend range ±2 to ±48 semitones. MPE: per-note bend. Standard: all notes.</p>${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md')}`;
const VELOCITY_INFO = `<h2>Velocity</h2><p>Note-on strike force → initial volume + timbre. MIDI: 0-127 sensor. Keyboard: fixed. Touch: pressure.</p>${srcLink('keyboard-visualizer.lit.md', 'Source: keyboard-visualizer.lit.md')}`;
const PRESSURE_INFO = `<h2>Pressure</h2><p>Aftertouch force after strike. Channel (all notes) or Poly (per note, MPE).</p>${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md')}`;
const TIMBRE_INFO = `<h2>Timbre (CC74)</h2><p>Brightness/slide via CC74 (MPE standard), CC11 (expression), or poly pressure.</p>${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md')}`;
const DEAD_ZONE_INFO = `<h2>Touch Dead Zone</h2><p>Min finger velocity (px/ms) for pitch bend. 0=sensitive, 0.15=default, 0.3+=deliberate.</p>${srcLink('app-core.lit.md', 'Source: app-core.lit.md')}`;
```

The mount function accepts the container element and the cog button. It owns
the `visible` signal and toggles it on cog clicks, returning a `toggle`
function so app-core can drive visibility from the `overlayMachine` actor.

``` {.css file=_generated/components/mount-grid-overlay.css}
#mpe-output-select {
  position:absolute !important; width:1px !important; height:1px !important;
  opacity:0 !important; overflow:hidden !important; pointer-events:none !important;
  margin:0 !important; padding:0 !important; border-width:0 !important;
}
.midi-panel-row { display:flex; align-items:center; gap:2px; font-size:11px; flex-wrap:wrap; }
.mt-18 { margin-top:18px; }
.expr-label { display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:12px; }
.ctrl-group { display:flex; align-items:center; gap:5px; flex-shrink:0; }
.ctrl-label { font-size:9px; text-transform:uppercase; white-space:nowrap; color:#fff; flex-shrink:0; font-weight:700; letter-spacing:0.06em; }
.text-white { color:#fff; }
.text-white-12 { color:#fff; font-size:12px; }
.text-dim { color:var(--dim); font-size:9px; }
.text-dim-sm { color:var(--dim); font-size:10px; }
.text-dim-plain { color:var(--dim); }
.expr-label-sm { display:inline-flex; align-items:center; gap:3px; cursor:pointer; font-size:10px; }
.expr-label-lg { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; }
.numeric-input { width:6ch; text-align:center; font-family:var(--font); font-size:10px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:2px 3px; }
.select-slot { min-width:120px; display:inline-block; }
#d-ref-input { width:80px; text-transform:none; }
```

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
import './mount-grid-overlay.css';

export interface GridOverlayCallbacks {
  onVolumeChange: (v: number) => void;
  initialVolume: number;
  onZoomChange: (v: number) => void;
  initialZoom: number;
  onSkewChange: (v: number) => void;
  initialSkew: number;
  onShearChange: (v: number) => void;
  initialShear: number;
  onTuningChange: (v: number) => void;
  initialTuning: number;
  onDRefChange: (v: number) => void;
  initialDRef: number;
  initialPbRange: number;
}

export function mountGridOverlay(
  mountEl: HTMLElement,
  cogBtn: HTMLElement,
  callbacks: GridOverlayCallbacks,
): { toggle: () => void; setVisible: (v: boolean) => void } {
  const [visible, setVisible] = createSignal(false);

  const toggle = (): void => {
    setVisible(v => !v);
    cogBtn.classList.toggle('active', visible());
  };
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && visible()) {
      setVisible(false);
      cogBtn.classList.remove('active');
    }
  };
  document.addEventListener('keydown', onEscape);
  cogBtn.addEventListener('click', toggle);

  const sections: SectionDef[] = [
    {
      title: 'SOUND (global)',
      children: () => (
        <div>
          <div class="midi-panel-row">
            <InfoButton infoKey="waveform" content={`<h2>Waveform</h2><p>Oscillator shape: sine (pure), triangle (soft), sawtooth (bright), square (hollow), guitar (plucked).</p>${srcLink('synth.lit.md', 'Source: synth.lit.md')}`} />
            <span class="ctrl-label">WAVE</span>
            <span id="wave-select-slot" />
            <button class="slider-reset icon-btn icon-md" id="wave-reset"><i data-lucide="rotate-cw" /></button>
          </div>
          <InfoBox infoKey="volume" infoContent={VOLUME_INFO}>
            <SliderRow def={{
              id: 'volume-slider',
              label: 'VOL',
              min: 0, max: 1, step: 0.01,
              defaultValue: callbacks.initialVolume,
              formatBadge: (v: number) => (20 * Math.log10(Math.max(0.001, v))).toFixed(1),
              onChange: callbacks.onVolumeChange,
            }} />
          </InfoBox>
          <div class="tuning-slider-area mt-18">
            <InfoBox infoKey="tuning" infoContent={TUNING_INFO}>
              <SliderRow def={{
                id: 'tuning-slider',
                label: 'FIFTHS (¢)',
                min: 683, max: 722, step: 0.01,
                defaultValue: 700,
                formatBadge: (v: number) => v.toFixed(1),
                onChange: callbacks.onTuningChange,
                presetsId: 'tet-presets',
                alternateTicks: true,
                presets: TUNING_MARKERS.map(m => ({ value: m.fifth, label: m.name, description: `${m.description} (${m.fifth.toFixed(2)}\u00a2)` })),
              }} />
            </InfoBox>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoBox infoKey="dref" infoContent={DREF_INFO}>
              <SliderRow def={{
                id: 'd-ref-slider',
                label: 'D-REF',
                min: 73.42, max: 1174.66, step: 0.01,
                defaultValue: 293.66,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onDRefChange,
              }} />
            </InfoBox>
          </div>
        </div>
      ),
    },
```

### VISUAL section

Per-grid visual settings: skew (DCompose ↔ MidiMech morph), wicked shear
(row-offset angle), zoom (cell size), QWERTY overlay toggle, and keyboard
layout selector. Each slider wraps its info button in a `ctrl-group` flex row.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
    {
      title: 'VISUAL (per grid)',
      children: () => (
        <div>
          <div class="tuning-slider-area">
            <InfoBox infoKey="skew" infoContent={SKEW_INFO}>
              <SliderRow def={{
                id: 'skew-slider',
                label: 'SKEW',
                min: -0.5, max: 1.5, step: 0.01,
                defaultValue: 0,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onSkewChange,
                presetsId: 'skew-presets',
                presets: [
                  { value: 0, label: 'DCompose / Wicki-Hayden', description: 'DCompose: diagonal parallelogram grid (Striso angle). Wicki-Hayden shares this skew — use WICKED SHEAR to differentiate.' },
                  { value: 1, label: 'MidiMech', description: 'MidiMech: orthogonal rectangular grid' },
                ],
              }} />
            </InfoBox>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoBox infoKey="shear" infoContent={SHEAR_INFO}>
              <SliderRow def={{
                id: 'bfact-slider',
                label: 'SHEAR',
                min: -0.5, max: 1.5, step: 0.01,
                defaultValue: 0,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onShearChange,
                presetsId: 'bfact-presets',
                presets: [
                  { value: 0, label: 'DCompose', description: 'DCompose: no row shear (default lattice)' },
                  { value: 1, label: 'Wicki-Hayden', description: 'Wicki-Hayden: horizontal rows (shear mapping from Tonnetz)' },
                ],
              }} />
            </InfoBox>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoBox infoKey="zoom" infoContent={ZOOM_INFO}>
              <SliderRow def={{
                id: 'zoom-slider',
                label: 'ZOOM',
                min: 0.2, max: 3, step: 0.01,
                defaultValue: callbacks.initialZoom,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onZoomChange,
              }} />
            </InfoBox>
          </div>
          <div class="slider-track mt-18">
            <label class="expr-label-lg">
              <span class="gi-checkbox"><input type="checkbox" id="qwerty-overlay-toggle" checked /><span class="gi-check" /></span>
              <span class="text-white">COMPUTER KEYBOARD LABELS</span>
            </label>
          </div>
        </div>
      ),
    },
```

### INPUT section

Global input settings: MIDI device management, pitch bend range, and expression
controls (bend, velocity, pressure, timbre). Expression checkboxes toggle which
MPE dimensions are active. Pressure mode and CC source use slim-select dropdowns.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
    {
      title: 'INPUT (global)',
      children: () => (
        <div>
          <div class="slider-track">
            <span class="ctrl-label">KEYBOARD LAYOUT</span>
            <span id="layout-select-slot" />
            <button class="slider-reset icon-btn icon-md" id="layout-reset"><i data-lucide="rotate-cw" /></button>
          </div>
          <div class="mt-18">
            <div id="midi-settings-panel">
              <span class="overlay-section-title">MIDI</span> <InfoButton infoKey="midi" content={MIDI_INFO} />
              <div id="midi-device-list" />
              <span class="overlay-section-title">EXPRESSION</span>
              <div class="midi-panel-row" id="expr-bend-row">
                <InfoButton infoKey="bend" content={BEND_INFO} />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked /><span class="gi-check" /></span>
                  <span class="text-white">Pitch Bend</span>
                  <input type="text" inputmode="decimal" id="midi-pb-range-expr" value={callbacks.initialPbRange} class="numeric-input" />
                  <span class="text-dim-sm">semitones</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-velocity-row">
                <InfoButton infoKey="velocity" content={VELOCITY_INFO} />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked /><span class="gi-check" /></span>
                  <span class="text-white">Note Velocity</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-pressure-row">
                <InfoButton infoKey="pressure" content={PRESSURE_INFO} />
                <span class="text-white-12">Pressure</span>
                <span class="text-dim">mode</span>
                <span id="pressure-mode-slot" />
                <span class="text-dim">source</span>
                <span id="pressure-cc-source-slot" />
              </div>
              <div class="midi-panel-row" id="expr-timbre-row">
                <InfoButton infoKey="timbre" content={TIMBRE_INFO} />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-timbre" checked /><span class="gi-check" /></span>
                  <span class="text-white">Timbre Slide</span>
                </label>
                <span id="timbre-cc-mode-slot" />
                <label class="expr-label-sm">
                  <span class="gi-checkbox"><input type="checkbox" id="timbre-reverse" /><span class="gi-check" /></span>
                  <span class="text-dim-plain">Rev</span>
                </label>
              </div>
              <div class="midi-panel-row" id="touch-dead-zone-row">
                <InfoButton infoKey="touchDeadZone" content={DEAD_ZONE_INFO} />
                <span class="text-white-12">Touch Dead Zone</span>
                <input type="range" id="touch-dead-zone-slider" min="0" max="0.5" step="0.01" value="0.15" class="inline-slider" />
                <span id="touch-dead-zone-badge" class="text-dim-sm">0.15</span>
                <button class="slider-reset icon-btn icon-md" id="touch-dead-zone-reset"><i data-lucide="rotate-cw" /></button>
              </div>
              <div class="midi-panel-row" id="mpe-output-row">
                <span class="ctrl-label">MPE Out:</span>
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="mpe-enabled" /><span class="gi-check" /></span>
                  Enable
                </label>
                <span id="mpe-output-select-slot" class="select-slot" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  render(
    () => <SettingsOverlay overlayId="grid-overlay" sections={sections} visible={visible} onToggle={toggle} />,
    mountEl,
  );

  mountEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'grid-overlay') { setVisible(false); cogBtn.classList.remove('active'); }
  });

  return { toggle, setVisible };
}
```
