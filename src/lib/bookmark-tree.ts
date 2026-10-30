import { isFolder, type BookmarkNode } from "../types/bookmark";
import { sortByIndex } from "./folder-tree";

export function findNodeById(nodes: BookmarkNode[], id: string): BookmarkNode | null {
	for (const node of nodes) {
		if (node.id === id) return node;
		if (node.children) {
			const found = findNodeById(node.children, id);
			if (found) return found;
		}
	}
	return null;
}

/** The chain of nodes from the invisible root down to `id`, both included. */
export function getPathToNode(nodes: BookmarkNode[], id: string, path: BookmarkNode[] = []): BookmarkNode[] | null {
	for (const node of nodes) {
		if (node.id === id) return [...path, node];
		if (node.children) {
			const found = getPathToNode(node.children, id, [...path, node]);
			if (found) return found;
		}
	}
	return null;
}

export function collectBookmarkIds(node: BookmarkNode, ids: string[] = []): string[] {
	if (node.url) {
		ids.push(node.id);
	}

	for (const child of node.children ?? []) {
		collectBookmarkIds(child, ids);
	}

	return ids;
}

export function collectFolderIds(nodes: BookmarkNode[], ids: Set<string> = new Set()): Set<string> {
	for (const node of nodes) {
		if (isFolder(node)) {
			ids.add(node.id);
			collectFolderIds(node.children ?? [], ids);
		}
	}

	return ids;
}

export function countBookmarks(node: BookmarkNode): number {
	return collectBookmarkIds(node).length;
}

/**
 * Apply `chrome.bookmarks.move` to a copy of the tree so the UI can update before
 * Chrome confirms. Returns null when either node cannot be found.
 *
 * Chrome inserts before it removes, so callers moving a node forward inside the
 * same folder pass an index one higher than the slot they want.
 */
export function optimisticallyMoveNode(
	tree: BookmarkNode[],
	nodeId: string,
	destination: { parentId: string; index?: number }
): BookmarkNode[] | null {
	const clonedTree = structuredClone(tree);

	const node = findNodeById(clonedTree, nodeId);
	if (!node) return null;

	const sourceIndex = node.index;
	const sourceParentId = node.parentId;
	const currentParent = sourceParentId ? findNodeById(clonedTree, sourceParentId) : null;

	const newParent = findNodeById(clonedTree, destination.parentId);
	if (!newParent) return null;
	newParent.children ??= [];

	const isSameParent = sourceParentId === destination.parentId;
	let targetIndex = destination.index ?? newParent.children.length;

	// Undo the caller's "insert before remove" adjustment, because this
	// implementation removes first.
	if (isSameParent && sourceIndex !== undefined && sourceIndex < targetIndex) {
		targetIndex--;
	}

	if (currentParent?.children) {
		const currentIndex = currentParent.children.findIndex(child => child.id === nodeId);
		if (currentIndex !== -1) {
			currentParent.children.splice(currentIndex, 1);
		}
	}

	targetIndex = Math.max(0, Math.min(targetIndex, newParent.children.length));
	newParent.children.splice(targetIndex, 0, node);
	node.parentId = destination.parentId;

	currentParent?.children?.forEach((child, index) => {
		child.index = index;
	});
	newParent.children.forEach((child, index) => {
		child.index = index;
	});

	return clonedTree;
}

export interface FolderOption {
	id: string;
	title: string;
	/** 0 for the permanent root folders. */
	depth: number;
}

/** Every folder that can hold bookmarks, depth first in display order. */
export function listFolders(tree: BookmarkNode[]): FolderOption[] {
	const options: FolderOption[] = [];

	const walk = (nodes: BookmarkNode[], depth: number) => {
		for (const node of sortByIndex(nodes.filter(isFolder))) {
			if (node.unmodifiable) continue;
			options.push({ id: node.id, title: node.title || "Untitled", depth });
			walk(node.children ?? [], depth + 1);
		}
	};

	walk(tree[0]?.children ?? [], 0);
	return options;
}

/**
 * A comparison key under which trivially different spellings of the same address
 * match: scheme (http vs https), host case, and a trailing slash are ignored.
 */
export function normalizeUrl(url: string): string {
	try {
		const parsed = new URL(url.trim());
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return parsed.href;
		}
		const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : "";
		return `${parsed.host}${path}${parsed.search}${parsed.hash}`;
	} catch {
		return url.trim().toLowerCase();
	}
}

export interface BookmarkLocation {
	bookmark: BookmarkNode;
	/** Folders from the permanent root down to the bookmark's parent. */
	folders: BookmarkNode[];
}

/** Bookmarks that point at the same address as `url`, ignoring `excludeId`. */
export function findBookmarksByUrl(tree: BookmarkNode[], url: string, excludeId?: string): BookmarkLocation[] {
	const key = normalizeUrl(url);
	const matches: BookmarkLocation[] = [];

	const walk = (nodes: BookmarkNode[], folders: BookmarkNode[]) => {
		for (const node of nodes) {
			if (node.url && node.id !== excludeId && normalizeUrl(node.url) === key) {
				matches.push({ bookmark: node, folders });
			}
			if (node.children) {
				// The invisible root has no title, so it is left out of the path.
				walk(node.children, node.title ? [...folders, node] : folders);
			}
		}
	};

	walk(tree, []);
	return matches;
}

/** Turn what someone typed into a URL field into something Chrome accepts: "example.com" becomes https. */
export function normalizeTypedUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	// "localhost:3000" looks like a scheme too, so only trust "scheme://" and the opaque schemes.
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) || /^(about|data|javascript|mailto|tel):/i.test(trimmed)) {
		return trimmed;
	}
	return `https://${trimmed}`;
}
