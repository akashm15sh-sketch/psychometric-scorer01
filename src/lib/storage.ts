/**
 * LocalStorage persistence for PsychScore session state.
 *
 * Each browser tab gets its own isolated session key so that:
 *   - Different users on the same computer don't overwrite each other's work.
 *   - Opening two studies in two tabs stays independent.
 *   - Refreshing the page resumes the same session (sessionStorage persists
 *     across refreshes but is cleared when the tab is closed).
 *
 * Key scheme:  psychscore_session_<tabId>
 * Tab ID is stored in sessionStorage so it is tab-scoped.
 */

const SESSION_PREFIX = "psychscore_session_";
const TAB_ID_KEY    = "psychscore_tab_id";
const SESSION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Tab-scoped ID ────────────────────────────────────────────────────────────

function getTabId(): string {
  try {
    let id = sessionStorage.getItem(TAB_ID_KEY);
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      sessionStorage.setItem(TAB_ID_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (private-browsing edge cases) — use a
    // module-level fallback that is at least process-scoped.
    return _fallbackTabId;
  }
}

const _fallbackTabId = Date.now().toString(36) + Math.random().toString(36).slice(2);

function storageKey(): string {
  return SESSION_PREFIX + getTabId();
}

// ── Garbage-collect stale sessions ──────────────────────────────────────────

function cleanOldSessions(): void {
  try {
    const cutoff = Date.now() - SESSION_TTL_MS;
    const toRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(SESSION_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) { toRemove.push(key); continue; }
        const data = JSON.parse(raw) as { savedAt?: string };
        const savedAt = data.savedAt ? new Date(data.savedAt).getTime() : 0;
        if (savedAt < cutoff) toRemove.push(key);
      } catch {
        toRemove.push(key); // corrupted entry
      }
    }

    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    // localStorage unavailable — ignore
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface SessionState {
  currentStep: number;
  maxStep: number;
  parsedFile: unknown | null;
  config: unknown | null;
  result: unknown | null;
  analysisOptions: unknown | null;
  analysisResult: unknown | null;
  savedAt: string;
}

/** Save current session state to this tab's localStorage slot. */
export function saveSession(state: Omit<SessionState, "savedAt">): void {
  try {
    const data: SessionState = { ...state, savedAt: new Date().toISOString() };
    const json = JSON.stringify(data);

    // If payload exceeds ~4.5 MB, drop raw rows to stay within quota.
    if (json.length > 4_500_000) {
      const slim: SessionState = {
        ...data,
        parsedFile: state.parsedFile
          ? { ...(state.parsedFile as Record<string, unknown>), rows: [] }
          : null,
      };
      localStorage.setItem(storageKey(), JSON.stringify(slim));
      console.warn("PsychScore: session too large, saved without raw rows.");
      return;
    }

    localStorage.setItem(storageKey(), json);
  } catch (e) {
    console.warn("PsychScore: failed to save session:", e);
  }
}

/** Load this tab's session. Returns null if none exists or data is corrupt. */
export function loadSession(): SessionState | null {
  // Opportunity to prune sessions left by closed tabs / other users.
  cleanOldSessions();

  try {
    const json = localStorage.getItem(storageKey());
    if (!json) return null;
    const data = JSON.parse(json) as SessionState;
    if (typeof data.currentStep !== "number" || typeof data.maxStep !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

/** Clear only this tab's session. Other tabs are unaffected. */
export function clearSession(): void {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    // ignore
  }
}

/** Whether this tab has a saved session. */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(storageKey()) !== null;
  } catch {
    return false;
  }
}
