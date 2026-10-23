import type { Bank } from './bank';
import { createLocalDiagnosticAdapter, type LocalDiagnosticAdapter } from './localAdapter';

/** The /demo screen's adapter for one bank, with 300–600 ms simulated latency. */
export const createDemoAdapter = (bank: Bank): LocalDiagnosticAdapter => createLocalDiagnosticAdapter({ bank });
