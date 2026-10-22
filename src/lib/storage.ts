// The only module allowed to touch localStorage (ESLint enforces this). It holds quiz drafts
// (PRD-UI §7), never tokens, roles or plan data (PRD-UI §6). Every call tolerates storage being
// unavailable (private mode, quota, disabled) and corrupt JSON.

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = store()?.getItem(key);
    if (raw === null || raw === undefined) return null;
    const value: unknown = JSON.parse(raw);
    return isValid(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function keysWithPrefix(prefix: string): string[] {
  try {
    const s = store();
    if (!s) return [];
    const keys: string[] = [];
    for (let i = 0; i < s.length; i += 1) {
      const key = s.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}
