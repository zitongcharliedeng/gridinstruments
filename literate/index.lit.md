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

    /* ── Icon Design System ──────────────────────────────────── */
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

    /* ── Top bar ──────────────────────────────────────────────── */
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

    /* ── Song bar ─────────────────────────────────────────────── */
    #song-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
      font-size: 11px;
      flex-wrap: wrap;
      margin-left: auto;
    }
    #song-bar-calibrate,
    #song-bar-search,
    #song-bar-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    #song-bar #calibrate-btn { font-size: 10px; padding: 2px 8px; }
    #song-bar #calibration-banner { flex-direction: column; gap: 4px; }
    #song-bar.dropping {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: -2px;
    }
    #song-bar-hint {
      margin-left: auto;
      transition: opacity 2s ease-in;
    }

    /* ── Graffiti inactivity fade ──────────────────────────── */
    .graffiti-overlay {
      transition: opacity 1.5s ease;
    }

    /* ── Visualiser panel ────────────────────────────────────── */
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
      .panel-resize-handle { min-height: 28px; touch-action: none; }
      .grip-line { height: 2px; background: var(--fg); }
      .handle-label { color: var(--fg); opacity: 1; }
    }
    #history-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    /* ── Grid area ───────────────────────────────────────────── */
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


    /* ── Grid settings cog ───────────────────────────────────── */
     .grid-cog {
       position: absolute;
       top: 8px;
       left: 8px;
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
     .grid-cog:hover { color: var(--fg); border-color: var(--accent); }
      .grid-cog.active { color: var(--bg); background: var(--fg); border-color: var(--fg); }

    /* ── Grid settings overlay ───────────────────────────────── */
    #grid-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(30, 30, 32, 0.78);
      z-index: 12;
      padding: 48px 24px 24px 24px;
      padding-left: 48px;
      padding-right: 36px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--dim) transparent;
    }
    
    #grid-overlay::before {
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
    #grid-overlay.hidden { display: none; }
    .overlay-section {
      display: flex;
      flex-direction: column;
      gap: 5px;
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

    /* ── Pedals panel ────────────────────────────────────────── */
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

    /* ── Controls (shared) ───────────────────────────────────── */
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

    

    /* Custom checkbox — cross-platform identical (#85) */
    .gi-checkbox { position: relative; display: inline-block; width: 14px; height: 14px; cursor: pointer; vertical-align: middle; }
    .gi-checkbox input { position: absolute; inset: 0; margin: 0; cursor: pointer; appearance: none; -webkit-appearance: none; background: transparent; border: none; z-index: 1; }
    .gi-checkbox .gi-check { display: block; width: 14px; height: 14px; border: 1px solid var(--border); background: var(--bg); pointer-events: none; }
    .gi-checkbox input:checked + .gi-check { background: var(--fg); border-color: var(--fg); }
    .gi-checkbox input:checked + .gi-check::after { content: ''; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px; border: solid var(--bg); border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .gi-checkbox input:focus-visible + .gi-check { border-color: var(--accent); }

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
     .slider-reset {
       color: var(--dim);
       background: var(--bg); border: 1px solid var(--border);
       width: 22px; height: 18px; padding: 0;
       flex-shrink: 0; margin-left: 2px;
     }
    .slider-reset:hover { color: var(--fg); border-color: var(--accent); }

    /* ── Tuning slider area (ⓘ button + presets) ─────────────── */
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
      pointer-events: auto;
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
      padding: 2px;
      line-height: 1;
    }
     .slider-preset-btn:hover { color: var(--fg); }
     .slider-preset-btn.active { color: #4f4; text-decoration: underline; }
     .slider-preset-mark.active .slider-tick { background: #4f4; }
     .slider-preset-mark.active .slider-preset-btn { color: #4f4; }
     .midi-panel-row {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; flex-wrap: wrap;
    }
     .slider-info-btn {
       position: absolute;
       left: 0; top: 50%;
       transform: translateY(-50%);
       z-index: 3;
       color: #fff;
       padding: 2px;
       opacity: 0.8;
     }
    .slider-info-btn:hover { opacity: 1; color: var(--accent, #4af); }
    .tuning-slider-area .slider-track { margin-left: 18px; width: calc(100% - 18px); }

    /* ── About dialog ────────────────────────────────────────── */
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
    #info-dialog {
      /* showModal() handles centering + backdrop — no position: fixed needed */
    }
    #about-dialog {
    }
     dialog button {
       position: absolute; top: 8px; right: 12px;
       color: var(--dim);
     }
    dialog button:hover { color: var(--fg); }

    /* ── Chord shape graffiti overlays ────────────────────────── */
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

    /* ── Wave / layout selects inside slider-track ─────────── */
    .slider-track select { flex: 1; min-width: 0; }

    /* ── Instructions ────────────────────────────────────────── */
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

    /* ── Responsive: narrow / mobile screens ─────────────────── */
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

    @media (max-width: 480px) {
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
<body>
  <div id="app">

    <!-- Top bar -->
    <header id="top-bar">
      <div class="top-bar-left">
        <button id="about-btn" class="icon-btn" title="About GridInstruments"><i data-lucide="info"></i></button>
        <span class="site-title">GridInstruments</span>
        <div class="gh-actions">
          <span class="gh-mark icon"><svg viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></span>
          <a class="gh-btn" href="https://github.com/zitongcharliedeng/gridinstruments" target="_blank" rel="noopener" title="Star on GitHub">
            <span class="star-icon icon"><i data-lucide="star"></i></span> Star <span id="star-count-badge"></span>
          </a>
          <a class="gh-btn gh-suggest" href="https://github.com/zitongcharliedeng/gridinstruments/issues" target="_blank" rel="noopener" title="Report bugs or suggest features">
            <svg class="icon" viewBox="0 0 16 16"><path d="M8 1a4.5 4.5 0 00-1.5 8.74V11.5a1.5 1.5 0 001 1.42V14a.5.5 0 001 0v-1.08a1.5 1.5 0 001-1.42V9.74A4.5 4.5 0 008 1zm0 1.5a3 3 0 012.04 5.2.5.5 0 00-.2.37l-.09 1.43H6.25l-.09-1.43a.5.5 0 00-.2-.37A3 3 0 018 2.5z"/></svg>
            Suggest
          </a>
        </div>
        <button id="fullscreen-btn" class="icon-btn icon-md" title="Toggle fullscreen" onclick="document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(()=>{})"><i data-lucide="maximize"></i></button>
        <button id="reset-layout" title="Reset Page Layout — restores default panel sizes and positions (does not reset grid presets or tuning)"><span class="icon"><i data-lucide="rotate-ccw"></i></span> Reset Page</button>
      </div>
      <!-- Song/game controls — right side of header, wraps on narrow -->
      <div id="song-bar">
      <div id="song-bar-search" style="position:relative;">
          <button class="slider-info-btn icon-btn icon-lg" data-info="search" style="position:static;transform:none;"><i data-lucide="info"></i></button>
          <input id="midi-search-input" type="text" placeholder="Search or drop .mid file..." title="Search for MIDI songs or drop a .mid file anywhere" style="width:200px;box-sizing:border-box;font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;">
          <div id="midi-search-results" style="position:absolute;top:100%;left:0;min-width:280px;max-height:300px;overflow-y:auto;background:var(--bg);border:1px solid var(--border);z-index:25;display:none;"></div>
        </div>
      <div id="song-bar-status" style="display:inline-flex;align-items:center;gap:8px;">
          <button class="slider-info-btn icon-btn icon-lg" data-info="quantization" style="position:static;transform:none;"><i data-lucide="info"></i></button>
          <label style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--dim);">
            Quant
            <button id="quantization-level" style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;" title="Click to cycle quantization level: None → 1/4 → 1/8 → 1/16" value="none">None</button>
          </label>
          <div id="game-status" style="display:none;align-items:center;gap:8px;">
            <div id="game-song-title" style="font-family:var(--font);font-size:10px;color:var(--fg);text-transform:uppercase;letter-spacing:0.06em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;"></div>
            <div style="display:flex;gap:6px;align-items:center;">
              <div id="game-progress" style="width:80px;height:2px;background:var(--border);position:relative;display:inline-block;vertical-align:middle;">
                <div id="game-progress-fill" style="height:100%;background:#fff;width:0%;transition:width 0.1s linear;"></div>
              </div>
              <div id="game-quantization-badge" style="font-family:var(--font);font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;"></div>
            </div>
            <span id="game-elapsed-timer" style="font-size:10px;color:var(--dim);font-family:var(--font);min-width:3ch;text-align:right;"></span>
            <button id="game-reset-btn" class="overlay-btn" style="font-size:10px;padding:2px 6px;" title="Restart the current song from the beginning">⟲ Restart</button>
          </div>
        </div>
      <span id="song-bar-hint" style="display:none;"></span>
      <div id="song-bar-calibrate" style="margin-left:auto;">
          <button class="slider-info-btn icon-btn icon-lg" data-info="calibrate" style="position:static;transform:none;"><i data-lucide="info"></i></button>
          <button id="calibrate-btn" style="font-family:var(--font);font-size:9px;background:none;color:var(--dim);border:1px solid var(--border);padding:2px 8px;cursor:pointer;">Calibrate</button>
          <div id="calibration-banner" style="display:none;flex-direction:column;gap:8px;">
            <span id="calibration-warning" style="display:none;font-family:var(--font);font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;">This will reset your current song progress.</span>
            <span id="calibration-msg" style="font-family:var(--font);font-size:11px;color:var(--fg);text-transform:uppercase;letter-spacing:0.06em;">Play all reachable notes to set your playable area, then confirm</span>
            <div style="display:flex;gap:6px;">
              <button id="calibrate-confirm" class="overlay-btn" style="flex:1;" title="Save calibrated range">Confirm</button>
              <button id="calibrate-cancel" class="overlay-btn" style="flex:1;color:var(--dim);" title="Cancel calibration">Cancel</button>
            </div>
          </div>
        </div>
    </div>
    </header>

    <!-- Visualiser panel -->
    <div id="visualiser-panel">
      <canvas id="history-canvas" height="120"></canvas>
      <div class="panel-resize-handle-wrap">
         <div class="panel-resize-handle" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="Resize visualiser" title="Drag to resize visualiser panel" data-target="visualiser-panel" data-min="60" data-max="400" data-default="120" data-key="gi_visualiser_h" data-hidden-key="gi_history_hidden"><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span><span class="handle-label">VISUALISER</span><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span></div>
      </div>
    </div>

    <!-- Grid area -->
    <div id="grid-area">
      <div id="keyboard-container">
        <canvas id="keyboard-canvas"></canvas>
         <button id="grid-settings-btn" class="grid-cog icon-btn icon-md" title="Open settings overlay"><i data-lucide="settings"></i></button>

        <!-- Grid settings overlay (was sidebar) -->
        <div id="grid-overlay" class="hidden">

           <div class="overlay-section-title">SOUND</div>
           <div class="overlay-section">
             <div class="slider-track">
               <span class="ctrl-label" style="font-size:9px;text-transform:uppercase;white-space:nowrap;color:#fff;flex-shrink:0">WAVE</span>
              <span id="wave-select-slot"></span>
              <button class="slider-reset icon-btn icon-md" id="wave-reset" title="Reset waveform to sawtooth (default)"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="ctrl-group" style="margin-top: 18px">
              <button class="slider-info-btn icon-btn icon-lg" data-info="volume"><i data-lucide="info"></i></button>
              <div class="slider-track">
               <span class="slider-label-overlay">VOL (dB)</span>
                <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5" title="Master volume">
                <span class="slider-value-badge" id="volume-thumb-badge">-10.5</span>
                <button class="slider-reset icon-btn icon-md" id="volume-reset" title="Reset volume to default (0.3)"><i data-lucide="rotate-cw"></i></button>
              </div>
            </div>
            <div class="tuning-slider-area" style="margin-top: 18px">
              <button class="slider-info-btn icon-btn icon-lg" data-info="tuning"><i data-lucide="info"></i></button>
              <div class="slider-track">
                <span class="slider-label-overlay" id="tuning-label">FIFTHS TUNING (cents)</span>
               <input type="range" id="tuning-slider" min="683" max="722" step="0.01" value="700" title="Fifth interval tuning in cents (683=7-TET … 722=5-TET)">
               <input type="text" class="badge-input" id="tuning-thumb-badge" value="700" title="Edit fifth interval in cents">
               <button class="slider-reset icon-btn icon-md" id="tuning-reset" title="Reset to 12-TET (700¢)"><i data-lucide="rotate-cw"></i></button>
             </div>
             <div class="tet-presets" id="tet-presets" data-alternate-ticks></div>
           </div>
           <div class="overlay-section d-ref-group" style="margin-top: 18px">
             <button class="slider-info-btn icon-btn icon-lg" data-info="dref"><i data-lucide="info"></i></button>
             <div class="slider-track">
               <span class="slider-label-overlay" id="d-ref-label">D REF (Hz)</span>
              <input type="range" id="d-ref-slider" min="73.42" max="1174.66" step="0.01" value="293.66" title="Reference pitch slider (D2–D6)">
              <input type="text" class="badge-input" id="d-ref-input" value="293.66" style="width:80px; text-transform:none;" title="Edit D-ref pitch in Hz or note name (default: 293.66 Hz)">
              <button id="d-ref-reset" class="slider-reset icon-btn icon-md" title="Reset D-ref to default (293.66 Hz)"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
           </div>

           <div class="overlay-section-title">VISUAL</div>
           <div class="overlay-section">
            <div class="tuning-slider-area">
              <button class="slider-info-btn icon-btn icon-lg" data-info="skew"><i data-lucide="info"></i></button>
              <div class="slider-track">
                <span class="slider-label-overlay" id="skew-label">MECH SKEW</span>
                <input type="range" id="skew-slider" min="-0.5" max="1.5" step="0.01" value="0" title="Mech skew: DCompose (0) to MidiMech (1)">
                <input type="text" class="badge-input" id="skew-thumb-badge" value="0.00" title="Edit skew value.">
                <button class="slider-reset icon-btn icon-md" id="skew-reset" title="Reset to DCompose (0)"><i data-lucide="rotate-cw"></i></button>
              </div>
              <div class="slider-presets" id="skew-presets"></div>
            </div>

            <div class="tuning-slider-area" style="margin-top: 18px">
              <button class="slider-info-btn icon-btn icon-lg" data-info="shear"><i data-lucide="info"></i></button>
              <div class="slider-track">
                <span class="slider-label-overlay" id="bfact-label">WICKED SHEAR</span>
                <input type="range" id="bfact-slider" min="-0.5" max="1.5" step="0.01" value="0">
                <input type="text" class="badge-input" id="bfact-thumb-badge" value="0.00" title="Edit wicked-ness value.">
                <button class="slider-reset icon-btn icon-md" id="bfact-reset" title="Reset to default (0)"><i data-lucide="rotate-cw"></i></button>
              </div>
              <div class="slider-presets" id="bfact-presets"></div>
            </div>

            <div class="slider-track" style="margin-top: 18px">
              <span class="slider-label-overlay">ZOOM (x)</span>
             <input type="range" id="zoom-slider" min="0.2" max="3" step="0.01" value="1" title="Grid zoom level">
             <span class="slider-value-badge" id="zoom-thumb-badge">1.00</span>
             <button class="slider-reset icon-btn icon-md" id="zoom-reset" title="Aims to match keysize to standard keyboard key size"><i data-lucide="rotate-cw"></i></button>
           </div>
           <div class="slider-track" style="margin-top: 18px">
             <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
               <span class="gi-checkbox"><input type="checkbox" id="qwerty-overlay-toggle"><span class="gi-check"></span></span>
               <span style="color:#fff">QWERTY LABELS</span>
             </label>
           </div>
           </div>

           <div class="overlay-section-title">INPUT</div>
           <div class="overlay-section">
             <div class="slider-track">
               <span class="ctrl-label" style="font-size:9px;text-transform:uppercase;white-space:nowrap;color:#fff;flex-shrink:0">KEYBOARD LAYOUT</span>
              <span id="layout-select-slot"></span>
              <button class="slider-reset icon-btn icon-md" id="layout-reset" title="Reset keyboard layout to ANSI (US QWERTY)"><i data-lucide="rotate-cw"></i></button>
            </div>

            <div style="margin-top: 18px">
              <div id="midi-settings-panel">
                 <span class="overlay-section-title">MIDI</span>
                <div id="midi-device-list"></div>
                 <span class="overlay-section-title">EXPRESSION</span>
                 <div class="midi-panel-row" id="expr-bend-row" style="gap:6px">
                   <button class="slider-info-btn icon-btn icon-lg" data-info="bend" style="position:static;transform:none;"><i data-lucide="info"></i></button>
                   <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                     <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked><span class="gi-check"></span></span>
                     <span style="color:#fff">Pitch Bend</span>
                     <input type="text" inputmode="numeric" pattern="[0-9]*" id="midi-pb-range-expr" value="48" style="width:3ch;text-align:center;font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 3px;">
                   </label>
                 </div>
                 <div class="midi-panel-row" id="expr-velocity-row" style="gap:6px">
                   <button class="slider-info-btn icon-btn icon-lg" data-info="velocity" style="position:static;transform:none;"><i data-lucide="info"></i></button>
                   <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                     <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked><span class="gi-check"></span></span>
                     <span style="color:#fff">Note Velocity</span>
                   </label>
                 </div>
                 <div class="midi-panel-row" id="expr-pressure-row" style="gap:6px">
                   <button class="slider-info-btn icon-btn icon-lg" data-info="pressure" style="position:static;transform:none;"><i data-lucide="info"></i></button>
                   <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                     <span class="gi-checkbox"><input type="checkbox" id="expr-pressure" checked><span class="gi-check"></span></span>
                     <span style="color:#fff">Channel Pressure</span>
                   </label>
                 </div>
                 <div class="midi-panel-row" id="expr-timbre-row" style="gap:6px">
                   <button class="slider-info-btn icon-btn icon-lg" data-info="timbre" style="position:static;transform:none;"><i data-lucide="info"></i></button>
                   <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                     <span class="gi-checkbox"><input type="checkbox" id="expr-timbre" checked><span class="gi-check"></span></span>
                     <span style="color:#fff">Timbre Slide</span>
                   </label>
                   <button id="timbre-cc-mode" style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;" title="Click to cycle timbre CC" value="74">CC74</button>
                 </div>
                <div class="midi-panel-row" id="mpe-output-row">
                  <span class="ctrl-label" style="color:#fff">MPE Out:</span>
                  <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                    <span class="gi-checkbox"><input type="checkbox" id="mpe-enabled"><span class="gi-check"></span></span>
                    Enable
                  </label>
                  <span id="mpe-output-select-slot" style="min-width:120px;display:inline-block;"></span>
                </div>
              </div>
            </div>
           </div>

         </div>
      </div>
    </div>

    <!-- Pedals -->
    <div id="pedals-panel" style="height:44px">
      <div class="panel-resize-handle-wrap pedals-handle-wrap">
         <div class="panel-resize-handle" tabindex="0" role="separator" aria-orientation="horizontal" aria-label="Resize pedals" title="Drag to resize pedals panel" data-target="pedals-panel" data-min="30" data-max="120" data-default="44" data-key="gi_pedals_h" data-direction="up" data-hidden-key="gi_pedals_hidden"><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span><span class="handle-label">PEDALS</span><span class="grip-lines"><span class="grip-line"></span><span class="grip-line"></span><span class="grip-line"></span></span></div>
      </div>
      <button class="pedal-btn" id="sustain-indicator" title="Sustain: hold Space or tap" style="padding-top: 4px;">SUSTAIN</button>
      <button class="pedal-btn" id="vibrato-indicator" title="Vibrato: hold Shift or tap" style="padding-top: 4px;">VIBRATO</button>
    </div>

   </div>

   <!-- Keyboard rollover warning toast -->
   <div id="ghosting-toast" style="display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(0,0,0,0.85);border:1px solid var(--dim);padding:12px 16px;font-family:var(--font);font-size:11px;color:var(--fg);flex-direction:row;align-items:flex-start;gap:12px;max-width:400px;">
     <span style="flex:1;line-height:1.5;">Your keyboard may limit simultaneous notes. For full chords, connect a MIDI controller or use touchscreen.</span>
     <button id="ghosting-toast-dismiss" style="background:none;border:none;color:var(--dim);font-family:var(--font);font-size:14px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;" title="Dismiss">✕</button>
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
