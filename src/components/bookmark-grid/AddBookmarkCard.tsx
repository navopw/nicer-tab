import { Plus } from "lucide-react";
import type { CardSize } from "../../types/bookmark";

interface AddBookmarkCardProps {
	size: CardSize;
	onClick: () => void;
}

const cardConfig = {
	small: {
		height: "h-24",
		iconSize: "w-8 h-8",
		textClass: "text-xs",
		padding: "p-2"
	},
	medium: {
		height: "h-36",
		iconSize: "w-10 h-10",
		textClass: "text-sm",
		padding: "p-3"
	},
	large: {
		height: "h-44",
		iconSize: "w-12 h-12",
		textClass: "text-sm",
		padding: "p-4"
	}
};

export function AddBookmarkCard({ size, onClick }: AddBookmarkCardProps) {
	const config = cardConfig[size];

	return (
		<button
			onClick={onClick}
			className={`
        group flex flex-col
        w-full ${config.height} ${config.padding}
        rounded-xl border-2 border-dashed border-[var(--border-color)]
        cursor-pointer transition-all duration-200
        hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5
        focus:outline-none focus:border-[var(--accent-color)] focus:bg-[var(--accent-color)]/5
        items-center justify-center
      `}
			title="Add new bookmark"
		>
			<div
				className={`
          ${config.iconSize} flex items-center justify-center
          rounded-full border-2 border-dashed border-[var(--border-color)]
          text-tertiary
          transition-all duration-200
          group-hover:border-[var(--accent-color)] group-hover:text-[var(--accent-color)]
          group-hover:scale-110
          mb-2
        `}
			>
				<Plus className="w-1/2 h-1/2" strokeWidth={2.5} />
			</div>
		</button>
	);
}
