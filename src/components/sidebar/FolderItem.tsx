import { useState } from "react";
import { pointerIntersection } from "@dnd-kit/collision";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import { ChevronRight, Folder, FolderOpen, FolderPlus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useFolderDragStore } from "../../stores/folderDragStore";
import { useUIStore } from "../../stores/uiStore";
import { FOLDER_BASE_PADDING, FOLDER_INDENT, type FlatFolder } from "../../lib/folder-tree";
import { isFolder } from "../../types/bookmark";
import { ContextMenu, type ContextMenuItem } from "../common/ContextMenu";
import { CreateSubfolderModal } from "../modals/CreateSubfolderModal";
import { RenameFolderModal } from "../modals/RenameFolderModal";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface FolderItemProps {
	row: FlatFolder;
}

/** Horizontal offset of the drop indicator, aligned with the folder icon at that depth. */
function indicatorInset(depth: number): number {
	return 8 + FOLDER_BASE_PADDING + depth * FOLDER_INDENT;
}

export function FolderItem({ row }: FolderItemProps) {
	const { folder, depth, parentId, hasChildFolders, isExpanded } = row;

	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showRenameModal, setShowRenameModal] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const setSelectedFolderId = useBookmarkStore(state => state.setSelectedFolderId);
	const toggleFolderExpanded = useBookmarkStore(state => state.toggleFolderExpanded);
	const setFolderExpanded = useBookmarkStore(state => state.setFolderExpanded);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const updateBookmark = useBookmarkStore(state => state.updateBookmark);
	const deleteBookmark = useBookmarkStore(state => state.deleteBookmark);
	const showFolderBookmarkCount = useUIStore(state => state.showFolderBookmarkCount);

	// Subscribe to primitives so a pointer move only re-renders the rows it touches.
	const dropMode = useFolderDragStore(state => (state.drop?.rowId === folder.id ? state.drop.mode : null));
	const dropDepth = useFolderDragStore(state => (state.drop?.rowId === folder.id ? state.drop.depth : 0));
	const isTravelling = useFolderDragStore(state => state.draggedSubtreeIds.has(folder.id));

	const isSelected = selectedFolderId === folder.id;
	// The permanent Chrome folders (Bookmarks Bar, Other Bookmarks, ...) cannot be moved.
	const isRootFolder = depth === 0;

	const draggable = useDraggable({
		id: folder.id,
		data: { type: "folder", folderId: folder.id, parentId },
		disabled: isRootFolder
	});

	const droppable = useDroppable({
		id: `folder-drop:${folder.id}`,
		data: { type: "folder-drop", folderId: folder.id },
		collisionDetector: pointerIntersection,
		// Outrank the grid's sortable cards so dragging a bookmark over the sidebar wins.
		collisionPriority: 3,
		// Folders accept themselves too: hovering your own row is how you change
		// nesting depth without moving up or down the tree.
		accept: source => {
			const sourceData = source.data as { type?: string } | undefined;
			return sourceData?.type === "folder" || sourceData?.type === "bookmark";
		}
	});

	const setNodeRef = (element: HTMLLIElement | null) => {
		draggable.ref(element);
		droppable.ref(element);
	};

	// The lifted row floats under the cursor; its descendants stay behind in the list.
	const isLifted = draggable.isDragging;
	const isLeftBehind = isTravelling && !isLifted;

	const handleClick = () => {
		setSelectedFolderId(folder.id);
	};

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		toggleFolderExpanded(folder.id);
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ x: e.clientX, y: e.clientY });
	};

	const handleCreateSubfolder = async (name: string) => {
		await createBookmark(folder.id, name);
		// Expand the parent folder to show the new subfolder
		setFolderExpanded(folder.id, true);
	};

	const handleRenameFolder = async (name: string) => {
		await updateBookmark(folder.id, { title: name });
	};

	const handleDeleteFolder = async () => {
		setIsDeleting(true);
		try {
			// If this folder is selected, clear selection
			if (selectedFolderId === folder.id) {
				setSelectedFolderId(null);
			}
			await deleteBookmark(folder.id);
			setShowDeleteConfirm(false);
		} finally {
			setIsDeleting(false);
		}
	};

	const contextMenuItems: ContextMenuItem[] = [
		{
			id: "create-subfolder",
			label: "Create subfolder",
			icon: <FolderPlus className="w-4 h-4" />,
			onClick: () => setShowCreateModal(true)
		},
		...(!isRootFolder
			? [
					{
						id: "rename-folder",
						label: "Rename folder",
						icon: <Pencil className="w-4 h-4" />,
						onClick: () => setShowRenameModal(true)
					},
					{
						id: "delete-folder",
						label: "Remove folder",
						icon: <Trash2 className="w-4 h-4" />,
						onClick: () => setShowDeleteConfirm(true),
						danger: true
					}
				]
			: [])
	];

	// Count bookmarks (not folders) in this folder
	const bookmarkCount = folder.children?.filter(c => !isFolder(c)).length ?? 0;

	const dropLine = (edge: "top" | "bottom") => (
		<span
			className={`absolute ${edge === "top" ? "top-0" : "bottom-0"} right-2 h-0.5 rounded-full bg-[var(--accent-color)] pointer-events-none z-10`}
			style={{ left: indicatorInset(dropDepth) }}
		>
			<span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-[var(--accent-color)]" />
		</span>
	);

	return (
		<li ref={setNodeRef} className="relative py-0.5 group/folder">
			{dropMode === "before" && dropLine("top")}

			<div
				className={`
							flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
							transition-colors duration-150
							${isSelected ? "bg-[var(--accent-color)] text-white shadow-sm" : "hover:bg-[var(--sidebar-hover)] text-primary"}
							${dropMode === "inside" ? "ring-2 ring-[var(--accent-color)] ring-offset-1 ring-offset-[var(--bg-primary)]" : ""}
							${isLifted ? "bg-[var(--bg-secondary)] shadow-md ring-1 ring-[var(--border-color)]" : ""}
						`}
				style={{
					paddingLeft: `${depth * FOLDER_INDENT + FOLDER_BASE_PADDING}px`,
					// Keep the lifted row see-through so the drop indicator under it stays readable.
					opacity: isLifted ? 0.75 : isLeftBehind ? 0.4 : 1
				}}
				onClick={handleClick}
				onContextMenu={handleContextMenu}
			>
				{/* Expand/collapse chevron */}
				<button
					onClick={handleToggle}
					className={`
            w-4 h-4 flex items-center justify-center rounded cursor-pointer
            transition-transform duration-150
            ${hasChildFolders ? "visible" : "invisible"}
            ${isExpanded ? "rotate-90" : "rotate-0"}
          `}
				>
					<ChevronRight className="w-3.5 h-3.5" />
				</button>

				{/* Folder icon */}
				<span className="flex items-center">
					{isExpanded ? (
						<FolderOpen className="w-4 h-4 flex-shrink-0" />
					) : (
						<Folder className="w-4 h-4 flex-shrink-0" />
					)}
				</span>

				{/* Folder name */}
				<span className="flex-1 truncate text-sm font-medium select-none">{folder.title || "Untitled"}</span>

				{/* Bookmark count badge */}
				{showFolderBookmarkCount && bookmarkCount > 0 && (
					<span
						className={`
              text-xs px-1.5 py-0.5 rounded-full
              ${isSelected ? "bg-white/20 text-white" : "bg-[var(--bg-tertiary)] text-secondary"}
            `}
					>
						{bookmarkCount}
					</span>
				)}

				{/* Drag affordance - the whole row is draggable */}
				{!isRootFolder && (
					<GripVertical className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/folder:opacity-60 cursor-grab active:cursor-grabbing" />
				)}
			</div>

			{dropMode === "after" && dropLine("bottom")}

			{/* Context menu */}
			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					items={contextMenuItems}
					onClose={() => setContextMenu(null)}
				/>
			)}

			{/* Create subfolder modal */}
			<CreateSubfolderModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				parentFolderName={folder.title || "Untitled"}
				onCreate={handleCreateSubfolder}
			/>

			{/* Rename folder modal */}
			<RenameFolderModal
				isOpen={showRenameModal}
				onClose={() => setShowRenameModal(false)}
				currentName={folder.title || "Untitled"}
				onRename={handleRenameFolder}
			/>

			{/* Delete folder confirmation */}
			<ConfirmDialog
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeleteFolder}
				title="Remove folder"
				message={`Are you sure you want to remove "${folder.title || "Untitled"}" and all its contents? This action cannot be undone.`}
				confirmLabel="Remove"
				isDestructive
				isLoading={isDeleting}
			/>
		</li>
	);
}
