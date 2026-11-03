import { useId } from "react";

interface SwitchProps {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

/** A labelled on/off setting row. */
export function Switch({ label, description, checked, onChange }: SwitchProps) {
	const labelId = useId();
	const descriptionId = useId();

	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<span id={labelId} className="block text-sm text-primary">
					{label}
				</span>
				{description && (
					<span id={descriptionId} className="block text-xs text-tertiary">
						{description}
					</span>
				)}
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-labelledby={labelId}
				aria-describedby={description ? descriptionId : undefined}
				onClick={() => onChange(!checked)}
				className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer ${
					checked ? "bg-[var(--accent-color)]" : "bg-tertiary"
				}`}
			>
				<span
					aria-hidden="true"
					className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
						checked ? "translate-x-4" : ""
					}`}
				/>
			</button>
		</div>
	);
}
