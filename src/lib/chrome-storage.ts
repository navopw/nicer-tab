import type { StateStorage } from "zustand/middleware";

/**
 * Zustand storage adapter backed by `chrome.storage.local`.
 *
 * Local rather than sync on purpose: the values we persist are keyed by Chrome
 * bookmark IDs, and those are not stable across devices.
 */
export const chromeStorage: StateStorage = {
	getItem: async (name: string): Promise<string | null> => {
		const result = await chrome.storage.local.get(name);
		const value = result[name];
		return typeof value === "string" ? value : null;
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await chrome.storage.local.set({ [name]: value });
	},
	removeItem: async (name: string): Promise<void> => {
		await chrome.storage.local.remove(name);
	}
};
