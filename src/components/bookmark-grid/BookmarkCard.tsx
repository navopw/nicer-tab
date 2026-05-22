import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Edit2, Trash2, ExternalLink as OpenIcon, Copy, CopyPlus, Sparkles } from "lucide-react";
import type { BookmarkNode, CardSize } from "../../types/bookmark";
import { getDomainFromUrl } from "../../types/bookmark";
import { getBookmarkFaviconCandidates, type FaviconCandidate } from "../../lib/favicon";
import { FAVICON_OVERRIDES_UPDATED_EVENT } from "../../lib/favicon-storage";
import { ContextMenu, type ContextMenuItem } from "../common/ContextMenu";

interface BookmarkCardProps {
	bookmark: BookmarkNode;
	size: CardSize;
	onEdit?: (bookmark: BookmarkNode) => void;
	onDelete?: (bookmark: BookmarkNode) => void;
	onDuplicate?: (bookmark: BookmarkNode) => void;
	onCustomizeIcon?: (bookmark: BookmarkNode) => void;
	isFocused?: boolean;
	onOpen?: () => void;
}

// Card dimensions based on size
const cardConfig = {
	small: {
		width: "w-full",
		height: "h-24",
		iconSize: 32,
		iconContainer: "w-10 h-10",
		titleClass: "text-xs break-words hyphens-auto",
		padding: "p-2",
		titleAtBottom: false
	},
	medium: {
		width: "w-full",
		height: "h-36",
		iconSize: 48,
		iconContainer: "w-14 h-14",
		titleClass: "text-sm break-words hyphens-auto",
		padding: "p-3",
		titleAtBottom: true
	},
	large: {
		width: "w-full",
		height: "h-44",
		iconSize: 64,
		iconContainer: "w-20 h-20",
		titleClass: "text-sm break-words hyphens-auto",
		padding: "p-4",
		titleAtBottom: true
	}
};

