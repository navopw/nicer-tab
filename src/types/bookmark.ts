import type { FaviconOverride } from "./favicon";

export interface BookmarkNode {
	id: string;
	parentId?: string;
	index?: number;
	url?: string;
	title: string;
	dateAdded?: number;
	dateGroupModified?: number;
	/** Chrome only: "bookmarks-bar", "other", "mobile" or "managed" on the permanent root folders. */
	folderType?: string;
	/** Set to "managed" on folders an administrator controls; they cannot be changed. */
	unmodifiable?: string;
	children?: BookmarkNode[];
}

export type CardSize = "small" | "medium" | "large";

export type ThemeMode = "system" | "dark" | "light";

export interface BookmarkExport {
	version: number;
	exportedAt: string;
	bookmarks: BookmarkNode[];
	/** Since version 2: the appearance and behaviour settings. */
	settings?: Record<string, unknown>;
	/** Since version 2: custom icons, keyed by the exported bookmark IDs. */
	faviconOverrides?: Record<string, FaviconOverride>;
}

// Helper type guards
export function isFolder(node: BookmarkNode): boolean {
	return !node.url && Array.isArray(node.children);
}

export function isBookmark(node: BookmarkNode): boolean {
	return typeof node.url === "string";
}

// Utility to get domain from URL
export function getDomainFromUrl(url: string): string {
	try {
		const urlObj = new URL(url);
		return urlObj.hostname;
	} catch {
		return "";
	}
}
