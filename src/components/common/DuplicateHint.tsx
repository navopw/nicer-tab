import { useMemo } from "react";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { findBookmarksByUrl, normalizeTypedUrl } from "../../lib/bookmark-tree";

interface DuplicateHintProps {
	url: string;
	/** The bookmark being edited, which should not count as its own duplicate. */
	excludeId?: string;
}

/** Points out that an address is already bookmarked, and where. */
export function DuplicateHint({ url, excludeId }: DuplicateHintProps) {
	const bookmarkTree = useBookmarkStore(state => state.bookmarkTree);

	const matches = useMemo(() => {
		const normalized = normalizeTypedUrl(url);
		if (!URL.canParse(normalized)) return [];
		return findBookmarksByUrl(bookmarkTree, normalized, excludeId);
	}, [bookmarkTree, excludeId, url]);

	const [first] = matches;
	if (!first) return null;

	const location = first.folders.map(folder => folder.title || "Untitled").join(" / ") || "your bookmarks";
	const others = matches.length - 1;

	return (
		<p className="mt-1 text-xs text-amber-600 dark:text-amber-400" role="status">
			Already saved in {location}
			{others > 0 ? ` and ${others} other place${others === 1 ? "" : "s"}` : ""}.
		</p>
	);
}
