import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useSearchStore } from "../stores/searchStore";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useDebouncedCallback } from "../hooks/useDebounce";

export function SearchBar() {
	const inputRef = useRef<HTMLInputElement>(null);
	const query = useSearchStore(state => state.query);
	const search = useSearchStore(state => state.search);
	const clearSearch = useSearchStore(state => state.clearSearch);
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);

	// Local state for immediate input feedback, debounced search
	const [localQuery, setLocalQuery] = useState(query);

	// Sync local state when store query changes (e.g., on clear)
	useEffect(() => {
		setLocalQuery(query);
	}, [query]);

	// Debounced search - updates both query and results atomically
	const debouncedSearch = useDebouncedCallback((value: string) => {
		search(bookmarkTree, value);
	}, 300);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setLocalQuery(value);
		debouncedSearch(value);
	};

	const handleClear = () => {
		setLocalQuery("");
		clearSearch();
		inputRef.current?.focus();
	};

	// Keyboard shortcut: Cmd/Ctrl+K to focus search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
			if (e.key === "Escape" && document.activeElement === inputRef.current) {
				handleClear();
				inputRef.current?.blur();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div className="relative flex-1 max-w-xl">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
			<input
				ref={inputRef}
				type="text"
				value={localQuery}
				onChange={handleChange}
				placeholder="Search bookmarks... (Cmd+K)"
				className={`
          w-full h-10 pl-10 pr-10 
          bg-secondary text-primary
          rounded-lg
          placeholder:text-tertiary
          focus:outline-none
          transition-colors
        `}
			/>
			{localQuery && (
				<button
					onClick={handleClear}
					className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-tertiary transition-colors cursor-pointer"
					title="Clear search"
				>
					<X className="w-4 h-4 text-tertiary" />
				</button>
			)}
		</div>
	);
}
