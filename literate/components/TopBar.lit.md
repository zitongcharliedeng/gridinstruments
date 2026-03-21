# Top Bar

SolidJS component for the top bar left section — about button, site title,
GitHub badge (star + suggest), fullscreen info button, fullscreen toggle,
reset-layout info button, and reset-layout button.

The GitHub star count badge is populated by an inline script in `index.html`
writing to `#star-count-badge`; the component renders that element and leaves
the content to the existing script.

## Component Interface

Three callbacks cover the interactive elements that require app-level wiring.
The fullscreen toggle is self-contained (inline `onclick`) so no callback is
needed for it.

``` {.typescript file=_generated/components/TopBar.tsx}
import { type JSX } from 'solid-js';
import { InfoButton } from './InfoButton';

export interface TopBarProps {
  onAbout: () => void;
  onReset: () => void;
}
```

## Top Bar Left Content

The component renders the exact same markup as the original `index.html`
`.top-bar-left` block. Lucide icons are resolved by the global `createIcons`
call in app-core after mount.

``` {.typescript file=_generated/components/TopBar.tsx}

export function TopBar(props: TopBarProps): JSX.Element {
  const onAboutClick = (): void => {
    props.onAbout();
  };

  const onResetClick = (): void => {
    props.onReset();
  };

  const onFullscreen = (): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => { /* ignored */ });
    }
  };

  return (
    <>
      <button id="about-btn" class="slider-info-btn" onClick={onAboutClick}>
        i
      </button>
      <span class="site-title">GridInstruments</span>
      <div class="gh-actions">
        <span class="gh-mark icon">
          <svg viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </span>
        <a class="gh-btn" href="https://github.com/zitongcharliedeng/gridinstruments" target="_blank" rel="noopener">
          <span class="star-icon icon"><i data-lucide="star" /></span> Star <span id="star-count-badge" />
        </a>
        <a class="gh-btn gh-suggest" href="https://github.com/zitongcharliedeng/gridinstruments/issues" target="_blank" rel="noopener">
          <svg class="icon" viewBox="0 0 16 16">
            <path d="M8 1a4.5 4.5 0 00-1.5 8.74V11.5a1.5 1.5 0 001 1.42V14a.5.5 0 001 0v-1.08a1.5 1.5 0 001-1.42V9.74A4.5 4.5 0 008 1zm0 1.5a3 3 0 012.04 5.2.5.5 0 00-.2.37l-.09 1.43H6.25l-.09-1.43a.5.5 0 00-.2-.37A3 3 0 018 2.5z" />
          </svg>
          Suggest
        </a>
      </div>
      <InfoButton infoKey="fullscreen" />
      <button id="fullscreen-btn" class="icon-btn icon-md" onClick={onFullscreen}>
        <i data-lucide="maximize" />
      </button>
      <InfoButton infoKey="reset-layout" />
      <button id="reset-layout" onClick={onResetClick}>
        <span class="icon"><i data-lucide="rotate-ccw" /></span> Reset Page
      </button>
    </>
  );
}
```
