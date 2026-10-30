import { ChevronRight } from "lucide-react";
import { isBookmark, type BookmarkNode } from "../../types/bookmark";

interface FolderHeaderProps {
	/** Folders from the permanent root down to the open folder. */
	path: BookmarkNode[];
	onNavigate: (folderId: string) => void;
}

/** Breadcrumb of the open folder; every ancestor is a link back up. */
export function FolderHeader({ path, onNavigate }: FolderHeaderProps) {
	const current = path[path.length - 1];
	if (!current) return null;

	const bookmarkCount = current.children?.filter(isBookmark).length ?? 0;

	return (
		<div className="flex items-baseline gap-3 mb-4 min-w-0">
			<nav aria-label="Folder path" className="min-w-0">
				<ol className="flex flex-wrap items-center gap-1 text-sm">
					{path.map((folder, index) => {
						const isCurrent = index === path.length - 1;
						return (
							<li key={folder.id} className="flex items-center gap-1 min-w-0">
								{index > 0 && (
									<ChevronRight
										className="w-3.5 h-3.5 text-tertiary flex-shrink-0"
										aria-hidden="true"
									/>
								)}
								{isCurrent ? (
									<span aria-current="page" className="text-lg font-semibold text-primary truncate">
										{folder.title || "Untitled"}
									</span>
								) : (
									<button
										type="button"
										onClick={() => onNavigate(folder.id)}
										className="text-secondary hover:text-primary truncate rounded cursor-pointer"
									>
										{folder.title || "Untitled"}
									</button>
								)}
							</li>
						);
					})}
				</ol>
			</nav>
			<span className="text-xs text-tertiary whitespace-nowrap">
				{bookmarkCount} bookmark{bookmarkCount === 1 ? "" : "s"}
			</span>
		</div>
	);
}
