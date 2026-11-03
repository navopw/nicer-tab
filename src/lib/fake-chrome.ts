import type { BookmarkNode } from "../types/bookmark";

/**
 * In-memory stand-in for the parts of `chrome.bookmarks` and `chrome.storage`
 * the import and undo code use. Importing this module installs it as the global
 * `chrome`, so import it before any module that touches `chrome` on load.
 */

let root: BookmarkNode = { id: "0", title: "", children: [] };
let storage: Record<string, unknown> = {};
let nextId = 1000;

function find(node: BookmarkNode, id: string): BookmarkNode | undefined {
	if (node.id === id) return node;
	for (const child of node.children ?? []) {
		const found = find(child, id);
		if (found) return found;
	}
	return undefined;
}

function mustFind(id: string): BookmarkNode {
	const node = find(root, id);
	if (!node) throw new Error(`Can't find bookmark node ${id}`);
	return node;
}

function reindex(parent: BookmarkNode) {
	parent.children?.forEach((child, index) => {
		child.index = index;
	});
}

/** What `getChildren` and `create` return: the node without its subtree. */
function withoutChildren(node: BookmarkNode): BookmarkNode {
	const { children: _children, ...rest } = node;
	return structuredClone(rest);
}

function remove(id: string) {
	const node = mustFind(id);
	const parent = mustFind(node.parentId ?? "");
	parent.children = parent.children?.filter(child => child.id !== id);
	reindex(parent);
}

/** Replace the bookmarks with `tree` (as built by `tree()` in test-utils) and empty the storage. */
export function resetFakeChrome(tree: BookmarkNode[]) {
	root = structuredClone(tree[0] ?? { id: "0", title: "", children: [] });
	storage = {};
}

const fakeChrome = {
	bookmarks: {
		getTree: async () => [structuredClone(root)],
		getChildren: async (id: string) => (mustFind(id).children ?? []).map(withoutChildren),
		create: async ({
			parentId,
			index,
			title,
			url
		}: {
			parentId: string;
			index?: number;
			title?: string;
			url?: string;
		}) => {
			const parent = mustFind(parentId);
			const node: BookmarkNode = { id: String(nextId++), parentId, title: title ?? "", url };
			if (!url) node.children = [];
			parent.children ??= [];
			parent.children.splice(index ?? parent.children.length, 0, node);
			reindex(parent);
			return withoutChildren(node);
		},
		remove: async (id: string) => remove(id),
		removeTree: async (id: string) => remove(id)
	},
	storage: {
		local: {
			get: async (key: string) => (key in storage ? { [key]: structuredClone(storage[key]) } : {}),
			set: async (items: Record<string, unknown>) => {
				Object.assign(storage, structuredClone(items));
			},
			remove: async (key: string) => {
				delete storage[key];
			}
		},
		onChanged: { addListener: () => {}, removeListener: () => {} }
	}
};

(globalThis as unknown as { chrome: unknown }).chrome = fakeChrome;
