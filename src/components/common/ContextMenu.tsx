import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
	id: string;
	label: string;
	icon?: React.ReactNode;
	danger?: boolean;
	disabled?: boolean;
	/** Draw a divider above this item. */
	separatorBefore?: boolean;
	onClick: () => void;
}

interface ContextMenuProps {
	x: number;
	y: number;
	items: ContextMenuItem[];
	onClose: () => void;
	label?: string;
}

/** Margin kept between the menu and the viewport edges, in pixels. */
const VIEWPORT_MARGIN = 8;

/**
 * Where to open a context menu for a `contextmenu` event. Opened from the
 * keyboard (Shift+F10, the menu key) the event has no meaningful pointer
 * position, so the menu is anchored to the element instead.
 */
export function contextMenuPosition(event: React.MouseEvent<HTMLElement>): { x: number; y: number } {
	const rect = event.currentTarget.getBoundingClientRect();
	const { clientX: x, clientY: y } = event;
	const isInside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
	return isInside ? { x, y } : { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function ContextMenu({ x, y, items, onClose, label = "Actions" }: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	const [position, setPosition] = useState({ left: x, top: y });

	useEffect(() => {
		onCloseRef.current = onClose;
	});

	// Keep the menu inside the viewport, measured before the first paint.
	useLayoutEffect(() => {
		const menu = menuRef.current;
		if (!menu) return;
		const { width, height } = menu.getBoundingClientRect();
		const left = Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - width - VIEWPORT_MARGIN));
		const top = y + height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, y - height) : y;
		setPosition({ left, top });
	}, [x, y]);

	useEffect(() => {
		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		// Return focus to where the menu was opened from, unless the user clicked somewhere else.
		let restoreFocus = true;

		menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();

		const dismiss = () => {
			restoreFocus = false;
			onCloseRef.current();
		};
		const handlePointerDown = (event: PointerEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) dismiss();
		};

		document.addEventListener("pointerdown", handlePointerDown, true);
		document.addEventListener("scroll", dismiss, true);
		window.addEventListener("resize", dismiss);
		window.addEventListener("blur", dismiss);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
			document.removeEventListener("scroll", dismiss, true);
			window.removeEventListener("resize", dismiss);
			window.removeEventListener("blur", dismiss);
			if (restoreFocus && previouslyFocused?.isConnected) {
				previouslyFocused.focus({ preventScroll: true });
			}
		};
	}, []);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		// Keep keys from reaching the grid or sidebar this menu was opened from.
		event.stopPropagation();

		const enabled = Array.from(
			menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []
		);
		const index = enabled.indexOf(document.activeElement as HTMLElement);

		switch (event.key) {
			case "ArrowDown":
				enabled[(index + 1) % enabled.length]?.focus();
				break;
			case "ArrowUp":
				enabled[(index - 1 + enabled.length) % enabled.length]?.focus();
				break;
			case "Home":
				enabled[0]?.focus();
				break;
			case "End":
				enabled[enabled.length - 1]?.focus();
				break;
			case "Escape":
			case "Tab":
				onClose();
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	// React events bubble through portals to the component that rendered the menu.
	const stop = (event: React.SyntheticEvent) => event.stopPropagation();

	return createPortal(
		<div
			ref={menuRef}
			role="menu"
			aria-label={label}
			className="fixed z-50 min-w-48 py-1 bg-secondary rounded-lg shadow-lg border border-theme"
			style={position}
			onKeyDown={handleKeyDown}
			onClick={stop}
			onContextMenu={event => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onPointerDown={stop}
		>
			{items.map(item => (
				<div key={item.id} role="none">
					{item.separatorBefore && <div role="separator" className="my-1 border-t border-theme" />}
					<button
						type="button"
						role="menuitem"
						tabIndex={-1}
						onClick={() => {
							item.onClick();
							onClose();
						}}
						disabled={item.disabled}
						className={`
							w-full px-4 py-2 text-left text-sm flex items-center gap-3
							transition-colors focus:outline-none
							${
								item.disabled
									? "text-tertiary cursor-not-allowed"
									: item.danger
										? "text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
										: "text-primary hover:bg-tertiary focus:bg-tertiary cursor-pointer"
							}
						`}
					>
						{item.icon && (
							<span className="w-4 h-4" aria-hidden="true">
								{item.icon}
							</span>
						)}
						{item.label}
					</button>
				</div>
			))}
		</div>,
		document.body
	);
}
