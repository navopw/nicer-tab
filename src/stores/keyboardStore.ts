import { create } from "zustand";

export type FocusArea = "sidebar" | "grid" | "none";

interface KeyboardState {
	focusArea: FocusArea;
	focusedFolderId: string | null;
	focusedBookmarkIndex: number;

	// Actions
	setFocusArea: (area: FocusArea) => void;
	setFocusedFolderId: (id: string | null) => void;
	setFocusedBookmarkIndex: (index: number) => void;
	moveFocusToSidebar: () => void;
	moveFocusToGrid: () => void;
	clearFocus: () => void;
}

export const useKeyboardStore = create<KeyboardState>(set => ({
	focusArea: "sidebar",
	focusedFolderId: null,
	focusedBookmarkIndex: -1,

	setFocusArea: area => set({ focusArea: area }),
	setFocusedFolderId: id => set({ focusedFolderId: id }),
	setFocusedBookmarkIndex: index => set({ focusedBookmarkIndex: index }),

	moveFocusToSidebar: () =>
		set({
			focusArea: "sidebar",
			focusedBookmarkIndex: -1
		}),

	moveFocusToGrid: () =>
		set({
			focusArea: "grid",
			focusedBookmarkIndex: 0
		}),

	clearFocus: () =>
		set({
			focusArea: "none",
			focusedBookmarkIndex: -1
		})
}));
