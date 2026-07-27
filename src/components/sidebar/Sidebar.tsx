import { useState, useCallback, useMemo } from "react";
import { FolderPlus } from "lucide-react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useKeyboardStore } from "../../stores/keyboardStore";
import { useUIStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "../../stores/uiStore";
import { flattenFolderTree } from "../../lib/folder-tree";
import { FolderTree } from "./FolderTree";
import { CreateBookmarkModal } from "../modals/CreateBookmarkModal";
import { useSidebarKeyboard } from "../../hooks/useSidebarKeyboard";
import { useFolderDnd } from "./useFolderDnd";

export function Sidebar() {
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	const collapsedFolders = useBookmarkStore(state => state.collapsedFolders);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const setFocusArea = useKeyboardStore(state => state.setFocusArea);
	const sidebarWidth = useUIStore(state => state.sidebarWidth);
	const setSidebarWidth = useUIStore(state => state.setSidebarWidth);

	const [showCreateFolder, setShowCreateFolder] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

	// Initialize keyboard navigation
	useSidebarKeyboard();

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsResizing(true);

			const startX = e.clientX;
			const startWidth = sidebarWidth;

			const handleMouseMove = (e: MouseEvent) => {
				const delta = e.clientX - startX;
				const newWidth = Math.min(Math.max(startWidth + delta, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
				setSidebarWidth(newWidth);
			};

			const handleMouseUp = () => {
				setIsResizing(false);
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.removeEventListener("mouseleave", handleMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.addEventListener("mouseleave", handleMouseUp);
		},
		[sidebarWidth, setSidebarWidth]
	);

	// Get the root folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
	const rootFolders = bookmarkTree[0]?.children ?? [];
	const rootId = bookmarkTree[0]?.id ?? null;

	const rows = useMemo(
		() => (rootId ? flattenFolderTree(rootFolders, collapsedFolders, rootId) : []),
		[rootFolders, collapsedFolders, rootId]
	);

	useFolderDnd(rows);

	const handleCreateFolder = async (parentId: string, title: string) => {
		await createBookmark(parentId, title);
	};

	return (
		<aside
			className="relative flex flex-col sidebar-bg border-r border-theme flex-shrink-0"
			style={{ width: sidebarWidth }}
		>
			{/* Sidebar header - matches main header height (h-10 content + py-4 padding) */}
			<div className="flex items-center justify-between px-4 py-4 h-[72px] border-b border-theme">
				<img src="/logo-dark.png" alt="NicerTab" className="h-6 dark:hidden" />
				<img src="/logo-white.png" alt="NicerTab" className="h-6 hidden dark:block" />
				{selectedFolderId && (
					<button
						onClick={() => setShowCreateFolder(true)}
						className="p-1.5 rounded-md hover:bg-tertiary transition-colors cursor-pointer"
						title="New Folder"
					>
						<FolderPlus className="w-4 h-4 text-secondary" />
					</button>
				)}
			</div>

			{/* Folder tree */}
			<div className="flex-1 overflow-auto py-3" onClick={() => setFocusArea("sidebar")}>
				<FolderTree rows={rows} />
			</div>

			{/* Resize handle - centered on sidebar right edge */}
			<div
				className="absolute top-0 -right-2 h-full w-4 cursor-col-resize z-50 group"
				onMouseDown={handleMouseDown}
			>
				{/* Active drag line - centered on sidebar edge */}
				<div
					className={`absolute left-2 top-0 bottom-0 w-px transition-all duration-150 ${
						isResizing
							? "bg-[var(--accent-color)] opacity-100"
							: "bg-[var(--border-color)] opacity-0 group-hover:opacity-100"
					}`}
				/>
			</div>

			{/* Create folder modal */}
			{selectedFolderId && (
				<CreateBookmarkModal
					isOpen={showCreateFolder}
					onClose={() => setShowCreateFolder(false)}
					folderId={selectedFolderId}
					onCreate={handleCreateFolder}
					isFolder
				/>
			)}
		</aside>
	);
}
