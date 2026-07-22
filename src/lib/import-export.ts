import type { BookmarkNode, BookmarkExport } from "../types/bookmark";

const EXPORT_VERSION = 1;

// Export bookmarks to JSON
export async function exportBookmarks(): Promise<void> {
	try {
		const tree = await chrome.bookmarks.getTree();

		const exportData: BookmarkExport = {
			version: EXPORT_VERSION,
			exportedAt: new Date().toISOString(),
			bookmarks: tree
		};

		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = `bookmarks-export-${new Date().toISOString().split("T")[0]}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error("Failed to export bookmarks:", error);
		throw error;
	}
}

// Import bookmarks from JSON
export async function importBookmarks(file: File, mode: "merge" | "replace" = "merge"): Promise<void> {
	try {
		const text = await file.text();
		const data = JSON.parse(text) as BookmarkExport;

		if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
			throw new Error("Invalid bookmark file format");
		}

		const tree = await chrome.bookmarks.getTree();
		const rootChildren = tree[0]?.children ?? [];

		if (mode === "replace") {
			// Delete all existing bookmarks first
			for (const folder of rootChildren) {
				if (folder.children) {
					for (const child of folder.children) {
						try {
							if (child.children) {
								await chrome.bookmarks.removeTree(child.id);
							} else {
								await chrome.bookmarks.remove(child.id);
							}
						} catch {
							// Ignore errors for special bookmarks
						}
					}
				}
			}
		}

		// Import bookmarks recursively, preserving folder hierarchy.
		// Map exported top-level folders to current top-level folders by ID, then by position.
		const importedRoot = data.bookmarks[0];
		if (importedRoot?.children) {
			for (const [index, folder] of importedRoot.children.entries()) {
				const targetRootFolder =
					rootChildren.find((root: chrome.bookmarks.BookmarkTreeNode) => root.id === folder.id) ??
					rootChildren[index];
				if (!targetRootFolder?.id) continue;

				if (folder.children) {
					for (const child of folder.children) {
						await importBookmarkNode(child, targetRootFolder.id);
					}
				}
			}
		}
	} catch (error) {
		console.error("Failed to import bookmarks:", error);
		throw error;
	}
}

// Recursively import a bookmark node
async function importBookmarkNode(node: BookmarkNode, targetParentId: string): Promise<void> {
	if (Array.isArray(node.children)) {
		try {
			const createdFolder = await chrome.bookmarks.create({
				parentId: targetParentId,
				title: node.title
			});

			for (const child of node.children) {
				await importBookmarkNode(child, createdFolder.id);
			}
		} catch {
			// Skip invalid folder nodes and continue import.
		}
	} else if (typeof node.url === "string") {
		// It's a bookmark - create it
		try {
			await chrome.bookmarks.create({
				parentId: targetParentId,
				title: node.title,
				url: node.url
			});
		} catch {
			// Ignore duplicate errors
		}
	} else {
		// Skip malformed leaf nodes that are neither folder nor bookmark.
		return;
	}
}
