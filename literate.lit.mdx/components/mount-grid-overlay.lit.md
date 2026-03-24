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
import { SliderRow } from './SliderRow';
import { TUNING_MARKERS } from '../lib/synth';
import { srcLink, tuningTableRows } from '../app-constants';

const TUNING_INFO = `
<h2>Fifths Tuning</h2>
<p>Sets the size of the <strong>perfect fifth</strong> generator in <a href="https://en.wikipedia.org/wiki/Cent_(music)" target="_blank" rel="noopener">cents</a>. This single parameter determines the entire tuning system.</p>
<table>
${tuningTableRows}
</table>
<p>The notch marks below the slider show where <a href="https://en.wikipedia.org/wiki/Equal_temperament" target="_blank" rel="noopener">equal temperaments</a> and named temperaments fall. Click a marker to snap to it.</p>
${srcLink('synth.lit.md', 'Source: synth.lit.md — tuning system implementation')}`;

const SKEW_INFO = `
<h2>Mech Skew</h2>
<p>Continuously interpolates the lattice basis vectors between two named keyboard layouts:</p>
<table>
<tr><td><strong>0</strong></td><td><strong>DCompose / Wicki-Hayden</strong> — diagonal parallelogram grid at the Striso angle</td></tr>
<tr><td><strong>1</strong></td><td><strong>MidiMech</strong> — orthogonal rectangular grid</td></tr>
</table>
<p>Values beyond [0, 1] extrapolate past these endpoints.</p>
${srcLink('note-colors.lit.md', 'Source: note-colors.lit.md — skew interpolation math')}`;

const VOLUME_INFO = `
<h2>Volume</h2>
<p>Master output volume. Controls the gain node at the end of the audio chain.</p>
${srcLink('synth.lit.md', 'Source: synth.lit.md — master volume')}`;

const ZOOM_INFO = `
<h2>Zoom</h2>
<p>Scales the grid cell size. Default is calculated from physical key width (23.5mm piano key target) using text measurement as a metric proxy.</p>
${srcLink('app-core.lit.md', 'Source: app-core.lit.md — zoom and key sizing')}`;

const BEND_INFO = `
<h2>Pitch Bend</h2>
<p>Controls the pitch bend range — how far a MIDI pitch bend wheel or MPE finger slide changes the pitch.</p>
<p>Set from <strong>±2</strong> (subtle vibrato) to <strong>±48 semitones</strong> (four octaves).</p>
${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md — MPE pitch bend handling')}`;

const VELOCITY_INFO = `
<h2>Velocity</h2>
<p>Note-on velocity measures how hard each note is struck, controlling initial volume and timbre brightness.</p>
<ul>
<li><strong>MIDI controllers</strong>: velocity from key/pad sensor (0–127)</li>
<li><strong>Computer keyboard</strong>: fixed velocity</li>
<li><strong>Touch screen</strong>: velocity mapped from touch pressure where supported</li>
</ul>
${srcLink('keyboard-visualizer.lit.md', 'Source: keyboard-visualizer.lit.md — velocity visualization')}`;

const PRESSURE_INFO = `
<h2>Pressure (Aftertouch)</h2>
<p>Continuous force applied <em>after</em> the initial note strike.</p>
<table>
<tr><td><strong>Channel pressure</strong></td><td>One value for all notes</td></tr>
<tr><td><strong>Poly pressure</strong></td><td>Independent per note — MPE devices</td></tr>
</table>
${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md — pressure/aftertouch handling')}`;

const TIMBRE_INFO = `
<h2>Timbre (CC74)</h2>
<p>Controls brightness/timbre via MIDI CC74. In MPE, this is the standard "slide" dimension.</p>
<table>
<tr><td><strong>CC74</strong></td><td>MPE standard — "Brightness"</td></tr>
<tr><td><strong>CC11</strong></td><td>Expression — orchestral instruments</td></tr>
<tr><td><strong>Poly pressure</strong></td><td>Some devices route Y-axis here</td></tr>
</table>
${srcLink('mpe-service.lit.md', 'Source: mpe-service.lit.md — timbre CC routing')}`;

const MIDI_INFO = `
<h2>MIDI Input</h2>
<p>External MIDI controllers send <strong>note numbers</strong> (0–127), not grid coordinates.</p>
<h3>Limitations</h3>
<ul>
<li><strong>12-note constraint</strong>: MIDI encodes pitch as integers mod 12. Microtonal tunings produce duplicate mappings.</li>
<li><strong>Mirror notes</strong>: Same pitch at multiple grid positions — all matching cells highlight.</li>
<li><strong>Workaround</strong>: Use <strong>Calibrate Playable Area</strong> to restrict the active range.</li>
</ul>
${srcLink('midi-input.lit.md', 'Source: midi-input.lit.md — MIDI device management')}`;

