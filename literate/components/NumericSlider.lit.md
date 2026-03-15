# NumericSlider

Reusable UI component wrapping an existing slider DOM structure. Handles value get/set, badge positioning, fill gradient (Firefox workaround), reset button, and editable vs non-editable badges. Does not create new DOM elements — all elements are passed in via constructor.

``` {.typescript file=_generated/components/NumericSlider.ts}
export interface SliderComponentConfig {
  name: string;
  defaultValue: number;
  formatBadge: (value: number) => string;
  formatLabel?: (value: number) => string;
  editable: boolean;
  parseInput?: (raw: string) => number | null;
}

export class NumericSlider {
  private readonly rangeInput: HTMLInputElement;
  private readonly badge: HTMLElement;
  readonly config: SliderComponentConfig;

  private readonly _inputCbs: ((value: number) => void)[] = [];
  private readonly _badgeEditCbs: ((rawValue: string) => void)[] = [];
  private readonly _resetCbs: (() => void)[] = [];

  private readonly _attached: [EventTarget, string, EventListener][] = [];

  constructor(
    rangeInput: HTMLInputElement,
    badge: HTMLElement,
    resetBtn: HTMLButtonElement,
    config: SliderComponentConfig,
  ) {
    this.rangeInput = rangeInput;
    this.badge = badge;
    this.config = config;

    const onRangeInput: EventListener = () => {
      this.updateFill();

      if (document.activeElement !== this.badge) {
        this.updateBadge();
      }
      const value = parseFloat(this.rangeInput.value);
      for (const cb of this._inputCbs) cb(value);
    };
    this._attach(rangeInput, 'input', onRangeInput);


    const onReset: EventListener = () => {
      this.rangeInput.value = String(this.config.defaultValue);
      this.updateFill();

      this.updateBadge();

      this.rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
      for (const cb of this._resetCbs) cb();
    };
    this._attach(resetBtn, 'click', onReset);


    if (config.editable && badge instanceof HTMLInputElement) {
      const inputEl = badge;

      const onBadgeInput: EventListener = () => {
        const raw = inputEl.value;
        for (const cb of this._badgeEditCbs) cb(raw);
      };
      this._attach(badge, 'input', onBadgeInput);

      const onBadgeBlur: EventListener = () => {

        if (config.parseInput) {
          const parsed = config.parseInput(inputEl.value);
          if (parsed === null) {
            inputEl.value = config.formatBadge(parseFloat(this.rangeInput.value));
          }
        }
      };
      this._attach(badge, 'blur', onBadgeBlur);

      const onBadgeFocus: EventListener = () => {
        inputEl.select();
      };
      this._attach(badge, 'focus', onBadgeFocus);
    }


    this.updateFill();
    this.updateBadge();
  }


  private _attach(
    target: EventTarget,
    type: string,
    listener: EventListener,
  ): void {
    target.addEventListener(type, listener);
    this._attached.push([target, type, listener]);
  }


  getValue(): number {
    return parseFloat(this.rangeInput.value);
  }

  setValue(value: number, skipBadgeUpdate = false): void {
    this.rangeInput.value = String(value);
    this.updateFill();
    if (!skipBadgeUpdate) {
      this.updateBadge();
    }
  }

  onInput(cb: (value: number) => void): void {
    this._inputCbs.push(cb);
  }

  onBadgeEdit(cb: (rawValue: string) => void): void {
    this._badgeEditCbs.push(cb);
  }

  onReset(cb: () => void): void {
    this._resetCbs.push(cb);
  }

  updateFill(): void {
    const min = Number.isFinite(parseFloat(this.rangeInput.min)) ? parseFloat(this.rangeInput.min) : 0;
    const max = Number.isFinite(parseFloat(this.rangeInput.max)) ? parseFloat(this.rangeInput.max) : 100;
    const val = Number.isFinite(parseFloat(this.rangeInput.value)) ? parseFloat(this.rangeInput.value) : 0;
    const ratio = (val - min) / (max - min);
    const thumbW = 3;
    const trackW = this.rangeInput.offsetWidth;
    if (trackW > 0) {
      const thumbCenterPx = ratio * (trackW - thumbW) + thumbW / 2;
      const fillPct = (thumbCenterPx / trackW) * 100;
      this.rangeInput.style.background =
        `linear-gradient(to right, var(--fg) ${fillPct.toFixed(2)}%, #000 ${fillPct.toFixed(2)}%)`;
    } else {
      const pct = ratio * 100;
      this.rangeInput.style.background =
        `linear-gradient(to right, var(--fg) ${pct.toFixed(2)}%, #000 ${pct.toFixed(2)}%)`;
    }
  }

  updateBadge(): void {
    const value = parseFloat(this.rangeInput.value);
    const min = Number.isFinite(parseFloat(this.rangeInput.min)) ? parseFloat(this.rangeInput.min) : 0;
    const max = Number.isFinite(parseFloat(this.rangeInput.max)) ? parseFloat(this.rangeInput.max) : 100;
    const ratio = (value - min) / (max - min);
    const thumbW = 3;
    const trackW = this.rangeInput.offsetWidth;
    const thumbOffset = trackW > 0
      ? ratio * (trackW - thumbW) + thumbW / 2
      : 0;
    this.badge.style.left = `${thumbOffset}px`;

    const text = this.config.formatBadge(value);
    if (this.badge instanceof HTMLInputElement) {
      this.badge.value = text;
    } else {
      this.badge.textContent = text;
    }
  }

  dispose(): void {
    for (const [target, type, listener] of this._attached) {
      target.removeEventListener(type, listener);
    }
    this._attached.length = 0;
    this._inputCbs.length = 0;
    this._badgeEditCbs.length = 0;
    this._resetCbs.length = 0;
  }
}
```
