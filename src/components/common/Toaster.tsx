import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToastStore, type Toast } from "../../stores/toastStore";

function ToastItem({ toast }: { toast: Toast }) {
	const dismiss = useToastStore(state => state.dismiss);
	const [isPaused, setIsPaused] = useState(false);

	// Hovering or focusing the toast keeps it open, so an Undo is never pulled away mid-reach.
	useEffect(() => {
		if (isPaused) return;
		const timeout = window.setTimeout(() => dismiss(toast.id), toast.duration);
		return () => window.clearTimeout(timeout);
	}, [dismiss, isPaused, toast.duration, toast.id]);

	return (
		<div
			className={`
				toast-enter pointer-events-auto flex items-center gap-3 min-w-72 max-w-md pl-4 pr-2 py-2 rounded-lg shadow-lg border
				${toast.tone === "error" ? "bg-red-600 border-red-700 text-white" : "bg-[var(--text-primary)] border-transparent text-[var(--bg-primary)]"}
			`}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
			onFocus={() => setIsPaused(true)}
			onBlur={() => setIsPaused(false)}
		>
			<p className="flex-1 text-sm py-1">{toast.message}</p>
			{toast.action && (
				<button
					type="button"
					onClick={() => {
						dismiss(toast.id);
						void toast.action?.onClick();
					}}
					className="px-2 py-1 text-sm font-semibold rounded-md text-[var(--accent-color)] hover:underline cursor-pointer"
				>
					{toast.action.label}
				</button>
			)}
			<button
				type="button"
				onClick={() => dismiss(toast.id)}
				aria-label="Dismiss"
				className="p-1 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
			>
				<X className="w-4 h-4" aria-hidden="true" />
			</button>
		</div>
	);
}

export function Toaster() {
	const toasts = useToastStore(state => state.toasts);

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none"
		>
			{toasts.map(toast => (
				<ToastItem key={toast.id} toast={toast} />
			))}
		</div>
	);
}
