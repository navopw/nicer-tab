import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { isFolder, type BookmarkNode } from "../types/bookmark";
import { chromeStorage } from "../lib/chrome-storage";
import { removeFaviconOverrides } from "../lib/favicon-storage";
import {
	collectBookmarkIds,
	collectFolderIds,
	findNodeById,
	getPathToNode,
	optimisticallyMoveNode
} from "../lib/bookmark-tree";
import { showErrorToast } from "./toastStore";

interface BookmarkState {
	bookmarkTree: BookmarkNode[];
	selectedFolderId: string | null;
	collapsedFolders: Set<string>;
	/** False until the first successful load, so the page can render in one go. */
	hasLoaded: boolean;
	/** Only set when the initial load fails; later failures surface as toasts. */
	error: string | null;

	setSelectedFolderId: (id: string | null) => void;
	/** Select a folder and expand its ancestors so it is visible in the sidebar. */
	navigateToFolder: (id: string) => void;
	toggleFolderExpanded: (id: string) => void;
	setFolderExpanded: (id: string, expanded: boolean) => void;

	// Bookmark operations. The tree itself is refreshed by the bookmark event
	// listeners, so these only talk to the browser and report failures.
	fetchBookmarks: () => Promise<void>;
	createBookmark: (parentId: string, title: string, url?: string) => Promise<BookmarkNode | null>;
	updateBookmark: (id: string, changes: { title?: string; url?: string }) => Promise<boolean>;
	deleteBookmark: (id: string) => Promise<boolean>;
	moveBookmark: (id: string, destination: { parentId: string; index?: number }) => Promise<boolean>;

	// Helpers
	getBookmarksInFolder: (folderId: string) => BookmarkNode[];
	getFolderPath: (folderId: string) => BookmarkNode[];
}

/**
 * Bumped on every optimistic update. A fetch that started before the bump would
 * overwrite the optimistic tree with stale data, so its result is dropped; the
 * bookmark event that follows the change triggers a fresh one.
 */
let treeGeneration = 0;

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

/** Keep the selected folder if it still exists, otherwise fall back to the Bookmarks Bar. */
function resolveSelectedFolder(tree: BookmarkNode[], selectedId: string | null): string | null {
	if (selectedId) {
		const node = findNodeById(tree, selectedId);
		if (node && isFolder(node) && node.parentId) return selectedId;
	}
	return tree[0]?.children?.[0]?.id ?? null;
}

/** The last opened folder and the expand/collapse state survive a reload - everything else comes from Chrome. */
interface PersistedBookmarkState {
	collapsedFolderIds: string[];
	selectedFolderId?: string | null;
}

export const useBookmarkStore = create<BookmarkState>()(
	persist(
		(set, get) => ({
			bookmarkTree: [],
			selectedFolderId: null,
			collapsedFolders: new Set(), // All folders expanded by default
			hasLoaded: false,
			error: null,

			setSelectedFolderId: id => set({ selectedFolderId: id }),

			navigateToFolder: id =>
				set(state => {
					const ancestors = getPathToNode(state.bookmarkTree, id)?.slice(0, -1) ?? [];
					const collapsedFolders = new Set(state.collapsedFolders);
					for (const ancestor of ancestors) {
						collapsedFolders.delete(ancestor.id);
					}
					return { selectedFolderId: id, collapsedFolders };
				}),

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
					if (state.collapsedFolders.has(id) !== expanded) return state;
					const newCollapsed = new Set(state.collapsedFolders);
					if (expanded) {
						newCollapsed.delete(id);
					} else {
						newCollapsed.add(id);
					}
					return { collapsedFolders: newCollapsed };
				}),

			fetchBookmarks: async () => {
				const generation = treeGeneration;
				try {
					const tree = (await chrome.bookmarks.getTree()) as BookmarkNode[];
					if (generation !== treeGeneration) return;
					set(state => ({
						bookmarkTree: tree,
						hasLoaded: true,
						error: null,
						collapsedFolders: pruneCollapsedFolders(state.collapsedFolders, tree),
						selectedFolderId: resolveSelectedFolder(tree, state.selectedFolderId)
					}));
				} catch (error) {
					if (get().hasLoaded) {
						showErrorToast("Could not refresh bookmarks", error);
					} else {
						set({ error: error instanceof Error ? error.message : "Failed to load bookmarks" });
					}
				}
			},

			createBookmark: async (parentId, title, url) => {
				try {
					return (await chrome.bookmarks.create({ parentId, title, url })) as BookmarkNode;
				} catch (error) {
					showErrorToast(url ? "Could not create bookmark" : "Could not create folder", error);
					return null;
				}
			},

			updateBookmark: async (id, changes) => {
				try {
					await chrome.bookmarks.update(id, changes);
					return true;
				} catch (error) {
					showErrorToast("Could not save changes", error);
					return false;
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
					return true;
				} catch (error) {
					showErrorToast("Could not delete", error);
					return false;
				}
			},

			moveBookmark: async (id, destination) => {
				const previousTree = get().bookmarkTree;
				const updatedTree = optimisticallyMoveNode(previousTree, id, destination);
				if (updatedTree) {
					treeGeneration++;
					set({ bookmarkTree: updatedTree });
				}

				try {
					await chrome.bookmarks.move(id, destination);
					return true;
				} catch (error) {
					treeGeneration++;
					set({ bookmarkTree: previousTree });
					showErrorToast("Could not move bookmark", error);
					await get().fetchBookmarks();
					return false;
				}
			},

			getBookmarksInFolder: folderId => {
				const folder = findNodeById(get().bookmarkTree, folderId);
				// Sort by Chrome index to ensure correct order
				const children = folder?.children ?? [];
				return [...children].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
			},

			getFolderPath: folderId => getPathToNode(get().bookmarkTree, folderId) ?? []
		}),
		{
			name: "nicer-tab-folders",
			storage: createJSONStorage(() => chromeStorage),
			// A Set is not JSON serialisable, so it is stored as a plain array.
			partialize: (state): PersistedBookmarkState => ({
				collapsedFolderIds: [...state.collapsedFolders],
				selectedFolderId: state.selectedFolderId
			}),
			merge: (persisted, current) => {
				const saved = persisted as PersistedBookmarkState | undefined;
				return {
					...current,
					collapsedFolders: new Set(saved?.collapsedFolderIds ?? []),
					selectedFolderId: saved?.selectedFolderId ?? current.selectedFolderId
				};
			}
		}
	)
);

/** Coalesces bursts of bookmark events (imports, sync) into a single refresh. */
const REFRESH_DELAY = 50;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRefresh() {
	clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => useBookmarkStore.getState().fetchBookmarks(), REFRESH_DELAY);
}

// Setup Chrome bookmark event listeners
export function setupBookmarkListeners() {
	const events = [
		chrome.bookmarks.onCreated,
		chrome.bookmarks.onRemoved,
		chrome.bookmarks.onChanged,
		chrome.bookmarks.onMoved,
		// Firefox does not implement this one.
		chrome.bookmarks.onChildrenReordered
	].filter(Boolean);

	for (const event of events) {
		event.addListener(scheduleRefresh);
	}

	return () => {
		clearTimeout(refreshTimer);
		for (const event of events) {
			event.removeListener(scheduleRefresh);
		}
	};
}
