import { create } from "zustand";
import type { FolderDrop } from "../lib/folder-tree";

const NO_SUBTREE: ReadonlySet<string> = new Set();

interface FolderDragState {
	/** The dragged folder plus its descendants - they travel with it, so they are dimmed. */
	draggedSubtreeIds: ReadonlySet<string>;
	/** Where the current drag would land, or null while there is no valid destination. */
	drop: FolderDrop | null;

	setDraggedSubtreeIds: (ids: ReadonlySet<string>) => void;
	setDrop: (drop: FolderDrop | null) => void;
	reset: () => void;
}

function isSameDrop(a: FolderDrop | null, b: FolderDrop | null): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return (
		a.rowId === b.rowId &&
		a.mode === b.mode &&
		a.depth === b.depth &&
		a.parentId === b.parentId &&
		a.position === b.position
	);
}

export const useFolderDragStore = create<FolderDragState>()(set => ({
	draggedSubtreeIds: NO_SUBTREE,
	drop: null,

	setDraggedSubtreeIds: ids => set({ draggedSubtreeIds: ids }),

	// Pointer moves fire constantly, so only publish an actual change.
	setDrop: drop => set(state => (isSameDrop(state.drop, drop) ? state : { drop })),

	reset: () =>
		set(state =>
			state.draggedSubtreeIds === NO_SUBTREE && state.drop === null
				? state
				: { draggedSubtreeIds: NO_SUBTREE, drop: null }
		)
}));
