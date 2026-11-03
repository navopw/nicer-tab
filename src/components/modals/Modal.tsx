import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
}

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, topmost last. Only the topmost one reacts to Escape and Tab. */
const openDialogs: HTMLElement[] = [];

/** Visible elements matching `selector`; hidden ones (like file inputs behind a button) cannot take focus. */
function visibleElements(dialog: HTMLElement, selector: string): HTMLElement[] {
	return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
		element => element.getClientRects().length > 0
	);
}

/** The element a dialog focuses when it opens: `data-autofocus`, else the first form field, else itself. */
function initialFocusTarget(dialog: HTMLElement): HTMLElement {
	return (
		visibleElements(dialog, "[data-autofocus]")[0] ??
		visibleElements(dialog, 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea')[0] ??
		dialog
	);
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	const titleId = useId();

	useEffect(() => {
		onCloseRef.current = onClose;
	});

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!isOpen || !dialog) return;

		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		openDialogs.push(dialog);
		document.body.dataset.modalOpen = "true";
		document.body.style.overflow = "hidden";
		initialFocusTarget(dialog).focus();

		// Capture phase, so this runs before React handlers further down can stop the event.
		const handleKeyDown = (event: KeyboardEvent) => {
			if (openDialogs[openDialogs.length - 1] !== dialog) return;

			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				onCloseRef.current();
				return;
			}

			if (event.key !== "Tab") return;

			// Keep focus inside the dialog.
			const focusables = visibleElements(dialog, FOCUSABLE);
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;
			if (!first || !last) {
				event.preventDefault();
				dialog.focus();
			} else if (event.shiftKey && (active === first || active === dialog)) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			} else if (!dialog.contains(active)) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, true);
			openDialogs.splice(openDialogs.indexOf(dialog), 1);
			if (openDialogs.length === 0) {
				delete document.body.dataset.modalOpen;
				document.body.style.overflow = "";
			}
			if (previouslyFocused?.isConnected) {
				previouslyFocused.focus({ preventScroll: true });
			}
		};
	}, [isOpen]);

	if (!isOpen) return null;

	// React events bubble through portals to the component that rendered the
	// modal (a sidebar row, a card), so they are stopped here.
	const stop = (event: React.SyntheticEvent) => event.stopPropagation();

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			onClick={stop}
			onKeyDown={stop}
			onContextMenu={stop}
			onPointerDown={stop}
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

			{/* Modal */}
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				className="relative bg-primary rounded-xl shadow-2xl border border-theme w-full max-w-md mx-4 focus:outline-none"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-theme">
					<h2 id={titleId} className="text-lg font-semibold text-primary">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="p-1 rounded-md hover:bg-secondary transition-colors cursor-pointer"
					>
						<X className="w-5 h-5 text-secondary" aria-hidden="true" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">{children}</div>
			</div>
		</div>,
		document.body
	);
}
