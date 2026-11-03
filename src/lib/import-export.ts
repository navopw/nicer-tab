import type { BookmarkNode, BookmarkExport } from "../types/bookmark";
import type { FaviconOverride } from "../types/favicon";
import { getUISettings, sanitizeUISettings, useUIStore } from "../stores/uiStore";
import { normalizeUrl } from "./bookmark-tree";
import { parseBookmarkHtml, serializeBookmarkHtml, type ImportNode, type RootRole } from "./bookmark-html";
import { readFaviconOverrides, setFaviconOverrides } from "./favicon-storage";

const EXPORT_VERSION = 2;

/** Work out which permanent folder a top-level browser node is, in Chrome or Firefox. */
export function rootRoleOf(node: Pick<BookmarkNode, "id" | "folderType">): RootRole | "managed" | undefined {
	switch (node.folderType) {
		case "bookmarks-bar":
			return "bar";
		case "other":
			return "other";
		case "mobile":
			return "mobile";
		case "managed":
			return "managed";
	}

	// Older Chrome versions have no folderType, but use fixed IDs.
	switch (node.id) {
		case "1":
		case "toolbar_____":
			return "bar";
		case "2":
		case "unfiled_____":
			return "other";
		case "3":
		case "mobile______":
			return "mobile";
		case "menu________":
			return "menu";
	}

	return undefined;
}

/** Recognise the permanent folders of exports that do not flag them, e.g. Chrome's "Other bookmarks". */
function rootRoleFromTitle(title: string): RootRole | undefined {
	const normalized = title.trim().toLowerCase();
	if (normalized === "bookmarks bar" || normalized === "bookmarks toolbar") return "bar";
	if (normalized === "other bookmarks") return "other";
	if (normalized === "mobile bookmarks") return "mobile";
	if (normalized === "bookmarks menu") return "menu";
	return undefined;
}

