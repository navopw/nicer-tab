import { useState } from "react";
import { pointerIntersection } from "@dnd-kit/collision";
import { useDroppable } from "@dnd-kit/react";
import { Folder, FolderOpen } from "lucide-react";
import { isFolder, type BookmarkNode, type CardSize } from "../../types/bookmark";
import { useFolderActions } from "../../hooks/useFolderActions";
import { ContextMenu, contextMenuPosition } from "../common/ContextMenu";
import { CARD_LAYOUT } from "./cardLayout";

interface FolderCardProps {
	folder: BookmarkNode;
	size: CardSize;
	onOpen: (folderId: string) => void;
	gridKey: string;
	tabIndex: number;
	/** Where the folder lives, shown in search results. */
	location?: string;
}

function describeContents(folder: BookmarkNode): string {
	const children = folder.children ?? [];
	const folders = children.filter(isFolder).length;
	const bookmarks = children.length - folders;
	const parts = [];
	if (bookmarks > 0) parts.push(`${bookmarks} bookmark${bookmarks === 1 ? "" : "s"}`);
	if (folders > 0) parts.push(`${folders} folder${folders === 1 ? "" : "s"}`);
	return parts.join(", ") || "Empty";
}

/** A subfolder in the grid: opens on click, and bookmarks can be dropped onto it. */
export function FolderCard({ folder, size, onOpen, gridKey, tabIndex, location }: FolderCardProps) {
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const { menuItems, dialogs, handleKey } = useFolderActions(folder);
	const layout = CARD_LAYOUT[size];
	const title = folder.title || "Untitled";
	const contents = describeContents(folder);

	const droppable = useDroppable({
		id: `folder-card:${folder.id}`,
		data: { type: "folder-drop", folderId: folder.id },
		collisionDetector: pointerIntersection,
		// Outrank the sortable cards around it, like the sidebar rows do.
		collisionPriority: 3,
		accept: source => {
			const sourceData = source.data as { type?: string; parentId?: string | null } | undefined;
			return sourceData?.type === "bookmark" && sourceData.parentId !== folder.id;
		}
	});

	const openItems = [
		{
			id: "open-folder",
			label: "Open",
			icon: <FolderOpen className="w-4 h-4" />,
			onClick: () => onOpen(folder.id)
		},
		...menuItems.map((item, index) => (index === 0 ? { ...item, separatorBefore: true } : item))
	];

	return (
		<>
			<button
				ref={droppable.ref}
				type="button"
				data-grid-item={gridKey}
				tabIndex={tabIndex}
				onClick={() => onOpen(folder.id)}
				onKeyDown={event => {
					if (event.target === event.currentTarget && handleKey(event)) event.preventDefault();
				}}
				onContextMenu={event => {
					event.preventDefault();
					event.stopPropagation();
					setContextMenu(contextMenuPosition(event));
				}}
				title={location ? `${location} / ${title}` : title}
				className={`
					group relative flex flex-col w-full ${layout.height} ${layout.padding}
					rounded-xl border cursor-pointer transition-all duration-200
					bg-[var(--accent-color)]/5 hover:bg-[var(--accent-color)]/10
					${
						droppable.isDropTarget
							? "border-[var(--accent-color)] ring-2 ring-[var(--accent-color)]"
							: "border-[var(--border-color)] hover:border-[var(--accent-color)] focus-visible:border-[var(--accent-color)]"
					}
					${layout.titleAtBottom ? "justify-between" : "items-center"}
				`}
			>
				<div
					className={`
						${layout.iconContainer} flex items-center justify-center text-[var(--accent-color)]
						${layout.titleAtBottom ? "flex-1 self-center" : "mb-2"}
					`}
				>
					<Folder
						style={{ width: layout.iconSize * 0.8, height: layout.iconSize * 0.8 }}
						strokeWidth={1.5}
						aria-hidden="true"
					/>
				</div>
				<span className="w-full text-center">
					<span className={`${layout.titleClass} block text-primary font-medium line-clamp-2`}>{title}</span>
					{size !== "small" && (
						<span className="block text-xs text-tertiary truncate">{location ?? contents}</span>
					)}
				</span>
			</button>

			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					items={openItems}
					label={title}
					onClose={() => setContextMenu(null)}
				/>
			)}
			{dialogs}
		</>
	);
}
