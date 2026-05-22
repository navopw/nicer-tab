import { useState } from "react";
import { Grid2X2, Grid3X3, LayoutGrid, Settings } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { SearchBar } from "./SearchBar";
import { SettingsModal } from "./modals/SettingsModal";
import type { CardSize } from "../types/bookmark";

const sizeIcons: Record<CardSize, React.ReactNode> = {
	small: <Grid3X3 className="w-4 h-4" />,
	medium: <Grid2X2 className="w-4 h-4" />,
	large: <LayoutGrid className="w-4 h-4" />
};

export function Toolbar() {
	const cardSize = useUIStore(state => state.cardSize);
	const setCardSize = useUIStore(state => state.setCardSize);
	const [showSettings, setShowSettings] = useState(false);

	const sizes: CardSize[] = ["small", "medium", "large"];

	return (
		<>
			<header className="flex items-center gap-4 px-6 py-4 h-[72px] border-b border-theme sidebar-bg">
				{/* Search bar */}
				<SearchBar />

				{/* Card size selector */}
				<div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
					{sizes.map(size => (
						<button
							key={size}
							onClick={() => setCardSize(size)}
							className={`
								p-2 rounded-md transition-colors cursor-pointer
								${
									cardSize === size
										? "bg-[var(--accent-color)] text-white"
										: "text-secondary hover:bg-sidebar-hover hover:text-primary"
								}
							`}
							title={`${size.charAt(0).toUpperCase() + size.slice(1)} cards`}
						>
							{sizeIcons[size]}
						</button>
					))}
				</div>

				{/* Right-aligned buttons */}
				<div className="ml-auto flex items-center gap-2">
					{/* Settings button */}
					<button
						onClick={() => setShowSettings(true)}
						className="p-2 bg-secondary rounded-lg text-secondary hover:text-primary hover:bg-sidebar-hover transition-colors cursor-pointer"
						title="Settings"
					>
						<Settings className="w-4 h-4" />
					</button>
				</div>
			</header>

			<SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
		</>
	);
}
