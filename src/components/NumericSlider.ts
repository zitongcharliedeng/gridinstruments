/**
 * NumericSlider — Reusable UI component wrapping an existing slider DOM structure.
 *
 * Handles: value get/set, badge positioning, fill gradient (Firefox workaround),
 * reset button, editable vs non-editable badges.
 *
 * Does NOT create new DOM elements — all elements are passed in via constructor.
 * Does NOT import XState types — this is a pure UI layer component.
 */

/** Config for a single slider component instance */
export interface SliderComponentConfig {
  /** Unique name — used for logging only */
  name: string;
  /** Default value for reset */
  defaultValue: number;
  /** Format raw number → badge display string */
  formatBadge: (value: number) => string;
  /** Format raw number → label text (optional, for dynamic labels) */
  formatLabel?: (value: number) => string;
  /** If true, badge is an <input> the user can type into */
  editable: boolean;
  /**
   * Parse user-typed string → number (null = invalid).
   * Only used when editable=true. On null, badge reverts to current value.
   */
  parseInput?: (raw: string) => number | null;
}

export class NumericSlider {
  private readonly rangeInput: HTMLInputElement;
  private readonly badge: HTMLElement;
  readonly config: SliderComponentConfig;

  private readonly _inputCbs: Array<(value: number) => void> = [];
  private readonly _badgeEditCbs: Array<(rawValue: string) => void> = [];
  private readonly _resetCbs: Array<() => void> = [];

  /** [target, eventType, listener] tuples stored for disposal */
  private readonly _attached: Array<[EventTarget, string, EventListener]> = [];

  constructor(
    rangeInput: HTMLInputElement,
    badge: HTMLElement,
    resetBtn: HTMLButtonElement,
    config: SliderComponentConfig,
  ) {
    this.rangeInput = rangeInput;
    this.badge = badge;
    this.config = config;

    // ─── Range input ──────────────────────────────────────────────────────────
    const onRangeInput: EventListener = () => {
      this.updateFill();
      // Guard: do not overwrite badge text while user is typing into it
      if (document.activeElement !== this.badge) {
        this.updateBadge();
      }
      const value = parseFloat(this.rangeInput.value);
      for (const cb of this._inputCbs) cb(value);
    };
    this._attach(rangeInput, 'input', onRangeInput);

    // ─── Reset button ─────────────────────────────────────────────────────────
    const onReset: EventListener = () => {
      this.rangeInput.value = String(this.config.defaultValue);
      this.updateFill();
      // Always update badge on reset, regardless of activeElement
      this.updateBadge();
      // Re-dispatch so any external listeners on the range input also run
      this.rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
      for (const cb of this._resetCbs) cb();
    };
    this._attach(resetBtn, 'click', onReset);

    // ─── Editable badge (only when config.editable=true and badge is <input>) ─
    if (config.editable && badge instanceof HTMLInputElement) {
      const inputEl = badge;

      const onBadgeInput: EventListener = () => {
        const raw = inputEl.value;
        for (const cb of this._badgeEditCbs) cb(raw);
      };
      this._attach(badge, 'input', onBadgeInput);

      const onBadgeBlur: EventListener = () => {
        // Revert badge if user left an invalid value
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

    // Initial render
    this.updateFill();
    this.updateBadge();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _attach(
    target: EventTarget,
    type: string,
    listener: EventListener,
  ): void {
    target.addEventListener(type, listener);
    this._attached.push([target, type, listener]);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

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

  /** Register a callback fired on every range-input event */
  onInput(cb: (value: number) => void): void {
    this._inputCbs.push(cb);
  }

  /**
   * Register a callback fired when the user types into an editable badge.
   * Only fires when config.editable=true.
   */
  onBadgeEdit(cb: (rawValue: string) => void): void {
    this._badgeEditCbs.push(cb);
  }

  /** Register a callback fired when the reset button is clicked */
  onReset(cb: () => void): void {
    this._resetCbs.push(cb);
  }

  /**
   * Recompute the fill gradient from the current slider value.
   *
   * Accounts for the 3px thumb width so the gradient edge tracks
   * the thumb center precisely. Uses offsetWidth for pixel-exact alignment.
   */
  updateFill(): void {
    const min = parseFloat(this.rangeInput.min) || 0;
    const max = parseFloat(this.rangeInput.max) || 100;
    const val = parseFloat(this.rangeInput.value) || 0;
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

  /**
   * Reposition the badge over the current thumb position and update its text.
   *
   * Badge position is computed in px from the left edge of the track using
   * rangeInput.offsetWidth so it aligns with the actual rendered thumb.
   *
   * NOTE: If the badge currently has focus (user is typing), this is a no-op
   * to prevent clobbering in-progress input. Guard the call site with:
   *   if (document.activeElement !== badge) slider.updateBadge();
   * (The internal range-input listener already applies this guard.)
   */
  updateBadge(): void {
    const value = parseFloat(this.rangeInput.value);
    const min = parseFloat(this.rangeInput.min) || 0;
    const max = parseFloat(this.rangeInput.max) || 100;
    const pct = ((value - min) / (max - min)) * 100;
    const thumbOffset = (pct / 100) * this.rangeInput.offsetWidth;
    this.badge.style.left = `${thumbOffset}px`;

    const text = this.config.formatBadge(value);
    if (this.badge instanceof HTMLInputElement) {
      this.badge.value = text;
    } else {
      this.badge.textContent = text;
    }
  }

  /** Remove all internal event listeners. Call when tearing down the component. */
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
