import { DEFAULT_SETTINGS, type ExtensionSettings } from "./types.js";

const SETTINGS_KEY = "settings";
const INTERRUPTED_KEY = "unfinished_action";

export const loadSettings = async (): Promise<ExtensionSettings> => {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const candidate = stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return {
    receiptHistory: false,
    highContrast: candidate?.highContrast === true
  };
};

export const saveSettings = async (settings: ExtensionSettings): Promise<void> => {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { ...settings, receiptHistory: false } });
};

export const markUnfinished = async (phase: string): Promise<void> => {
  await chrome.storage.session.set({ [INTERRUPTED_KEY]: { phase, at: Date.now() } });
};

export const clearUnfinished = async (): Promise<void> => {
  await chrome.storage.session.remove(INTERRUPTED_KEY);
};

export const loadInterrupted = async (): Promise<{ phase: string } | null> => {
  const stored = await chrome.storage.session.get(INTERRUPTED_KEY);
  const marker = stored[INTERRUPTED_KEY] as { phase?: unknown } | undefined;
  return marker && typeof marker.phase === "string" ? { phase: marker.phase } : null;
};

export const clearAllExtensionData = async (): Promise<{ local: number; session: number }> => {
  const [local, session] = await Promise.all([
    chrome.storage.local.get(null),
    chrome.storage.session.get(null)
  ]);
  await Promise.all([chrome.storage.local.clear(), chrome.storage.session.clear()]);
  return { local: Object.keys(local).length, session: Object.keys(session).length };
};

export { DEFAULT_SETTINGS };
