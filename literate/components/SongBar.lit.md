# SongBar Component

The SongBar is the horizontal bar below the top bar containing MIDI song search,
quantization cycling, game status display, and calibration controls. It is the
primary entry point for Piano Tiles game mode.

This SolidJS component replaces the hand-coded HTML in `index.html`. Props carry
all callbacks outward so the component remains a pure presenter — no direct DOM
manipulation inside.

## Props Interface

``` {.typescript file=_generated/components/SongBar.tsx}
import { createSignal, type JSX } from 'solid-js';

export interface SongBarProps {
  onSearch: (query: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onQuantizationCycle: (value: string) => void;
  onGameReset: () => void;
  onCalibrateStart: () => void;
  onCalibrateConfirm: () => void;
  onCalibrateCancel: () => void;
  onMaxKeysChange: (n: number) => void;
  initialMaxKeys?: number;
}
```

## Search Section

The search section contains an info button, a search input with an inlined
magnifying-glass icon, and the results dropdown. The dropdown is absolutely
positioned below the input wrapper so it overlays content below without pushing
layout.

``` {.typescript file=_generated/components/SongBar.tsx}

export function SongBar(props: SongBarProps): JSX.Element {
  const [maxKeys, setMaxKeys] = createSignal(props.initialMaxKeys ?? 8);

  const handleSearchInput = (e: Event): void => {
    props.onSearch((e.target as HTMLInputElement).value);
  };

  const handleMaxKeysChange = (e: Event): void => {
    const val = Math.max(1, parseInt((e.target as HTMLInputElement).value, 10) || 8);
    setMaxKeys(val);
    props.onMaxKeysChange(val);
  };

  const handleFileUpload = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file?.name.endsWith('.mid') || file?.name.endsWith('.midi')) {
      document.getElementById('song-bar')?.dispatchEvent(new CustomEvent('midi-file-upload', { detail: file, bubbles: true }));
    }
    input.value = '';
  };

  return (
    <div id="song-bar">

      <div id="song-bar-search" style="position:relative;display:inline-flex;align-items:center;gap:4px;">
        <button class="slider-info-btn" data-info="search">
          <i data-lucide="info" />
        </button>
        <div style="position:relative;display:inline-flex;align-items:center;">
          <i
            data-lucide="search"
            style="position:absolute;left:6px;width:12px;height:12px;color:var(--dim);pointer-events:none;"
          />
          <input
            id="midi-search-input"
            type="text"
            placeholder="Search or drop .mid file..."
            style="width:200px;box-sizing:border-box;font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px 2px 22px;"
            onInput={handleSearchInput}
            onFocus={() => { props.onSearchFocus(); }}
            onBlur={() => { props.onSearchBlur(); }}
          />
        </div>
        <input
          type="file"
          id="midi-file-input"
          accept=".mid,.midi"
          style="display:none;"
          onChange={handleFileUpload}
        />
        <button
          style="font-family:var(--font);font-size:9px;background:none;color:var(--dim);border:1px solid var(--border);padding:2px 4px;cursor:pointer;flex-shrink:0;"
          onClick={() => { document.getElementById('midi-file-input')?.click(); }}
        >
          <i data-lucide="upload" style="width:10px;height:10px;" />
        </button>
        <div
          id="midi-search-results"
          style="position:absolute;top:100%;left:0;min-width:280px;max-height:300px;overflow-y:auto;background:var(--bg);border:1px solid var(--border);z-index:25;display:none;"
        />
      </div>
```

## Status Section

The status section shows the quantization cycling button and — when a game is
active — the song title, progress bar, elapsed timer, and restart button.

``` {.typescript file=_generated/components/SongBar.tsx}

      <div id="song-bar-status" style="display:inline-flex;align-items:center;gap:8px;">
        <button class="slider-info-btn" data-info="quantization">
          <i data-lucide="info" />
        </button>
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--dim);">
          Quant
          <button
            id="quantization-level"
            style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;"
            value="none"
          >
            None
          </button>
        </label>
        <div id="game-status" style="display:none;align-items:center;gap:8px;">
          <div
            id="game-song-title"
            style="font-family:var(--font);font-size:10px;color:var(--fg);text-transform:uppercase;letter-spacing:0.06em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"
          />
          <div style="display:flex;gap:6px;align-items:center;">
            <div
              id="game-progress"
              style="width:80px;height:2px;background:var(--border);position:relative;display:inline-block;vertical-align:middle;"
            >
              <div
                id="game-progress-fill"
                style="height:100%;background:#fff;width:0%;transition:width 0.1s linear;"
              />
            </div>
            <div
              id="game-quantization-badge"
              style="font-family:var(--font);font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;"
            />
          </div>
          <span
            id="game-elapsed-timer"
            style="font-size:10px;color:var(--dim);font-family:var(--font);min-width:3ch;text-align:right;"
          />
          <button
            id="game-reset-btn"
            class="overlay-btn"
            style="font-size:10px;padding:2px 6px;"
            onClick={() => { props.onGameReset(); }}
          >
            &#x27F2; Restart
          </button>
        </div>
      </div>
```

## Hint and Calibrate Section

The hint fades in when the user is idle — managed externally by toggling
`style.opacity`. The calibrate section lets MIDI users define their playable
range. The banner with confirm/cancel actions appears when calibration is active.

``` {.typescript file=_generated/components/SongBar.tsx}

      <span id="song-bar-hint" style="display:none;" />

      <div id="song-bar-calibrate" style="margin-left:auto;max-width:320px;display:inline-flex;align-items:center;gap:4px;overflow:hidden;">
        <button class="slider-info-btn" data-info="calibrate">
          <i data-lucide="info" />
        </button>
        <button class="slider-info-btn" data-info="maxkeys"><i data-lucide="info" /></button>
        <label style="display:inline-flex;align-items:center;gap:2px;font-family:var(--font);font-size:9px;color:var(--dim);">
          Max Keys
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            id="max-keys-input"
            value={maxKeys()}
            style="width:3ch;font-family:var(--font);font-size:9px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:1px 2px;text-align:center;"
            onChange={handleMaxKeysChange}
          />
        </label>
        <button
          id="calibrate-btn"
          style="font-family:var(--font);font-size:9px;background:none;color:var(--dim);border:1px solid var(--border);padding:2px 8px;cursor:pointer;"
          onClick={() => { props.onCalibrateStart(); }}
        >
          Calibrate Playable Area
        </button>
        <span
          id="calibration-banner"
          style="display:none;font-family:var(--font);font-size:9px;gap:2px;align-items:center;max-width:200px;white-space:nowrap;overflow:hidden;"
        >
          <span id="calibration-warning" style="display:none;" />
          <span id="calibration-msg" style="color:var(--fg);overflow:hidden;text-overflow:ellipsis;">Play reachable notes</span>
          <button
            id="calibrate-confirm"
            style="font-family:var(--font);font-size:9px;background:none;color:#4f4;border:1px solid #4f4;padding:1px 4px;cursor:pointer;line-height:1;"
            onClick={() => { props.onCalibrateConfirm(); }}
          >
            &#x2713;
          </button>
          <button
            id="calibrate-cancel"
            style="font-family:var(--font);font-size:9px;background:none;color:#f44;border:1px solid #f44;padding:1px 4px;cursor:pointer;line-height:1;"
            onClick={() => { props.onCalibrateCancel(); }}
          >
            &#x2717;
          </button>
        </span>
      </div>

    </div>
  );
}
```
