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
import './SongBar.css';

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

## Layout

The song bar is an inline-flex row that wraps on narrow screens. The three
sub-sections — search, status, and calibrate — are each inline-flex with a
small gap. The active calibrate button inverts colors to signal the locked
state. The dropping highlight provides visual feedback during MIDI drag-and-drop.

``` {.css file=_generated/components/SongBar.css}
#song-bar {
  display:inline-flex; align-items:center; gap:8px; padding:2px 0;
  font-size:11px; flex-wrap:wrap; margin-left:auto; max-width:700px;
}
#song-bar-calibrate, #song-bar-search, #song-bar-status {
  display:inline-flex; align-items:center; gap:6px;
}
#calibrate-btn.active { color:var(--bg); background:var(--fg); border-color:var(--fg); cursor:default; }
#song-bar.dropping { outline:2px solid rgba(255,255,255,0.7); outline-offset:-2px; }
```

## Search Results

Results render in an absolutely positioned dropdown. Each result row is a
flex row with the title taking all available space and the source label
pinned to the right. Hover uses the subtle background to confirm interactivity.

``` {.css file=_generated/components/SongBar.css}
.search-result {
  display:flex; justify-content:space-between; align-items:center;
  padding:4px 6px; cursor:pointer; font-family:var(--font);
  font-size:11px; color:var(--fg); border-bottom:1px solid var(--border);
}
.search-result:hover { background:var(--subtle); }
.search-result .result-title {
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;
}
.search-result .result-source { color:var(--dim); font-size:10px; margin-left:8px; flex-shrink:0; }
```

## Search Inputs

The search input has left padding to make room for the inlined magnifying-glass
icon. The results dropdown is hidden until the machine opens it. The max-keys
input is a narrow inline text field. The search sub-section stacks as a column
so the dropdown appears directly below the input row.

``` {.css file=_generated/components/SongBar.css}
#midi-search-input { width:200px; box-sizing:border-box; font-family:var(--font); font-size:10px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:2px 6px 2px 22px; }
#midi-search-results { position:absolute; top:100%; left:0; min-width:280px; max-height:300px; overflow-y:auto; background:var(--bg); border:1px solid var(--border); z-index:25; display:none; }
#max-keys-input { width:3ch; font-family:var(--font); font-size:9px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:1px 2px; text-align:center; }
#song-bar-search { position:relative; flex-direction:column; gap:2px; }
```

## Game Status

The game status section is hidden until a game starts. The song title truncates
at 160 px. The progress bar is a 2 px tall inline-block with a white fill child.
The quantization badge and elapsed timer are dimmed metadata. The hint fades in
after idle time via an opacity transition.

``` {.css file=_generated/components/SongBar.css}
#game-status { display:none; align-items:center; gap:8px; }
#game-song-title { font-family:var(--font); font-size:10px; color:var(--fg); text-transform:uppercase; letter-spacing:0.06em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px; }
#game-progress { width:80px; height:2px; background:var(--border); position:relative; display:inline-block; vertical-align:middle; }
#game-quantization-badge { font-family:var(--font); font-size:9px; color:var(--dim); text-transform:uppercase; letter-spacing:0.06em; }
#song-bar-status { gap:8px; }
#song-bar-hint { display:none; margin-left:auto; transition:opacity 2s ease-in; }
```

## Calibrate

The calibrate section is pushed to the right with `margin-left:auto`. Its
wrap element uses `position:relative` so the absolute-positioned banner can
overlay the button without reflow. The confirm and cancel buttons use green
and red accent colors. The warning label floats above the banner to signal
edge-of-range conditions without blocking the action buttons.

``` {.css file=_generated/components/SongBar.css}
#song-bar-calibrate { margin-left:auto; max-width:320px; gap:4px; overflow:hidden; }
#calibrate-btn { font-family:var(--font); font-size:9px; background:none; color:var(--dim); border:none; padding:2px 8px; cursor:pointer; white-space:nowrap; width:100%; }
#calibration-banner { display:none; font-family:var(--font); font-size:9px; gap:4px; align-items:center; white-space:nowrap; position:absolute; left:0; top:0; right:0; bottom:0; justify-content:center; background:var(--bg); z-index:1; }
#calibration-warning { display:none; position:absolute; left:50%; top:-14px; transform:translateX(-50%); font-size:8px; color:var(--dim); white-space:nowrap; pointer-events:none; }
#calibration-msg { color:var(--fg); }
#calibrate-confirm { font-family:var(--font); font-size:9px; background:none; color:#4f4; border:1px solid #4f4; padding:1px 4px; cursor:pointer; line-height:1; }
#calibrate-cancel { font-family:var(--font); font-size:9px; background:none; color:#f44; border:1px solid #f44; padding:1px 4px; cursor:pointer; line-height:1; }
.calibrate-wrap { position:relative; display:inline-flex; align-items:center; min-width:160px; max-width:220px; overflow:hidden; border:1px solid var(--border); box-sizing:border-box; }
.maxkeys-label { display:inline-flex; align-items:center; gap:2px; font-family:var(--font); font-size:9px; color:var(--dim); }
```

## Utilities

Small structural helpers: the search row and input wrapper handle the icon
overlay. The file input is hidden and triggered programmatically. Game controls
group the progress bar and badge. The upload button is a square icon button.
The progress fill animates width smoothly at 0.1 s.

``` {.css file=_generated/components/SongBar.css}
.search-row { display:inline-flex; align-items:center; gap:4px; }
.search-input-wrap { position:relative; display:inline-flex; align-items:center; }
.search-icon { position:absolute; left:6px; width:12px; height:12px; color:var(--dim); pointer-events:none; }
#midi-file-input { display:none; }
.game-controls { display:flex; gap:6px; align-items:center; }
#game-reset-btn { font-size:10px; padding:2px 6px; }
.upload-btn { flex-shrink:0; min-width:28px; min-height:28px; display:inline-flex; align-items:center; justify-content:center; }
#game-progress-fill { height:100%; background:#fff; width:0%; transition:width 0.1s linear; }
#game-elapsed-timer { font-size:10px; color:var(--dim); font-family:var(--font); min-width:3ch; text-align:right; }
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

```

## Song Bar JSX

The song bar renders three inline-flex sections: search (MIDI song lookup with
file upload), game status (progress bar, timer, score), and calibrate (playable
area range with confirm/cancel). Each section is independently visible and
wraps on narrow screens.

``` {.typescript file=_generated/components/SongBar.tsx}

  return (
    <div id="song-bar">

      <div id="song-bar-search">
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
          class="icon-btn icon-md upload-btn"
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

The status section shows the quantization dropdown and — when a game is
active — the song title, progress bar, elapsed timer, and restart button.

``` {.typescript file=_generated/components/SongBar.tsx}

      <div id="song-bar-status">
        <InfoButton infoKey="quantization" />
        <span class="text-dim-sm">Quant</span>
        <span id="quantization-select-slot" />
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
