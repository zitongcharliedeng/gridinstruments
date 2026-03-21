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
import { InfoButton } from './InfoButton';

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

      <div id="song-bar-search">
        <span class="overlay-section-title">SONG</span>
        <div class="search-row">
        <InfoButton infoKey="search" />
        <div class="search-input-wrap">
          <i
            data-lucide="search"
            class="search-icon"
          />
          <input
            id="midi-search-input"
            type="text"
            placeholder="Search or drop .mid file..."
            onInput={handleSearchInput}
            onFocus={() => { props.onSearchFocus(); }}
            onBlur={() => { props.onSearchBlur(); }}
          />
        </div>
        <input
          type="file"
          id="midi-file-input"
          accept=".mid,.midi"
          onChange={handleFileUpload}
        />
        <button
          class="icon-btn icon-md"
          style="flex-shrink:0;"
          onClick={() => { document.getElementById('midi-file-input')?.click(); }}
          aria-label="Upload MIDI file"
        >
          <i data-lucide="upload" />
        </button>
        <div
          id="midi-search-results"
        />
        </div>
      </div>
```

## Status Section

The status section shows the quantization cycling button and — when a game is
active — the song title, progress bar, elapsed timer, and restart button.

``` {.typescript file=_generated/components/SongBar.tsx}

      <div id="song-bar-status">
        <InfoButton infoKey="quantization" />
        <span class="text-dim-sm">Quant</span>
        <span id="quantization-select-slot"></span>
        <div id="game-status">
          <div id="game-song-title" />
          <div class="game-controls">
            <div id="game-progress">
              <div id="game-progress-fill" />
            </div>
            <div id="game-quantization-badge" />
          </div>
          <span id="game-elapsed-timer" />
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

      <span id="song-bar-hint" />

      <div id="song-bar-calibrate">
        <InfoButton infoKey="maxkeys" />
        <label class="maxkeys-label">
          Max Keys
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            id="max-keys-input"
            value={maxKeys()}
            onChange={handleMaxKeysChange}
          />
        </label>
        <InfoButton infoKey="calibrate" />
        <div class="calibrate-wrap">
          <button
            id="calibrate-btn"
            onClick={() => { props.onCalibrateStart(); }}
          >
            Calibrate Playable Area
          </button>
          <span id="calibration-banner">
            <span id="calibration-warning" />
            <span id="calibration-msg">Confirm?</span>
          <button
            id="calibrate-confirm"
            onClick={() => { props.onCalibrateConfirm(); }}
          >
            &#x2713;
          </button>
          <button
            id="calibrate-cancel"
            onClick={() => { props.onCalibrateCancel(); }}
          >
            &#x2717;
          </button>
        </span>
        </div>
      </div>

    </div>
  );
}
```
