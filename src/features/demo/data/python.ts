// Keeps this bank in a lazy chunk of its own (see banks.ts). Without a side effect, the build's
// small-chunk merge moved shared code into the bank chunks and /signin then loaded them (+8 KB).
import bank from './python.json';

window.__eduujoyDemoBanks = [...(window.__eduujoyDemoBanks ?? []), 'python'];

export default bank;