export function BookmarkCard({
	bookmark,
	size,
	onEdit,
	onDelete,
	onDuplicate,
	onCustomizeIcon,
	isFocused,
	onOpen
}: BookmarkCardProps) {
	const [candidates, setCandidates] = useState<FaviconCandidate[]>([]);
	const [candidateIndex, setCandidateIndex] = useState(0);
	const [faviconRefreshTick, setFaviconRefreshTick] = useState(0);
	const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
	const config = cardConfig[size];

	const domain = bookmark.url ? getDomainFromUrl(bookmark.url) : "";

	useEffect(() => {
		const handleFaviconOverridesUpdated = (event: Event) => {
			const customEvent = event as CustomEvent<{ bookmarkIds?: string[] }>;
			const bookmarkIds = customEvent.detail?.bookmarkIds;
			if (!bookmarkIds || bookmarkIds.includes(bookmark.id)) {
				setFaviconRefreshTick(prev => prev + 1);
			}
		};

		window.addEventListener(FAVICON_OVERRIDES_UPDATED_EVENT, handleFaviconOverridesUpdated);
		return () => {
			window.removeEventListener(FAVICON_OVERRIDES_UPDATED_EVENT, handleFaviconOverridesUpdated);
		};
	}, [bookmark.id]);

	useEffect(() => {
		let canceled = false;

		getBookmarkFaviconCandidates({
			bookmarkId: bookmark.id,
			url: bookmark.url,
			title: bookmark.title || domain || "?",
			size: 256
		})
			.then(nextCandidates => {
				if (canceled) return;
				setCandidates(nextCandidates);
				setCandidateIndex(0);
			})
			.catch(() => {
				if (canceled) return;
				setCandidates([{ key: "letter:?", type: "letter", letter: "?" }]);
				setCandidateIndex(0);
			});

		return () => {
			canceled = true;
		};
	}, [bookmark.id, bookmark.title, bookmark.url, domain, faviconRefreshTick]);

	const currentCandidate = candidates[candidateIndex] ?? null;
	const fallbackLetter = useMemo(() => {
		const candidateLetter = currentCandidate?.type === "letter" ? currentCandidate.letter : undefined;
		return candidateLetter || (bookmark.title || domain || "?")[0]?.toUpperCase() || "?";
	}, [bookmark.title, currentCandidate, domain]);

	const handleClick = (e: React.MouseEvent) => {
		onOpen?.();
	};

	const handleMiddleClick = (e: React.MouseEvent) => {
		if (e.button === 1) {
			onOpen?.();
		}
	};

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setContextMenu({ x: e.clientX, y: e.clientY });
	};

	const contextMenuItems: ContextMenuItem[] = [
		{
			id: "open",
			label: "Open",
			icon: <OpenIcon className="w-4 h-4" />,
			onClick: () => {
				if (bookmark.url) window.location.href = bookmark.url;
			}
		},
		{
			id: "open-new-tab",
			label: "Open in new tab",
			icon: <ExternalLink className="w-4 h-4" />,
			onClick: () => {
				if (bookmark.url) window.open(bookmark.url, "_blank");
			}
		},
		{
			id: "copy-url",
			label: "Copy URL",
			icon: <Copy className="w-4 h-4" />,
			onClick: () => {
				if (bookmark.url) navigator.clipboard.writeText(bookmark.url);
			}
		},
		{
			id: "duplicate",
			label: "Duplicate",
			icon: <CopyPlus className="w-4 h-4" />,
			onClick: () => onDuplicate?.(bookmark)
		},
		{
			id: "customize-icon",
			label: "Customize icon",
			icon: <Sparkles className="w-4 h-4" />,
			onClick: () => onCustomizeIcon?.(bookmark)
		},
		{
			id: "edit",
			label: "Edit",
			icon: <Edit2 className="w-4 h-4" />,
			onClick: () => onEdit?.(bookmark)
		},
		{
			id: "delete",
			label: "Delete",
			icon: <Trash2 className="w-4 h-4" />,
			danger: true,
			onClick: () => onDelete?.(bookmark)
		}
	];

	return (
		<a
			href={bookmark.url}
			target="_blank"
			rel="noopener noreferrer"
			className={`
        group relative flex flex-col
        ${config.width} ${config.height} ${config.padding}
        card-bg rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-color)]
        cursor-pointer transition-all duration-200 no-underline
        ${config.titleAtBottom ? "justify-between" : "items-center"}
        ${isFocused ? "ring-2 ring-[var(--accent-color)] border-[var(--accent-color)]" : ""}
      `}
			onClick={handleClick}
			onMouseDown={handleMiddleClick}
			onContextMenu={handleContextMenu}
			onDragStart={e => e.preventDefault()}
			title={bookmark.url}
		>
			{/* Favicon container */}
			<div
				className={`
          ${config.iconContainer} flex items-center justify-center
          overflow-hidden
          ${config.titleAtBottom ? "flex-1 self-center" : "mb-2"}
        `}
			>
				{currentCandidate?.type === "image" && currentCandidate.src ? (
					<img
						src={currentCandidate.src}
						alt=""
						width={config.iconSize}
						height={config.iconSize}
						className="object-contain"
						onError={() => {
							setCandidateIndex(prev => Math.min(prev + 1, Math.max(candidates.length - 1, 0)));
						}}
						onDragStart={e => e.preventDefault()}
						loading="lazy"
					/>
				) : (
					<div
						className="flex items-center justify-center rounded-lg bg-[var(--bg-tertiary)]"
						style={{ width: config.iconSize, height: config.iconSize }}
					>
						<span className="text-tertiary font-medium" style={{ fontSize: config.iconSize * 0.4 }}>
							{fallbackLetter}
						</span>
					</div>
				)}
			</div>

			{/* Title section at bottom for bigger cards */}
			<div className="w-full">
				<h3 className={`${config.titleClass} text-center text-primary font-medium w-full`}>
					{bookmark.title || domain || "Untitled"}
				</h3>
			</div>

			{/* Context menu */}
			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					items={contextMenuItems}
					onClose={() => setContextMenu(null)}
				/>
			)}
		</a>
	);
}
