import { Search, X } from "lucide-react";
import { useSearchStore } from "../stores/searchStore";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useUIStore } from "../stores/uiStore";
import { searchBookmarks } from "../lib/search";
import { focusGrid, SEARCH_INPUT_ID } from "../lib/focus";
import { openTargetFromEvent, openUrl } from "../lib/open-url";

const SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl+K";

export function SearchBar() {
	const query = useSearchStore(state => state.query);
	const setQuery = useSearchStore(state => state.setQuery);
	const clearSearch = useSearchStore(state => state.clearSearch);
	const navigateToFolder = useBookmarkStore(state => state.navigateToFolder);
	const openInNewTab = useUIStore(state => state.openInNewTab);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		switch (e.key) {
			case "Escape":
				e.preventDefault();
				if (query) {
					clearSearch();
				} else {
					e.currentTarget.blur();
				}
				break;

			case "ArrowDown":
				if (query.trim() && focusGrid()) e.preventDefault();
				break;

			case "Enter": {
				// Search again rather than reading the rendered results, which can lag a keystroke behind.
				const { bookmarks, folders } = searchBookmarks(useBookmarkStore.getState().bookmarkTree, query);
				const topBookmark = bookmarks[0];
				const topFolder = folders[0]?.folder;
				if (topBookmark?.url) {
					e.preventDefault();
					void openUrl(topBookmark.url, openTargetFromEvent(e, openInNewTab));
				} else if (topFolder) {
					e.preventDefault();
					clearSearch();
					navigateToFolder(topFolder.id);
				}
				break;
			}
		}
	};

	return (
		<div role="search" className="relative flex-1 max-w-xl">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" aria-hidden="true" />
			<input
				id={SEARCH_INPUT_ID}
				type="text"
				role="searchbox"
				aria-label="Search bookmarks"
				aria-describedby="bookmark-search-hint"
				autoComplete="off"
				spellCheck={false}
				value={query}
				onChange={e => setQuery(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={`Search bookmarks (${SHORTCUT_LABEL})`}
				className={`
					w-full h-10 pl-10 pr-10
					bg-secondary text-primary
					rounded-lg
					placeholder:text-tertiary
					focus:outline-none focus:border-[var(--accent-color)]
					transition-colors
				`}
			/>
			<span id="bookmark-search-hint" className="sr-only">
				Press Enter to open the top result, or the down arrow to browse the results.
			</span>
			{query && (
				<button
					type="button"
					onClick={() => {
						clearSearch();
						document.getElementById(SEARCH_INPUT_ID)?.focus();
					}}
					className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-tertiary transition-colors cursor-pointer"
					aria-label="Clear search"
					title="Clear search"
				>
					<X className="w-4 h-4 text-tertiary" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}
