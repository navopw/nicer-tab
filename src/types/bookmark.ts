export interface BookmarkNode {
	id: string;
	parentId?: string;
	index?: number;
	url?: string;
	title: string;
	dateAdded?: number;
	dateGroupModified?: number;
	children?: BookmarkNode[];
}

export type CardSize = "small" | "medium" | "large";

export type ThemeMode = "system" | "dark" | "light";

export interface BookmarkExport {
	version: number;
	exportedAt: string;
	bookmarks: BookmarkNode[];
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