const LAYOUT_INFO = `
<h2>Keyboard Layout</h2>
<table>
<tr><td><strong>ANSI</strong></td><td>US QWERTY (default)</td></tr>
<tr><td><strong>ISO</strong></td><td>European (extra key left of Z)</td></tr>
<tr><td><strong>Dvorak</strong></td><td>ANSI Dvorak remapped labels</td></tr>
</table>
<p>Auto-detected via Keyboard API on Chrome/Edge. Falls back to ANSI.</p>
${srcLink('keyboard-layouts.lit.md', 'Source: keyboard-layouts.lit.md — layout definitions')}`;

const DEAD_ZONE_INFO = `
<h2>Touch Dead Zone</h2>
<p>Minimum finger velocity (CSS px/ms) before pitch bend engages. Below this, touch snaps to cell center.</p>
<table>
<tr><td><strong>0.00</strong></td><td>No dead zone — very sensitive</td></tr>
<tr><td><strong>0.15</strong></td><td>Default — filters finger tremor</td></tr>
<tr><td><strong>0.30+</strong></td><td>Requires deliberate sliding</td></tr>
</table>
${srcLink('app-core.lit.md', 'Source: app-core.lit.md — pointer move handler')}`;
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
          <div class="slider-track">
            <span class="ctrl-label">WAVE</span>
            <span id="wave-select-slot" />
            <button class="slider-reset icon-btn icon-md" id="wave-reset"><i data-lucide="rotate-cw" /></button>
          </div>
          <div class="ctrl-group mt-18">
            <InfoButton infoKey="volume" />
            <SliderRow def={{
              id: 'volume-slider',
              label: 'VOL (dB)',
              min: 0, max: 1, step: 0.01,
              defaultValue: callbacks.initialVolume,
              formatBadge: (v: number) => (20 * Math.log10(Math.max(0.001, v))).toFixed(1),
              onChange: callbacks.onVolumeChange,
            }} />
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="tuning" />
              <SliderRow def={{
                id: 'tuning-slider',
                label: 'FIFTHS TUNING (cents)',
                min: 683, max: 722, step: 0.01,
                defaultValue: 700,
                formatBadge: (v: number) => v.toFixed(1),
                onChange: callbacks.onTuningChange,
                presetsId: 'tet-presets',
                alternateTicks: true,
                presets: TUNING_MARKERS.map(m => ({ value: m.fifth, label: m.name, description: `${m.description} (${m.fifth.toFixed(2)}\u00a2)` })),
              }} />
            </div>
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="dref" />
              <SliderRow def={{
                id: 'd-ref-slider',
                label: 'D REF (Hz)',
                min: 73.42, max: 1174.66, step: 0.01,
                defaultValue: 293.66,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onDRefChange,
              }} />
            </div>
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
            <div class="ctrl-group">
              <InfoButton infoKey="skew" />
              <SliderRow def={{
                id: 'skew-slider',
                label: 'MECH SKEW',
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
            </div>
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="shear" />
              <SliderRow def={{
                id: 'bfact-slider',
                label: 'WICKED SHEAR',
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
            </div>
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="zoom" />
              <SliderRow def={{
                id: 'zoom-slider',
                label: 'ZOOM (x)',
                min: 0.2, max: 3, step: 0.01,
                defaultValue: callbacks.initialZoom,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onZoomChange,
              }} />
            </div>
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
              <span class="overlay-section-title">MIDI</span> <InfoButton infoKey="midi" />
              <div id="midi-device-list" />
              <span class="overlay-section-title">EXPRESSION</span>
              <div class="midi-panel-row" id="expr-bend-row">
                <InfoButton infoKey="bend" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked /><span class="gi-check" /></span>
                  <span class="text-white">Pitch Bend</span>
                  <input type="text" inputmode="decimal" id="midi-pb-range-expr" value={callbacks.initialPbRange} class="numeric-input" />
                  <span class="text-dim-sm">semitones</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-velocity-row">
                <InfoButton infoKey="velocity" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked /><span class="gi-check" /></span>
                  <span class="text-white">Note Velocity</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-pressure-row">
                <InfoButton infoKey="pressure" />
                <span class="text-white-12">Pressure</span>
                <span class="text-dim">mode</span>
                <span id="pressure-mode-slot" />
                <span class="text-dim">source</span>
                <span id="pressure-cc-source-slot" />
              </div>
              <div class="midi-panel-row" id="expr-timbre-row">
                <InfoButton infoKey="timbre" />
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
                <InfoButton infoKey="touchDeadZone" />
                <span class="text-white-12">Touch Dead Zone</span>
                <input type="range" id="touch-dead-zone-slider" min="0" max="0.5" step="0.01" value="0.15" class="inline-slider" />
                <span id="touch-dead-zone-badge" class="text-dim-sm">0.15</span>
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
