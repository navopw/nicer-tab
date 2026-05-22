import { Fragment, useState, useRef, useCallback, useMemo } from "react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useSearchStore } from "../../stores/searchStore";
import { useUIStore } from "../../stores/uiStore";
import { useKeyboardStore } from "../../stores/keyboardStore";
import { isBookmark, type BookmarkNode } from "../../types/bookmark";
import { BookmarkCard } from "./BookmarkCard";
import { SortableBookmarkCard } from "./SortableBookmarkCard";
import { AddBookmarkCard } from "./AddBookmarkCard";
import { useGridKeyboard } from "../../hooks/useGridKeyboard";

import { EditBookmarkModal } from "../modals/EditBookmarkModal";
import { CreateBookmarkModal } from "../modals/CreateBookmarkModal";
import { CustomizeFaviconModal } from "../modals/CustomizeFaviconModal";
import { ConfirmDialog } from "../common/ConfirmDialog";

export function BookmarkGrid() {
	const selectedFolderId = useBookmarkStore(state => state.selectedFolderId);
	const getBookmarksInFolder = useBookmarkStore(state => state.getBookmarksInFolder);
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const updateBookmark = useBookmarkStore(state => state.updateBookmark);
	const deleteBookmark = useBookmarkStore(state => state.deleteBookmark);
	const cardSize = useUIStore(state => state.cardSize);
	const query = useSearchStore(state => state.query);
	const searchResults = useSearchStore(state => state.results);
	const focusArea = useKeyboardStore(state => state.focusArea);
	const setFocusArea = useKeyboardStore(state => state.setFocusArea);

	const gridRef = useRef<HTMLDivElement>(null);

	// Modal states
	const [editingBookmark, setEditingBookmark] = useState<BookmarkNode | null>(null);
	const [deletingBookmark, setDeletingBookmark] = useState<BookmarkNode | null>(null);
	const [customizingBookmark, setCustomizingBookmark] = useState<BookmarkNode | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);

	// Get bookmarks for the selected folder (needed for useGridKeyboard)
	const items = selectedFolderId ? getBookmarksInFolder(selectedFolderId) : [];
	const bookmarks = items.filter(isBookmark);
	const isSearching = query.trim().length > 0;
	const visibleBookmarks = isSearching ? searchResults.map(({ bookmark }) => bookmark) : bookmarks;
	const groupedSearchResults = useMemo(() => {
		const groups = new Map<
			string,
			{
				key: string;
				breadcrumb: string;
				items: Array<{ bookmark: BookmarkNode; index: number }>;
			}
		>();

		searchResults.forEach((result, index) => {
			const folderKey = result.path.map(node => node.id).join("/") || "root";
			const breadcrumb =
				result.path
					.map(node => node.title.trim())
					.filter(Boolean)
					.join(" / ") || "Root";

			const group = groups.get(folderKey);
			if (group) {
				group.items.push({ bookmark: result.bookmark, index });
				return;
			}

			groups.set(folderKey, {
				key: folderKey,
				breadcrumb,
				items: [{ bookmark: result.bookmark, index }]
			});
		});

		return Array.from(groups.values());
	}, [searchResults]);

	const handleEdit = (bookmark: BookmarkNode) => {
		setEditingBookmark(bookmark);
	};

	const handleDelete = (bookmark: BookmarkNode) => {
		setDeletingBookmark(bookmark);
	};

	const handleCustomizeIcon = (bookmark: BookmarkNode) => {
		setCustomizingBookmark(bookmark);
	};

	const handleDuplicate = async (bookmark: BookmarkNode) => {
		if (bookmark.parentId && bookmark.url) {
			await createBookmark(bookmark.parentId, bookmark.title, bookmark.url);
		}
	};

	const handleOpen = useCallback((bookmark: BookmarkNode) => {
		if (bookmark.url) {
			window.open(bookmark.url, "_blank");
		}
	}, []);

	// Must be called unconditionally (React hooks rules)
	const { focusedIndex, handleCardClick } = useGridKeyboard({
		bookmarks: visibleBookmarks,
		onOpen: handleOpen,
		onEdit: handleEdit,
		gridRef
	});

	const confirmDelete = async () => {
		if (!deletingBookmark) return;
		setIsDeleting(true);
		try {
			await deleteBookmark(deletingBookmark.id);
			setDeletingBookmark(null);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCreateBookmark = async (parentId: string, title: string, url?: string) => {
		await createBookmark(parentId, title, url);
	};

	// Determine grid column classes based on card size
	const gridClasses = {
		small: "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3",
		medium: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4",
		large: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
	};

	// If searching, show search results (no drag-drop)
	if (isSearching) {
		if (searchResults.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-center">
					<p className="text-lg text-secondary mb-2">No results found</p>
					<p className="text-tertiary">Try a different search term</p>
				</div>
			);
		}

		return (
			<>
				<div ref={gridRef} className={`grid ${gridClasses[cardSize]}`} onClick={() => setFocusArea("grid")}>
					{groupedSearchResults.map(group => (
						<Fragment key={group.key}>
							<div className="col-span-full pt-1">
								<p className="text-xs text-tertiary truncate">{group.breadcrumb}</p>
							</div>
							{group.items.map(({ bookmark, index }) => (
								<div key={bookmark.id} data-bookmark-card onPointerDown={() => handleCardClick(index)}>
									<BookmarkCard
										bookmark={bookmark}
										size={cardSize}
										onEdit={handleEdit}
										onDelete={handleDelete}
										onDuplicate={handleDuplicate}
										onCustomizeIcon={handleCustomizeIcon}
										isFocused={focusArea === "grid" && focusedIndex === index}
									/>
								</div>
							))}
						</Fragment>
					))}
				</div>

				{/* Modals */}
				<EditBookmarkModal
					isOpen={!!editingBookmark}
					onClose={() => setEditingBookmark(null)}
					bookmark={editingBookmark}
					onSave={updateBookmark}
				/>
				<ConfirmDialog
					isOpen={!!deletingBookmark}
					onClose={() => setDeletingBookmark(null)}
					onConfirm={confirmDelete}
					title="Delete Bookmark"
					message={`Are you sure you want to delete "${deletingBookmark?.title}"?`}
					confirmLabel="Delete"
					isDestructive
					isLoading={isDeleting}
				/>
				<CustomizeFaviconModal
					isOpen={!!customizingBookmark}
					onClose={() => setCustomizingBookmark(null)}
					bookmark={customizingBookmark}
				/>
			</>
		);
	}

	// Show bookmarks in selected folder
	if (!selectedFolderId) {
		return (
			<div className="flex items-center justify-center h-full">
				<p className="text-secondary">Select a folder to view bookmarks</p>
			</div>
		);
	}

	return (
		<>
			<div ref={gridRef} className={`grid ${gridClasses[cardSize]}`} onClick={() => setFocusArea("grid")}>
				{bookmarks.map((bookmark, index) => (
					<SortableBookmarkCard
						key={bookmark.id}
						bookmark={bookmark}
						size={cardSize}
						index={index}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onDuplicate={handleDuplicate}
						onCustomizeIcon={handleCustomizeIcon}
						isFocused={focusArea === "grid" && focusedIndex === index}
						onFocus={handleCardClick}
					/>
				))}
				<AddBookmarkCard size={cardSize} onClick={() => setShowCreateModal(true)} />
			</div>

			{/* Modals */}
			<EditBookmarkModal
				isOpen={!!editingBookmark}
				onClose={() => setEditingBookmark(null)}
				bookmark={editingBookmark}
				onSave={updateBookmark}
			/>
			<CreateBookmarkModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				folderId={selectedFolderId}
				onCreate={handleCreateBookmark}
			/>
			<ConfirmDialog
				isOpen={!!deletingBookmark}
				onClose={() => setDeletingBookmark(null)}
				onConfirm={confirmDelete}
				title="Delete Bookmark"
				message={`Are you sure you want to delete "${deletingBookmark?.title}"?`}
				confirmLabel="Delete"
				isDestructive
				isLoading={isDeleting}
			/>
			<CustomizeFaviconModal
				isOpen={!!customizingBookmark}
				onClose={() => setCustomizingBookmark(null)}
				bookmark={customizingBookmark}
			/>
		</>
	);
}
