import { Plus } from "lucide-react";
import type { CardSize } from "../../types/bookmark";
import { CARD_LAYOUT } from "./cardLayout";

interface AddBookmarkCardProps {
	size: CardSize;
	onClick: () => void;
	gridKey: string;
	tabIndex: number;
}

const ICON_SIZES: Record<CardSize, string> = {
	small: "w-8 h-8",
	medium: "w-10 h-10",
	large: "w-12 h-12"
};

export function AddBookmarkCard({ size, onClick, gridKey, tabIndex }: AddBookmarkCardProps) {
	const layout = CARD_LAYOUT[size];

	return (
		<button
			type="button"
			onClick={onClick}
			data-grid-item={gridKey}
			tabIndex={tabIndex}
			aria-label="Add bookmark"
			title="Add bookmark"
			className={`
				group flex flex-col w-full ${layout.height} ${layout.padding}
				rounded-xl border-2 border-dashed border-[var(--border-color)]
				cursor-pointer transition-all duration-200
				hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5
				focus-visible:border-[var(--accent-color)] focus-visible:bg-[var(--accent-color)]/5
				items-center justify-center
			`}
		>
			<div
				className={`
					${ICON_SIZES[size]} flex items-center justify-center
					rounded-full border-2 border-dashed border-[var(--border-color)]
					text-tertiary
					transition-all duration-200
					group-hover:border-[var(--accent-color)] group-hover:text-[var(--accent-color)]
					group-hover:scale-110
				`}
			>
				<Plus className="w-1/2 h-1/2" strokeWidth={2.5} aria-hidden="true" />
			</div>
		</button>
	);
}
