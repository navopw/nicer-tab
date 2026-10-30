import { getDomainFromUrl, isBookmark, type BookmarkNode } from "../types/bookmark";
import { sortByIndex } from "./folder-tree";

export interface BookmarkMatch {
	bookmark: BookmarkNode;
	score: number;
}

export interface FolderMatch {
	folder: BookmarkNode;
	/** Path of the folder's parent, e.g. "Bookmarks bar / Work". */
	breadcrumb: string;
	score: number;
}

export interface SearchGroup {
	/** Folder path of the group as joined IDs, stable across searches. */
	key: string;
	breadcrumb: string;
	items: BookmarkMatch[];
}

export interface SearchResults {
	folders: FolderMatch[];
	groups: SearchGroup[];
	/** Every matching bookmark in display order, so `bookmarks[0]` is the top hit. */
	bookmarks: BookmarkNode[];
}

const EMPTY_RESULTS: SearchResults = { folders: [], groups: [], bookmarks: [] };

export function tokenize(query: string): string[] {
	return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function breadcrumbOf(path: BookmarkNode[]): string {
	return (
		path
			.map(node => node.title.trim())
			.filter(Boolean)
			.join(" / ") || "Root"
	);
}

function scoreTerm(term: string, title: string, words: string[], host: string, url: string): number {
	if (title.startsWith(term)) return 100;
	if (words.some(word => word.startsWith(term))) return 70;
	if (title.includes(term)) return 40;
	if (host.startsWith(term) || host.includes(`.${term}`)) return 35;
	if (host.includes(term)) return 25;
	if (url.includes(term)) return 10;
	return 0;
}

/**
 * Rank a title (and optionally a URL) against the query terms. Every term has to
 * match somewhere, and matches at the start of the title or of a word in it count
 * the most. Returns 0 when the node does not match.
 */
export function scoreMatch(terms: string[], title: string, url?: string): number {
	const lowerTitle = title.toLowerCase();
	const words = lowerTitle.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
	const lowerUrl = url?.toLowerCase() ?? "";
	const host = url ? getDomainFromUrl(url).toLowerCase() : "";

	let total = 0;
	for (const term of terms) {
		const score = scoreTerm(term, lowerTitle, words, host, lowerUrl);
		if (score === 0) return 0;
		total += score;
	}

	if (lowerTitle === terms.join(" ")) total += 50;
	return total;
}

/** Search every bookmark and folder title (bookmark URLs too), grouped by folder and ranked. */
export function searchBookmarks(tree: BookmarkNode[], query: string): SearchResults {
	const terms = tokenize(query);
	if (terms.length === 0) return EMPTY_RESULTS;

	const folders: FolderMatch[] = [];
	const groups = new Map<string, SearchGroup & { best: number }>();

	const walk = (nodes: BookmarkNode[], path: BookmarkNode[]) => {
		for (const node of sortByIndex(nodes)) {
			if (isBookmark(node)) {
				const score = scoreMatch(terms, node.title, node.url);
				if (score === 0) continue;

				const key = path.map(folder => folder.id).join("/") || "root";
				const group = groups.get(key);
				if (group) {
					group.items.push({ bookmark: node, score });
					group.best = Math.max(group.best, score);
				} else {
					groups.set(key, {
						key,
						breadcrumb: breadcrumbOf(path),
						items: [{ bookmark: node, score }],
						best: score
					});
				}
			} else if (node.children) {
				// The invisible root node has no title and is not a real folder.
				if (node.title) {
					const score = scoreMatch(terms, node.title);
					if (score > 0) folders.push({ folder: node, breadcrumb: breadcrumbOf(path), score });
				}
				walk(node.children, [...path, node]);
			}
		}
	};

	walk(tree, []);

	// Sorting is stable, so ties keep the order the bookmarks have in the tree.
	const sortedGroups = [...groups.values()]
		.sort((a, b) => b.best - a.best)
		.map(({ key, breadcrumb, items }) => ({
			key,
			breadcrumb,
			items: items.sort((a, b) => b.score - a.score)
		}));

	return {
		folders: folders.sort((a, b) => b.score - a.score),
		groups: sortedGroups,
		bookmarks: sortedGroups.flatMap(group => group.items.map(item => item.bookmark))
	};
}
