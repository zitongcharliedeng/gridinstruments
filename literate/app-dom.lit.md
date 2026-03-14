# App DOM

DOM query helpers and element factory functions — safe element lookup with type narrowing, select-at-slot creation, and cycling button setup.

``` {.typescript file=_generated/app-dom.ts}
/**
 * DOM query helpers and element factory functions.
 */

/**
 * Helper to safely get a DOM element with type narrowing.
 * Throws if element not found or is not an instance of the expected type.
 */
export function getElement<T extends HTMLElement>(id: string, type: new() => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) {
    throw new Error(`Element #${id} not found or wrong type (expected ${type.name})`);
  }
  return el;
}

/**
 * Helper to safely get an optional DOM element with type narrowing.
 * Returns null if element not found or is not an instance of the expected type.
 */
export function getElementOrNull<T extends HTMLElement>(id: string, type: new() => T): T | null {
  const el = document.getElementById(id);
  if (el === null) return null;
  if (!(el instanceof type)) return null;
  return el;
}

/**
 * Creates a <select> element and replaces a placeholder slot in the DOM.
 * Used so SlimSelect-wrapped selects are created in JS (not HTML source),
 * keeping the HTML free of native <select> tags (enforced by ast-grep).
 */
export function createSelectAtSlot(
  slotId: string,
  selectId: string,
  options: { value: string; text: string }[],
  attrs?: Record<string, string>,
): HTMLSelectElement | null {
  const slot = document.getElementById(slotId);
  if (!slot) return null;
  const select = document.createElement('select');
  select.id = selectId;
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      select.setAttribute(key, val);
    }
  }
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    select.appendChild(option);
  }
  slot.replaceWith(select);
  return select;
}

/**
 * Sets up a cycling button that rotates through values on click.
 * Returns the button element or null if not found.
 */
export function setupCyclingButton(
  btnId: string,
  options: { value: string; label: string }[],
  initialValue: string,
  onChange: (value: string) => void,
): HTMLButtonElement | null {
  const btn = getElementOrNull(btnId, HTMLButtonElement);
  if (!btn) return null;
  let currentIndex = options.findIndex(o => o.value === initialValue);
  if (currentIndex < 0) currentIndex = 0;
  btn.value = options[currentIndex].value;
  btn.textContent = options[currentIndex].label;
  btn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % options.length;
    btn.value = options[currentIndex].value;
    btn.textContent = options[currentIndex].label;
    onChange(options[currentIndex].value);
  });
  return btn;
}
```