function download(content: string, filename: string, type: string) {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function dateStamp(): string {
	return new Date().toISOString().split("T")[0] ?? "";
}

/** A full backup: bookmarks, settings and custom icons. */
export async function exportBookmarksJson(): Promise<void> {
	const [tree, faviconOverrides] = await Promise.all([chrome.bookmarks.getTree(), readFaviconOverrides()]);

	const exportData: BookmarkExport = {
		version: EXPORT_VERSION,
		exportedAt: new Date().toISOString(),
		bookmarks: tree as BookmarkNode[],
		settings: { ...getUISettings() },
		faviconOverrides
	};

	download(JSON.stringify(exportData, null, 2), `nicer-tab-backup-${dateStamp()}.json`, "application/json");
}

/** The standard bookmark file every browser can import. */
export async function exportBookmarksHtml(): Promise<void> {
	const tree = (await chrome.bookmarks.getTree()) as BookmarkNode[];
	const roots = (tree[0]?.children ?? []).filter(node => rootRoleOf(node) !== "managed");
	const html = serializeBookmarkHtml(roots, node => {
		const role = rootRoleOf(node);
		return role === "managed" ? undefined : role;
	});
	download(html, `bookmarks-${dateStamp()}.html`, "text/html");
}

function toImportNode(node: BookmarkNode): ImportNode {
	if (typeof node.url === "string") {
		return { title: node.title ?? "", url: node.url, sourceId: node.id };
	}
	return {
		title: node.title ?? "",
		sourceId: node.id,
		children: [...(node.children ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map(toImportNode)
	};
}

interface ParsedImport {
	roots: ImportNode[];
	settings?: unknown;
	faviconOverrides?: Record<string, FaviconOverride>;
}

function parseJsonImport(text: string): ParsedImport {
	const data = JSON.parse(text) as Partial<BookmarkExport>;
	const root = Array.isArray(data.bookmarks) ? data.bookmarks[0] : undefined;
	if (!root || !Array.isArray(root.children)) {
		throw new Error("This is not a Nicer Tab backup file.");
	}

	const roots = root.children.map(node => {
		const role = rootRoleOf(node);
		const importNode = toImportNode(node);
		return role && role !== "managed" ? { ...importNode, role } : importNode;
	});

	return { roots, settings: data.settings, faviconOverrides: data.faviconOverrides };
}

export interface ImportResult {
	created: number;
	skipped: number;
	failed: number;
	settingsRestored: boolean;
}

interface ImportContext {
	result: ImportResult;
	/** Exported bookmark ID to the ID it has in this browser, for carrying custom icons over. */
	idMap: Map<string, string>;
}

/**
 * Add `nodes` under `parentId`, reusing folders with the same name and skipping
 * bookmarks the folder already has, so importing the same file twice is harmless.
 */
async function mergeInto(parentId: string, nodes: ImportNode[], context: ImportContext): Promise<void> {
	const existing = await chrome.bookmarks.getChildren(parentId);

	for (const node of nodes) {
		if (node.children) {
			let folder = existing.find(child => !child.url && child.title === node.title);
			if (!folder) {
				try {
					folder = await chrome.bookmarks.create({ parentId, title: node.title });
					existing.push(folder);
				} catch {
					context.result.failed += 1;
					continue;
				}
			}
			await mergeInto(folder.id, node.children, context);
			continue;
		}

		if (!node.url) continue;
		const key = normalizeUrl(node.url);
		const duplicate = existing.find(child => child.url && normalizeUrl(child.url) === key);
		if (duplicate) {
			context.result.skipped += 1;
			if (node.sourceId) context.idMap.set(node.sourceId, duplicate.id);
			continue;
		}

		try {
			const created = await chrome.bookmarks.create({ parentId, title: node.title, url: node.url });
			existing.push(created);
			context.result.created += 1;
			if (node.sourceId) context.idMap.set(node.sourceId, created.id);
		} catch {
			// Browsers reject some URLs from other browsers, e.g. Firefox's "place:" queries.
			context.result.failed += 1;
		}
	}
}

/**
 * Import a Nicer Tab backup (.json) or a browser bookmark file (.html) on top of
 * the existing bookmarks. Permanent folders map onto their counterpart here, so a
 * Firefox toolbar lands in Chrome's Bookmarks Bar.
 */
export async function importBookmarksFile(file: File): Promise<ImportResult> {
	const text = await file.text();
	const isJson = file.name.toLowerCase().endsWith(".json") || text.trimStart().startsWith("{");
	const parsed: ParsedImport = isJson ? parseJsonImport(text) : { roots: parseBookmarkHtml(text) };

	if (parsed.roots.length === 0) {
		throw new Error("No bookmarks found in this file.");
	}

	const tree = (await chrome.bookmarks.getTree()) as BookmarkNode[];
	const localRoots = (tree[0]?.children ?? []).filter(node => rootRoleOf(node) !== "managed");
	const findLocalRoot = (role: RootRole) => localRoots.find(node => rootRoleOf(node) === role);
	const fallbackRoot = findLocalRoot("other") ?? localRoots[localRoots.length - 1];
	if (!fallbackRoot) {
		throw new Error("No folder to import into.");
	}

	const context: ImportContext = {
		result: { created: 0, skipped: 0, failed: 0, settingsRestored: false },
		idMap: new Map()
	};

	// Loose top-level bookmarks (Firefox exports its menu like this) go to the fallback folder.
	const looseBookmarks = parsed.roots.filter(node => !node.children);
	if (looseBookmarks.length > 0) {
		await mergeInto(fallbackRoot.id, looseBookmarks, context);
	}

	for (const node of parsed.roots.filter(node => node.children)) {
		const role = node.role ?? rootRoleFromTitle(node.title);
		const localRoot =
			(role && findLocalRoot(role)) ??
			// Folders named after a local permanent folder, e.g. from an export in the same language.
			localRoots.find(root => root.title.toLowerCase() === node.title.toLowerCase());

		if (localRoot) {
			await mergeInto(localRoot.id, node.children ?? [], context);
		} else {
			// No counterpart here (like Firefox's Bookmarks Menu in Chrome): keep it as a folder.
			await mergeInto(fallbackRoot.id, [node], context);
		}
	}

	if (parsed.faviconOverrides) {
		const restored = Object.values(parsed.faviconOverrides).flatMap(override => {
			const bookmarkId = context.idMap.get(override.bookmarkId);
			return bookmarkId && typeof override.value === "string" ? [{ ...override, bookmarkId }] : [];
		});
		await setFaviconOverrides(restored);
	}

	const settings = sanitizeUISettings(parsed.settings);
	if (Object.keys(settings).length > 0) {
		useUIStore.getState().applySettings(settings);
		context.result.settingsRestored = true;
	}

	return context.result;
}
