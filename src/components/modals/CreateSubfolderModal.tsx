import { useState, useEffect } from "react";
import { Modal } from "./Modal";

interface CreateSubfolderModalProps {
	isOpen: boolean;
	onClose: () => void;
	parentFolderName: string;
	onCreate: (name: string) => Promise<void>;
}

export function CreateSubfolderModal({ isOpen, onClose, parentFolderName, onCreate }: CreateSubfolderModalProps) {
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// Reset form when modal opens
	useEffect(() => {
		if (isOpen) {
			setName("");
		}
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		setIsLoading(true);
		try {
			await onCreate(name.trim());
			onClose();
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Create Subfolder">
			<form onSubmit={handleSubmit} className="space-y-4">
				<p className="text-sm text-secondary">
					Create a new folder inside <span className="font-medium text-primary">{parentFolderName}</span>
				</p>

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
						placeholder="New Folder"
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
						disabled={isLoading || !name.trim()}
						className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
					>
						{isLoading ? "Creating..." : "Create"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
