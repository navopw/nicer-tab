import { useState } from "react";
import { Feedback } from "@dnd-kit/dom";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ChevronRight, Folder, FolderOpen, FolderPlus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useUIStore } from "../../stores/uiStore";
import type { BookmarkNode } from "../../types/bookmark";
import { isFolder } from "../../types/bookmark";
import { FolderTree } from "./FolderTree";
import { ContextMenu, type ContextMenuItem } from "../common/ContextMenu";
import { CreateSubfolderModal } from "../modals/CreateSubfolderModal";
import { RenameFolderModal } from "../modals/RenameFolderModal";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface FolderItemProps {
	folder: BookmarkNode;
	level: number;
	index: number;
	rootId: string | null;
}

export function FolderItem({ folder, level, index, rootId }: FolderItemProps) {
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showRenameModal, setShowRenameModal] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const collapsedFolders = useBookmarkStore(state => state.collapsedFolders);
	const setSelectedFolderId = useBookmarkStore(state => state.setSelectedFolderId);
	const toggleFolderExpanded = useBookmarkStore(state => state.toggleFolderExpanded);
	const setFolderExpanded = useBookmarkStore(state => state.setFolderExpanded);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const updateBookmark = useBookmarkStore(state => state.updateBookmark);
	const deleteBookmark = useBookmarkStore(state => state.deleteBookmark);
	const showFolderBookmarkCount = useUIStore(state => state.showFolderBookmarkCount);

	const isSelected = selectedFolderId === folder.id;
	const isExpanded = !collapsedFolders.has(folder.id);
	const hasChildren = folder.children?.some(isFolder) ?? false;

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

	// Root folders are direct children of the bookmarks tree root.
	const isRootFolder = !!rootId && folder.parentId === rootId;
	const parentId = folder.parentId ?? rootId ?? "root";

	const sortable = useSortable({
		id: folder.id,
		index,
		group: parentId,
		data: {
			type: "folder",
			folderId: folder.id,
			parentId,
			chromeIndex: folder.index
		},
		disabled: isRootFolder,
		plugins: defaults => [...defaults, Feedback.configure({ feedback: "move" })],
		collisionPriority: 2,
		accept: source => {
			const sourceData = source.data as { type?: string; parentId?: string } | undefined;
			return sourceData?.type === "folder" && sourceData.parentId === parentId;
		}
	});

	const dropInto = useDroppable({
		id: `folder-drop:${folder.id}`,
		data: {
			type: "folder-drop",
			folderId: folder.id
		},
		collisionPriority: 3,
		accept: source => {
			const sourceData = source.data as { type?: string; folderId?: string } | undefined;
			if (sourceData?.type === "folder") {
				return sourceData.folderId !== folder.id;
			}
			return sourceData?.type === "bookmark";
		}
	});

	const setNodeRef = (element: HTMLDivElement | null) => {
		sortable.ref(element);
	};

	const isDropTarget = dropInto.isDropTarget;

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

	return (
		<li>
			<div
				ref={setNodeRef}
				className={`
							flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
							transition-all duration-150
							${isSelected ? "bg-[var(--accent-color)] text-white shadow-sm" : "hover:bg-[var(--sidebar-hover)] text-primary"}
							${isDropTarget ? "ring-2 ring-[var(--accent-color)] ring-offset-1 ring-offset-[var(--bg-primary)]" : ""}
						`}
				style={{
					paddingLeft: `${level * 12 + 12}px`,
					opacity: sortable.isDragging ? 0.4 : 1,
					transition: sortable.isDragging ? "none" : "transform 150ms ease, opacity 150ms ease"
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
            ${hasChildren ? "visible" : "invisible"}
            ${isExpanded ? "rotate-90" : "rotate-0"}
          `}
				>
					<ChevronRight className="w-3.5 h-3.5" />
				</button>

				{/* Folder icon */}
				<span ref={dropInto.ref} className="flex items-center">
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

				{/* Drag handle */}
				{!isRootFolder && (
					<span
						ref={sortable.handleRef}
						className="text-tertiary hover:text-primary cursor-grab active:cursor-grabbing"
						onClick={e => e.stopPropagation()}
						onPointerDown={e => e.stopPropagation()}
					>
						<GripVertical className="w-4 h-4" />
					</span>
				)}
			</div>

			{/* Nested folders */}
			{isExpanded && folder.children && (
				<FolderTree folders={folder.children} level={level + 1} rootId={rootId} />
			)}

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
