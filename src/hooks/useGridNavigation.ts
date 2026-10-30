import { useCallback } from "react";

interface UseGridNavigationOptions {
	gridRef: React.RefObject<HTMLElement | null>;
	/** Called on ArrowLeft from the first item. */
	onExitStart?: () => void;
	/** Called on ArrowUp from the top row. */
	onExitTop?: () => void;
	onEscape?: () => void;
}

const ITEM_SELECTOR = "[data-grid-item]";

/** Rows can be a pixel apart because of rounding, so tops this close count as one row. */
const ROW_TOLERANCE = 2;

/**
 * The item in the nearest row above (-1) or below (1) `from` that is closest to it
 * horizontally. Working from on-screen positions rather than indexes keeps this
 * correct across section headers, wrapped rows and any column count.
 */
function findVertical(items: HTMLElement[], from: HTMLElement, direction: 1 | -1): HTMLElement | undefined {
	const origin = from.getBoundingClientRect();
	const originCenter = origin.left + origin.width / 2;

	const candidates = items
		.filter(item => item !== from)
		.map(item => ({ item, rect: item.getBoundingClientRect() }))
		.filter(({ rect }) =>
			direction === 1 ? rect.top >= origin.bottom - ROW_TOLERANCE : rect.bottom <= origin.top + ROW_TOLERANCE
		);
	if (candidates.length === 0) return undefined;

	const rowTop =
		direction === 1 ? Math.min(...candidates.map(c => c.rect.top)) : Math.max(...candidates.map(c => c.rect.top));

	let best: HTMLElement | undefined;
	let bestDistance = Infinity;
	for (const { item, rect } of candidates) {
		if (Math.abs(rect.top - rowTop) > ROW_TOLERANCE) continue;
		const distance = Math.abs(rect.left + rect.width / 2 - originCenter);
		if (distance < bestDistance) {
			best = item;
			bestDistance = distance;
		}
	}
	return best;
}

/** Arrow key, Home and End navigation between the `[data-grid-item]` elements of a grid. */
export function useGridNavigation({ gridRef, onExitStart, onExitTop, onEscape }: UseGridNavigationOptions) {
	return useCallback(
		(event: React.KeyboardEvent<HTMLElement>) => {
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

			const grid = gridRef.current;
			const target = event.target as HTMLElement;
			const current = target.closest<HTMLElement>(ITEM_SELECTOR);
			// Only react to keys pressed on the items themselves, not inside menus or dialogs they own.
			if (!grid || !current || current !== target || !grid.contains(current)) return;

			const items = Array.from(grid.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
			const index = items.indexOf(current);
			let next: HTMLElement | undefined;

			switch (event.key) {
				case "ArrowRight":
					next = items[index + 1];
					break;
				case "ArrowLeft":
					if (index === 0) {
						event.preventDefault();
						onExitStart?.();
						return;
					}
					next = items[index - 1];
					break;
				case "ArrowDown":
					next = findVertical(items, current, 1);
					break;
				case "ArrowUp":
					next = findVertical(items, current, -1);
					if (!next && onExitTop) {
						event.preventDefault();
						onExitTop();
						return;
					}
					break;
				case "Home":
					next = items[0];
					break;
				case "End":
					next = items[items.length - 1];
					break;
				case "Escape":
					if (!onEscape) return;
					event.preventDefault();
					onEscape();
					return;
				default:
					return;
			}

			event.preventDefault();
			if (next) {
				next.focus({ preventScroll: true });
				next.scrollIntoView({ block: "nearest" });
			}
		},
		[gridRef, onExitStart, onExitTop, onEscape]
	);
}
