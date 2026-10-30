import { useEffect } from "react";
import { focusSearch, focusSidebar, isTypingTarget } from "../lib/focus";

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Page-wide shortcuts: Cmd/Ctrl+K and "/" jump to search, and arrow keys pressed
 * while nothing has focus start keyboard navigation in the sidebar.
 */
export function useGlobalShortcuts() {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (document.body.dataset.modalOpen === "true" || event.defaultPrevented) return;

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				focusSearch();
				return;
			}

			if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;

			if (event.key === "/") {
				event.preventDefault();
				focusSearch();
				return;
			}

			const nothingFocused = document.activeElement === document.body || document.activeElement === null;
			if (nothingFocused && ARROW_KEYS.has(event.key) && focusSidebar()) {
				event.preventDefault();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
}
