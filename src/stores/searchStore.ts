import { create } from "zustand";

interface SearchState {
	query: string;
	setQuery: (query: string) => void;
	clearSearch: () => void;
}

/** Only the query lives here; results are derived from the current tree so they never go stale. */
export const useSearchStore = create<SearchState>(set => ({
	query: "",
	setQuery: query => set({ query }),
	clearSearch: () => set({ query: "" })
}));
