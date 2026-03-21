# Vis Overlay Mount

Mounts the SolidJS SettingsOverlay component into the visualiser panel.
This is the bridge between the vanilla TS app and the Solid component system.
The `mountVisOverlay` function is called from app-core during initialization.

``` {.typescript file=_generated/components/mount-vis-overlay.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import type { NoteHistoryVisualizer } from '../lib/note-history-visualizer';
import { D_REF_MIDI } from '../lib/keyboard-layouts';
import { refreshAllSliderUI } from '../app-slider';

export function mountVisOverlay(
  mountEl: HTMLElement,
  cogBtn: HTMLElement,
  historyVis: NoteHistoryVisualizer,
): void {
  const [visible, setVisible] = createSignal(false);

  cogBtn.addEventListener('click', () => {
    setVisible(v => !v);
    cogBtn.classList.toggle('active', visible());
    if (visible()) setTimeout(refreshAllSliderUI, 50);
  });

  const sections: SectionDef[] = [
    {
      title: 'VISUALISER',
      sliders: [
        {
          id: 'vis-time-slider',
          label: 'TIME (s)',
          min: 1, max: 10, step: 0.5, defaultValue: 3,
          formatBadge: (v: number) => v.toFixed(1),
          onChange: (v: number) => { historyVis.setTimeWindow(v); },
        },
        {
          id: 'vis-range-slider',
          label: 'RANGE (octaves)',
          min: 2, max: 8, step: 1, defaultValue: 5,
          formatBadge: (v: number) => String(v),
          onChange: (v: number) => {
            const half = Math.floor(v * 12 / 2);
            historyVis.setNoteRange(D_REF_MIDI - half, D_REF_MIDI + half);
          },
        },
      ],
    },
  ];

  render(() => <SettingsOverlay overlayId="vis-overlay" sections={sections} visible={visible} onToggle={() => setVisible(v => !v)} />, mountEl);
}
```
