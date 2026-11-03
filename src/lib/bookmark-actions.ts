import type { BookmarkNode } from "../types/bookmark";
import type { FaviconOverride } from "../types/favicon";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useFaviconStore } from "../stores/faviconStore";
import { showErrorToast, showToast } from "../stores/toastStore";
import { collectBookmarkIds, findNodeById } from "./bookmark-tree";
import { setFaviconOverrides } from "./favicon-storage";
import { sortByIndex } from "./folder-tree";

function displayTitle(node: BookmarkNode): string {
	return node.title || "Untitled";
}

/** Recreate a deleted node and its subtree, returning a map from old to new IDs. */
async function recreate(
	node: BookmarkNode,
	parentId: string,
	index: number | undefined,
	idMap: Map<string, string>
): Promise<void> {
	const created = await chrome.bookmarks.create({ parentId, index, title: node.title, url: node.url });
	idMap.set(node.id, created.id);
	for (const child of sortByIndex(node.children ?? [])) {
		await recreate(child, created.id, undefined, idMap);
	}
}

async function restore(snapshot: BookmarkNode, overrides: FaviconOverride[]): Promise<void> {
	if (!snapshot.parentId) return;
	try {
		// The parent may have lost children since, so clamp the old position.
		const siblings = await chrome.bookmarks.getChildren(snapshot.parentId);
		const index = Math.min(snapshot.index ?? siblings.length, siblings.length);
		const idMap = new Map<string, string>();
		await recreate(snapshot, snapshot.parentId, index, idMap);

		const restored = overrides.flatMap(override => {
			const bookmarkId = idMap.get(override.bookmarkId);
			return bookmarkId ? [{ ...override, bookmarkId }] : [];
		});
		await setFaviconOverrides(restored);
	} catch (error) {
		showErrorToast(`Could not restore "${displayTitle(snapshot)}"`, error);
	}
}

/** Delete a bookmark or folder right away and offer to bring it back. */
export async function deleteWithUndo(id: string): Promise<void> {
	const store = useBookmarkStore.getState();
	const node = findNodeById(store.bookmarkTree, id);
	if (!node) return;

	const snapshot = structuredClone(node);
	const { overrides } = useFaviconStore.getState();
	const savedOverrides = collectBookmarkIds(node).flatMap(bookmarkId => overrides[bookmarkId] ?? []);

	if (!(await store.deleteBookmark(id))) return;

	const bookmarkCount = collectBookmarkIds(node).length;
	const details = node.url
		? ""
		: bookmarkCount > 0
			? ` and ${bookmarkCount} bookmark${bookmarkCount === 1 ? "" : "s"}`
			: "";
	showToast({
		message: `Deleted "${displayTitle(node)}"${details}`,
		action: { label: "Undo", onClick: () => restore(snapshot, savedOverrides) }
	});
}

/** Move a bookmark into another folder (at the end) and offer to move it back. */
export async function moveWithUndo(id: string, targetFolderId: string): Promise<void> {
	const store = useBookmarkStore.getState();
	const node = findNodeById(store.bookmarkTree, id);
	const target = findNodeById(store.bookmarkTree, targetFolderId);
	if (!node?.parentId || !target || node.parentId === targetFolderId) return;

	const origin = { parentId: node.parentId, index: node.index };
	if (!(await store.moveBookmark(id, { parentId: targetFolderId }))) return;

	showToast({
		message: `Moved "${displayTitle(node)}" to "${displayTitle(target)}"`,
		action: { label: "Undo", onClick: () => useBookmarkStore.getState().moveBookmark(id, origin) }
	});
}

export async function duplicateBookmark(bookmark: BookmarkNode): Promise<void> {
	if (!bookmark.parentId || !bookmark.url) return;
	try {
		await chrome.bookmarks.create({
			parentId: bookmark.parentId,
			index: (bookmark.index ?? 0) + 1,
			title: bookmark.title,
			url: bookmark.url
		});
	} catch (error) {
		showErrorToast("Could not duplicate bookmark", error);
	}
}

export async function copyBookmarkUrl(url: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(url);
		showToast({ message: "Link copied" });
	} catch (error) {
		showErrorToast("Could not copy the link", error);
	}
}
