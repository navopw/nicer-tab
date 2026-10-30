/**
 * Moving keyboard focus between the three regions of the page. Each region keeps
 * exactly one element in the tab order (a roving tabindex), so focusing a region
 * means focusing that element.
 */

export const SEARCH_INPUT_ID = "bookmark-search";

function focusElement(selector: string): boolean {
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) return false;
	element.focus({ preventScroll: true });
	element.scrollIntoView({ block: "nearest" });
	return true;
}

export function focusSidebar(): boolean {
	return focusElement('[role="tree"] [role="treeitem"][tabindex="0"]');
}

export function focusGrid(): boolean {
	return focusElement('[data-bookmark-grid] [data-grid-item][tabindex="0"]');
}

/** Focus the grid item after `item` (or before it, for the last one), e.g. before `item` is deleted. */
export function focusAdjacentGridItem(item: HTMLElement): void {
	const items = Array.from(
		item.closest("[data-bookmark-grid]")?.querySelectorAll<HTMLElement>("[data-grid-item]") ?? []
	);
	const index = items.indexOf(item);
	(items[index + 1] ?? items[index - 1])?.focus({ preventScroll: true });
}

export function focusSearch(): boolean {
	const input = document.getElementById(SEARCH_INPUT_ID);
	if (!(input instanceof HTMLInputElement)) return false;
	input.focus();
	input.select();
	return true;
}

export function isTypingTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}
