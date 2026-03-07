import type { Page } from '@playwright/test';

export interface StateInvariant {
  id: string;
  check: (page: Page) => Promise<void>;
  description?: string;
}

export interface StateMeta {
  testId?: string;
  reason: string;
  designIntent: string;
  invariants?: StateInvariant[];
}

export interface TransitionDocMeta {
  reason: string;
  designIntent: string;
  issueRef?: string;
}
