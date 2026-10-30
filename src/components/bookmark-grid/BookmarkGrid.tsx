import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useSearchStore } from "../../stores/searchStore";
import { useUIStore } from "../../stores/uiStore";
import { isBookmark, isFolder, type BookmarkNode } from "../../types/bookmark";
import { findNodeById, getPathToNode } from "../../lib/bookmark-tree";
import { sortByIndex } from "../../lib/folder-tree";
import { focusGrid, focusSearch, focusSidebar } from "../../lib/focus";
import { useGridNavigation } from "../../hooks/useGridNavigation";
import { useSearchResults } from "../../hooks/useSearchResults";
import { BookmarkCard, type BookmarkCardActions } from "./BookmarkCard";
import { SortableBookmarkCard } from "./SortableBookmarkCard";
import { AddBookmarkCard } from "./AddBookmarkCard";
import { FolderCard } from "./FolderCard";
import { FolderHeader } from "./FolderHeader";
import { GRID_CLASSES } from "./cardLayout";
import { EditBookmarkModal } from "../modals/EditBookmarkModal";
import { CreateBookmarkModal } from "../modals/CreateBookmarkModal";
import { CustomizeFaviconModal } from "../modals/CustomizeFaviconModal";
import { MoveBookmarkModal } from "../modals/MoveBookmarkModal";

type GridDialog = { type: "edit" | "move" | "icon"; bookmark: BookmarkNode } | { type: "create" } | null;

const ADD_CARD_KEY = "add";

