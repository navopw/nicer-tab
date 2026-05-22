import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import type { BookmarkNode } from "../../types/bookmark";

interface EditBookmarkModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookmark: BookmarkNode | null;
	onSave: (id: string, changes: { title?: string; url?: string }) => Promise<void>;
}

export function EditBookmarkModal({ isOpen, onClose, bookmark, onSave }: EditBookmarkModalProps) {
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (bookmark) {
			setTitle(bookmark.title);
			setUrl(bookmark.url ?? "");
		}
	}, [bookmark]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!bookmark) return;

		setIsLoading(true);
		try {
			await onSave(bookmark.id, { title, url: url || undefined });
			onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Edit Bookmark">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="title" className="block text-sm font-medium text-secondary mb-1">
						Title
					</label>
					<input
						id="title"
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						required
					/>
				</div>

				<div>
					<label htmlFor="url" className="block text-sm font-medium text-secondary mb-1">
						URL
					</label>
					<input
						id="url"
						type="url"
						value={url}
						onChange={e => setUrl(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						placeholder="https://example.com"
					/>
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
						disabled={isLoading}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? "Saving..." : "Save"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
