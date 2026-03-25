# Index Page

Single-page HTML for GridInstruments — all CSS inline, all DOM structure.
This is the sole HTML file in the project; everything else is TypeScript
generated from literate sources into `_generated/`.

## Structure

The page is a vertical flex layout (`#app`) with these major sections:

- **Head / CSS** (lines 1--836) — meta tags, Google Fonts import, and a single
  `<style>` block containing the complete design system: CSS variables, icon
  system, top bar, song bar, visualiser panel, grid area, grid settings overlay,
  pedals panel, slider controls, dialogs, chord graffiti, responsive breakpoints.

- **Top bar** (`#top-bar`, line 841) — site title, GitHub star/suggest links,
  fullscreen toggle, and a layout-reset button.

- **Song bar** (`#song-bar`, line 861) — calibration controls, MIDI song search
  input with dropdown results, quantization dropdown, game-mode progress
  display with elapsed timer and restart.

- **Visualiser panel** (`#visualiser-panel`, line 902) — canvas for the note
  history waterfall, with a resize handle that embeds time-window and range
  controls.

- **Grid area** (`#grid-area`, line 920) — the keyboard canvas and the settings
  overlay (`#grid-overlay`) containing sound controls (waveform, volume, tuning
  slider with TET presets, D-reference pitch), visual controls (mech skew,
  wicked shear, zoom, QWERTY labels toggle), and input controls (keyboard
  layout, MIDI device list, pitch bend range, MPE expression checkboxes,
  flat-sound toggle, MPE output).

- **Pedals panel** (`#pedals-panel`, line 1070) — sustain and vibrato pedal
  buttons with a resize handle.

- **Toasts and dialogs** (lines 1080--1094) — keyboard rollover warning toast,
  about dialog, and info dialog (both `<dialog>` elements used with
  `showModal()`).

- **Scripts** (lines 1096--1111) — ES module entry point
  (`/_generated/main.ts`), inline GitHub star-count fetch, and an SVG `<defs>`
  block defining the spray-paint roughen filter for chord graffiti.

## Head — doctype, meta tags, font import, and CSS reset

The document head declares the viewport, page title, SEO description, and loads
JetBrains Mono from Google Fonts. The CSS resets all margin/padding and sets
`box-sizing: border-box` globally. The `:root` block defines the complete
design-token set — background, foreground, dim, border, accent, gap, font
family, and icon sizes — so every component references variables rather than
hard-coded values.

``` {.html file=index.html}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no">
  <title>gridinstruments.xyz — Isomorphic Keyboard Synthesizer</title>
  <meta name="description" content="Live MIDI & keyboard isomorphic synthesizer. DCompose/Wicki-Hayden layout. Explore tunings from 7-TET to 5-TET on the syntonic temperament continuum.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type="number"] { -moz-appearance: textfield; }

    :root {
      --bg: #000;
      --fg: #fff;
      --dim: #666;
      --subtle: #222;
      --border: #333;
      --accent: #888;
      --gap: 8px;
      --font: 'JetBrains Mono', 'Courier New', monospace;
      --icon-sm: 12px;
      --icon-md: 16px;
      --icon-lg: 18px;
    }
```

## Icon system

The `.icon` and `.icon-btn` utility classes make SVG icons behave like inline
text: they respect the surrounding `font-size`, flex-shrink to zero so they
never collapse, and render at exactly the declared size. Three size modifiers
(`-sm`, `-md`, `-lg`) map to the root token values above.

``` {.html file=index.html}

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--icon-size, 1em);
      height: var(--icon-size, 1em);
      font-size: inherit;
      line-height: 1;
      vertical-align: middle;
    }
    .icon-sm {
      --icon-size: var(--icon-sm);
      font-size: var(--icon-sm);
    }
    .icon-md {
      --icon-size: var(--icon-md);
      font-size: var(--icon-md);
    }
    .icon-lg {
      --icon-size: var(--icon-lg);
      font-size: var(--icon-lg);
    }
    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--icon-size, 1em);
      height: var(--icon-size, 1em);
      line-height: 1;
      vertical-align: middle;
      background: none;
      border: none;
      border-radius: 0;
      padding: 0;
      cursor: pointer;
      font-family: var(--font);
      color: inherit;
    }
    .icon svg, .icon-btn svg {
      width: 1em;
      height: 1em;
      display: block;
      flex-shrink: 0;
    }
```

## Base layout — html, body, and app container

The page never scrolls: `overflow: hidden` on both `html`/`body` and `#app`
locks everything inside the viewport. `#app` is a vertical flex column that
fills `100dvh` (dynamic viewport height for mobile), creating the stacked
layout of top bar → song bar → visualiser → grid → pedals.

