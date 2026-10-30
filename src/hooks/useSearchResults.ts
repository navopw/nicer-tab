import { useDeferredValue, useMemo } from "react";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useSearchStore } from "../stores/searchStore";
import { searchBookmarks, type SearchResults } from "../lib/search";

/** Results for the current query, recomputed whenever the query or the bookmarks change. */
export function useSearchResults(): { isSearching: boolean; results: SearchResults } {
	const query = useSearchStore(state => state.query);
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	// Keeps typing responsive with large collections: the input updates first, the results right after.
	const deferredQuery = useDeferredValue(query);

	const results = useMemo(() => searchBookmarks(bookmarkTree, deferredQuery), [bookmarkTree, deferredQuery]);
	return { isSearching: query.trim().length > 0, results };
}
