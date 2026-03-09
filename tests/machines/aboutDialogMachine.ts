import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

// ─── Invariants on 'open' state (absorbs BH-AB-1, BH-AB-2, BH-AB-3) ────────

const aboutContentCheck: StateInvariant = {
  id: 'BH-AB-1',
  check: async (page: Page) => {
    const aboutText = await page.locator('#about-dialog').textContent();
    expect(aboutText?.toLowerCase()).toContain('isomorphic');
    const colCount = await page.locator('#about-dialog .about-col').count();
    expect(colCount).toBe(0);
    const aboutLinks = await page.locator('#about-dialog a').allTextContents();
    const hasGitHubProfile = aboutLinks.some(t => t.includes('GitHub') && t.includes('zitongcharliedeng'));
    expect(hasGitHubProfile).toBe(false);
  },
};

const aboutLinksCheck: StateInvariant = {
  id: 'BH-AB-2',
  check: async (page: Page) => {
    const linkTexts = await page.locator('#about-content a').allTextContents();
    expect(linkTexts.some(t => t.includes('Wicki'))).toBe(true);
    expect(linkTexts.some(t => t.includes('Striso'))).toBe(true);
    expect(linkTexts.some(t => t.includes('MIDImech'))).toBe(true);
    expect(linkTexts.some(t => t.includes('WickiSynth'))).toBe(true);
  },
};

const aboutFooterCheck: StateInvariant = {
  id: 'BH-AB-3',
  check: async (page: Page) => {
    const contentText = await page.locator('#about-content').textContent();
    expect(contentText).toContain('WickiSynth');
    expect(contentText).toContain('Piers Titus');
    expect(contentText).toContain('MIDImech');
    expect(contentText).toContain('Striso');
    const allLinks = await page.locator('#about-content a').allTextContents();
    expect(allLinks.every(t => !(/^GitHub$/i.exec(t)))).toBe(true);
  },
};

// ─── Machine ─────────────────────────────────────────────────────────────────

type AboutEvent = { type: 'CLICK_ABOUT' } | { type: 'CLOSE' };

export const aboutDialogMachine = setup({
  types: { events: {} as AboutEvent },
}).createMachine({
  id: 'aboutDialog',
  initial: 'closed',
  states: {
    closed: {
      meta: {
        reason: 'The about dialog is not visible. Main UI is fully interactive.',
        designIntent: 'Default state — dialog only shown on explicit user request',
      },
      on: { CLICK_ABOUT: 'open' },
    },
    open: {
      meta: {
        reason: 'The about dialog is visible showing project description, credits, and links.',
        designIntent: 'Attribution and project context accessible without leaving the app',
        invariants: [aboutContentCheck, aboutLinksCheck, aboutFooterCheck] as StateInvariant[],
      },
      on: { CLOSE: 'closed' },
    },
  },
});

// ─── Playwright Actions ──────────────────────────────────────────────────────

export const aboutDialogPlaywrightActions: Record<AboutEvent['type'], (page: Page) => Promise<void>> = {
  CLICK_ABOUT: async (page) => {
    await page.locator('#about-btn').click();
    await page.waitForTimeout(300);
  },
  CLOSE: async (page) => {
    await page.locator('#about-close').click();
    await page.waitForTimeout(200);
  },
};

// ─── Invariants (LLM descriptions) ──────────────────────────────────────────

export const aboutDialogInvariants: Record<string, string> = {
  closed: 'The about dialog is not visible. Main UI is fully interactive.',
  open: 'The about dialog is visible showing project description, credits, and links.',
};

// ─── DOM Assertions ──────────────────────────────────────────────────────────

export const aboutDialogDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  closed: async (page) => {
    await expect(page.locator('#about-dialog')).not.toBeVisible();
  },
  open: async (page) => {
    await expect(page.locator('#about-dialog')).toBeVisible();
  },
};
