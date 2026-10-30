import type { FaviconOverride, FaviconStorageState } from "../types/favicon";

export const FAVICON_STORAGE_KEY = "nicer-tab-favicons-v1";

export function parseFaviconState(value: unknown): FaviconStorageState {
	if (!value || typeof value !== "object") {
		return { overrides: {} };
	}

	const { overrides } = value as Partial<FaviconStorageState>;
	if (!overrides || typeof overrides !== "object") {
		return { overrides: {} };
	}

	return { overrides };
}

export async function readFaviconOverrides(): Promise<Record<string, FaviconOverride>> {
	const result = await chrome.storage.local.get(FAVICON_STORAGE_KEY);
	return parseFaviconState(result[FAVICON_STORAGE_KEY]).overrides;
}

// Every write is a read-modify-write of one storage key, so they run one at a time
// to keep concurrent changes from overwriting each other.
let writeQueue: Promise<void> = Promise.resolve();

function updateOverrides(mutate: (overrides: Record<string, FaviconOverride>) => boolean): Promise<void> {
	const run = async () => {
		const overrides = await readFaviconOverrides();
		if (!mutate(overrides)) return;
		await chrome.storage.local.set({ [FAVICON_STORAGE_KEY]: { overrides } satisfies FaviconStorageState });
	};

	const result = writeQueue.then(run);
	writeQueue = result.catch(() => undefined);
	return result;
}

export function setFaviconOverride(override: Omit<FaviconOverride, "updatedAt">): Promise<void> {
	return updateOverrides(overrides => {
		overrides[override.bookmarkId] = { ...override, updatedAt: Date.now() };
		return true;
	});
}

/** Store several overrides at once, e.g. after an import or an undo. Existing ones are kept unless `replace` is set. */
export function setFaviconOverrides(entries: FaviconOverride[], replace = false): Promise<void> {
	if (entries.length === 0) return Promise.resolve();
	return updateOverrides(overrides => {
		let changed = false;
		for (const entry of entries) {
			if (!replace && overrides[entry.bookmarkId]) continue;
			overrides[entry.bookmarkId] = entry;
			changed = true;
		}
		return changed;
	});
}

export function removeFaviconOverrides(bookmarkIds: string[]): Promise<void> {
	if (bookmarkIds.length === 0) return Promise.resolve();
	return updateOverrides(overrides => {
		let changed = false;
		for (const bookmarkId of bookmarkIds) {
			if (bookmarkId in overrides) {
				delete overrides[bookmarkId];
				changed = true;
			}
		}
		return changed;
	});
}
