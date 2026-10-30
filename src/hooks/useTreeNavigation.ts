import { useCallback } from "react";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { focusGrid } from "../lib/focus";
import type { FlatFolder } from "../lib/folder-tree";

function focusRow(folderId: string) {
	document
		.querySelector<HTMLElement>(`[role="treeitem"][data-folder-id="${CSS.escape(folderId)}"]`)
		?.focus({ preventScroll: false });
}

/**
 * Keyboard support for the folder tree. Moving up and down also opens the
 * folder, so the grid always shows the focused row's bookmarks.
 */
export function useTreeNavigation(rows: FlatFolder[]) {
	return useCallback(
		(event: React.KeyboardEvent<HTMLElement>) => {
			if (event.altKey || event.ctrlKey || event.metaKey) return;

			const target = event.target as HTMLElement;
			// Only react to keys pressed on a row itself, not inside menus or dialogs it owns.
			if (target.getAttribute("role") !== "treeitem") return;

			const index = rows.findIndex(row => row.folder.id === target.dataset.folderId);
			const row = rows[index];
			if (!row) return;

			const store = useBookmarkStore.getState();
			const moveTo = (destination: FlatFolder | undefined) => {
				if (!destination) return;
				store.setSelectedFolderId(destination.folder.id);
				focusRow(destination.folder.id);
			};

			switch (event.key) {
				case "ArrowDown":
					moveTo(rows[index + 1]);
					break;
				case "ArrowUp":
					moveTo(rows[index - 1]);
					break;
				case "Home":
					moveTo(rows[0]);
					break;
				case "End":
					moveTo(rows[rows.length - 1]);
					break;
				case "ArrowRight":
					if (row.hasChildFolders && !row.isExpanded) {
						store.setFolderExpanded(row.folder.id, true);
					} else {
						focusGrid();
					}
					break;
				case "ArrowLeft":
					if (row.hasChildFolders && row.isExpanded) {
						store.setFolderExpanded(row.folder.id, false);
					} else {
						moveTo(rows.find(candidate => candidate.folder.id === row.parentId));
					}
					break;
				case "Enter":
					store.setSelectedFolderId(row.folder.id);
					// The grid renders the folder's bookmarks first.
					requestAnimationFrame(() => focusGrid());
					break;
				case " ":
					store.setSelectedFolderId(row.folder.id);
					break;
				default:
					return;
			}

			event.preventDefault();
		},
		[rows]
	);
}
