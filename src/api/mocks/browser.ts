import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Dev-only mock API (VITE_API_MOCKS=true). Never imported by production builds. */
export const worker = setupWorker(...handlers);
