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
  input with dropdown results, quantization cycling button, game-mode progress
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
  <title>GridInstruments — Isomorphic Keyboard Synthesizer</title>
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
      touch-action: none;
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

`#top-bar` is a flex row that wraps on narrow screens. The left side groups the
site title, GitHub badge (star + suggest), fullscreen, and reset-layout
buttons. The `.gh-actions` badge mimics a GitHub badge widget with a mark,
star count, and suggest link as adjacent inline-flex children separated by
`var(--border)` lines.

``` {.html file=index.html}

    #top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 6px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      position: relative;
      z-index: 30;
      flex-wrap: wrap;
    }
    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .site-title { font-weight: 700; font-size: 11px; color: #fff; letter-spacing: 0.04em; }
    .gh-actions {
      display: inline-flex; align-items: center;
      border: 1px solid var(--border);
      font-size: 10px;
    }
     .gh-mark {
       padding: 2px 6px;
       border-right: 1px solid var(--border);
       background: var(--subtle);
     }
    .gh-mark svg { flex: 0 0 auto; width: 1em; height: 1em; fill: #fff; }
    .gh-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px;
      font-family: var(--font); font-size: 10px; color: #fff;
      text-decoration: none;
    }
    .gh-btn + .gh-btn { border-left: 1px solid var(--border); }
    .gh-btn:hover { color: var(--fg); background: var(--subtle); }
    .gh-btn svg { fill: currentColor; }
     .gh-btn .star-icon { color: #FFD700; }
    .gh-suggest { color: #4caf50; }

    .gh-suggest svg { fill: #4caf50; }
    .gh-suggest:hover { color: #66bb6a; background: var(--subtle); }
```

The about button and reset-layout button sit at the far right of `.top-bar-left`; both
use dim text at rest and brighten on hover.

``` {.html file=index.html}
     #about-btn {
       font-size: 11px;
       color: var(--dim);
       padding: 0 2px;
     }
    #about-btn:hover { color: var(--fg); }
    #reset-layout {
      font-family: var(--font); font-size: 9px; color: var(--dim);
      background: none; border: 1px solid var(--border);
      padding: 2px 6px; cursor: pointer; margin-left: 4px;
    }
    #reset-layout:hover { color: var(--fg); border-color: var(--accent); }
```

## Song bar styles

`#song-bar` floats on the right side of the header and wraps below the site
title on narrow screens. Its three child sections — search, status/game, and
calibrate — each use `inline-flex` to keep their controls tight. The
`.dropping` outline flashes when a `.mid` file is dragged over the bar.

``` {.html file=index.html}

    #song-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
      font-size: 11px;
      flex-wrap: wrap;
      margin-left: auto;
      max-width: 700px;
    }
    #song-bar-calibrate,
    #song-bar-search,
    #song-bar-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    #song-bar #calibrate-btn { font-size: 10px; padding: 2px 8px; }
    #calibrate-btn.active { color: var(--bg); background: var(--fg); border-color: var(--bg); cursor: default; }
    #song-bar #calibration-banner { gap: 2px; }
    #song-bar.dropping {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: -2px;
    }
    #song-bar-hint {
      margin-left: auto;
      transition: opacity 2s ease-in;
    }


    .graffiti-overlay {
      transition: opacity 1.5s ease;
    }
```

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



     .grid-cog {
       position: absolute;
       z-index: 15;
       width: 32px;
       height: 32px;
       font-size: 16px;
       background: var(--bg);
       color: var(--dim);
       border: 1px solid var(--border);
       cursor: pointer;
       display: flex;
       align-items: center;
       justify-content: center;
       font-family: var(--font);
     }
     #grid-settings-btn { top: 8px; left: 8px; }
     #vis-settings-btn { top: 4px; right: 4px; }
     .grid-cog:hover { color: var(--fg); border-color: var(--accent); }
      .grid-cog.active { color: var(--bg); background: var(--fg); border-color: var(--fg); }
```

## Grid settings overlay

`#grid-overlay` covers the entire keyboard area with a semi-transparent
frosted background. A slow CSS `shimmer` animation sweeps a subtle highlight
across it to make the overlay feel alive. The `hidden` class toggles visibility
via `display: none`. Overlay sections use `.overlay-section-title` for
uppercase, letter-spaced category headings and `.overlay-btn` for action
buttons that invert on hover.

