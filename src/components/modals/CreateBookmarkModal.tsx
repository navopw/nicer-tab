import { useState } from "react";
import { Modal } from "./Modal";

interface CreateBookmarkModalProps {
	isOpen: boolean;
	onClose: () => void;
	folderId: string;
	onCreate: (parentId: string, title: string, url?: string) => Promise<void>;
	isFolder?: boolean;
}

export function CreateBookmarkModal({
	isOpen,
	onClose,
	folderId,
	onCreate,
	isFolder = false
}: CreateBookmarkModalProps) {
	const [title, setTitle] = useState("");
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		setIsLoading(true);
		try {
			await onCreate(folderId, title, isFolder ? undefined : url || undefined);
			setTitle("");
			setUrl("");
			onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={isFolder ? "Create Folder" : "Create Bookmark"}>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="title" className="block text-sm font-medium text-secondary mb-1">
						{isFolder ? "Folder Name" : "Title"}
					</label>
					<input
						id="title"
						type="text"
						value={title}
						onChange={e => setTitle(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						placeholder={isFolder ? "New Folder" : "Bookmark Title"}
						required
						autoFocus
					/>
				</div>

				{!isFolder && (
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
				)}

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
						disabled={isLoading || !title}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? "Creating..." : "Create"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
