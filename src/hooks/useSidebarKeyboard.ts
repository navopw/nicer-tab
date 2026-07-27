import { useCallback, useEffect, useMemo } from "react";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useKeyboardStore } from "../stores/keyboardStore";
import { flattenFolderTree } from "../lib/folder-tree";
import { isFolder } from "../types/bookmark";

export function useSidebarKeyboard() {
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	const collapsedFolders = useBookmarkStore(state => state.collapsedFolders);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const setSelectedFolderId = useBookmarkStore(state => state.setSelectedFolderId);
	const toggleFolderExpanded = useBookmarkStore(state => state.toggleFolderExpanded);
	const setFolderExpanded = useBookmarkStore(state => state.setFolderExpanded);

	const focusArea = useKeyboardStore(state => state.focusArea);
	const setFocusArea = useKeyboardStore(state => state.setFocusArea);
	const focusedFolderId = useKeyboardStore(state => state.focusedFolderId);
	const setFocusedFolderId = useKeyboardStore(state => state.setFocusedFolderId);
	const moveFocusToGrid = useKeyboardStore(state => state.moveFocusToGrid);

	// Get root folders
	const rootFolders = useMemo(() => bookmarkTree[0]?.children ?? [], [bookmarkTree]);
	const rootId = bookmarkTree[0]?.id ?? "root";

	// Get flattened visible folders, in the same order the sidebar renders them
	const visibleFolders = useMemo(
		() => flattenFolderTree(rootFolders, collapsedFolders, rootId).map(row => row.folder),
		[rootFolders, collapsedFolders, rootId]
	);

	// Initialize focused folder if not set
	useEffect(() => {
		if (!focusedFolderId && visibleFolders.length > 0) {
			const selectedIsVisible = selectedFolderId
				? visibleFolders.some(folder => folder.id === selectedFolderId)
				: false;
			setFocusedFolderId(selectedIsVisible ? selectedFolderId : visibleFolders[0].id);
		}
	}, [focusedFolderId, visibleFolders, selectedFolderId, setFocusedFolderId]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Don't handle if typing in input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

			// Don't handle if a modal is open
			if (document.body.dataset.modalOpen === "true") return;

			const isNavKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
			const isNavFromNone = focusArea === "none" && isNavKey;
			const selectedIsVisible = selectedFolderId
				? visibleFolders.some(folder => folder.id === selectedFolderId)
				: false;
			const fallbackFolderId = selectedIsVisible ? selectedFolderId : visibleFolders[0]?.id;
			const effectiveFocusedFolderId = isNavFromNone ? fallbackFolderId : focusedFolderId;
			const effectiveIndex = effectiveFocusedFolderId
				? visibleFolders.findIndex(folder => folder.id === effectiveFocusedFolderId)
				: -1;
			const effectiveFolder = effectiveIndex >= 0 ? visibleFolders[effectiveIndex] : undefined;

			// Auto-focus sidebar when pressing navigation keys and nothing is focused
			if (isNavFromNone) {
				e.preventDefault();
				setFocusArea("sidebar");
				if (effectiveFocusedFolderId) {
					setFocusedFolderId(effectiveFocusedFolderId);
					setSelectedFolderId(effectiveFocusedFolderId);
				}
			}

			// Only handle if sidebar is focused
			if (focusArea !== "sidebar" && !isNavFromNone) return;

			// If focused folder is not in visible list, ignore key press
			if (!effectiveFolder) return;

			switch (e.key) {
				case "ArrowDown": {
					e.preventDefault();
					if (effectiveIndex < visibleFolders.length - 1) {
						const nextFolder = visibleFolders[effectiveIndex + 1];
						setFocusedFolderId(nextFolder.id);
						setSelectedFolderId(nextFolder.id);
					}
					break;
				}

				case "ArrowUp": {
					e.preventDefault();
					if (effectiveIndex > 0) {
						const prevFolder = visibleFolders[effectiveIndex - 1];
						setFocusedFolderId(prevFolder.id);
						setSelectedFolderId(prevFolder.id);
					}
					break;
				}

				case "ArrowRight": {
					e.preventDefault();
					if (effectiveFolder) {
						const hasSubfolders = effectiveFolder.children?.some(isFolder);
						const isExpanded = !collapsedFolders.has(effectiveFolder.id);

						if (hasSubfolders && !isExpanded) {
							// Expand if has subfolders and is collapsed
							setFolderExpanded(effectiveFolder.id, true);
						} else {
							// Already expanded or no subfolders, move focus to grid
							moveFocusToGrid();
						}
					}
					break;
				}

				case "ArrowLeft": {
					e.preventDefault();
					if (effectiveFolder) {
						const isExpanded = !collapsedFolders.has(effectiveFolder.id);
						const hasSubfolders = effectiveFolder.children?.some(isFolder);

						if (hasSubfolders && isExpanded) {
							// Collapse if expanded
							setFolderExpanded(effectiveFolder.id, false);
						} else if (effectiveFolder.parentId) {
							// Move to parent if collapsed or no subfolders
							const parentFolder = visibleFolders.find(f => f.id === effectiveFolder.parentId);
							if (parentFolder) {
								setFocusedFolderId(parentFolder.id);
								setSelectedFolderId(parentFolder.id);
							}
							// If parent not in visible folders (root level), do nothing - already at top level
						}
					}
					break;
				}

				case "Enter": {
					e.preventDefault();
					if (effectiveFocusedFolderId) {
						setSelectedFolderId(effectiveFocusedFolderId);
						// Move focus to the grid to navigate bookmarks
						moveFocusToGrid();
					}
					break;
				}

				case " ": {
					e.preventDefault();
					if (effectiveFocusedFolderId) {
						setSelectedFolderId(effectiveFocusedFolderId);
					}
					break;
				}

				case "Tab": {
					if (!e.shiftKey) {
						e.preventDefault();
						moveFocusToGrid();
					}
					break;
				}
			}
		},
		[
			focusArea,
			setFocusArea,
			visibleFolders,
			collapsedFolders,
			focusedFolderId,
			selectedFolderId,
			setFocusedFolderId,
			setFolderExpanded,
			setSelectedFolderId,
			moveFocusToGrid
		]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return { focusedFolderId, visibleFolders };
}
