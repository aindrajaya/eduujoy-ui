/**
 * U11: learners must never download staff code. The build merges chunks under 8 KB into their
 * importers (vite.config.ts), and Rollup does that only when no entry would run extra side effects.
 * This module has one, so no learner chunk is merged into the admin chunks or they into it. It also
 * records that staff code is loaded, which the Playwright check reads.
 */
declare global {
  interface Window {
    __eduujoyStaffCode?: true;
  }
}

window.__eduujoyStaffCode = true;

export {};
