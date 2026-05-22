import { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface RenameFolderModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentName: string;
	onRename: (name: string) => Promise<void>;
}

export function RenameFolderModal({ isOpen, onClose, currentName, onRename }: RenameFolderModalProps) {
	const [name, setName] = useState(currentName);
	const [isLoading, setIsLoading] = useState(false);

	// Reset form when modal opens
	useEffect(() => {
		if (isOpen) {
			setName(currentName);
		}
	}, [isOpen, currentName]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || name.trim() === currentName) return;

		setIsLoading(true);
		try {
			await onRename(name.trim());
			onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Rename Folder">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="folder-name" className="block text-sm font-medium text-secondary mb-1">
						Folder Name
					</label>
					<input
						id="folder-name"
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						className="w-full px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						placeholder="Folder name"
						required
						autoFocus
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
						disabled={isLoading || !name.trim() || name.trim() === currentName}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? "Renaming..." : "Rename"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
