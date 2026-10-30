import { useEffect } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { Accessibility, PointerSensor, PointerActivationConstraints } from "@dnd-kit/dom";
import { useUIStore, applyTheme, setupThemeListener, applyAccentColor } from "../../stores/uiStore";
import { useBookmarkStore, setupBookmarkListeners } from "../../stores/bookmarkStore";
import { setupFaviconSync } from "../../stores/faviconStore";
import { isBookmark, type BookmarkNode } from "../../types/bookmark";
import { waitForHydration } from "../../lib/hydration";
import { moveWithUndo } from "../../lib/bookmark-actions";
import { useGlobalShortcuts } from "../../hooks/useGlobalShortcuts";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { BookmarkGrid } from "../../components/bookmark-grid/BookmarkGrid";
import { Toolbar } from "../../components/Toolbar";
import { Toaster } from "../../components/common/Toaster";

// Configure pointer sensor with distance constraint to allow clicks
const sensors = [
	PointerSensor.configure({
		activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })]
	})
];

// Dragging is mouse only, so dnd-kit's screen reader instructions for keyboard
// dragging would be wrong. Dropping its accessibility plugin also stops it from
// adding tab stops to every card; the grid and sidebar manage focus themselves.
const withoutAccessibilityPlugin = <T,>(plugins: T[]) => plugins.filter(plugin => plugin !== Accessibility);

export default function App() {
	const theme = useUIStore(state => state.theme);
	const accentColor = useUIStore(state => state.accentColor);
	const fetchBookmarks = useBookmarkStore(state => state.fetchBookmarks);
	const hasLoaded = useBookmarkStore(state => state.hasLoaded);
	const error = useBookmarkStore(state => state.error);
	const moveBookmark = useBookmarkStore(state => state.moveBookmark);
	const getBookmarksInFolder = useBookmarkStore(state => state.getBookmarksInFolder);

	useGlobalShortcuts();

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

	// Load bookmarks once the saved settings and last opened folder are restored,
	// so the first paint already has the right layout and folder.
	useEffect(() => {
		const stopBookmarkListeners = setupBookmarkListeners();
		const stopFaviconSync = setupFaviconSync();
		void Promise.all([waitForHydration(useUIStore), waitForHydration(useBookmarkStore)]).then(() =>
			useBookmarkStore.getState().fetchBookmarks()
		);
		return () => {
			stopBookmarkListeners();
			stopFaviconSync();
		};
	}, []);

	// Folder drags are owned by the sidebar (see useFolderDnd) - this only covers bookmarks.
	const handleDragEnd = async (event: any) => {
		const { operation, canceled } = event;
		const source = operation?.source;
		if (canceled || !source) return;

		const sourceData = source.data as { type?: string; bookmark?: BookmarkNode } | undefined;
		const bookmark = sourceData?.type === "bookmark" ? sourceData.bookmark : undefined;
		if (!bookmark?.id || !bookmark.parentId) return;

		const targetData = operation.target?.data as { type?: string; folderId?: string } | undefined;
		const targetFolderId = targetData?.type === "folder-drop" ? String(targetData.folderId ?? "") : "";
		if (targetFolderId && targetFolderId !== bookmark.parentId) {
			await moveWithUndo(bookmark.id, targetFolderId);
			return;
		}

		// Reordering within the folder. dnd-kit already moved the card on screen while
		// dragging, so the drop target is usually the card itself; the sortable's
		// indexes tell where it ended up among the folder's bookmarks.
		if (!isSortable(source) || source.initialIndex === source.index) return;
		const bookmarks = getBookmarksInFolder(bookmark.parentId).filter(isBookmark);
		const moving = bookmarks[source.initialIndex];
		const target = bookmarks[source.index];
		if (moving?.id !== bookmark.id || target?.index === undefined) return;

		// Chrome indexes count folders too, and Chrome inserts before removing, so a
		// forward move needs one slot more than the target's index.
		const index = source.initialIndex < source.index ? target.index + 1 : target.index;
		await moveBookmark(bookmark.id, { parentId: bookmark.parentId, index });
	};

	if (error) {
		return (
			<div className="flex h-screen items-center justify-center bg-primary">
				<div className="text-center">
					<p className="text-lg text-red-500 mb-2">Error loading bookmarks</p>
					<p className="text-secondary">{error}</p>
					<button
						type="button"
						onClick={() => fetchBookmarks()}
						className="mt-4 px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	// Loading the tree takes a few milliseconds; rendering nothing until then avoids
	// flashing a placeholder and then the real layout on every new tab.
	if (!hasLoaded) {
		return null;
	}

	return (
		<DragDropProvider sensors={sensors} plugins={withoutAccessibilityPlugin} onDragEnd={handleDragEnd}>
			<div className="flex h-screen bg-primary">
				{/* Sidebar */}
				<Sidebar />

				{/* Main content */}
				<main className="flex-1 flex flex-col overflow-hidden">
					{/* Toolbar with search and controls */}
					<Toolbar />

					{/* Bookmark grid */}
					<div className="flex-1 overflow-auto p-6">
						<BookmarkGrid />
					</div>
				</main>
			</div>

			<Toaster />
		</DragDropProvider>
	);
}
