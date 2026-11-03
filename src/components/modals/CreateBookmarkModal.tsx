import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { getDomainFromUrl } from "../../types/bookmark";
import { normalizeTypedUrl } from "../../lib/bookmark-tree";
import { DuplicateHint } from "../common/DuplicateHint";
import { FolderSelect } from "../common/FolderSelect";

interface CreateBookmarkModalProps {
	isOpen: boolean;
	onClose: () => void;
	/** Folder preselected in the folder picker. */
	folderId: string;
}

export function CreateBookmarkModal({ isOpen, onClose, folderId }: CreateBookmarkModalProps) {
	const createBookmark = useBookmarkStore(state => state.createBookmark);
	const [url, setUrl] = useState("");
	const [title, setTitle] = useState("");
	const [parentId, setParentId] = useState(folderId);
	const [urlError, setUrlError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Start from a clean form in the current folder every time it opens.
	useEffect(() => {
		if (!isOpen) return;
		setUrl("");
		setTitle("");
		setUrlError(null);
		setParentId(folderId);
	}, [isOpen, folderId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const normalizedUrl = normalizeTypedUrl(url);
		if (!URL.canParse(normalizedUrl)) {
			setUrlError("Enter a valid address, like example.com");
			return;
		}

		setIsLoading(true);
		try {
			const created = await createBookmark(
				parentId,
				title.trim() || getDomainFromUrl(normalizedUrl) || normalizedUrl,
				normalizedUrl
			);
			if (created) onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Add Bookmark">
			<form onSubmit={handleSubmit} className="space-y-4" noValidate>
				<div>
					<label htmlFor="create-bookmark-url" className="block text-sm font-medium text-secondary mb-1">
						URL
					</label>
					<input
						id="create-bookmark-url"
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
						aria-describedby={urlError ? "create-bookmark-url-error" : undefined}
						data-autofocus
					/>
					{urlError ? (
						<p id="create-bookmark-url-error" className="mt-1 text-xs text-red-500">
							{urlError}
						</p>
					) : (
						<DuplicateHint url={url} />
					)}
				</div>

				<div>
					<label htmlFor="create-bookmark-title" className="block text-sm font-medium text-secondary mb-1">
						Title
					</label>
					<input
						id="create-bookmark-title"
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						placeholder="Defaults to the site's address"
					/>
				</div>

				<div>
					<label htmlFor="create-bookmark-folder" className="block text-sm font-medium text-secondary mb-1">
						Folder
					</label>
					<FolderSelect id="create-bookmark-folder" value={parentId} onChange={setParentId} />
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
						{isLoading ? "Adding..." : "Add"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