``` {.html file=index.html}

    .settings-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(30, 30, 32, 0.78);
      z-index: 12;
      padding: 40px 12px 12px 40px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--dim) transparent;
      touch-action: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    .settings-overlay::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.04) 80%);
      box-shadow: inset 0 0 40px rgba(255,255,255,0.04);
      background-size: 300% 100%;
      animation: shimmer 60s linear infinite;
      pointer-events: none;
      z-index: 0;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -100% 0; }
    }
    #vis-overlay {
      left: auto;
      right: 0;
      bottom: auto;
      top: 36px;
      width: 280px;
      min-height: 0;
      padding: 8px 12px;
    }
    #vis-overlay .overlay-section { margin-left: 0; }
    .hidden { display: none !important; pointer-events: none !important; }
    .dimmed { opacity: 0.3; pointer-events: none; transition: opacity 0.3s ease; }

    #mpe-output-select {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      opacity: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border-width: 0 !important;
    }
```

The overlay sections use `.overlay-section` as a vertical flex column for labelled control
groups, and `.overlay-btn` as the standard action button style — uppercase, high-contrast,
inverting on hover.

``` {.html file=index.html}
    .overlay-section {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-left: 40px;
      margin-bottom: 8px;
    }
    .overlay-section .ctrl-label { color: #fff; }
    .overlay-section .slider-track { width: 100%; }
    .overlay-section .tuning-slider-area {
      position: relative;
      width: 100%;
      margin-bottom: 40px;
    }
    .overlay-section .tuning-slider-area .slider-track { width: calc(100% - 18px); }
    .overlay-section-title {
       font-size: 11px;
       color: var(--dim);
       text-transform: uppercase;
       letter-spacing: 0.08em;
       font-family: var(--font);
       font-weight: 700;
       display: flex;
       align-items: center;
       gap: 6px;
     }
     .overlay-section-title:hover {
        color: var(--fg);
      }
    .overlay-btn {
      font-family: var(--font);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: #000;
      color: #fff;
      border: 1px solid var(--dim);
      padding: 6px 12px;
      cursor: pointer;
      user-select: none;
    }
    .overlay-btn:hover { border-color: var(--fg); }
    .overlay-btn:active { background: var(--subtle); }
```

## Search results and pedals panel

`.search-result` rows are used inside the MIDI song search dropdown: each row
shows a truncated title on the left and a dimmed source label on the right. The
`#pedals-panel` is a fixed-height flex row that collapses to zero height when
hidden. Each `.pedal-btn` occupies half the row and inverts to white-on-black
while held, matching the sustain and vibrato active states managed by the state
machine.

``` {.html file=index.html}

    .search-result {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      cursor: pointer;
      font-family: var(--font);
      font-size: 11px;
      color: var(--fg);
      border-bottom: 1px solid var(--border);
    }
    .search-result:hover { background: var(--subtle); }
    .search-result .result-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    .search-result .result-source {
      color: var(--dim);
      font-size: 10px;
      margin-left: 8px;
      flex-shrink: 0;
    }
    #midi-search-results .search-status {
      font-family: var(--font);
      font-size: 11px;
      color: var(--dim);
      padding: 4px 0;
    }
```

The pedals panel stacks two full-width `.pedal-btn` elements separated by a 1px gap.
Each button inverts to white-on-black when held, driven by the `.active` class toggled
by the state machine.

``` {.html file=index.html}

    #pedals-panel {
      flex-shrink: 0;
      display: flex;
      gap: 1px;
      background: var(--border);
      overflow: visible;
      position: relative;
      z-index: 1;
      border-top: 1px solid var(--border);
    }
    #pedals-panel.collapsed { height: 0 !important; overflow: visible; }
    .pedal-btn {
      flex: 1;
      padding: 12px 0;
      font-family: var(--font);
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--dim);
      background: var(--bg);
      border: none;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
    }
    @media (hover: hover) {
      .pedal-btn:hover { color: var(--fg); background: var(--subtle); }
    }
    .pedal-btn.active { color: var(--bg); background: var(--fg); }
```

## Control group and form input styles

`.ctrl-group` and `.ctrl-label` are the base layout primitives for labelled
control rows throughout the overlay and top bar. All `<select>`, `<input
type="range">`, `<input type="number">`, and `<input type="text">` elements
inherit the monospace font and the design token colour scheme. The custom
`.gi-checkbox` replaces the native checkbox with a 14×14 block that inverts to
white when checked and draws a CSS-only checkmark via a pseudo-element.

