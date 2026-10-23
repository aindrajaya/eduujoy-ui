// Keeps this bank in a lazy chunk of its own (see banks.ts). Without a side effect, the build's
// small-chunk merge moved shared code into the bank chunks and /signin then loaded them (+8 KB).
import bank from './public-speaking.json';

window.__eduujoyDemoBanks = [...(window.__eduujoyDemoBanks ?? []), 'public-speaking'];

export default bank;
