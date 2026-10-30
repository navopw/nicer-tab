import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { BookmarkNode } from "../../types/bookmark";
import { moveWithUndo } from "../../lib/bookmark-actions";
import { FolderSelect } from "../common/FolderSelect";

interface MoveBookmarkModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookmark: BookmarkNode | null;
}

export function MoveBookmarkModal({ isOpen, onClose, bookmark }: MoveBookmarkModalProps) {
	const [parentId, setParentId] = useState("");

	useEffect(() => {
		if (isOpen && bookmark) setParentId(bookmark.parentId ?? "");
	}, [isOpen, bookmark?.id]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (bookmark && parentId) void moveWithUndo(bookmark.id, parentId);
		onClose();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Move Bookmark">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="move-bookmark-folder" className="block text-sm font-medium text-secondary mb-1">
						Move &ldquo;{bookmark?.title || "Untitled"}&rdquo; to
					</label>
					<FolderSelect id="move-bookmark-folder" value={parentId} onChange={setParentId} />
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
						disabled={!parentId || parentId === bookmark?.parentId}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						Move
					</button>
				</div>
			</form>
		</Modal>
	);
}
