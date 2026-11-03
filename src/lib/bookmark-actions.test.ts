import { resetFakeChrome } from "./fake-chrome";
import { describe, expect, it } from "vitest";
import type { BookmarkNode } from "../types/bookmark";
import type { FaviconOverride } from "../types/favicon";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { useFaviconStore } from "../stores/faviconStore";
import { useToastStore } from "../stores/toastStore";
import { deleteWithUndo } from "./bookmark-actions";
import { readFaviconOverrides, setFaviconOverrides } from "./favicon-storage";
import { bookmark, folder, tree } from "./test-utils";

function outline(nodes: BookmarkNode[] = []): unknown[] {
	return nodes.map(node => (node.url ? node.title : { [node.title]: outline(node.children) }));
}

describe("deleteWithUndo", () => {
	it("brings a deleted folder back in place, with its subtree and custom icons", async () => {
		resetFakeChrome(
			tree(
				folder("1", "Bookmarks bar"),
				folder("2", "Other bookmarks", [
					bookmark("x", "Before", "https://x.example"),
					folder("20", "Work", [
						bookmark("w", "Docs", "https://docs.example"),
						folder("21", "Sub", [bookmark("d", "Deep", "https://deep.example")])
					]),
					bookmark("y", "After", "https://y.example")
				])
			)
		);
		const icon: FaviconOverride = {
			bookmarkId: "w",
			type: "custom_url",
			value: "https://docs.example/icon.png",
			source: "manual",
			updatedAt: 1
		};
		await setFaviconOverrides([icon]);
		useFaviconStore.setState({ overrides: { w: icon } });
		useBookmarkStore.setState({ bookmarkTree: (await chrome.bookmarks.getTree()) as BookmarkNode[] });

		await deleteWithUndo("20");
		const otherBookmarks = async () =>
			(await chrome.bookmarks.getTree())[0]!.children![1]!.children as BookmarkNode[];
		expect(outline(await otherBookmarks())).toEqual(["Before", "After"]);
		expect(await readFaviconOverrides()).toEqual({});

		const toast = useToastStore.getState().toasts.at(-1);
		expect(toast?.message).toBe('Deleted "Work" and 2 bookmarks');
		await toast?.action?.onClick();

		const restored = await otherBookmarks();
		expect(outline(restored)).toEqual(["Before", { Work: ["Docs", { Sub: ["Deep"] }] }, "After"]);
		const docsId = restored[1]!.children![0]!.id;
		expect(await readFaviconOverrides()).toEqual({ [docsId]: { ...icon, bookmarkId: docsId } });
	});
});
