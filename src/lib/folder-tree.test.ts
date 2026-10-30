import { describe, expect, it } from "vitest";
import { chromeMoveIndex, flattenFolderTree, projectFolderDrop, FOLDER_INDENT } from "./folder-tree";
import { findNodeById } from "./bookmark-tree";
import { bookmark, folder, tree } from "./test-utils";

// Bookmarks bar
//   A
//     A1
//   (bookmark b1)
//   B
// Other bookmarks
const bookmarks = tree(
	folder("1", "Bookmarks bar", [
		folder("10", "A", [folder("11", "A1")]),
		bookmark("b1", "Bookmark", "https://example.com"),
		folder("20", "B")
	]),
	folder("2", "Other bookmarks")
);
const roots = bookmarks[0]!.children!;
const rows = flattenFolderTree(roots, new Set(), "0");

describe("flattenFolderTree", () => {
	it("lists visible folders depth first with their depth", () => {
		expect(rows.map(row => [row.folder.title, row.depth])).toEqual([
			["Bookmarks bar", 0],
			["A", 1],
			["A1", 2],
			["B", 1],
			["Other bookmarks", 0]
		]);
	});

	it("skips the children of collapsed folders", () => {
		const collapsed = flattenFolderTree(roots, new Set(["10"]), "0");
		expect(collapsed.map(row => row.folder.title)).toEqual(["Bookmarks bar", "A", "B", "Other bookmarks"]);
		expect(collapsed[1]).toMatchObject({ hasChildFolders: true, isExpanded: false });
	});
});

describe("projectFolderDrop", () => {
	const drop = (targetRowId: string, offsetRatio: number, deltaX = 0) =>
		projectFolderDrop({ rows, draggedId: "20", targetRowId, offsetRatio, deltaX });

	it("drops inside a folder when hovering the middle of its row", () => {
		expect(drop("10", 0.5)).toEqual({ rowId: "10", mode: "inside", depth: 2, parentId: "10", position: 1 });
	});

	it("inserts before a row when hovering its top edge", () => {
		expect(drop("10", 0.1)).toEqual({ rowId: "10", mode: "before", depth: 1, parentId: "1", position: 0 });
	});

	it("inserts after a nested row as a sibling of its ancestor by default", () => {
		expect(drop("11", 0.9)).toEqual({ rowId: "11", mode: "after", depth: 1, parentId: "1", position: 1 });
	});

	it("nests deeper when dragged to the right", () => {
		expect(drop("11", 0.9, FOLDER_INDENT * 2)).toEqual({
			rowId: "11",
			mode: "after",
			depth: 3,
			parentId: "11",
			position: 0
		});
	});

	it("refuses to place anything above the first permanent folder", () => {
		expect(drop("1", 0.1)).toBeNull();
	});
});

describe("chromeMoveIndex", () => {
	const siblings = findNodeById(bookmarks, "1")!.children!;
	const a = findNodeById(bookmarks, "10")!;
	const b = findNodeById(bookmarks, "20")!;

	it("moves a folder to the front", () => {
		expect(chromeMoveIndex(siblings, 0, b, true)).toBe(0);
	});

	it("adds one for forward moves in the same folder, since Chrome inserts before removing", () => {
		// After B, which sits at index 2 behind the bookmark.
		expect(chromeMoveIndex(siblings, 1, a, true)).toBe(3);
	});

	it("does not adjust moves into another folder", () => {
		const other = findNodeById(bookmarks, "11")!;
		expect(chromeMoveIndex(siblings, 1, other, false)).toBe(1);
	});
});
