import { resetFakeChrome } from "./fake-chrome";
import { beforeEach, describe, expect, it } from "vitest";
import type { BookmarkNode } from "../types/bookmark";
import { importBookmarksFile } from "./import-export";
import { bookmark, folder, tree } from "./test-utils";

/** Titles and URLs only, so trees compare independent of the IDs the import assigned. */
function outline(nodes: BookmarkNode[] = []): unknown[] {
	return nodes.map(node => (node.url ? `${node.title} ${node.url}` : { [node.title]: outline(node.children) }));
}

async function localRoots() {
	const [root] = await chrome.bookmarks.getTree();
	return outline(root?.children as BookmarkNode[]);
}

// A Firefox export: menu items sit loose at the top, the toolbar is flagged.
const firefoxExport = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<H1>Bookmarks Menu</H1>
<DL><p>
    <DT><A HREF="https://menu.example/">Menu item</A>
    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Toolbar</H3>
    <DL><p>
        <DT><A HREF="http://GitHub.com/">GitHub again</A>
        <DT><H3>Dev</H3>
        <DL><p>
            <DT><A HREF="https://mdn.example/docs">MDN</A>
        </DL><p>
    </DL><p>
</DL>`;

describe("importBookmarksFile", () => {
	beforeEach(() => {
		const local = tree(
			{
				...folder("1", "Bookmarks bar", [bookmark("g", "GitHub", "https://github.com")]),
				folderType: "bookmarks-bar"
			},
			{ ...folder("2", "Other bookmarks"), folderType: "other" }
		);
		resetFakeChrome(local);
	});

	it("maps permanent folders, skips saved addresses, and does nothing on a second run", async () => {
		const file = () => new File([firefoxExport], "bookmarks.html", { type: "text/html" });

		const first = await importBookmarksFile(file());
		expect(first).toEqual({ created: 2, skipped: 1, failed: 0, settingsRestored: false });

		const expected = [
			{ "Bookmarks bar": ["GitHub https://github.com", { Dev: ["MDN https://mdn.example/docs"] }] },
			{ "Other bookmarks": ["Menu item https://menu.example/"] }
		];
		expect(await localRoots()).toEqual(expected);

		const second = await importBookmarksFile(file());
		expect(second).toEqual({ created: 0, skipped: 3, failed: 0, settingsRestored: false });
		expect(await localRoots()).toEqual(expected);
	});
});
