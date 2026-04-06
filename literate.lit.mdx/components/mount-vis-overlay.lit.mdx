# Vis Overlay Mount

Mounts the SolidJS SettingsOverlay component into the visualiser panel.
This is the bridge between the vanilla TS app and the Solid component system.
The `mountVisOverlay` function is called from app-core during initialization.

``` {.css file=_generated/components/mount-vis-overlay.css}
#vis-overlay { padding: 8px 40px 8px 12px; }
```

``` {.typescript file=_generated/components/mount-vis-overlay.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import { SettingsCog } from './SettingsCog';
import { InfoBox } from './InfoBox';
import { SliderRow } from './SliderRow';
import { srcLink } from '../app-constants';
import type { NoteHistoryVisualizer } from '../lib/note-history-visualizer';
import { D_REF_MIDI } from '../lib/keyboard-layouts';
import './mount-vis-overlay.css';

export function mountVisOverlay(
  mountEl: HTMLElement,
  cogMountEl: HTMLElement | null,
  historyVis: NoteHistoryVisualizer,
): void {
  const [visible, setVisible] = createSignal(false);
  const toggle = (): void => { setVisible(v => !v); };

  if (cogMountEl) {
    render(() => <SettingsCog id="vis-settings-btn" active={visible()} onClick={toggle} position="absolute" style={{ top: '4px', right: '8px', 'z-index': '15' }} />, cogMountEl);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && visible()) { setVisible(false); }
  });

  const sections: SectionDef[] = [
    {
      title: 'VISUALISER',
      children: () => (
        <div>
          <InfoBox infoKey="vis-time" infoContent={`<h2>Time Window</h2><p>How many seconds of note history are visible in the waterfall.</p>${srcLink('note-history-visualizer.lit.md', 'Source')}`}>
            <SliderRow def={{
              id: 'vis-time-slider',
              label: 'TIME (s)',
              min: 1, max: 10, step: 0.5, defaultValue: 3,
              formatBadge: (v: number) => v.toFixed(1),
              onChange: (v: number) => { historyVis.setTimeWindow(v); },
            }} />
          </InfoBox>
          <InfoBox infoKey="vis-range" infoContent={`<h2>Range</h2><p>How many octaves centered on D-ref are visible in the waterfall.</p>${srcLink('note-history-visualizer.lit.md', 'Source')}`}>
            <SliderRow def={{
              id: 'vis-range-slider',
              label: 'RANGE',
              min: 2, max: 8, step: 1, defaultValue: 5,
              formatBadge: (v: number) => String(v),
              onChange: (v: number) => {
                const half = Math.floor(v * 12 / 2);
                historyVis.setNoteRange(D_REF_MIDI - half, D_REF_MIDI + half);
              },
            }} />
          </InfoBox>
        </div>
      ),
    },
  ];

  render(() => <SettingsOverlay overlayId="vis-overlay" sections={sections} visible={visible} onToggle={toggle} />, mountEl);
}
```
