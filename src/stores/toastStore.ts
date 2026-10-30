import { create } from "zustand";

export interface ToastAction {
	label: string;
	onClick: () => void | Promise<unknown>;
}

export interface Toast {
	id: number;
	message: string;
	tone: "default" | "error";
	action?: ToastAction;
	/** Milliseconds before the toast hides itself. */
	duration: number;
}

export type ToastInput = Pick<Toast, "message"> & Partial<Omit<Toast, "id" | "message">>;

interface ToastState {
	toasts: Toast[];
	show: (toast: ToastInput) => number;
	dismiss: (id: number) => void;
}

/** Older toasts are dropped beyond this many, so a burst of actions does not fill the screen. */
const MAX_TOASTS = 3;

let nextId = 1;

export const useToastStore = create<ToastState>()(set => ({
	toasts: [],

	show: toast => {
		const id = nextId++;
		const entry: Toast = {
			id,
			tone: "default",
			duration: toast.action ? 8000 : 4000,
			...toast
		};
		set(state => ({ toasts: [...state.toasts, entry].slice(-MAX_TOASTS) }));
		return id;
	},

	dismiss: id => set(state => ({ toasts: state.toasts.filter(toast => toast.id !== id) }))
}));

export function showToast(toast: ToastInput): number {
	return useToastStore.getState().show(toast);
}

export function showErrorToast(message: string, error?: unknown): number {
	if (error) console.error(message, error);
	return showToast({ message, tone: "error" });
}
