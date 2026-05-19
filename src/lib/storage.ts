/**
 * LocalStorage persistence for PsychScore session state.
 * Survives page reloads and tab switches.
 */

const STORAGE_KEY = "psychscore_session";

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

/**
 * Save the current session state to localStorage.
 */
export function saveSession(state: Omit<SessionState, "savedAt">): void {
  try {
    const data: SessionState = { ...state, savedAt: new Date().toISOString() };
    const json = JSON.stringify(data);
    // Check size — localStorage limit is ~5-10MB
    if (json.length > 4_500_000) {
      // If too large, save without raw row data
      const slim = {
        ...state,
        savedAt: new Date().toISOString(),
        parsedFile: state.parsedFile
          ? { ...(state.parsedFile as Record<string, unknown>), rows: [] }
          : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
      console.warn("PsychScore: Session data too large, saved without raw rows.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.warn("PsychScore: Failed to save session:", e);
  }
}

/**
 * Load session state from localStorage.
 * Returns null if no session exists or data is corrupted.
 */
export function loadSession(): SessionState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const data = JSON.parse(json) as SessionState;
    // Basic validation
    if (typeof data.currentStep !== "number" || typeof data.maxStep !== "number") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the saved session.
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if a saved session exists.
 */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
