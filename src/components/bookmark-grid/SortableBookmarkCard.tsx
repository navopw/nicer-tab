import { useSortable } from "@dnd-kit/react/sortable";
import type { BookmarkNode, CardSize } from "../../types/bookmark";
import { BookmarkCard } from "./BookmarkCard";

interface SortableBookmarkCardProps {
	bookmark: BookmarkNode;
	size: CardSize;
	index: number;
	onEdit?: (bookmark: BookmarkNode) => void;
	onDelete?: (bookmark: BookmarkNode) => void;
	onDuplicate?: (bookmark: BookmarkNode) => void;
	onCustomizeIcon?: (bookmark: BookmarkNode) => void;
	isFocused?: boolean;
	onOpen?: () => void;
	onFocus?: (index: number) => void;
}

export function SortableBookmarkCard({
	bookmark,
	size,
	index,
	onEdit,
	onDelete,
	onDuplicate,
	onCustomizeIcon,
	isFocused,
	onOpen,
	onFocus
}: SortableBookmarkCardProps) {
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
			data-bookmark-card
			onPointerDown={() => onFocus?.(index)}
			style={{
				opacity: sortable.isDragging ? 0.4 : 1,
				transition: sortable.isDragging ? "none" : "transform 150ms ease, opacity 150ms ease"
			}}
		>
			<BookmarkCard
				bookmark={bookmark}
				size={size}
				onEdit={onEdit}
				onDelete={onDelete}
				onDuplicate={onDuplicate}
				onCustomizeIcon={onCustomizeIcon}
				isFocused={isFocused}
				onOpen={onOpen}
			/>
		</div>
	);
}
