# Settings Cog — reusable toggle button for settings overlays

A single SolidJS component used by ALL three settings panels (grid, vis, game).
Renders a 32x32 cog button with consistent styling. The active state shows an
white color inversion (toggled = white bg, black text) matching the design language.

``` {.css file=_generated/components/SettingsCog.css}
.settings-cog {
  width: 32px; height: 32px; font-size: 16px;
  background: var(--bg); color: var(--dim); border: 1px solid var(--border);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-family: var(--font); flex-shrink: 0;
}
.settings-cog:hover { color: var(--fg); border-color: var(--accent); }
.settings-cog.active { color: var(--bg); background: var(--fg); border-color: var(--fg); }
```

``` {.typescript file=_generated/components/SettingsCog.tsx}
import { type JSX } from 'solid-js';
import './SettingsCog.css';

export interface SettingsCogProps {
  id: string;
  active: boolean;
  onClick: () => void;
  position?: 'absolute' | 'relative';
  style?: Record<string, string>;
}

export function SettingsCog(props: SettingsCogProps): JSX.Element {
  return (
    <button
      id={props.id}
      class="settings-cog"
      classList={{ active: props.active }}
      onClick={props.onClick}
      style={{ position: props.position ?? 'absolute', ...props.style }}
      aria-label="Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  );
}
```
