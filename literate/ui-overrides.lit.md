# UI Overrides

CSS overrides for third-party library styles (slim-select, OverlayScrollbars). Loaded after library CSS in main.ts. Matches the app's dark design language.

slim-select CSS custom properties set the dark palette: black background, white text, zero border-radius (sharp corners only), and compact 26 px height matching the rest of the control bar.

``` {.css file=_generated/ui-overrides.css}
:root {
  --ss-bg-color: #000;
  --ss-font-color: #fff;
  --ss-font-size: 12px;
  --ss-border-color: #333;
  --ss-primary-color: #333;
  --ss-main-height: 26px;
  --ss-content-height: 200px;
  --ss-border-radius: 0px;
  --ss-disabled-color: #111;
  --ss-placeholder-color: #666;
  --ss-focus-color: #888;
  --ss-highlight-color: #333;
  --ss-spacing-l: 6px;
  --ss-spacing-m: 4px;
  --ss-spacing-s: 2px;
  --ss-animation-timing: 0.1s;
}
```

slim-select element overrides enforce JetBrains Mono, suppress the default focus ring, and style the dropdown arrow and open-state border to match the app's `#888` accent.

``` {.css file=_generated/ui-overrides.css}
.ss-main {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
  flex: 1;
  min-width: 0;
}

.ss-main .ss-values .ss-single {
  font-size: 12px;
  line-height: 1.4;
}

.ss-main .ss-arrow path {
  stroke: #666;
}

.ss-main:focus {
  box-shadow: none;
}

.ss-main.ss-open-below,
.ss-main.ss-open-above {
  border-color: #888;
}

.ss-content {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  border-color: #888;
  z-index: 9999 !important;
}

.ss-main {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.ss-content .ss-list .ss-option {
  font-size: 12px;
  padding: 4px 8px;
}

.ss-content .ss-list .ss-option:hover:not(.ss-disabled) {
  color: #fff;
  background-color: #222;
  border-left: none;
}

.ss-content .ss-list .ss-option:not(.ss-disabled).ss-selected {
  color: #fff;
  background-color: #333;
}

.ss-main.ss-disabled {
  background-color: #111;
  cursor: not-allowed;
  opacity: 0.5;
}
```

OverlayScrollbars overrides apply the `gi-scrollbar` class. The 12 px track width and 40 px minimum handle height keep the scrollbar usable without conflicting with the app's sharp-corner design language.

``` {.css file=_generated/ui-overrides.css}
.os-scrollbar.gi-scrollbar {
  --os-size: 12px;
  --os-handle-bg: #888;
  --os-handle-bg-hover: #fff;
  --os-handle-bg-active: #fff;
  padding: 0;
  z-index: 10;
}

.os-scrollbar.gi-scrollbar .os-scrollbar-handle {
  min-height: 40px;
}

#grid-overlay {
  padding: 0;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
}

#grid-overlay [data-overlayscrollbars-viewport] {
  padding: 48px 24px 24px 48px !important;
  overflow: visible !important;
}
```
