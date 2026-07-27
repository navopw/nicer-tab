import type { FlatFolder } from "../../lib/folder-tree";
import { FolderItem } from "./FolderItem";

interface FolderTreeProps {
	rows: FlatFolder[];
}

/**
 * The folder tree is rendered as a flat list so that drag and drop can treat every
 * visible folder as a single, contiguous drop lane regardless of nesting depth.
 */
export function FolderTree({ rows }: FolderTreeProps) {
	if (rows.length === 0) {
		return null;
	}

	return (
		<ul>
			{rows.map(row => (
				<FolderItem key={row.folder.id} row={row} />
			))}
		</ul>
	);
}
