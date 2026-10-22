import { learningScience } from './bank';
import { createLocalDiagnosticAdapter } from './localAdapter';

/** The /demo screen's adapter: the learning-science bank, with 300–600 ms simulated latency. */
export const demoAdapter = createLocalDiagnosticAdapter({ bank: learningScience });
