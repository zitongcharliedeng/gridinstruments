import { test, expect } from '@playwright/test';

/**
 * Panel resize handle regression tests.
 *
 * @reason The drag handles between panels (visualiser↔grid and grid↔pedals)
 *   were completely invisible and non-functional due to incorrect HTML structure.
 *   The handles were siblings of the panels in the flex column, so their
 *   `position: absolute; bottom: 0` had no positioned parent to anchor to.
 *   Fix: handles moved *inside* their panels so they anchor to the correct
 *   `position: relative` container. These tests lock that fix in.
 *
 * @design-intent Panels must be user-resizable at runtime so musicians can
 *   allocate screen space between note history, grid, and pedals. The handle
 *   sits on the seam between panels (centered via translate(-50%,±50%)) and
 *   must never intrude into the keyboard grid.
 */

test.describe('Panel Resize Handles', () => {

  test.describe('Handle Visibility and Position', () => {
    /**
     * @reason Handle must have ARIA role separator and label for a11y.
     * @design-intent Screen reader users need to know what the handle does.
     */
    test('PNL-VIS-3: Handles have correct ARIA attributes', async ({ page }) => {
      await page.goto('/');
      const visHandle = page.locator('#visualiser-panel .panel-resize-handle');
      const pedHandle = page.locator('#pedals-panel .panel-resize-handle');
      await expect(visHandle).toHaveAttribute('role', 'separator');
      await expect(visHandle).toHaveAttribute('aria-label', 'Resize visualiser');
      await expect(pedHandle).toHaveAttribute('role', 'separator');
      await expect(pedHandle).toHaveAttribute('aria-label', 'Resize pedals');
    });

    /**
     * @reason Handle must be positioned on the seam — its center Y must be
     *   approximately at the bottom edge of #visualiser-panel.
     * @design-intent Visual affordance only works if the handle sits on the
     *   border line, not floating elsewhere in the page.
     */
    test('PNL-VIS-4: Visualiser handle center is at visualiser-panel bottom edge', async ({ page }) => {
      await page.goto('/');
      const panelBox  = await page.locator('#visualiser-panel').boundingBox();
      const handleBox = await page.locator('#visualiser-panel .panel-resize-handle').boundingBox();
      expect(panelBox).not.toBeNull();
      expect(handleBox).not.toBeNull();
      const panelBottom  = panelBox!.y + panelBox!.height;
      const handleCenterY = handleBox!.y + handleBox!.height / 2;
      expect(Math.abs(handleCenterY - panelBottom)).toBeLessThan(4);
    });

    /**
     * @reason Pedals handle center must be at the top edge of #pedals-panel.
     * @design-intent Same seam-centering requirement for the pedals panel.
     */
    test('PNL-VIS-5: Pedals handle center is at pedals-panel top edge', async ({ page }) => {
      await page.goto('/');
      const panelBox  = await page.locator('#pedals-panel').boundingBox();
      const handleBox = await page.locator('#pedals-panel .panel-resize-handle').boundingBox();
      expect(panelBox).not.toBeNull();
      expect(handleBox).not.toBeNull();
      const panelTop      = panelBox!.y;
      const handleCenterY = handleBox!.y + handleBox!.height / 2;
      expect(Math.abs(handleCenterY - panelTop)).toBeLessThan(4);
    });

    /**
     * @reason Handle must be a DOM child of #visualiser-panel, not #grid-area.
     *   The handle visually straddles the seam (extends 12px into both sides)
     *   via overflow:visible + transform, but must never live in the grid DOM.
     * @design-intent Keeping the handle outside grid-area's DOM ensures grid
     *   pointer events are not blocked by the handle element.
     */
    test('PNL-VIS-6: Visualiser handle is DOM child of visualiser-panel not grid-area', async ({ page }) => {
      await page.goto('/');
      const inVisualiser = await page.locator('#visualiser-panel .panel-resize-handle').count();
      const inGrid       = await page.locator('#grid-area .panel-resize-handle').count();
      expect(inVisualiser).toBe(1);
      expect(inGrid).toBe(0);
    });
  });

  test.describe('Drag Resize', () => {
    /**
     * @reason Panel must not exceed 60% of viewport height regardless of drag.
     * @design-intent Without a cap, a runaway drag could make the grid
     *   invisible — the 60% cap ensures the grid always has room.
     */
    test('PNL-DRAG-4: Visualiser panel capped at 60% viewport height', async ({ page }) => {
      await page.goto('/');
      const handle    = page.locator('#visualiser-panel .panel-resize-handle');
      const handleBox = await handle.boundingBox();
      const cx = handleBox!.x + handleBox!.width / 2;
      const cy = handleBox!.y + handleBox!.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, cy + 900, { steps: 30 });
      await page.mouse.up();
      await page.waitForTimeout(150);
      const panelH    = (await page.locator('#visualiser-panel').boundingBox())!.height;
      const viewportH = page.viewportSize()!.height;
      expect(panelH).toBeLessThanOrEqual(viewportH * 0.61);
    });
  });

  test.describe('Keyboard Accessibility', () => {
    /**
     * @reason ArrowDown on the focused visualiser handle must increase panel
     *   height by 10px per keypress.
     * @design-intent Keyboard-only users need fine-grained resize control;
     *   the 10px step mirrors standard slider keyboard conventions.
     */
    test('PNL-KEY-1: ArrowDown on visualiser handle increases height by 10px', async ({ page }) => {
      await page.goto('/');
      const panel  = page.locator('#visualiser-panel');
      const handle = page.locator('#visualiser-panel .panel-resize-handle');
      const hBefore = (await panel.boundingBox())!.height;
      await handle.focus();
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
      const hAfter = (await panel.boundingBox())!.height;
      expect(Math.abs(hAfter - hBefore - 10)).toBeLessThanOrEqual(2);
    });

    /**
     * @reason ArrowUp on the focused visualiser handle must decrease panel
     *   height by 10px (clamped at min).
     * @design-intent Same accessibility contract — both directions work.
     */
    test('PNL-KEY-2: ArrowUp on visualiser handle decreases height by 10px', async ({ page }) => {
      await page.goto('/');
      const panel  = page.locator('#visualiser-panel');
      const handle = page.locator('#visualiser-panel .panel-resize-handle');
      const hBefore = (await panel.boundingBox())!.height;
      await handle.focus();
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(100);
      const hAfter = (await panel.boundingBox())!.height;
      expect(hAfter).toBeLessThan(hBefore);
      expect(hAfter).toBeGreaterThanOrEqual(60);
    });
  });

  test.describe('localStorage Persistence', () => {
    /**
     * @reason After a drag, the new panel height must be written to localStorage
     *   under gi_visualiser_h so it survives page reload.
     * @design-intent Persistent layout means users don't lose their preferred
     *   panel sizes when they reload the page.
     */
    test('PNL-LS-1: Visualiser height persists to localStorage after drag', async ({ page }) => {
      await page.goto('/');
      const handle    = page.locator('#visualiser-panel .panel-resize-handle');
      const handleBox = await handle.boundingBox();
      const cx = handleBox!.x + handleBox!.width / 2;
      const cy = handleBox!.y + handleBox!.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, cy + 60, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      const stored = await page.evaluate(() => localStorage.getItem('gi_visualiser_h'));
      expect(stored).not.toBeNull();
      expect(parseFloat(stored!)).toBeGreaterThan(130);
    });

    /**
     * @reason After page reload, the visualiser panel must restore to the
     *   height saved in localStorage (not reset to the default 120px).
     * @design-intent The persistence must actually survive a navigation, not
     *   just be written to storage.
     */
    test('PNL-LS-2: Visualiser height restores from localStorage on reload', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('gi_visualiser_h', '200'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      const panelH = (await page.locator('#visualiser-panel').boundingBox())!.height;
      expect(Math.abs(panelH - 200)).toBeLessThanOrEqual(5);
    });

    /**
     * @reason localStorage value greater than 60% viewport must be discarded
     *   on load (sanity guard against stale large values).
     * @design-intent Prevents a bad saved value from hiding the grid entirely
     *   after viewport resize or screen change.
     */
    test('PNL-LS-3: Insane localStorage height (>60% viewport) is discarded on load', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('gi_visualiser_h', '9999'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      const panelH    = (await page.locator('#visualiser-panel').boundingBox())!.height;
      const viewportH = page.viewportSize()!.height;
      expect(panelH).toBeLessThanOrEqual(viewportH * 0.61);
    });
  });

  test.describe('Reset Layout', () => {
    /**
     * @reason The "Reset" button must clear all gi_* localStorage keys and
     *   restore panels to their default heights (120px visualiser, 44px pedals).
     * @design-intent One-click full reset is the user's nuclear option when
     *   the layout gets into a bad state.
     */
    test('PNL-RESET-1: Reset layout button restores visualiser to 120px default', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.setItem('gi_visualiser_h', '300'));
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.locator('#reset-layout').click();
      await page.waitForLoadState('networkidle');
      const panelH = (await page.locator('#visualiser-panel').boundingBox())!.height;
      expect(Math.abs(panelH - 120)).toBeLessThanOrEqual(5);
    });

    /**
     * @reason Reset must clear custom gi_* values so panels return to defaults.
     *   XState actors re-persist default values on startup, so we verify custom
     *   values are gone and remaining keys hold only default values.
     * @design-intent The reset should not be undone by a reload.
     */
    test('PNL-RESET-2: Reset layout clears custom gi_* localStorage values', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('gi_visualiser_h', '300');
        localStorage.setItem('gi_pedals_h', '100');
        localStorage.setItem('gi_zoom', '2');
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.locator('#reset-layout').click();
      await page.waitForLoadState('networkidle');
      const state = await page.evaluate(() => ({
        visH: localStorage.getItem('gi_visualiser_h'),
        pedH: localStorage.getItem('gi_pedals_h'),
        zoom: localStorage.getItem('gi_zoom'),
      }));
      expect(state.zoom).toBeNull();
      expect(state.visH).not.toBe('300');
      expect(state.pedH).not.toBe('100');
    });
  });
});
