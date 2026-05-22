import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	danger?: boolean;
	disabled?: boolean;
	onClick: () => void;
}

interface ContextMenuProps {
	x: number;
	y: number;
	items: ContextMenuItem[];
	onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		// Use click instead of mousedown to avoid the menu closing before
		// the button onClick fires, which would cause the click to fall through
		// to the element underneath (e.g., opening a bookmark when clicking Edit)
		document.addEventListener("click", handleClickOutside);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("click", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose]);

	// Adjust position to keep menu in viewport
	useEffect(() => {
		if (menuRef.current) {
			const rect = menuRef.current.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (rect.right > viewportWidth) {
				menuRef.current.style.left = `${x - rect.width}px`;
			}
			if (rect.bottom > viewportHeight) {
				menuRef.current.style.top = `${y - rect.height}px`;
			}
		}
	}, [x, y]);

	return createPortal(
		<div
			ref={menuRef}
			className="fixed z-50 min-w-48 py-1 bg-secondary rounded-lg shadow-lg border border-theme"
			style={{ left: x, top: y }}
		>
			{items.map(item => (
				<button
					key={item.id}
					onClick={e => {
						e.stopPropagation();
						item.onClick();
						onClose();
					}}
					disabled={item.disabled}
					className={`
            w-full px-4 py-2 text-left text-sm flex items-center gap-3
            transition-colors
            ${
				item.disabled
					? "text-tertiary cursor-not-allowed"
					: item.danger
						? "text-red-500 hover:bg-red-500/10 cursor-pointer"
						: "text-primary hover:bg-tertiary cursor-pointer"
			}
          `}
				>
					{item.icon && <span className="w-4 h-4">{item.icon}</span>}
					{item.label}
				</button>
			))}
		</div>,
		document.body
	);
}