``` {.html file=index.html}

    html, body {
      background: var(--bg);
      color: var(--fg);
      font-family: var(--font);
      font-size: 13px;
      line-height: 1.4;
      height: 100%;
      overflow: hidden;
      touch-action: manipulation;
    }

    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
    }
```

## Top bar styles

Top bar CSS (`#top-bar`, `#about-btn`, `#reset-layout`) is co-located in
`components/TopBar.lit.md` alongside the component that renders them.

## Song bar styles

Song bar CSS (`#song-bar`, `#song-bar-calibrate/search/status`, `.dropping`)
is co-located in `components/SongBar.lit.md`.

## Visualiser panel and resize handle

`#visualiser-panel` is a fixed-height flex child that collapses to zero when
hidden. The resize handle wraps below the panel's bottom border and uses
`transform: translate(-50%, 100%)` to straddle the seam between the visualiser
and the grid below it. Grip lines are three thin horizontal bars that turn
white on hover to signal draggability.

``` {.html file=index.html}

    #visualiser-panel {
      flex-shrink: 0;
      overflow: visible;
      position: relative;
      z-index: 1;
      transition: height 0.15s ease;
      border-bottom: 1px solid var(--border);
      height: 120px;
    }
    #visualiser-panel.collapsed { height: 0 !important; overflow: visible; border-bottom-width: 0; }
    #visualiser-panel.collapsed #vis-settings-btn { display: none; }
    .panel-resize-handle-wrap {
      position: absolute;
      left: 50%;
      transform: translate(-50%, 100%);
      z-index: 20;
      bottom: 0;
    }
    .pedals-handle-wrap { bottom: auto; top: 0; transform: translate(-50%, -100%); }
     .panel-resize-handle {
       width: auto;
       height: 32px;
       padding: 0 10px;
       cursor: row-resize;
       display: flex;
       flex-direction: row;
       align-items: center;
       justify-content: center;
       gap: 6px;
       background: var(--bg);
       border: 1px solid var(--border);
     }
    .panel-resize-handle:focus-visible { outline: 1px solid var(--accent); }
```

The grip lines inside each handle are three thin horizontal bars; on touch devices they
thicken and fully brighten so they remain visible without a hover state.

``` {.html file=index.html}
    .panel-resize-handle .grip-lines {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .panel-resize-handle .grip-line { width: 14px; height: 1px; background: var(--dim); }
    .panel-resize-handle:hover .grip-line { background: var(--fg); }
    .panel-resize-handle .handle-label {
      font-size: 8px;
      color: var(--dim);
      letter-spacing: 1.5px;
      font-family: var(--font);
      line-height: 1;
      user-select: none;
    }
    .panel-resize-handle:hover .handle-label { color: var(--fg); }
    @media (hover: none) and (pointer: coarse) {
      .panel-resize-handle { min-height: 36px; touch-action: none; border-color: #444; }
      .panel-resize-handle .grip-line { height: 2px; background: var(--fg); }
      .panel-resize-handle .handle-label { color: var(--fg); opacity: 1; font-size: 10px; }
    }
    #history-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
```

## Grid area and keyboard canvas

`#grid-area` takes all remaining vertical space via `flex: 1` and clips any
overflow. The keyboard container fills it completely and suppresses all default
touch behaviour so pointer events reach the canvas unmodified. The `.grid-cog`
button sits in the top-left corner at `z-index: 15`, above the canvas but below
the overlay, and inverts to black-on-white while the overlay is open.

``` {.html file=index.html}

    #grid-area {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }
    #keyboard-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #keyboard-canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }



```

## Grid settings overlay

Overlay CSS (`.settings-overlay`, `.overlay-section`, `.grid-cog`) is co-located in
`components/SettingsOverlay.lit.md`. `#vis-overlay` padding is in
`components/mount-vis-overlay.lit.md`. `#mpe-output-select` hidden hack is in
`components/mount-grid-overlay.lit.md`.

``` {.html file=index.html}
    .hidden { display: none !important; pointer-events: none !important; }
```

## Search results and pedals panel

Search result CSS (`.search-result`) is co-located in `components/SongBar.lit.md`.
Pedals CSS (`.pedal-btn`) is co-located in `components/PedalsPanel.lit.md`.

## Global form input styles

Global form element resets — `<select>`, `<input type="range/number/text">` get
the monospace font and design token colours. `.ctrl-group` and `.ctrl-label`
are co-located in `mount-grid-overlay.lit.md`. `.gi-checkbox` is co-located in
`SettingsOverlay.lit.md`.

