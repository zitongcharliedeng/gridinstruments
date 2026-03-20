# App DOM

DOM query helpers and element factory functions — safe element lookup with type narrowing, select-at-slot creation, and cycling button setup.

## Typed Element Getters

`getElement` throws if the element is missing or the wrong type — fail-fast for required elements. `getElementOrNull` returns `null` instead of throwing — useful for optional elements where absence is a valid state.

``` {.typescript file=_generated/app-dom.ts}
export function getElement<T extends HTMLElement>(id: string, type: new() => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) {
    throw new Error(`Element #${id} not found or wrong type (expected ${type.name})`);
  }
  return el;
}

export function getElementOrNull<T extends HTMLElement>(id: string, type: new() => T): T | null {
  const el = document.getElementById(id);
  if (el === null) return null;
  if (!(el instanceof type)) return null;
  return el;
}
```

## Select at Slot

`createSelectAtSlot` creates a `<select>` element and replaces a placeholder `<div>` slot in the DOM. SlimSelect-wrapped selects are created in JavaScript rather than in HTML source so that a lint rule can enforce the absence of native `<select>` tags in the HTML file.

``` {.typescript file=_generated/app-dom.ts}
export function hideNativeSelect(select: HTMLSelectElement): void {
  if (select.id === 'mpe-output-select') {
    select.style.display = 'none';
    select.setAttribute('aria-hidden', 'true');
    return;
  }
  select.tabIndex = -1;
  select.style.position = 'absolute';
  select.style.width = '1px';
  select.style.height = '1px';
  select.style.opacity = '0';
  select.style.overflow = 'hidden';
  select.style.pointerEvents = 'none';
  select.style.margin = '0';
  select.style.padding = '0';
  select.style.borderWidth = '0';
  select.setAttribute('aria-hidden', 'true');
}

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
```

## Cycling Button

`setupCyclingButton` turns a button into a value cycler — each click advances to the next option and calls `onChange`. The current value is stored as `btn.value` so external code can read it without maintaining separate state.

``` {.typescript file=_generated/app-dom.ts}
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
