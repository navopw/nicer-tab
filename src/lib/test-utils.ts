import type { BookmarkNode } from "../types/bookmark";

type Spec = { id: string; title: string; url?: string; children?: Spec[]; folderType?: string };

export const bookmark = (id: string, title: string, url: string): Spec => ({ id, title, url });
export const folder = (id: string, title: string, children: Spec[] = []): Spec => ({ id, title, children });

/** Build a tree the way `chrome.bookmarks.getTree` returns it, with parent IDs and indexes filled in. */
export function tree(...roots: Spec[]): BookmarkNode[] {
	const build = (spec: Spec, parentId: string | undefined, index: number | undefined): BookmarkNode => ({
		...spec,
		parentId,
		index,
		children: spec.children?.map((child, childIndex) => build(child, spec.id, childIndex))
	});
	return [build({ id: "0", title: "", children: roots }, undefined, undefined)];
}