``` {.html file=index.html}

    .ctrl-group {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }
    .ctrl-label {
      font-size: 11px;
      color: var(--dim);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      pointer-events: none;
    }

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



    .gi-checkbox { position: relative; display: inline-block; width: 14px; height: 14px; cursor: pointer; vertical-align: middle; }
    .gi-checkbox input { position: absolute; inset: 0; margin: 0; cursor: pointer; appearance: none; -webkit-appearance: none; background: transparent; border: none; z-index: 1; }
    .gi-checkbox .gi-check { display: block; width: 14px; height: 14px; border: 1px solid var(--border); background: var(--bg); pointer-events: none; }
    .gi-checkbox input:checked + .gi-check { background: var(--fg); border-color: var(--fg); }
    .gi-checkbox input:checked + .gi-check::after { content: ''; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px; border: solid var(--bg); border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .gi-checkbox input:focus-visible + .gi-check { border-color: var(--accent); }
```

## Slider track and value badge

The `<input type="range">` thumb is a 6×18px white vertical bar with no
border-radius, matching the sharp-corners design language. `.slider-track`
wraps a range input with optional label overlay and value badge in a relative
container so the badge can be positioned absolutely above the thumb. The editable
`input.badge-input` allows direct numeric entry and shows a red border when the
value is invalid. The `.slider-reset` button is a compact 22×18px target that
appears to the right of every slider.

``` {.html file=index.html}

    input[type="range"] {
      padding: 0;
      height: 18px;
      border: none;
      cursor: pointer;
      background: #000;
      -webkit-appearance: none;
      appearance: none;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 18px;
      background: inherit;
    }
    input[type="range"]::-moz-range-track {
      height: 18px;
      background: inherit;
      border: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 6px;
      height: 18px;
      background: var(--fg);
      cursor: grab;
    }
    input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }
    input[type="range"]::-moz-range-thumb {
      width: 6px;
      height: 18px;
      background: var(--fg);
      cursor: grab;
      border: none;
      border-radius: 0;
    }
    input[type="range"]::-moz-range-thumb:active { cursor: grabbing; }

```

The `.slider-track` container uses flexbox to align the range input, label overlay,
value badge, and reset button in a single row. The label overlay floats above the
track via absolute positioning with `mix-blend-mode: difference` so it stays readable
against the filled portion. The badge sits above the thumb for live feedback.

``` {.html file=index.html}
    .slider-track {
      position: relative;
      display: flex;
      align-items: center;
      gap: 2px;
      overflow: visible;
    }
    .slider-track input[type="range"] {
      flex: 1;
      min-width: 0;
      margin: 0;
    }
    .slider-label-overlay {
      position: absolute;
      left: 4px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 9px;
      color: #fff;
      mix-blend-mode: difference;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      pointer-events: none;
      z-index: 1;
      white-space: nowrap;
      line-height: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: calc(100% - 30px);
    }
```

The `.slider-value-badge` floats above the thumb for live readout, while `.badge-input`
replaces it with an editable text field that accepts direct numeric entry and shows a red
border on invalid input.

``` {.html file=index.html}
    .slider-value-badge {
      position: absolute;
      bottom: 100%;
      transform: translateX(-50%);
      font-size: 9px;
      color: #fff;
      background: none;
      padding: 0 3px;
      white-space: nowrap;
      z-index: 2;
      line-height: 14px;
      height: 14px;
      pointer-events: none;
      text-align: center;
      font-family: var(--font);
    }
    input.badge-input {
      position: absolute;
      bottom: 100%;
      transform: translateX(-50%);
      font-size: 9px;
      color: #fff;
      background: none;
      padding: 0 3px;
      white-space: nowrap;
      z-index: 2;
      line-height: 14px;
      height: 14px;
      text-align: center;
      font-family: var(--font);
      border: 1px solid transparent;
      width: 50px;
      pointer-events: auto;
      cursor: text;
      outline: none;
    }
    input.badge-input:focus {
      border-color: var(--accent);
      background: var(--subtle);
    }
    input.badge-input:invalid {
      border-color: #cc3333;
    }
```

The slider reset button is a compact 22×18px icon placed at the end of each slider
track. It uses the dim color at rest and brightens on hover to signal interactivity.

``` {.html file=index.html}
     .slider-reset {
       color: var(--dim);
       background: var(--bg); border: 1px solid var(--border);
       width: 22px; height: 18px; padding: 0;
       flex-shrink: 0; margin-left: 2px;
     }
    .slider-reset:hover { color: var(--fg); border-color: var(--accent); }
```