``` {.html file=index.html}

    select, input[type="range"], input[type="number"], input[type="text"] {
      font-family: var(--font);
      font-size: 12px;
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--border);
      padding: 3px 6px;
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      outline: none;
    }
    select {
      padding-right: 20px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 6px center;
    }
    select:focus, input:focus { border-color: var(--accent); }
    select option { background: var(--bg); }



```

## Ghosting toast

The ghosting toast appears when a game chord requires more simultaneous keys
than the user's keyboard can register. Pedals CSS is in `PedalsPanel.lit.md`.

``` {.html file=index.html}
    #ghosting-toast { display: none; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 30; background: rgba(0,0,0,0.85); border: 1px solid var(--dim); padding: 12px 16px; font-family: var(--font); font-size: 11px; color: var(--fg); flex-direction: row; align-items: flex-start; gap: 12px; max-width: 400px; }
    #ghosting-toast span { flex: 1; line-height: 1.5; }
    #ghosting-toast-dismiss { background: none; border: none; color: var(--dim); font-family: var(--font); font-size: 14px; cursor: pointer; padding: 0; line-height: 1; flex-shrink: 0; }
```

## Responsive breakpoints

Three `@media` breakpoints progressively compact the top bar and song bar for
tablet (≤768 px), phone (≤480 px), and small phone (≤375 px) viewports. The
star count badge is hidden below 480 px, and the reset-layout button disappears
entirely below 375 px to recover horizontal space for the essential controls.

``` {.html file=index.html}

    @media (max-width: 768px) {
      #top-bar {
        padding: 2px 4px;
      }
      .top-bar-left {
        gap: 4px;
        min-width: 0;
      }
      .gh-btn {
        padding: 2px 4px;
        font-size: 9px;
      }
      #reset-layout {
        font-size: 8px;
        padding: 1px 4px;
      }
      #song-bar {
        padding: 2px 4px;
        gap: 6px;
        font-size: 10px;
      }
      #midi-search-input {
        width: 150px;
      }
    }
```

At 480 px and below, the top bar wraps its children, the star count badge is hidden to
save horizontal space, and the song bar reduces its gap and font size for phone viewports.

``` {.html file=index.html}

    @media (max-width: 480px) {
      .settings-overlay { padding: 28px 6px 6px 28px; }
      #top-bar {
        padding: 2px 4px;
        flex-wrap: wrap;
        min-height: 0;
        gap: 4px;
      }
      .top-bar-left {
        flex-wrap: wrap;
        gap: 4px;
        min-width: 0;
      }
      .top-bar-left .slider-info-btn { display: none; }
      #song-bar .slider-info-btn { display: none; }
      .site-title {
        font-size: 10px;
      }
      .gh-btn {
        flex-shrink: 0;
      }
      .gh-mark {
        padding: 2px 4px;
      }
      .gh-mark svg {
        width: 16px;
        height: 16px;
        min-width: 16px;
        min-height: 16px;
      }
      #star-count-badge {
        display: none;
      }
      #reset-layout {
        font-size: 8px;
        padding: 1px 4px;
        margin-left: 2px;
      }
    }
```

Still within the 480 px breakpoint, the visualiser panel and history canvas are clamped
to full viewport width to prevent overflow, and the song bar wraps its children at reduced
gap and font size.

``` {.html file=index.html}
    @media (max-width: 480px) {
      #visualiser-panel {
        max-width: 100%;
        overflow: hidden;
      }
      #history-canvas {
        max-width: 100%;
      }
      #song-bar {
        padding: 2px 4px;
        gap: 4px;
        font-size: 10px;
        flex-wrap: wrap;
      }
      #midi-search-input {
        width: 120px;
      }
    }
```

At 375 px (small phones), the site title shrinks further, the reset-layout button is
hidden entirely, and the song bar compresses to its minimum height and search width.

``` {.html file=index.html}

    @media (max-width: 375px) {
      .site-title {
        font-size: 9px;
      }
      #reset-layout {
        display: none;
      }
      #song-bar {
        padding: 1px 4px;
        gap: 4px;
        font-size: 9px;
        min-height: 24px;
      }
      #midi-search-input {
        width: 100px;
      }
    }
  </style>
</head>
```

## Body — top bar DOM

The `<body>` contains a single `#app` flex column. The top bar header holds the
site title, GitHub badge, fullscreen toggle, and reset-layout button on the
left, and the song bar (search, game status, calibration) on the right. The
song bar wraps below the title on narrow viewports.

