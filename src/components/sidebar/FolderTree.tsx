import type { FlatFolder } from "../../lib/folder-tree";
import { useTreeNavigation } from "../../hooks/useTreeNavigation";
import { FolderItem } from "./FolderItem";

interface FolderTreeProps {
	rows: FlatFolder[];
	/** The row that is in the tab order. */
	tabStopId: string | undefined;
}

/**
 * The folder tree is rendered as a flat list so that drag and drop can treat every
 * visible folder as a single, contiguous drop lane regardless of nesting depth.
 * `aria-level` on each row gives assistive technology the nesting back.
 */
export function FolderTree({ rows, tabStopId }: FolderTreeProps) {
	const handleKeyDown = useTreeNavigation(rows);

	if (rows.length === 0) {
		return null;
	}

	return (
		<ul role="tree" aria-label="Folders" onKeyDown={handleKeyDown}>
			{rows.map(row => (
				<FolderItem key={row.folder.id} row={row} isTabStop={row.folder.id === tabStopId} />
			))}
		</ul>
	);
}
