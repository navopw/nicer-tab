import { create } from "zustand";
import type { BookmarkNode } from "../types/bookmark";
import { isBookmark } from "../types/bookmark";

interface SearchResult {
	bookmark: BookmarkNode;
	path: BookmarkNode[];
}

interface SearchState {
	query: string;
	results: SearchResult[];
	search: (tree: BookmarkNode[], query: string) => void;
	clearSearch: () => void;
}

// Flatten bookmarks with their paths
function flattenBookmarksWithPath(nodes: BookmarkNode[], path: BookmarkNode[] = []): SearchResult[] {
	const results: SearchResult[] = [];

	for (const node of nodes) {
		if (isBookmark(node)) {
			results.push({ bookmark: node, path });
		}
		if (node.children) {
			results.push(...flattenBookmarksWithPath(node.children, [...path, node]));
		}
	}

	return results;
}

// Search bookmarks by title and URL
function searchBookmarks(tree: BookmarkNode[], query: string): SearchResult[] {
	if (!query.trim()) return [];

	const lowerQuery = query.toLowerCase();
	const allBookmarks = flattenBookmarksWithPath(tree);

	return allBookmarks.filter(({ bookmark }) => {
		const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
		const urlMatch = bookmark.url?.toLowerCase().includes(lowerQuery);
		return titleMatch || urlMatch;
	});
}

export const useSearchStore = create<SearchState>(set => ({
	query: "",
	results: [],

	search: (tree, query) => {
		if (!query.trim()) {
			set({ query, results: [] });
			return;
		}

		const results = searchBookmarks(tree, query);
		set({ query, results });
	},

	clearSearch: () => set({ query: "", results: [] })
}));
