import { describe, expect, it } from "vitest";
import { decodeEntities, parseBookmarkHtml, serializeBookmarkHtml, type ImportNode } from "./bookmark-html";
import { bookmark, folder, tree } from "./test-utils";

/** Titles, URLs, roles and nesting only, to compare trees independent of IDs. */
function outline(nodes: ImportNode[]): unknown[] {
	return nodes.map(node =>
		node.children
			? { title: node.title, ...(node.role ? { role: node.role } : {}), children: outline(node.children) }
			: { title: node.title, url: node.url }
	);
}

describe("parseBookmarkHtml", () => {
	it("reads a Chrome export", () => {
		const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1" LAST_MODIFIED="2" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="3" ICON="data:image/png;base64,AAAA">Example &amp; Co</A>
        <DT><H3>Dev</H3>
        <DL><p>
            <DT><A HREF="https://github.com">GitHub</A>
        </DL><p>
        <DT><H3>Empty</H3>
        <DL><p>
        </DL><p>
    </DL><p>
    <DT><H3>Other bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://news.ycombinator.com">HN</A>
    </DL><p>
</DL><p>`;

		expect(outline(parseBookmarkHtml(html))).toEqual([
			{
				title: "Bookmarks bar",
				role: "bar",
				children: [
					{ title: "Example & Co", url: "https://example.com/?a=1&b=2" },
					{ title: "Dev", children: [{ title: "GitHub", url: "https://github.com" }] },
					{ title: "Empty", children: [] }
				]
			},
			{ title: "Other bookmarks", children: [{ title: "HN", url: "https://news.ycombinator.com" }] }
		]);
	});

	it("reads a Firefox export, which puts menu bookmarks at the top level", () => {
		const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<H1>Bookmarks Menu</H1>
<DL><p>
    <DT><A HREF="https://www.mozilla.org/" ADD_DATE="1">Mozilla</A>
    <DT><H3 ADD_DATE="1" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Toolbar</H3>
    <DL><p>
        <DT><A HREF="https://developer.mozilla.org/">MDN</A>
    </DL><p>
    <DT><H3 UNFILED_BOOKMARKS_FOLDER="true">Other Bookmarks</H3>
    <DL><p>
        <DT><A HREF='https://example.org/'>Single quotes</A>
    </DL><p>
</DL>`;

		expect(outline(parseBookmarkHtml(html))).toEqual([
			{ title: "Mozilla", url: "https://www.mozilla.org/" },
			{
				title: "Bookmarks Toolbar",
				role: "bar",
				children: [{ title: "MDN", url: "https://developer.mozilla.org/" }]
			},
			{
				title: "Other Bookmarks",
				role: "other",
				children: [{ title: "Single quotes", url: "https://example.org/" }]
			}
		]);
	});

	it("only flags permanent folders at the top level", () => {
		const html = `<DL><p><DT><H3>Outer</H3><DL><p><DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Inner</H3><DL><p></DL><p></DL><p></DL>`;
		expect(outline(parseBookmarkHtml(html))).toEqual([
			{ title: "Outer", children: [{ title: "Inner", children: [] }] }
		]);
	});
});

describe("serializeBookmarkHtml", () => {
	it("round trips through the parser, special characters included", () => {
		const bookmarks = tree(
			folder("1", "Bookmarks bar", [
				bookmark("a", `Quotes " & <tags>`, 'https://example.com/?q=a&b="c"'),
				folder("10", "Ünïcödé 📚", [bookmark("b", "Nested", "https://nested.example")])
			]),
			folder("2", "Other bookmarks", [bookmark("c", "Other", "https://other.example")]),
			folder("3", "Mobile bookmarks")
		);
		const roles = { "1": "bar", "2": "other" } as const;
		const html = serializeBookmarkHtml(bookmarks[0]!.children!, node => roles[node.id as keyof typeof roles]);

		expect(outline(parseBookmarkHtml(html))).toEqual([
			{
				title: "Bookmarks bar",
				role: "bar",
				children: [
					{ title: `Quotes " & <tags>`, url: 'https://example.com/?q=a&b="c"' },
					{ title: "Ünïcödé 📚", children: [{ title: "Nested", url: "https://nested.example" }] }
				]
			},
			{ title: "Other bookmarks", role: "other", children: [{ title: "Other", url: "https://other.example" }] }
		]);
	});
});

describe("decodeEntities", () => {
	it("decodes named, decimal and hex entities and leaves unknown ones", () => {
		expect(decodeEntities("&lt;a&gt; &#39;x&#39; &#x1F4DA; &copy;")).toBe("<a> 'x' 📚 &copy;");
	});
});
