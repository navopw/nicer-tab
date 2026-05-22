import type { BookmarkNode } from "../../types/bookmark";
import { isFolder } from "../../types/bookmark";
import { FolderItem } from "./FolderItem";

interface FolderTreeProps {
	folders: BookmarkNode[];
	level: number;
	rootId: string | null;
}

export function FolderTree({ folders, level, rootId }: FolderTreeProps) {
	// Filter to only show folders (not bookmarks)
	const folderNodes = folders
		.filter(isFolder)
		.slice()
		.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

	if (folderNodes.length === 0) {
		return null;
	}

	return (
		<ul className="space-y-1">
			{folderNodes.map((folder, index) => (
				<FolderItem key={folder.id} folder={folder} level={level} index={index} rootId={rootId} />
			))}
		</ul>
	);
}
