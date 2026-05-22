import { Modal } from "../modals/Modal";

interface ConfirmDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmLabel?: string;
	isDestructive?: boolean;
	isLoading?: boolean;
}

export function ConfirmDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmLabel = "Confirm",
	isDestructive = false,
	isLoading = false
}: ConfirmDialogProps) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title}>
			<div className="space-y-4">
				<p className="text-secondary">{message}</p>

				<div className="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-secondary hover:text-primary hover:bg-secondary rounded-lg transition-colors cursor-pointer"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={isLoading}
						className={`
              px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer
              ${
					isDestructive
						? "bg-red-500 hover:bg-red-600"
						: "bg-[var(--accent-color)] hover:bg-[var(--accent-hover)]"
				}
            `}
					>
						{isLoading ? "Processing..." : confirmLabel}
					</button>
				</div>
			</div>
		</Modal>
	);
}
