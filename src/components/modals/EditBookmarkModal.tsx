import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { getDomainFromUrl, type BookmarkNode } from "../../types/bookmark";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { normalizeTypedUrl } from "../../lib/bookmark-tree";
import { DuplicateHint } from "../common/DuplicateHint";
import { FolderSelect } from "../common/FolderSelect";

interface EditBookmarkModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookmark: BookmarkNode | null;
}

export function EditBookmarkModal({ isOpen, onClose, bookmark }: EditBookmarkModalProps) {
	const updateBookmark = useBookmarkStore(state => state.updateBookmark);
	const moveBookmark = useBookmarkStore(state => state.moveBookmark);
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("");
	const [parentId, setParentId] = useState("");
	const [urlError, setUrlError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Fill the form when it opens; later refreshes of the bookmark must not wipe what is being typed.
	useEffect(() => {
		if (!isOpen || !bookmark) return;
		setTitle(bookmark.title);
		setUrl(bookmark.url ?? "");
		setParentId(bookmark.parentId ?? "");
		setUrlError(null);
	}, [isOpen, bookmark?.id]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!bookmark) return;

		const normalizedUrl = normalizeTypedUrl(url);
		if (!URL.canParse(normalizedUrl)) {
			setUrlError("Enter a valid address, like example.com");
			return;
		}

		setIsLoading(true);
		try {
			const saved = await updateBookmark(bookmark.id, {
				title: title.trim() || getDomainFromUrl(normalizedUrl) || normalizedUrl,
				url: normalizedUrl
			});
			const moved =
				!parentId || parentId === bookmark.parentId || (await moveBookmark(bookmark.id, { parentId }));
			if (saved && moved) onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Edit Bookmark">
			<form onSubmit={handleSubmit} className="space-y-4" noValidate>
				<div>
					<label htmlFor="edit-bookmark-title" className="block text-sm font-medium text-secondary mb-1">
						Title
					</label>
					<input
						id="edit-bookmark-title"
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						data-autofocus
					/>
				</div>

				<div>
					<label htmlFor="edit-bookmark-url" className="block text-sm font-medium text-secondary mb-1">
						URL
					</label>
					<input
						id="edit-bookmark-url"
						type="text"
						inputMode="url"
						autoComplete="off"
						spellCheck={false}
						value={url}
						onChange={e => {
							setUrl(e.target.value);
							setUrlError(null);
						}}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						placeholder="example.com"
						aria-invalid={urlError ? true : undefined}
						aria-describedby={urlError ? "edit-bookmark-url-error" : undefined}
					/>
					{urlError ? (
						<p id="edit-bookmark-url-error" className="mt-1 text-xs text-red-500">
							{urlError}
						</p>
					) : (
						<DuplicateHint url={url} excludeId={bookmark?.id} />
					)}
				</div>

				<div>
					<label htmlFor="edit-bookmark-folder" className="block text-sm font-medium text-secondary mb-1">
						Folder
					</label>
					<FolderSelect id="edit-bookmark-folder" value={parentId} onChange={setParentId} />
				</div>

				<div className="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-secondary hover:text-primary hover:bg-secondary rounded-lg transition-colors cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading || !url.trim()}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
