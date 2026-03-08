/**
 * UI state machines for model-based test generation.
 *
 * Ten independent XState v5 machines modelling user-visible UI state
 * transitions. Used ONLY with `getAdjacencyMap` to enumerate (state, event)
 * pairs for Playwright test generation — NOT used at runtime.
 *
 * Total (state × event) pairs across all machines: 76.
 */

import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import {
  tooltipCheck,
  visHandlePosition,
  pianoRollVisible,
  pedHandlePosition,
  overlayBgCheck,
  overlayShimmerCheck,
  overlaySectionsCheck,
  overlayPresetCheck,
  mpeUiCheck,
  focusPreserveCheck,
  visCap60Check,
  iconSizeCheck,
  sliderBadgePositionCheck,
  badgePointerEventsCheck,
  sliderLabelPositionCheck,
  sliderValuesCheck,
  tetBelowTrackCheck,
  overlayColorsCheck,
  drefAnnotationCheck,
  overlayControlsCheck,
} from './invariant-checks';

// ═══════════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function tabUntil(page: Page, selector: string, maxTabs = 30): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    const focused = await page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
    if (focused) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`tabUntil: '${selector}' not reachable within ${maxTabs} Tab presses`);
}

async function dragHandle(
  page: Page,
  selector: string,
  deltaY: number,
): Promise<void> {
  const handle = page.locator(selector);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`Handle not found: ${selector}`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + deltaY, { steps: 5 });
  await page.mouse.up();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Overlay Machine  (2 states × 3 events = 6 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type OverlayEvent =
  | { type: 'CLICK_COG' }
  | { type: 'CLICK_BACKDROP' }
  | { type: 'PRESS_ESCAPE' };

export const overlayMachine = setup({
  types: { events: {} as OverlayEvent },
}).createMachine({
  id: 'overlay',
  initial: 'hidden',
  states: {
    hidden: {
      meta: {
        reason: 'The settings overlay panel is NOT visible. Only the keyboard grid and optional panels are shown.',
        designIntent: 'Default state maximizes keyboard grid area for playing',
      },
      on: { CLICK_COG: 'visible' },
    },
    visible: {
      meta: {
        reason: 'A settings overlay panel is visible over the keyboard grid, showing sliders and controls.',
        designIntent: 'Semi-transparent overlay lets musicians see grid while adjusting settings',
        invariants: [tooltipCheck, overlayBgCheck, overlayShimmerCheck, overlaySectionsCheck, overlayPresetCheck, mpeUiCheck, focusPreserveCheck, iconSizeCheck, sliderBadgePositionCheck, badgePointerEventsCheck, sliderLabelPositionCheck, sliderValuesCheck, tetBelowTrackCheck, overlayColorsCheck, drefAnnotationCheck, overlayControlsCheck],
      },
      on: {
        CLICK_COG: 'hidden',
        CLICK_BACKDROP: 'hidden',
        PRESS_ESCAPE: 'hidden',
      },
    },
  },
});

export const overlayPlaywrightActions: Record<OverlayEvent['type'], (page: Page) => Promise<void>> = {
  CLICK_COG: async (page) => {
    await page.locator('#grid-settings-btn').click();
  },
  CLICK_BACKDROP: async (page) => {
    await page.mouse.click(10, 500);
  },
  PRESS_ESCAPE: async (page) => {
    await page.keyboard.press('Escape');
  },
};

export const overlayInvariants: Record<string, string> = {
  hidden: 'The settings overlay panel is NOT visible. Only the keyboard grid and optional panels are shown.',
  visible: 'A settings overlay panel is visible over the keyboard grid, showing sliders and controls.',
};

export const overlayDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  hidden: async (page) => {
    await expect(page.locator('#grid-overlay')).toHaveClass(/hidden/);
  },
  visible: async (page) => {
    await expect(page.locator('#grid-overlay')).not.toHaveClass(/hidden/);
    await expect(page.locator('#grid-overlay')).toBeVisible();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Visualiser Machine  (3 states × 4 events = 12 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type VisualiserEvent =
  | { type: 'DRAG_VIS_EXPAND' }
  | { type: 'DRAG_VIS_FROM_COLLAPSED' }
  | { type: 'TOGGLE_VIS_COLLAPSE' }
  | { type: 'DBLCLICK_VIS_HANDLE' };

export const visualiserMachine = setup({
  types: { events: {} as VisualiserEvent },
}).createMachine({
  id: 'visualiser',
  initial: 'default',
  states: {
    default: {
      meta: {
        reason: 'The visualiser panel is at its default height (~120px), showing note history. The keyboard grid fills the remaining space below it with no black gap.',
        designIntent: 'Balanced split between note history and keyboard grid',
        invariants: [visHandlePosition, pianoRollVisible],
      },
      on: {
        DRAG_VIS_EXPAND: 'expanded',
        TOGGLE_VIS_COLLAPSE: 'collapsed',
      },
    },
    expanded: {
      meta: {
        reason: 'The visualiser panel is expanded taller than default, showing more note history. The keyboard grid fills the remaining space below with no black gap.',
        designIntent: 'More vertical space for note history review',
        invariants: [pianoRollVisible, visCap60Check],
      },
      on: {
        DBLCLICK_VIS_HANDLE: 'default',
        TOGGLE_VIS_COLLAPSE: 'collapsed',
      },
    },
    collapsed: {
      meta: {
        reason: 'The visualiser panel is fully collapsed — invisible, zero height, no black gap anywhere. The keyboard grid fills the entire viewport from top bar to pedals panel with no dead space.',
        designIntent: 'Maximizes keyboard grid for focused playing',
      },
      on: {
        TOGGLE_VIS_COLLAPSE: 'default',
        DBLCLICK_VIS_HANDLE: 'default',
        DRAG_VIS_FROM_COLLAPSED: 'expanded',
      },
    },
  },
});

const VIS_HANDLE = '#visualiser-panel .panel-resize-handle';

export const visualiserPlaywrightActions: Record<VisualiserEvent['type'], (page: Page) => Promise<void>> = {
  DRAG_VIS_EXPAND: async (page) => {
    await dragHandle(page, VIS_HANDLE, 80);
  },
  DRAG_VIS_FROM_COLLAPSED: async (page) => {
    await dragHandle(page, VIS_HANDLE, 80);
  },
  TOGGLE_VIS_COLLAPSE: async (page) => {
    await tabUntil(page, '#visualiser-panel .panel-resize-handle');
    await page.keyboard.press('Enter');
  },
  DBLCLICK_VIS_HANDLE: async (page) => {
    await page.evaluate(() => {
      const h = document.querySelector('#visualiser-panel .panel-resize-handle') as HTMLElement | null;
      h?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    });
  },
};

export const visualiserInvariants: Record<string, string> = {
  default: 'The visualiser panel is at its default height (~120px), showing note history. The keyboard grid fills the remaining space below it with no black gap.',
  expanded: 'The visualiser panel is expanded taller than default, showing more note history. The keyboard grid fills the remaining space below with no black gap.',
  collapsed: 'The visualiser panel is fully collapsed — invisible, zero height, no black gap anywhere. The keyboard grid fills the entire viewport from top bar to pedals panel with no dead space.',
};

export const visualiserDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  default: async (page) => {
    await expect(page.locator('#visualiser-panel')).toBeVisible();
    await expect(page.locator('#visualiser-panel')).not.toHaveClass(/collapsed/);
  },
  expanded: async (page) => {
    await expect(page.locator('#visualiser-panel')).toBeVisible();
    await expect(page.locator('#visualiser-panel')).not.toHaveClass(/collapsed/);
    const box = await page.locator('#visualiser-panel').boundingBox();
    expect(box!.height).toBeGreaterThan(30);
  },
  collapsed: async (page) => {
    await expect(page.locator('#visualiser-panel')).toHaveClass(/collapsed/);
    const box = await page.locator('#visualiser-panel').boundingBox();
    expect(box!.height).toBeLessThan(4);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Pedals Machine  (3 states × 4 events = 12 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type PedalsEvent =
  | { type: 'DRAG_PED_EXPAND' }
  | { type: 'DRAG_PED_FROM_COLLAPSED' }
  | { type: 'TOGGLE_PED_COLLAPSE' }
  | { type: 'DBLCLICK_PED_HANDLE' };

export const pedalsMachine = setup({
  types: { events: {} as PedalsEvent },
}).createMachine({
  id: 'pedals',
  initial: 'default',
  states: {
    default: {
      meta: {
        reason: 'The pedals panel is at its default height (~44px), showing sustain and vibrato buttons. No black gap anywhere.',
        designIntent: 'Compact pedal controls at bottom of screen',
        invariants: [pedHandlePosition],
      },
      on: {
        DRAG_PED_EXPAND: 'expanded',
        TOGGLE_PED_COLLAPSE: 'collapsed',
      },
    },
    expanded: {
      meta: {
        reason: 'The pedals panel is expanded taller than default. No black gap anywhere.',
        designIntent: 'Larger touch targets for pedal controls',
      },
      on: {
        DBLCLICK_PED_HANDLE: 'default',
        TOGGLE_PED_COLLAPSE: 'collapsed',
      },
    },
    collapsed: {
      meta: {
        reason: 'The pedals panel is fully collapsed — invisible, zero height, no black gap. The keyboard grid fills down to the very bottom of the viewport with no dead space.',
        designIntent: 'Maximizes keyboard grid when pedals not needed',
      },
      on: {
        TOGGLE_PED_COLLAPSE: 'default',
        DBLCLICK_PED_HANDLE: 'default',
        DRAG_PED_FROM_COLLAPSED: 'expanded',
      },
    },
  },
});

const PED_HANDLE = '#pedals-panel .panel-resize-handle';

export const pedalsPlaywrightActions: Record<PedalsEvent['type'], (page: Page) => Promise<void>> = {
  DRAG_PED_EXPAND: async (page) => {
    await dragHandle(page, PED_HANDLE, -80);
  },
  DRAG_PED_FROM_COLLAPSED: async (page) => {
    const handle = page.locator(PED_HANDLE);
    const box = await handle.boundingBox();
    if (!box) throw new Error(`Handle not found: ${PED_HANDLE}`);
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    await handle.dispatchEvent('pointerdown', { clientX: cx, clientY: cy, button: 0, buttons: 1, bubbles: true });
    await handle.dispatchEvent('pointermove', { clientX: cx, clientY: cy - 60, buttons: 1, bubbles: true });
    await handle.dispatchEvent('pointerup', { clientX: cx, clientY: cy - 60, button: 0, buttons: 0, bubbles: true });
  },
  TOGGLE_PED_COLLAPSE: async (page) => {
    await tabUntil(page, '#pedals-panel .panel-resize-handle');
    await page.keyboard.press('Enter');
  },
  DBLCLICK_PED_HANDLE: async (page) => {
    await page.locator(PED_HANDLE).dispatchEvent('dblclick');
  },
};

export const pedalsInvariants: Record<string, string> = {
  default: 'The pedals panel is at its default height (~44px), showing sustain and vibrato buttons. No black gap anywhere.',
  expanded: 'The pedals panel is expanded taller than default. No black gap anywhere.',
  collapsed: 'The pedals panel is fully collapsed — invisible, zero height, no black gap. The keyboard grid fills down to the very bottom of the viewport with no dead space.',
};

export const pedalsDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  default: async (page) => {
    await expect(page.locator('#pedals-panel')).toBeVisible();
    await expect(page.locator('#pedals-panel')).not.toHaveClass(/collapsed/);
  },
  expanded: async (page) => {
    await expect(page.locator('#pedals-panel')).toBeVisible();
    await expect(page.locator('#pedals-panel')).not.toHaveClass(/collapsed/);
    const box = await page.locator('#pedals-panel').boundingBox();
    expect(box!.height).toBeGreaterThan(20);
  },
  collapsed: async (page) => {
    await expect(page.locator('#pedals-panel')).toHaveClass(/collapsed/);
    const box = await page.locator('#pedals-panel').boundingBox();
    expect(box!.height).toBeLessThan(4);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Waveform Machine  (4 states × 4 events = 16 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type WaveformEvent =
  | { type: 'SELECT_SAWTOOTH' }
  | { type: 'SELECT_SINE' }
  | { type: 'SELECT_SQUARE' }
  | { type: 'SELECT_TRIANGLE' };

export const waveformMachine = setup({
  types: { events: {} as WaveformEvent },
}).createMachine({
  id: 'waveform',
  initial: 'sawtooth',
  states: {
    sawtooth: {
      meta: {
        reason: 'The SAW waveform button is active/highlighted in the overlay.',
        designIntent: 'Default bright waveform for melodic playing',
      },
      on: {
        SELECT_SINE: 'sine',
        SELECT_SQUARE: 'square',
        SELECT_TRIANGLE: 'triangle',
      },
    },
    sine: {
      meta: {
        reason: 'The SIN waveform button is active/highlighted in the overlay.',
        designIntent: 'Pure tone waveform for smooth timbre',
      },
      on: {
        SELECT_SAWTOOTH: 'sawtooth',
        SELECT_SQUARE: 'square',
        SELECT_TRIANGLE: 'triangle',
      },
    },
    square: {
      meta: {
        reason: 'The SQR waveform button is active/highlighted in the overlay.',
        designIntent: 'Rich harmonic content for organ-like timbre',
      },
      on: {
        SELECT_SAWTOOTH: 'sawtooth',
        SELECT_SINE: 'sine',
        SELECT_TRIANGLE: 'triangle',
      },
    },
    triangle: {
      meta: {
        reason: 'The TRI waveform button is active/highlighted in the overlay.',
        designIntent: 'Mellow waveform between sine and square',
      },
      on: {
        SELECT_SAWTOOTH: 'sawtooth',
        SELECT_SINE: 'sine',
        SELECT_SQUARE: 'square',
      },
    },
  },
});

export const waveformPlaywrightActions: Record<WaveformEvent['type'], (page: Page) => Promise<void>> = {
  SELECT_SAWTOOTH: async (page) => {
    await page.locator('.wave-btn[data-waveform="sawtooth"]').click();
  },
  SELECT_SINE: async (page) => {
    await page.locator('.wave-btn[data-waveform="sine"]').click();
  },
  SELECT_SQUARE: async (page) => {
    await page.locator('.wave-btn[data-waveform="square"]').click();
  },
  SELECT_TRIANGLE: async (page) => {
    await page.locator('.wave-btn[data-waveform="triangle"]').click();
  },
};

export const waveformInvariants: Record<string, string> = {
  sawtooth: 'The SAW waveform button is active/highlighted in the overlay.',
  sine: 'The SIN waveform button is active/highlighted in the overlay.',
  square: 'The SQR waveform button is active/highlighted in the overlay.',
  triangle: 'The TRI waveform button is active/highlighted in the overlay.',
};

export const waveformDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  sawtooth: async (page) => {
    await expect(page.locator('.wave-btn[data-waveform="sawtooth"]')).toHaveClass(/active/);
  },
  sine: async (page) => {
    await expect(page.locator('.wave-btn[data-waveform="sine"]')).toHaveClass(/active/);
  },
  square: async (page) => {
    await expect(page.locator('.wave-btn[data-waveform="square"]')).toHaveClass(/active/);
  },
  triangle: async (page) => {
    await expect(page.locator('.wave-btn[data-waveform="triangle"]')).toHaveClass(/active/);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Sustain Machine  (2 states × 4 events = 8 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type SustainEvent =
  | { type: 'PRESS_SPACE' }
  | { type: 'RELEASE_SPACE' }
  | { type: 'POINTERDOWN_SUSTAIN' }
  | { type: 'POINTERUP_SUSTAIN' }
  | { type: 'PLAY_NOTE' };

export const sustainMachine = setup({
  types: { events: {} as SustainEvent },
}).createMachine({
  id: 'sustain',
  initial: 'inactive',
  states: {
    inactive: {
      meta: {
        reason: 'The sustain pedal indicator is in its default/inactive state.',
        designIntent: 'Notes play and release normally',
      },
      on: {
        PRESS_SPACE: 'active',
        POINTERDOWN_SUSTAIN: 'active',
      },
    },
    active: {
      meta: {
        reason: 'The sustain pedal indicator is active/highlighted, notes are being sustained.',
        designIntent: 'Hold-on modifier keeps notes sustained until released',
      },
      on: {
        RELEASE_SPACE: 'inactive',
        POINTERUP_SUSTAIN: 'inactive',
        PLAY_NOTE: 'active',
      },
    },
  },
});

export const sustainPlaywrightActions: Record<SustainEvent['type'], (page: Page) => Promise<void>> = {
  PRESS_SPACE: async (page) => {
    await page.keyboard.down('Space');
  },
  RELEASE_SPACE: async (page) => {
    await page.keyboard.up('Space');
  },
  POINTERDOWN_SUSTAIN: async (page) => {
    await page.locator('#sustain-indicator').dispatchEvent('pointerdown', { bubbles: true });
  },
  POINTERUP_SUSTAIN: async (page) => {
    await page.locator('#sustain-indicator').dispatchEvent('pointerup', { bubbles: true });
  },
  PLAY_NOTE: async (page) => {
    await page.keyboard.press('c');
  },
};

export const sustainInvariants: Record<string, string> = {
  inactive: 'The sustain pedal indicator is in its default/inactive state.',
  active: 'The sustain pedal indicator is active/highlighted, notes are being sustained.',
};

export const sustainDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  inactive: async (page) => {
    await expect(page.locator('#sustain-indicator')).not.toHaveClass(/active/);
  },
  active: async (page) => {
    await expect(page.locator('#sustain-indicator')).toHaveClass(/active/);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Vibrato Machine  (2 states × 4 events = 8 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type VibratoEvent =
  | { type: 'PRESS_SHIFT' }
  | { type: 'RELEASE_SHIFT' }
  | { type: 'POINTERDOWN_VIBRATO' }
  | { type: 'POINTERUP_VIBRATO' }
  | { type: 'PLAY_NOTE' };

export const vibratoMachine = setup({
  types: { events: {} as VibratoEvent },
}).createMachine({
  id: 'vibrato',
  initial: 'inactive',
  states: {
    inactive: {
      meta: {
        reason: 'The vibrato indicator is in its default/inactive state.',
        designIntent: 'Notes play with normal pitch',
      },
      on: {
        PRESS_SHIFT: 'active',
        POINTERDOWN_VIBRATO: 'active',
      },
    },
    active: {
      meta: {
        reason: 'The vibrato indicator is active/highlighted, vibrato is being applied.',
        designIntent: 'Hold-on modifier applies pitch modulation until released',
      },
      on: {
        RELEASE_SHIFT: 'inactive',
        POINTERUP_VIBRATO: 'inactive',
        PLAY_NOTE: 'active',
      },
    },
  },
});

export const vibratoPlaywrightActions: Record<VibratoEvent['type'], (page: Page) => Promise<void>> = {
  PRESS_SHIFT: async (page) => {
    await page.keyboard.down('Shift');
  },
  RELEASE_SHIFT: async (page) => {
    await page.keyboard.up('Shift');
  },
  POINTERDOWN_VIBRATO: async (page) => {
    await page.locator('#vibrato-indicator').dispatchEvent('pointerdown', { bubbles: true });
  },
  POINTERUP_VIBRATO: async (page) => {
    await page.locator('#vibrato-indicator').dispatchEvent('pointerup', { bubbles: true });
  },
  PLAY_NOTE: async (page) => {
    await page.keyboard.press('c');
  },
};

export const vibratoInvariants: Record<string, string> = {
  inactive: 'The vibrato indicator is in its default/inactive state.',
  active: 'The vibrato indicator is active/highlighted, vibrato is being applied.',
};

export const vibratoDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  inactive: async (page) => {
    await expect(page.locator('#vibrato-indicator')).not.toHaveClass(/active/);
  },
  active: async (page) => {
    await expect(page.locator('#vibrato-indicator')).toHaveClass(/active/);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MIDI Panel Machine  (2 states × 1 event = 2 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type MidiPanelEvent = { type: 'TOGGLE_MIDI' };

export const midiPanelMachine = setup({
  types: { events: {} as MidiPanelEvent },
}).createMachine({
  id: 'midiPanel',
  initial: 'closed',
  states: {
    closed: {
      meta: {
        reason: 'The MIDI settings panel is closed/collapsed.',
        designIntent: 'MIDI panel hidden to reduce UI clutter',
      },
      on: { TOGGLE_MIDI: 'open' },
    },
    open: {
      meta: {
        reason: 'The MIDI settings panel is open, showing MIDI device list and MPE options.',
        designIntent: 'MIDI configuration controls accessible',
      },
      on: { TOGGLE_MIDI: 'closed' },
    },
  },
});

export const midiPanelPlaywrightActions: Record<MidiPanelEvent['type'], (page: Page) => Promise<void>> = {
  TOGGLE_MIDI: async (page) => {
    await page.locator('#midi-settings-toggle').click();
  },
};

export const midiPanelInvariants: Record<string, string> = {
  closed: 'The MIDI settings panel is closed/collapsed.',
  open: 'The MIDI settings panel is open, showing MIDI device list and MPE options.',
};

export const midiPanelDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  closed: async (page) => {
    await expect(page.locator('#midi-settings-panel')).not.toHaveClass(/open/);
  },
  open: async (page) => {
    await expect(page.locator('#midi-settings-panel')).toHaveClass(/open/);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MPE Machine  (2 states × 1 event = 2 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type MpeEvent = { type: 'TOGGLE_MPE' };

export const mpeMachine = setup({
  types: { events: {} as MpeEvent },
}).createMachine({
  id: 'mpe',
  initial: 'disabled',
  states: {
    disabled: {
      meta: {
        reason: 'The MPE output select dropdown is disabled/greyed out.',
        designIntent: 'Standard MIDI output mode',
      },
      on: { TOGGLE_MPE: 'enabled' },
    },
    enabled: {
      meta: {
        reason: 'The MPE output select dropdown is enabled and interactive.',
        designIntent: 'Expressive MIDI with per-note pitch/pressure',
      },
      on: { TOGGLE_MPE: 'disabled' },
    },
  },
});

export const mpePlaywrightActions: Record<MpeEvent['type'], (page: Page) => Promise<void>> = {
  TOGGLE_MPE: async (page) => {
    await page.locator('#mpe-enabled').click();
  },
};

export const mpeInvariants: Record<string, string> = {
  disabled: 'The MPE output select dropdown is disabled/greyed out.',
  enabled: 'The MPE output select dropdown is enabled and interactive.',
};

export const mpeDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  disabled: async (page) => {
    await expect(page.locator('#mpe-output-select')).toBeDisabled();
  },
  enabled: async (page) => {
    await expect(page.locator('#mpe-output-select')).not.toBeDisabled();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Text Input Focus Machine  (2 states × 3 events = 6 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type TextInputFocusEvent =
  | { type: 'CLICK_INPUT' }
  | { type: 'PRESS_ENTER' }
  | { type: 'PRESS_ESCAPE' };

export const textInputFocusMachine = setup({
  types: { events: {} as TextInputFocusEvent },
}).createMachine({
  id: 'textInputFocus',
  initial: 'blurred',
  states: {
    blurred: {
      meta: {
        reason: 'The D-reference frequency input is not focused.',
        designIntent: 'D-ref input not intercepting keyboard events',
      },
      on: { CLICK_INPUT: 'focused' },
    },
    focused: {
      meta: {
        reason: 'The D-reference frequency input is focused and ready for text entry.',
        designIntent: 'D-ref input captures text input for frequency entry',
      },
      on: {
        PRESS_ENTER: 'blurred',
        PRESS_ESCAPE: 'blurred',
      },
    },
  },
});

export const textInputFocusPlaywrightActions: Record<TextInputFocusEvent['type'], (page: Page) => Promise<void>> = {
  CLICK_INPUT: async (page) => {
    await page.locator('#d-ref-input').click();
  },
  PRESS_ENTER: async (page) => {
    await page.keyboard.press('Enter');
  },
  PRESS_ESCAPE: async (page) => {
    await page.keyboard.press('Escape');
  },
};

export const textInputFocusInvariants: Record<string, string> = {
  blurred: 'The D-reference frequency input is not focused.',
  focused: 'The D-reference frequency input is focused and ready for text entry.',
};

export const textInputFocusDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  blurred: async (page) => {
    await expect(page.locator('#d-ref-input')).not.toBeFocused();
  },
  focused: async (page) => {
    await expect(page.locator('#d-ref-input')).toBeFocused();
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Skew Label Machine  (2 states × 2 events = 4 pairs)
// ═══════════════════════════════════════════════════════════════════════════════

type SkewLabelEvent =
  | { type: 'SET_SKEW_MAX' }
  | { type: 'SET_SKEW_MIN' };

export const skewLabelMachine = setup({
  types: { events: {} as SkewLabelEvent },
}).createMachine({
  id: 'skewLabel',
  initial: 'dcompose',
  states: {
    dcompose: {
      meta: {
        reason: 'The skew label shows DCompose annotation at minimum skew position.',
        designIntent: 'DCompose isomorphic layout mode',
      },
      on: { SET_SKEW_MAX: 'midimech' },
    },
    midimech: {
      meta: {
        reason: 'The skew label shows MidiMech annotation at maximum skew position.',
        designIntent: 'MidiMech isomorphic layout mode',
      },
      on: { SET_SKEW_MIN: 'dcompose' },
    },
  },
});

export const skewLabelPlaywrightActions: Record<SkewLabelEvent['type'], (page: Page) => Promise<void>> = {
  SET_SKEW_MAX: async (page) => {
    await page.evaluate(() => {
      const s = document.getElementById('skew-slider') as HTMLInputElement;
      s.value = '1';
      s.dispatchEvent(new Event('input'));
    });
  },
  SET_SKEW_MIN: async (page) => {
    await page.evaluate(() => {
      const s = document.getElementById('skew-slider') as HTMLInputElement;
      s.value = '0';
      s.dispatchEvent(new Event('input'));
    });
  },
};

export const skewLabelInvariants: Record<string, string> = {
  dcompose: 'The skew label shows DCompose annotation at minimum skew position.',
  midimech: 'The skew label shows MidiMech annotation at maximum skew position.',
};

export const skewLabelDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  dcompose: async (page) => {
    await expect(page.locator('#skew-label')).toContainText('DCompose');
  },
  midimech: async (page) => {
    await expect(page.locator('#skew-label')).toContainText('MidiMech');
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Slider reset machines (parameterized factory)
// ═══════════════════════════════════════════════════════════════════════════════

import {
  tuningSliderMachine, tuningSliderPlaywrightActions, tuningSliderDomAssertions, tuningSliderInvariants,
  skewSliderMachine, skewSliderPlaywrightActions, skewSliderDomAssertions, skewSliderInvariants,
  volumeSliderMachine, volumeSliderPlaywrightActions, volumeSliderDomAssertions, volumeSliderInvariants,
  zoomSliderMachine, zoomSliderPlaywrightActions, zoomSliderDomAssertions, zoomSliderInvariants,
} from './sliderResetMachine';

import {
  aboutDialogMachine, aboutDialogPlaywrightActions, aboutDialogDomAssertions, aboutDialogInvariants,
} from './aboutDialogMachine';

import {
  drefInputMachine, drefInputPlaywrightActions, drefInputDomAssertions, drefInputInvariants,
} from './drefInputMachine';

import {
  modifierCompoundMachine, modifierCompoundPlaywrightActions, modifierCompoundDomAssertions, modifierCompoundInvariants,
} from './modifierCompoundMachine';

import {
  layoutPersistenceMachine, layoutPersistencePlaywrightActions, layoutPersistenceDomAssertions, layoutPersistenceInvariants,
} from './layoutPersistenceMachine';

import {
  viewportMachine, viewportPlaywrightActions, viewportDomAssertions, viewportInvariants,
} from './viewportMachine';

export {
  tuningSliderMachine, tuningSliderPlaywrightActions, tuningSliderDomAssertions, tuningSliderInvariants,
  skewSliderMachine, skewSliderPlaywrightActions, skewSliderDomAssertions, skewSliderInvariants,
  volumeSliderMachine, volumeSliderPlaywrightActions, volumeSliderDomAssertions, volumeSliderInvariants,
  zoomSliderMachine, zoomSliderPlaywrightActions, zoomSliderDomAssertions, zoomSliderInvariants,
  aboutDialogMachine, aboutDialogPlaywrightActions, aboutDialogDomAssertions, aboutDialogInvariants,
  drefInputMachine, drefInputPlaywrightActions, drefInputDomAssertions, drefInputInvariants,
  modifierCompoundMachine, modifierCompoundPlaywrightActions, modifierCompoundDomAssertions, modifierCompoundInvariants,
  layoutPersistenceMachine, layoutPersistencePlaywrightActions, layoutPersistenceDomAssertions, layoutPersistenceInvariants,
  viewportMachine, viewportPlaywrightActions, viewportDomAssertions, viewportInvariants,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Aggregate export
// ═══════════════════════════════════════════════════════════════════════════════

export const allMachines = [
  { name: 'overlay', machine: overlayMachine },
  { name: 'visualiser', machine: visualiserMachine },
  { name: 'pedals', machine: pedalsMachine },
  { name: 'waveform', machine: waveformMachine },
  { name: 'sustain', machine: sustainMachine },
  { name: 'vibrato', machine: vibratoMachine },
  { name: 'mpe', machine: mpeMachine },
  { name: 'textInputFocus', machine: textInputFocusMachine },
  { name: 'skewLabel', machine: skewLabelMachine },
  { name: 'tuningSlider', machine: tuningSliderMachine },
  { name: 'skewSlider', machine: skewSliderMachine },
  { name: 'volumeSlider', machine: volumeSliderMachine },
  { name: 'zoomSlider', machine: zoomSliderMachine },
  { name: 'aboutDialog', machine: aboutDialogMachine },
  { name: 'drefInput', machine: drefInputMachine },
  { name: 'modifierCompound', machine: modifierCompoundMachine },
  { name: 'layoutPersistence', machine: layoutPersistenceMachine },
  { name: 'viewport', machine: viewportMachine },
] as const;
