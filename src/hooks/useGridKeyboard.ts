import { useCallback, useEffect } from "react";
import { useKeyboardStore } from "../stores/keyboardStore";
import type { BookmarkNode } from "../types/bookmark";

interface UseGridKeyboardOptions {
	bookmarks: BookmarkNode[];
	onOpen: (bookmark: BookmarkNode) => void;
	onEdit?: (bookmark: BookmarkNode) => void;
	gridRef: React.RefObject<HTMLDivElement | null>;
}

// Split grid template columns without breaking on spaces inside parentheses
function splitGridTemplateColumns(template: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let depth = 0;

	for (const char of template) {
		if (char === "(") depth += 1;
		if (char === ")") depth = Math.max(0, depth - 1);

		if (char === " " && depth === 0) {
			const trimmed = current.trim();
			if (trimmed) tokens.push(trimmed);
			current = "";
			continue;
		}
		current += char;
	}

	const trimmed = current.trim();
	if (trimmed) tokens.push(trimmed);
	return tokens;
}

function parseRepeatCount(token: string): number | null {
	const match = token.match(/^repeat\((\d+)\s*,/);
	if (!match) return null;
	const count = Number(match[1]);
	return Number.isFinite(count) ? count : null;
}

// Get the number of columns from the grid
function getColumnCount(gridElement: HTMLElement | null): number {
	if (!gridElement) return 1;
	const template = window.getComputedStyle(gridElement).gridTemplateColumns.trim();
	if (!template || template === "none" || template === "subgrid") return 1;

	const tokens = splitGridTemplateColumns(template);
	let count = 0;
	for (const token of tokens) {
		const repeatCount = parseRepeatCount(token);
		count += repeatCount ?? 1;
	}

	return count || 1;
}

export function useGridKeyboard({ bookmarks, onOpen, onEdit, gridRef }: UseGridKeyboardOptions) {
	const focusArea = useKeyboardStore(state => state.focusArea);
	const focusedIndex = useKeyboardStore(state => state.focusedBookmarkIndex);
	const setFocusedIndex = useKeyboardStore(state => state.setFocusedBookmarkIndex);
	const moveFocusToSidebar = useKeyboardStore(state => state.moveFocusToSidebar);
	const setFocusArea = useKeyboardStore(state => state.setFocusArea);

	// Ensure focused index is valid
	useEffect(() => {
		if (focusArea !== "grid") return;
		if (bookmarks.length === 0) {
			if (focusedIndex !== -1) setFocusedIndex(-1);
			return;
		}
		if (focusedIndex < 0) {
			setFocusedIndex(0);
			return;
		}
		if (focusedIndex >= bookmarks.length) {
			setFocusedIndex(Math.max(0, bookmarks.length - 1));
		}
	}, [focusArea, focusedIndex, bookmarks.length, setFocusedIndex]);

	// Scroll focused element into view
	useEffect(() => {
		if (focusArea === "grid" && focusedIndex >= 0 && gridRef.current) {
			const cards = gridRef.current.querySelectorAll("[data-bookmark-card]");
			const focusedCard = cards[focusedIndex] as HTMLElement;
			if (focusedCard) {
				focusedCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
			}
		}
	}, [focusArea, focusedIndex, gridRef]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Only handle if grid is focused
			if (focusArea !== "grid") return;

			// Don't handle if a modal is open
			if (document.body.dataset.modalOpen === "true") return;

			// Don't handle if typing in input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

			// Don't handle if no bookmarks
			if (bookmarks.length === 0) return;

			// If nothing is focused yet, initialize focus on first item for most keys
			if (focusedIndex < 0) {
				if (["ArrowRight", "ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
					e.preventDefault();
					setFocusedIndex(0);
					return;
				}
				if (e.key === "ArrowLeft") {
					e.preventDefault();
					moveFocusToSidebar();
					return;
				}
			}

			const columnCount = Math.max(1, getColumnCount(gridRef.current));
			const rowCount = Math.ceil(bookmarks.length / columnCount);
			const currentRow = Math.floor(focusedIndex / columnCount);
			const currentCol = focusedIndex % columnCount;

			switch (e.key) {
				case "ArrowRight": {
					e.preventDefault();
					if (focusedIndex < bookmarks.length - 1) {
						setFocusedIndex(focusedIndex + 1);
					}
					break;
				}

				case "ArrowLeft": {
					e.preventDefault();
					if (focusedIndex > 0) {
						setFocusedIndex(focusedIndex - 1);
					} else {
						// At the start, move back to sidebar
						moveFocusToSidebar();
					}
					break;
				}

				case "ArrowDown": {
					e.preventDefault();
					const nextRow = currentRow + 1;
					if (nextRow < rowCount) {
						const nextIndex = Math.min(nextRow * columnCount + currentCol, bookmarks.length - 1);
						setFocusedIndex(nextIndex);
					}
					break;
				}

				case "ArrowUp": {
					e.preventDefault();
					const prevRow = currentRow - 1;
					if (prevRow >= 0) {
						const prevIndex = prevRow * columnCount + currentCol;
						setFocusedIndex(prevIndex);
					}
					break;
				}

				case "Enter": {
					e.preventDefault();
					if (focusedIndex >= 0 && focusedIndex < bookmarks.length) {
						onOpen(bookmarks[focusedIndex]);
					}
					break;
				}

				case "e": {
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						if (focusedIndex >= 0 && focusedIndex < bookmarks.length && onEdit) {
							onEdit(bookmarks[focusedIndex]);
						}
					}
					break;
				}

				case "Tab": {
					if (e.shiftKey) {
						e.preventDefault();
						moveFocusToSidebar();
					}
					break;
				}

				case "Escape": {
					e.preventDefault();
					moveFocusToSidebar();
					break;
				}
			}
		},
		[focusArea, focusedIndex, bookmarks, onOpen, onEdit, setFocusedIndex, moveFocusToSidebar, gridRef]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	const handleCardClick = useCallback(
		(index: number) => {
			if (index < 0 || index >= bookmarks.length) return;
			setFocusArea("grid");
			setFocusedIndex(index);
		},
		[setFocusArea, setFocusedIndex, bookmarks.length]
	);

	return { focusedIndex, handleCardClick };
}
