# UI Overrides

CSS overrides for third-party library styles (slim-select, OverlayScrollbars). Loaded after library CSS in main.ts. Matches the app's dark design language.

``` {.css file=_generated/ui-overrides.css}
   Overrides library CSS variables so they match the app design language. */

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

.ss-main {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 12px;
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
```
