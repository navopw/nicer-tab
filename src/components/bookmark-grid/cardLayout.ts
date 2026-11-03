import type { CardSize } from "../../types/bookmark";

/** Dimensions shared by every kind of card, so bookmarks, folders and the add card line up. */
export const CARD_LAYOUT = {
	small: {
		height: "h-24",
		iconSize: 32,
		iconContainer: "w-10 h-10",
		titleClass: "text-xs break-words hyphens-auto",
		padding: "p-2",
		titleAtBottom: false
	},
	medium: {
		height: "h-36",
		iconSize: 48,
		iconContainer: "w-14 h-14",
		titleClass: "text-sm break-words hyphens-auto",
		padding: "p-3",
		titleAtBottom: true
	},
	large: {
		height: "h-44",
		iconSize: 64,
		iconContainer: "w-20 h-20",
		titleClass: "text-sm break-words hyphens-auto",
		padding: "p-4",
		titleAtBottom: true
	}
} satisfies Record<CardSize, unknown>;

/**
 * Columns fill the available width instead of following viewport breakpoints,
 * so cards keep a sensible size next to a resized sidebar or on wide screens.
 */
export const GRID_CLASSES: Record<CardSize, string> = {
	small: "grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-3",
	medium: "grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4",
	large: "grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-5"
};