export function BookmarkGrid() {
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	const navigateToFolder = useBookmarkStore(state => state.navigateToFolder);
	const cardSize = useUIStore(state => state.cardSize);
	const query = useSearchStore(state => state.query);
	const clearSearch = useSearchStore(state => state.clearSearch);
	const { isSearching, results } = useSearchResults();

	const gridRef = useRef<HTMLDivElement>(null);
	const [dialog, setDialog] = useState<GridDialog>(null);
	// The one card that is in the tab order (roving tabindex); the first card when unset.
	const [activeKey, setActiveKey] = useState<string | null>(null);

	const folderPath = useMemo(
		() =>
			selectedFolderId ? (getPathToNode(bookmarkTree, selectedFolderId) ?? []).filter(node => node.parentId) : [],
		[bookmarkTree, selectedFolderId]
	);
	const folder = folderPath[folderPath.length - 1];
	const { subfolders, bookmarks } = useMemo(() => {
		const children = sortByIndex(folder?.children ?? []);
		return { subfolders: children.filter(isFolder), bookmarks: children.filter(isBookmark) };
	}, [folder]);

	// Start from the first card again whenever the grid shows something else entirely.
	useEffect(() => {
		setActiveKey(null);
	}, [selectedFolderId, isSearching]);

	const actions = useMemo<BookmarkCardActions>(
		() => ({
			edit: bookmark => setDialog({ type: "edit", bookmark }),
			move: bookmark => setDialog({ type: "move", bookmark }),
			customizeIcon: bookmark => setDialog({ type: "icon", bookmark })
		}),
		[]
	);

	const openFolder = useCallback(
		(folderId: string) => {
			// Opened from a card or the breadcrumb: keep focus in the grid once it shows the new folder.
			const hadFocus = gridRef.current?.contains(document.activeElement) ?? false;
			clearSearch();
			navigateToFolder(folderId);
			if (hadFocus) requestAnimationFrame(() => focusGrid());
		},
		[clearSearch, navigateToFolder]
	);

	const handleKeyDown = useGridNavigation({
		gridRef,
		onExitStart: focusSidebar,
		onExitTop: isSearching ? focusSearch : undefined,
		onEscape: isSearching ? focusSearch : focusSidebar
	});

	const orderedKeys = isSearching
		? [
				...results.folders.map(match => `folder:${match.folder.id}`),
				...results.bookmarks.map(bookmark => `bookmark:${bookmark.id}`)
			]
		: [
				...subfolders.map(child => `folder:${child.id}`),
				...bookmarks.map(bookmark => `bookmark:${bookmark.id}`),
				ADD_CARD_KEY
			];
	const tabStop = activeKey && orderedKeys.includes(activeKey) ? activeKey : orderedKeys[0];
	const tabIndexFor = (key: string) => (key === tabStop ? 0 : -1);

	const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
		const key = (event.target as HTMLElement).closest<HTMLElement>("[data-grid-item]")?.dataset.gridItem;
		if (key) setActiveKey(key);
	};

	const gridClass = `grid ${GRID_CLASSES[cardSize]}`;
	// Re-read from the tree so dialogs always see the latest title, URL and folder.
	const dialogBookmark =
		dialog && dialog.type !== "create" ? (findNodeById(bookmarkTree, dialog.bookmark.id) ?? dialog.bookmark) : null;
	const closeDialog = () => setDialog(null);

	let content: React.ReactNode;

	if (isSearching) {
		const resultCount = results.folders.length + results.bookmarks.length;
		content =
			resultCount === 0 ? (
				<div className="flex flex-col items-center justify-center h-full text-center">
					<p className="text-lg text-secondary mb-2">No bookmarks match &ldquo;{query.trim()}&rdquo;</p>
					<p className="text-tertiary">Try a different search term</p>
				</div>
			) : (
				<div className="space-y-6">
					{results.folders.length > 0 && (
						<section aria-label="Matching folders">
							<h2 className="text-xs font-medium text-tertiary mb-2">Folders</h2>
							<div className={gridClass}>
								{results.folders.map(match => (
									<FolderCard
										key={match.folder.id}
										folder={match.folder}
										size={cardSize}
										onOpen={openFolder}
										location={match.breadcrumb}
										gridKey={`folder:${match.folder.id}`}
										tabIndex={tabIndexFor(`folder:${match.folder.id}`)}
									/>
								))}
							</div>
						</section>
					)}
					{results.groups.length > 0 && (
						<div className={gridClass}>
							{results.groups.map(group => (
								<div key={group.key} role="group" aria-label={group.breadcrumb} className="contents">
									<p className="col-span-full pt-1 text-xs text-tertiary truncate">
										{group.breadcrumb}
									</p>
									{group.items.map(({ bookmark }) => (
										<BookmarkCard
											key={bookmark.id}
											bookmark={bookmark}
											size={cardSize}
											actions={actions}
											gridKey={`bookmark:${bookmark.id}`}
											tabIndex={tabIndexFor(`bookmark:${bookmark.id}`)}
										/>
									))}
								</div>
							))}
						</div>
					)}
				</div>
			);
	} else if (!folder) {
		content = (
			<div className="flex items-center justify-center h-full">
				<p className="text-secondary">Select a folder to view bookmarks</p>
			</div>
		);
	} else {
		content = (
			<>
				<FolderHeader path={folderPath} onNavigate={openFolder} />
				<div className={gridClass}>
					{subfolders.map(child => (
						<FolderCard
							key={child.id}
							folder={child}
							size={cardSize}
							onOpen={openFolder}
							gridKey={`folder:${child.id}`}
							tabIndex={tabIndexFor(`folder:${child.id}`)}
						/>
					))}
					{bookmarks.map((bookmark, index) => (
						<SortableBookmarkCard
							key={bookmark.id}
							bookmark={bookmark}
							size={cardSize}
							index={index}
							actions={actions}
							gridKey={`bookmark:${bookmark.id}`}
							tabIndex={tabIndexFor(`bookmark:${bookmark.id}`)}
						/>
					))}
					<AddBookmarkCard
						size={cardSize}
						onClick={() => setDialog({ type: "create" })}
						gridKey={ADD_CARD_KEY}
						tabIndex={tabIndexFor(ADD_CARD_KEY)}
					/>
				</div>
				{subfolders.length === 0 && bookmarks.length === 0 && (
					<p className="mt-6 text-sm text-tertiary">
						This folder is empty. Add a bookmark, or drag one onto it in the sidebar.
					</p>
				)}
			</>
		);
	}

	return (
		<>
			<div ref={gridRef} data-bookmark-grid className="h-full" onKeyDown={handleKeyDown} onFocus={handleFocus}>
				{isSearching && (
					<p className="sr-only" aria-live="polite">
						{results.folders.length + results.bookmarks.length} results
					</p>
				)}
				{content}
			</div>

			<EditBookmarkModal
				isOpen={dialog?.type === "edit"}
				onClose={closeDialog}
				bookmark={dialog?.type === "edit" ? dialogBookmark : null}
			/>
			<MoveBookmarkModal
				isOpen={dialog?.type === "move"}
				onClose={closeDialog}
				bookmark={dialog?.type === "move" ? dialogBookmark : null}
			/>
			<CustomizeFaviconModal
				isOpen={dialog?.type === "icon"}
				onClose={closeDialog}
				bookmark={dialog?.type === "icon" ? dialogBookmark : null}
			/>
			{selectedFolderId && (
				<CreateBookmarkModal
					isOpen={dialog?.type === "create"}
					onClose={closeDialog}
					folderId={selectedFolderId}
				/>
			)}
		</>
	);
}
