import { describe, expect, it } from "vitest";
import { searchBookmarks } from "./search";
import { bookmark, folder, tree } from "./test-utils";

const bookmarks = tree(
	folder("1", "Bookmarks bar", [
		bookmark("notes", "My GitHub notes", "https://notes.example/github"),
		bookmark("gh", "GitHub", "https://github.com"),
		bookmark("py", "Python Tutorial", "https://docs.python.org/3/tutorial/"),
		folder("work", "Work", [bookmark("jira", "Jira", "https://jira.atlassian.com")])
	]),
	folder("2", "Other bookmarks", [bookmark("untitled", "", "https://untitled.example/page")])
);

const ids = (query: string) => searchBookmarks(bookmarks, query).bookmarks.map(node => node.id);

describe("searchBookmarks", () => {
	it("returns nothing for an empty query", () => {
		expect(searchBookmarks(bookmarks, "   ")).toEqual({ folders: [], groups: [], bookmarks: [] });
	});

	it("ranks title prefixes above matches later in the title", () => {
		expect(ids("git")).toEqual(["gh", "notes"]);
	});

	it("requires every word to match", () => {
		expect(ids("python tutorial")).toEqual(["py"]);
		expect(ids("python jira")).toEqual([]);
	});

	it("matches the address when the title does not", () => {
		expect(ids("atlassian")).toEqual(["jira"]);
		expect(ids("untitled")).toEqual(["untitled"]);
	});

	it("groups bookmarks by folder, best group first", () => {
		const { groups } = searchBookmarks(bookmarks, "ji");
		expect(groups.map(group => group.breadcrumb)).toEqual(["Bookmarks bar / Work"]);
	});

	it("finds folders by name", () => {
		const { folders } = searchBookmarks(bookmarks, "work");
		expect(folders.map(match => [match.folder.id, match.breadcrumb])).toEqual([["work", "Bookmarks bar"]]);
	});
});
