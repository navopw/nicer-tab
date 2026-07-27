import { useEffect, useMemo, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { PointerSensor, PointerActivationConstraints } from "@dnd-kit/dom";
import { useUIStore, applyTheme, setupThemeListener, applyAccentColor } from "../../stores/uiStore";
import { useBookmarkStore, setupBookmarkListeners } from "../../stores/bookmarkStore";
import { useKeyboardStore } from "../../stores/keyboardStore";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { BookmarkGrid } from "../../components/bookmark-grid/BookmarkGrid";
import { Toolbar } from "../../components/Toolbar";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";

export default function App() {
	const theme = useUIStore(state => state.theme);
	const accentColor = useUIStore(state => state.accentColor);
	const fetchBookmarks = useBookmarkStore(state => state.fetchBookmarks);
	const isLoading = useBookmarkStore(state => state.isLoading);
	const error = useBookmarkStore(state => state.error);
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const moveBookmark = useBookmarkStore(state => state.moveBookmark);
	const getFolderPath = useBookmarkStore(state => state.getFolderPath);

	const [pendingBookmarkMove, setPendingBookmarkMove] = useState<{
		bookmarkId: string;
		bookmarkTitle: string;
		sourceParentId: string | null;
		targetId: string;
	} | null>(null);
	const [isConfirmingBookmarkMove, setIsConfirmingBookmarkMove] = useState(false);

	const bookmarkMoveNames = useMemo(() => {
		if (!pendingBookmarkMove) return null;
		const targetPath = getFolderPath(pendingBookmarkMove.targetId);
		const targetName = targetPath[targetPath.length - 1]?.title || "Untitled";
		return { targetName };
	}, [pendingBookmarkMove, getFolderPath]);

	// Apply theme on mount and when it changes
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Apply accent color on mount and when it changes
	useEffect(() => {
		applyAccentColor(accentColor);
	}, [accentColor]);

	// Setup system theme listener
	useEffect(() => {
		return setupThemeListener(() => useUIStore.getState().theme);
	}, []);

	// Fetch bookmarks on mount
	useEffect(() => {
		fetchBookmarks();
		return setupBookmarkListeners();
	}, [fetchBookmarks]);

	// Folder drags are owned by the sidebar (see useFolderDnd) - this only covers the grid.
	const handleDragEnd = async (event: any) => {
		const { operation, canceled } = event;
		if (canceled) return;
		const source = operation?.source;
		const target = operation?.target;
		if (!source || !target) return;

		const sourceData = source.data as { type?: string; bookmark?: unknown } | undefined;
		const targetData = target.data as { type?: string; folderId?: string; bookmark?: unknown } | undefined;
		if (!sourceData || !targetData) return;

		if (sourceData.type === "bookmark") {
			const bookmark = sourceData.bookmark as
				{ id?: string; title?: string; parentId?: string; index?: number } | undefined;
			if (!bookmark?.id) return;
			if (targetData.type === "folder-drop") {
				const targetFolderId = String(targetData.folderId ?? "");
				if (!targetFolderId || targetFolderId === bookmark.parentId) return;
				setPendingBookmarkMove({
					bookmarkId: bookmark.id,
					bookmarkTitle: bookmark.title || "Untitled",
					sourceParentId: bookmark.parentId ?? null,
					targetId: targetFolderId
				});
				return;
			}

			if (targetData.type !== "bookmark") return;
			const sourceParentId = bookmark.parentId ?? selectedFolderId;
			const targetBookmark = targetData.bookmark as { parentId?: string; index?: number } | undefined;
			const targetParentId = targetBookmark?.parentId ?? sourceParentId;
			if (!sourceParentId || sourceParentId !== targetParentId) return;

			// Use Chrome indices from the bookmark data, not visual indices
			const sourceChromeIndex = bookmark.index;
			const targetChromeIndex = targetBookmark?.index;
			if (sourceChromeIndex === undefined || targetChromeIndex === undefined) return;
			if (sourceChromeIndex === targetChromeIndex) return;

			// Chrome inserts BEFORE removing, so when moving forward we need +1
			// When moving backward, use the target index directly
			const finalIndex = sourceChromeIndex < targetChromeIndex ? targetChromeIndex + 1 : targetChromeIndex;

			await moveBookmark(bookmark.id, { parentId: sourceParentId, index: finalIndex });
		}
	};

	const handleConfirmBookmarkMove = async () => {
		if (!pendingBookmarkMove) return;
		setIsConfirmingBookmarkMove(true);
		try {
			await moveBookmark(pendingBookmarkMove.bookmarkId, { parentId: pendingBookmarkMove.targetId });
			setPendingBookmarkMove(null);
		} finally {
			setIsConfirmingBookmarkMove(false);
		}
	};

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center bg-primary">
				<div className="text-center">
					<p className="text-lg text-red-500 mb-2">Error loading bookmarks</p>
					<p className="text-secondary">{error}</p>
					<button
						onClick={() => fetchBookmarks()}
						className="mt-4 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	// Configure pointer sensor with distance constraint to allow clicks
	const sensors = [
		PointerSensor.configure({
			activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })]
		})
	];

	return (
		<DragDropProvider sensors={sensors} onDragEnd={handleDragEnd}>
			<div className="flex h-screen bg-primary">
				{/* Sidebar */}
				<Sidebar />

				{/* Main content */}
				<main className="flex-1 flex flex-col overflow-hidden">
					{/* Toolbar with search and controls */}
					<Toolbar />

					{/* Bookmark grid */}
					<div
						className="flex-1 overflow-auto p-6"
						onClick={e => {
							// Clear focus when clicking on empty area (not on a bookmark card)
							if (e.target === e.currentTarget) {
								useKeyboardStore.getState().clearFocus();
							}
						}}
					>
						{isLoading ? (
							<div className="flex items-center justify-center h-full">
								<div className="animate-pulse text-secondary">Loading bookmarks...</div>
							</div>
						) : (
							<BookmarkGrid />
						)}
					</div>
				</main>
			</div>

			<ConfirmDialog
				isOpen={!!pendingBookmarkMove}
				onClose={() => setPendingBookmarkMove(null)}
				onConfirm={handleConfirmBookmarkMove}
				title="Move bookmark"
				message={`Move "${pendingBookmarkMove?.bookmarkTitle ?? "Untitled"}" into "${bookmarkMoveNames?.targetName ?? "Untitled"}"?`}
				confirmLabel="Move"
				isLoading={isConfirmingBookmarkMove}
			/>
		</DragDropProvider>
	);
}
