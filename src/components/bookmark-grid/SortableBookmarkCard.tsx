import { useSortable } from "@dnd-kit/react/sortable";
import type { BookmarkNode, CardSize } from "../../types/bookmark";
import { BookmarkCard, type BookmarkCardActions } from "./BookmarkCard";

interface SortableBookmarkCardProps {
	bookmark: BookmarkNode;
	size: CardSize;
	index: number;
	actions: BookmarkCardActions;
	gridKey: string;
	tabIndex: number;
}

export function SortableBookmarkCard({ bookmark, size, index, actions, gridKey, tabIndex }: SortableBookmarkCardProps) {
	const sortable = useSortable({
		id: bookmark.id,
		index,
		group: bookmark.parentId ?? "bookmarks",
		data: {
			type: "bookmark",
			bookmark,
			parentId: bookmark.parentId ?? null
		},
		accept: source => {
			const sourceData = source.data as { type?: string; parentId?: string | null } | undefined;
			return sourceData?.type === "bookmark" && sourceData.parentId === (bookmark.parentId ?? null);
		}
	});

	const setNodeRef = (element: HTMLDivElement | null) => {
		sortable.ref(element);
		sortable.handleRef(element);
	};

	return (
		<div
			ref={setNodeRef}
			style={{
				opacity: sortable.isDragging ? 0.4 : 1,
				transition: sortable.isDragging ? "none" : "transform 150ms ease, opacity 150ms ease"
			}}
		>
			<BookmarkCard bookmark={bookmark} size={size} actions={actions} gridKey={gridKey} tabIndex={tabIndex} />
		</div>
	);
}
