import { useMemo } from "react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { listFolders } from "../../lib/bookmark-tree";

interface FolderSelectProps {
	id: string;
	value: string;
	onChange: (folderId: string) => void;
}

/** A dropdown of every folder bookmarks can be saved to, indented to show nesting. */
export function FolderSelect({ id, value, onChange }: FolderSelectProps) {
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);
	const folders = useMemo(() => listFolders(bookmarkTree), [bookmarkTree]);

	return (
		<select
			id={id}
			value={value}
			onChange={event => onChange(event.target.value)}
			className="w-full px-3 py-2 bg-secondary rounded-lg text-primary border border-theme focus:outline-none focus:border-[var(--accent-color)] cursor-pointer"
		>
			{folders.map(folder => (
				<option key={folder.id} value={folder.id}>
					{"   ".repeat(folder.depth)}
					{folder.title}
				</option>
			))}
		</select>
	);
}
