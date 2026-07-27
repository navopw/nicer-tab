import { isFolder, type BookmarkNode } from "../types/bookmark";

/** Horizontal indent per tree level, in pixels. */
export const FOLDER_INDENT = 14;

/** Left padding of a depth 0 row, in pixels. */
export const FOLDER_BASE_PADDING = 12;

export interface FlatFolder {
	folder: BookmarkNode;
	/** 0 for the permanent root folders (Bookmarks Bar, Other Bookmarks, ...). */
	depth: number;
	parentId: string;
	hasChildFolders: boolean;
	isExpanded: boolean;
}

export type DropMode = "before" | "inside" | "after";

export interface FolderDrop {
	/** Row the drop indicator is rendered on. */
	rowId: string;
	mode: DropMode;
	/** Depth the dragged folder ends up at - drives the indicator indent. */
	depth: number;
	parentId: string;
	/** Insertion position among the parent's child folders, ignoring the dragged folder. */
	position: number;
}

export function sortByIndex(nodes: BookmarkNode[]): BookmarkNode[] {
	return nodes.slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

export function childFolders(node: BookmarkNode | undefined): BookmarkNode[] {
	return sortByIndex((node?.children ?? []).filter(isFolder));
}

/** Flatten the visible part of the folder tree into the order it is rendered in. */
export function flattenFolderTree(roots: BookmarkNode[], collapsed: Set<string>, rootId: string): FlatFolder[] {
	const rows: FlatFolder[] = [];

	const walk = (nodes: BookmarkNode[], depth: number, parentId: string) => {
		for (const folder of sortByIndex(nodes.filter(isFolder))) {
			const children = childFolders(folder);
			const isExpanded = !collapsed.has(folder.id);
			rows.push({
				folder,
				depth,
				parentId,
				hasChildFolders: children.length > 0,
				isExpanded
			});
			if (isExpanded) {
				walk(children, depth + 1, folder.id);
			}
		}
	};

	walk(roots, 0, rootId);
	return rows;
}

function isSelfOrDescendant(row: FlatFolder, ancestorId: string, byId: Map<string, FlatFolder>): boolean {
	let current: FlatFolder | undefined = row;
	while (current) {
		if (current.folder.id === ancestorId) return true;
		current = byId.get(current.parentId);
	}
	return false;
}

interface ProjectionInput {
	rows: FlatFolder[];
	draggedId: string;
	targetRowId: string;
	/** Where the pointer sits inside the target row: 0 = top edge, 1 = bottom edge. */
	offsetRatio: number;
	/** Horizontal translation since the drag started, in pixels. */
	deltaX: number;
}

/**
 * Turn a hovered row plus pointer offsets into a concrete destination.
 *
 * The top and bottom bands of a row insert the folder as a sibling around it, the
 * middle band drops it inside. Horizontal drag distance picks the nesting depth for
 * the sibling case, clamped to the depths that keep the surrounding rows intact.
 */
export function projectFolderDrop({
	rows,
	draggedId,
	targetRowId,
	offsetRatio,
	deltaX
}: ProjectionInput): FolderDrop | null {
	const byId = new Map(rows.map(row => [row.folder.id, row]));
	const dragged = byId.get(draggedId);
	const target = byId.get(targetRowId);
	if (!dragged || !target) return null;

	// Hovering the dragged folder or one of its descendants: they travel with the
	// pointer, so the only meaningful destination is the gap they came out of.
	// Nudging sideways there is how you re-indent without moving up or down.
	const travelling = isSelfOrDescendant(target, draggedId, byId);
	const mode: DropMode = travelling
		? "before"
		: offsetRatio < 0.3
			? "before"
			: offsetRatio > 0.7
				? "after"
				: "inside";
	const rowId = travelling ? draggedId : targetRowId;

	if (mode === "inside") {
		return {
			rowId,
			mode,
			depth: target.depth + 1,
			parentId: target.folder.id,
			position: childFolders(target.folder).filter(child => child.id !== draggedId).length
		};
	}

	// Rows that remain once the dragged subtree is lifted out of the tree.
	const remaining = rows.filter(row => !isSelfOrDescendant(row, draggedId, byId));

	let slot: number;
	if (travelling) {
		slot = rows.slice(0, rows.indexOf(dragged)).filter(row => remaining.includes(row)).length;
	} else {
		const targetIndex = remaining.indexOf(target);
		if (targetIndex === -1) return null;
		slot = mode === "before" ? targetIndex : targetIndex + 1;
	}

	const previous = remaining[slot - 1];
	const next = remaining[slot];

	// Nothing can be placed above the first permanent root folder.
	if (!previous) return null;

	const maxDepth = previous.depth + 1;
	// Going shallower than the following row would reparent it, and depth 0 is
	// reserved for the permanent root folders.
	const minDepth = Math.max(next ? next.depth : 1, 1);
	const projected = dragged.depth + Math.round(deltaX / FOLDER_INDENT);
	const depth = Math.min(Math.max(projected, minDepth), maxDepth);

	if (depth === previous.depth + 1) {
		// Nested one level under the row above: its first child, or its only child
		// when it is collapsed and we cannot see where the indicator would sit.
		const siblings = childFolders(previous.folder).filter(child => child.id !== draggedId);
		return {
			rowId,
			mode,
			depth,
			parentId: previous.folder.id,
			position: previous.isExpanded ? 0 : siblings.length
		};
	}

	// Sibling of the closest ancestor of `previous` that sits at the projected depth.
	let anchor: FlatFolder | undefined = previous;
	while (anchor && anchor.depth > depth) {
		anchor = byId.get(anchor.parentId);
	}
	const anchorRow = anchor;
	const anchorParent = anchorRow ? byId.get(anchorRow.parentId) : undefined;
	if (!anchorRow || !anchorParent) return null;

	const siblings = childFolders(anchorParent.folder).filter(child => child.id !== draggedId);
	return {
		rowId,
		mode,
		depth,
		parentId: anchorParent.folder.id,
		position: siblings.findIndex(child => child.id === anchorRow.folder.id) + 1
	};
}

/**
 * Translate a position among a folder's child folders into the index that
 * `chrome.bookmarks.move` expects.
 *
 * The sidebar only shows folders while Chrome indexes folders and bookmarks
 * together, so the position has to be mapped back onto the full sibling list.
 */
export function chromeMoveIndex(
	siblings: BookmarkNode[],
	position: number,
	moving: BookmarkNode,
	isSameParent: boolean
): number {
	const rest = sortByIndex(siblings).filter(child => child.id !== moving.id);
	const folders = rest.filter(isFolder);

	// Anchor to the slot right after the preceding folder rather than right before
	// the following one, so bookmarks stay put instead of being leapfrogged.
	const preceding = folders[Math.min(position, folders.length) - 1];
	const index = preceding ? rest.indexOf(preceding) + 1 : 0;

	// Chrome inserts before removing, so a forward move inside the same folder
	// needs one extra slot to land where we want it.
	const currentIndex = moving.index ?? siblings.findIndex(child => child.id === moving.id);
	return isSameParent && index > currentIndex ? index + 1 : index;
}