``` {.html file=index.html}
<body>
  <div id="app">

    <!-- Top bar -->
    <header id="top-bar">
      <div class="top-bar-left" id="topbar-mount"></div>
      <!-- Song/game controls — right side of header, wraps on narrow — mounted by SolidJS SongBar component -->
      <div id="songbar-mount"></div>
    </header>
```

## Global settings bar DOM

The global settings bar sits between the top bar and the visualiser panel. It
## Visualiser panel DOM

The visualiser panel holds the `#history-canvas` that the note-history
visualiser renders into. Its resize handle widget is injected below the panel's
bottom border; `data-*` attributes declare the min/max/default heights and the
`localStorage` keys used to persist the panel size across sessions.

``` {.html file=index.html}

    <!-- Visualiser panel -->
    <div id="visualiser-panel">
      <canvas id="history-canvas" height="120"></canvas>
      <span id="vis-cog-mount"></span>
      <div id="vis-overlay-mount"></div>
      <div class="panel-resize-handle-wrap">
         <div class="panel-resize-handle" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="Resize visualiser" data-target="visualiser-panel" data-min="60" data-max="400" data-default="120" data-key="gi_visualiser_h" data-hidden-key="gi_history_hidden"><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span><span class="handle-label">VISUALISER</span><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span></div>
      </div>
    </div>
```

## Grid area DOM — keyboard canvas and settings overlay

The grid area contains the keyboard canvas and the settings overlay mount point.
The overlay content (SOUND, VISUAL, INPUT sections) is rendered by the SolidJS
`mountGridOverlay` component from `_generated/components/mount-grid-overlay.tsx`.
The cog button (`#grid-settings-btn`) stays in HTML; only the overlay content
becomes a Solid component.

``` {.html file=index.html}

    <!-- Grid area -->
    <div id="grid-area">
      <div id="keyboard-container">
        <canvas id="keyboard-canvas"></canvas>
         <span id="grid-cog-mount"></span>

        <!-- Grid settings overlay — mounted by SolidJS (see mount-grid-overlay.tsx) -->
        <div id="grid-overlay-mount"></div>

      </div>
    </div>
```

## Pedals panel DOM

The pedals panel sits at the bottom of the app column. Its resize handle
projects upward into the grid area seam via the `.pedals-handle-wrap` modifier.
The two pedal buttons — sustain and vibrato — each occupy half the row and are
toggled active/inactive by the state machine on hold/release events.

``` {.html file=index.html}

    <!-- Pedals -->
    <div id="pedals-panel">
      <div class="panel-resize-handle-wrap pedals-handle-wrap">
         <div class="panel-resize-handle" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="Resize pedals" data-target="pedals-panel" data-min="30" data-max="120" data-default="44" data-key="gi_pedals_h" data-direction="up" data-hidden-key="gi_pedals_hidden"><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span><span class="handle-label">PEDALS</span><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span></div>
      </div>
      <div id="pedals-mount"></div>
    </div>

   </div>
```

## Toast, dialogs, scripts, and SVG filter

The ghosting toast appears at the bottom-centre of the screen when keyboard
rollover is detected, prompting the player to switch to MIDI or touchscreen for
polyphonic chords. The two `<dialog>` elements use `showModal()` and carry their
content in dynamically-populated `<div>` children. The module script entry
point loads `_generated/main.ts`; a small inline script fetches the live GitHub
star count without blocking page load. The SVG `<defs>` block defines the
`spray-roughen` displacement filter used by chord graffiti to give roughjs
strokes a hand-drawn texture.

``` {.html file=index.html}

   <!-- Keyboard rollover warning toast -->
   <div id="ghosting-toast">
     <span>Your keyboard may limit simultaneous notes. For full chords, connect a MIDI controller or use touchscreen.</span>
     <button id="ghosting-toast-dismiss">✕</button>
   </div>

   <dialog id="about-dialog">
    <div id="about-content" class="about-content"></div>
  </dialog>
  <button id="about-close" class="dialog-close-btn">&#x2715;</button>

  <dialog id="info-dialog">
    <div id="info-content" class="about-content"></div>
  </dialog>
  <button id="info-close" class="dialog-close-btn">&#x2715;</button>

  <script type="module" src="/_generated/main.ts"></script>
  <script>
    fetch('https://api.github.com/repos/zitongcharliedeng/gridinstruments')
      .then(r => r.json()).then(d => {
        const el = document.getElementById('star-count-badge');
        if (el && typeof d.stargazers_count === 'number') el.textContent = d.stargazers_count.toLocaleString();
      }).catch(() => {});
  </script>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <filter id="spray-roughen" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.05 0.07" numOctaves="4" seed="3" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>
  </svg>
</body>
</html>
```