## TET preset marks and slider info button

The TET preset marks and `.slider-presets` container sit below a slider track
using absolute positioning relative to `.tuning-slider-area`. Each mark
consists of a vertical tick (short or staggered-tall to avoid label collisions)
and a small clickable `.slider-preset-btn` that snaps the slider to the named
EDO. Active marks turn green (`#4f4`) to indicate the current temperament. The
`.slider-info-btn` is an inline info-circle icon that opens the contextual help
dialog for that parameter.

``` {.html file=index.html}

    .tuning-slider-area .slider-track { width: 100%; }
    .tet-presets, .slider-presets {
      position: absolute;
      left: 18px; right: 26px;
      top: 100%;
      pointer-events: none;
      overflow: visible;
      min-height: 32px;
      padding-bottom: 4px;
    }
    .slider-preset-mark {
      position: absolute;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      top: 0;
    }
    .slider-tick {
      width: 1px;
      background: #666;
    }
    .slider-tick-long {
      height: 14px;
    }
     .slider-tick-staggered {
       height: 24px;
     }
     .slider-tick-staggered + .slider-preset-btn {
       margin-top: 1px;
     }
     .slider-preset-btn {
      font-family: var(--font);
      font-size: 8px;
      color: var(--dim);
      background: none;
      border: none;
      cursor: pointer;
      pointer-events: auto;
      padding: 2px;
      line-height: 1;
    }
     .slider-preset-btn:hover { color: var(--fg); }
     .slider-preset-btn.active { color: #4f4; text-decoration: underline; }
     .slider-preset-mark.active .slider-tick { background: #4f4; }
     .slider-preset-mark.active .slider-preset-btn { color: #4f4; }
```

`.slider-info-btn` is an inline square icon that opens contextual help for its
adjacent control. By default it flows inline (static position) so it sits
naturally to the left of whatever component it accompanies. Inside
`.tuning-slider-area`, it switches to absolute positioning at the left edge
of the slider track. `.midi-panel-row` provides a flex row for MIDI control
label+input pairs in the INPUT section.

``` {.html file=index.html}
     .midi-panel-row {
      display: flex; align-items: center; gap: 2px;
      font-size: 11px; flex-wrap: wrap;
    }
    .mt-18 { margin-top: 18px; }
    .expr-label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; }
    .ctrl-label { font-size: 9px; text-transform: uppercase; white-space: nowrap; color: #fff; flex-shrink: 0; }
     .slider-info-btn {
       position: relative;
       transform: none;
       z-index: 3;
       color: var(--dim);
       width: 14px; height: 14px;
       padding: 0;
       display: inline-flex; align-items: center; justify-content: center;
       border: 1px solid #555;
       background: var(--bg);
       opacity: 1;
       cursor: pointer;
       flex-shrink: 0;
       vertical-align: middle;
       margin-right: 2px;
       font-family: var(--font);
       font-size: 9px;
       font-style: italic;
       line-height: 1;
     }
    .slider-info-btn svg { display: none; }
    .slider-info-btn:hover { opacity: 1; color: var(--accent, #4af); border-color: var(--accent, #4af); }
    .slider-info-btn.active { color: var(--bg); background: var(--fg); border-color: var(--fg); }
    .tuning-slider-area .slider-info-btn {
      position: absolute;
      left: 0; top: 50%;
      transform: translateY(-50%);
    }
    .slider-info-btn .info-preview {
      display: none;
      position: absolute;
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      margin-left: 6px;
      background: rgba(20, 20, 22, 0.95);
      border: 1px solid var(--border);
      padding: 6px 8px;
      font-size: 9px;
      color: var(--dim);
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      z-index: 30;
      pointer-events: none;
    }
    .slider-info-btn:hover .info-preview { display: block; }
    .tuning-slider-area .slider-track { margin-left: 18px; width: calc(100% - 18px); }
```

## Dialog and about content styles

The `.about-content` typography stack styles the rich text inside both the
About and Info dialogs: heading hierarchy, paragraph spacing, inline code
highlights, and a simple table style for the controls reference. The native
`<dialog>` element gets the design-token colour scheme, a max-height scroll,
and a darkened backdrop. The close button is absolutely positioned in the
top-right corner.

