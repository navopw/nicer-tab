import type { BookmarkNode } from "../types/bookmark";
import { sortByIndex } from "./folder-tree";

/**
 * Reading and writing the Netscape bookmark file format, the HTML file every
 * browser imports and exports.
 */

/** Which permanent browser folder a top-level node stands for. */
export type RootRole = "bar" | "other" | "mobile" | "menu";

/** A browser neutral bookmark tree node, the common shape for every import format. */
export interface ImportNode {
	title: string;
	url?: string;
	/** Present on folders, even empty ones. */
	children?: ImportNode[];
	/** Set on top-level folders that stand for a permanent browser folder. */
	role?: RootRole;
	/** ID in the exporting browser, used to carry custom icons over. */
	sourceId?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " "
};

export function decodeEntities(text: string): string {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith("#")) {
			const isHex = entity[1] === "x" || entity[1] === "X";
			const code = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
		}
		return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
	});
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getAttribute(attributes: string, name: string): string | undefined {
	const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attributes);
	if (!match) return undefined;
	return decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
}

function textContent(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

function roleFromAttributes(attributes: string): RootRole | undefined {
	if (getAttribute(attributes, "PERSONAL_TOOLBAR_FOLDER") === "true") return "bar";
	if (getAttribute(attributes, "UNFILED_BOOKMARKS_FOLDER") === "true") return "other";
	return undefined;
}

// The format is not well-formed HTML (<DT> and <p> are never closed), so instead of
// building a DOM we only look at the four tags that carry structure.
const TOKEN = /<dl\b[^>]*>|<\/dl\s*>|<h3\b([^>]*)>([\s\S]*?)<\/h3\s*>|<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;

/** Parse a Netscape bookmark file into its top-level nodes. */
export function parseBookmarkHtml(html: string): ImportNode[] {
	const root: ImportNode = { title: "", children: [] };
	// Folders whose <DL> is currently open, innermost last.
	const stack: ImportNode[] = [];
	// The folder named by the last <H3>, waiting for the <DL> holding its children.
	let pending: ImportNode | null = null;
	const current = () => stack[stack.length - 1] ?? root;

	for (const match of html.matchAll(TOKEN)) {
		const token = match[0].slice(0, 4).toLowerCase();

		if (token === "</dl") {
			stack.pop();
			pending = null;
		} else if (token.startsWith("<dl")) {
			stack.push(stack.length === 0 ? root : (pending ?? current()));
			pending = null;
		} else if (match[2] !== undefined) {
			const folder: ImportNode = { title: textContent(match[2]), children: [] };
			const role = current() === root ? roleFromAttributes(match[1] ?? "") : undefined;
			if (role) folder.role = role;
			current().children!.push(folder);
			pending = folder;
		} else {
			pending = null;
			const href = getAttribute(match[3] ?? "", "href");
			if (!href) continue;
			current().children!.push({ title: textContent(match[4] ?? ""), url: href });
		}
	}

	return root.children!;
}

function dateAttribute(name: string, milliseconds: number | undefined): string {
	return milliseconds ? ` ${name}="${Math.floor(milliseconds / 1000)}"` : "";
}

/** Write the permanent root folders and everything below them as a Netscape bookmark file. */
export function serializeBookmarkHtml(
	rootFolders: BookmarkNode[],
	roleOf: (node: BookmarkNode) => RootRole | undefined
): string {
	const lines = [
		"<!DOCTYPE NETSCAPE-Bookmark-file-1>",
		"<!-- This is an automatically generated file.",
		"     It will be read and overwritten.",
		"     DO NOT EDIT! -->",
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		"<TITLE>Bookmarks</TITLE>",
		"<H1>Bookmarks</H1>",
		"<DL><p>"
	];

	const write = (node: BookmarkNode, depth: number) => {
		const indent = "    ".repeat(depth);

		if (node.url !== undefined) {
			const added = dateAttribute("ADD_DATE", node.dateAdded);
			lines.push(`${indent}<DT><A HREF="${escapeHtml(node.url)}"${added}>${escapeHtml(node.title)}</A>`);
			return;
		}

		const role = depth === 1 ? roleOf(node) : undefined;
		const flag =
			role === "bar"
				? ' PERSONAL_TOOLBAR_FOLDER="true"'
				: role === "other"
					? ' UNFILED_BOOKMARKS_FOLDER="true"'
					: "";
		const dates =
			dateAttribute("ADD_DATE", node.dateAdded) + dateAttribute("LAST_MODIFIED", node.dateGroupModified);
		lines.push(`${indent}<DT><H3${dates}${flag}>${escapeHtml(node.title)}</H3>`);
		lines.push(`${indent}<DL><p>`);
		for (const child of sortByIndex(node.children ?? [])) {
			write(child, depth + 1);
		}
		lines.push(`${indent}</DL><p>`);
	};

	for (const folder of sortByIndex(rootFolders)) {
		if (folder.children?.length) write(folder, 1);
	}

	lines.push("</DL><p>");
	return `${lines.join("\n")}\n`;
}
