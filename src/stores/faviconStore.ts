import { create } from "zustand";
import type { FaviconOverride } from "../types/favicon";
import { FAVICON_STORAGE_KEY, parseFaviconState, readFaviconOverrides } from "../lib/favicon-storage";

interface FaviconState {
	/** Custom icons keyed by bookmark ID, mirrored from `chrome.storage.local`. */
	overrides: Record<string, FaviconOverride>;
}

export const useFaviconStore = create<FaviconState>()(() => ({
	overrides: {}
}));

/**
 * Load the custom icons once and keep them in sync with storage, so cards read
 * them from memory instead of each hitting storage on mount.
 */
export function setupFaviconSync(): () => void {
	let hasNewerState = false;

	const handleChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
		if (areaName !== "local" || !(FAVICON_STORAGE_KEY in changes)) return;
		hasNewerState = true;
		useFaviconStore.setState({ overrides: parseFaviconState(changes[FAVICON_STORAGE_KEY]?.newValue).overrides });
	};

	chrome.storage.onChanged.addListener(handleChange);

	readFaviconOverrides()
		.then(overrides => {
			// A change that arrived while reading is newer than what was read.
			if (!hasNewerState) useFaviconStore.setState({ overrides });
		})
		.catch(error => console.error("Failed to load custom icons:", error));

	return () => chrome.storage.onChanged.removeListener(handleChange);
}
