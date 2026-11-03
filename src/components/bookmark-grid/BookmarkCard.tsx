import { useState } from "react";
import {
	AppWindow,
	Copy,
	CopyPlus,
	Edit2,
	ExternalLink,
	FolderInput,
	SquareArrowOutUpRight,
	Sparkles,
	Trash2
} from "lucide-react";
import type { BookmarkNode, CardSize } from "../../types/bookmark";
import { getDomainFromUrl } from "../../types/bookmark";
import { useUIStore } from "../../stores/uiStore";
import { copyBookmarkUrl, deleteWithUndo, duplicateBookmark } from "../../lib/bookmark-actions";
import { isWebUrl, openTargetFromEvent, openUrl } from "../../lib/open-url";
import { focusAdjacentGridItem } from "../../lib/focus";
import { ContextMenu, contextMenuPosition, type ContextMenuItem } from "../common/ContextMenu";
import { BookmarkIcon } from "./BookmarkIcon";
import { CARD_LAYOUT } from "./cardLayout";

/** Actions that need a dialog, which the grid owns. */
export interface BookmarkCardActions {
	edit: (bookmark: BookmarkNode) => void;
	move: (bookmark: BookmarkNode) => void;
	customizeIcon: (bookmark: BookmarkNode) => void;
}

interface BookmarkCardProps {
	bookmark: BookmarkNode;
	size: CardSize;
	actions: BookmarkCardActions;
	/** Identifies the card for keyboard navigation in the grid. */
	gridKey: string;
	tabIndex: number;
}

export function BookmarkCard({ bookmark, size, actions, gridKey, tabIndex }: BookmarkCardProps) {
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const openInNewTab = useUIStore(state => state.openInNewTab);
	const layout = CARD_LAYOUT[size];

	const url = bookmark.url ?? "";
	const domain = getDomainFromUrl(url);
	const title = bookmark.title || domain || "Untitled";

	// Web links are left to the browser, which already handles modifier keys and
	// middle clicks. Other schemes (chrome://, file://) cannot be linked to from
	// an extension page and go through the tabs API instead.
	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (!url || isWebUrl(url)) return;
		event.preventDefault();
		void openUrl(url, openTargetFromEvent(event, openInNewTab));
	};

	const handleAuxClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (event.button !== 1 || !url || isWebUrl(url)) return;
		event.preventDefault();
		void openUrl(url, "new-tab");
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
		if (event.target !== event.currentTarget) return;

		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
			event.preventDefault();
			actions.edit(bookmark);
		} else if (
			(event.key === "Delete" || event.key === "Backspace") &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey
		) {
			event.preventDefault();
			// Hand focus to a neighbour first, so keyboard users are not dropped back to the page.
			focusAdjacentGridItem(event.currentTarget);
			void deleteWithUndo(bookmark.id);
		}
	};

	const handleContextMenu = (event: React.MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setContextMenu(contextMenuPosition(event));
	};

	const contextMenuItems: ContextMenuItem[] = [
		{
			id: "open",
			label: "Open",
			icon: <ExternalLink className="w-4 h-4" />,
			onClick: () => void openUrl(url, "current")
		},
		{
			id: "open-new-tab",
			label: "Open in new tab",
			icon: <SquareArrowOutUpRight className="w-4 h-4" />,
			onClick: () => void openUrl(url, "new-tab")
		},
		{
			id: "open-new-window",
			label: "Open in new window",
			icon: <AppWindow className="w-4 h-4" />,
			onClick: () => void openUrl(url, "new-window")
		},
		{
			id: "copy-url",
			label: "Copy link",
			icon: <Copy className="w-4 h-4" />,
			separatorBefore: true,
			onClick: () => void copyBookmarkUrl(url)
		},
		{
			id: "duplicate",
			label: "Duplicate",
			icon: <CopyPlus className="w-4 h-4" />,
			onClick: () => void duplicateBookmark(bookmark)
		},
		{
			id: "move",
			label: "Move to...",
			icon: <FolderInput className="w-4 h-4" />,
			onClick: () => actions.move(bookmark)
		},
		{
			id: "customize-icon",
			label: "Customize icon",
			icon: <Sparkles className="w-4 h-4" />,
			onClick: () => actions.customizeIcon(bookmark)
		},
		{
			id: "edit",
			label: "Edit",
			icon: <Edit2 className="w-4 h-4" />,
			onClick: () => actions.edit(bookmark)
		},
		{
			id: "delete",
			label: "Delete",
			icon: <Trash2 className="w-4 h-4" />,
			danger: true,
			separatorBefore: true,
			onClick: () => void deleteWithUndo(bookmark.id)
		}
	];

	return (
		<>
			<a
				href={url}
				target={openInNewTab ? "_blank" : undefined}
				rel="noopener noreferrer"
				data-grid-item={gridKey}
				tabIndex={tabIndex}
				draggable={false}
				className={`
					group relative flex flex-col w-full ${layout.height} ${layout.padding}
					card-bg rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-color)]
					focus-visible:border-[var(--accent-color)]
					cursor-pointer transition-all duration-200 no-underline
					${layout.titleAtBottom ? "justify-between" : "items-center"}
				`}
				onClick={handleClick}
				onAuxClick={handleAuxClick}
				onKeyDown={handleKeyDown}
				onContextMenu={handleContextMenu}
				aria-label={title}
				title={url}
			>
				{/* Favicon container */}
				<div
					className={`
						${layout.iconContainer} flex items-center justify-center overflow-hidden
						${layout.titleAtBottom ? "flex-1 self-center" : "mb-2"}
					`}
				>
					<BookmarkIcon bookmark={bookmark} size={layout.iconSize} />
				</div>

				<h3 className={`${layout.titleClass} w-full text-center text-primary font-medium line-clamp-2`}>
					{title}
				</h3>
			</a>

			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					items={contextMenuItems}
					label={title}
					onClose={() => setContextMenu(null)}
				/>
			)}
		</>
	);
}
