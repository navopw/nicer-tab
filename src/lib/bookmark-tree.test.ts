import { describe, expect, it } from "vitest";
import {
	findBookmarksByUrl,
	findNodeById,
	listFolders,
	normalizeTypedUrl,
	normalizeUrl,
	optimisticallyMoveNode
} from "./bookmark-tree";
import { bookmark, folder, tree } from "./test-utils";

const bookmarks = tree(
	folder("1", "Bookmarks bar", [
		bookmark("a", "A", "https://a.example"),
		bookmark("b", "B", "https://b.example"),
		bookmark("c", "C", "https://c.example"),
		bookmark("d", "D", "https://d.example")
	]),
	folder("2", "Other bookmarks", [folder("20", "Work", [bookmark("w", "Docs", "https://docs.example/guide/")])])
);

const titlesIn = (nodes: ReturnType<typeof tree>, id: string) =>
	findNodeById(nodes, id)!.children!.map(child => `${child.title}${child.index}`);

describe("optimisticallyMoveNode", () => {
	it("moves forward within a folder using Chrome's insert-before-remove index", () => {
		// Behind C: C sits at 2, so Chrome is asked for 3.
		const moved = optimisticallyMoveNode(bookmarks, "a", { parentId: "1", index: 3 })!;
		expect(titlesIn(moved, "1")).toEqual(["B0", "C1", "A2", "D3"]);
	});

	it("moves backward within a folder", () => {
		const moved = optimisticallyMoveNode(bookmarks, "d", { parentId: "1", index: 1 })!;
		expect(titlesIn(moved, "1")).toEqual(["A0", "D1", "B2", "C3"]);
	});

	it("moves into another folder, appending by default", () => {
		const moved = optimisticallyMoveNode(bookmarks, "b", { parentId: "20" })!;
		expect(titlesIn(moved, "1")).toEqual(["A0", "C1", "D2"]);
		expect(titlesIn(moved, "20")).toEqual(["Docs0", "B1"]);
		expect(findNodeById(moved, "b")!.parentId).toBe("20");
	});

	it("leaves the original tree untouched", () => {
		optimisticallyMoveNode(bookmarks, "a", { parentId: "20" });
		expect(titlesIn(bookmarks, "1")).toEqual(["A0", "B1", "C2", "D3"]);
	});

	it("returns null for unknown nodes", () => {
		expect(optimisticallyMoveNode(bookmarks, "missing", { parentId: "1" })).toBeNull();
		expect(optimisticallyMoveNode(bookmarks, "a", { parentId: "missing" })).toBeNull();
	});
});

describe("normalizeUrl", () => {
	it("treats http and https, host case and trailing slashes alike", () => {
		expect(normalizeUrl("http://Docs.Example/guide/")).toBe(normalizeUrl("https://docs.example/guide"));
		expect(normalizeUrl("https://example.com")).toBe(normalizeUrl("https://example.com/"));
	});

	it("keeps query strings and fragments apart", () => {
		expect(normalizeUrl("https://example.com/?a=1")).not.toBe(normalizeUrl("https://example.com/?a=2"));
		expect(normalizeUrl("https://example.com/#top")).not.toBe(normalizeUrl("https://example.com/"));
	});
});

describe("normalizeTypedUrl", () => {
	it("adds https to bare hosts, including ones with a port", () => {
		expect(normalizeTypedUrl(" example.com ")).toBe("https://example.com");
		expect(normalizeTypedUrl("localhost:3000")).toBe("https://localhost:3000");
	});

	it("keeps explicit schemes", () => {
		expect(normalizeTypedUrl("http://example.com")).toBe("http://example.com");
		expect(normalizeTypedUrl("chrome://settings")).toBe("chrome://settings");
		expect(normalizeTypedUrl("mailto:someone@example.com")).toBe("mailto:someone@example.com");
	});
});

describe("findBookmarksByUrl", () => {
	it("finds the same address with its folder path", () => {
		const [match, ...rest] = findBookmarksByUrl(bookmarks, "http://docs.example/guide");
		expect(rest).toHaveLength(0);
		expect(match!.bookmark.id).toBe("w");
		expect(match!.folders.map(node => node.title)).toEqual(["Other bookmarks", "Work"]);
	});

	it("ignores the bookmark being edited", () => {
		expect(findBookmarksByUrl(bookmarks, "https://a.example", "a")).toEqual([]);
	});
});

describe("listFolders", () => {
	it("lists every folder with its depth", () => {
		expect(listFolders(bookmarks)).toEqual([
			{ id: "1", title: "Bookmarks bar", depth: 0 },
			{ id: "2", title: "Other bookmarks", depth: 0 },
			{ id: "20", title: "Work", depth: 1 }
		]);
	});
});
