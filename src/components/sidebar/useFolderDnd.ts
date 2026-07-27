import { useCallback, useEffect, useRef } from "react";
import { useDragDropMonitor } from "@dnd-kit/react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useFolderDragStore } from "../../stores/folderDragStore";
import { chromeMoveIndex, projectFolderDrop, type FlatFolder } from "../../lib/folder-tree";

/** How long a folder has to be hovered before it springs open. */
const AUTO_EXPAND_DELAY = 500;

interface DragData {
	type?: string;
	folderId?: string;
	parentId?: string;
}

/** Bounding box the collision detection used, so our zones line up with the hit test. */
function boundsOf(target: any): { top: number; height: number } | null {
	const rectangle = target?.shape?.boundingRectangle;
	if (rectangle && rectangle.height > 0) {
		return { top: rectangle.top, height: rectangle.height };
	}

	const element = target?.element as Element | undefined;
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return rect.height > 0 ? { top: rect.top, height: rect.height } : null;
}

/**
 * Sidebar drag and drop: reordering folders, nesting them into each other, and
 * spring-loading collapsed folders on hover.
 *
 * Bookmarks dragged in from the grid only get the "drop inside" highlight here -
 * the move itself stays with the grid's drag handler.
 */
export function useFolderDnd(rows: FlatFolder[]) {
	const rowsRef = useRef(rows);
	rowsRef.current = rows;

	const autoExpandRef = useRef<{ folderId: string; timeout: number } | null>(null);

	const clearAutoExpand = useCallback(() => {
		if (autoExpandRef.current) {
			window.clearTimeout(autoExpandRef.current.timeout);
			autoExpandRef.current = null;
		}
	}, []);

	const scheduleAutoExpand = useCallback(
		(folderId: string) => {
			if (autoExpandRef.current?.folderId === folderId) return;
			clearAutoExpand();

			const { collapsedFolders } = useBookmarkStore.getState();
			if (!collapsedFolders.has(folderId)) return;

			autoExpandRef.current = {
				folderId,
				timeout: window.setTimeout(() => {
					autoExpandRef.current = null;
					useBookmarkStore.getState().setFolderExpanded(folderId, true);
				}, AUTO_EXPAND_DELAY)
			};
		},
		[clearAutoExpand]
	);

	const updateProjection = useCallback(
		(operation: any) => {
			const source = operation?.source;
			const target = operation?.target;
			const sourceData = source?.data as DragData | undefined;
			const targetData = target?.data as DragData | undefined;

			if (!source || targetData?.type !== "folder-drop") {
				useFolderDragStore.getState().setDrop(null);
				clearAutoExpand();
				return;
			}

			const targetRowId = String(targetData.folderId ?? "");

			// A bookmark can only ever go inside a folder, so skip the zone math.
			if (sourceData?.type === "bookmark") {
				useFolderDragStore.getState().setDrop({
					rowId: targetRowId,
					mode: "inside",
					depth: 0,
					parentId: targetRowId,
					position: 0
				});
				scheduleAutoExpand(targetRowId);
				return;
			}

			const bounds = sourceData?.type === "folder" ? boundsOf(target) : null;
			if (!bounds) {
				useFolderDragStore.getState().setDrop(null);
				clearAutoExpand();
				return;
			}

			const drop = projectFolderDrop({
				rows: rowsRef.current,
				draggedId: String(sourceData?.folderId ?? source.id),
				targetRowId,
				offsetRatio: (operation.position.current.y - bounds.top) / bounds.height,
				deltaX: operation.transform?.x ?? 0
			});

			useFolderDragStore.getState().setDrop(drop);
			if (drop?.mode === "inside") {
				scheduleAutoExpand(targetRowId);
			} else {
				clearAutoExpand();
			}
		},
		[clearAutoExpand, scheduleAutoExpand]
	);

	useDragDropMonitor({
		onDragStart: ({ operation }: any) => {
			const sourceData = operation?.source?.data as DragData | undefined;
			if (sourceData?.type !== "folder") return;

			const draggedId = String(sourceData.folderId ?? operation.source.id);
			const subtree = new Set<string>([draggedId]);
			for (const row of rowsRef.current) {
				if (subtree.has(row.parentId)) subtree.add(row.folder.id);
			}
			useFolderDragStore.getState().setDraggedSubtreeIds(subtree);
		},

		onDragMove: ({ operation }: any) => updateProjection(operation),
		onDragOver: ({ operation }: any) => updateProjection(operation),

		onDragEnd: async ({ operation, canceled }: any) => {
			const { drop } = useFolderDragStore.getState();
			useFolderDragStore.getState().reset();
			clearAutoExpand();

			const sourceData = operation?.source?.data as DragData | undefined;
			if (canceled || !drop || sourceData?.type !== "folder") return;

			const draggedId = String(sourceData.folderId ?? operation.source.id);
			const dragged = rowsRef.current.find(row => row.folder.id === draggedId)?.folder;
			if (!dragged) return;

			const store = useBookmarkStore.getState();
			const isSameParent = dragged.parentId === drop.parentId;
			const index = chromeMoveIndex(
				store.getBookmarksInFolder(drop.parentId),
				drop.position,
				dragged,
				isSameParent
			);

			// Reveal the destination so the folder does not appear to vanish.
			store.setFolderExpanded(drop.parentId, true);
			await store.moveBookmark(draggedId, { parentId: drop.parentId, index });
		}
	});

	useEffect(() => clearAutoExpand, [clearAutoExpand]);
}
