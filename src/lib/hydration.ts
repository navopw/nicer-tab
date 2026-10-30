interface PersistedStore {
	persist: {
		hasHydrated: () => boolean;
		onFinishHydration: (listener: () => void) => () => void;
	};
}

/**
 * Resolve once a persisted store has loaded its saved state. Zustand never
 * reports a failed hydration, so this also gives up after `timeoutMs` and the
 * store keeps its defaults.
 */
export function waitForHydration(store: PersistedStore, timeoutMs = 1000): Promise<void> {
	if (store.persist.hasHydrated()) return Promise.resolve();

	return new Promise(resolve => {
		const finish = () => {
			window.clearTimeout(timeout);
			unsubscribe();
			resolve();
		};
		const timeout = window.setTimeout(finish, timeoutMs);
		const unsubscribe = store.persist.onFinishHydration(finish);
	});
}
