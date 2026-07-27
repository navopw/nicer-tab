import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isFolder, type BookmarkNode } from "../types/bookmark";
import { chromeStorage } from "../lib/chrome-storage";
import { removeFaviconOverrides } from "../lib/favicon-storage";

// Flag to skip listener refresh when we're already handling the update
let skipNextRefresh = false;

interface BookmarkState {
	bookmarkTree: BookmarkNode[];
	selectedFolderId: string | null;
	collapsedFolders: Set<string>;
	isLoading: boolean;
	error: string | null;

	// Actions
	setBookmarkTree: (tree: BookmarkNode[]) => void;
	setSelectedFolderId: (id: string | null) => void;
	toggleFolderExpanded: (id: string) => void;
	setFolderExpanded: (id: string, expanded: boolean) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;

	// Bookmark operations
	fetchBookmarks: () => Promise<void>;
	createBookmark: (parentId: string, title: string, url?: string) => Promise<BookmarkNode | null>;
	updateBookmark: (id: string, changes: { title?: string; url?: string }) => Promise<void>;
	deleteBookmark: (id: string) => Promise<void>;
	moveBookmark: (id: string, destination: { parentId: string; index?: number }) => Promise<void>;

	// Helpers
	getBookmarksInFolder: (folderId: string) => BookmarkNode[];
	getFolderPath: (folderId: string) => BookmarkNode[];
}

// Helper to find a node by ID in the tree
function findNodeById(nodes: BookmarkNode[], id: string): BookmarkNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.children) {
			const found = findNodeById(node.children, id);
			if (found) return found;
		}
	}
	return null;
}

// Helper to get path to a node
function getPathToNode(nodes: BookmarkNode[], id: string, path: BookmarkNode[] = []): BookmarkNode[] | null {
	for (const node of nodes) {
		if (node.id === id) return [...path, node];
		if (node.children) {
			const found = getPathToNode(node.children, id, [...path, node]);
			if (found) return found;
		}
	}
	return null;
}

function collectBookmarkIds(node: BookmarkNode, ids: string[] = []): string[] {
	if (node.url) {
		ids.push(node.id);
	}

	if (node.children) {
		for (const child of node.children) {
			collectBookmarkIds(child, ids);
		}
	}

	return ids;
}

function collectFolderIds(nodes: BookmarkNode[], ids: Set<string> = new Set()): Set<string> {
	for (const node of nodes) {
		if (isFolder(node)) {
			ids.add(node.id);
			collectFolderIds(node.children ?? [], ids);
		}
	}

	return ids;
}

/**
 * Drop persisted IDs of folders that no longer exist so the stored set does not
 * grow forever as folders are deleted. Returns the same set when nothing changed
 * so subscribers are not woken up needlessly.
 */
function pruneCollapsedFolders(collapsed: Set<string>, tree: BookmarkNode[]): Set<string> {
	if (collapsed.size === 0) return collapsed;

	const existing = collectFolderIds(tree);
	const pruned = new Set([...collapsed].filter(id => existing.has(id)));
	return pruned.size === collapsed.size ? collapsed : pruned;
}

// Helper to optimistically move a node in the tree
// This mimics Chrome's behavior: insert at new position BEFORE removing from old position
function optimisticallyMoveNode(
	tree: BookmarkNode[],
	nodeId: string,
	destination: { parentId: string; index?: number }
): BookmarkNode[] | null {
	// Deep clone the tree to avoid mutations
	const clonedTree = JSON.parse(JSON.stringify(tree)) as BookmarkNode[];

	// Find the node to move
	const node = findNodeById(clonedTree, nodeId);
	if (!node) return null;

	const sourceIndex = node.index;
	const sourceParentId = node.parentId;

	// Find the current parent
	const currentParent = sourceParentId ? findNodeById(clonedTree, sourceParentId) : null;

	// Find the new parent
	const newParent = findNodeById(clonedTree, destination.parentId);
	if (!newParent) return null;

	if (!newParent.children) {
		newParent.children = [];
	}

	const isSameParent = sourceParentId === destination.parentId;
	let targetIndex = destination.index !== undefined ? destination.index : newParent.children.length;

	if (isSameParent && sourceIndex !== undefined) {
		// Moving within same parent - Chrome inserts before removing
		// So if we're moving forward (to higher index), the actual final position
		// will be targetIndex - 1 after the source is removed
		// The caller already added +1 for forward moves, so we need to subtract 1 here
		// to get the correct final position in our "remove first" implementation
		if (sourceIndex < targetIndex) {
			targetIndex--;
		}
	}

	// Remove from current parent
	if (currentParent?.children) {
		const currentIndex = currentParent.children.findIndex(c => c.id === nodeId);
		if (currentIndex !== -1) {
			currentParent.children.splice(currentIndex, 1);
		}
	}

	// Add to new parent at the adjusted target index
	// Clamp to valid range
	targetIndex = Math.max(0, Math.min(targetIndex, newParent.children.length));
	newParent.children.splice(targetIndex, 0, node);

	// Update the moved node's parentId
	node.parentId = destination.parentId;

	// Update indices of all children in affected parents
	if (currentParent?.children) {
		currentParent.children.forEach((child, idx) => {
			child.index = idx;
		});
	}
	newParent.children.forEach((child, idx) => {
		child.index = idx;
	});

	return clonedTree;
}

/** Only the expand/collapse state survives a reload - everything else is derived from Chrome. */
interface PersistedBookmarkState {
	collapsedFolderIds: string[];
}