``` {.html file=index.html}

    .about-content h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent, #4af); margin: 24px 0 8px; border-bottom: 1px solid #222; padding-bottom: 4px; }
    .about-content h3 { font-size: 12px; color: #aaa; margin: 16px 0 4px; }
    .about-content p { font-size: 12px; line-height: 1.6; color: #ccc; margin: 8px 0; }
    .about-content ul { margin: 8px 0; padding-left: 16px; }
    .about-content li { font-size: 12px; line-height: 1.6; color: #ccc; margin: 2px 0; }
    .about-content a { color: var(--accent, #4af); text-decoration: none; }
    .about-content a:hover { text-decoration: underline; }
    .about-content code { font-size: 11px; color: #f9a; background: #1a1a1a; padding: 1px 4px; }
    .about-content table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .about-content td { padding: 4px 8px; border-bottom: 1px solid #222; font-size: 11px; color: #ccc; }
    .about-content td:first-child { white-space: nowrap; }
    dialog {
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--border);
      padding: 24px;
      max-width: 560px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      font-family: var(--font);
    }
    dialog::backdrop { background: rgba(0,0,0,0.7); }
    #info-dialog, #about-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: min(90vw, 600px);
      max-height: 80vh;
      overflow-y: auto;
      border: 1px solid var(--border);
    }
     dialog button {
       position: absolute; top: 8px; right: 12px;
       color: var(--dim);
     }
    dialog button:hover { color: var(--fg); }
```

## Chord graffiti overlay and instructions block

The `.graffiti-overlay` is an SVG layer that sits above the keyboard canvas at
`z-index: 5` with `mix-blend-mode: screen`, making the yellow roughjs chord
shapes blend additively against the dark grid background. The `#instructions`
block renders a compact keyboard shortcut reference with monospace `<kbd>`
styling.

``` {.html file=index.html}

    .graffiti-overlay {
      position: absolute;
      pointer-events: none;
      mix-blend-mode: screen;
      z-index: 5;
      transition: opacity 1.5s ease;
    }
    .graffiti-label {
      font-family: var(--font);
      font-size: 14px;
      font-style: italic;
      fill: #FFD700;
      opacity: 0.9;
    }




    #instructions {
      font-size: 11px;
      color: var(--dim);
      border: 1px solid var(--border);
      padding: 8px 12px;
      line-height: 1.7;
    }
    #instructions kbd {
      background: var(--subtle);
      border: 1px solid var(--border);
      padding: 1px 4px;
      font-family: var(--font);
      font-size: 10px;
    }
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
      #song-bar #midi-search-input {
        width: 150px;
      }
    }
```

At 480 px and below, the top bar wraps its children, the star count badge is hidden to
save horizontal space, and the song bar reduces its gap and font size for phone viewports.

``` {.html file=index.html}

    @media (max-width: 480px) {
      .settings-overlay { padding: 36px 8px 8px 36px; }
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
      #song-bar #midi-search-input {
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
      #song-bar #midi-search-input {
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
      <button id="vis-settings-btn" class="grid-cog icon-btn icon-md"><i data-lucide="settings"></i></button>
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
         <button id="grid-settings-btn" class="grid-cog icon-btn icon-md"><i data-lucide="settings"></i></button>

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
    <div id="pedals-panel" style="height:44px">
      <div class="panel-resize-handle-wrap pedals-handle-wrap">
         <div class="panel-resize-handle" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="Resize pedals" data-target="pedals-panel" data-min="30" data-max="120" data-default="44" data-key="gi_pedals_h" data-direction="up" data-hidden-key="gi_pedals_hidden"><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span><span class="handle-label">PEDALS</span><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span></div>
      </div>
      <div id="pedals-mount" style="display:contents"></div>
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
   <div id="ghosting-toast" style="display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(0,0,0,0.85);border:1px solid var(--dim);padding:12px 16px;font-family:var(--font);font-size:11px;color:var(--fg);flex-direction:row;align-items:flex-start;gap:12px;max-width:400px;">
     <span style="flex:1;line-height:1.5;">Your keyboard may limit simultaneous notes. For full chords, connect a MIDI controller or use touchscreen.</span>
     <button id="ghosting-toast-dismiss" style="background:none;border:none;color:var(--dim);font-family:var(--font);font-size:14px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;">✕</button>
   </div>

   <dialog id="about-dialog">
    <button id="about-close" class="icon-btn icon-md" autofocus><i data-lucide="x"></i></button>
    <div id="about-content" class="about-content"></div>
  </dialog>

  <dialog id="info-dialog">
    <button id="info-close" class="icon-btn icon-md" autofocus><i data-lucide="x"></i></button>
    <div id="info-content" class="about-content"></div>
  </dialog>

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
