import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
			document.body.dataset.modalOpen = "true";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
			delete document.body.dataset.modalOpen;
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />

			{/* Modal */}
			<div
				ref={modalRef}
				className="relative bg-primary rounded-xl shadow-2xl border border-theme w-full max-w-md mx-4"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-theme">
					<h2 className="text-lg font-semibold text-primary">{title}</h2>
					<button
						onClick={onClose}
						className="p-1 rounded-md hover:bg-secondary transition-colors cursor-pointer"
					>
						<X className="w-5 h-5 text-secondary" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">{children}</div>
			</div>
		</div>,
		document.body
	);
}