export const useBookmarkStore = create<BookmarkState>()(
	persist(
		(set, get) => ({
			bookmarkTree: [],
			selectedFolderId: null,
			collapsedFolders: new Set(), // All folders expanded by default
			isLoading: true,
			error: null,

			setBookmarkTree: tree => set({ bookmarkTree: tree }),
			setSelectedFolderId: id => set({ selectedFolderId: id }),

			toggleFolderExpanded: id =>
				set(state => {
					const newCollapsed = new Set(state.collapsedFolders);
					if (newCollapsed.has(id)) {
						newCollapsed.delete(id);
					} else {
						newCollapsed.add(id);
					}
					return { collapsedFolders: newCollapsed };
				}),

			setFolderExpanded: (id, expanded) =>
				set(state => {
					const newCollapsed = new Set(state.collapsedFolders);
					if (expanded) {
						newCollapsed.delete(id);
					} else {
						newCollapsed.add(id);
					}
					return { collapsedFolders: newCollapsed };
				}),

			setLoading: loading => set({ isLoading: loading }),
			setError: error => set({ error }),

			fetchBookmarks: async () => {
				set({ isLoading: true, error: null });
				try {
					const tree = await chrome.bookmarks.getTree();
					set(state => ({
						bookmarkTree: tree,
						isLoading: false,
						collapsedFolders: pruneCollapsedFolders(state.collapsedFolders, tree),
						// Select Bookmarks Bar by default if no folder is selected
						selectedFolderId: state.selectedFolderId ?? tree[0]?.children?.[0]?.id ?? null
					}));
				} catch (error) {
					set({
						error: error instanceof Error ? error.message : "Failed to load bookmarks",
						isLoading: false
					});
				}
			},

			createBookmark: async (parentId, title, url) => {
				try {
					const newBookmark = await chrome.bookmarks.create({
						parentId,
						title,
						url
					});
					await get().fetchBookmarks();
					return newBookmark as BookmarkNode;
				} catch (error) {
					set({ error: error instanceof Error ? error.message : "Failed to create bookmark" });
					return null;
				}
			},

			updateBookmark: async (id, changes) => {
				try {
					await chrome.bookmarks.update(id, changes);
					await get().fetchBookmarks();
				} catch (error) {
					set({ error: error instanceof Error ? error.message : "Failed to update bookmark" });
				}
			},

			deleteBookmark: async id => {
				try {
					const node = findNodeById(get().bookmarkTree, id);
					const bookmarkIdsToClear = node ? collectBookmarkIds(node) : [];
					if (node?.children) {
						await chrome.bookmarks.removeTree(id);
					} else {
						await chrome.bookmarks.remove(id);
					}
					await removeFaviconOverrides(bookmarkIdsToClear);
					await get().fetchBookmarks();
				} catch (error) {
					set({ error: error instanceof Error ? error.message : "Failed to delete bookmark" });
				}
			},

			moveBookmark: async (id, destination) => {
				const previousTree = get().bookmarkTree;
				try {
					// Optimistically update the tree before the Chrome API call completes
					const updatedTree = optimisticallyMoveNode(previousTree, id, destination);
					if (updatedTree) {
						set({ bookmarkTree: updatedTree });
					}

					// Skip the listener refresh since we've already updated optimistically
					skipNextRefresh = true;

					// Perform the actual Chrome API call
					await chrome.bookmarks.move(id, destination);

					// Reset the flag after a short delay to allow the Chrome event to pass
					setTimeout(() => {
						skipNextRefresh = false;
					}, 100);
				} catch (error) {
					skipNextRefresh = false;
					// Revert on error and sync with Chrome's actual state
					set({ bookmarkTree: previousTree });
					await get().fetchBookmarks();
					set({ error: error instanceof Error ? error.message : "Failed to move bookmark" });
				}
			},

			getBookmarksInFolder: folderId => {
				const { bookmarkTree } = get();
				const folder = findNodeById(bookmarkTree, folderId);
				// Sort by Chrome index to ensure correct order
				const children = folder?.children ?? [];
				return [...children].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
			},

			getFolderPath: folderId => {
				const { bookmarkTree } = get();
				return getPathToNode(bookmarkTree, folderId) ?? [];
			}
		}),
		{
			name: "nicer-tab-folders",
			storage: createJSONStorage(() => chromeStorage),
			// A Set is not JSON serialisable, so it is stored as a plain array.
			partialize: (state): PersistedBookmarkState => ({
				collapsedFolderIds: [...state.collapsedFolders]
			}),
			merge: (persisted, current) => ({
				...current,
				collapsedFolders: new Set((persisted as PersistedBookmarkState | undefined)?.collapsedFolderIds ?? [])
			})
		}
	)
);

// Setup Chrome bookmark event listeners
export function setupBookmarkListeners() {
	const refresh = () => useBookmarkStore.getState().fetchBookmarks();

	const onMoved = () => {
		// Skip refresh if we just did an optimistic update
		if (skipNextRefresh) return;
		refresh();
	};

	chrome.bookmarks.onCreated.addListener(refresh);
	chrome.bookmarks.onRemoved.addListener(refresh);
	chrome.bookmarks.onChanged.addListener(refresh);
	chrome.bookmarks.onMoved.addListener(onMoved);

	return () => {
		chrome.bookmarks.onCreated.removeListener(refresh);
		chrome.bookmarks.onRemoved.removeListener(refresh);
		chrome.bookmarks.onChanged.removeListener(refresh);
		chrome.bookmarks.onMoved.removeListener(onMoved);
	};
}
