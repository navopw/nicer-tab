import { useState, useCallback, useMemo } from "react";
import { FolderPlus } from "lucide-react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useUIStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "../../stores/uiStore";
import { flattenFolderTree } from "../../lib/folder-tree";
import { findNodeById } from "../../lib/bookmark-tree";
import { FolderTree } from "./FolderTree";
import { CreateSubfolderModal } from "../modals/CreateSubfolderModal";
import { useFolderDnd } from "./useFolderDnd";

const VERSION = chrome.runtime.getManifest().version;

/** How far one arrow key press moves the resize handle, in pixels. */
const RESIZE_STEP = 16;

export function Sidebar() {
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	const collapsedFolders = useBookmarkStore(state => state.collapsedFolders);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const setFolderExpanded = useBookmarkStore(state => state.setFolderExpanded);
	const sidebarWidth = useUIStore(state => state.sidebarWidth);
	const setSidebarWidth = useUIStore(state => state.setSidebarWidth);

	const [showCreateFolder, setShowCreateFolder] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

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

	const handleResizeKeyDown = (e: React.KeyboardEvent) => {
		const widths: Record<string, number> = {
			ArrowLeft: sidebarWidth - RESIZE_STEP,
			ArrowRight: sidebarWidth + RESIZE_STEP,
			Home: SIDEBAR_MIN_WIDTH,
			End: SIDEBAR_MAX_WIDTH
		};
		const width = widths[e.key];
		if (width === undefined) return;
		e.preventDefault();
		setSidebarWidth(width);
	};

	// Get the root folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
	const rootFolders = bookmarkTree[0]?.children ?? [];
	const rootId = bookmarkTree[0]?.id ?? null;

	const rows = useMemo(
		() => (rootId ? flattenFolderTree(rootFolders, collapsedFolders, rootId) : []),
		[rootFolders, collapsedFolders, rootId]
	);

	// The open folder is the tree's tab stop, or the first row while it is hidden in a collapsed parent.
	const tabStopId = rows.some(row => row.folder.id === selectedFolderId)
		? (selectedFolderId ?? undefined)
		: rows[0]?.folder.id;
	const selectedFolder = selectedFolderId ? findNodeById(bookmarkTree, selectedFolderId) : null;

	useFolderDnd(rows);

	return (
		<aside
			aria-label="Sidebar"
			className="relative flex flex-col sidebar-bg border-r border-theme flex-shrink-0"
			style={{ width: sidebarWidth }}
		>
			{/* Sidebar header - matches main header height (h-10 content + py-4 padding) */}
			<div className="flex items-center justify-between px-4 py-4 h-[72px] border-b border-theme">
				<img src="/logo-dark.png" alt="Nicer Tab" className="h-6 dark:hidden" />
				<img src="/logo-white.png" alt="Nicer Tab" className="h-6 hidden dark:block" />
				{selectedFolder && !selectedFolder.unmodifiable && (
					<button
						type="button"
						onClick={() => setShowCreateFolder(true)}
						className="p-1.5 rounded-md hover:bg-tertiary transition-colors cursor-pointer"
						title={`New folder in "${selectedFolder.title || "Untitled"}"`}
						aria-label="New folder"
					>
						<FolderPlus className="w-4 h-4 text-secondary" aria-hidden="true" />
					</button>
				)}
			</div>

			{/* Folder tree */}
			<div className="flex-1 overflow-auto py-3">
				<FolderTree rows={rows} tabStopId={tabStopId} />
			</div>

			{/* Version */}
			<div className="px-4 py-2 text-xs text-tertiary">v{VERSION}</div>

			{/* Resize handle - centered on sidebar right edge */}
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize sidebar"
				aria-valuenow={sidebarWidth}
				aria-valuemin={SIDEBAR_MIN_WIDTH}
				aria-valuemax={SIDEBAR_MAX_WIDTH}
				tabIndex={0}
				className="absolute top-0 -right-2 h-full w-4 cursor-col-resize z-50 group focus-visible:outline-none"
				onMouseDown={handleMouseDown}
				onKeyDown={handleResizeKeyDown}
			>
				{/* Active drag line - centered on sidebar edge */}
				<div
					className={`absolute left-2 top-0 bottom-0 w-px transition-all duration-150 ${
						isResizing
							? "bg-[var(--accent-color)] opacity-100"
							: "bg-[var(--border-color)] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:bg-[var(--accent-color)]"
					}`}
				/>
			</div>

			{/* Create folder modal */}
			{selectedFolder && (
				<CreateSubfolderModal
					isOpen={showCreateFolder}
					onClose={() => setShowCreateFolder(false)}
					parentFolderName={selectedFolder.title || "Untitled"}
					onCreate={async name => {
						await createBookmark(selectedFolder.id, name);
						setFolderExpanded(selectedFolder.id, true);
					}}
				/>
			)}
		</aside>
	);
}
