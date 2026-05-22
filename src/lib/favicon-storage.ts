import type { FaviconOverride, FaviconStorageState } from "../types/favicon";

const FAVICON_STORAGE_KEY = "nicer-tab-favicons-v1";
export const FAVICON_OVERRIDES_UPDATED_EVENT = "nicer-tab:favicon-overrides-updated";

function notifyFaviconOverridesUpdated(bookmarkIds?: string[]) {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(FAVICON_OVERRIDES_UPDATED_EVENT, {
			detail: { bookmarkIds }
		})
	);
}

async function readFaviconState(): Promise<FaviconStorageState> {
	const result = await chrome.storage.local.get(FAVICON_STORAGE_KEY);
	const value = result[FAVICON_STORAGE_KEY] as FaviconStorageState | undefined;
	if (!value || typeof value !== "object") {
		return { overrides: {} };
	}

	if (!value.overrides || typeof value.overrides !== "object") {
		return { overrides: {} };
	}

	return { overrides: value.overrides };
}

async function writeFaviconState(state: FaviconStorageState): Promise<void> {
	await chrome.storage.local.set({ [FAVICON_STORAGE_KEY]: state });
}

export async function getFaviconOverride(bookmarkId: string): Promise<FaviconOverride | null> {
	const state = await readFaviconState();
	return state.overrides[bookmarkId] ?? null;
}

export async function setFaviconOverride(override: Omit<FaviconOverride, "updatedAt">): Promise<void> {
	const state = await readFaviconState();
	state.overrides[override.bookmarkId] = {
		...override,
		updatedAt: Date.now()
	};
	await writeFaviconState(state);
	notifyFaviconOverridesUpdated([override.bookmarkId]);
}

export async function removeFaviconOverride(bookmarkId: string): Promise<void> {
	const state = await readFaviconState();
	if (!(bookmarkId in state.overrides)) return;
	delete state.overrides[bookmarkId];
	await writeFaviconState(state);
	notifyFaviconOverridesUpdated([bookmarkId]);
}

export async function removeFaviconOverrides(bookmarkIds: string[]): Promise<void> {
	if (bookmarkIds.length === 0) return;
	const state = await readFaviconState();
	let changed = false;

	for (const bookmarkId of bookmarkIds) {
		if (bookmarkId in state.overrides) {
			delete state.overrides[bookmarkId];
			changed = true;
		}
	}

	if (!changed) return;
	await writeFaviconState(state);
	notifyFaviconOverridesUpdated(bookmarkIds);
}
